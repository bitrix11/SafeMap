-- SafeMap — migración V002: purga automática con pg_cron
-- Requiere la extensión pg_cron instalada en el servidor.
-- En la imagen postgis/postgis estándar pg_cron NO viene incluido;
-- omitir este archivo si no está disponible y usar el worker externo.

-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Purga reportes expirados cada 10 minutos.
-- SELECT cron.schedule(
--     'purgar_reportes_expirados',
--     '*/10 * * * *',
--     $$
--         UPDATE reportes
--         SET    activo = false
--         WHERE  expira_en < now()
--           AND  activo = true;
--     $$
-- );

-- Nota: la capa lógica (filtro expira_en > now() en GET) es la verdad primaria.
-- Este job sólo marca activo=false; la eliminación física puede hacerse luego
-- con particionamiento por tiempo y DROP PARTITION a escala.
