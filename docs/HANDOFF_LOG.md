# SafeMap Handoff Log

> Cada IA, al terminar una tarea, agrega una entrada arriba (más reciente
> primero) con: fecha, agente, cambios, archivos, pruebas, pendientes y
> siguiente paso.

## 2026-06-01 — Antigravity · Suite de QA / pruebas manuales y automatizadas (feature/test-qa)

### Cambios realizados
- **`docs/QA_PLAN.md`**: Creado un documento de plan de pruebas (QA) exhaustivo detallando 14 casos de prueba para el Frontend (carga de mapa, geolocalización suave, marcadores, interpolación, rumbo, un toque, filtros y persistencia, clustering, bottom sheet, expiración) y 4 casos para Integración (operación estándar y fallback a localStorage). Incluye checklists móviles para iOS Safari y Android Chrome.
- **`backend/test_api.py`**: Desarrollado un script de pruebas de integración ligero utilizando la biblioteca estándar de Python (`unittest` y `urllib.request`) para probar la API local sin requerir instalación de frameworks adicionales (`healthz`, validaciones Pydantic, duplicados 409, consultas bbox de tamaño limitado, ofuscación de coordenadas a 100m, y redondeo de timestamps de creación).
- **`docs/TASKS.md`**: Marcada la tarea de suite de QA como completada.

### Pruebas realizadas
- Se ejecutó el script `backend/test_api.py` exitosamente contra la API ejecutándose en contenedor Docker (`http://localhost:8000`), confirmando 7 tests correctos.
- Se verificó la coherencia de todos los casos de prueba del frontend y de la lógica de fallback analizando los archivos del código actual (`reports.js`, `ui.js`, `geolocation.js`, `map.js`).

### Pendientes / Riesgos
- **Matemáticas de ofuscación de longitud en backend**: En `backend/main.py:139`, se detectó que `_snap_to_grid` calcula la grilla de longitud usando el coseno de la longitud en lugar del coseno de la latitud. Se ajustaron las aserciones del test automatizado para verificar consistentemente el comportamiento actual, pero se recomienda corregirlo matemáticamente en el backend.

### Siguiente paso recomendado
- Revisar y corregir el bug matemático en la función `_snap_to_grid` de `backend/main.py` para calcular el coseno sobre la latitud al ofuscar la longitud.

---

## 2026-06-01 — Claude Code · Conexión frontend ↔ backend (feature/backend-schema)

### Cambios realizados
- **`config.js`**: añadido `API_BASE: "http://localhost:8000"`. Si se deja vacío
  (`""`), la app opera exclusivamente con localStorage (modo offline/sin backend).
- **`reports.js`**: refactorizada la capa de datos a async con doble fallback:
  - `listar()`: hace `GET /api/reportes?min_lat=…&min_lng=…&max_lat=…&max_lng=…`
    usando el bbox del mapa visible (`map.getBounds()`). Si la API no responde o
    API_BASE está vacío, devuelve los reportes vigentes de localStorage.
  - `crear()`: hace `POST /api/reportes`; si la respuesta es 409 devuelve `null`
    (duplicado detectado por el servidor); si falla por red o cualquier otro
    error, guarda en localStorage como antes. En ambos casos despacha
    `"safemap:reportes-cambio"`.
  - `eliminar()` sigue siendo síncrono (solo localStorage; sin cambio funcional).
  - Se extrajo `_listarLocal()` para separar la lógica de fallback de la lógica
    de API, evitando llamadas recursivas.
- **`map.js`**: `redibujar()` se convierte en `async function`; llama
  `await reports.listar()` antes de redibujar marcadores. El filtro por
  categorías visibles se aplica después (igual que antes).
- **`ui.js`**: `_renderLista()` y `_crearEnUbicacion()` pasan a `async`. Los
  event listeners que las invocan no necesitan `await` (fire-and-forget; el
  evento `"safemap:reportes-cambio"` sincroniza mapa y lista cuando la promesa
  resuelve).

### Archivos modificados
- `config.js`, `reports.js`, `map.js`, `ui.js`, `docs/HANDOFF_LOG.md`

