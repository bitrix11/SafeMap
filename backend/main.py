"""SafeMap API — FastAPI + asyncpg + PostGIS."""

import hashlib
import hmac
import math
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import asyncpg
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

# ─── Config ──────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://safemap:safemap_dev@localhost:5432/safemap",
)
HMAC_SECRET = os.getenv("REPORTER_HMAC_SECRET", "dev_secret_change_me").encode()
REPORT_TTL_SECONDS = 7200          # 2 h
DUPLICATE_RADIUS_M  = 50           # anti-duplicado: misma categoría a <50 m
BBOX_MAX_DEGREES    = 0.5          # rechaza bbox > ~55 km de lado
RESULT_LIMIT        = 500
GRID_METERS         = 100          # ofuscación espacial: snap a grilla ~100 m
ROUND_MINUTES       = 5            # redondeo de timestamps públicos


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    yield
    await app.state.pool.close()


app = FastAPI(title="SafeMap API", version="0.1.0", lifespan=lifespan)

# CORS: permitir que el frontend (otro puerto/origen) llame al API.
# En dev abrimos todo; en producción restringir a los orígenes reales.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Schemas ─────────────────────────────────────────────────────────────────

VALID_CATEGORIES = {"zona_oscura", "robo", "sospechoso"}
VALID_SEVERITIES = {"baja", "media", "alta"}

CATEGORY_DEFAULT_SEVERITY = {
    "zona_oscura": "media",
    "robo": "alta",
    "sospechoso": "media",
}


class ReporteIn(BaseModel):
    categoria: str
    lat: float
    lng: float
    descripcion: Optional[str] = None
    severidad: Optional[str] = None

    @field_validator("categoria")
    @classmethod
    def categoria_valida(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"categoria debe ser una de {VALID_CATEGORIES}")
        return v

    @field_validator("lat")
    @classmethod
    def lat_valida(cls, v: float) -> float:
        if not -90 <= v <= 90:
            raise ValueError("lat debe estar en [-90, 90]")
        return v

    @field_validator("lng")
    @classmethod
    def lng_valida(cls, v: float) -> float:
        if not -180 <= v <= 180:
            raise ValueError("lng debe estar en [-180, 180]")
        return v

    @field_validator("descripcion")
    @classmethod
    def descripcion_longitud(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 280:
            raise ValueError("descripcion no puede superar 280 caracteres")
        return v

    @field_validator("severidad")
    @classmethod
    def severidad_valida(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_SEVERITIES:
            raise ValueError(f"severidad debe ser una de {VALID_SEVERITIES}")
        return v


class ReporteOut(BaseModel):
    id: UUID
    expira_en: datetime


class ReportePublico(BaseModel):
    id: UUID
    categoria: str
    lat: float
    lng: float
    descripcion: Optional[str]
    creado_en: datetime
    expira_en: datetime


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _reporter_hash(ip: str) -> str:
    """HMAC rotado por ventana de 2 h para desacoplar identidad del reporte."""
    window = int(time.time()) // REPORT_TTL_SECONDS
    token = f"{ip}:{window}".encode()
    return hmac.new(HMAC_SECRET, token, hashlib.sha256).hexdigest()


def _snap_to_grid(coord: float, meters: float, is_lat: bool) -> float:
    """Snap coordenada a la grilla más cercana de `meters` metros."""
    if is_lat:
        deg_per_m = 1 / 111_320
    else:
        deg_per_m = 1 / (111_320 * math.cos(math.radians(coord)))
    step = meters * deg_per_m
    return round(coord / step) * step


def _round_timestamp(dt: datetime, minutes: int) -> datetime:
    """Redondea datetime al múltiplo de `minutes` más cercano."""
    total_seconds = int(dt.timestamp())
    step = minutes * 60
    rounded = (total_seconds // step) * step
    return datetime.fromtimestamp(rounded, tz=timezone.utc)


def _obfuscate(row: asyncpg.Record) -> ReportePublico:
    lat_raw = row["lat"]
    lng_raw = row["lng"]
    return ReportePublico(
        id=row["id"],
        categoria=row["categoria"],
        lat=_snap_to_grid(lat_raw, GRID_METERS, is_lat=True),
        lng=_snap_to_grid(lng_raw, GRID_METERS, is_lat=False),
        descripcion=row["descripcion"],
        creado_en=_round_timestamp(row["creado_en"], ROUND_MINUTES),
        expira_en=row["expira_en"],
    )


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/api/reportes", response_model=ReporteOut, status_code=201)
async def crear_reporte(body: ReporteIn, request_ip: str = "0.0.0.0"):
    """Crea un reporte. Rechaza duplicados: misma categoría a <50 m y activos."""
    severidad = body.severidad or CATEGORY_DEFAULT_SEVERITY[body.categoria]
    r_hash = _reporter_hash(request_ip)

    async with app.state.pool.acquire() as conn:
        # Obtener categoria_id
        cat_id = await conn.fetchval(
            "SELECT id FROM categorias WHERE codigo = $1", body.categoria
        )
        if cat_id is None:
            raise HTTPException(status_code=400, detail="Categoría no encontrada")

        # Anti-duplicado: mismo tipo a <50 m, aún activo
        duplicate = await conn.fetchval(
            """
            SELECT id FROM reportes
            WHERE  categoria_id = $1
              AND  activo = true
              AND  expira_en > now()
              AND  ST_DWithin(
                       ubicacion,
                       ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                       $4
                   )
            LIMIT 1
            """,
            cat_id, body.lng, body.lat, float(DUPLICATE_RADIUS_M),
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=409,
                detail="Ya existe un reporte activo de esa categoría en este lugar",
            )

        row = await conn.fetchrow(
            """
            INSERT INTO reportes
                (categoria_id, severidad, ubicacion, descripcion, reporter_hash)
            VALUES
                ($1, $2,
                 ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
                 $5, $6)
            RETURNING id, expira_en
            """,
            cat_id, severidad,
            body.lng, body.lat,
            body.descripcion, r_hash,
        )

    return ReporteOut(id=row["id"], expira_en=row["expira_en"])


@app.get("/api/reportes", response_model=list[ReportePublico])
async def listar_reportes(
    min_lat: float = Query(...),
    min_lng: float = Query(...),
    max_lat: float = Query(...),
    max_lng: float = Query(...),
    categoria: Optional[str] = Query(default=None),
):
    """Devuelve reportes activos dentro del bounding box visible."""
    # Rechazar bbox demasiado grande
    if (max_lat - min_lat) > BBOX_MAX_DEGREES or (max_lng - min_lng) > BBOX_MAX_DEGREES:
        raise HTTPException(
            status_code=400,
            detail=f"Bbox excesivo: máximo {BBOX_MAX_DEGREES}° de lado",
        )

    if categoria is not None and categoria not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Categoría inválida")

    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                r.id,
                c.codigo  AS categoria,
                ST_Y(r.ubicacion::geometry) AS lat,
                ST_X(r.ubicacion::geometry) AS lng,
                r.descripcion,
                r.creado_en,
                r.expira_en
            FROM reportes r
            JOIN categorias c ON c.id = r.categoria_id
            WHERE r.activo = true
              AND r.expira_en > now()
              AND ST_Intersects(
                    r.ubicacion,
                    ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
                  )
              AND ($5::text IS NULL OR c.codigo = $5)
            LIMIT $6
            """,
            min_lng, min_lat, max_lng, max_lat,
            categoria, RESULT_LIMIT,
        )

    return [_obfuscate(r) for r in rows]


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
