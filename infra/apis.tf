locals {
  enabled_apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "iamcredentials.googleapis.com",
    "firestore.googleapis.com",
  ]
}

resource "google_project_service" "required" {
  for_each           = toset(local.enabled_apis)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}