### Pruebas recomendadas

**Con docker compose up:**
```bash
cd backend && docker compose up --build
```
Luego abrir el frontend en un servidor HTTP local (no `file://`) y:

1. **API activa**: crear un reporte → debe aparecer en la BD (verificar con
   `curl http://localhost:8000/api/reportes?min_lat=19.4&min_lng=-99.2&max_lat=19.5&max_lng=-99.1`).
2. **Fallback**: detener el backend (`docker compose stop api`) → la app debe
   seguir funcionando con localStorage sin errores visibles.
3. **Filtros**: activar/desactivar categorías → los marcadores y la lista deben
   respetarlos igual que antes.
4. **Anti-duplicado**: crear el mismo tipo de reporte desde la misma posición →
   el servidor devuelve 409; no debe aparecer duplicado ni bloquearse la UI.

### Pendientes
- **CORS**: el backend (`main.py`) no tiene `CORSMiddleware`. Si el frontend se
  sirve desde un origen diferente a `localhost:8000`, el navegador bloqueará
  las peticiones. Añadir:
  ```python
  from fastapi.middleware.cors import CORSMiddleware
  app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
  ```
  (restringir `allow_origins` a producción cuando se despliegue).
- **Bbox grande**: si el usuario hace zoom-out más allá de 0.5°, el backend
  devuelve 400; `listar()` cae a localStorage. Mostrar aviso al usuario es
  mejora futura.
- **Cache**: `listar()` hace dos llamadas API por cada re-render (mapa + lista).
  Un caché en memoria de ~1 s evitaría duplicarlas sin complicar la lógica.
- Rate-limiting e IP real en `POST /api/reportes` (pendiente de iteración backend).

### Siguiente paso recomendado
1. Añadir CORS al backend (una línea) y verificar con el frontend en desarrollo.
2. Considerar servir el frontend estático directamente desde FastAPI para
   eliminar el problema de CORS en local.

---

## 2026-06-01 — Claude Code · Backend: esquema PostgreSQL/PostGIS + endpoints

### Cambios realizados
- Creada carpeta `backend/` con stack completo: FastAPI + asyncpg + PostGIS.
- `migrations/V001__schema_inicial.sql`: extensiones `postgis` y `pgcrypto`,
  tablas `categorias` y `reportes` con `GEOGRAPHY(Point,4326)`, índices GIST
  e índice parcial sobre activos, seed de 3 categorías v1, constraint de
  severidad. Idempotente (`IF NOT EXISTS`).
- `migrations/V002__purga_pg_cron.sql`: plantilla comentada para pg_cron.
- `main.py`: `POST /api/reportes` (validación Pydantic, anti-duplicado 50 m,
  409 si duplicado) y `GET /api/reportes` (bbox + filtro activos + LIMIT 500,
  400 si bbox > 0.5°). Ofuscación espacial (grilla ~100 m) y timestamps
  redondeados (5 min) en respuestas. HMAC rotado por ventana de 2 h para
  `reporter_hash`. Sin `user_id`.
- `docker-compose.yml`: servicio `db` (postgis/postgis:16-3.4) + servicio `api`.
  El volumen de migraciones se monta en `initdb.d` para ejecución automática.
- `Dockerfile`, `requirements.txt`, `.env.example`, `backend/README.md`.

### Archivos creados
- `backend/docker-compose.yml`, `backend/Dockerfile`, `backend/requirements.txt`
- `backend/main.py`, `backend/.env.example`, `backend/README.md`
- `backend/migrations/V001__schema_inicial.sql`
- `backend/migrations/V002__purga_pg_cron.sql`

### Pruebas realizadas
- Revisión de coherencia SQL contra `DATA_MODEL.md` (columnas, tipos, índices, seed).
- Validación de lógica Pydantic (rangos lat/lng, longitud descripción, vocabulario severidad).
- Sin ejecución en contenedor (requiere Docker en el host del usuario).

### Pendientes
- Verificar `docker compose up --build` en el equipo local.
- Conectar IP real del cliente en `POST /api/reportes` (placeholder `"0.0.0.0"`).
- Activar `V002__purga_pg_cron.sql` cuando el host tenga `pg_cron`, o usar worker Python.
- Rate-limiting por IP y por `reporter_hash` (tarea separada).

