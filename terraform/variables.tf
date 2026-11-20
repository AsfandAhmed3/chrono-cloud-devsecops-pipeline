variable "kube_config_path" {
  description = "Path to the Kubernetes configuration file."
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Kubernetes context name targeting the local cluster."
  type        = string
  default     = "docker-desktop"
}

variable "app_namespace" {
  description = "Namespace for the Chrono-Cloud storefront application."
  type        = string
  default     = "chrono-cloud"
}

variable "monitoring_namespace" {
  description = "Namespace for Prometheus and Grafana observability stack."
  type        = string
  default     = "monitoring"
}

variable "image_repository" {
  description = "Container image repository for the Chrono-Cloud UI."
  type        = string
  default     = "chrono-cloud"
}

variable "image_tag" {
  description = "Immutable Git commit SHA or tag for the deployed Chrono-Cloud image."
  type        = string
  default     = "latest"
}

variable "replicas" {
  description = "Minimum number of Chrono-Cloud application pods."
  type        = number
  default     = 2
}

variable "enable_monitoring" {
  description = "Whether to provision kube-prometheus-stack via Helm."
  type        = bool
  default     = true
}
