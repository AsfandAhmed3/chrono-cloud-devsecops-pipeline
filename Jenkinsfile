pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        GITHUB_OWNER     = "${env.GITHUB_OWNER ?: 'AsfandAhmed3'}"
        GITHUB_REPO      = "${env.GITHUB_REPO ?: 'chrono-cloud-devsecops-pipeline'}"
        SLACK_CHANNEL    = "${env.SLACK_CHANNEL ?: 'deployements'}"
        IMAGE_REPO       = "chrono-cloud"
        K8S_CLUSTER_NODE = "desktop-control-plane"
        APP_NAMESPACE    = "chrono-cloud"
        TF_DIR           = "terraform"
        TF_STATE_PATH    = "/workspace/terraform/terraform.tfstate"
    }

    stages {
        stage('1. Checkout & GitHub Pending Status') {
            steps {
                script {
                    env.GIT_SHA = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.COMMIT_MSG = sh(script: 'git log -1 --pretty=%s', returnStdout: true).trim()
                    echo "Building Chrono-Cloud commit ${env.IMAGE_TAG} (${env.GIT_SHA})"
                }
                withCredentials([string(credentialsId: 'github-pat', variable: 'GH_TOKEN')]) {
                    sh '''
                        curl -fsSL -X POST \
                          -H "Authorization: Bearer ${GH_TOKEN}" \
                          -H "Accept: application/vnd.github+json" \
                          "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/statuses/${GIT_SHA}" \
                          -d '{"state":"pending","context":"continuous-deployment/jenkins-k8s","description":"Jenkins CD pipeline is building and scanning Chrono-Cloud..."}'
                    '''
                }
            }
        }

        stage('2. Docker Multi-Stage Build') {
            steps {
                sh '''
                    docker build \
                      --tag "${IMAGE_REPO}:${IMAGE_TAG}" \
                      --tag "${IMAGE_REPO}:latest" \
                      .
                '''
            }
        }

        stage('3. Trivy DevSecOps Vulnerability & IaC Gate') {
            steps {
                sh '''
                    echo "Running Trivy OS & library vulnerability scan (CRITICAL/HIGH gate)..."
                    trivy image --format json --output trivy-report.json --severity CRITICAL,HIGH --ignore-unfixed "${IMAGE_REPO}:${IMAGE_TAG}"
                    trivy image --exit-code 1 --severity CRITICAL,HIGH --ignore-unfixed "${IMAGE_REPO}:${IMAGE_TAG}"

                    echo "Running Trivy IaC misconfiguration scan on Terraform manifests..."
                    trivy config --exit-code 1 --severity CRITICAL,HIGH ./${TF_DIR}
                '''
                archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
            }
        }

        stage('4. Load Image into Local Kind Cluster') {
            steps {
                sh '''
                    echo "Importing ${IMAGE_REPO}:${IMAGE_TAG} into ${K8S_CLUSTER_NODE} containerd..."
                    docker save "${IMAGE_REPO}:${IMAGE_TAG}" | docker exec -i "${K8S_CLUSTER_NODE}" ctr --namespace=k8s.io images import -
                    docker save "${IMAGE_REPO}:latest" | docker exec -i "${K8S_CLUSTER_NODE}" ctr --namespace=k8s.io images import -
                '''
            }
        }

        stage('5. Terraform Automated K8s & Monitoring Provisioning') {
            steps {
                sh '''
                    TF_STATE_ARG=""
                    if [ -d "/workspace/terraform" ]; then
                        TF_STATE_ARG="-state=${TF_STATE_PATH}"
                    fi

                    terraform -chdir=${TF_DIR} init -input=false
                    terraform -chdir=${TF_DIR} apply -auto-approve ${TF_STATE_ARG} \
                      -var="kube_config_path=${KUBECONFIG:-/var/jenkins_home/.kube/config}" \
                      -var="kube_context=docker-desktop" \
                      -var="image_repository=${IMAGE_REPO}" \
                      -var="image_tag=${IMAGE_TAG}"

                    kubectl rollout status deployment/chrono-cloud -n ${APP_NAMESPACE} --timeout=120s
                '''
            }
        }

        stage('6. Post-Deployment Health & Telemetry Smoke Test') {
            steps {
                sh '''
                    kubectl get pods -n ${APP_NAMESPACE} -o wide
                    kubectl get pods -n monitoring -o wide
                    kubectl exec -n ${APP_NAMESPACE} deploy/chrono-cloud -c chrono-cloud-ui -- wget -qO- http://127.0.0.1:8080/healthz
                    echo ""
                    kubectl exec -n ${APP_NAMESPACE} deploy/chrono-cloud -c chrono-cloud-ui -- wget -qO- http://127.0.0.1:9113/metrics | head -n 10
                '''
            }
        }
    }

    post {
        success {
            withCredentials([
                string(credentialsId: 'slack-webhook-url', variable: 'SLACK_WEBHOOK'),
                string(credentialsId: 'github-pat', variable: 'GH_TOKEN')
            ]) {
                sh '''
                    PAYLOAD=$(jq -n \
                      --arg text "🟢 *Success: Chrono-Cloud UI (${IMAGE_TAG}) is live on local-cluster*" \
                      --arg sha "${IMAGE_TAG}" \
                      --arg msg "${COMMIT_MSG}" \
                      '{
                        text: $text,
                        attachments: [{
                          color: "#2eb886",
                          title: "Chrono-Cloud DevSecOps Deployment Summary",
                          fields: [
                            { title: "Commit", value: $sha, short: true },
                            { title: "Security Gate", value: "Trivy: 0 CRITICAL / HIGH CVEs", short: true },
                            { title: "Storefront", value: "http://localhost:8088", short: true },
                            { title: "Grafana / Prometheus", value: "http://localhost:3005 | :9090", short: true },
                            { title: "Change", value: $msg, short: false }
                          ]
                        }]
                      }')
                    curl -fsSL -X POST -H "Content-Type: application/json" -d "${PAYLOAD}" "${SLACK_WEBHOOK}"

                    curl -fsSL -X POST \
                      -H "Authorization: Bearer ${GH_TOKEN}" \
                      -H "Accept: application/vnd.github+json" \
                      "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/statuses/${GIT_SHA}" \
                      -d '{"state":"success","context":"continuous-deployment/jenkins-k8s","description":"Deployed to local-cluster and verified via Trivy, Terraform & K8s health checks."}'
                '''
            }
        }
        failure {
            withCredentials([
                string(credentialsId: 'slack-webhook-url', variable: 'SLACK_WEBHOOK'),
                string(credentialsId: 'github-pat', variable: 'GH_TOKEN')
            ]) {
                sh '''
                    PAYLOAD=$(jq -n \
                      --arg text "🔴 *Failure: Chrono-Cloud pipeline failed at commit ${IMAGE_TAG:-unknown}*" \
                      --arg url "${BUILD_URL}" \
                      '{
                        text: $text,
                        attachments: [{
                          color: "#cc2936",
                          title: "Pipeline Failure Alert",
                          fields: [
                            { title: "Jenkins Build", value: $url, short: false }
                          ]
                        }]
                      }')
                    curl -fsSL -X POST -H "Content-Type: application/json" -d "${PAYLOAD}" "${SLACK_WEBHOOK}" || true

                    if [ -n "${GIT_SHA:-}" ]; then
                      curl -fsSL -X POST \
                        -H "Authorization: Bearer ${GH_TOKEN}" \
                        -H "Accept: application/vnd.github+json" \
                        "https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/statuses/${GIT_SHA}" \
                        -d '{"state":"failure","context":"continuous-deployment/jenkins-k8s","description":"Jenkins CD pipeline failed. Check build logs."}' || true
                    fi
                '''
            }
        }
    }
}
