# GCP Compute Engine — Prueba de lanzamiento

**Fecha:** 2026-06-12
**Entorno local:** `/home/isaac/Escritorio/SAAS`
**Credenciales locales:** `GOOGLE_APPLICATION_CREDENTIALS` y `GCP_PROJECT_ID` missing

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
| UI GCP propia | OK — formulario dedicado Compute Engine |
| Preseleccion desde sidebar | OK — `/automation/ai-infra-studio?provider=gcp` |
| `validate-launch` local | Bloqueado — faltan variables GCP |
| `POST .../instances` local | No ejecutado |
| Inventario local wizard | Preparado via `CloudLaunchActivityService` |
| Instancias test RUNNING | 0 |

## Respuesta API esperada (recortada)

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

No se creo instancia real en esta sesion local. Sin instancias `ais-*` activas creadas por esta ejecucion.
