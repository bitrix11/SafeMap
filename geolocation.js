/* SafeMap — geolocalización del usuario.
   watchPosition + marcador básico con círculo de precisión.
   feature/geolocation-marker mejorará el marcador (dirección, interpolación). */

(function () {
  let watchId = null;
  let marcador = null;
  let circuloPrecision = null;
  let ultimaPos = null;
  let centradoInicial = false;

  function iniciar() {
    if (!("geolocation" in navigator)) {
      console.warn("SafeMap: geolocalización no disponible.");
      return;
    }
    watchId = navigator.geolocation.watchPosition(_onPos, _onErr, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });
  }

  function detener() {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  function _onPos(pos) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    ultimaPos = { lat, lng, accuracy };
    const map = window.SafeMap.map.getMap();
    if (!map) return;

    if (!marcador) {
      marcador = L.marker([lat, lng], {
        icon: L.divIcon({ className: "marcador-usuario", iconSize: [18, 18], iconAnchor: [9, 9] }),
        zIndexOffset: 1000,
      }).addTo(map);
      circuloPrecision = L.circle([lat, lng], {
        radius: accuracy,
        color: "#2f81f7",
        weight: 1,
        fillColor: "#2f81f7",
        fillOpacity: 0.12,
      }).addTo(map);
    } else {
      marcador.setLatLng([lat, lng]);
      circuloPrecision.setLatLng([lat, lng]).setRadius(accuracy);
    }

    if (!centradoInicial) {
      window.SafeMap.map.setVista(lat, lng);
      centradoInicial = true;
    }
  }

  function _onErr(err) {
    console.warn("SafeMap: error de geolocalización —", err.message);
  }

  window.SafeMap.geolocation = {
    iniciar,
    detener,
    getPosicion: () => ultimaPos,
  };
})();
