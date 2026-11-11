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
