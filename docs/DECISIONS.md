# SafeMap Decisions (ADR ligero)

Registro de decisiones tomadas y su justificación. Formato:
`# fecha — decisión — estado (aceptada/revisar/reemplazada)`.

---

## 2026-05-31 — Coordinación multi-IA vía repo (fuente única de verdad) — aceptada

**Contexto:** se usan varias IAs (ChatGPT/Codex, Claude, Gemini, Antigravity).
No comparten memoria entre sí.
**Decisión:** todas leen los mismos archivos del repo (`AGENTS.md` + `docs/*`).
El repo manda; la IA obedece. Cada IA deja handoff al terminar.
**Consecuencia:** consistencia entre herramientas; obliga a commitear entre
turnos y a no editar en paralelo lo mismo sin Git.

## 2026-05-31 — Stack frontend: HTML/CSS/JS vanilla + Leaflet — aceptada

**Decisión:** sin frameworks (React/Vue/Angular) salvo aprobación explícita.
**Razón:** simplicidad, peso bajo, control fino del mapa; el prototipo ya
funciona así.

## 2026-05-31 — Mapa oscuro CartoDB Dark Matter — aceptada

**Razón:** estética moderna y buen contraste para marcadores de alerta.

## 2026-05-31 — Backend: FastAPI + PostgreSQL/PostGIS — aceptada

**Alternativa:** Node.js/Express.
**Razón:** I/O async para alta concurrencia GPS, validación Pydantic para
coordenadas, integración limpia con PostGIS vía asyncpg.

## 2026-05-31 — Tipo geográfico: GEOGRAPHY(Point,4326) — aceptada

**Alternativa:** GEOMETRY(4326).
**Razón:** distancias reales en metros sin reproyectar; consultas por radio
directas con `ST_DWithin`.

## 2026-05-31 — Caducidad a 2 h en dos capas — aceptada

**Decisión:** filtro lógico en GET (`expira_en > now()`) como verdad +
purga física con `pg_cron` cada ~10 min.
**Razón:** el reporte desaparece a tiempo aunque el worker falle; la BD no crece
sin control. A gran escala, particionar por tiempo y `DROP PARTITION`.

## 2026-05-31 — GET por bounding box, no por radio — aceptada

**Razón:** el frontend ya conoce `map.getBounds()`; `ST_Intersects` con envelope
+ índice GIST es muy eficiente y evita saturar al cliente (`LIMIT 500`).
El radio se reserva para "reportes cerca de mí".

## 2026-05-31 — Categorías definitivas (v1): 3 tipos — aceptada

**Decisión:** las categorías v1 son `zona_oscura`, `robo`, `sospechoso`, con la
severidad por defecto indicada en `DATA_MODEL.md`.
**Razón:** cubren los casos núcleo del MVP sin sobrecargar el "reporte de un
solo toque". Ampliaciones futuras se registran aquí antes de implementarse.

## 2026-05-31 — Colaboración multi-IA: híbrido + PRs — aceptada

**Decisión:** reparto híbrido (especialidad + rama por tarea); integración por
Pull Requests a `main`; Claude Code como líder/integrador que revisa los PR.
**Razón:** equilibra flexibilidad y control; evita colisiones y mantiene la
trazabilidad. Detalle en `docs/AI_TEAM.md` y prompts en `docs/AI_PROMPTS.md`.

## 2026-05-31 — Control de versiones: Git + remoto GitHub — aceptada

**Decisión:** repo Git inicializado en `main`; remoto en
`https://github.com/bitrix11/SafeMap` (cuenta `bitrix11`).
**Razón:** versionar la fuente única de verdad para coordinar varias IAs;
commitear entre turnos para que la siguiente IA lea el repo actualizado.
**Nota:** el push exige autenticarse como `bitrix11` (token/credencial),
no como otras cuentas de GitHub que pudieran estar cacheadas en el equipo.

## 2026-05-31 — Privacidad: anonimato + ofuscación espacial — aceptada

**Decisión:** sin `user_id` en `reportes`; `reporter_hash` rotado por ventana
(HMAC con secreto del servidor); guardar coordenada fina pero servir ofuscada
(grilla ~100 m); timestamps redondeados; retención mínima (2 h).
**Razón:** impedir reconstruir el patrón de movimiento de un usuario.
