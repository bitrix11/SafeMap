/* SafeMap — capa de reportes.
   CRUD sobre localStorage con caducidad a 2h. Cuando exista el backend,
   esta capa se sustituye por llamadas a /api/reportes manteniendo la misma API
   pública (window.SafeMap.reports). NO romper el formato sin migración. */

(function () {
  const { config } = window.SafeMap;

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

  // API pública
  const reports = {
    /** Devuelve solo reportes vigentes (purga los expirados de paso). */
    listar() {
      const todos = _leerCrudo();
      const vigentes = todos.filter(_vigente);
      if (vigentes.length !== todos.length) _guardar(vigentes); // limpieza física
      return vigentes;
    },

    /** Crea un reporte de un toque. categoria = código; lat/lng del mapa. */
    crear(categoria, lat, lng, descripcion = "") {
      const meta = window.SafeMap.categoria(categoria);
      if (!meta) throw new Error("Categoría inválida: " + categoria);

      const ahora = Date.now();
      const r = {
        id: _uuid(),
        categoria,
        severidad: meta.severidad,
        lat,
        lng,
        descripcion: String(descripcion).slice(0, 280),
        creado_en: new Date(ahora).toISOString(),
        expira_en: new Date(ahora + config.TTL_MS).toISOString(),
      };

      const lista = this.listar();
      lista.push(r);
      _guardar(lista);
      document.dispatchEvent(new CustomEvent("safemap:reportes-cambio"));
      return r;
    },

    /** Elimina un reporte por id. */
    eliminar(id) {
      const lista = this.listar().filter((r) => r.id !== id);
      _guardar(lista);
      document.dispatchEvent(new CustomEvent("safemap:reportes-cambio"));
    },
  };

  window.SafeMap.reports = reports;
})();
