resource "google_cloud_run_v2_service" "task_app" {
  ingress             = "INGRESS_TRAFFIC_ALL"
  location            = var.region
  name                = "task-app"
  project             = var.project_id
  deletion_protection = true

  template {
    service_account = google_service_account.runtime.email
    containers {
      # Initial image only; CI owns this field
      image = "australia-southeast1-docker.pkg.dev/taskapp-gcloud/task-app/task-app:d2fa3cd271e743640389cd070969e112cb257c77"
      env {
        name  = "TASK_STORE"
        value = "firestore"
      }
      ports {
        container_port = 8080
        name           = "http1"
      }
      resources {
        cpu_idle = true
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        startup_cpu_boost = true
      }
    }
    scaling {
      max_instance_count = 2
      min_instance_count = 0
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }
}
