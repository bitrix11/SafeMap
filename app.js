/* SafeMap — punto de entrada.
   Orquesta el arranque de los módulos en orden. */

(function () {
  function arrancar() {
    window.SafeMap.map.init();        // mapa primero (otros dependen de él)
    window.SafeMap.ui.init();         // interfaz y lista
    window.SafeMap.geolocation.iniciar(); // seguimiento de ubicación

    // Re-render periódico para reflejar caducidad (cada minuto)
    setInterval(() => {
      document.dispatchEvent(new CustomEvent("safemap:reportes-cambio"));
    }, 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }
})();
