import { PrismaService } from '../../common/prisma/prisma.service'

export const gitlabAccountIdsForUser = async (
  prisma: PrismaService,
  userId: string,
): Promise<string[]> => {
  const accounts = await prisma.gitlabAccount.findMany({
    where: { createdById: userId },
    select: { id: true },
  })
  return accounts.map((a) => a.id)
}
