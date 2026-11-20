output "storefront_url" {
  description = "Local URL for the Chrono-Cloud luxury watch storefront."
  value       = "http://localhost:8088"
}

output "prometheus_url" {
  description = "Local URL for Prometheus UI."
  value       = "http://localhost:9090"
}

output "grafana_url" {
  description = "Local URL for Grafana Dashboards (user: admin / pass: chrono-cloud-admin)."
  value       = "http://localhost:3005"
}

output "deployed_image" {
  description = "Deployed container image and tag."
  value       = "${var.image_repository}:${var.image_tag}"
}

output "namespace" {
  description = "Kubernetes namespace hosting the Chrono-Cloud storefront."
  value       = kubernetes_namespace.chrono_cloud.metadata[0].name
}
