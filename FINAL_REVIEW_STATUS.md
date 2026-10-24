# Revisión de integración — 2026-10-17

## Cambios incorporados
- Paquete base actualizado de Neon + Auth.js; dependencias Supabase fuera de `package.json` y del runtime source revisado.
- SQL consolidado incorporado como `db/migrations/0001_neon_schema_review.sql`.
- Corregido el orden de creación de `private.current_user_id()` para que exista antes de funciones de seguridad que lo referencian.
- Añadido flujo inicial `/login` por enlace de correo.
- Añadido helper de transacción que fija `app.user_id` localmente desde la sesión Auth.js verificada; los resúmenes LATAM/UAE y la búsqueda de tenant lo usan.
- Añadidos artefactos de QA de las fases previas y documentación de despliegue.

## Verificaciones realizadas
- `npm run qa:static`: PASS. Revisa ausencia de SDK Supabase y presencia del scaffolding Neon/Auth.js.
- Búsqueda estática de referencias Supabase en `src`, `package.json`: sin resultados.
- Confirmada la presencia de la ruta Auth.js y del SQL consolidado.

## No verificado / bloqueos restantes
- `npm install` no terminó dentro del límite de ejecución de este entorno; no se pudo instalar Next.js.
- `npm run build` NO PASÓ: `next: not found`, consecuencia de dependencias no instaladas; no se interpreta como error de TypeScript ni como build aprobado.
- No hay conexión a una instancia Neon disponible en este entorno; SQL no se ejecutó contra PostgreSQL real.
- No se probaron el adaptador Auth.js/UUID, SMTP, grants mínimos, creación inicial de organización/usuario, ni pruebas activas de aislamiento entre tenants.
- `memberships` requiere privilegios de runtime estrictamente limitados y revisión específica; no desplegar hasta terminar ese control.

## Estado
Integración de código y artefactos completada en este ZIP; proyecto **todavía no certificado para producción**. El siguiente paso técnico es instalar dependencias en un entorno con acceso al registro npm, ejecutar build, y validar SQL/aislamiento en una base Neon de prueba.

## Revisión adicional de seguridad (2026-10-17)
- Añadidas políticas RLS de memberships: lectura limitada a filas del usuario autenticado y denegación por política de INSERT/UPDATE/DELETE.
- Quitados los permisos generales de ejecución de helpers del esquema de la migración; ahora se documentan en una plantilla separada de grants para un rol runtime dedicado.
- Añadida `db/operations/02-runtime-role-grants.template.sql` con privilegios mínimos orientativos y sin permisos runtime para webhooks.
- Dashboard y página UAE redirigen usuarios no autenticados a `/login`; se muestra un estado explícito si el usuario no tiene tenant.
- `/api/health` comprueba la conexión PostgreSQL y devuelve 503 sin exponer detalles si la BD no responde.
- Añadida página `/verify-request`; endurecida CSP eliminando `unsafe-eval`.
- QA estático ampliado y ejecutado: PASS.
- Revisión de referencias de las tablas usadas por la plantilla de grants: todas existen en la migración.
- `npm install` volvió a superar el límite de ejecución de este entorno; build y tests de integración continúan SIN VERIFICAR.
