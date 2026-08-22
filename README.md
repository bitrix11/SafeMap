# SafeMap
ESTE PROYECTO FUE HECHO EN UN HACKATON TIENE CIERTOS BUGS
App web móvil de alertas de seguridad urbana y comunitaria en tiempo real.
Un mapa interactivo donde los usuarios generan "reportes de un solo toque"
sobre situaciones de riesgo en su ubicación (zonas oscuras, robos/incidentes,
actividad sospechosa). 

## Estructura del repo

```
/                     # raíz del proyecto SafeMap
  AGENTS.md           # instrucciones base para TODOS los agentes de IA
  CLAUDE.md           # apuntador para Claude → lee AGENTS.md
  GEMINI.md           # apuntador para Gemini → lee AGENTS.md
  README.md           # este archivo
  /docs
    PROJECT_BRIEF.md      # qué es SafeMap, objetivo, usuarios, alcance
    ARCHITECTURE.md       # estructura técnica frontend + backend futuro
    UI_UX_GUIDELINES.md   # reglas visuales, mobile-first, dark map, bottom sheet
    DATA_MODEL.md         # modelo de reportes, categorías, severidad, ubicación
    DECISIONS.md          # decisiones tomadas y su justificación (ADR ligero)
    HANDOFF_LOG.md        # bitácora: qué hizo cada IA y qué falta
    TASKS.md              # pendientes actuales
```

## Coordinación multi-IA (fuente única de verdad)

Todas las IAs (ChatGPT/Codex, Claude, Gemini, Antigravity) leen los mismos
archivos del repo. No "recuerdan" entre sí: **el repo manda, la IA obedece.**

Antes de pedir cambios a cualquier IA, pega el prompt de arranque que está al
final de `AGENTS.md` / en `docs/TASKS.md`. Al terminar, la IA actualiza
`docs/HANDOFF_LOG.md` y `docs/TASKS.md`, y se hace commit antes de pasar el
trabajo a la siguiente IA.

## Stack actual

HTML5 · CSS moderno · JavaScript vanilla · Leaflet.js · CartoDB Dark ·
`navigator.geolocation.watchPosition` · `localStorage`.

## Estado

Prototipo frontend funcional. Backend (PostgreSQL + PostGIS + FastAPI)
diseñado y documentado en `docs/ARCHITECTURE.md` y `docs/DATA_MODEL.md`,
pendiente de implementación.
