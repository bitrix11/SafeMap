/* SafeMap — interacciones de interfaz.
   Bottom sheet deslizable, filtros de categoría, lista de reportes, modal de
   categoría y flujo de "reporte de un toque". _renderLista() es async porque
   reports.listar() ahora puede consultar la API. */

(function () {
  const { config } = window.SafeMap;

  function init() {
    _renderFiltros();
    _renderLista();
    _bindReportar();
    _initBottomSheet();
    document.addEventListener("safemap:reportes-cambio", _renderLista);
  }

  /* ---- Bottom Sheet (deslizable) ---- */
  function _initBottomSheet() {
    const panel = document.getElementById("panel");
    const handle = panel.querySelector(".panel__handle-container");
    const lista = document.getElementById("lista-reportes");

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const states = { PEEK: "peek", HALF: "half", FULL: "full" };
    let currentState = states.PEEK;

    const getSnaps = () => {
      const vh = window.innerHeight;
      const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--safe-bottom")) || 0;
      const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--safe-top")) || 0;
      return {
        [states.PEEK]: vh - 80 - safeBottom,
        [states.HALF]: vh * 0.55,
        [states.FULL]: 20 + safeTop,
      };
    };

    function setPanelState(state, animate = true) {
      currentState = state;
      panel.dataset.state = state;
      panel.style.transition = animate ? "" : "none";
      panel.style.transform = "";
    }

    handle.addEventListener("touchstart", (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
      panel.style.transition = "none";
    }, { passive: true });

    lista.addEventListener("touchstart", (e) => {
      if (currentState !== states.FULL || lista.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        if (currentState !== states.FULL) {
          isDragging = true;
          panel.style.transition = "none";
        }
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!isDragging && lista.scrollTop <= 0 && currentState === states.FULL) {
        if (e.touches[0].clientY > startY) {
          isDragging = true;
          panel.style.transition = "none";
        }
      }
      if (!isDragging) return;

      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      const snaps = getSnaps();
      const basePos = snaps[currentState];
      let newPos = basePos + deltaY;

      const topLimit = snaps[states.FULL];
      const bottomLimit = snaps[states.PEEK] + 50;
      if (newPos < topLimit) newPos = topLimit - Math.pow(topLimit - newPos, 0.7);
      if (newPos > bottomLimit) newPos = bottomLimit;

      panel.style.transform = `translateY(${newPos}px)`;
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    window.addEventListener("touchend", (e) => {
      if (!isDragging) return;
      isDragging = false;

      const deltaY = e.changedTouches[0].clientY - startY;
      const velocity = deltaY;
      const snaps = getSnaps();
      const currentPos = snaps[currentState] + deltaY;

      let targetState = currentState;
      const snapValues = Object.entries(snaps);

      if (Math.abs(velocity) > 20) {
        if (velocity > 0) {
          targetState = currentState === states.FULL ? states.HALF : states.PEEK;
        } else {
          targetState = currentState === states.PEEK ? states.HALF : states.FULL;
        }
      } else {
        targetState = snapValues.reduce((prev, curr) =>
          Math.abs(curr[1] - currentPos) < Math.abs(prev[1] - currentPos) ? curr : prev
        )[0];
      }

      setPanelState(targetState);
    });

    handle.addEventListener("click", () => {
      setPanelState(currentState === states.PEEK ? states.HALF : states.PEEK);
    });
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
  async function _renderLista() {
    const ul = document.getElementById("lista-reportes");
    const contador = document.getElementById("panel-contador");
    const visibles = new Set(window.SafeMap.map.getCategoriasVisibles());

    const todos = await window.SafeMap.reports.listar();
    const reportes = todos
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
      b.addEventListener("click", async () => {
        await _crearEnUbicacion(cat.codigo);
        modal.hidden = true;
      });
      opciones.appendChild(b);
    });

    btn.addEventListener("click", () => { modal.hidden = false; });
    cancelar.addEventListener("click", () => { modal.hidden = true; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
  }

  async function _crearEnUbicacion(codigo) {
    const pos = window.SafeMap.geolocation.getPosicion();
    let lat, lng;
    if (pos) { lat = pos.lat; lng = pos.lng; }
    else {
      const c = window.SafeMap.map.getCentro();
      if (!c) return;
      lat = c.lat; lng = c.lng;
    }
    await window.SafeMap.reports.crear(codigo, lat, lng);
    window.SafeMap.map.setVista(lat, lng, 17);
  }

  window.SafeMap.ui = { init };
})();
