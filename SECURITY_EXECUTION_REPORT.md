# IngenieroAI.pro — informe de avance técnico

Fecha de ejecución: 2026-10-20/21 (UTC)
Alcance: revisión del ZIP `IngenieroAI_Neon_AuthJS_Hardened_Candidate.zip` y comprobaciones de solo lectura contra Neon production.

## Resultados confirmados

- La migración de esquema fue aplicada previamente en Neon production y la estructura se verificó: 35 tablas en `public`, 54 claves foráneas, 73 índices, 98 políticas y 15 funciones en `private`; se conservaron las 9 tablas de `neon_auth`.
- `node scripts/qa-static.mjs`: PASSED (`NEON_TRANSITION_STATIC_CHECK_PASSED`, 20 archivos fuente/script).
- Consulta de conexión directa a Neon: responde PostgreSQL 18.6 en `neondb` con el rol `neondb_owner`.
- Consulta de roles: existe `neondb_owner`; no existe `ingenieroai_runtime` ni roles `authenticated`/`anon` con esos nombres.
- El archivo de configuración de ejemplo recomienda `DATABASE_URL` con `sslmode=require`; el pool configura TLS con verificación de certificado para conexiones que no sean locales.

## Bloqueos / no verificado

- `npm install --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` no pudo descargar dependencias: `EAI_AGAIN registry.npmjs.org` (DNS/red del entorno).
- El ZIP no contiene `package-lock.json`; por tanto, las dependencias no están fijadas por lockfile y `npm ci` no es ejecutable todavía.
- No se pudo ejecutar `npm run build` porque las dependencias no están instaladas.
- No existe aún un rol de ejecución dedicado `ingenieroai_runtime`; el archivo `db/operations/02-runtime-role-grants.template.sql` es solo una plantilla y no se ha aplicado.
- La conexión directa confirmada fue con `neondb_owner`, que tiene `rolbypassrls=true`; no es una credencial apropiada para el runtime normal de la aplicación.
- No se ejecutó una prueba real de aislamiento entre dos organizaciones; no se debe afirmar que RLS está validado.
- No se han probado SMTP, el enlace de acceso Auth.js, expiración/reutilización de tokens, provisión de organización/propietario, pagos, webhooks ni despliegue.

## Riesgos detectados

1. La aplicación no debe desplegarse con credenciales de `neondb_owner`.
2. El runtime role necesita un conjunto revisado de permisos; la plantilla actual debe validarse contra las consultas reales y el flujo Auth.js antes de aplicarse.
3. Debe confirmarse la compatibilidad del esquema UUID de Auth.js con la versión resuelta de `@auth/pg-adapter`.
4. No hay lockfile, lo que impide una instalación reproducible.
5. La función `withTenantTransaction` requiere que cada consulta de negocio se ejecute dentro de esa transacción; consultas fuera de ella no reciben el contexto `app.user_id`.

## Próximas acciones seguras

1. Generar y revisar `package-lock.json` en un entorno con acceso a npm.
2. Instalar dependencias y ejecutar TypeScript/build/QA.
3. Preparar un rol runtime dedicado y permisos mínimos en una rama de prueba; probar Auth.js y RLS antes de usarlo en producción.
4. No cambiar ni recrear la migración de producción para resolver estos puntos.

## Dictamen

**NO-GO para producción pública** hasta que compilación, autenticación, rol de ejecución y aislamiento multi-tenant estén probados. La migración SQL aplicada no equivale a una aplicación lista para producción.
