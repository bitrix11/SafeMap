/* SafeMap — capa de mapa (Leaflet + CartoDB Dark).
   Inicializa el mapa, dibuja marcadores y aplica filtros de categoria.
   feature/map-clustering reemplazará la capa de marcadores por clustering. */

(function () {
  const { config } = window.SafeMap;
  let map = null;
  let capaReportes = null;
  let categoriasVisibles = config.CATEGORIAS.map((cat) => cat.codigo);

  function init() {
    map = L.map("map", {
      zoomControl: false,
      attributionControl: true,
      maxZoom: config.MAPA.zoomMax,
    }).setView(config.MAPA.centroPorDefecto, config.MAPA.zoomInicial);

    L.tileLayer(config.MAPA.tileUrl, {
      attribution: config.MAPA.tileAttr,
      maxZoom: config.MAPA.zoomMax,
    }).addTo(map);

    L.control.zoom({ position: "bottomleft" }).addTo(map);

    capaReportes = L.layerGroup().addTo(map);
    redibujar();

    document.addEventListener("safemap:reportes-cambio", redibujar);
    return map;
  }

  function _iconoCategoria(meta) {
    return L.divIcon({
      className: "",
      html:
        '<div style="width:14px;height:14px;border-radius:50%;border:2px solid #fff;' +
        'background:' + meta.color + ';box-shadow:0 0 0 2px rgba(0,0,0,.3)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  function redibujar() {
    if (!capaReportes) return;
    capaReportes.clearLayers();

    const visibles = new Set(categoriasVisibles);
    const reportes = window.SafeMap.reports
      .listar()
      .filter((r) => visibles.has(r.categoria));

    reportes.forEach((r) => {
      const meta = window.SafeMap.categoria(r.categoria);
      if (!meta) return;
      L.marker([r.lat, r.lng], { icon: _iconoCategoria(meta) })
        .bindPopup(
          "<strong>" + meta.label + "</strong>" +
          (r.descripcion ? "<br>" + r.descripcion : "")
        )
        .addTo(capaReportes);
    });
  }

  function _normalizarCategorias(codigos) {
    const permitidas = config.CATEGORIAS.map((cat) => cat.codigo);
    const recibidas = Array.isArray(codigos) ? codigos : [codigos];
    const filtradas = recibidas.filter((codigo) => permitidas.includes(codigo));
    return [...new Set(filtradas)];
  }

  function setCategoriasVisibles(codigos) {
    const siguientes = _normalizarCategorias(codigos);
    categoriasVisibles = siguientes.length
      ? siguientes
      : config.CATEGORIAS.map((cat) => cat.codigo);
    redibujar();
  }

  function getCategoriasVisibles() {
    return [...categoriasVisibles];
  }

  // API pública
  window.SafeMap.map = {
    init,
    redibujar,
    getMap: () => map,
    getCentro: () => (map ? map.getCenter() : null),
    setVista: (lat, lng, zoom) => map && map.setView([lat, lng], zoom || map.getZoom()),
    setCategoriasVisibles,
    getCategoriasVisibles,
    setFiltro: (codigo) => {
      setCategoriasVisibles(codigo ? [codigo] : config.CATEGORIAS.map((cat) => cat.codigo));
    },
    getFiltro: () => {
      if (categoriasVisibles.length === 1) return categoriasVisibles[0];
      return null;
    },
  };
})();
