# SafeMap Data Model

Define cómo se representan los reportes en el frontend (localStorage) y en el
backend (PostgreSQL + PostGIS), y el contrato de la API.

## Categorías

| codigo        | label              | color_hex | severidad por defecto |
|---------------|--------------------|-----------|-----------------------|
| `zona_oscura` | Zona oscura        | `#FFB300` | media                 |
| `robo`        | Robo / incidente   | `#E53935` | alta                  |
| `sospechoso`  | Actividad sospechosa | `#8E24AA` | media               |

Severidad: `baja` | `media` | `alta`. (Mantener este vocabulario fijo.)

## Reporte — formato frontend (localStorage)

Clave `localStorage`: `safemap.reportes` → array JSON.

```json
{
  "id": "uuid-v4",
  "categoria": "robo",
  "severidad": "alta",
  "lat": 19.4326,
  "lng": -99.1332,
  "descripcion": "texto opcional <= 280",
  "creado_en": "2026-05-31T20:15:00Z",
  "expira_en": "2026-05-31T22:15:00Z"
}
```

> **No romper este formato sin migración.** Si se agregan campos, mantener los
> existentes y versionar (ej. `safemap.schemaVersion`).

## Reporte — esquema backend (PostgreSQL + PostGIS)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE categorias (
    id        SMALLINT PRIMARY KEY,
    codigo    VARCHAR(30) UNIQUE NOT NULL,   -- 'zona_oscura','robo','sospechoso'
    label     VARCHAR(80) NOT NULL,
    color_hex CHAR(7)
);

CREATE TABLE reportes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id  SMALLINT NOT NULL REFERENCES categorias(id),
    severidad     VARCHAR(10) NOT NULL DEFAULT 'media',
    -- GEOGRAPHY (no GEOMETRY): opera en metros sobre el elipsoide.
    ubicacion     GEOGRAPHY(Point, 4326) NOT NULL,
    descripcion   VARCHAR(280),
    reporter_hash CHAR(64),               -- hash rotado por ventana, anti-spam
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_en     TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '2 hours',
    activo        BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_reportes_ubicacion ON reportes USING GIST (ubicacion);
CREATE INDEX idx_reportes_activos ON reportes (expira_en) WHERE activo = true;
```

**Por qué `GEOGRAPHY` y no `GEOMETRY`:** distancias reales en metros sin
reproyectar. `ST_DWithin(ubicacion, punto, 500)` = "a 500 m". Con
`GEOMETRY(4326)` las distancias salen en grados.

## Contrato de API

### POST /api/reportes

Request:
```json
{ "categoria": "robo", "lat": 19.43, "lng": -99.13, "descripcion": "opcional" }
```
- Validación: `lat ∈ [-90,90]`, `lng ∈ [-180,180]`, `descripcion ≤ 280`.
- Anti-duplicado: rechaza (409) si ya hay reporte de la misma categoría a <50 m
  y aún activo.
- Respuesta 201: `{ "id": "...", "expira_en": "..." }`

### GET /api/reportes

Query params: `min_lat`, `min_lng`, `max_lat`, `max_lng`, `categoria` (opcional).
- Devuelve solo reportes con `expira_en > now()` dentro del bbox.
- `LIMIT 500`. Rechaza (400) bbox > ~0.5° de lado.
- Respuesta: array de
  `{ id, categoria, lat, lng, descripcion, creado_en, expira_en }`.
- **Privacidad:** `lat`/`lng` ofuscados (snap a grilla ~100 m) y `creado_en`
  redondeado a 5–10 min antes de enviarse.

## Caducidad

Todo reporte expira **2 h** tras crearse. Capa lógica (filtro en GET) +
capa física (purga por `pg_cron`/worker). Ver `ARCHITECTURE.md`.
