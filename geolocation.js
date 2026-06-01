/* SafeMap — geolocalización del usuario.
   watchPosition + marcador dinámico (interpolado, direccional).
   Usa requestAnimationFrame para un movimiento fluido estilo Google Maps. */

(function () {
  let watchId = null;
  let marcador = null;
  let circuloPrecision = null;
  let ultimaPos = null;       // Posición real reportada por el GPS
  let posInterpolada = null;  // Posición suavizada para el renderizado
  let heading = 0;
  let mostrarFlecha = false;
  let animId = null;
  let centradoInicial = false;

  function iniciar() {
    if (!("geolocation" in navigator)) {
      console.warn("SafeMap: geolocalización no disponible.");
      return;
    }
    watchId = navigator.geolocation.watchPosition(_onPos, _onErr, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 15000,
    });
    _tick();
  }

  function detener() {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    if (animId) cancelAnimationFrame(animId);
    animId = null;
  }

  function _onPos(pos) {
    const { latitude: lat, longitude: lng, accuracy, heading: h } = pos.coords;
    ultimaPos = { lat, lng, accuracy, heading: h };

    if (!posInterpolada) {
      posInterpolada = { ...ultimaPos };
    }

    if (!centradoInicial) {
      const map = window.SafeMap.map.getMap();
      if (map) {
        window.SafeMap.map.setVista(lat, lng);
        centradoInicial = true;
      }
    }
  }

  // Bucle de animación (~60fps) para interpolar coordenadas.
  function _tick() {
    if (ultimaPos && posInterpolada) {
      const lerp = (a, b, t) => a + (b - a) * t;
      const t = 0.12; // factor de suavizado (menor = más suave)

      posInterpolada.lat = lerp(posInterpolada.lat, ultimaPos.lat, t);
      posInterpolada.lng = lerp(posInterpolada.lng, ultimaPos.lng, t);
      posInterpolada.accuracy = lerp(posInterpolada.accuracy, ultimaPos.accuracy, t);

      if (ultimaPos.heading !== null && ultimaPos.heading !== undefined && !isNaN(ultimaPos.heading)) {
        heading = ultimaPos.heading;
        mostrarFlecha = true;
      } else {
        mostrarFlecha = false;
      }

      _dibujar();
    }
    animId = requestAnimationFrame(_tick);
  }

  // Actualiza el marcador y el círculo en el mapa de Leaflet.
  function _dibujar() {
    const map = window.SafeMap.map.getMap();
    if (!map) return;

    if (!marcador) {
      const icon = L.divIcon({
        className: "marcador-usuario-container",
        html: '<div class="marcador-usuario">' +
                '<div class="marcador-usuario__flecha"></div>' +
                '<div class="marcador-usuario__punto"></div>' +
              '</div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      marcador = L.marker([posInterpolada.lat, posInterpolada.lng], {
        icon: icon,
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);

      circuloPrecision = L.circle([posInterpolada.lat, posInterpolada.lng], {
        radius: posInterpolada.accuracy,
        color: "#2f81f7",
        weight: 1,
        fillColor: "#2f81f7",
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(map);
    } else {
      marcador.setLatLng([posInterpolada.lat, posInterpolada.lng]);
      circuloPrecision
        .setLatLng([posInterpolada.lat, posInterpolada.lng])
        .setRadius(posInterpolada.accuracy);

      const el = marcador.getElement();
      if (el) {
        const inner = el.querySelector(".marcador-usuario");
        if (inner) {
          inner.style.transform = `rotate(${heading}deg)`;
          inner.setAttribute("data-heading", mostrarFlecha ? "true" : "false");
        }
      }
    }
  }

  function _onErr(err) {
    console.warn("SafeMap: error de geolocalización —", err.message);
  }

  window.SafeMap.geolocation = {
    iniciar,
    detener,
    getPosicion: () => (ultimaPos ? { lat: ultimaPos.lat, lng: ultimaPos.lng, accuracy: ultimaPos.accuracy } : null),
  };
})();
