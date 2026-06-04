# Verificación UI — Terraform + Modal Launch Instance

> **Revisar este documento** cada vez que no veas los cambios del frontend en el navegador.

## Por qué no ves los cambios

| Causa habitual | Qué hacer |
|----------------|-----------|
| Servidor de desarrollo **no reiniciado** tras editar código | Reiniciar `npm run dev:frontend` (ver abajo) |
| Abres **Docker (:8080)** con imagen antigua | Rebuild del contenedor `frontend` |
| Abres **:4200** pero `ng serve` murió (exit 137) | Volver a lanzar dev y comprobar puerto |
| **Caché del navegador** | Recarga forzada **Ctrl+Shift+R** (o ventana privada) |
| Ruta incorrecta | Terraform: `/terraform` — no la vista antigua de tabs Material |

---

## Obligatorio: reiniciar para ver cambios

Los cambios en Angular **no aparecen** en el navegador hasta que el proceso que sirve la app se reinicia (o se reconstruye la imagen Docker).

### Desarrollo local (recomendado — cambios al instante)

```bash
# Desde la raíz del monorepo /home/isaac/Escritorio/SAAS

# 1. Detener cualquier ng serve previo (el script lo hace solo)
# 2. Arrancar de nuevo
npm run dev:frontend
```

Espera en consola la línea:

```text
➜  Local:   http://localhost:4200/
```

Luego en el navegador: **http://localhost:4200/terraform** y **Ctrl+Shift+R**.

### Docker (puerto 8080)

Si usas Docker, **hay que reconstruir** el frontend; un simple `up` no basta:

```bash
cd infra
docker compose build frontend --no-cache
docker compose up -d frontend
```

Abre **http://localhost:8080/terraform** con **Ctrl+Shift+R**.

### Backend (API + WebSocket)

Si cambiaste endpoints Terraform (`preview`, `init`, eventos WS):

```bash
cd infra
docker compose build backend-api
docker compose up -d backend-api
```

API: http://localhost:3001/api/v1 — Swagger: http://localhost:3001/api/docs

---

## Script de comprobación automática

```bash
bash scripts/verify-frontend-ui.sh
```

Debe mostrar ✅ en **Dev frontend (:4200)** y/o **Docker frontend (:8080)**. Si falla, reinicia según la tabla de arriba.

---

## Checklist — Página Terraform (`/terraform`)

Abrir tras login: `admin@cloudops.local` / `Admin123!`

- [ ] Fondo general **#0b0d16**, sin bordes visibles entre paneles (solo contraste de fondo)
- [ ] Barra superior 44px: indicadores **AWS · GCP · Azure · Ansible** con dot verde/rojo
- [ ] Panel izquierdo 260px: secciones **Workspaces**, **Templates**, **Recent runs**
- [ ] Click en template (ej. "Web server AWS") → HCL en editor con efecto **typing**
- [ ] Editor **Monaco** fondo **#070910**, lenguaje HCL
- [ ] Terminal inferior ~200px, fondo **#050709**, líneas verdes/rojas/amarillas según plan
- [ ] Toolbar: **terraform init / plan / apply / destroy**
- [ ] **Apply** deshabilitado hasta generar un plan
- [ ] Botón **Launch instance** abre el modal nuevo
- [ ] Sin errores en consola del navegador (F12)

**Ruta lazy:** `apps/frontend-angular/src/app/terraform/terraform.component.ts`  
**Ruta en router:** `app.routes.ts` → `path: 'terraform'` → `./terraform/terraform.component`

---

## Checklist — Modal Launch Instance

Abrir desde **Launch instance** en `/terraform` (o integración futura en otras páginas).

- [ ] Diálogo **860px**, fondo **#13151f**, **sin borde ni box-shadow** en el panel Material
- [ ] Stepper custom 4 pasos: **Provider → Configure → Review → Launch** (no MatStepper)
- [ ] Paso 1: 3 cards AWS/GCP/Azure; al seleccionar, las otras en **opacity 0.35**
- [ ] Selectores cuenta y región (datos de `CloudAccountsStore`)
- [ ] Paso 2: formulario **distinto** al cambiar proveedor (AWS tabla tipos, GCP familias, Azure imágenes)
- [ ] Paso 3: tabla resumen + coste **$/hr y $/mes** (frontend, `instance-pricing.ts`)
- [ ] Paso 4: **Generate Terraform plan**, terminal preview, input **LAUNCH**, botón deshabilitado hasta escribir `LAUNCH`
- [ ] Barra de progreso durante lanzamiento (WebSocket `terraform.run.progress`)

**Ubicación:** `apps/frontend-angular/src/app/shared/modals/launch-instance/`

**Abrir en código:**

```typescript
this.dialog.open(LaunchInstanceModalComponent, {
  panelClass: 'launch-instance-dialog-panel',
  width: '860px',
  maxWidth: '95vw',
})
```

---

## Archivos principales (referencia rápida)

| Área | Ruta |
|------|------|
| Página Terraform | `apps/frontend-angular/src/app/terraform/` |
| Editor Monaco | `apps/frontend-angular/src/app/terraform/terraform-editor/` |
| Modal launch | `apps/frontend-angular/src/app/shared/modals/launch-instance/` |
| Precios instancia | `apps/frontend-angular/src/app/shared/data/instance-pricing.ts` |
| Stores | `apps/frontend-angular/src/app/core/stores/terraform-run.store.ts`, `cloud-accounts.store.ts`, `instance-template.store.ts`, `settings.store.ts` |
| Servicio TF | `apps/frontend-angular/src/app/core/services/terraform.service.ts` |
| Estilos dialog | `apps/frontend-angular/src/styles.scss` → `.launch-instance-dialog-panel` |
| API preview | `POST /api/v1/terraform/preview` |

---

## URLs y credenciales

| Entorno | URL Terraform | Login demo |
|---------|---------------|------------|
| Dev | http://localhost:4200/terraform | admin@cloudops.local / Admin123! |
| Docker | http://localhost:8080/terraform | Igual |

---

## Si sigue sin verse

1. Confirma qué URL usas (**4200** vs **8080**).
2. `ss -tlnp | grep 4200` — debe haber un proceso `ng serve`.
3. `npm run build -w apps/frontend-angular` — debe terminar sin errores.
4. Prueba ventana de incógnito en `/terraform`.
5. Revisa que no estés en la página antigua (`features/terraform/terraform-page.component.ts`); la ruta activa es `app/terraform/terraform.component.ts`.

---

*Última funcionalidad documentada: modal launch multi-paso + página Terraform con Monaco (Fase UI Terraform/Launch).*
