/**
 * CloudOps — Demo dataset seed
 * Populates all modules with sample data for local testing without real cloud APIs.
 */
import {
  PrismaClient,
  CloudProvider,
  InstanceStatus,
  AlertSeverity,
  TerraformStatus,
} from '@prisma/client'

const prisma = new PrismaClient()

export async function seedDemoData() {
  console.log('Seeding demo data...')

  const project = await prisma.project.findUnique({ where: { slug: 'default' } })
  if (!project) {
    throw new Error('Run prisma:seed first (base roles/users required)')
  }

  const admin = await prisma.user.findUnique({ where: { email: 'admin@cloudops.local' } })
  const viewer = await prisma.user.findUnique({ where: { email: 'viewer@demo.local' } })

  // ── Cloud accounts ─────────────────────────────────────────────
  const awsAccount = await prisma.cloudAccount.upsert({
    where: { id: 'demo-aws-account-001' },
    create: {
      id: 'demo-aws-account-001',
      projectId: project.id,
      name: 'Demo AWS Production',
      provider: CloudProvider.AWS,
      accountId: '123456789012',
      credentials: {
        create: [{ credentialType: 'IAM_ROLE', secretRef: 'vault:demo/aws/role' }],
      },
    },
    update: {},
  })

  const gcpAccount = await prisma.cloudAccount.upsert({
    where: { id: 'demo-gcp-account-001' },
    create: {
      id: 'demo-gcp-account-001',
      projectId: project.id,
      name: 'Demo GCP Analytics',
      provider: CloudProvider.GCP,
      accountId: 'demo-gcp-project',
      credentials: {
        create: [{ credentialType: 'SERVICE_ACCOUNT', secretRef: 'vault:demo/gcp/sa' }],
      },
    },
    update: {},
  })

  const azureAccount = await prisma.cloudAccount.upsert({
    where: { id: 'demo-azure-account-001' },
    create: {
      id: 'demo-azure-account-001',
      projectId: project.id,
      name: 'Demo Azure Enterprise',
      provider: CloudProvider.AZURE,
      accountId: 'demo-subscription-id',
      credentials: {
        create: [{ credentialType: 'SERVICE_PRINCIPAL', secretRef: 'vault:demo/azure/sp' }],
      },
    },
    update: {},
  })

  // ── Instances ──────────────────────────────────────────────────
  const demoInstances = [
    { externalId: 'i-demo-aws-web', name: 'demo-aws-web-01', provider: CloudProvider.AWS, region: 'us-east-1', instanceType: 't3.medium', status: InstanceStatus.RUNNING, cloudAccountId: awsAccount.id },
    { externalId: 'i-demo-aws-db', name: 'demo-aws-db-01', provider: CloudProvider.AWS, region: 'eu-west-1', instanceType: 't3.large', status: InstanceStatus.STOPPED, cloudAccountId: awsAccount.id },
    { externalId: 'gcp-demo-app', name: 'demo-gcp-app-01', provider: CloudProvider.GCP, region: 'us-central1', instanceType: 'e2-medium', status: InstanceStatus.RUNNING, cloudAccountId: gcpAccount.id },
    { externalId: 'azure-demo-vm', name: 'demo-azure-vm-01', provider: CloudProvider.AZURE, region: 'eastus', instanceType: 'Standard_B2s', status: InstanceStatus.RUNNING, cloudAccountId: azureAccount.id },
    { externalId: 'i-demo-aws-worker', name: 'demo-aws-worker-01', provider: CloudProvider.AWS, region: 'us-east-1', instanceType: 't3.small', status: InstanceStatus.PENDING, cloudAccountId: awsAccount.id },
  ]

  const instanceRecords = []
  for (const inst of demoInstances) {
    const existing = await prisma.instance.findFirst({
      where: { cloudAccountId: inst.cloudAccountId, externalId: inst.externalId },
    })
    const record = existing
      ? await prisma.instance.update({ where: { id: existing.id }, data: inst })
      : await prisma.instance.create({ data: { ...inst, projectId: project.id } })
    instanceRecords.push(record)
  }

  // ── VPS ────────────────────────────────────────────────────────
  const vps1 = await prisma.vpsServer.upsert({
    where: { id: 'demo-vps-001' },
    create: {
      id: 'demo-vps-001',
      projectId: project.id,
      name: 'Demo Bare Metal FR',
      hostname: '192.168.10.50',
      port: 22,
      username: 'ubuntu',
      sshKeyRef: 'vault:demo/ssh/bare-metal-fr',
    },
    update: {},
  })

  const vps2 = await prisma.vpsServer.upsert({
    where: { id: 'demo-vps-002' },
    create: {
      id: 'demo-vps-002',
      projectId: project.id,
      name: 'Demo VPS US East',
      hostname: '10.0.0.42',
      port: 2222,
      username: 'deploy',
      sshKeyRef: 'vault:demo/ssh/vps-us',
    },
    update: {},
  })

  // ── SSH sessions & commands ───────────────────────────────────
  if (admin) {
    await prisma.commandExecution.createMany({
      data: [
        { userId: admin.id, command: 'uptime', output: ' 12:00:01 up 45 days,  3 users,  load average: 0.15, 0.10, 0.05', exitCode: 0 },
        { userId: admin.id, command: 'docker ps', output: 'CONTAINER ID   IMAGE          STATUS\nabc123         nginx:latest   Up 2 days', exitCode: 0 },
        { userId: admin.id, command: 'df -h', output: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        80G   34G   46G  43% /', exitCode: 0 },
      ],
      skipDuplicates: true,
    })
  }

  // ── Docker ─────────────────────────────────────────────────────
  const dockerHost = await prisma.dockerHost.upsert({
    where: { id: 'demo-docker-host-001' },
    create: { id: 'demo-docker-host-001', hostRef: `vps:${vps1.id}` },
    update: {},
  })

  await prisma.dockerContainer.createMany({
    data: [
      { id: 'demo-docker-c-nginx', dockerHostId: dockerHost.id, containerId: 'abc123', name: 'nginx', image: 'nginx:1.25', status: 'running' },
      { id: 'demo-docker-c-redis', dockerHostId: dockerHost.id, containerId: 'def456', name: 'redis', image: 'redis:7-alpine', status: 'running' },
      { id: 'demo-docker-c-api', dockerHostId: dockerHost.id, containerId: 'ghi789', name: 'cloudops-api', image: 'cloudops/backend:dev', status: 'running' },
      { id: 'demo-docker-c-stopped', dockerHostId: dockerHost.id, containerId: 'jkl012', name: 'old-worker', image: 'cloudops/worker:old', status: 'exited' },
    ],
    skipDuplicates: true,
  })

  // ── Kubernetes ─────────────────────────────────────────────────
  const k8sCluster = await prisma.kubernetesCluster.upsert({
    where: { id: 'demo-k8s-cluster-001' },
    create: { id: 'demo-k8s-cluster-001', name: 'demo-prod-cluster', endpoint: 'https://k8s.demo.local:6443' },
    update: {},
  })

  await prisma.kubernetesResource.createMany({
    data: [
      { id: 'demo-k8s-ns-default', clusterId: k8sCluster.id, kind: 'Namespace', name: 'default', status: 'Active' },
      { id: 'demo-k8s-ns-cloudops', clusterId: k8sCluster.id, kind: 'Namespace', name: 'cloudops', status: 'Active' },
      { id: 'demo-k8s-pod-api', clusterId: k8sCluster.id, kind: 'Pod', namespace: 'cloudops', name: 'backend-api-0', status: 'Running' },
      { id: 'demo-k8s-dep-api', clusterId: k8sCluster.id, kind: 'Deployment', namespace: 'cloudops', name: 'backend-api', status: 'Available' },
      { id: 'demo-k8s-svc-api', clusterId: k8sCluster.id, kind: 'Service', namespace: 'cloudops', name: 'backend-api', status: 'ClusterIP' },
    ],
    skipDuplicates: true,
  })

  // ── Jenkins ────────────────────────────────────────────────────
  const jenkinsServer = await prisma.jenkinsServer.upsert({
    where: { id: 'demo-jenkins-001' },
    create: {
      id: 'demo-jenkins-001',
      name: 'Demo Jenkins CI',
      url: 'http://localhost:8080',
      secretRef: 'vault:demo/jenkins/token',
    },
    update: {},
  })

  const jobDeploy = await prisma.jenkinsJob.upsert({
    where: { id: 'demo-jenkins-job-deploy' },
    create: { id: 'demo-jenkins-job-deploy', serverId: jenkinsServer.id, name: 'deploy-backend', url: '/job/deploy-backend' },
    update: {},
  })

  const jobTf = await prisma.jenkinsJob.upsert({
    where: { id: 'demo-jenkins-job-tf' },
    create: { id: 'demo-jenkins-job-tf', serverId: jenkinsServer.id, name: 'terraform-apply', url: '/job/terraform-apply' },
    update: {},
  })

  await prisma.jenkinsBuild.createMany({
    data: [
      { id: 'demo-build-42', jobId: jobDeploy.id, buildNum: 42, status: 'SUCCESS' },
      { id: 'demo-build-43', jobId: jobDeploy.id, buildNum: 43, status: 'RUNNING' },
      { id: 'demo-build-15', jobId: jobTf.id, buildNum: 15, status: 'FAILURE' },
    ],
    skipDuplicates: true,
  })

  // ── Terraform ──────────────────────────────────────────────────
  const tfWorkspace = await prisma.terraformWorkspace.upsert({
    where: { id: 'demo-tf-ws-aws' },
    create: { id: 'demo-tf-ws-aws', name: 'demo-aws-ec2', provider: CloudProvider.AWS },
    update: {},
  })

  const tfRunPlanned = await prisma.terraformRun.upsert({
    where: { id: 'demo-tf-run-001' },
    create: {
      id: 'demo-tf-run-001',
      workspaceId: tfWorkspace.id,
      status: TerraformStatus.PLANNED,
      planOutput: '# Plan: 1 to add\n+ aws_instance.demo_web\n  instance_type = "t3.medium"',
    },
    update: {},
  })

  await prisma.terraformRun.createMany({
    data: [
      { id: 'demo-tf-run-002', workspaceId: tfWorkspace.id, status: TerraformStatus.APPLIED },
      { id: 'demo-tf-run-003', workspaceId: tfWorkspace.id, status: TerraformStatus.FAILED, planOutput: 'Error: insufficient permissions' },
    ],
    skipDuplicates: true,
  })

  await prisma.terraformRunLog.createMany({
    data: [
      { id: 'demo-tf-log-1', runId: tfRunPlanned.id, level: 'info', message: 'Initializing Terraform...' },
      { id: 'demo-tf-log-2', runId: tfRunPlanned.id, level: 'info', message: 'Plan completed successfully' },
    ],
    skipDuplicates: true,
  })

  await prisma.instanceTemplate.upsert({
    where: { id: 'demo-template-aws-web' },
    create: {
      id: 'demo-template-aws-web',
      name: 'Demo AWS Web Server',
      provider: CloudProvider.AWS,
      config: { instanceType: 't3.medium', ami: 'ami-demo', region: 'us-east-1', tags: { env: 'demo' } },
    },
    update: {},
  })

  // ── Metrics ────────────────────────────────────────────────────
  const now = new Date()
  const metricData = []
  for (const inst of instanceRecords) {
    for (let i = 0; i < 10; i++) {
      const t = new Date(now.getTime() - i * 3600000)
      metricData.push(
        { resourceId: inst.id, metricType: 'cpu', value: 20 + Math.random() * 60, unit: '%', recordedAt: t },
        { resourceId: inst.id, metricType: 'ram', value: 40 + Math.random() * 40, unit: '%', recordedAt: t },
        { resourceId: inst.id, metricType: 'disk', value: 30 + Math.random() * 30, unit: '%', recordedAt: t },
      )
    }
  }
  await prisma.metricSample.createMany({ data: metricData, skipDuplicates: true })

  // ── Billing ────────────────────────────────────────────────────
  const billingAws = await prisma.billingAccount.upsert({
    where: { id: 'demo-billing-aws' },
    create: { id: 'demo-billing-aws', provider: CloudProvider.AWS, accountId: '123456789012' },
    update: {},
  })

  const billingGcp = await prisma.billingAccount.upsert({
    where: { id: 'demo-billing-gcp' },
    create: { id: 'demo-billing-gcp', provider: CloudProvider.GCP, accountId: 'demo-gcp-project' },
    update: {},
  })

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  await prisma.billingRecord.createMany({
    data: [
      { billingAccountId: billingAws.id, amount: 1250.5, service: 'EC2', periodStart: monthStart, periodEnd: now, isEstimated: true },
      { billingAccountId: billingAws.id, amount: 320.0, service: 'S3', periodStart: monthStart, periodEnd: now, isEstimated: true },
      { billingAccountId: billingGcp.id, amount: 890.25, service: 'Compute Engine', periodStart: monthStart, periodEnd: now, isEstimated: true },
    ],
    skipDuplicates: true,
  })

  // ── Alerts & notifications ─────────────────────────────────────
  const cpuRule = await prisma.alertRule.findFirst({ where: { condition: 'cpu_high' } })
  const costRule = await prisma.alertRule.findFirst({ where: { condition: 'cost_high' } })

  if (cpuRule) {
    await prisma.alert.upsert({
      where: { id: 'demo-alert-cpu' },
      create: {
        id: 'demo-alert-cpu',
        ruleId: cpuRule.id,
        message: 'CPU usage above 90% on demo-aws-web-01',
        severity: AlertSeverity.WARNING,
      },
      update: {},
    })
  }

  if (costRule) {
    await prisma.alert.upsert({
      where: { id: 'demo-alert-cost' },
      create: {
        id: 'demo-alert-cost',
        ruleId: costRule.id,
        message: 'Monthly AWS spend exceeded $1000 threshold',
        severity: AlertSeverity.WARNING,
      },
      update: {},
    })
  }

  if (admin) {
    await prisma.notification.createMany({
      data: [
        { userId: admin.id, channel: 'in-app', title: 'Demo: Instance synced', body: 'Inventory sync completed for Demo AWS Production (5 instances)' },
        { userId: admin.id, channel: 'in-app', title: 'Demo: Jenkins build failed', body: 'terraform-apply #15 failed — see logs' },
        { userId: admin.id, channel: 'in-app', title: 'Demo: High CPU alert', body: 'demo-aws-web-01 CPU at 92%' },
      ],
      skipDuplicates: true,
    })
  }

  if (viewer) {
    await prisma.notification.createMany({
      data: [
        { userId: viewer.id, channel: 'in-app', title: 'Welcome to CloudOps Demo', body: 'Explore the dashboard with pre-loaded demo data' },
      ],
      skipDuplicates: true,
    })
  }

  // ── Audit logs ─────────────────────────────────────────────────
  if (admin) {
    await prisma.auditLog.createMany({
      data: [
        { userId: admin.id, action: 'cloud_account.sync', resource: 'cloud_account', resourceId: awsAccount.id, metadata: { synced: 5 } },
        { userId: admin.id, action: 'instance.start', resource: 'instance', resourceId: instanceRecords[1]?.id, metadata: { mock: true } },
        { userId: admin.id, action: 'terraform.plan', resource: 'terraform_run', resourceId: tfRunPlanned.id },
        { userId: admin.id, action: 'jenkins.build.trigger', resource: 'jenkins_job', resourceId: jobDeploy.id },
      ],
      skipDuplicates: true,
    })
  }

  console.log('Demo data seeded successfully.')
  console.log(`  Cloud accounts: 3 (AWS, GCP, Azure)`)
  console.log(`  Instances: ${instanceRecords.length}`)
  console.log(`  VPS: 2`)
  console.log(`  Docker containers: 4`)
  console.log(`  K8s resources: 5`)
  console.log(`  Jenkins jobs: 2, builds: 3`)
  console.log(`  Terraform runs: 3`)
  console.log(`  Metric samples: ${metricData.length}`)
  console.log(`  Billing records: 3`)
  console.log(`  Alerts: 2, Notifications: 4`)
}

async function main() {
  await seedDemoData()
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
