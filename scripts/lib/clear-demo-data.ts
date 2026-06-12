import type { Prisma, PrismaClient } from '@prisma/client'

const DEMO_GITHUB_ACCOUNT_WHERE: Prisma.GithubAccountWhereInput = {
  OR: [
    { id: { startsWith: 'demo-github' } },
    { tokenRef: 'demo' },
    { tokenRef: { startsWith: 'demo:' } },
  ],
}

const demoInstanceWhere: Prisma.InstanceWhereInput = {
  OR: [
    { id: { startsWith: 'demo-inst-' } },
    { externalId: { contains: 'demo', mode: 'insensitive' } },
    { name: { contains: 'demo', mode: 'insensitive' } },
    { name: { contains: 'aws-producción-vm-', mode: 'insensitive' } },
    { name: { contains: 'aws-produccion-vm-', mode: 'insensitive' } },
  ],
}

/** Elimina registros demo/sintéticos en PostgreSQL. Preserva cuentas cloud/GitHub reales conectadas. */
export const clearDemoData = async (prisma: PrismaClient): Promise<void> => {
  console.log('Clearing existing demo data...')

  const demoGithubAccounts = await prisma.githubAccount.findMany({
    where: DEMO_GITHUB_ACCOUNT_WHERE,
    select: { id: true },
  })
  const demoGithubAccountIds = demoGithubAccounts.map((a) => a.id)

  const demoInstanceIds = (
    await prisma.instance.findMany({
      where: demoInstanceWhere,
      select: { id: true },
    })
  ).map((i) => i.id)

  const demoCloudAccountIds = (
    await prisma.cloudAccount.findMany({
      where: {
        OR: [
          { id: { startsWith: 'demo-' } },
          { credentials: { some: { credentialType: 'demo' } } },
        ],
      },
      select: { id: true },
    })
  ).map((a) => a.id)

  if (demoInstanceIds.length) {
    await prisma.metricSample.deleteMany({ where: { resourceId: { in: demoInstanceIds } } })
  }

  await prisma.terraformRunLog.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.terraformRun.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.terraformWorkspace.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.instanceTemplate.deleteMany({ where: { id: { startsWith: 'demo-' } } })

  if (demoGithubAccountIds.length) {
    await prisma.githubDeployment.deleteMany({
      where: { repo: { accountId: { in: demoGithubAccountIds } } },
    })
    await prisma.githubWebhook.deleteMany({
      where: {
        OR: [
          { accountId: { in: demoGithubAccountIds } },
          { repo: { accountId: { in: demoGithubAccountIds } } },
        ],
      },
    })
    await prisma.githubPullRequest.deleteMany({
      where: { repo: { accountId: { in: demoGithubAccountIds } } },
    })
    await prisma.githubCommit.deleteMany({
      where: { repo: { accountId: { in: demoGithubAccountIds } } },
    })
    await prisma.githubBranch.deleteMany({
      where: { repo: { accountId: { in: demoGithubAccountIds } } },
    })
    await prisma.githubRepository.deleteMany({
      where: {
        OR: [
          { accountId: { in: demoGithubAccountIds } },
          { id: { startsWith: 'gh-repo-' } },
        ],
      },
    })
    await prisma.githubAccount.deleteMany({ where: { id: { in: demoGithubAccountIds } } })
  }

  await prisma.jenkinsBuild.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.jenkinsJob.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.jenkinsServer.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.kubernetesResource.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.kubernetesCluster.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.dockerContainer.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.dockerHost.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.billingRecord.deleteMany({ where: { billingAccountId: { startsWith: 'demo-billing' } } })
  await prisma.billingAccount.deleteMany({ where: { id: { startsWith: 'demo-billing' } } })
  await prisma.alert.deleteMany({ where: { id: { startsWith: 'demo-alert' } } })
  await prisma.notification.deleteMany({ where: { title: { contains: 'Demo' } } })
  await prisma.auditLog.deleteMany({ where: { action: { contains: 'demo' } } })
  await prisma.commandExecution.deleteMany({ where: { output: { contains: '[Demo]' } } })

  if (demoCloudAccountIds.length) {
    await prisma.instance.deleteMany({ where: { cloudAccountId: { in: demoCloudAccountIds } } })
    await prisma.cloudCredential.deleteMany({ where: { cloudAccountId: { in: demoCloudAccountIds } } })
    await prisma.cloudRegion.deleteMany({ where: { cloudAccountId: { in: demoCloudAccountIds } } })
    await prisma.cloudAccount.deleteMany({ where: { id: { in: demoCloudAccountIds } } })
  }

  await prisma.instance.deleteMany({ where: demoInstanceWhere })
  await prisma.vpsServer.deleteMany({ where: { id: { startsWith: 'demo-vps' } } })

  console.log('Demo data cleared.')
}
