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

export const defaultTerminalSessions = (): TerminalSession[] => [
  {
    id: 'sess-1',
    hostId: 'vps-1',
    hostName: 'vps-monitoring-1',
    hostAddress: '203.0.113.10',
    user: 'cloudops',
    status: 'connected',
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    lastActivity: new Date(Date.now() - 120000).toISOString(),
    cwd: '/var/log',
  },
  {
    id: 'sess-2',
    hostId: 'vps-3',
    hostName: 'vps-monitoring-3',
    hostAddress: '203.0.113.12',
    user: 'deploy',
    status: 'disconnected',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    cwd: '/home/deploy',
  },
]

export const defaultTerminalHistory = (): TerminalHistoryEntry[] => [
  {
    id: 'hist-1',
    hostName: 'vps-monitoring-1',
    hostAddress: '203.0.113.10',
    user: 'cloudops',
    startedAt: new Date(Date.now() - 172800000).toISOString(),
    endedAt: new Date(Date.now() - 172700000).toISOString(),
    durationLabel: '18m 42s',
    commandCount: 24,
    exitCode: 0,
  },
  {
    id: 'hist-2',
    hostName: 'vps-monitoring-2',
    hostAddress: '203.0.113.11',
    user: 'cloudops',
    startedAt: new Date(Date.now() - 259200000).toISOString(),
    endedAt: new Date(Date.now() - 259100000).toISOString(),
    durationLabel: '6m 05s',
    commandCount: 9,
    exitCode: 0,
  },
  {
    id: 'hist-3',
    hostName: 'vps-monitoring-5',
    hostAddress: '203.0.113.14',
    user: 'root',
    startedAt: new Date(Date.now() - 432000000).toISOString(),
    endedAt: new Date(Date.now() - 431900000).toISOString(),
    durationLabel: '2m 11s',
    commandCount: 3,
    exitCode: 1,
  },
]

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
