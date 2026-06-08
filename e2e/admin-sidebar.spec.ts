import { test, expect } from '@playwright/test'

const SIDEBAR_ROUTES = [
  '/dashboard',
  '/command-center',
  '/resource-explorer',
  '/topology-map',
  '/health-center',
  '/cloud/aws/overview',
  '/cloud/gcp/overview',
  '/cloud/azure/overview',
  '/instances/all-instances',
  '/vps/overview',
  '/docker/containers',
  '/kubernetes/pods',
  '/network',
  '/storage',
  '/backups',
  '/capacity-planner',
  '/jenkins/jobs',
  '/terraform/workspaces',
  '/deployments',
  '/terminal/active-sessions',
  '/runbooks',
  '/scheduler',
  '/service-catalog',
  '/approvals',
  '/repositories/github',
  '/metrics/overview',
  '/logs',
  '/billing/overview',
  '/cost-optimizer',
  '/alerts/active',
  '/incidents',
  '/notifications/all',
  '/reports',
  '/change-management',
  '/security-center',
  '/secrets-manager',
  '/compliance',
  '/access-control',
  '/audit/activity-logs',
  '/admin/users',
  '/admin/roles',
  '/admin/api-tokens',
  '/admin/webhooks',
  '/settings/general',
  '/ai-assistant',
]

test.describe('Panel admin — login y sidebar (español)', () => {
  test('página de login en español', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'CloudOps' })).toBeVisible()
    await expect(page.getByText('Acceso seguro al panel de administración')).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuar con Google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuar con GitHub/i })).toBeVisible()
  })

  test('modo demo — rutas principales del sidebar cargan', async ({ page }) => {
    test.skip(!process.env.E2E_WITH_AUTH, 'Defina E2E_WITH_AUTH=1 con backend activo')

    await page.goto('/login')
    const demoBtn = page.getByRole('button', { name: /Entrar en modo demo/i })
    if (await demoBtn.isVisible()) {
      await demoBtn.click()
    } else {
      test.skip(true, 'Botón demo no visible — modo PRO sin credenciales demo')
    }
    await page.waitForURL('**/dashboard**', { timeout: 30_000 })

    for (const route of SIDEBAR_ROUTES) {
      await page.goto(route)
      await expect(page.locator('body')).not.toContainText('Cannot GET')
      await expect(page.locator('body')).not.toContainText('404')
      await expect(page.locator('body')).not.toContainText('Page Not Found')
    }
  })

  test('modo PRO — botón demo no visible', async ({ page }) => {
    test.skip(process.env.E2E_PRO_MODE !== '1', 'Defina E2E_PRO_MODE=1 con backend en PRO')

    await page.goto('/login')
    await expect(page.getByRole('button', { name: /Entrar en modo demo/i })).not.toBeVisible()
    await expect(page.getByText('Credenciales demo')).not.toBeVisible()
  })

  test('ruta protegida redirige a login sin sesión', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login**', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'CloudOps' })).toBeVisible()
  })

  test('texto de navegación en español tras login demo', async ({ page }) => {
    test.skip(!process.env.E2E_WITH_AUTH, 'Defina E2E_WITH_AUTH=1 con backend activo')

    await page.goto('/login')
    const demoBtn = page.getByRole('button', { name: /Entrar en modo demo/i })
    if (!(await demoBtn.isVisible())) {
      test.skip(true, 'Botón demo no visible')
    }
    await demoBtn.click()
    await page.waitForURL('**/dashboard**', { timeout: 30_000 })

    await expect(page.getByText('Resumen', { exact: false }).first()).toBeVisible({ timeout: 10_000 })
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible()
  })
})
