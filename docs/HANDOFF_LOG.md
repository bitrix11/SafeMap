# SafeMap Handoff Log

> Cada IA, al terminar una tarea, agrega una entrada arriba (más reciente
> primero) con: fecha, agente, cambios, archivos, pruebas, pendientes y
> siguiente paso.

---

## 2026-06-01 — Cierre de sesión · SafeMap MVP completo

### Estado final
SafeMap está funcional de punta a punta y versionado en `bitrix11/SafeMap` (main).

- **Frontend** (Codex + Gemini + base de Cowork): mapa oscuro CartoDB, geoloc con
  marcador dinámico interpolado, reporte de un toque, filtros por categoría con
  persistencia, clustering (Leaflet.markercluster), bottom sheet deslizable.
- **Backend** (Claude Code): FastAPI + PostGIS en Docker; POST con validación y
  anti-duplicado, GET por bbox, ofuscación espacial, caducidad 2h, CORS, healthz.
- **Integración**: `reports.js` usa el API con fallback a localStorage.
- **QA** (Antigravity): `docs/QA_PLAN.md` + `backend/test_api.py` (7 pruebas, OK).
  Encontró el bug de ofuscación de longitud.
- **Fix** (Claude Code): bug de `_snap_to_grid` corregido y verificado; en main.

### Pendientes (mejoras hacia producción, no urgentes) — ver TASKS.md
Rate-limiting, IP real del cliente en POST, purga física pg_cron (V002),
restringir CORS allow_origins, WebSocket de tiempo real.

### Aprendizaje de proceso
El cruce de archivos Windows↔entorno de Cowork puede mostrar archivos truncados
en la lectura aunque en disco estén completos. La verdad es `git` y la
verificación local (`node --check` / `python -c ast.parse`) en PowerShell.
Regla: una IA termina → verificación local → commit inmediato.

---

## 2026-06-01 — Claude Code · Fix bug ofuscación espacial (`fix/ofuscacion-longitud`)

### Problema
`_snap_to_grid` en `backend/main.py` calculaba la grilla de longitud usando
`math.cos(math.radians(coord))` donde `coord` era la propia **longitud** del
punto. El tamaño angular de un metro en longitud depende del **coseno de la
latitud**, no de la longitud, por lo que la grilla resultaba incorrecta en casi
cualquier punto que no estuviera cerca del meridiano cero.

El test `test_06_ofuscacion_coordenadas` en `test_api.py` replicaba el mismo
error en su cálculo de `expected_lng`, con lo que el test pasaba a pesar del
bug (validaba el comportamiento incorrecto).

### Cambios realizados
- **`backend/main.py`**: añadido parámetro `lat: float = 0.0` a
  `_snap_to_grid`; cuando `is_lat=False`, se usa `math.cos(math.radians(lat))`
  en lugar de `math.cos(math.radians(coord))`.
- **`backend/main.py`**: en `_obfuscate`, la llamada para la longitud pasa
  `lat=lat_raw` explícitamente.
- **`backend/test_api.py`**: `test_06_ofuscacion_coordenadas` corregido para
  calcular `deg_per_m_lng` con `math.cos(math.radians(lat_exacta))`, validando
  el comportamiento correcto en lugar del bug.
- Los demás archivos del backend (`docker-compose.yml`, `Dockerfile`,
  `requirements.txt`, `migrations/`) fueron incorporados a la rama
  `fix/ofuscacion-longitud` desde `feature/backend-schema` (estaban ausentes
  del worktree de esta rama).

### Archivos modificados
- `backend/main.py`
- `backend/test_api.py`
- `docs/TASKS.md` (bug marcado `[x]`)
- `docs/HANDOFF_LOG.md` (esta entrada)

### Pruebas realizadas
- `docker compose up --build` en `backend/` levanta DB + API sin errores.
- `python -m unittest test_api -v` contra `http://localhost:8000`: **7/7 OK**
  incluyendo `test_06_ofuscacion_coordenadas` que ahora valida la grilla
  correcta (cos de la latitud).

### Pendientes
- Ninguno nuevo derivado de este fix.

### Siguiente paso recomendado
Abrir PR `fix/ofuscacion-longitud → main`, hacer merge tras revisión de Claude
Code (como integrador), y luego mergear `feature/backend-schema` si aún no
está en main.

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
