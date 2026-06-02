# SafeMap Tasks

Pendientes actuales. Estados: `[ ]` pendiente · `[~]` en progreso · `[x]` hecho.
**Una IA por tarea / por rama.** Reparto y entornos en `docs/AI_TEAM.md`.
Formato: `[estado] descripción — 👤 Dueño · 🌿 rama · 🔗 depende de`.

## Infra y proceso
- [x] Inicializar Git y primer commit de la base de contexto.
- [x] Conectar remoto GitHub (`bitrix11/SafeMap`) y push de `main`.
- [x] Definir convención de ramas (`feature/*`) y flujo de PR. — ver `AI_TEAM.md`
- [ ] Proteger `main` en GitHub (requerir PR + 1 revisión). — 👤 tú · web GitHub
- [x] Definir categorías/severidad definitivas (v1: zona_oscura, robo,
      sospechoso). — ver `DECISIONS.md`

## Frontend
> Orden recomendado: el refactor modular va PRIMERO; el resto parte de esa base.

- [x] **Base modular**: scaffold funcional generado desde cero (`index.html`,
      `styles.css`, `config.js`, `reports.js`, `map.js`, `geolocation.js`,
      `ui.js`, `app.js`). Las demás features parten de aquí. — Claude (Cowork)
- [x] Marcador de usuario dinámico (círculo de precisión + interpolación).
      — 👤 Gemini · 🌿 `feature/geolocation-marker` · 🔗 refactor-modular
- [ ] Filtros superiores por categoría, con estado persistente.
      — 👤 Codex · 🌿 `feature/report-filters` · 🔗 refactor-modular
- [x] Clustering con Leaflet.markercluster.
      — 👤 Codex · 🌿 `feature/map-clustering` · 🔗 refactor-modular
- [x] Bottom sheet deslizable con safe areas iOS.
      — 👤 Gemini · 🌿 `feature/ui-bottom-sheet` · 🔗 refactor-modular
- [ ] Probar en iOS Safari y Android Chrome físicos. — 👤 tú + Antigravity (QA)

## Backend
- [ ] Implementar esquema PostgreSQL + PostGIS (ver `DATA_MODEL.md`).
      — 👤 Claude Code · 🌿 `feature/backend-schema`
- [ ] `POST /api/reportes` con validación y anti-duplicado.
      — 👤 Claude Code · 🌿 `feature/backend-post` · 🔗 backend-schema
- [ ] `GET /api/reportes` por bbox + ofuscación espacial.
      — 👤 Claude Code · 🌿 `feature/backend-get` · 🔗 backend-schema
- [ ] Caducidad: filtro lógico + purga `pg_cron`. — 👤 Claude Code · 🔗 backend-schema
- [ ] WebSocket `/ws/reportes` para tiempo real (futuro). — 👤 Claude Code

## Pruebas
- [ ] Suite de QA / pruebas manuales documentadas.
      — 👤 Antigravity · 🌿 `feature/test-qa`

## Datos y privacidad
- [ ] Confirmar categorías y severidad definitivas. — 👤 tú
- [ ] Implementar `reporter_hash` rotado (HMAC) y rate-limiting.
      — 👤 Claude Code · 🔗 backend-schema
- [ ] Capa de migración para reportes existentes en `localStorage`.
      — 👤 Codex · 🔗 refactor-modular

---

## Prompt de arranque (pegar al iniciar sesión con cualquier IA)

```txt
Estamos trabajando en SafeMap.

Antes de responder o modificar código, lee estos archivos del repo:
- AGENTS.md
- docs/PROJECT_BRIEF.md
- docs/ARCHITECTURE.md
- docs/UI_UX_GUIDELINES.md
- docs/DATA_MODEL.md
- docs/DECISIONS.md
- docs/TASKS.md
- docs/HANDOFF_LOG.md

Tu tarea debe respetar las decisiones existentes.
No cambies el stack sin aprobación. No migres a frameworks.
No elimines funcionalidad existente. No inventes APIs que aún no existen.
Si necesitas asumir algo, escríbelo claramente.

Al terminar:
1. Resume qué cambiaste.
2. Lista archivos modificados.
3. Explica cómo probarlo.
4. Actualiza docs/HANDOFF_LOG.md.
5. Agrega pendientes a docs/TASKS.md si aplica.
```
