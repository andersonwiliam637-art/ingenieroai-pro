# IngenieroAI.pro — Neon + Auth.js

Base de transición integrada para IngenieroAI.pro. La base de datos objetivo es Neon PostgreSQL; autenticación con Auth.js v5; despliegue preparado para Render. Incluye módulos iniciales LATAM/Guatemala y UAE/Dubái.

## Estado honesto

Este paquete integra el scaffolding Neon/Auth.js y el SQL consolidado derivado de las fases 1–8. **No es todavía un despliegue de producción verificado**: no se ha ejecutado contra una instancia PostgreSQL/Neon real, no se ha probado el correo SMTP, no se ha confirmado la compatibilidad del adaptador de Auth.js con el esquema UUID, y las pruebas de aislamiento entre organizaciones aún deben ejecutarse.

## Requisitos

- Node.js 20+
- Una base Neon de prueba vacía
- Credenciales SMTP para el inicio de sesión por correo

## Configuración local

1. Copiar `.env.example` a `.env.local` y configurar `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` y SMTP.
2. Revisar `db/migrations/0001_neon_schema_review.sql` antes de ejecutarlo. Es un esquema inicial consolidado, no una migración incremental para una base con datos.
3. Ejecutar el SQL primero en una base/branch Neon desechable, nunca sobre producción sin validar.
4. Instalar dependencias con `npm install`.
5. Ejecutar `npm run qa:static`, `npm run build` y pruebas de integración/aislamiento antes del despliegue.
6. Configurar las variables de entorno en Render a partir de `.env.example`.

## Bloqueos de seguridad antes de producción

- Definir rol de ejecución de base de datos separado del propietario/migrador, con privilegios mínimos.
- Completar grants y política de acceso explícita para `memberships`; el SQL deja una advertencia porque no se debe exponer esa tabla sin diseño de permisos revisado.
- En cada transacción de negocio autenticada, establecer `app.user_id` mediante `set_config('app.user_id', $1, true)` usando únicamente el UUID de la sesión Auth.js verificada.
- Verificar el adaptador Auth.js/UUID y el flujo de inicio de sesión por correo.
- Probar denegación entre dos organizaciones con usuarios distintos, así como permisos de inserción/actualización/borrado.

## Scripts

- `npm run dev`
- `npm run qa:static`
- `npm run build`
- `npm start`

La verificación estática no equivale a una auditoría de seguridad ni prueba que Neon o SMTP estén conectados.
