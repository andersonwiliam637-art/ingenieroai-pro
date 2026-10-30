# IngenieroAI.pro — runbook de configuración y pruebas

## Estado actual

- Proyecto Vercel: `ingenieroai-pro`.
- URL canónica: `https://ingenieroai-pro.vercel.app`.
- Base de datos existente: Neon `neondb`, rama de producción.
- La página puede estar publicada aunque la aplicación no esté lista para usuarios finales.
- Variables de aplicación ya configuradas previamente en Vercel: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`. No sobrescribas `DATABASE_URL` con la contraseña de `neondb_owner`.

## A. Actualizar GitHub sin publicar el repositorio

1. Mantén el repositorio privado. Vercel ya puede desplegar desde GitHub; hacerlo público no arregla la autenticación ni concede a la integración privada más permisos.
2. Aplica el contenido de este paquete sobre la raíz del repositorio (no reemplaces la carpeta `.git-project` ni subas `.env.local`).
3. Ejecuta `npm run qa:static` y `npm run qa:routes`. Luego `npm run build`.
4. Haz commit y push a `main`. Revisa el nuevo Deployment en Vercel antes de darlo por válido.

## B. Aplicar la migración incremental en Neon

1. Abre el proyecto Neon **Ingeniería.pro**, rama `producción`, base `neondb`.
2. Abre el SQL Editor y ejecuta una sola vez el archivo `db/migrations/0002_onboarding_billing_runtime.sql`.
3. La migración es aditiva: crea la solicitud de registro, funciones seguras de provisioning, el plan gratuito y permisos mínimos del runtime. No borra tablas existentes. Si detecta organizaciones con más de una suscripción, aborta y requiere revisión; no elimines filas para forzarla.
4. No ejecutes `0001_neon_schema_review.sql` contra la base actual: ese archivo es el esquema inicial consolidado, no una migración incremental.
5. Después revisa `/api/health`. La respuesta esperada es HTTP 200 con `ok: true`; si informa `migration_required`, la migración no se aplicó o no completó.

## C. Configurar SMTP en Vercel

En Vercel → `ingenieroai-pro` → Settings → Environment Variables, agrega los valores reales para **Production**:

- `SMTP_HOST`: servidor SMTP del proveedor.
- `SMTP_PORT`: normalmente `587` (STARTTLS) o `465` (TLS directo, según proveedor).
- `SMTP_SECURE`: `false` para STARTTLS en 587; `true` para TLS directo en 465.
- `SMTP_USER`: usuario SMTP.
- `SMTP_PASSWORD`: contraseña/token SMTP.
- `AUTH_EMAIL_FROM`: remitente autorizado por ese proveedor.
- `AUTH_URL`: `https://ingenieroai-pro.vercel.app`.
- `APP_BASE_URL`: `https://ingenieroai-pro.vercel.app`.

No publiques ni envíes esos valores por chat. Guarda y vuelve a desplegar para que las funciones reciban las variables.

## D. Probar el registro

1. Abre `https://ingenieroai-pro.vercel.app/register`.
2. Registra una empresa de prueba (por ejemplo, LATAM + Guatemala) con un correo al que tengas acceso.
3. Comprueba que llega el enlace. Abre el enlace desde el mismo navegador y espera el redirect a Dashboard.
4. En Neon comprueba que existe una fila en `users`, una en `organizations`, una membresía con rol `owner`, los módulos iniciales y una suscripción `starter-free`.
5. Cierra sesión, inicia sesión otra vez y confirma que el usuario vuelve a la misma empresa.
6. Registra un segundo email de prueba con otra organización. Verifica que los prospectos/productos de un tenant nunca son visibles al otro. No uses datos reales de clientes.

## E. Configurar cobros (primero sandbox, no live)

Los checkouts de este paquete cobran un periodo por vez (un pago único); no renuevan automáticamente. Las claves de pago reales no se deben activar hasta que las pruebas pasen.

En Vercel configura inicialmente:

- `BILLING_PAYMENTS_ENABLED=false`
- `PAYPAL_MODE=sandbox`
- `PAYPAL_CLIENT_ID`: client ID de la aplicación PayPal Sandbox.
- `PAYPAL_CLIENT_SECRET`: secret de PayPal Sandbox.
- `PAYPAL_WEBHOOK_ID`: ID del webhook Sandbox.
- `RECURRENTE_SECRET_KEY`: llave TEST de Recurrente Sandbox.
- `RECURRENTE_WEBHOOK_SECRET`: signing secret (`whsec_...`) del endpoint de webhook Sandbox.

Registra estos webhooks en las consolas de cada proveedor:

- Recurrente: `https://ingenieroai-pro.vercel.app/api/billing/webhooks/recurrente`
- PayPal: `https://ingenieroai-pro.vercel.app/api/billing/webhooks/paypal`

El secreto de firma de Recurrente no es la llave API. Verifica la firma en los eventos con `Svix`; PayPal se verifica con `/v1/notifications/verify-webhook-signature`.

### Precios

`db/seeds/0003_paid_plans_proposal.sql` contiene precios ilustrativos **inactivos** (no aprobados). No ejecutes ese seed ni actives planes sin aprobar explícitamente los importes y la moneda para cada mercado. Una vez aprobados, carga los planes, activa únicamente los correctos y prueba checkout, rechazo, cancelación, webhook repetido, importe/moneda incorrectos y reembolso en Sandbox.

Después de validar la compra y los webhooks en Sandbox, podrás habilitar `BILLING_PAYMENTS_ENABLED=true` en Preview. No actives Production con keys LIVE hasta tener evidencia de todas las pruebas.

## F. Matriz de pruebas de aceptación

- [ ] `npm run build` termina exitosamente.
- [ ] `/api/health` responde `ok: true`.
- [ ] Registro crea empresa/owner solo después de verificar email.
- [ ] Segundo registro con el mismo usuario no crea tenant extra.
- [ ] Dos tenants no pueden leer, escribir, actualizar ni borrar los datos de la otra organización.
- [ ] Rol runtime `ingenieroai_runtime` mantiene `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS` y no pertenece a `neon_superuser`.
- [ ] Recurrente Sandbox: success/cancel/failure y webhook firmado verificado.
- [ ] PayPal Sandbox: create → approve → capture, webhook firmado verificado.
- [ ] Eventos duplicados no activan dos veces ni prolongan un periodo dos veces.
- [ ] Importe/moneda incorrectos nunca activan licencia.
- [ ] Pruebas de reembolso y reconciliación.
- [ ] Solo después: habilitar pagos y revisar condiciones fiscales/legales.

**No declares la app lista para vender mientras falte alguna de las comprobaciones anteriores.**
