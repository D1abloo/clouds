# GCP Compute Engine — Prueba de lanzamiento

**Fecha:** 2026-06-12  
**Entorno:** https://spendlyx.com (PRO)  
**Cuenta:** GCP Producción (`fd75380a-f61c-4649-b3ee-69d80a3956e8`)

## Configuración de prueba

| Campo | Valor |
|-------|-------|
| Nombre | `ais-gcp-test-1781220968` |
| Región | `europe-west1` |
| Zona | `europe-west1-b` |
| Tipo | `e2-micro` |
| Imagen | `projects/debian-cloud/global/images/family/debian-12` |
| Disco | 10 GB · `zones/europe-west1-b/diskTypes/pd-standard` |
| Tags | `created_by=ai-infra-studio`, `environment=test`, `auto_delete=true` |

## Resultados

| Paso | Resultado |
|------|-----------|
| `validate-launch` | OK — `valid: true` |
| `POST .../instances` (launch) | OK — instancia creada |
| Inventario DB | OK — `dbId: 57100721-c17a-4d14-a2e5-b5face027e3f` |
| Estado inicial | `PENDING` |
| Stop (cleanup) | OK — `[GCP] Stopped ais-gcp-test-1781220968` |
| Instancias test RUNNING | 0 |

## Respuesta API (recortada)

```json
{
  "id": "ais-gcp-test-1781220968",
  "provider": "GCP",
  "status": "PENDING",
  "instanceType": "e2-micro",
  "dbId": "57100721-c17a-4d14-a2e5-b5face027e3f",
  "metadata": {
    "tags": {
      "created_by": "ai-infra-studio",
      "environment": "test",
      "auto_delete": "true"
    }
  }
}
```

## Notas

- Imagen `debian-cloud` (nombre corto) falla; usar ID completo del catálogo API.
- `diskType` debe ser URL de zona: `zones/{zone}/diskTypes/pd-standard`.

## Estado final

Instancia de prueba detenida vía API. Sin instancias `ais-*` en estado RUNNING.
