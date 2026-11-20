import jenkins.model.*
import com.cloudbees.plugins.credentials.*
import com.cloudbees.plugins.credentials.domains.*
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl
import hudson.util.Secret
import hudson.plugins.git.*
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import com.cloudbees.jenkins.GitHubPushTrigger

def instance = Jenkins.get()

// 1. Adapt host kubeconfig so Jenkins inside Docker can reach desktop-control-plane:6443
def hostKube = new File('/root/.kube/config-host')
if (hostKube.exists()) {
    def adapted = hostKube.text.replaceAll(/https:\/\/(127\.0\.0\.1|localhost):\d+/, 'https://desktop-control-plane:6443')
    ['/root/.kube', '/var/jenkins_home/.kube'].each { dirPath ->
        def dir = new File(dirPath)
        if (!dir.exists()) { dir.mkdirs() }
        new File("${dirPath}/config").text = adapted
    }
    println "[Chrono-Cloud Init] Adapted kubeconfig for kind network (desktop-control-plane:6443)."
}

// 2. Register Secret Text credentials from environment variables
def store = instance.getExtensionList('com.cloudbees.plugins.credentials.SystemCredentialsProvider')[0].getStore()
def domain = Domain.global()

def upsertSecret = { String id, String desc, String envKey ->
    def value = System.getenv(envKey)
    if (!value) {
        println "[Chrono-Cloud Init] Env var ${envKey} is empty, skipping credential ${id}."
        return
    }
    def cred = new StringCredentialsImpl(CredentialsScope.GLOBAL, id, desc, Secret.fromString(value))
    def existing = store.getCredentials(domain).find { it.id == id }
    if (existing) {
        store.updateCredentials(domain, existing, cred)
    } else {
        store.addCredentials(domain, cred)
    }
    println "[Chrono-Cloud Init] Registered credential: ${id}"
}

upsertSecret('slack-webhook-url', 'Chrono-Cloud Slack #deployements Incoming Webhook', 'SLACK_WEBHOOK_URL')
upsertSecret('slack-bot-token', 'Chrono-Cloud Slack Bot OAuth Token', 'SLACK_BOT_TOKEN')
upsertSecret('github-pat', 'GitHub Personal Access Token for Commit Statuses', 'GITHUB_PAT')

// 3. Auto-create the Chrono-Cloud Pipeline Job connected to GitHub
def jobName = 'chrono-cloud-devsecops-pipeline'
def owner = System.getenv('GITHUB_OWNER') ?: 'AsfandAhmed3'
def repo = System.getenv('GITHUB_REPO') ?: 'chrono-cloud-devsecops-pipeline'
def repoUrl = "https://github.com/${owner}/${repo}.git"

if (instance.getItem(jobName) == null) {
    def job = instance.createProject(WorkflowJob, jobName)
    def scm = new GitSCM(
        [new UserRemoteConfig(repoUrl, null, null, null)],
        [new BranchSpec('*/main')],
        false, [], null, null, []
    )
    def flowDef = new CpsScmFlowDefinition(scm, 'Jenkinsfile')
    flowDef.setLightweight(true)
    job.setDefinition(flowDef)
    job.addTrigger(new GitHubPushTrigger())
    job.save()
    println "[Chrono-Cloud Init] Created pipeline job '${jobName}' pointing to ${repoUrl}"
}

instance.save()
