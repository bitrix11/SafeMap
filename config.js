/* SafeMap — configuración central.
   Fuente de verdad de constantes compartidas entre módulos.
   Alineado con docs/DATA_MODEL.md y docs/DECISIONS.md. */

window.SafeMap = window.SafeMap || {};

window.SafeMap.config = {
  // URL base del backend. Vacío = solo localStorage (offline/dev sin backend).
  API_BASE: "http://localhost:8000",

  // Caducidad de reportes: 2 horas (ver DECISIONS.md)
  TTL_MS: 2 * 60 * 60 * 1000,

  // localStorage (no romper sin migración — ver DATA_MODEL.md)
  STORAGE_KEY: "safemap.reportes",
  FILTERS_STORAGE_KEY: "safemap.filtros.categorias",
  SCHEMA_VERSION: 1,

  // Mapa
  MAPA: {
    centroPorDefecto: [19.4326, -99.1332], // CDMX como fallback
    zoomInicial: 15,
    zoomMax: 19,
    tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    tileAttr:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },

  // Categorías v1 (ver DECISIONS.md). codigo → metadatos.
  CATEGORIAS: [
    { codigo: "zona_oscura", label: "Zona oscura",          color: "#FFB300", severidad: "media" },
    { codigo: "robo",        label: "Robo / incidente",     color: "#E53935", severidad: "alta"  },
    { codigo: "sospechoso",  label: "Actividad sospechosa", color: "#8E24AA", severidad: "media" },
  ],
};

// Helper: metadatos de una categoría por código
window.SafeMap.categoria = function (codigo) {
  return window.SafeMap.config.CATEGORIAS.find((c) => c.codigo === codigo) || null;
};
