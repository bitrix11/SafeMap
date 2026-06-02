# SafeMap — Backend

FastAPI + PostgreSQL/PostGIS. Expone `POST /api/reportes` y `GET /api/reportes`.

## Requisitos

- Docker + Docker Compose (v2)
- Sin dependencias locales de Python necesarias para el modo Docker

## Levantar el stack completo

```bash
cd backend/
docker compose up --build
```

Esto:
1. Levanta `postgis/postgis:16-3.4` en el puerto 5432.
2. Ejecuta automáticamente `migrations/V001__schema_inicial.sql` al primer arranque (volumen vacío).
3. Levanta la API FastAPI en `http://localhost:8000`.

## Correr la migración manualmente

Si la base ya existe y quieres aplicar la migración sin recrear el volumen:

```bash
# Con psql disponible localmente:
psql postgresql://safemap:safemap_dev@localhost:5432/safemap \
  -f migrations/V001__schema_inicial.sql

# O desde dentro del contenedor:
docker compose exec db \
  psql -U safemap -d safemap -f /docker-entrypoint-initdb.d/V001__schema_inicial.sql
```

La migración es **idempotente**: usa `IF NOT EXISTS` en todas las sentencias.

## Verificar que levantó

```bash
curl http://localhost:8000/healthz
# {"status":"ok"}

curl "http://localhost:8000/api/reportes?min_lat=19.4&min_lng=-99.2&max_lat=19.5&max_lng=-99.1"
# []
```

## Crear un reporte de prueba

```bash
curl -X POST http://localhost:8000/api/reportes \
  -H "Content-Type: application/json" \
  -d '{"categoria":"robo","lat":19.43,"lng":-99.13,"descripcion":"Prueba"}'
# {"id":"...","expira_en":"..."}
```

## Variables de entorno

| Variable              | Valor por defecto                                         | Descripción                          |
|-----------------------|-----------------------------------------------------------|--------------------------------------|
| `DATABASE_URL`        | `postgresql://safemap:safemap_dev@localhost:5432/safemap` | Cadena de conexión asyncpg           |
| `REPORTER_HMAC_SECRET`| `dev_secret_change_me`                                    | Secreto para hash rotado del reporter|

Copia `.env.example` → `.env` y ajusta los valores para producción.

## Estructura

```
backend/
├── docker-compose.yml          # postgis + api
├── Dockerfile                  # imagen de la API
├── requirements.txt            # fastapi, uvicorn, asyncpg, pydantic
├── main.py                     # endpoints POST y GET + helpers de privacidad
├── .env.example
└── migrations/
    ├── V001__schema_inicial.sql   # extensiones, tablas, índices, seed categorías
    └── V002__purga_pg_cron.sql    # plantilla pg_cron (comentada; requiere extensión)
```

## Notas de privacidad

- `lat`/`lng` en las respuestas GET están ofuscadas (snap a grilla ~100 m).
- `creado_en` se redondea a 5 min en las respuestas públicas.
- No se guarda `user_id`; `reporter_hash` es un HMAC rotado por ventana de 2 h.