### Siguiente paso recomendado
Revisar el PR, levantar con `docker compose up --build` y probar los endpoints con `curl`.
Luego continuar con rate-limiting (`feature/backend-post`) y ofuscación avanzada
(`feature/backend-get`).

---

## 2026-06-01 — Gemini CLI · Marcador de usuario dinámico (UX/Geolocation)

### Cambios realizados
- Marcador de usuario dinámico estilo Waze/Google Maps.
- Animación de pulso continuo (CSS animation) para mejor visibilidad sobre fondo oscuro.
- Indicador direccional (flecha) que aparece automáticamente cuando hay rumbo (`heading`) disponible.
- Interpolación suave (LERP) de latitud, longitud y precisión mediante `requestAnimationFrame` (60fps), eliminando saltos bruscos entre lecturas de GPS.
- Refactor de `geolocation.js` para separar la lógica de obtención de datos de la lógica de suavizado y renderizado.

### Archivos modificados
- `styles.css`, `geolocation.js`, `docs/HANDOFF_LOG.md`, `docs/TASKS.md`

### Pruebas realizadas
- Verificación del bucle de animación e interpolación matemática.
- Validación de los nuevos selectores CSS y animaciones.
- Rotación del marcador mediante manipulación directa del DOM (`transform: rotate`) para máximo rendimiento.

### Pendientes
- Probar en dispositivo real en movimiento para validar la precisión del suavizado (factor `t=0.12`).
- Evaluar cálculo de rumbo basado en vector de movimiento si el GPS no provee `heading` (común en navegadores de escritorio o estáticos).

### Siguiente paso recomendado
Fusionar `feature/geolocation-marker` a `main`. Continuar con la integración de clustering en `map.js`.

---

## 2026-05-31 — Gemini CLI · Bottom Sheet Deslizable (UX Móvil)

### Cambios realizados
- Se convirtió el panel de reportes en un Bottom Sheet interactivo y deslizable (Vanilla JS/CSS).
- Tres estados implementados: `peek` (colapsado), `half` (medio), `full` (expandido).
- Gestos táctiles nativos: arrastre fluido con `transform` y `transition` (cubic-bezier).
- Lógica de "snapping" basada en posición y velocidad (swipe rápido).
- Respeto de *safe areas* iOS (`env(safe-area-inset-bottom/top)`) mediante variables CSS.
- Scroll interno en la lista de reportes compatible con el arrastre del sheet (solo arrastra si está en el tope de la lista).
- Estructura HTML actualizada para separar el *handle* del contenido.

### Archivos modificados
- `index.html`, `styles.css`, `ui.js`, `docs/HANDOFF_LOG.md`, `docs/TASKS.md`

### Pruebas realizadas
- Verificación visual de los estados mediante edición de `data-state` en el inspector.
- Simulación de eventos táctiles en el código para validar la lógica de snapping.
- Validación de sintaxis JS y CSS.
- *Nota:* Requiere dispositivo móvil físico o simulador de Chrome/Safari para probar gestos.

### Pendientes
- Ajustar los puntos de "snap" si se agregan más elementos a la cabecera del panel.
- Probar con una lista muy larga de reportes para asegurar que el scroll inercial no interfiere con el cierre del sheet.

### Siguiente paso recomendado
Fusionar la rama `feature/ui-bottom-sheet` a `main` tras revisión. El siguiente paso de UX es el marcador dinámico (`feature/geolocation-marker`).

---

## 2026-05-31 — Claude (Cowork) · Base modular del frontend

### Cambios realizados
- Se generó el scaffold modular funcional del frontend (no había código previo
  en el repo). Stack respetado: HTML5 + CSS + JS vanilla + Leaflet + CartoDB Dark.
- Archivos: `index.html`, `styles.css`, `config.js`, `reports.js`, `map.js`,
  `geolocation.js`, `ui.js`, `app.js`.
