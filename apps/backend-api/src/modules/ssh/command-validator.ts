const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  /mkfs\./,
  /dd\s+if=/,
  /:\(\)\{\s*:\|:&\s*\};:/,
  />\s*\/dev\/sd/,
  /shutdown/,
  /reboot/,
  /init\s+0/,
]

export const isDangerousCommand = (command: string): boolean => {
  const normalized = command.trim().toLowerCase()
  return DANGEROUS_PATTERNS.some((p) => p.test(normalized))
}

export const sanitizeCommand = (command: string): string => {
  return command.replace(/[;&|`$(){}[\]<>\\]/g, '').trim()
}
