# SafeMap Project Brief

SafeMap es una app web móvil de alertas de seguridad urbana en tiempo real.

## Objetivo

Permitir que los usuarios vean, filtren y reporten incidentes urbanos cercanos
en un mapa interactivo, con un flujo de "reporte de un solo toque".

## Usuarios

- Ciudadanos que se mueven por la ciudad (a pie, transporte, bici) y quieren
  conocer zonas de riesgo cercanas en tiempo real.
- Comunidades/barrios que reportan colaborativamente.

## Stack actual

- HTML5
- CSS moderno
- JavaScript vanilla
- Leaflet.js
- CartoDB Dark Tile Layer
- `navigator.geolocation.watchPosition`
- `localStorage` para reportes locales

## Funciones actuales / objetivo cercano

- Mapa oscuro
- Seguimiento de ubicación del usuario (marcador dinámico estilo Waze)
- Reportes locales (de un solo toque)
- Marcadores en el mapa por categoría
- Panel inferior de reportes (bottom sheet)
- Filtros superiores por categoría
- Clustering con Leaflet.markercluster

## Alcance

Dentro de alcance: visualización, reporte, filtrado y caducidad de reportes;
privacidad de ubicación; transición futura a backend/API.

Fuera de alcance (por ahora): cuentas de usuario completas, mensajería entre
usuarios, moderación avanzada, notificaciones push de servidor.

## Prioridades

1. Mobile-first UX
2. Rendimiento del mapa
3. Seguridad y privacidad del usuario
4. Código simple y mantenible
5. Preparar la transición a backend/API
