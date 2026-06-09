import type { CreateJenkinsJobForm, JenkinsJob, JenkinsJobType } from './jenkins.models'
import type { JobRow } from './jenkins.util'

export interface ProdReadinessCheck {
  id: string
  label: string
  hint: string
  pass: boolean
}

export type ProdReadinessInput = {
  defaultEnvironment: string
  type: JenkinsJobType
  jenkinsfilePath: string
  scmUrl: string
  branch: string
  credentialsId: string
  enableBuildParameters: boolean
  requireApprovalProd: boolean
  skipTestsDefault: boolean
  runSonarDefault: boolean
  scmValidated: boolean
}

const isPipelineType = (type: JenkinsJobType): boolean =>
  type === 'pipeline' || type === 'multibranch'

const paramDefault = (job: JobRow, key: string): string | undefined => {
  const params = job['parameters'] as { key: string; default: string }[] | undefined
  return params?.find((p) => p.key === key)?.default
}

export const targetsProduction = (environment: string): boolean => environment === 'production'

export const evaluateProdReadiness = (input: ProdReadinessInput): ProdReadinessCheck[] => {
  const jenkinsfileOk =
    isPipelineType(input.type) && input.jenkinsfilePath.trim().length > 0

  return [
    {
      id: 'scm-validated',
      label: 'Repositorio validado',
      hint: 'Usa «Validar acceso» en la sección SCM antes de crear el job.',
      pass: input.scmValidated,
    },
    {
      id: 'pipeline-type',
      label: 'Pipeline declarativo',
      hint: 'En producción usa tipo Pipeline o Multibranch con Jenkinsfile.',
      pass: isPipelineType(input.type),
    },
    {
      id: 'jenkinsfile',
      label: 'Jenkinsfile definido',
      hint: 'Indica la ruta del Jenkinsfile en el repositorio.',
      pass: jenkinsfileOk,
    },
    {
      id: 'scm-config',
      label: 'SCM y credenciales',
      hint: 'URL del repo, rama y credencial Jenkins son obligatorios.',
      pass:
        input.scmUrl.trim().length > 0 &&
        input.branch.trim().length > 0 &&
        input.credentialsId.trim().length > 0,
    },
    {
      id: 'build-parameters',
      label: 'Parámetros de build',
      hint: 'Activa parámetros para ENVIRONMENT, aprobación y controles de pipeline.',
      pass: input.enableBuildParameters,
    },
    {
      id: 'approval-prod',
      label: 'Aprobación manual en prod',
      hint: 'Obligatorio para despliegues a producción (REQUIRE_APPROVAL).',
      pass: input.requireApprovalProd,
    },
    {
      id: 'tests-not-skipped',
      label: 'Tests activos por defecto',
      hint: 'SKIP_TESTS no puede ir activado por defecto en producción.',
      pass: !input.skipTestsDefault,
    },
    {
      id: 'sonar',
      label: 'SonarQube en pipeline',
      hint: 'Análisis de calidad recomendado antes de desplegar a PRO.',
      pass: input.runSonarDefault,
    },
  ]
}

export const isProdReadinessComplete = (checks: ProdReadinessCheck[]): boolean =>
  checks.every((c) => c.pass)

export const prodReadinessFromCreateForm = (
  form: CreateJenkinsJobForm,
  scmValidated: boolean,
): ProdReadinessCheck[] =>
  evaluateProdReadiness({
    defaultEnvironment: form.defaultEnvironment,
    type: form.type,
    jenkinsfilePath: form.jenkinsfilePath,
    scmUrl: form.scmUrl,
    branch: form.branch,
    credentialsId: form.credentialsId,
    enableBuildParameters: form.enableBuildParameters,
    requireApprovalProd: form.requireApprovalProd,
    skipTestsDefault: form.skipTestsDefault,
    runSonarDefault: form.runSonarDefault,
    scmValidated,
  })

export const evaluateJobProdLaunchChecks = (job: JobRow): ProdReadinessCheck[] => {
  const env = paramDefault(job, 'ENVIRONMENT') ?? 'staging'
  if (!targetsProduction(env)) {
    return []
  }

  const type = String(job['type'] ?? 'pipeline') as JenkinsJobType
  const jenkinsfile = paramDefault(job, 'JENKINSFILE') ?? ''
  const scm = job['scm'] as { url?: string; branch?: string } | undefined
  const params = (job['parameters'] as { key: string; default: string }[]) ?? []
  const hasParam = (key: string) => params.some((p) => p.key === key)
  const paramIsTrue = (key: string) => paramDefault(job, key) === 'true'

  return [
    {
      id: 'pipeline-type',
      label: 'Pipeline declarativo',
      hint: 'El job debe ser Pipeline o Multibranch.',
      pass: isPipelineType(type),
    },
    {
      id: 'jenkinsfile',
      label: 'Jenkinsfile configurado',
      hint: 'Parámetro JENKINSFILE o ruta en el job.',
      pass: isPipelineType(type) && jenkinsfile.trim().length > 0,
    },
    {
      id: 'scm-config',
      label: 'SCM configurado',
      hint: 'Repositorio y rama en el job.',
      pass: Boolean(scm?.url?.trim()) && Boolean(scm?.branch?.trim() || job['branch']),
    },
    {
      id: 'build-parameters',
      label: 'Parámetros de build',
      hint: 'El job debe exponer ENVIRONMENT y REQUIRE_APPROVAL.',
      pass: hasParam('ENVIRONMENT') && hasParam('REQUIRE_APPROVAL'),
    },
    {
      id: 'approval-prod',
      label: 'Aprobación manual en prod',
      hint: 'REQUIRE_APPROVAL debe estar en true.',
      pass: paramIsTrue('REQUIRE_APPROVAL'),
    },
    {
      id: 'tests-not-skipped',
      label: 'Tests activos por defecto',
      hint: 'SKIP_TESTS no puede estar en true por defecto.',
      pass: !hasParam('SKIP_TESTS') || !paramIsTrue('SKIP_TESTS'),
    },
    {
      id: 'sonar',
      label: 'SonarQube en pipeline',
      hint: 'RUN_SONAR debe estar habilitado por defecto.',
      pass: !hasParam('RUN_SONAR') || paramIsTrue('RUN_SONAR'),
    },
  ]
}

export const isJobProdLaunchReady = (job: JobRow): boolean => {
  if (job['prodLaunchReady'] === true) return true
  const env = paramDefault(job, 'ENVIRONMENT') ?? 'staging'
  if (!targetsProduction(env)) return true
  const checks = evaluateJobProdLaunchChecks(job)
  return checks.length > 0 && isProdReadinessComplete(checks)
}

export const jobTargetsProduction = (job: JenkinsJob | JobRow): boolean => {
  const env = paramDefault(job as JobRow, 'ENVIRONMENT')
  return targetsProduction(env ?? '')
}
