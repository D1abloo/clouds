import { FULL_WIZARD_STEPS, connectionMethodsFor, resourceSyncOptionsFor } from './cloud-account-wizard.config'

describe('cloud-connection-wizard', () => {
  it('define 6 pasos del asistente gráfico en español', () => {
    expect(FULL_WIZARD_STEPS).toHaveSize(6)
    const labels = FULL_WIZARD_STEPS.map((s) => s.label).join(' ')
    expect(labels).toContain('Proveedor')
    expect(labels).toContain('Método')
    expect(labels).toContain('Credenciales')
    expect(labels).toContain('Validación')
    expect(labels).toContain('Alcance')
    expect(labels).toContain('Finalizar')
    expect(labels.toLowerCase()).not.toContain('demo')
  })

  it('expone métodos de conexión por proveedor cloud sin nombres fake', () => {
    const aws = connectionMethodsFor('AWS')
    expect(aws.some((m) => m.id === 'iam_role')).toBe(true)
    expect(JSON.stringify(aws).toLowerCase()).not.toContain('cuenta demo')
    expect(JSON.stringify(aws).toLowerCase()).not.toContain('acme')
  })

  it('ofrece selección de recursos para AWS y Kubernetes', () => {
    const awsResources = resourceSyncOptionsFor('AWS').map((r) => r.id)
    expect(awsResources).toContain('ec2')
    expect(awsResources).toContain('vpc')
    const k8s = resourceSyncOptionsFor('KUBERNETES').map((r) => r.id)
    expect(k8s).toContain('pods')
    expect(k8s).toContain('deployments')
  })
})
