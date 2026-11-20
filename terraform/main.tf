resource "kubernetes_namespace" "chrono_cloud" {
  metadata {
    name = var.app_namespace
    labels = {
      "app.kubernetes.io/name"       = "chrono-cloud"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

resource "kubernetes_deployment" "chrono_cloud" {
  metadata {
    name      = "chrono-cloud"
    namespace = kubernetes_namespace.chrono_cloud.metadata[0].name
    labels = {
      app                         = "chrono-cloud"
      "app.kubernetes.io/name"    = "chrono-cloud"
      "app.kubernetes.io/version" = var.image_tag
      "app.kubernetes.io/part-of" = "chrono-cloud-platform"
      "app.kubernetes.io/tier"    = "frontend"
    }
  }

  spec {
    replicas = var.replicas

    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_surge       = 1
        max_unavailable = 0
      }
    }

    selector {
      match_labels = {
        app = "chrono-cloud"
      }
    }

    template {
      metadata {
        labels = {
          app                         = "chrono-cloud"
          "app.kubernetes.io/name"    = "chrono-cloud"
          "app.kubernetes.io/version" = var.image_tag
        }
        annotations = {
          "prometheus.io/scrape"     = "true"
          "prometheus.io/port"       = "9113"
          "prometheus.io/path"       = "/metrics"
          "app.kubernetes.io/commit" = var.image_tag
        }
      }

      spec {
        automount_service_account_token = false

        security_context {
          run_as_non_root = true
          run_as_user     = 101
          fs_group        = 101
        }

        container {
          name              = "chrono-cloud-ui"
          image             = "${var.image_repository}:${var.image_tag}"
          image_pull_policy = "IfNotPresent"

          port {
            name           = "http"
            container_port = 8080
            protocol       = "TCP"
          }

          security_context {
            allow_privilege_escalation = false
            run_as_non_root            = true
            run_as_user                = 101
            read_only_root_filesystem  = false
            capabilities {
              drop = ["ALL"]
            }
          }

          resources {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
            limits = {
              cpu    = "250m"
              memory = "128Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/healthz"
              port = 8080
            }
            initial_delay_seconds = 5
            period_seconds        = 15
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/healthz"
              port = 8080
            }
            initial_delay_seconds = 3
            period_seconds        = 10
            timeout_seconds       = 3
            failure_threshold     = 3
          }
        }

        container {
          name              = "nginx-prometheus-exporter"
          image             = "nginx/nginx-prometheus-exporter:1.1.0"
          image_pull_policy = "IfNotPresent"
          args              = ["-nginx.scrape-uri=http://127.0.0.1:8080/stub_status"]

          port {
            name           = "metrics"
            container_port = 9113
            protocol       = "TCP"
          }

          security_context {
            allow_privilege_escalation = false
            run_as_non_root            = true
            run_as_user                = 101
            read_only_root_filesystem  = true
            capabilities {
              drop = ["ALL"]
            }
          }

          resources {
            requests = {
              cpu    = "25m"
              memory = "32Mi"
            }
            limits = {
              cpu    = "100m"
              memory = "64Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/metrics"
              port = 9113
            }
            initial_delay_seconds = 5
            period_seconds        = 20
          }

          readiness_probe {
            http_get {
              path = "/metrics"
              port = 9113
            }
            initial_delay_seconds = 3
            period_seconds        = 10
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "chrono_cloud" {
  metadata {
    name      = "chrono-cloud"
    namespace = kubernetes_namespace.chrono_cloud.metadata[0].name
    labels = {
      app = "chrono-cloud"
    }
  }

  spec {
    type = "LoadBalancer"

    selector = {
      app = "chrono-cloud"
    }

    port {
      name        = "http"
      port        = 8088
      target_port = 8080
      node_port   = 30080
      protocol    = "TCP"
    }

    port {
      name        = "metrics"
      port        = 9113
      target_port = 9113
      protocol    = "TCP"
    }
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v2" "chrono_cloud" {
  metadata {
    name      = "chrono-cloud-hpa"
    namespace = kubernetes_namespace.chrono_cloud.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.chrono_cloud.metadata[0].name
    }

    min_replicas = var.replicas
    max_replicas = 5

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 75
        }
      }
    }
  }
}
