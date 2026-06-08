# Spendlyx — Frontend público

Sitio marketing y registro en https://spendlyx.com (misma SPA Angular).

## Páginas públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing principal |
| `/producto` | Producto y beneficios |
| `/casos-de-uso` | Casos de uso |
| `/docs` | Documentación de usuario del panel |
| `/planes` | Plan PRO |
| `/contacto` | Formulario de contacto |
| `/privacidad` | Política de privacidad |
| `/cookies` | Política de cookies |
| `/terminos` | Términos y condiciones |
| `/aviso-legal` | Aviso legal |
| `/registro` | Alta con verificación email |
| `/verificar-email` | Activación por token |
| `/verificar-email/enviado` | Confirmación post-registro |
| `/verificar-email/error` | Error de verificación |
| `/reenviar-verificacion` | Reenvío de correo |

## Registro y verificación

1. Usuario completa `/registro`
2. API `POST /api/v1/public/register` crea cuenta sin `emailVerifiedAt`
3. Se genera token aleatorio, se guarda **hasheado** (SHA-256), caduca en **24 h**
4. Correo desde `info@spendlyx.com` vía SMTP Ionos
5. Usuario abre enlace → `GET /api/v1/public/verify-email?token=...`
6. Login bloqueado hasta verificación (`EMAIL_NOT_VERIFIED`)

## Variables SMTP (`.env` / `infra/.env`)

```env
SMTP_HOST=smtp.ionos.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@spendlyx.com
SMTP_PASSWORD=
SMTP_FROM="Spendlyx <info@spendlyx.com>"
CONTACT_INBOX=info@spendlyx.com
```

Alternativa SSL: `SMTP_PORT=465`, `SMTP_SECURE=true`

## Probar verificación

```bash
# Registro
curl -X POST https://spendlyx.com/api/v1/public/register \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Test","lastName":"User","company":"Acme","email":"test@example.com","password":"Test1234","acceptTerms":true,"acceptPrivacy":true}'

# Reenvío
curl -X POST https://spendlyx.com/api/v1/public/resend-verification \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}'
```

## Banner de cookies

Preferencias en `localStorage` (`spendlyx_cookie_consent`). No se cargan scripts analíticos/marketing hasta consentimiento.

## Nota legal

Los textos legales son plantillas — revisión jurídica recomendada antes de publicación definitiva (comentario solo en código fuente).
