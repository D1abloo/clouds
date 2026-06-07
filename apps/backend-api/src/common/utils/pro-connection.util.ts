/** Respuesta estándar cuando faltan credenciales en PRO. */
export type ConnectionRequiredResponse = {
  connectionRequired: true
  proMode: true
  module: string
  message: string
  configureHint: string
  items: []
}

export const connectionRequired = (
  module: string,
  configureHint: string,
): ConnectionRequiredResponse => ({
  connectionRequired: true,
  proMode: true,
  module,
  message: `Conexión requerida — configure ${module} para usar este módulo en modo PRO.`,
  configureHint,
  items: [],
})
