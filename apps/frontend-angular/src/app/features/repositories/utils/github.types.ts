export type GithubAccountCard = {
  id: string
  label: string
  username: string
  organization?: string
  accountType?: string
  accountTypeLabel?: string
  status: string
  statusLabel: string
  avatarUrl?: string | null
  lastValidatedAt?: string | null
  lastSyncAt?: string | null
  createdAt?: string
  demoMode: boolean
  repoCount?: number
  connectionName?: string
}
