/* SafeMap — capa de mapa (Leaflet + CartoDB Dark).
   Inicializa el mapa, dibuja marcadores y aplica filtros de categoria.
   redibujar() es async porque reports.listar() ahora puede consultar la API. */

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

    capaReportes = _crearCapaReportes().addTo(map);
    redibujar();

    document.addEventListener("safemap:reportes-cambio", redibujar);
    // Al mover/zoom el mapa, recargar reportes del bbox visible (API).
    map.on("moveend", redibujar);
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

  function _crearCapaReportes() {
    if (!L.markerClusterGroup) {
      console.warn("SafeMap: Leaflet.markercluster no esta disponible; usando marcadores simples.");
      return L.layerGroup();
    }
    return L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 80,
      chunkDelay: 30,
      removeOutsideVisibleBounds: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 48,
      iconCreateFunction: _iconoCluster,
    });
  }

  function _iconoCluster(cluster) {
    const total = cluster.getChildCount();
    const size = total >= 100 ? "grande" : total >= 10 ? "medio" : "chico";
    const px = total >= 100 ? 54 : total >= 10 ? 48 : 44;
    const categorias = {};

    cluster.getAllChildMarkers().forEach((marker) => {
      const codigo = marker.options.categoria;
      categorias[codigo] = (categorias[codigo] || 0) + 1;
    });

    const dominante = Object.keys(categorias).sort((a, b) => categorias[b] - categorias[a])[0];
    const meta = window.SafeMap.categoria(dominante);
    const color = meta ? meta.color : "#2f81f7";

    return L.divIcon({
      className: "cluster-reporte cluster-reporte--" + size,
      html:
        '<div class="cluster-reporte__burbuja" style="--cluster-color:' + color + '">' +
          '<span class="cluster-reporte__numero">' + total + "</span>" +
        "</div>",
      iconSize: [px, px],
      iconAnchor: [px / 2, px / 2],
    });
  }

  async function redibujar() {
    if (!capaReportes) return;

    const visibles = new Set(categoriasVisibles);
    const todos = await window.SafeMap.reports.listar();
    const reportes = todos.filter((r) => visibles.has(r.categoria));

    capaReportes.clearLayers();
    reportes.forEach((r) => {
      const meta = window.SafeMap.categoria(r.categoria);
      if (!meta) return;
      L.marker([r.lat, r.lng], {
        icon: _iconoCategoria(meta),
        categoria: r.categoria,
      })
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
