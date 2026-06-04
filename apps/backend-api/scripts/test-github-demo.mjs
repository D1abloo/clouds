/**
 * Verifica repos ficticios GitHub (modo demo).
 * Uso: node scripts/test-github-demo.mjs [API_BASE]
 */
const base = process.argv[2] ?? 'http://localhost:3000/api/v1'

const login = async () => {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cloudops.local', password: 'Admin123!' }),
  })
  if (!res.ok) throw new Error(`Login falló: ${res.status}`)
  const data = await res.json()
  return data.accessToken ?? data.access_token ?? data.token
}

const get = async (token, path) => {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(body)}`)
  return body
}

const main = async () => {
  console.log('→ Login demo…')
  const token = await login()
  console.log('→ GET /github/demo/repos')
  const demo = await get(token, '/github/demo/repos')
  console.log(`   ${demo.count} repos demo`)
  if (demo.count < 8) throw new Error(`Se esperaban ≥8 repos, hay ${demo.count}`)

  const first = demo.items[0]
  const repoId = first.id
  console.log(`→ Repo: ${first.fullName} (${repoId})`)

  const branches = await get(token, `/github/repositories/${repoId}/branches`)
  const commits = await get(token, `/github/repositories/${repoId}/commits`)
  const prs = await get(token, `/github/repositories/${repoId}/pull-requests`)
  console.log(`   ramas=${branches.items.length} commits=${commits.items.length} prs=${prs.items.length}`)

  if (!branches.items.length || !commits.items.length) {
    throw new Error('Ramas o commits vacíos en modo demo')
  }

  console.log('→ GET /github/webhooks y /github/deployments')
  const wh = await get(token, '/github/webhooks')
  const dep = await get(token, '/github/deployments')
  console.log(`   webhooks=${wh.items.length} deployments=${dep.items.length}`)

  console.log('✓ GitHub demo OK')
}

main().catch((e) => {
  console.error('✗', e.message)
  process.exit(1)
})