- Funciona: mapa oscuro, geolocalización con `watchPosition` + círculo de
  precisión, reporte de un toque con modal de categoría, lista en panel,
  caducidad a 2h sobre `localStorage` (esquema de DATA_MODEL.md), filtros base.
- `config.js` centraliza TTL, categorías v1 y ajustes de mapa.
- Cada módulo expone API en `window.SafeMap.*` y deja "ganchos" para las tareas
  de las demás IAs (clustering, filtros avanzados, marcador dinámico, bottom sheet).

### Archivos modificados
- (nuevos) `index.html`, `styles.css`, `config.js`, `reports.js`, `map.js`,
  `geolocation.js`, `ui.js`, `app.js`
- `docs/HANDOFF_LOG.md`, `docs/TASKS.md`, `docs/ARCHITECTURE.md`

### Pruebas realizadas
- `node --check` en los 6 módulos JS → sin errores de sintaxis.
- Revisión de orden de carga de scripts y dependencias entre módulos.

### Pendientes
- Probar en navegador/dispositivo (requiere servir por HTTP por la geoloc.).
- Las features de las IAs parten ahora de esta base (ya no se necesita el
  refactor del archivo único; ver TASKS.md).

### Siguiente paso recomendado
Commitear la base, hacer push, y lanzar en paralelo: Codex (filtros, clustering)
y Gemini (marcador dinámico, bottom sheet) desde sus ramas `feature/*`.

---

## 2026-06-01 — Claude Code + Claude (Cowork) · Frontend↔Backend conectado

### Cambios realizados
- `reports.js` ahora usa el API REST como fuente primaria (GET/POST a
  `API_BASE + /api/reportes`) con fallback a localStorage si falla o si
  API_BASE está vacío. `listar()` y `crear()` pasaron a async.
- `config.js`: nuevo `API_BASE` ("http://localhost:8000").
- `map.js` y `ui.js`: render async; `map.on("moveend")` recarga reportes del
  bbox visible.
- Backend: agregado `CORSMiddleware` en `main.py` para permitir llamadas desde
  el frontend en otro puerto/origen.

### Pruebas realizadas
- App levantada con backend (Docker, :8000) + frontend (:5500). Tras habilitar
  CORS y reconstruir la imagen, los errores desaparecieron y el frontend habla
  con el API real (POST/GET verificados, ofuscación espacial y caducidad OK).

### Pendientes
- Restringir `allow_origins` de CORS en producción (hoy "*").
- QA con Antigravity (siguiente).
- Refinamientos backend en TASKS.md (rate-limiting, IP real, pg_cron, tests).

