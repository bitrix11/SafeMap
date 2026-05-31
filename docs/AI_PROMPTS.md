# SafeMap — Prompts de asignación por tarea

Copia/pega el bloque correspondiente en la IA dueña de la tarea. Cada prompt ya
incluye rol, rama, alcance y reglas de cierre. **Antes de pegar, asegúrate de
estar en `main` actualizado** (`git checkout main && git pull`).

> Preámbulo común (ya incluido en cada prompt): leer `AGENTS.md` + `docs/*`,
> respetar decisiones, no cambiar stack, una rama por tarea, abrir PR a `main`
> y actualizar `HANDOFF_LOG.md` + `TASKS.md` al terminar.

---

## 1. Claude Code — `feature/refactor-modular` (PRIMERA, bloquea al resto)

```txt
Estamos trabajando en SafeMap. Lee primero AGENTS.md y docs/* (PROJECT_BRIEF,
ARCHITECTURE, UI_UX_GUIDELINES, DATA_MODEL, DECISIONS, TASKS, HANDOFF_LOG, AI_TEAM).

Rol: líder técnico / integrador.
Rama: feature/refactor-modular (créala desde main actualizado).

Tarea: separar el frontend de archivo único en módulos, SIN cambiar
funcionalidad ni stack (HTML5 + CSS + JS vanilla + Leaflet + CartoDB Dark):
- index.html
- styles.css
- app.js          (arranque, estado global)
- map.js          (init Leaflet, capas)
- reports.js      (CRUD reportes + capa localStorage)
- geolocation.js  (watchPosition, marcador usuario)
- ui.js           (interacciones, panel)

Requisitos:
- No romper el formato de localStorage (ver DATA_MODEL.md).
- Mantener comportamiento idéntico al actual; esto es solo refactor estructural.
- Comentarios breves por módulo.

Al terminar: resume cambios, lista archivos, explica cómo probar (abrir
index.html en móvil/responsive), actualiza HANDOFF_LOG.md y TASKS.md, commitea
en la rama y abre un PR a main.
```

---

## 2. Gemini — `feature/geolocation-marker` (tras el refactor)

```txt
Estamos trabajando en SafeMap. Lee AGENTS.md y docs/* (incluye UI_UX_GUIDELINES
y AI_TEAM). Parte de main actualizado, que ya incluye el refactor modular.

Rol: frontend/UX. Rama: feature/geolocation-marker.

Tarea: marcador de usuario dinámico estilo Waze/Google Maps en geolocation.js:
- Indicador direccional/animado en vez de círculo estático.
- Círculo de precisión (accuracy) alrededor del punto.
- Interpolación suave entre lecturas de watchPosition (usar requestAnimationFrame).

Requisitos: mobile-first, fluido en iOS Safari y Android Chrome, sin frameworks.
No toques reports.js ni map.js salvo lo imprescindible para el marcador.

Al terminar: resume, lista archivos, explica cómo probar, actualiza
HANDOFF_LOG.md y TASKS.md, commitea y abre PR a main.
```

---

## 3. Codex — `feature/report-filters` (tras el refactor)

```txt
Estamos trabajando en SafeMap. Lee AGENTS.md y docs/* (UI_UX_GUIDELINES,
DATA_MODEL, AI_TEAM). Parte de main actualizado (ya con refactor modular).

Rol: frontend builder. Rama: feature/report-filters.

Tarea: menú flotante superior de filtros por categoría:
- Categorías: zona_oscura, robo, sospechoso (ver DATA_MODEL.md; usa sus colores).
- Alternar visibilidad: solo una, combinaciones, o todas.
- Estado activo visible y persistente (localStorage, sin romper el esquema).
- Responsive, estética coherente con el mapa oscuro.

No toques geolocation.js. Coordina con clustering (otra rama) evitando editar
los mismos bloques de map.js; si hay solape, decláralo en el PR.

Al terminar: resume, lista archivos, cómo probar, actualiza HANDOFF_LOG.md y
TASKS.md, commitea y abre PR a main.
```

---

## 4. Codex — `feature/map-clustering` (tras el refactor)

```txt
Estamos trabajando en SafeMap. Lee AGENTS.md y docs/*. Parte de main actualizado.

Rol: frontend builder. Rama: feature/map-clustering.

Tarea: integrar Leaflet.markercluster para agrupar pines cercanos en un
indicador numérico que se expande al hacer zoom. Debe convivir con los filtros
por categoría (al filtrar, los clusters se recalculan).

Requisitos: rendimiento con muchos reportes en una calle; sin frameworks;
cargar markercluster por CDN.

Al terminar: resume, lista archivos, cómo probar, actualiza HANDOFF_LOG.md y
TASKS.md, commitea y abre PR a main.
```

---

## 5. Gemini — `feature/ui-bottom-sheet` (tras el refactor)

```txt
Estamos trabajando en SafeMap. Lee AGENTS.md y docs/* (UI_UX_GUIDELINES, AI_TEAM).
Parte de main actualizado.

Rol: UX móvil. Rama: feature/ui-bottom-sheet.

Tarea: convertir el panel inferior de reportes en un bottom sheet deslizable:
- Estados: colapsado (peek), medio, expandido.
- Gestos táctiles nativos; arrastrar abajo oculta, arriba expande.
- Respetar safe areas iOS (env(safe-area-inset-*)).
- Scroll interno sin romper el arrastre.

Sin frameworks. Compatibilidad iOS Safari y Android Chrome.

Al terminar: resume, lista archivos, cómo probar, actualiza HANDOFF_LOG.md y
TASKS.md, commitea y abre PR a main.
```

---

## 6. Claude Code — `feature/backend-schema` (desbloquea backend)

```txt
Estamos trabajando en SafeMap. Lee AGENTS.md y docs/* (ARCHITECTURE, DATA_MODEL,
DECISIONS, AI_TEAM).

Rol: arquitecto/backend. Rama: feature/backend-schema.

Tarea: implementar el esquema PostgreSQL + PostGIS tal como está en DATA_MODEL.md
(extensiones, tablas categorias y reportes con GEOGRAPHY(Point,4326), índices
GIST y parcial). Incluye seed de categorías (zona_oscura, robo, sospechoso) y
script de migración versionado. Sin inventar campos fuera del modelo.

Al terminar: resume, lista archivos, explica cómo correr la migración, actualiza
HANDOFF_LOG.md y TASKS.md, commitea y abre PR a main.
```

---

## 7. Antigravity — `feature/test-qa`

```txt
Estamos trabajando en SafeMap (app web móvil de seguridad urbana). Lee AGENTS.md
y docs/* como contexto. Actúa agent-first: primero PLAN, luego ejecución, luego
artifacts y verificación.

Rol: QA. Rama: feature/test-qa.

Tarea: crear una suite de pruebas/QA documentada para el frontend:
- Checklist manual mobile-first (iOS Safari, Android Chrome).
- Casos: geolocalización, crear reporte, filtros, clustering, bottom sheet,
  caducidad a 2h, persistencia localStorage.
- Si aplica, pruebas automatizables ligeras (sin añadir frameworks pesados).

Entrega un plan revisable antes de ejecutar. Al terminar: artifacts de resultados,
actualiza HANDOFF_LOG.md y TASKS.md, commitea y abre PR a main.
```
