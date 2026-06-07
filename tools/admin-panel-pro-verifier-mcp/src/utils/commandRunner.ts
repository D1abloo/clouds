import { spawn } from 'node:child_process'
import { maskSecrets } from './security.js'

const ALLOWLIST: Record<string, RegExp> = {
  'npm install': /^npm install$/,
  'npm run lint': /^npm run lint$/,
  'npm run typecheck': /^npm run typecheck$/,
  'npm run test': /^npm run test$/,
  'npm run prisma:seed:demo': /^npm run prisma:seed:demo$/,
  'npm run seed:demo': /^npm run seed:demo$/,
  'npm run build -w apps/frontend-angular': /^npm run build -w apps\/frontend-angular$/,
  'npm run build -w apps/backend-api': /^npm run build -w apps\/backend-api$/,
  'npm run dev': /^npm run dev$/,
  'npx prisma migrate dev': /^npx prisma migrate dev(?:\s+--name=[\w-]+)?$/,
  'npx prisma migrate deploy': /^npx prisma migrate deploy$/,
  'npx prisma db seed': /^npx prisma db seed$/,
  'npx playwright test': /^npx playwright test(?:\s+[\w./\-*]+)?$/,
  'git status': /^git status(?:\s+--short)?$/,
  'git diff': /^git diff(?:\s+--stat)?$/,
  'git add': /^git add(?:\s+[\w./\-*]+)+$/,
  'git commit': /^git commit(?:\s+-m\s+.+)?$/,
  'git push': /^git push(?:\s+-u\s+origin\s+\w+)?$/,
}

export type CommandResult = {
  command: string
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  durationMs: number
}

export const runAllowlistedCommand = (
  command: string,
  cwd: string,
  timeoutMs = 300_000,
): Promise<CommandResult> => {
  const trimmed = command.trim()
  const allowed = Object.values(ALLOWLIST).some((re) => re.test(trimmed))
  if (!allowed) {
    return Promise.resolve({
      command: trimmed,
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: `Command not allowlisted: ${trimmed}`,
      durationMs: 0,
    })
  }

  return new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(trimmed, { cwd, shell: true, env: process.env })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      stderr += '\n[timeout]'
    }, timeoutMs)

    child.stdout.on('data', (d: Buffer) => {
      stdout += maskSecrets(d.toString())
    })
    child.stderr.on('data', (d: Buffer) => {
      stderr += maskSecrets(d.toString())
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        command: trimmed,
        ok: code === 0,
        exitCode: code,
        stdout: stdout.slice(0, 50_000),
        stderr: stderr.slice(0, 20_000),
        durationMs: Date.now() - started,
      })
    })
  })
}
