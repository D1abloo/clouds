/**
 * CloudOps — Comprehensive demo dataset seed
 * 18 cloud instances (AWS/GCP/Azure) + 8 VPS + metrics, Docker, K8s, billing, alerts, etc.
 */
import {
  PrismaClient,
  CloudProvider,
  AlertSeverity,
  TerraformStatus,
} from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { clearDemoData } from './demo/clear-demo'
import {
  DEMO_ACCOUNTS,
  ALL_DEMO_INSTANCES,
  DEMO_VPS_HOSTS,
  DEMO_DOCKER_CONTAINERS,
  DEMO_K8S_RESOURCES,
  DEMO_JENKINS_JOBS,
  buildInstanceMetadata,
  buildVpsMetadata,
} from './demo/demo-catalog'

const defaultPrisma = new PrismaClient()

const accountNames: Record<string, string> = {
  [DEMO_ACCOUNTS.aws.id]: DEMO_ACCOUNTS.aws.name,
  [DEMO_ACCOUNTS.gcp.id]: DEMO_ACCOUNTS.gcp.name,
  [DEMO_ACCOUNTS.azure.id]: DEMO_ACCOUNTS.azure.name,
}

export async function seedDemoData(
  options: { clearFirst?: boolean } = {},
  prismaClient: PrismaClient = defaultPrisma,
) {
  const prisma = prismaClient
  if (options.clearFirst) {
    await clearDemoData(prisma)
  }

  console.log('Seeding comprehensive demo data...')

  const project = await prisma.project.findUnique({ where: { slug: 'default' } })
  if (!project) throw new Error('Run prisma:seed first (base roles/users required)')

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } })
  const demoPasswordHash = await bcrypt.hash('Demo1234!', 12)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@cloudops.local' },
    create: {
      email: 'demo@cloudops.local',
      passwordHash: demoPasswordHash,
      name: 'Demo Super Admin',
      userRoles: superAdminRole
        ? { create: [{ roleId: superAdminRole.id, projectId: project.id }] }
        : undefined,
    },
    update: { name: 'Demo Super Admin' },
  })

  const admin = await prisma.user.findUnique({ where: { email: 'admin@cloudops.local' } })
  const primaryUser = demoUser ?? admin

  // ── Cloud accounts ───────────────────────────────────────────
  const awsAccount = await prisma.cloudAccount.upsert({
    where: { id: DEMO_ACCOUNTS.aws.id },
    create: {
      id: DEMO_ACCOUNTS.aws.id,
      projectId: project.id,
      name: DEMO_ACCOUNTS.aws.name,
      provider: CloudProvider.AWS,
      accountId: DEMO_ACCOUNTS.aws.accountId,
      credentials: { create: [{ credentialType: 'IAM_ROLE', secretRef: 'vault:demo/aws/role' }] },
      regions: {
        create: [
          { regionId: 'eu-west-1', name: 'Europe (Ireland)' },
          { regionId: 'eu-south-2', name: 'Europe (Spain)' },
          { regionId: 'us-east-1', name: 'US East (N. Virginia)' },
        ],
      },
    },
    update: { name: DEMO_ACCOUNTS.aws.name },
  })

  const gcpAccount = await prisma.cloudAccount.upsert({
    where: { id: DEMO_ACCOUNTS.gcp.id },
    create: {
      id: DEMO_ACCOUNTS.gcp.id,
      projectId: project.id,
      name: DEMO_ACCOUNTS.gcp.name,
      provider: CloudProvider.GCP,
      accountId: DEMO_ACCOUNTS.gcp.accountId,
      credentials: { create: [{ credentialType: 'SERVICE_ACCOUNT', secretRef: 'vault:demo/gcp/sa' }] },
      regions: {
        create: [
          { regionId: 'europe-west1-b', name: 'Belgium' },
          { regionId: 'europe-southwest1-a', name: 'Madrid' },
          { regionId: 'us-central1-a', name: 'Iowa' },
        ],
      },
    },
    update: { name: DEMO_ACCOUNTS.gcp.name },
  })

  const azureAccount = await prisma.cloudAccount.upsert({
    where: { id: DEMO_ACCOUNTS.azure.id },
    create: {
      id: DEMO_ACCOUNTS.azure.id,
      projectId: project.id,
      name: DEMO_ACCOUNTS.azure.name,
      provider: CloudProvider.AZURE,
      accountId: DEMO_ACCOUNTS.azure.accountId,
      credentials: { create: [{ credentialType: 'SERVICE_PRINCIPAL', secretRef: 'vault:demo/azure/sp' }] },
      regions: {
        create: [
          { regionId: 'westeurope', name: 'West Europe' },
          { regionId: 'spaincentral', name: 'Spain Central' },
          { regionId: 'eastus', name: 'East US' },
        ],
      },
    },
    update: { name: DEMO_ACCOUNTS.azure.name },
  })

  const accountMap = { aws: awsAccount, gcp: gcpAccount, azure: azureAccount }

  // ── Instances (18) ───────────────────────────────────────────
  const instanceRecords = []
  for (const def of ALL_DEMO_INSTANCES) {
    const accountName = accountNames[def.accountId] ?? 'Demo Account'
    const record = await prisma.instance.upsert({
      where: { id: def.id },
      create: {
        id: def.id,
        projectId: project.id,
        cloudAccountId: def.accountId,
        externalId: def.externalId,
        name: def.name,
        provider: def.provider,
        region: def.region,
        instanceType: def.instanceType,
        status: def.status,
        metadata: buildInstanceMetadata(def, accountName),
      },
      update: {
        name: def.name,
        status: def.status,
        region: def.region,
        instanceType: def.instanceType,
        metadata: buildInstanceMetadata(def, accountName),
      },
    })
    instanceRecords.push(record)
  }

  // ── VPS (8) ──────────────────────────────────────────────────
  const vpsRecords = []
  for (const def of DEMO_VPS_HOSTS) {
    const vps = await prisma.vpsServer.upsert({
      where: { id: def.id },
      create: {
        id: def.id,
        projectId: project.id,
        name: def.name,
        hostname: def.hostname,
        port: def.port,
        username: def.username,
        sshKeyRef: `vault:demo/ssh/${def.name}`,
        metadata: buildVpsMetadata(def),
      },
      update: {
        name: def.name,
        hostname: def.hostname,
        metadata: buildVpsMetadata(def),
      },
    })
    vpsRecords.push(vps)
  }

  const dockerHostVps = vpsRecords.find((v) => v.name === 'vps-prod-docker-01') ?? vpsRecords[0]

  // ── Docker ───────────────────────────────────────────────────
  const dockerHost = await prisma.dockerHost.upsert({
    where: { id: 'demo-docker-host-001' },
    create: { id: 'demo-docker-host-001', hostRef: dockerHostVps.id },
    update: { hostRef: dockerHostVps.id },
  })

  for (const c of DEMO_DOCKER_CONTAINERS) {
    await prisma.dockerContainer.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        dockerHostId: dockerHost.id,
        containerId: c.containerId,
        name: c.name,
        image: c.image,
        status: c.status,
      },
      update: { status: c.status },
    })
  }

  // ── Kubernetes ───────────────────────────────────────────────
  const k8sCluster = await prisma.kubernetesCluster.upsert({
    where: { id: 'demo-k8s-cluster-001' },
    create: {
      id: 'demo-k8s-cluster-001',
      name: 'demo-prod-cluster',
      endpoint: 'https://k8s.demo.local:6443',
    },
    update: {},
  })

  for (const r of DEMO_K8S_RESOURCES) {
    await prisma.kubernetesResource.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        clusterId: k8sCluster.id,
        kind: r.kind,
        namespace: r.namespace ?? undefined,
        name: r.name,
        status: r.status,
      },
      update: { status: r.status },
    })
  }

  // ── Jenkins ──────────────────────────────────────────────────
  const jenkinsServer = await prisma.jenkinsServer.upsert({
    where: { id: 'demo-jenkins-001' },
    create: {
      id: 'demo-jenkins-001',
      name: 'Jenkins Demo Server',
      url: 'http://demo-jenkins.local:8080',
      secretRef: 'vault:demo/jenkins/token',
    },
    update: { name: 'Jenkins Demo Server' },
  })

  const jobRecords = []
  for (const jobName of DEMO_JENKINS_JOBS) {
    const jobId = `demo-jenkins-job-${jobName}`
    const job = await prisma.jenkinsJob.upsert({
      where: { id: jobId },
      create: {
        id: jobId,
        serverId: jenkinsServer.id,
        name: jobName,
        url: `/job/${jobName}`,
      },
      update: {},
    })
    jobRecords.push(job)
  }

  const buildStatuses = ['SUCCESS', 'RUNNING', 'FAILURE', 'ABORTED'] as const
  let buildIdx = 0
  for (const job of jobRecords.slice(0, 4)) {
    for (const status of buildStatuses) {
      buildIdx++
      await prisma.jenkinsBuild.upsert({
        where: { id: `demo-build-${buildIdx}` },
        create: {
          id: `demo-build-${buildIdx}`,
          jobId: job.id,
          buildNum: buildIdx,
          status,
        },
        update: { status },
      })
    }
  }

  // ── Terraform ────────────────────────────────────────────────
  const tfWorkspace = await prisma.terraformWorkspace.upsert({
    where: { id: 'demo-tf-ws-aws' },
    create: { id: 'demo-tf-ws-aws', name: 'demo-aws-ec2', provider: CloudProvider.AWS },
    update: {},
  })

  const tfRuns = [
    { id: 'demo-tf-run-plan', status: TerraformStatus.PLANNED, planOutput: '# Plan: 3 to add, 1 to change\n+ aws_instance.aws_prod_web_01' },
    { id: 'demo-tf-run-apply', status: TerraformStatus.APPLIED, planOutput: 'Apply complete! Resources: 4 added.' },
    { id: 'demo-tf-run-failed', status: TerraformStatus.FAILED, planOutput: 'Error: insufficient permissions (demo mock)' },
    { id: 'demo-tf-run-destroy', status: TerraformStatus.PLANNING, planOutput: '# Plan: 1 to destroy\n- aws_instance.aws_dev_docker_01' },
  ]

  for (const run of tfRuns) {
    await prisma.terraformRun.upsert({
      where: { id: run.id },
      create: {
        id: run.id,
        workspaceId: tfWorkspace.id,
        status: run.status,
        planOutput: run.planOutput,
      },
      update: { status: run.status, planOutput: run.planOutput },
    })
  }

  await prisma.terraformRunLog.createMany({
    data: [
      { id: 'demo-tf-log-1', runId: 'demo-tf-run-plan', level: 'info', message: '[Demo] Initializing Terraform backend...' },
      { id: 'demo-tf-log-2', runId: 'demo-tf-run-plan', level: 'info', message: '[Demo] Plan completed: 3 to add, 1 to change' },
      { id: 'demo-tf-log-3', runId: 'demo-tf-run-apply', level: 'info', message: '[Demo] Apply complete! Resources: 4 added.' },
      { id: 'demo-tf-log-4', runId: 'demo-tf-run-destroy', level: 'warn', message: '[Demo] Destroy pending confirmation (demo mode — blocked)' },
    ],
    skipDuplicates: true,
  })

  await prisma.instanceTemplate.upsert({
    where: { id: 'demo-template-aws-web' },
    create: {
      id: 'demo-template-aws-web',
      name: 'Demo AWS Web Server',
      provider: CloudProvider.AWS,
      config: { instanceType: 't3.medium', ami: 'ami-demo', region: 'eu-west-1', tags: { env: 'demo' } },
    },
    update: {},
  })

  // ── Metrics (24h history × 5 types per instance) ───────────────
  await prisma.metricSample.deleteMany({
    where: { resourceId: { in: instanceRecords.map((i) => i.id) } },
  })

  const now = new Date()
  const metricData: Array<{
    resourceId: string
    metricType: string
    value: number
    unit: string
    recordedAt: Date
  }> = []

  for (const inst of instanceRecords) {
    const meta = inst.metadata as Record<string, unknown> | null
    const baseCpu = inst.status === 'ERROR' ? 95 : inst.status === 'WARNING' ? 82 : 35 + Math.random() * 25
    const baseRam = inst.status === 'ERROR' ? 92 : inst.status === 'WARNING' ? 88 : 45 + Math.random() * 20
    const baseDisk = (meta?.diskGb as number) ? 40 + Math.random() * 35 : 50

    for (let h = 0; h < 24; h++) {
      const t = new Date(now.getTime() - h * 3600000)
      const jitter = () => (Math.random() - 0.5) * 10
      metricData.push(
        { resourceId: inst.id, metricType: 'cpu', value: Math.min(100, Math.max(0, baseCpu + jitter())), unit: '%', recordedAt: t },
        { resourceId: inst.id, metricType: 'ram', value: Math.min(100, Math.max(0, baseRam + jitter())), unit: '%', recordedAt: t },
        { resourceId: inst.id, metricType: 'disk', value: Math.min(100, Math.max(0, baseDisk + jitter())), unit: '%', recordedAt: t },
        { resourceId: inst.id, metricType: 'net_in', value: 50 + Math.random() * 200, unit: 'Mbps', recordedAt: t },
        { resourceId: inst.id, metricType: 'net_out', value: 30 + Math.random() * 150, unit: 'Mbps', recordedAt: t },
      )
    }
  }

  await prisma.metricSample.createMany({ data: metricData })

  // ── Billing ──────────────────────────────────────────────────
  const billingAccounts = [
    { id: 'demo-billing-aws', provider: CloudProvider.AWS, accountId: DEMO_ACCOUNTS.aws.accountId },
    { id: 'demo-billing-gcp', provider: CloudProvider.GCP, accountId: DEMO_ACCOUNTS.gcp.accountId },
    { id: 'demo-billing-azure', provider: CloudProvider.AZURE, accountId: DEMO_ACCOUNTS.azure.accountId },
    { id: 'demo-billing-vps', provider: CloudProvider.AWS, accountId: 'vps-external-demo' },
  ]

  for (const ba of billingAccounts) {
    await prisma.billingAccount.upsert({
      where: { id: ba.id },
      create: ba,
      update: {},
    })
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = new Date(now.getTime() - 7 * 86400000)
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  await prisma.billingRecord.deleteMany({ where: { billingAccountId: { startsWith: 'demo-billing' } } })
  await prisma.billingRecord.createMany({
    data: [
      { billingAccountId: 'demo-billing-aws', amount: 1850.5, service: 'EC2', periodStart: monthStart, periodEnd: now, isEstimated: true },
      { billingAccountId: 'demo-billing-aws', amount: 420.0, service: 'S3', periodStart: monthStart, periodEnd: now, isEstimated: true },
      { billingAccountId: 'demo-billing-aws', amount: 312.5, service: 'total', periodStart: weekStart, periodEnd: now, isEstimated: true },
      { billingAccountId: 'demo-billing-aws', amount: 45.2, service: 'daily', periodStart: dayStart, periodEnd: now, isEstimated: true },
      { billingAccountId: 'demo-billing-gcp', amount: 1120.25, service: 'Compute Engine', periodStart: monthStart, periodEnd: now, isEstimated: true },
      { billingAccountId: 'demo-billing-gcp', amount: 220.0, service: 'total', periodStart: weekStart, periodEnd: now, isEstimated: true },
      { billingAccountId: 'demo-billing-azure', amount: 980.0, service: 'VMs', periodStart: monthStart, periodEnd: now, isEstimated: true },
      { billingAccountId: 'demo-billing-azure', amount: 195.0, service: 'total', periodStart: weekStart, periodEnd: now, isEstimated: true },
      { billingAccountId: 'demo-billing-vps', amount: 355.0, service: 'VPS', periodStart: monthStart, periodEnd: now, isEstimated: true },
    ],
  })

  // ── Alerts ─────────────────────────────────────────────────────
  const rules = await prisma.alertRule.findMany()
  const ruleByCond = (c: string) => rules.find((r) => r.condition.includes(c))

  const alertDefs = [
    { id: 'demo-alert-cpu', rule: 'cpu_high', message: 'CPU alta en aws-prod-db-01 (92%)', severity: AlertSeverity.CRITICAL },
    { id: 'demo-alert-ram', rule: 'ram_high', message: 'RAM alta en gcp-prod-analytics-01 (89%)', severity: AlertSeverity.WARNING },
    { id: 'demo-alert-disk', rule: 'disk_full', message: 'Disco casi lleno en azure-prod-db-01 (94%)', severity: AlertSeverity.WARNING },
    { id: 'demo-alert-down', rule: 'cpu_high', message: 'Instancia caída: aws-k8s-node-01', severity: AlertSeverity.CRITICAL },
    { id: 'demo-alert-docker', rule: 'cpu_high', message: 'Docker detenido en azure-dev-docker-01', severity: AlertSeverity.WARNING },
    { id: 'demo-alert-k8s', rule: 'ram_high', message: 'Kubernetes pod CrashLoopBackOff: legacy-app-0', severity: AlertSeverity.CRITICAL },
    { id: 'demo-alert-jenkins', rule: 'cost_high', message: 'Jenkins build fallido: terraform-apply #4', severity: AlertSeverity.WARNING },
    { id: 'demo-alert-cost', rule: 'cost_high', message: 'Coste mensual AWS superó $1800', severity: AlertSeverity.WARNING },
    { id: 'demo-alert-systemd', rule: 'cpu_high', message: 'Servicio systemd failed: prometheus en vps-monitoring-01', severity: AlertSeverity.CRITICAL },
  ]

  for (const a of alertDefs) {
    const rule = ruleByCond(a.rule) ?? rules[0]
    if (!rule) continue
    await prisma.alert.upsert({
      where: { id: a.id },
      create: { id: a.id, ruleId: rule.id, message: a.message, severity: a.severity },
      update: { message: a.message, severity: a.severity },
    })
  }

  // ── Notifications ──────────────────────────────────────────────
  if (primaryUser) {
    await prisma.notification.deleteMany({ where: { userId: primaryUser.id, title: { contains: 'Demo' } } })
    await prisma.notification.createMany({
      data: [
        { userId: primaryUser.id, channel: 'in-app', title: 'Demo: Info', body: 'Inventario demo sincronizado — 18 instancias cloud', isRead: true },
        { userId: primaryUser.id, channel: 'in-app', title: 'Demo: Warning', body: 'CPU alta detectada en aws-prod-db-01', isRead: false },
        { userId: primaryUser.id, channel: 'in-app', title: 'Demo: Critical', body: 'Pod legacy-app-0 en CrashLoopBackOff', isRead: false },
        { userId: primaryUser.id, channel: 'in-app', title: 'Demo: Success', body: 'Jenkins deploy-api #1 completado con éxito', isRead: true },
        { userId: primaryUser.id, channel: 'in-app', title: 'Demo: Billing', body: 'Coste mensual estimado: $4,305 USD', isRead: false },
      ],
    })
  }

  // ── Audit ──────────────────────────────────────────────────────
  if (primaryUser) {
    await prisma.auditLog.deleteMany({ where: { userId: primaryUser.id, action: { contains: 'demo' } } })
    await prisma.auditLog.createMany({
      data: [
        { userId: primaryUser.id, action: 'auth.login.demo', resource: 'user', resourceId: primaryUser.id, metadata: { email: 'demo@cloudops.local' }, ipAddress: '203.0.113.1' },
        { userId: primaryUser.id, action: 'cloud_account.create.demo', resource: 'cloud_account', resourceId: awsAccount.id, metadata: { name: DEMO_ACCOUNTS.aws.name } },
        { userId: primaryUser.id, action: 'instance.validate.demo', resource: 'instance', resourceId: instanceRecords[0]?.id, metadata: { mock: true } },
        { userId: primaryUser.id, action: 'ssh.command.demo', resource: 'vps', resourceId: vpsRecords[0]?.id, metadata: { command: 'uptime' } },
        { userId: primaryUser.id, action: 'jenkins.build.trigger.demo', resource: 'jenkins_job', resourceId: jobRecords[0]?.id },
        { userId: primaryUser.id, action: 'terraform.plan.demo', resource: 'terraform_run', resourceId: 'demo-tf-run-plan' },
        { userId: primaryUser.id, action: 'terraform.apply.demo', resource: 'terraform_run', resourceId: 'demo-tf-run-apply' },
        { userId: primaryUser.id, action: 'alert.create.demo', resource: 'alert', resourceId: 'demo-alert-cpu' },
        { userId: primaryUser.id, action: 'billing.view.demo', resource: 'billing', metadata: { totalMonthly: 4305 } },
      ],
    })
  }

  // ── SSH commands demo ──────────────────────────────────────────
  if (primaryUser) {
    await prisma.commandExecution.createMany({
      data: [
        { userId: primaryUser.id, command: 'uptime', output: '[Demo] 14:30:01 up 45 days, load average: 0.42, 0.38, 0.35', exitCode: 0 },
        { userId: primaryUser.id, command: 'docker ps', output: '[Demo] nginx, postgres, redis, api-server running', exitCode: 0 },
        { userId: primaryUser.id, command: 'kubectl get pods -A', output: '[Demo] 12 pods, 1 CrashLoopBackOff', exitCode: 0 },
      ],
      skipDuplicates: true,
    })
  }

  console.log('Demo data seeded successfully.')
  console.log(`  User: demo@cloudops.local / Demo1234!`)
  console.log(`  Cloud accounts: 3`)
  console.log(`  Instances: ${instanceRecords.length}`)
  console.log(`  VPS: ${vpsRecords.length}`)
  console.log(`  Docker containers: ${DEMO_DOCKER_CONTAINERS.length}`)
  console.log(`  K8s resources: ${DEMO_K8S_RESOURCES.length}`)
  console.log(`  Jenkins jobs: ${jobRecords.length}`)
  console.log(`  Terraform runs: ${tfRuns.length}`)
  console.log(`  Metric samples: ${metricData.length}`)
  console.log(`  Alerts: ${alertDefs.length}`)

  return {
    instances: instanceRecords.length,
    vps: vpsRecords.length,
    metrics: metricData.length,
    alerts: alertDefs.length,
  }
}

async function main() {
  const clearFirst = process.argv.includes('--reset')
  await seedDemoData({ clearFirst }, defaultPrisma)
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await defaultPrisma.$disconnect()
    })
}
