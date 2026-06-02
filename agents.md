# agents.md - Agentes IA para CloudOps Control Center

## Objetivo

Dividir el desarrollo de la plataforma en agentes especializados que colaboren entre sí.

## Agente 1: Product Architect Agent

Responsabilidades:

- Convertir requisitos en roadmap.
- Definir módulos.
- Crear historias de usuario.
- Definir criterios de aceptación.
- Detectar riesgos funcionales.
- Mantener visión global del producto.

Entradas:

- Requisitos del usuario.
- Feedback de UI.
- Restricciones técnicas.

Salidas:

- Backlog.
- Roadmap.
- Especificación funcional.
- Criterios de aceptación.

## Agente 2: Cloud Architecture Agent

Responsabilidades:

- Diseñar arquitectura multi-cloud.
- Definir integración AWS/GCP/Azure.
- Separar cuentas, regiones, proyectos y suscripciones.
- Diseñar modelo de permisos.
- Definir estrategia de credenciales seguras.

Salidas:

- Diagramas.
- Interfaces cloud.
- Adaptadores por proveedor.
- Políticas de permisos mínimos.

## Agente 3: Backend Agent

Responsabilidades:

- Crear backend NestJS.
- Crear APIs REST.
- Crear WebSocket Gateway.
- Crear servicios internos.
- Integrar PostgreSQL.
- Integrar Redis.
- Implementar RBAC.
- Crear auditoría.

Módulos:

- Auth.
- Users.
- Cloud Accounts.
- Instances.
- VPS.
- SSH.
- Docker.
- Kubernetes.
- Jenkins.
- Terraform.
- Metrics.
- Billing.
- Alerts.
- Notifications.
- Audit.

## Agente 4: Frontend Angular Agent

Responsabilidades:

- Crear UI Angular.
- Crear dashboard.
- Crear tablas y filtros.
- Crear modales.
- Crear terminal web.
- Crear gráficos.
- Crear animaciones.
- Crear tema oscuro/claro.
- Integrar WebSocket/SSE.
- Mejorar experiencia de usuario.

Componentes clave:

- Sidebar.
- Topbar.
- Dashboard cards.
- Cloud accounts page.
- VPS page.
- Instance detail page.
- Terminal page.
- Jenkins page.
- Terraform launch modal.
- Billing page.
- Alerts page.
- Audit page.

## Agente 5: SSH & Discovery Agent

Responsabilidades:

- Crear conexión SSH segura.
- Ejecutar comandos remotos.
- Integrar xterm.js.
- Detectar Docker.
- Detectar Kubernetes.
- Detectar servicios systemd.
- Detectar puertos.
- Detectar métricas básicas.
- Registrar auditoría.

Riesgos a controlar:

- Command injection.
- Exposición de claves.
- Escalada de privilegios.
- Comandos destructivos.
- Sesiones zombie.

## Agente 6: Terraform Agent

Responsabilidades:

- Crear módulos Terraform.
- Generar variables.
- Ejecutar init/plan/apply/destroy.
- Gestionar estado.
- Mostrar plan en UI.
- Pedir confirmación.
- Asociar recursos creados con cuentas.
- Registrar logs.

Proveedores:

- AWS.
- GCP.
- Azure.

## Agente 7: Jenkins Agent

Responsabilidades:

- Conectar Jenkins.
- Validar token.
- Listar jobs.
- Lanzar jobs.
- Pasar parámetros.
- Recibir logs.
- Mostrar builds.
- Registrar historial.

## Agente 8: Metrics & Billing Agent

Responsabilidades:

- Recoger métricas.
- Recoger costes.
- Calcular consumo.
- Generar alertas.
- Emitir eventos en tiempo real.
- Crear gráficos.
- Guardar histórico.

Fuentes:

- CloudWatch.
- GCP Cloud Monitoring.
- Azure Monitor.
- Prometheus.
- SSH collectors.
- APIs de billing.

## Agente 9: Security Agent

Responsabilidades:

- Revisar diseño seguro.
- Validar RBAC.
- Revisar secretos.
- Revisar comandos SSH.
- Revisar Terraform.
- Revisar logs.
- Revisar auditoría.
- Sugerir controles de seguridad.

Controles mínimos:

- Cifrado.
- Vault.
- MFA opcional.
- Rate limiting.
- Auditoría.
- Confirmación de acciones críticas.
- Sanitización.
- Separación multi-tenant.

## Agente 10: QA Agent

Responsabilidades:

- Crear tests.
- Probar flujos críticos.
- Validar APIs.
- Validar UI.
- Validar seguridad básica.
- Probar errores.
- Probar tiempo real.
- Probar Jenkins.
- Probar Terraform plan.

Tipos de tests:

- Unitarios.
- Integración.
- E2E.
- Seguridad básica.
- Contract tests.
- Tests de permisos.

## Flujo de colaboración entre agentes

```txt
Product Architect
  -> Cloud Architecture
  -> Backend
  -> Frontend
  -> SSH & Discovery
  -> Terraform
  -> Jenkins
  -> Metrics & Billing
  -> Security
  -> QA
```

## Prompt de coordinación

Usar este texto cuando quieras que los agentes trabajen juntos:

```txt
Actúen como un equipo de agentes especializados para construir CloudOps Control Center. 
Dividan el trabajo por módulos, generen archivos reales, mantengan seguridad por diseño, usen Angular en frontend, NestJS en backend, PostgreSQL como base principal, Terraform para aprovisionamiento, Jenkins para jobs, WebSocket/SSE para tiempo real y auditoría completa. 
Cada agente debe entregar código, documentación, tests y riesgos.
```
