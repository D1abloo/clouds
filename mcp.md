# mcp.md - Propuesta de MCP para CloudOps Control Center

## Objetivo

Definir servidores MCP que permitan a una IA interactuar de forma controlada con recursos cloud, SSH, Terraform, Jenkins, métricas, facturación y PostgreSQL.

## Principios

- Cada MCP debe tener permisos mínimos.
- Todas las acciones críticas deben requerir confirmación.
- Los secretos no deben devolverse nunca en respuestas.
- Todo debe auditarse.
- Los comandos deben estar restringidos por política.
- La IA no debe poder destruir recursos sin aprobación explícita.

## Servidores MCP propuestos

### 1. cloud-inventory-mcp

Gestiona inventario cloud.

Herramientas:

```txt
list_cloud_accounts()
validate_cloud_account(account_id)
list_regions(account_id)
list_instances(account_id, region)
get_instance(account_id, instance_id)
start_instance(account_id, instance_id)
stop_instance(account_id, instance_id)
restart_instance(account_id, instance_id)
sync_cloud_inventory(account_id)
```

Permisos:

- Lectura de cuentas.
- Lectura de regiones.
- Lectura de instancias.
- Acciones start/stop/restart con confirmación.

### 2. billing-mcp

Consulta costes y consumo.

Herramientas:

```txt
get_billing_summary(provider, account_id, period)
get_instance_cost(provider, account_id, instance_id, period)
get_cost_forecast(provider, account_id)
sync_billing(provider, account_id)
```

Fuentes:

- AWS Cost Explorer.
- GCP Cloud Billing API.
- Azure Cost Management.

### 3. metrics-mcp

Consulta métricas.

Herramientas:

```txt
get_instance_metrics(instance_id, from, to)
get_realtime_metrics(instance_id)
get_dashboard_summary()
get_alerts()
create_alert_rule(rule)
```

Fuentes:

- CloudWatch.
- Cloud Monitoring.
- Azure Monitor.
- Prometheus.
- SSH collector.
- Docker API.
- Kubernetes metrics.

### 4. ssh-terminal-mcp

Gestiona conexiones SSH.

Herramientas:

```txt
validate_ssh_connection(server_id)
run_ssh_command(server_id, command)
open_terminal_session(server_id)
close_terminal_session(session_id)
get_command_history(server_id)
```

Políticas:

- Bloquear comandos peligrosos por defecto.
- Permitir listas blancas por rol.
- Registrar auditoría.
- No exponer claves privadas.
- No devolver secretos detectados en salida.

### 5. docker-discovery-mcp

Detecta Docker.

Herramientas:

```txt
check_docker(server_id)
list_docker_containers(server_id)
list_docker_images(server_id)
list_docker_networks(server_id)
list_docker_volumes(server_id)
get_container_logs(server_id, container_id)
```

### 6. kubernetes-discovery-mcp

Detecta Kubernetes.

Herramientas:

```txt
check_kubernetes(server_id)
list_k8s_namespaces(server_id)
list_k8s_pods(server_id, namespace)
list_k8s_deployments(server_id, namespace)
list_k8s_services(server_id, namespace)
get_k8s_resource_yaml(server_id, kind, namespace, name)
```

### 7. terraform-runner-mcp

Ejecuta Terraform de forma controlada.

Herramientas:

```txt
create_terraform_run(provider, account_id, variables)
terraform_init(run_id)
terraform_plan(run_id)
terraform_apply(run_id, approval_token)
terraform_destroy(run_id, approval_token)
get_terraform_run(run_id)
get_terraform_logs(run_id)
```

Reglas:

- `apply` requiere approval token.
- `destroy` requiere confirmación reforzada.
- El plan debe mostrarse antes del apply.
- El estado debe guardarse en backend seguro.
- No devolver secretos del state.

### 8. jenkins-mcp

Gestiona Jenkins.

Herramientas:

```txt
list_jenkins_servers()
validate_jenkins_server(server_id)
list_jenkins_jobs(server_id)
run_jenkins_job(server_id, job_name, parameters)
get_jenkins_build(server_id, build_id)
stream_jenkins_logs(server_id, build_id)
```

### 9. postgres-context-mcp

Consulta datos internos.

Herramientas:

```txt
get_user_permissions(user_id)
list_projects(user_id)
get_instance_record(instance_id)
save_audit_log(event)
save_notification(notification)
```

Reglas:

- Solo lectura para la mayoría de consultas.
- Escritura limitada a auditoría/notificaciones.
- Nunca exponer hashes, tokens o secretos.

### 10. notification-mcp

Notificaciones.

Herramientas:

```txt
create_notification(user_id, type, message, severity)
send_email_notification(user_id, subject, body)
send_webhook_notification(webhook_id, payload)
list_notifications(user_id)
mark_notification_read(notification_id)
```

## Flujo MCP recomendado: crear instancia

```txt
1. cloud-inventory-mcp.validate_cloud_account()
2. terraform-runner-mcp.create_terraform_run()
3. terraform-runner-mcp.terraform_init()
4. terraform-runner-mcp.terraform_plan()
5. Mostrar plan en UI.
6. Usuario confirma.
7. terraform-runner-mcp.terraform_apply()
8. cloud-inventory-mcp.sync_cloud_inventory()
9. metrics-mcp.get_realtime_metrics()
10. notification-mcp.create_notification()
```

## Flujo MCP recomendado: verificar VPS

```txt
1. ssh-terminal-mcp.validate_ssh_connection()
2. docker-discovery-mcp.check_docker()
3. kubernetes-discovery-mcp.check_kubernetes()
4. metrics-mcp.get_realtime_metrics()
5. postgres-context-mcp.save_audit_log()
6. notification-mcp.create_notification()
```

## Políticas de aprobación

Acciones sin aprobación:

- Listar instancias.
- Ver métricas.
- Ver facturación.
- Ver jobs Jenkins.
- Ver estado Docker/Kubernetes.

Acciones con aprobación simple:

- Lanzar job Jenkins.
- Ejecutar comando SSH permitido.
- Reiniciar instancia.
- Ejecutar Terraform plan.

Acciones con aprobación reforzada:

- Terraform apply.
- Terraform destroy.
- Apagar instancia.
- Eliminar instancia.
- Cambiar credenciales.
- Borrar cuenta cloud.
