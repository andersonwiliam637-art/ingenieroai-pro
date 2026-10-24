# Migraciones Neon — pendiente bloqueante

No ejecutar todavía. Las migraciones de negocio del paquete anterior no se trasladan aquí porque dependen de `auth.users`, `auth.uid()`, y roles de una plataforma específica. Copiar o reemplazar esas referencias mecánicamente puede romper autenticación o dejar una fuga entre organizaciones.

La siguiente migración debe crear, en un orden validado:
1. Tablas Auth.js (`users`, `accounts`, `sessions`, `verification_token`) con tipos compatibles con las claves foráneas del dominio.
2. Tablas de negocio LATAM/UAE y constraints/FKs compuestas de pertenencia al tenant.
3. Rol de migración/propietario separado del rol de ejecución de la app, con grants mínimos.
4. RLS compatible con PostgreSQL/Neon y contexto de usuario transaccional seguro; ninguna política puede confiar en una variable que el cliente pueda establecer libremente.
5. Restricciones y triggers de integridad entre tablas tenant, billing y webhooks.
6. Pruebas de aislamiento con dos tenants, escrituras cruzadas, elevación de rol y accesos no autenticados.

Solo aceptar después de ejecutar la migración y las pruebas en una base Neon de staging. No conectar producción antes de ello.
