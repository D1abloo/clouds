import type { LaunchInstanceFormState } from './launch-instance.models'
import type { WizardStepId } from './launch-wizard-stepper.component'

export interface ReadinessItem {
  id: string
  label: string
  done: boolean
  step: WizardStepId
}

export const buildReadinessChecklist = (
  form: LaunchInstanceFormState,
  planGenerated: boolean,
): ReadinessItem[] => {
  const items: ReadinessItem[] = [
    { id: 'provider', label: 'Proveedor seleccionado', done: !!form.provider, step: 1 },
    { id: 'folder', label: 'Carpeta organizativa', done: !!form.folderId, step: 2 },
    { id: 'region', label: 'Región / zona definida', done: !!form.region, step: 2 },
    { id: 'name', label: 'Nombre de instancia', done: form.name.length >= 3, step: 3 },
    {
      id: 'type',
      label: 'Tipo de instancia',
      done: !!(form.instanceType || form.gcpMachineType || form.azureVmSize),
      step: 4,
    },
    { id: 'plan', label: 'Plan Terraform generado', done: planGenerated, step: 5 },
  ]
  if (form.provider === 'AWS') {
    items.splice(4, 0, { id: 'ami', label: 'AMI configurada', done: !!form.ami, step: 3 })
  }
  return items
}

export const readinessPercent = (items: ReadinessItem[]): number => {
  if (!items.length) return 0
  const done = items.filter((i) => i.done).length
  return Math.round((done / items.length) * 100)
}
