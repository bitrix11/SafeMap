# SafeMap — Equipo de IAs, entornos y colaboración

Define quién hace qué, en qué entorno trabaja cada IA y cómo colaboran sin
pisarse. Modelo: **híbrido** (especialidad como guía + asignación por rama,
tarea a tarea). Integración: **Pull Requests** a `main`.

> Regla de oro: el repo manda. Toda IA lee `AGENTS.md` + `docs/*` antes de tocar
> código y deja handoff en `docs/HANDOFF_LOG.md` al terminar.

---

## Roles y entornos

### 🟣 Claude Code — Líder técnico / Integrador (rol principal)
- **Entorno:** Claude Code (CLI) en el repo local. Lee `CLAUDE.md`.
- **Especialidad:** arquitectura, refactors cuidadosos, trabajo multi-archivo,
  revisión de PRs y coherencia con `DECISIONS.md`.
- **Responsabilidad extra:** revisa los PR de las demás IAs antes del merge,
  resuelve conflictos y mantiene la salud del repo.
- **Ramas típicas:** `feature/refactor-*`, `feature/backend-*`, ramas de revisión.

### 🟢 ChatGPT / Codex — Frontend builder
- **Entorno:** Codex (lee `AGENTS.md`) o ChatGPT con el prompt de arranque.
- **Especialidad:** generación de código frontend en bloque, UI Leaflet,
  componentes nuevos a partir de specs claras.
- **Ramas típicas:** `feature/ui-*`, `feature/map-*`.

### 🔵 Gemini CLI — Frontend / UX y segunda opinión
- **Entorno:** Gemini CLI (lee `GEMINI.md`).
- **Especialidad:** UX móvil, pulido de CSS/interacciones, revisión cruzada de
  lo que produce Codex, accesibilidad.
- **Ramas típicas:** `feature/ux-*`, `feature/a11y-*`.

### 🟠 Antigravity — Flujos agent-first / tareas amplias
- **Entorno:** Antigravity (plataforma de agentes de Google). Dale `AGENTS.md`
  como contexto y pídele plan + artifacts + verificación al terminar.
- **Especialidad:** tareas grandes y autónomas (ej. suite de pruebas, scaffolding
  de backend) donde revisas su plan antes de ejecutar.
- **Ramas típicas:** `feature/test-*`, `feature/scaffold-*`.

---

## Convención de ramas

```
main                         # estable, protegida, solo entra vía PR
feature/<area>-<tarea>       # una IA por rama, una tarea por rama
fix/<descripcion>            # correcciones puntuales
```

Áreas: `ui`, `map`, `ux`, `a11y`, `backend`, `refactor`, `test`, `scaffold`.
Ejemplos: `feature/refactor-modular`, `feature/map-clustering`,
`feature/ui-bottom-sheet`.

## Flujo de trabajo (por tarea)

1. **Asignación:** el coordinador (tú + Claude Code) elige una tarea de
   `TASKS.md` y se la da a una IA, indicando rama y alcance.
2. **Arranque:** la IA recibe el prompt de arranque (ver `TASKS.md`) y crea/usa
   su rama `feature/*`.
3. **Trabajo:** la IA implementa solo lo de su tarea. No toca archivos de otra
   rama en curso.
4. **Cierre:** actualiza `HANDOFF_LOG.md` y `TASKS.md`, hace commit y push de su
   rama.
5. **PR:** abre un Pull Request a `main` describiendo qué cambió y cómo probar.
6. **Revisión:** Claude Code (o tú) revisa el PR contra `DECISIONS.md` y las
   guías. Se piden cambios si hace falta.
7. **Merge:** al aprobar, se mergea a `main`. La siguiente IA parte de `main`
   actualizado.

## Reglas anti-colisión

- **Una IA por rama, una tarea por rama.** Nunca dos IAs en la misma rama.
- **No editar en paralelo el mismo archivo** en dos ramas activas. Si dos tareas
  tocan lo mismo, se hacen en secuencia (una mergea antes de empezar la otra).
- **Sincronizar antes de empezar:** `git pull` de `main` antes de crear la rama.
- **Commits pequeños y descritos**, en español, con prefijo (`feat:`, `fix:`,
  `docs:`, `refactor:`, `chore:`).
- **No cambiar stack/arquitectura/modelo de datos** sin actualizar
  `DECISIONS.md` y aprobación.

## Matriz rápida (quién es dueño preferente de qué)

| Dominio                         | Dueño preferente   | Apoyo / revisión |
|---------------------------------|--------------------|------------------|
| Arquitectura, refactor, backend | Claude Code        | Antigravity      |
| Frontend / mapa (features)      | Codex              | Gemini           |
| UX móvil, CSS, accesibilidad    | Gemini             | Codex            |
| Pruebas y tareas autónomas      | Antigravity        | Claude Code      |
| Revisión de PR e integración    | Claude Code        | tú               |
