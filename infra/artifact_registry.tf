resource "google_artifact_registry_repository" "task_app" {
  repository_id          = "task-app"
  location               = var.region
  format                 = "DOCKER"
  cleanup_policy_dry_run = true
  cleanup_policies {
    id     = "delete-older-than-30d"
    action = "DELETE"
    condition {
      older_than = "2592000s"
      tag_state  = "ANY"
    }
  }
  cleanup_policies {
    id     = "keep-recent-10"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }
  lifecycle {
    prevent_destroy = true
  }
}

resource "google_artifact_registry_repository_iam_member" "deployer_ar_writer" {
  location   = var.region
  repository = google_artifact_registry_repository.task_app.name
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.deployer.member
}
