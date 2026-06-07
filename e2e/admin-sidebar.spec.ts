import { test, expect } from '@playwright/test'

const SIDEBAR_ROUTES = [
  '/dashboard',
  '/command-center',
  '/resource-explorer',
  '/topology-map',
  '/health-center',
  '/cloud/aws/overview',
  '/instances/all-instances',
  '/vps/overview',
  '/docker/containers',
  '/kubernetes/pods',
  '/jenkins/jobs',
  '/terraform/workspaces',
  '/repositories/github',
  '/metrics/overview',
  '/security-center',
  '/admin/users',
  '/ai-assistant',
]

test.describe('Login y sidebar (demo)', () => {
  test('página de login en español', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'CloudOps' })).toBeVisible()
    await expect(page.getByText('Acceso seguro al panel de administración')).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuar con Google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuar con GitHub/i })).toBeVisible()
  })

  test('modo demo — rutas principales cargan', async ({ page }) => {
    test.skip(!process.env.E2E_WITH_AUTH, 'Defina E2E_WITH_AUTH=1 con backend activo')

    await page.goto('/login')
    await page.getByRole('button', { name: /Entrar en modo demo/i }).click()
    await page.waitForURL('**/dashboard**', { timeout: 30_000 })

    for (const route of SIDEBAR_ROUTES) {
      await page.goto(route)
      await expect(page.locator('body')).not.toContainText('Cannot GET')
      await expect(page.locator('body')).not.toContainText('404')
    }
  })
})
