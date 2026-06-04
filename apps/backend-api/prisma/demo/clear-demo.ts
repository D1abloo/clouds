import { PrismaClient } from '@prisma/client'

/** Removes all demo-tagged records so seed can run idempotently. */
export async function clearDemoData(prisma: PrismaClient) {
  console.log('Clearing existing demo data...')

  const demoInstanceIds = (
    await prisma.instance.findMany({
      where: { OR: [{ id: { startsWith: 'demo-inst-' } }, { externalId: { contains: 'demo' } }] },
      select: { id: true },
    })
  ).map((i) => i.id)

  if (demoInstanceIds.length) {
    await prisma.metricSample.deleteMany({ where: { resourceId: { in: demoInstanceIds } } })
  }

  await prisma.terraformRunLog.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.terraformRun.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.terraformWorkspace.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.instanceTemplate.deleteMany({ where: { id: { startsWith: 'demo-' } } })
  await prisma.githubDeployment.deleteMany({ where: { id: { startsWith: 'gh-dep-' } } })
  await prisma.githubWebhook.deleteMany({ where: { id: { startsWith: 'gh-wh-' } } })
  await prisma.githubPullRequest.deleteMany({})
  await prisma.githubCommit.deleteMany({})
  await prisma.githubBranch.deleteMany({})
  await prisma.githubRepository.deleteMany({ where: { id: { startsWith: 'gh-repo-' } } })
  await prisma.githubAccount.deleteMany({ where: { id: { startsWith: 'demo-github' } } })
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
  await prisma.notification.deleteMany({
    where: { title: { contains: 'Demo' } },
  })
  await prisma.auditLog.deleteMany({
    where: { action: { contains: 'demo' } },
  })
  await prisma.commandExecution.deleteMany({
    where: { output: { contains: '[Demo]' } },
  })
  await prisma.instance.deleteMany({ where: { id: { startsWith: 'demo-inst-' } } })
  await prisma.vpsServer.deleteMany({ where: { id: { startsWith: 'demo-vps' } } })
  await prisma.cloudCredential.deleteMany({ where: { cloudAccountId: { startsWith: 'demo-' } } })
  await prisma.cloudRegion.deleteMany({ where: { cloudAccountId: { startsWith: 'demo-' } } })
  await prisma.cloudAccount.deleteMany({ where: { id: { startsWith: 'demo-' } } })

  console.log('Demo data cleared.')
}
