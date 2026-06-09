export type TerminalSessionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface TerminalSession {
  id: string
  hostId: string
  hostName: string
  hostAddress: string
  user: string
  status: TerminalSessionStatus
  startedAt: string
  lastActivity: string
  cwd: string
}

export interface TerminalHistoryEntry {
  id: string
  hostName: string
  hostAddress: string
  user: string
  startedAt: string
  endedAt: string
  durationLabel: string
  commandCount: number
  exitCode: number
}

export const defaultTerminalSessions = (): TerminalSession[] => []

export const defaultTerminalHistory = (): TerminalHistoryEntry[] => []

export const bootstrapTerminalLines = (
  hostName: string,
  hostAddress: string,
  user: string,
): string[] => [
  `zsh 5.9 · oh-my-zsh (agnoster) · demo`,
  `$ ssh ${user}@${hostAddress}`,
  `Authenticating with key cloudops_ed25519…`,
  `Connected to ${hostName} (${hostAddress})`,
  `Last login: ${new Date().toLocaleString('es-ES')} from 10.42.0.18`,
  ``,
  `${user}@${hostName}:~$ `,
]
