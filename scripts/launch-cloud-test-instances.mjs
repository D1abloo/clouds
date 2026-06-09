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
const launchAws = process.env.LAUNCH_AWS !== 'false'
const launchGcp = process.env.LAUNCH_GCP !== 'false'
const gcpZone = process.env.GCP_ZONE || 'europe-west1-b'

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

const getJson = async (token, path) => {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const data = await json(res)
  if (!res.ok) throw new Error(data.message || path)
  return Array.isArray(data) ? data : data.items || []
}

const listImages = async (token, accountId, region) => {
  return getJson(token, `/cloud-accounts/${accountId}/images?region=${encodeURIComponent(region)}`)
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

  if (!launchAws) {
    console.log('==> AWS omitido (LAUNCH_AWS=false)')
  } else if (!aws) {
    console.error('Sin cuenta AWS PRO. Ejecuta sync-cloud-env-to-vps.sh primero.')
  } else {
    const region = aws.defaultRegion || 'eu-west-1'
    const name = `spendlyx-test-aws-${stamp()}`
    const [images, networks, sgs] = await Promise.all([
      listImages(token, aws.id, region),
      getJson(token, `/cloud-accounts/${aws.id}/networks?region=${encodeURIComponent(region)}`),
      getJson(token, `/cloud-accounts/${aws.id}/security-groups?region=${encodeURIComponent(region)}`),
    ])
    const pick =
      images.find((i) => i.architecture === 'x86_64' && /Amazon Linux 2023/i.test(i.name) && !/GPU|Deep Learning/i.test(i.name)) ||
      images.find((i) => i.architecture === 'x86_64' && /Amazon Linux/i.test(i.name)) ||
      images.find((i) => i.architecture === 'x86_64') ||
      images[0]
    const ami = pick?.id
    const instanceType = pick?.architecture === 'arm64' ? 't4g.micro' : 't3.micro'
    const subnet = networks.find((n) => n.type === 'subnet')?.id
    const sg = sgs.find((g) => g.name === 'default')?.id || sgs[0]?.id
    if (!ami) throw new Error('Sin AMIs disponibles en AWS')
    if (!subnet) throw new Error('Sin subredes en AWS — crea una VPC/subred en la cuenta')
    console.log(`==> Lanzando EC2 en ${region} (${instanceType})…`)
    const result = await launch(token, aws.id, {
      name,
      region,
      instanceType,
      imageId: ami,
      subnetId: subnet,
      securityGroupIds: sg ? [sg] : undefined,
      tags: { Environment: 'test', ManagedBy: 'spendlyx' },
    })
    console.log('AWS:', result.id || result.externalId || result)
  }

  if (!launchGcp) {
    console.log('==> GCP omitido (LAUNCH_GCP=false)')
  } else if (!gcp) {
    console.error('Sin cuenta GCP PRO. Ejecuta sync-cloud-env-to-vps.sh primero.')
  } else {
    const name = `spendlyx-test-gcp-${stamp()}`
    console.log(`==> Lanzando GCE en ${gcpZone}…`)
    const result = await launch(token, gcp.id, {
      name,
      region: gcpZone,
      instanceType: 'e2-micro',
      imageId: 'projects/debian-cloud/global/images/family/debian-12',
      tags: { environment: 'test', managed_by: 'spendlyx' },
    })
    console.log('GCP:', result.id || result.externalId || result)
  }
}

run().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
