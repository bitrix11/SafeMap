-- SafeMap — migración V001: esquema inicial
-- Ejecutar una sola vez sobre una base de datos vacía.
-- Idempotente: usa IF NOT EXISTS / DO $$ ... IF NOT EXISTS.

-- ─── Extensiones ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tabla categorias ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
    id        SMALLINT PRIMARY KEY,
    codigo    VARCHAR(30) UNIQUE NOT NULL,
    label     VARCHAR(80) NOT NULL,
    color_hex CHAR(7)
);

-- ─── Seed de categorías v1 ──────────────────────────────────────────────────
INSERT INTO categorias (id, codigo, label, color_hex) VALUES
    (1, 'zona_oscura',  'Zona oscura',              '#FFB300'),
    (2, 'robo',         'Robo / incidente',          '#E53935'),
    (3, 'sospechoso',   'Actividad sospechosa',      '#8E24AA')
ON CONFLICT (id) DO NOTHING;

-- ─── Tabla reportes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reportes (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id  SMALLINT    NOT NULL REFERENCES categorias(id),
    severidad     VARCHAR(10) NOT NULL DEFAULT 'media',
    -- GEOGRAPHY (no GEOMETRY): distancias reales en metros sobre el elipsoide.
    ubicacion     GEOGRAPHY(Point, 4326) NOT NULL,
    descripcion   VARCHAR(280),
    reporter_hash CHAR(64),
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_en     TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '2 hours',
    activo        BOOLEAN     NOT NULL DEFAULT true
);

-- ─── Índices ────────────────────────────────────────────────────────────────
-- Búsquedas espaciales (bbox, ST_DWithin anti-duplicado).
CREATE INDEX IF NOT EXISTS idx_reportes_ubicacion
    ON reportes USING GIST (ubicacion);

-- Filtro de expiración sólo sobre reportes activos (índice parcial).
CREATE INDEX IF NOT EXISTS idx_reportes_activos
    ON reportes (expira_en)
    WHERE activo = true;

-- ─── Restricción de severidad ───────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_severidad'
          AND conrelid = 'reportes'::regclass
    ) THEN
        ALTER TABLE reportes
            ADD CONSTRAINT chk_severidad
            CHECK (severidad IN ('baja', 'media', 'alta'));
    END IF;
END
$$;
