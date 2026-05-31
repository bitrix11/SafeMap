# SafeMap Architecture

## 1. Frontend (estado actual)

App estática mobile-first servida como HTML/CSS/JS.

- **Mapa:** Leaflet.js con capa oscura CartoDB Dark Matter.
- **Geolocalización:** `navigator.geolocation.watchPosition` para seguir al
  usuario; marcador dinámico que refleja posición y precisión (radio de
  exactitud).
- **Reportes:** por ahora persisten en `localStorage`. No romper este formato
  sin migración (ver `DATA_MODEL.md`).
- **Clustering:** Leaflet.markercluster para agrupar pines cercanos.
- **UI:** filtros flotantes superiores por categoría + bottom sheet inferior
  deslizable (ver `UI_UX_GUIDELINES.md`).

### Organización de código (objetivo)

El prototipo vive en un archivo único. Migración recomendada a:

```
index.html
styles.css
app.js          # arranque, estado global
map.js          # init Leaflet, capas, clustering
reports.js      # crear/leer/filtrar reportes, capa localStorage/API
geolocation.js  # watchPosition, marcador de usuario
ui.js           # bottom sheet, filtros, interacciones
```

Mantener vanilla JS (sin frameworks) salvo aprobación explícita.

## 2. Backend (diseñado, pendiente de implementar)

### Stack elegido: Python + FastAPI + PostgreSQL/PostGIS

FastAPI sobre Node/Express por: I/O async para alta concurrencia de datos GPS,
validación nativa con Pydantic (clave para coordenadas) e integración limpia con
PostGIS vía `asyncpg`.

### Componentes

- **PostgreSQL + PostGIS** — almacenamiento geográfico. Tipo `GEOGRAPHY(Point,
  4326)` para operar en metros directamente (ver `DATA_MODEL.md`).
- **Índice GIST** sobre la columna de ubicación + índice parcial sobre reportes
  activos/no expirados.
- **Caducidad en dos capas:**
  1. *Lógica:* el `GET` siempre filtra `expira_en > now()` → un reporte
     desaparece exactamente a las 2 h aunque el worker esté caído.
  2. *Física:* `pg_cron` (o worker externo) borra filas expiradas cada ~10 min.
     A gran escala, particionar por tiempo y usar `DROP PARTITION`.
- **Tiempo real (futuro):** WebSocket `/ws/reportes` que empuja reportes nuevos
  del bbox suscrito, en vez de polling.

### API REST (principal)

- `POST /api/reportes` — crea reporte; valida formato y rechaza duplicados
  cercanos recientes (mismo tipo a <50 m y aún activos → 409).
- `GET /api/reportes?min_lat&min_lng&max_lat&max_lng&categoria` — devuelve solo
  reportes activos dentro del bbox visible (no del radio), con `LIMIT 500`.
  Rechaza bbox excesivamente grandes (400).

El contrato exacto de request/response vive en `DATA_MODEL.md`. El frontend usa
`map.getBounds()` para el bbox.

### Seguridad y privacidad

Ver `DATA_MODEL.md` y `DECISIONS.md`. Resumen:

- Desacople identidad ↔ reporte: no se guarda `user_id`; `reporter_hash` rotado
  por ventana de tiempo (HMAC con secreto del servidor).
- Ofuscación espacial: guardar fino, servir grueso (snap a grilla ~100 m /
  geohash p7, o geo-jitter).
- Timestamps redondeados (5–10 min) en respuestas públicas.
- TLS obligatorio; rate-limit por IP y por `reporter_hash`.
- Retención mínima: caducidad a 2 h + borrado físico.

## 3. Flujo de datos (resumen)

```
Usuario (móvil) → watchPosition → Leaflet
   ↓ reporte de un toque
POST /api/reportes  → validación → PostGIS (GEOGRAPHY)
   ↑ GET /api/reportes (bbox)  ← filtro activos + ofuscación
Mapa renderiza marcadores + clustering
pg_cron purga reportes >2h
```
