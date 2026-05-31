# SafeMap UI/UX Guidelines

## Principios

- **Mobile-first.** Diseñar primero para pantallas pequeñas; el escritorio es
  secundario. Compatibilidad perfecta en iOS Safari y Android Chrome.
- **Una mano, un toque.** Las acciones clave (reportar, filtrar) deben quedar al
  alcance del pulgar. El "reporte de un solo toque" es la acción estelar.
- **Claridad sobre densidad.** El mapa es el protagonista; la UI flota encima
  sin taparlo.
- **Accesibilidad:** contraste suficiente sobre el mapa oscuro, áreas táctiles
  ≥44 px, soporte de teclado y `aria-label` en controles.

## Estética

- **Mapa oscuro** (CartoDB Dark Matter) como base permanente.
- Paleta de acentos por categoría (ver colores en `DATA_MODEL.md`).
- Tipografía legible, jerarquía clara, esquinas suaves, sombras sutiles.
- Animaciones fluidas pero discretas (transform/opacity, evitar reflow).

## Componentes

### Marcador de usuario

- Indicador dinámico estilo Google Maps/Waze (no un círculo estático).
- Refleja con suavidad los cambios de posición y la **precisión del GPS**
  (círculo de exactitud alrededor del punto).
- Transiciones interpoladas entre lecturas de `watchPosition`.

### Filtros de categoría (menú flotante superior)

- Barra/menú flotante estético y responsive arriba del mapa.
- Permite alternar visibilidad por categoría: solo zonas oscuras, solo robos,
  solo sospechoso, o todo.
- Estado activo claramente visible; persistir selección (ej. en `localStorage`).

### Clustering

- Agrupar pines cercanos en un indicador numérico (Leaflet.markercluster).
- El cluster se expande al hacer zoom. Evita saturación con muchos reportes en
  una misma calle.

### Bottom sheet (panel inferior de reportes)

- Panel deslizable: arrastrar hacia abajo oculta, hacia arriba expande.
- Estados sugeridos: colapsado (peek), medio, expandido.
- Gestos táctiles nativos; respetar *safe areas* (notch/`env(safe-area-inset-*)`)
  en iOS.
- Scroll interno sin romper el arrastre del sheet; momentum suave.

## Rendimiento

- Limitar marcadores renderizados al viewport (bbox) + clustering.
- Usar `requestAnimationFrame` para animaciones del marcador de usuario.
- Evitar trabajo pesado en el hilo principal durante el arrastre del sheet.
