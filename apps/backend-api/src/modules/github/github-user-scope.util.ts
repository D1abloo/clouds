import { PrismaService } from '../../common/prisma/prisma.service'

export const githubRepoIdsForUser = async (
  prisma: PrismaService,
  userId: string,
): Promise<string[]> => {
  const accounts = await prisma.githubAccount.findMany({
    where: { createdById: userId },
    select: { id: true },
  })
  if (!accounts.length) return []
  const repos = await prisma.githubRepository.findMany({
    where: { accountId: { in: accounts.map((a) => a.id) } },
    select: { id: true },
  })
  return repos.map((r) => r.id)
}
