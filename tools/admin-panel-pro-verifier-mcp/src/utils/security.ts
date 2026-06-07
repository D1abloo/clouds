const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|password|token|client[_-]?secret|private[_-]?key)\s*[:=]\s*['"]?[\w\-./+=]{8,}/gi,
  /Bearer\s+[\w\-._~+/]+=*/gi,
  /postgres(?:ql)?:\/\/[^\s'"]+/gi,
]

export const maskSecrets = (text: string): string => {
  let out = text
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, (m) => {
      const key = m.split(/[:=]/)[0]
      return `${key}=***MASKED***`
    })
  }
  return out
}

export const maskEnvValue = (key: string, value: string): string => {
  const sensitive = /secret|password|token|key|credential|oauth/i.test(key)
  if (!sensitive) return value
  if (value.length <= 4) return '***'
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}
