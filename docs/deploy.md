# Deploying to Cloud Run

The app runs on Cloud Run in `australia-southeast1` and stores tasks in Firestore. Container images live in Artifact Registry. The infrastructure is defined with Terraform in [`infra/`](../infra/); see [Infrastructure (Terraform)](#infrastructure-terraform).

## How deployments work

Every merge to `main` deploys automatically, once the `Test`, `Docker` and `Terraform` checks pass. The `Deploy` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

1. Authenticates to Google Cloud as the `github-deployer` service account using **Workload Identity Federation**. GitHub's short-lived OIDC token is exchanged for temporary credentials, so there are no service account keys or stored secrets.
2. Builds the image and tags it with the full commit SHA.
3. Pushes it to Artifact Registry.
4. Deploys it to Cloud Run as a new revision. Only the image changes; every other service setting comes from Terraform.

Pull requests run `Test`, `Docker` and `Terraform` only; `Deploy` is skipped. Deploys can be seen in the **Actions** tab on GitHub, or in the repository's **Deployments → production** history.

### Checking a deploy

The deployed image tag should equal the merge commit's SHA:

```powershell
git switch main; git pull
git rev-parse HEAD

gcloud run services describe task-app --region australia-southeast1 `
  --format="value(spec.template.spec.containers[0].image)"
```

## Variables

All commands are PowerShell. App commands run from the `task-app/` folder and Terraform commands from `infra/`. Set these in each new PowerShell session:

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

Already done for this project. Everything in Google Cloud except the state bucket is defined in Terraform; this section lists only the steps Terraform can't do.

### Terraform state bucket

Terraform keeps its state in this bucket, so the bucket has to exist before Terraform can run. It's created by hand and deliberately left out of the Terraform config.

```powershell
# Uniform access: permissions come from IAM only, with no per-object ACLs.
# Public access prevention: the bucket can never be made public.
gcloud storage buckets create gs://taskapp-gcloud-tfstate `
  --location=$REGION `
  --uniform-bucket-level-access `
  --public-access-prevention

# Keep old versions of the state, so a bad write can be recovered.
gcloud storage buckets update gs://taskapp-gcloud-tfstate --versioning
```

### Local machine

```powershell
# Default project for gcloud commands in this guide.
gcloud config set project $PROJECT

# Let Docker push to Artifact Registry using your gcloud login (no key files).
gcloud auth configure-docker "$REGION-docker.pkg.dev"
```

### GitHub settings

The workflow reads these **repository variables** (Settings → Secrets and variables → Actions → Variables). They are identifiers, not credentials, so they are variables rather than secrets:

| Variable | Value |
| --- | --- |
| `GCP_REGION` | `australia-southeast1` |
| `GCP_PROJECT_ID` | `taskapp-gcloud` |
| `GCP_WIF_PROVIDER` | `projects/810304857478/locations/global/workloadIdentityPools/github/providers/github-actions` |
| `GCP_DEPLOYER_SA` | `github-deployer@taskapp-gcloud.iam.gserviceaccount.com` |

The `Deploy` job runs in the `production` **environment** (Settings → Environments), which records the deployment history.

### Budget alert

Created in the Cloud console under **Billing → Budgets & alerts**. See [Cost controls](#cost-controls).

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
  --region $REGION
```

Each deploy creates a new immutable **revision** and sends all traffic to it. Service settings (runtime identity, scaling, env vars) come from Terraform in `infra/cloud_run.tf`; this only changes the image.

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

## Infrastructure (Terraform)

Every Google Cloud resource the app uses is defined in [`infra/`](../infra/). The state is stored in the `taskapp-gcloud-tfstate` bucket, not in the repository: state can contain secrets in plain text, it shouldn't be tied to one machine, and the bucket locks it so two runs can't write to it at once.

### What's where

| File | Defines |
| --- | --- |
| `apis.tf` | Google APIs the project needs |
| `artifact_registry.tf` | Docker image repository, its cleanup policy, and the deployer's permission to push to it |
| `cloud_run.tf` | The `task-app` service: runtime identity, scaling, env vars and resources |
| `firestore.tf` | Firestore database that stores the tasks |
| `iam.tf` | Runtime and deployer service accounts, and their project-level roles |
| `workload_identity.tf` | WIF pool and GitHub OIDC provider; lets GitHub impersonate the deployer, and the deployer act as the runtime account |
| `variables.tf` | Project ID, region and GitHub repository |
| `providers.tf` | Google provider settings |
| `versions.tf` | Terraform and provider versions, and the state backend |

### Who owns what

Terraform is the source of truth for the infrastructure. To change scaling, env vars or the runtime identity, edit `cloud_run.tf`. Don't use `gcloud` flags: Terraform reports them as drift and undoes them on the next apply.

The one exception is the container image. CI deploys a new image on every merge, so `cloud_run.tf` tells Terraform to ignore it (`ignore_changes`). The image in that file is used only if the service is ever created from scratch.

### Making a change

Run these from the `infra/` folder:

```powershell
# Once per machine, or when the credentials expire.
# Terraform uses your Google login (Application Default Credentials); no key files.
gcloud auth application-default login

# After a fresh clone, or after changing the provider version or backend.
# Downloads the pinned provider into .terraform/ and connects to the state bucket.
terraform init

# Fix formatting and check the config. CI fails the PR if either would fail.
terraform fmt
terraform validate

# Preview the changes.
terraform plan
```

Read every line of the plan before applying:

| Symbol | Meaning |
| --- | --- |
| `+` | create |
| `~` | update in place |
| `-` | destroy |
| `-/+` | replace: destroy, then create |

Stop if the plan touches anything you didn't change, and especially if it shows any `-` or `-/+`.

The workflow for a change:

1. Make the change on a branch and open a pull request. CI checks formatting and validation; paste the `plan` summary into the PR description.
2. After the PR merges, switch to an up-to-date `main` and run `terraform plan`, then `terraform apply`.
3. Run `terraform plan` again. It should report **No changes**.

### Why apply is manual

Terraform is applied from a developer machine, not from CI. Applying this config needs permission to create service accounts and change IAM, which is close to owner access. In a public repository, the workflow files decide what CI's identity does, so anyone who got a workflow change merged would effectively control the project. CI only checks formatting and validation, which needs no Google credentials.

Planned: run `terraform plan` in CI on pull requests with a read-only identity, so reviewers see the changes. After merge, CI plans again on `main` and applies that saved plan once it's approved in a protected environment, using an identity that only that environment can use.

### Safeguards

- **`prevent_destroy`** on the Artifact Registry repository, the WIF pool and provider, and Firestore. Terraform rejects any plan that would destroy or replace them. It works only while the block is in the code.
- **Cloud Run `deletion_protection = true`** stops Terraform from deleting the service.
- **Firestore `delete_protection_state = "DELETE_PROTECTION_ENABLED"`** is enforced by Google Cloud itself, so the database can't be deleted from the console, `gcloud` or the API either.
- **Least privilege.** The runtime account can only read and write Firestore. The deployer can only deploy to Cloud Run, push to this one repository, and act as this one runtime account.
- **Additive IAM.** Every grant uses an `_iam_member` resource, which adds one binding and never removes others. Authoritative `_iam_binding` and `_iam_policy` resources replace existing bindings and can lock you out.
- **`disable_on_destroy = false`** on the APIs. If an API is removed from the config, Terraform stops tracking it but leaves it enabled, so services that depend on it keep working.

Deleted WIF pools and providers are soft-deleted for 30 days, and their IDs can't be reused in that time. This is another reason they're protected from replacement.

## Cost controls

- **Max 2 instances**, which limits how far traffic can scale costs.
- **Min 0 instances**: scales to zero when idle. The first request after idling has a short cold start.
- **Budget alert** at A$5, notifying at 50%, 90% and 95%. GCP has no hard spending cap, so this only alerts; it doesn't stop anything.
- **Image cleanup**: the Artifact Registry repository keeps the 10 most recent images and deletes images older than about 30 days. It's currently in dry-run mode (`cleanup_policy_dry_run = true` in `artifact_registry.tf`). Each push creates untagged child manifests that the tagged image depends on, so check the dry-run results before turning it on.
