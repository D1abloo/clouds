# Workers

Procesos en background para CloudOps Control Center:

- DiscoveryWorker — Detección Docker/K8s/sistema
- MetricsCollector — Recolección periódica de métricas
- BillingSyncWorker — Sincronización de facturación
- TerraformRunner — Ejecución de terraform init/plan/apply/destroy
- AlertEvaluator — Evaluación de reglas de alerta

## Desarrollo

```bash
npm install
npm run start:dev
```
