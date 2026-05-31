# SafeMap Tasks

Pendientes actuales. Estados: `[ ]` pendiente · `[~]` en progreso · `[x]` hecho.
Una IA por tarea / por rama.

## Infra y proceso
- [x] Inicializar Git y primer commit de la base de contexto.
- [x] Conectar remoto GitHub (`bitrix11/SafeMap`) y push de `main`.
- [ ] Definir convención de ramas (`feature/...`) y flujo de PR.

## Frontend
- [ ] Separar el archivo único en `index.html`, `styles.css`, `app.js`,
      `map.js`, `reports.js`, `geolocation.js`. (rama `feature/refactor-modular`)
- [ ] Marcador de usuario dinámico con círculo de precisión e interpolación.
      (rama `feature/geolocation-marker`)
- [ ] Filtros superiores por categoría, con estado persistente.
      (rama `feature/report-filters`)
- [ ] Clustering con Leaflet.markercluster.
      (rama `feature/map-clustering`)
- [ ] Bottom sheet deslizable con safe areas iOS.
      (rama `feature/ui-bottom-sheet`)
- [ ] Probar en iOS Safari y Android Chrome físicos.

## Backend
- [ ] Implementar esquema PostgreSQL + PostGIS (ver `DATA_MODEL.md`).
- [ ] `POST /api/reportes` con validación y anti-duplicado.
- [ ] `GET /api/reportes` por bbox + ofuscación espacial.
- [ ] Caducidad: filtro lógico + purga `pg_cron`.
- [ ] WebSocket `/ws/reportes` para tiempo real (futuro).

## Datos y privacidad
- [ ] Confirmar categorías y severidad definitivas.
- [ ] Implementar `reporter_hash` rotado (HMAC) y rate-limiting.
- [ ] Capa de migración para reportes existentes en `localStorage`.

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
