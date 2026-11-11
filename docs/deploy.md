# Deploying to Cloud Run

The app runs on Cloud Run in `australia-southeast1` and stores tasks in Firestore. Container images live in Artifact Registry.

## How deployments work

Every merge to `main` deploys automatically, once the `Test` and `Docker` checks pass. The `Deploy` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

1. Authenticates to Google Cloud as the `github-deployer` service account using **Workload Identity Federation**. GitHub's short-lived OIDC token is exchanged for temporary credentials, so there are no service account keys or stored secrets.
2. Builds the image and tags it with the full commit SHA.
3. Pushes it to Artifact Registry.
4. Deploys it to Cloud Run as a new revision.

Pull requests run `Test` and `Docker` only; `Deploy` is skipped. Watch deploys in the **Actions** tab, or in the repository's **Deployments → production** history.

> **Status:** the infrastructure below was set up by hand with `gcloud`. It will be managed by Terraform.

### Checking a deploy

The deployed image tag should equal the merge commit's SHA:

```powershell
git switch main; git pull
git rev-parse HEAD

gcloud run services describe task-app --region australia-southeast1 `
  --format="value(spec.template.spec.containers[0].image)"
```

## Variables

All commands are PowerShell, run from the `task-app/` folder. Set these in each new PowerShell session:

```powershell
$REGION      = "australia-southeast1"
$PROJECT     = "taskapp-gcloud"
$REPO        = "task-app"
$SERVICE     = "task-app"
$RUNTIME_SA  = "task-app-run@$PROJECT.iam.gserviceaccount.com"
$DEPLOYER_SA = "github-deployer@$PROJECT.iam.gserviceaccount.com"
```

Variables are expanded when a line runs, so set these before running anything that uses them. Run `$DEPLOYER_SA` to check a value.

## One-time setup

Already done for this project. It's listed here so the setup can be reproduced.

### Project, registry and runtime identity

```powershell
gcloud config set project $PROJECT

# APIs are disabled by default; enable only what we use.
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com

# Docker image repository, in the same region as Cloud Run and Firestore.
gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION

# Dedicated runtime identity with least privilege (Firestore read/write only),
# instead of the default compute service account.
gcloud iam service-accounts create task-app-run --display-name="Task app runtime"
gcloud projects add-iam-policy-binding $PROJECT `
  --member="serviceAccount:$RUNTIME_SA" `
  --role="roles/datastore.user" `
  --condition=None

# Let Docker push to Artifact Registry using your gcloud login (no key files).
gcloud auth configure-docker "$REGION-docker.pkg.dev"
```

The repository has a cleanup policy that keeps the 10 most recent images and deletes images older than about 30 days. It is applied with `gcloud artifacts repositories set-cleanup-policies`. Always test policy changes with `--dry-run` first: each push creates untagged child manifests that the tagged image depends on.

### CI/CD identity

A separate deployer identity keeps CI's permissions apart from the app's: the pipeline can deploy but can't read Firestore, and the app can't deploy.

```powershell
gcloud iam service-accounts create github-deployer --display-name="GitHub Actions deployer"

# Deploy Cloud Run services (but not change who can invoke them; that needs run.admin).
gcloud projects add-iam-policy-binding $PROJECT `
  --member="serviceAccount:$DEPLOYER_SA" `
  --role="roles/run.developer" `
  --condition=None

# Push images to this repository only.
gcloud artifacts repositories add-iam-policy-binding $REPO `
  --location=$REGION `
  --member="serviceAccount:$DEPLOYER_SA" `
  --role="roles/artifactregistry.writer"

# Attach the runtime identity to the service. Granted on task-app-run only:
# project-wide, the deployer could attach any service account (privilege escalation).
gcloud iam service-accounts add-iam-policy-binding $RUNTIME_SA `
  --member="serviceAccount:$DEPLOYER_SA" `
  --role="roles/iam.serviceAccountUser"
```

Workload Identity Federation lets GitHub Actions impersonate the deployer without a key:

```powershell
# A pool holds trust configuration for external identities. It stores no tokens.
gcloud iam workload-identity-pools create github `
  --location=global `
  --display-name="GitHub Actions"

# Trust GitHub's OIDC tokens, but only from this repository. The issuer is shared
# by every repo on GitHub, so the attribute condition is what keeps others out.
gcloud iam workload-identity-pools providers create-oidc github-actions `
  --location=global `
  --workload-identity-pool=github `
  --display-name="GitHub Actions OIDC" `
  --issuer-uri="https://token.actions.githubusercontent.com" `
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" `
  --attribute-condition="assertion.repository=='TechnicPotato/TaskApp'"

# Allow workflows from this repository to impersonate the deployer.
# The member uses the project NUMBER, not the project ID.
gcloud iam service-accounts add-iam-policy-binding $DEPLOYER_SA `
  --role="roles/iam.workloadIdentityUser" `
  --member="principalSet://iam.googleapis.com/projects/810304857478/locations/global/workloadIdentityPools/github/attribute.repository/TechnicPotato/TaskApp"
```

Deleted pools and providers are soft-deleted for 30 days and their IDs can't be reused in that time, so prefer `update-oidc` over deleting and recreating.

### GitHub settings

The workflow reads these **repository variables** (Settings → Secrets and variables → Actions → Variables). They are identifiers, not credentials, so they are variables rather than secrets:

| Variable | Value |
| --- | --- |
| `GCP_REGION` | `australia-southeast1` |
| `GCP_PROJECT_ID` | `taskapp-gcloud` |
| `GCP_WIF_PROVIDER` | `projects/810304857478/locations/global/workloadIdentityPools/github/providers/github-actions` |
| `GCP_DEPLOYER_SA` | `github-deployer@taskapp-gcloud.iam.gserviceaccount.com` |

The `Deploy` job runs in the `production` **environment** (Settings → Environments), which records the deployment history.

## Manual deploy (fallback)

Use this only if GitHub Actions is unavailable or for an emergency fix. The next merge to `main` will deploy over whatever you deploy by hand.

Commit your changes first. The image is tagged with the commit SHA, so the working tree must match that commit.

```powershell
$TAG   = git rev-parse HEAD
$IMAGE = "$REGION-docker.pkg.dev/$PROJECT/$REPO/task-app:$TAG"

docker build -t $IMAGE .
docker push $IMAGE

gcloud run deploy $SERVICE `
  --image $IMAGE `
  --region $REGION `
  --service-account $RUNTIME_SA `
  --set-env-vars TASK_STORE=firestore `
  --max-instances 2 `
  --min-instances 0 `
  --no-allow-unauthenticated
```

Each deploy creates a new immutable **revision** and sends all traffic to it.

## Testing

The service is private until sign-in exists, so visiting the service URL directly returns **403 Forbidden**. That's expected.

To use the app, proxy to it with your own credentials, then open http://localhost:8080:

```powershell
gcloud run services proxy $SERVICE --region $REGION
```

## Rolling back

List revisions, then send all traffic to a previous one:

```powershell
gcloud run revisions list --service $SERVICE --region $REGION

gcloud run services update-traffic $SERVICE --region $REGION `
  --to-revisions <revision-name>=100
```

A rollback lasts only until the next merge to `main`, which deploys again and sends all traffic to the new revision. To undo a bad change permanently, revert the commit on `main`.

## Costs and safeguards

- **Max 2 instances**, which limits how far traffic can scale costs.
- **Min 0 instances**: scales to zero when idle. The first request after idling has a short cold start.
- **Budget alert** at A$5, notifying at 50%, 90% and 95%. GCP has no hard spending cap, so this only alerts; it doesn't stop anything.
