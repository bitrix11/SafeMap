# SafeMap Agent Instructions

> **Fuente única de verdad.** El repo manda, la IA obedece. Cualquier agente
> (ChatGPT/Codex, Claude, Gemini, Antigravity) debe leer estos archivos ANTES
> de responder o modificar código.

## Lectura obligatoria (en orden)

1. `docs/PROJECT_BRIEF.md`
2. `docs/ARCHITECTURE.md`
3. `docs/UI_UX_GUIDELINES.md`
4. `docs/DATA_MODEL.md`
5. `docs/DECISIONS.md`
6. `docs/TASKS.md`
7. `docs/HANDOFF_LOG.md`

## Rol del agente

Actúa como desarrollador frontend senior especializado en UI/UX móvil, mapas
interactivos y JavaScript vanilla. Para tareas de backend, actúa como arquitecto
de software senior (ver `docs/ARCHITECTURE.md`, sección Backend).

## Reglas del proyecto

- SafeMap es una app web móvil de alertas de seguridad urbana en tiempo real.
- El frontend actual usa HTML5, CSS moderno, JavaScript vanilla y Leaflet.js.
- No introducir frameworks como React, Vue o Angular salvo aprobación explícita.
- Mantener enfoque mobile-first.
- Optimizar para iOS Safari y Android Chrome.
- Priorizar accesibilidad, rendimiento y claridad visual.
- Mantener el mapa oscuro con estética moderna (CartoDB Dark).
- No romper compatibilidad con reportes guardados en `localStorage`.
- No inventar APIs que aún no existen. Si asumes algo, escríbelo claramente.
- Toda nueva lógica debe estar documentada de forma breve.

## Antes de cambiar código

1. Explica qué vas a modificar.
2. Identifica los archivos afectados.
3. Revisa si existe una decisión previa en `docs/DECISIONS.md`.
4. No dupliques funciones existentes sin justificarlo.

## Después de cambiar código

Actualiza `docs/HANDOFF_LOG.md` con:

- Fecha
- Agente usado
- Qué se cambió
- Archivos modificados
- Pruebas realizadas
- Riesgos o pendientes
- Siguiente paso recomendado

Si surgen pendientes nuevos, agrégalos a `docs/TASKS.md`.

## Regla de coordinación multi-IA

Entornos, roles y reparto de tareas están en `docs/AI_TEAM.md`. Léelo.

- **Una IA por rama, una tarea por rama.** No edites en paralelo el mismo
  archivo en dos ramas activas.
- Ramas: `feature/<area>-<tarea>` (áreas: ui, map, ux, a11y, backend, refactor,
  test, scaffold). `main` es estable y solo recibe cambios vía Pull Request.
- Antes de empezar: `git pull` de `main` y crea tu rama desde ahí.
- Al terminar: actualiza `HANDOFF_LOG.md` + `TASKS.md`, commit y push de tu
  rama, y abre un PR a `main` describiendo qué cambió y cómo probar.
- Claude Code es el integrador: revisa los PR contra `DECISIONS.md` antes del
  merge. No mergees a `main` sin revisión.
- Commits en español con prefijo: `feat:`, `fix:`, `docs:`, `refactor:`,
  `chore:`.
