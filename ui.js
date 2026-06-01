/* SafeMap — interacciones de interfaz.
   Filtros de categoría, lista de reportes, modal de categoría y flujo de
   "reporte de un toque". feature/ui-bottom-sheet ampliará el panel inferior. */

(function () {
  const { config } = window.SafeMap;

  function init() {
    _renderFiltros();
    _renderLista();
    _bindReportar();
    document.addEventListener("safemap:reportes-cambio", _renderLista);
  }

  /* ---- Filtros de categoria ---- */
  function _renderFiltros() {
    const cont = document.getElementById("filtros");
    const guardadas = _leerFiltrosGuardados();
    window.SafeMap.map.setCategoriasVisibles(guardadas);
    cont.innerHTML = "";

    const btnTodas = _btnFiltro("Todas", null);
    cont.appendChild(btnTodas);

    config.CATEGORIAS.forEach((cat) => {
      cont.appendChild(_btnFiltro(cat.label, cat.codigo, cat.color));
    });

    _actualizarEstadoFiltros();
  }

  function _btnFiltro(texto, codigo, color) {
    const b = document.createElement("button");
    b.className = "filtros__btn";
    b.textContent = texto;
    b.type = "button";
    b.dataset.categoria = codigo || "todas";
    if (color) b.style.setProperty("--filter-color", color);
    b.addEventListener("click", () => {
      const actuales = window.SafeMap.map.getCategoriasVisibles();
      const todos = config.CATEGORIAS.map((cat) => cat.codigo);
      let siguientes;

      if (!codigo) {
        siguientes = todos;
      } else if (actuales.length === todos.length) {
        siguientes = [codigo];
      } else if (actuales.includes(codigo)) {
        siguientes = actuales.filter((cat) => cat !== codigo);
      } else {
        siguientes = [...actuales, codigo];
      }

      if (siguientes.length === 0) siguientes = todos;
      window.SafeMap.map.setCategoriasVisibles(siguientes);
      _guardarFiltros(siguientes);
      _actualizarEstadoFiltros();
      _renderLista();
    });
    return b;
  }

  function _leerFiltrosGuardados() {
    const todos = config.CATEGORIAS.map((cat) => cat.codigo);
    try {
      const raw = localStorage.getItem(config.FILTERS_STORAGE_KEY);
      if (!raw) return todos;
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return todos;
      const validas = data.filter((codigo) => todos.includes(codigo));
      return validas.length ? [...new Set(validas)] : todos;
    } catch (e) {
      console.warn("SafeMap: filtros corruptos, usando todas las categorías.", e);
      return todos;
    }
  }

  function _guardarFiltros(codigos) {
    localStorage.setItem(config.FILTERS_STORAGE_KEY, JSON.stringify(codigos));
  }

  function _actualizarEstadoFiltros() {
    const visibles = window.SafeMap.map.getCategoriasVisibles();
    const todosActivos = visibles.length === config.CATEGORIAS.length;
    document.querySelectorAll(".filtros__btn").forEach((btn) => {
      const codigo = btn.dataset.categoria;
      const activo = codigo === "todas" ? todosActivos : visibles.includes(codigo);
      btn.setAttribute("aria-pressed", activo ? "true" : "false");
    });
  }

  /* ---- Lista de reportes en el panel ---- */
  function _renderLista() {
    const ul = document.getElementById("lista-reportes");
    const contador = document.getElementById("panel-contador");
    const visibles = new Set(window.SafeMap.map.getCategoriasVisibles());

    const reportes = window.SafeMap.reports
      .listar()
      .filter((r) => visibles.has(r.categoria))
      .sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

    contador.textContent = String(reportes.length);
    ul.innerHTML = "";

    if (reportes.length === 0) {
      const li = document.createElement("li");
      li.className = "lista-vacia";
      li.textContent = "Sin reportes activos cerca";
      ul.appendChild(li);
      return;
    }

    reportes.forEach((r) => {
      const meta = window.SafeMap.categoria(r.categoria);
      const li = document.createElement("li");
      li.className = "reporte";
      li.innerHTML =
        '<span class="reporte__punto" style="background:' + (meta ? meta.color : "#888") + '"></span>' +
        '<div class="reporte__info">' +
          '<div class="reporte__cat">' + (meta ? meta.label : r.categoria) + "</div>" +
          '<div class="reporte__meta">' + _tiempoRestante(r.expira_en) + "</div>" +
        "</div>";
      li.addEventListener("click", () => window.SafeMap.map.setVista(r.lat, r.lng, 17));
      ul.appendChild(li);
    });
  }

  function _tiempoRestante(expira) {
    const ms = new Date(expira).getTime() - Date.now();
    const min = Math.max(0, Math.round(ms / 60000));
    if (min >= 60) return "expira en " + Math.floor(min / 60) + "h " + (min % 60) + "m";
    return "expira en " + min + " min";
  }

  /* ---- Flujo de reporte de un toque ---- */
  function _bindReportar() {
    const btn = document.getElementById("btn-reportar");
    const modal = document.getElementById("modal-categoria");
    const opciones = document.getElementById("modal-opciones");
    const cancelar = document.getElementById("modal-cancelar");

    opciones.innerHTML = "";
    config.CATEGORIAS.forEach((cat) => {
      const b = document.createElement("button");
      b.className = "modal__opcion";
      b.innerHTML =
        '<span class="punto" style="background:' + cat.color + '"></span>' + cat.label;
      b.addEventListener("click", () => {
        _crearEnUbicacion(cat.codigo);
        modal.hidden = true;
      });
      opciones.appendChild(b);
    });

    btn.addEventListener("click", () => { modal.hidden = false; });
    cancelar.addEventListener("click", () => { modal.hidden = true; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
  }

  function _crearEnUbicacion(codigo) {
    // Preferimos la posición GPS; si no, el centro del mapa.
    const pos = window.SafeMap.geolocation.getPosicion();
    let lat, lng;
    if (pos) { lat = pos.lat; lng = pos.lng; }
    else {
      const c = window.SafeMap.map.getCentro();
      if (!c) return;
      lat = c.lat; lng = c.lng;
    }
    window.SafeMap.reports.crear(codigo, lat, lng);
    window.SafeMap.map.setVista(lat, lng, 17);
  }

  window.SafeMap.ui = { init };
})();