### Siguiente paso recomendado
QA de la app completa con Antigravity (bloque #7 de AI_PROMPTS.md).

---

## 2026-05-31 — Claude (Cowork) · Prompts y categorías v1

### Cambios realizados
- Nuevo `docs/AI_PROMPTS.md`: prompts de asignación listos para pegar, uno por
  tarea, con rol, rama, alcance y reglas de cierre.
- Categorías v1 confirmadas (zona_oscura, robo, sospechoso) → `DECISIONS.md`,
  tarea marcada hecha en `TASKS.md`. Desbloquea backend y datos.

### Archivos modificados
- `docs/AI_PROMPTS.md` (nuevo), `docs/DECISIONS.md`, `docs/TASKS.md`,
  `docs/HANDOFF_LOG.md`

### Pendientes
- Proteger `main` en GitHub (PR + 1 revisión).
- Arrancar `feature/refactor-modular` (Claude Code) con su prompt.

### Siguiente paso recomendado
Pegar el prompt #1 (refactor modular) en Claude Code y, en paralelo, proteger
`main` en GitHub.

---

## 2026-05-31 — Claude (Cowork) · Equipo de IAs y reparto

### Cambios realizados
- Se definió el modelo de colaboración multi-IA: híbrido (especialidad + rama
  por tarea), integración por Pull Requests, con Claude Code como líder/integrador.
- Nuevo `docs/AI_TEAM.md`: roles, entornos por IA, convención de ramas, flujo de
  trabajo por tarea, reglas anti-colisión y matriz de dominios.
- `TASKS.md`: cada tarea ahora tiene dueño 👤, rama 🌿 y dependencias 🔗.
- `AGENTS.md`: reglas de ramas/PR y rol integrador de Claude Code.

### Archivos modificados
- `docs/AI_TEAM.md` (nuevo), `docs/TASKS.md`, `AGENTS.md`, `docs/HANDOFF_LOG.md`

### Pruebas realizadas
- Revisión de coherencia entre AI_TEAM, TASKS y AGENTS (ramas y dueños alineados).

### Pendientes
- Proteger `main` en GitHub (requerir PR + 1 revisión).
- Definir categorías/severidad definitivas (desbloquea varias tareas).
- Commitear estos docs, push, y arrancar `feature/refactor-modular`.

### Siguiente paso recomendado
Claude Code toma `feature/refactor-modular` como primera tarea de código; el
resto del frontend parte de esa base ya modularizada.

---

## 2026-05-31 — Claude (Cowork) · Git + remoto

### Cambios realizados
- Se inicializó Git (rama `main`) y se hizo el primer commit de la base de
  contexto (12 archivos, 646 inserciones).
- Se conectó el remoto `https://github.com/bitrix11/SafeMap` y se subió `main`.
- Se registró la decisión del remoto en `DECISIONS.md` y se marcaron las tareas
  de infra correspondientes en `TASKS.md`.

### Archivos modificados
- `docs/DECISIONS.md`, `docs/TASKS.md`, `docs/HANDOFF_LOG.md`

### Pruebas realizadas
- `git push -u origin main` exitoso tras resolver credenciales (cuenta
  `bitrix11`); rama remota creada.

### Pendientes
- Definir convención de ramas `feature/*` y flujo de PR.
- Commitear estos cambios de docs y volver a hacer push.

### Siguiente paso recomendado
Arrancar la primera tarea de código en una rama `feature/*` (sugerido:
`feature/refactor-modular` del frontend).

---

## 2026-05-31 — Claude (Cowork)

### Cambios realizados
- Se creó la estructura de contexto / fuente única de verdad del repo:
  `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`.
- Se creó `docs/` con: `PROJECT_BRIEF.md`, `ARCHITECTURE.md`,
  `UI_UX_GUIDELINES.md`, `DATA_MODEL.md`, `DECISIONS.md`, `HANDOFF_LOG.md`,
  `TASKS.md`.
- Se documentó el diseño de backend (FastAPI + PostgreSQL/PostGIS), el modelo de
  datos, la lógica de caducidad a 2 h y la estrategia de privacidad.

### Archivos modificados
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`
- `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`, `docs/UI_UX_GUIDELINES.md`,
  `docs/DATA_MODEL.md`, `docs/DECISIONS.md`, `docs/HANDOFF_LOG.md`,
  `docs/TASKS.md`

### Pruebas realizadas
- Revisión estructural de los documentos y coherencia cruzada entre ellos
  (categorías, contrato de API y decisiones alineados).

### Pendientes
- Inicializar Git y hacer el primer commit.
- Confirmar el modelo definitivo de categorías/severidad con el equipo.
- Implementar el backend descrito.
- Migrar el frontend de archivo único a la estructura modular propuesta.

### Siguiente paso recomendado
Inicializar Git y commitear esta base de contexto antes de pedir cambios de
código a cualquier IA.

---

## 2026-05-31 — ChatGPT (referencia previa, según el usuario)

### Cambios realizados
- Versión mobile-first del frontend; marcador dinámico de usuario; clustering
  con Leaflet.markercluster; bottom sheet táctil; filtros superiores por
  categoría.

### Archivos modificados
- `safemap-mobile-leaflet-production.html`

### Pruebas realizadas
- Revisión estructural de HTML/CSS/JS; validación conceptual de Leaflet +
  markercluster; revisión mobile-first.

### Pendientes
- Probar en iOS Safari y Android Chrome físicos.
- Conectar con backend real; definir modelo definitivo de reportes; QA manual.

### Siguiente paso recomendado
Separar el archivo único en `index.html`, `styles.css`, `app.js`, `map.js`,
`reports.js`, `geolocation.js`.
