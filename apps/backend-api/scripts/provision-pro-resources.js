#!/usr/bin/env node
/**
 * Registra cuentas AWS, GCP y VPS Ionos desde variables de entorno (modo PRO).
 * Ejecutar: docker compose exec backend-api node scripts/provision-pro-resources.js
 */
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

const VAULT_PREFIX = 'vault:enc:v1:'

const vaultStore = (payload) => {
  const secret =
    process.env.VAULT_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    'cloudops-dev-vault-key-change-in-prod'
  const key = crypto.scryptSync(secret, 'cloudops-salt', 32)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const packed = Buffer.concat([iv, tag, enc]).toString('base64url')
  return `${VAULT_PREFIX}${packed}`
}

const run = async () => {
  const project = await prisma.project.findFirst({ where: { slug: 'default', deletedAt: null } })
  if (!project) {
    console.error('Proyecto default no encontrado — ejecuta seed primero')
    process.exit(1)
  }

  let created = 0

  const awsKey = process.env.AWS_ACCESS_KEY_ID?.trim()
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY?.trim()
  if (awsKey && awsSecret) {
    const existing = await prisma.cloudAccount.findFirst({
      where: { projectId: project.id, provider: 'AWS', deletedAt: null },
    })
    if (!existing) {
      const secrets = {
        credentialType: 'access_key',
        demoMode: 'false',
        accessKeyId: awsKey,
        secretAccessKey: awsSecret,
        roleArn: '',
        externalId: '',
        oidcProvider: '',
        serviceAccountJson: '',
        tenantId: '',
        clientId: '',
        clientSecret: '',
        managedIdentity: '',
      }
      await prisma.cloudAccount.create({
        data: {
          projectId: project.id,
          name: 'AWS Producción',
          provider: 'AWS',
          accountId: process.env.AWS_ACCOUNT_ID || 'aws-live',
          defaultRegion: process.env.AWS_DEFAULT_REGION || 'eu-west-1',
          credentials: {
            create: [{ credentialType: 'access_key', secretRef: vaultStore(secrets) }],
          },
        },
      })
      console.log('✓ Cuenta AWS registrada')
      created++
    } else {
      console.log('· Cuenta AWS ya existe')
    }
  } else {
    console.log('· AWS: sin credenciales en entorno')
  }

  const gcpJsonRaw =
    process.env.GCP_SERVICE_ACCOUNT_JSON?.trim() ||
    (process.env.GCP_SERVICE_ACCOUNT_JSON_B64
      ? Buffer.from(process.env.GCP_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8')
      : '')
  const gcpJson = gcpJsonRaw?.trim()
  if (gcpJson) {
    const existing = await prisma.cloudAccount.findFirst({
      where: { projectId: project.id, provider: 'GCP', deletedAt: null },
    })
    if (!existing) {
      const secrets = {
        credentialType: 'service_account',
        demoMode: 'false',
        serviceAccountJson: gcpJson,
        accessKeyId: '',
        secretAccessKey: '',
        roleArn: '',
        externalId: '',
        oidcProvider: '',
        tenantId: '',
        clientId: '',
        clientSecret: '',
        managedIdentity: '',
      }
      await prisma.cloudAccount.create({
        data: {
          projectId: project.id,
          name: 'GCP Producción',
          provider: 'GCP',
          accountId: process.env.GCP_PROJECT_ID || 'gcp-live',
          defaultRegion: 'europe-west1',
          credentials: {
            create: [{ credentialType: 'service_account', secretRef: vaultStore(secrets) }],
          },
        },
      })
      console.log('✓ Cuenta GCP registrada')
      created++
    } else {
      console.log('· Cuenta GCP ya existe')
    }
  } else {
    console.log('· GCP: sin credenciales en entorno')
  }

  const vpsHost = process.env.IONOS_VPS_HOST?.trim()
  const vpsUser = process.env.IONOS_VPS_USER?.trim() || 'root'
  if (vpsHost) {
    const existing = await prisma.vpsServer.findFirst({
      where: { projectId: project.id, hostname: vpsHost, deletedAt: null },
    })
    if (!existing) {
      await prisma.vpsServer.create({
        data: {
          projectId: project.id,
          name: 'Ionos VPS',
          hostname: vpsHost,
          port: Number(process.env.IONOS_VPS_PORT || 22),
          username: vpsUser,
          sshKeyRef: process.env.IONOS_VPS_SSH_KEY
            ? vaultStore({ privateKey: process.env.IONOS_VPS_SSH_KEY })
            : 'vault:pending-ssh-key',
          status: 'unknown',
        },
      })
      console.log('✓ VPS Ionos registrado')
      created++
    } else {
      console.log('· VPS Ionos ya existe')
    }
  } else {
    console.log('· Ionos VPS: sin IONOS_VPS_HOST en entorno')
  }

  console.log(`Provision PRO: ${created} recurso(s) nuevo(s)`)
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
