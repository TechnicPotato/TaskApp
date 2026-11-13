variable "project_id" {
  type        = string
  description = "ID of the project for Google Cloud"
  default     = "taskapp-gcloud"
}

variable "region" {
  type        = string
  description = "Target Google Cloud Region for all deployed resources"
  default     = "australia-southeast1"
}

variable "github_repository" {
  type        = string
  description = "GitHub repository (owner/name) allowed to deploy via WIF"
  default     = "TechnicPotato/TaskApp"
}
