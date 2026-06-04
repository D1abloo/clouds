/**
 * Verificación local del catálogo demo (sin API).
 */
import {
  DEMO_GITHUB_REPOS,
  DEMO_WEBHOOKS,
  DEMO_DEPLOYMENTS,
  githubApiRepoId,
  demoBranches,
  demoCommits,
  demoPullRequests,
} from '../src/modules/github/github-demo.data.ts'

const errors = []

if (DEMO_GITHUB_REPOS.length < 8) {
  errors.push(`Se esperaban 8 repos, hay ${DEMO_GITHUB_REPOS.length}`)
}

for (const repo of DEMO_GITHUB_REPOS) {
  const apiId = githubApiRepoId(repo.id)
  const branches = demoBranches(repo.id)
  const commits = demoCommits(repo.id)
  const prs = demoPullRequests(repo.id)
  if (!apiId.startsWith('gh-repo-')) errors.push(`ID inválido: ${apiId}`)
  if (branches.length < 3) errors.push(`${repo.name}: sin ramas demo`)
  if (commits.length < 3) errors.push(`${repo.name}: sin commits demo`)
  if (prs.length < 2) errors.push(`${repo.name}: sin PRs demo`)
}

if (DEMO_WEBHOOKS.length < 4) errors.push('Webhooks demo insuficientes')
if (DEMO_DEPLOYMENTS.length < 4) errors.push('Deployments demo insuficientes')

if (errors.length) {
  console.error('✗ Catálogo demo GitHub:\n', errors.join('\n'))
  process.exit(1)
}

console.log('✓ Catálogo demo GitHub OK')
console.log(`  Repos: ${DEMO_GITHUB_REPOS.length}`)
console.log(`  Ejemplo: ${DEMO_GITHUB_REPOS[0].fullName} → ${githubApiRepoId(DEMO_GITHUB_REPOS[0].id)}`)
console.log(`  Webhooks: ${DEMO_WEBHOOKS.length} | Despliegues: ${DEMO_DEPLOYMENTS.length}`)
