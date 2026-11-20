resource "kubernetes_namespace" "monitoring" {
  count = var.enable_monitoring ? 1 : 0

  metadata {
    name = var.monitoring_namespace
    labels = {
      "app.kubernetes.io/name"       = "monitoring"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

resource "kubernetes_config_map" "chrono_cloud_dashboard" {
  count = var.enable_monitoring ? 1 : 0

  metadata {
    name      = "chrono-cloud-grafana-dashboard"
    namespace = kubernetes_namespace.monitoring[0].metadata[0].name
    labels = {
      grafana_dashboard = "1"
    }
  }

  data = {
    "chrono-cloud-dashboard.json" = file("${path.module}/dashboards/chrono-cloud-dashboard.json")
  }
}

resource "helm_release" "kube_prometheus_stack" {
  count = var.enable_monitoring ? 1 : 0

  name       = "monitoring"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring[0].metadata[0].name
  timeout    = 600
  wait       = true

  values = [
    yamlencode({
      fullnameOverride = "monitoring"

      alertmanager = {
        enabled = false
      }

      kubeEtcd = {
        enabled = false
      }

      kubeControllerManager = {
        enabled = false
      }

      kubeScheduler = {
        enabled = false
      }

      kubeProxy = {
        enabled = false
      }

      nodeExporter = {
        enabled = false
      }

      kubeStateMetrics = {
        enabled = true
      }

      kube-state-metrics = {
        resources = {
          requests = {
            cpu    = "25m"
            memory = "64Mi"
          }
          limits = {
            cpu    = "100m"
            memory = "128Mi"
          }
        }
      }

      prometheusOperator = {
        resources = {
          requests = {
            cpu    = "50m"
            memory = "128Mi"
          }
          limits = {
            cpu    = "200m"
            memory = "256Mi"
          }
        }
      }

      prometheus = {
        service = {
          type     = "LoadBalancer"
          port     = 9090
          nodePort = 30090
        }
        prometheusSpec = {
          retention = "2d"
          resources = {
            requests = {
              cpu    = "100m"
              memory = "256Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "640Mi"
            }
          }
          additionalScrapeConfigs = [
            {
              job_name        = "chrono-cloud-nginx"
              scrape_interval = "10s"
              kubernetes_sd_configs = [
                {
                  role = "pod"
                  namespaces = {
                    names = [var.app_namespace]
                  }
                }
              ]
              relabel_configs = [
                {
                  source_labels = ["__meta_kubernetes_pod_annotation_prometheus_io_scrape"]
                  action        = "keep"
                  regex         = "true"
                },
                {
                  source_labels = ["__meta_kubernetes_pod_annotation_prometheus_io_path"]
                  action        = "replace"
                  target_label  = "__metrics_path__"
                  regex         = "(.+)"
                },
                {
                  source_labels = ["__address__", "__meta_kubernetes_pod_annotation_prometheus_io_port"]
                  action        = "replace"
                  regex         = "([^:]+)(?::\\d+)?;(\\d+)"
                  replacement   = "$1:$2"
                  target_label  = "__address__"
                },
                {
                  source_labels = ["__meta_kubernetes_namespace"]
                  action        = "replace"
                  target_label  = "namespace"
                },
                {
                  source_labels = ["__meta_kubernetes_pod_name"]
                  action        = "replace"
                  target_label  = "pod"
                }
              ]
            }
          ]
        }
      }

      grafana = {
        enabled       = true
        adminPassword = "chrono-cloud-admin"
        service = {
          type       = "LoadBalancer"
          port       = 3005
          targetPort = 3000
          nodePort   = 30300
        }
        resources = {
          requests = {
            cpu    = "50m"
            memory = "128Mi"
          }
          limits = {
            cpu    = "250m"
            memory = "256Mi"
          }
        }
        sidecar = {
          dashboards = {
            enabled         = true
            label           = "grafana_dashboard"
            labelValue      = "1"
            searchNamespace = "ALL"
          }
        }
      }
    })
  ]

  depends_on = [
    kubernetes_config_map.chrono_cloud_dashboard
  ]
}
