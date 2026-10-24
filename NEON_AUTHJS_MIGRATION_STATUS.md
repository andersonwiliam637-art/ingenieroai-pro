# Estado de transición Neon + Auth.js

## Integrado en este paquete
- Eliminación de dependencias Supabase del runtime en favor de `pg`, Neon PostgreSQL y Auth.js.
- Pool PostgreSQL, configuración Auth.js, rutas y páginas iniciales LATAM/UAE.
- Esquema consolidado en `db/migrations/0001_neon_schema_review.sql`.
- Guía de configuración y pruebas previas a producción.

## Verificaciones pendientes obligatorias
- Instalación limpia y `npm run build` en el entorno de destino.
- Ejecución completa del SQL en una base Neon de prueba.
- Compatibilidad real del `@auth/pg-adapter` con IDs UUID y columnas del esquema.
- Configurar y probar SMTP.
- Revisar grants/policies de `memberships` y definir rol de runtime con privilegios mínimos.
- Asegurar que todas las operaciones de negocio ejecutan `set_config('app.user_id', ..., true)` dentro de transacción.
- Pruebas de aislamiento multiempresa y permisos por rol.
- Validar despliegue en Render y endpoints con secretos configurados.

No marcar como listo para producción hasta cerrar todos los puntos pendientes y guardar resultados reproducibles.
