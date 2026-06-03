import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGO = 'aes-256-gcm'
const PREFIX = 'vault:enc:v1:'

@Injectable()
export class SecretsVaultService {
  constructor(private readonly config: ConfigService) {}

  storeSecrets = (payload: Record<string, string>): string => {
    const json = JSON.stringify(payload)
    const key = this.deriveKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv(ALGO, key, iv)
    const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    const packed = Buffer.concat([iv, tag, enc]).toString('base64url')
    return `${PREFIX}${packed}`
  }

  readSecrets = (secretRef: string): Record<string, string> => {
    if (!secretRef.startsWith(PREFIX)) {
      return {}
    }
    const raw = secretRef.slice(PREFIX.length)
    const buf = Buffer.from(raw, 'base64url')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const key = this.deriveKey()
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
    return JSON.parse(json) as Record<string, string>
  }

  private deriveKey = (): Buffer => {
    const secret = this.config.get<string>('VAULT_ENCRYPTION_KEY') ?? 'cloudops-dev-vault-key-change-in-prod'
    return scryptSync(secret, 'cloudops-salt', 32)
  }
}
