/* SafeMap — capa de mapa (Leaflet + CartoDB Dark).
   Inicializa el mapa y dibuja los marcadores de reportes.
   feature/map-clustering reemplazará la capa de marcadores por clustering.
   feature/report-filters consumirá `setFiltro`. */

(function () {
  const { config } = window.SafeMap;
  let map = null;
  let capaReportes = null;
  let filtroActivo = null; // null = todas; o un código de categoría

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

    const reportes = window.SafeMap.reports.listar().filter((r) =>
      filtroActivo ? r.categoria === filtroActivo : true
    );

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

  // API pública
  window.SafeMap.map = {
    init,
    redibujar,
    getMap: () => map,
    getCentro: () => (map ? map.getCenter() : null),
    setVista: (lat, lng, zoom) => map && map.setView([lat, lng], zoom || map.getZoom()),
    setFiltro: (codigo) => { filtroActivo = codigo; redibujar(); },
    getFiltro: () => filtroActivo,
  };
})();
