#!/usr/bin/env node
/**
 * Lanza instancias de prueba en AWS y GCP usando cuentas PRO registradas.
 *
 * Requisitos:
 *   - Credenciales en VPS (scripts/sync-cloud-env-to-vps.sh)
 *   - ADMIN_EMAIL / ADMIN_PASSWORD en entorno o argumentos
 *
 * Uso:
 *   ADMIN_EMAIL=admin@spendlyx.com ADMIN_PASSWORD='...' \
 *     node scripts/launch-cloud-test-instances.mjs
 */
const API = process.env.API_URL || 'https://spendlyx.com/api/v1'
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!email || !password) {
  console.error('Define ADMIN_EMAIL y ADMIN_PASSWORD')
  process.exit(1)
}

const json = async (res) => {
  const body = await res.text()
  try {
    return JSON.parse(body)
  } catch {
    throw new Error(`${res.status} ${body.slice(0, 200)}`)
  }
}

const login = async () => {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await json(res)
  if (!res.ok) throw new Error(data.message || 'Login failed')
  return data.accessToken || data.token
}

const listAccounts = async (token) => {
  const res = await fetch(`${API}/cloud-accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await json(res)
  if (!res.ok) throw new Error(data.message || 'cloud-accounts failed')
  return Array.isArray(data) ? data : data.items || data.data || []
}

const launch = async (token, accountId, payload) => {
  const res = await fetch(`${API}/cloud-accounts/${accountId}/instances`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await json(res)
  if (!res.ok) throw new Error(data.message || JSON.stringify(data))
  return data
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')

const run = async () => {
  console.log('==> Login')
  const token = await login()
  const accounts = await listAccounts(token)
  const aws = accounts.find((a) => a.provider === 'AWS' && !String(a.id).startsWith('demo-'))
  const gcp = accounts.find((a) => a.provider === 'GCP' && !String(a.id).startsWith('demo-'))

  if (!aws) {
    console.error('Sin cuenta AWS PRO. Ejecuta sync-cloud-env-to-vps.sh primero.')
  } else {
    const name = `spendlyx-test-aws-${stamp()}`
    console.log(`==> Lanzando EC2 en ${aws.defaultRegion || 'eu-west-1'}…`)
    const result = await launch(token, aws.id, {
      name,
      region: aws.defaultRegion || 'eu-west-1',
      instanceType: 't3.micro',
      imageId: 'ami-0fa39f5b9332d6465',
      tags: { Environment: 'test', ManagedBy: 'spendlyx' },
    })
    console.log('AWS:', result.id || result.externalId || result)
  }

  if (!gcp) {
    console.error('Sin cuenta GCP PRO. Ejecuta sync-cloud-env-to-vps.sh primero.')
  } else {
    const name = `spendlyx-test-gcp-${stamp()}`
    console.log('==> Lanzando GCE en europe-west1-b…')
    const result = await launch(token, gcp.id, {
      name,
      region: 'europe-west1',
      instanceType: 'e2-micro',
      imageId: 'debian-cloud/debian-12',
      tags: { environment: 'test', managed_by: 'spendlyx' },
    })
    console.log('GCP:', result.id || result.externalId || result)
  }
}

run().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
