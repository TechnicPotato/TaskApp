terraform {
  required_version = ">= 1.17.1"

  backend "gcs" {
    bucket = "taskapp-gcloud-tfstate"
    prefix = "task-app"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.11"
    }
  }

}
