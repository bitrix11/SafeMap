/* SafeMap — capa de reportes.
   Fuente primaria: API REST (config.API_BASE + "/api/reportes").
   Fallback: localStorage cuando la API no responde o API_BASE está vacío.
   El formato de localStorage sigue siendo el de DATA_MODEL.md (sin migración). */

(function () {
  const { config } = window.SafeMap;

  // ── localStorage helpers ──────────────────────────────────────────────────

  function _leerCrudo() {
    try {
      const raw = localStorage.getItem(config.STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("SafeMap: localStorage corrupto, reiniciando.", e);
      return [];
    }
  }

  function _guardar(lista) {
    localStorage.setItem(config.STORAGE_KEY, JSON.stringify(lista));
    localStorage.setItem("safemap.schemaVersion", String(config.SCHEMA_VERSION));
  }

  function _uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function _vigente(r) {
    return new Date(r.expira_en).getTime() > Date.now();
  }

  /** Devuelve reportes vigentes del localStorage (purga expirados de paso). */
  function _listarLocal() {
    const todos = _leerCrudo();
    const vigentes = todos.filter(_vigente);
    if (vigentes.length !== todos.length) _guardar(vigentes);
    return vigentes;
  }

  // ── API pública ───────────────────────────────────────────────────────────

  const reports = {
    /**
     * Devuelve reportes activos.
     * Primero intenta GET /api/reportes con el bbox del mapa visible.
     * Si la API no responde o API_BASE está vacío, usa localStorage.
     * Siempre devuelve una Promesa (array de reportes).
     */
    async listar() {
      const api = config.API_BASE;
      if (api) {
        try {
          const leafletMap =
            window.SafeMap.map &&
            typeof window.SafeMap.map.getMap === "function" &&
            window.SafeMap.map.getMap();
          if (leafletMap) {
            const b = leafletMap.getBounds();
            const params = new URLSearchParams({
              min_lat: b.getSouth(),
              min_lng: b.getWest(),
              max_lat: b.getNorth(),
              max_lng: b.getEast(),
            });
            const res = await fetch(api + "/api/reportes?" + params);
            if (res.ok) return await res.json();
            console.warn("SafeMap: GET /api/reportes →", res.status, "— usando localStorage.");
          }
        } catch (e) {
          console.warn("SafeMap: API no disponible, usando localStorage.", e);
        }
      }
      return _listarLocal();
    },

    /**
     * Crea un reporte.
     * Intenta POST /api/reportes; si falla o API_BASE está vacío, guarda en localStorage.
     * Despacha "safemap:reportes-cambio" para refrescar mapa y lista.
     * Devuelve una Promesa con el reporte creado (o null si el servidor devuelve 409).
     */
    async crear(categoria, lat, lng, descripcion = "") {
      const meta = window.SafeMap.categoria(categoria);
      if (!meta) throw new Error("Categoría inválida: " + categoria);

      const desc = String(descripcion).slice(0, 280);
      const api = config.API_BASE;

      if (api) {
        try {
          const res = await fetch(api + "/api/reportes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoria, lat, lng, descripcion: desc }),
          });

          if (res.status === 409) {
            console.warn("SafeMap: reporte duplicado (409) — ya existe uno activo cerca.");
            return null;
          }

          if (res.ok) {
            const data = await res.json(); // { id, expira_en }
            const r = {
              id: String(data.id),
              categoria,
              severidad: meta.severidad,
              lat,
              lng,
              descripcion: desc,
              creado_en: new Date().toISOString(),
              expira_en: data.expira_en,
            };
            document.dispatchEvent(new CustomEvent("safemap:reportes-cambio"));
            return r;
          }
          console.warn("SafeMap: POST /api/reportes →", res.status, "— usando localStorage.");
        } catch (e) {
          console.warn("SafeMap: API no disponible, guardando en localStorage.", e);
        }
      }

      // Fallback: localStorage
      const ahora = Date.now();
      const r = {
        id: _uuid(),
        categoria,
        severidad: meta.severidad,
        lat,
        lng,
        descripcion: desc,
        creado_en: new Date(ahora).toISOString(),
        expira_en: new Date(ahora + config.TTL_MS).toISOString(),
      };
      const lista = _listarLocal();
      lista.push(r);
      _guardar(lista);
      document.dispatchEvent(new CustomEvent("safemap:reportes-cambio"));
      return r;
    },

    /** Elimina un reporte por id (solo localStorage por ahora). */
    eliminar(id) {
      const lista = _listarLocal().filter((r) => r.id !== id);
      _guardar(lista);
      document.dispatchEvent(new CustomEvent("safemap:reportes-cambio"));
    },
  };

  window.SafeMap.reports = reports;
})();
