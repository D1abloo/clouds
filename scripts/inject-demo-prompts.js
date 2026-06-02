#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'prompts_cursor_por_fases.md')
let content = fs.readFileSync(file, 'utf8')

const DEMO = {
  1: `- Crear \`docs/datos-demo.md\` y \`DEMO_MODE=true\` en \`.env.example\`.\n- Documentar usuarios demo planificados en README.`,
  2: `- Mocks en cada módulo cuando no hay credenciales.\n- \`prisma/seed.ts\` con roles, permisos y admin demo.\n- Health check sin APIs externas.`,
  3: `- Seed: 8 roles, permisos, proyecto \`default\`, admin + 7 usuarios demo.\n- Passwords: \`Admin123!\` / \`Demo123!\`.`,
  4: `- Mocks \`AwsAdapterService\`, \`GcpAdapterService\`, \`AzureAdapterService\`.\n- Seed: 3 cuentas cloud + 5 instancias demo.`,
  5: `- Seed: 2 VPS + 3 \`CommandExecution\` demo.\n- Mock SSH validate/execute sin servidor real.`,
  6: `- Seed: 1 DockerHost, 4 containers, 1 K8s cluster, 5 resources.\n- \`SystemDiscoveryService\` mock.`,
  7: `- Seed: 1 JenkinsServer, 2 jobs, 3 builds.\n- Mock Jenkins list/trigger/logs.`,
  8: `- Seed: TerraformWorkspace, 3 runs, logs, 1 InstanceTemplate.\n- Plan output mock en runner.`,
  9: `- Seed: ~150 MetricSample, 2 Alert activas, 4 Notification.\n- Dashboard con datos reales de PostgreSQL.`,
  10: `- Seed: BillingAccount + BillingRecord estimados.\n- Mocks \`AwsBillingService\`, \`GcpBillingService\`, \`AzureBillingService\`.`,
  11: `- Login precargado; redirección automática al dashboard.\n- Tablas con datos seed; empty state con hint \`npm run seed:demo\`.`,
  12: `- Usuarios demo por rol para RBAC.\n- Audit logs demo; secretRef \`vault:demo/*\` únicamente.`,
  13: `- \`scripts/seed-demo.sh\` y \`docs/datos-demo.md\`.\n- Flujo: docker compose → migrate → seed:demo.`,
  14: `- README sección "Modo demo".\n- Documentar credenciales y recursos en \`docs/datos-demo.md\`.`,
  15: `- Verificar flujo completo con \`npm run seed:demo\`.\n- Todos los módulos muestran data sin credenciales reales.`,
}

content = content.replace(
  /(## Fase (\d+)[^\n]*\n\n```md\n)([\s\S]*?)(\n```)/g,
  (match, start, num, body, end) => {
    const n = parseInt(num, 10)
    if (!DEMO[n] || body.includes('### Datos demo')) return match
    const trimmed = body.replace(/\n### Datos demo[\s\S]*$/, '').trimEnd()
    return `${start}${trimmed}\n\n### Datos demo\n${DEMO[n]}${end}`
  },
)

const FASE_DEMO = `
---

## Fase Demo Completa - Dataset integral para pruebas sin servicios reales

\`\`\`md
Le adjunto captura como referencia y sube a github

Implementa el dataset demo completo para probar la app sin servicios reales.

Archivos obligatorios:
- apps/backend-api/prisma/seed-demo.ts
- scripts/seed-demo.sh
- docs/datos-demo.md

Comando: npm run seed:demo

Debe crear en PostgreSQL:
1. Usuarios demo (admin + 7 roles, Demo123!)
2. Cuentas cloud demo (AWS, GCP, Azure)
3. Instancias demo (5+)
4. VPS demo (2)
5. Docker demo (host + 4 containers)
6. Kubernetes demo (cluster + resources)
7. Jenkins demo (server, jobs, builds)
8. Terraform demo (workspace, runs, logs, template)
9. Métricas demo (CPU/RAM/disco)
10. Billing demo (cuentas + registros estimados)
11. Alertas demo (2 activas)
12. Notificaciones demo (4 in-app)
13. Auditoría demo
14. SSH command executions demo

Requisitos: idempotente, secretRef vault, adaptadores mock.

No expliques demasiado. Crea los archivos directamente.
\`\`\`

### Datos demo
- Esta fase implementa \`npm run seed:demo\` — ver \`docs/datos-demo.md\`.
`

if (!content.includes('Fase Demo Completa')) {
  const idx = content.indexOf('# Orden recomendado')
  content = content.slice(0, idx) + FASE_DEMO + '\n' + content.slice(idx)
  content = content.replace(
    '15. Fase 15 - Revisión final.',
    '15. Fase 15 - Revisión final.\n16. Fase Demo Completa - Dataset integral.',
  )
}

fs.writeFileSync(file, content)
console.log('Demo sections:', (content.match(/### Datos demo/g) || []).length)
