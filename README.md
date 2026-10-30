# IngenieroAI.pro — paquete de corrección del MVP

Este paquete agrega el flujo central que faltaba para que una empresa pueda empezar a usar IngenieroAI.pro: registro de empresa y propietario después de verificar el correo, inicio de sesión con enlace mágico, CRUD básico de prospectos y productos, pantalla de planes y checkouts protegidos para Recurrente/PayPal.

**Importante:** esto es un paquete de corrección para aplicar al repositorio existente, no una certificación de producción. La aplicación solo estará lista para clientes tras aplicar la migración incremental, configurar un SMTP real, aprobar los precios, configurar credenciales de sandbox y pasar las pruebas descritas en `RUNBOOK_PRODUCTION.md`.

## Funciones incluidas en este paquete

- Página pública con llamadas a `Crear empresa` e `Iniciar sesión`.
- Registro de empresa LATAM/UAE y creación del primer usuario con rol `owner` únicamente después de verificar correo.
- Inicio de sesión por email con Nodemailer explícito; no intenta usar `localhost:587` cuando no hay SMTP.
- Dashboard con métricas iniciales y estado explícito cuando el usuario aún no tiene empresa.
- CRUD básico de prospectos CRM y catálogo de productos limitado a la organización/tenant autenticado.
- Página de facturación, checkout server-side Recurrente/PayPal y handlers de webhook con verificación de firma y validación del importe.
- Migración incremental `db/migrations/0002_onboarding_billing_runtime.sql` para registro, plan gratuito, permisos runtime y activación de pagos verificados.
- Precios iniciales propuestos e inactivos en `db/seeds/0003_paid_plans_proposal.sql`. Son solo una propuesta y no están habilitados para cobro.

## Lo que todavía NO está listo para vender sin una validación final

- Los cobros son checkouts de pago único por periodo; no hay renovación automática recurrente implementada todavía.
- SMTP, Recurrente y PayPal requieren credenciales del propietario configuradas en Vercel; no se incluyen secretos en Git.
- Los planes de pago están inactivos hasta que se aprueben los precios y se activen explícitamente.
- Los módulos de oportunidades completas, automatizaciones/IA y operaciones UAE siguen siendo una base parcial; no deben anunciarse como funcionalidades completas.
- La construcción Next.js no pudo verificarse en este entorno porque `npm install` agotó el tiempo de espera por problemas de red. Las pruebas estáticas pasan, pero no sustituyen `npm run build` ni los tests live.

## Requisitos

- Node.js 20 o 22 recomendado.
- Neon PostgreSQL con el esquema base existente de las fases anteriores.
- Rol de runtime `ingenieroai_runtime` con `NOBYPASSRLS`, sin privilegios elevados.
- Proveedor SMTP con remitente/dominio verificado.
- Credenciales de sandbox de Recurrente y PayPal para validar cobros sin dinero real.

## Desarrollo local

1. Copiar `.env.example` a `.env.local`; no rellenar las claves con valores ficticios esperando que el correo/pagos funcionen.
2. Instalar dependencias con `npm install`.
3. Ejecutar `npm run qa:static` y `npm run qa:routes`.
4. Ejecutar `npm run build`.
5. Probar registro/login con un buzón real de prueba y una rama Neon separada.

## Producción

Seguir **`RUNBOOK_PRODUCTION.md`** en este orden. No ejecutes la migración inicial `0001_neon_schema_review.sql` sobre la base actual. La migración incremental que se debe revisar/aplicar al esquema existente es `0002_onboarding_billing_runtime.sql`.

## QA

- `npm run qa:static`: comprobaciones estáticas de scaffolding/proveedor.
- `npm run qa:routes`: archivos y condiciones críticas esperadas.
- `npm run build`: compilación real Next.js; debe ejecutarse con dependencias instaladas.
- Pruebas manuales obligatorias: health, registro/verificación de email, tenant isolation de dos empresas, Recurrente sandbox, PayPal sandbox y webhooks idempotentes.
