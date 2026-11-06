# Deploying to Cloud Run

The app runs on Cloud Run in `australia-southeast1` and stores tasks in Firestore. Container images live in Artifact Registry.

> **Status:** this is the manual process. It will be replaced by continuous deployment from GitHub Actions and by Terraform.

All commands are PowerShell, run from the `task-app/` folder.

## Variables

Set these in each new PowerShell session:

```powershell
$REGION     = "australia-southeast1"
$PROJECT    = "taskapp-gcloud"
$REPO       = "task-app"
$SERVICE    = "task-app"
$RUNTIME_SA = "task-app-run@$PROJECT.iam.gserviceaccount.com"
```

## One-time setup

Already done for this project. It's listed here so the setup can be reproduced.

```powershell
gcloud config set project $PROJECT

# APIs are disabled by default; enable only what we use.
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com

# Docker image repository, in the same region as Cloud Run and Firestore.
gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION

# Dedicated runtime identity with least privilege (Firestore read/write only),
# instead of the default compute service account, which has Editor.
gcloud iam service-accounts create task-app-run --display-name="Task app runtime"
gcloud projects add-iam-policy-binding $PROJECT `
  --member="serviceAccount:$RUNTIME_SA" `
  --role="roles/datastore.user"

# Let Docker push to Artifact Registry using your gcloud login (no key files).
gcloud auth configure-docker "$REGION-docker.pkg.dev"
```

The repository has a cleanup policy that keeps the 10 most recent images and deletes images older than about 30 days. It is applied with `gcloud artifacts repositories set-cleanup-policies`. Always test policy changes with `--dry-run` first: each push creates untagged child manifests that the tagged image depends on.

## Deploying a new version

Commit your changes first. The image is tagged with the commit SHA, so the working tree must match that commit.

```powershell
$TAG   = git rev-parse --short HEAD
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

## Costs and safeguards

- **Max 2 instances**, which limits how far traffic can scale costs.
- **Min 0 instances**: scales to zero when idle. The first request after idling has a short cold start.
- **Budget alert** at A$5, notifying at 50%, 90% and 95%. GCP has no hard spending cap, so this only alerts; it doesn't stop anything.
