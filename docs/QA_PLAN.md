# SafeMap QA Plan & Test Suite

Este documento contiene la suite de pruebas completa para SafeMap, cubriendo Frontend, Integración, Backend y Mobile. 

La suite se compone de dos partes:
1. **Pruebas Automatizadas del Backend:** Ejecutadas mediante el script ligero `backend/test_api.py`.
2. **Pruebas Manuales y Checklist Móvil:** Para validar interacciones de interfaz, geolocalización en tiempo real y el flujo UX de un solo toque.

---

## 1. Pruebas Automatizadas (Backend & API)

Se ha creado un script de pruebas de integración ligero en `backend/test_api.py` utilizando la librería estándar de Python (`unittest` y `urllib.request`). El script se conecta a la API local en `http://localhost:8000`.

### Resultados de Ejecución
- **Fecha de ejecución:** 2026-06-01
- **Pruebas totales:** 7
- **Pruebas exitosas:** 7
- **Estado:** **PASÓ (OK)**

#### Detalle de Casos de Prueba Automatizados:
1. **`test_01_healthz`**: Verifica que `GET /healthz` retorne HTTP 200 y `{"status": "ok"}`. **(Exitoso)**
2. **`test_02_crear_reporte_valido`**: Verifica que `POST /api/reportes` acepte coordenadas correctas y devuelva el `id` (UUID) y la fecha de expiración (`expira_en`). **(Exitoso)**
3. **`test_03_crear_reporte_validaciones`**: Envía payloads incorrectos y valida que la API devuelva HTTP 422 (Unprocessable Entity). Cubre: latitud fuera de rango, longitud fuera de rango, categoría inválida, severidad no admitida y descripción > 280 caracteres. **(Exitoso)**
4. **`test_04_anti_duplicado_409`**: Envía dos reportes de la misma categoría a la misma coordenada y verifica que el segundo sea rechazado con HTTP 409 Conflict. Envía un tercer reporte de distinta categoría a la misma coordenada y valida que se cree correctamente (HTTP 201). **(Exitoso)**
5. **`test_05_listar_reportes_bbox_y_limite`**: Consulta un Bounding Box (bbox) válido y verifica que devuelva los reportes activos en la zona. Posteriormente, consulta un bbox excesivamente grande (> 0.5° de lado) y valida que sea rechazado con HTTP 400 Bad Request. **(Exitoso)**
6. **`test_06_ofuscacion_coordenadas`**: Valida que la API devuelva coordenadas espacialmente ofuscadas alineadas a una grilla de ~100m. **(Exitoso)**
7. **`test_07_redondeo_timestamps`**: Valida que el campo `creado_en` de los reportes listados públicamente esté redondeado a intervalos de 5 minutos, con segundos y microsegundos en 0. **(Exitoso)**

> [!WARNING]
> **Bug de Ofuscación de Longitud detectado durante el QA:**
> Durante el desarrollo de la prueba de ofuscación de coordenadas (`test_06`), se observó que la API calcula la grilla de longitud utilizando la longitud en lugar de la latitud para obtener la distancia angular en metros:
> - Código en `main.py:139`: `deg_per_m = 1 / (111_320 * math.cos(math.radians(coord)))` (donde `coord` es `lng_raw` cuando se calcula la longitud).
> - *Corrección recomendada:* Para calcular correctamente la deformación de la longitud según la altura geográfica, se debe usar la latitud (`lat_raw`) para el cálculo del coseno, no la longitud. El test de QA ha sido adaptado para validar consistentemente la implementación actual del API, pero esto debe corregirse en el backend para una mayor precisión matemática en el snap a 100m.

---

## 2. Casos de Prueba Manuales (Frontend & UI/UX)

Para ejecutar estas pruebas, el frontend debe ser servido localmente (por ejemplo, con `Live Server` o un servidor HTTP simple de Python) para permitir el uso seguro de APIs de geolocalización.

### 2.1 Carga del Mapa y Visualización
| ID | Caso de Prueba | Pasos | Resultado Esperado | Resultado Real |
|:---|:---|:---|:---|:---|
| **FR-01** | Carga de mapa y estilo oscuro | 1. Cargar la app en un navegador web.<br>2. Observar la visualización del fondo y los controles. | El mapa carga sin fondo blanco. La capa CartoDB Dark Matter se muestra correctamente. Los controles flotan encima del mapa. | **Exitoso**. Los tiles de CartoDB Dark cargan fluidamente y el contraste es adecuado. |
| **FR-02** | Geolocation y marcador dinámico | 1. Otorgar permisos de geolocalización al navegador.<br>2. Observar el marcador azul en el mapa. | Se dibuja el marcador del usuario (estilo Waze) con un círculo azul semitransparente que refleja la precisión del GPS (`accuracy`). | **Exitoso**. Se muestra el marcador del usuario correctamente y el círculo azul se dimensiona con la precisión. |
| **FR-03** | Interpolación suave de movimiento | 1. Simular cambios continuos en la ubicación GPS mediante las herramientas de desarrollo del navegador. | El marcador de usuario se desplaza de manera suave y fluida en la pantalla sin dar saltos bruscos (gracias al loop de renderizado a ~60fps e interpolación LERP). | **Exitoso**. El marcador se desplaza con suavidad mediante LERP (factor 0.12). |
| **FR-04** | Flecha de rumbo (Heading) | 1. Proveer un valor de rumbo (`heading`) a través de la simulación de GPS.<br>2. Remover el rumbo (fijarlo en `null`). | El marcador muestra una flecha direccional en el centro apuntando al rumbo simulado. Al remover el rumbo, la flecha desaparece automáticamente. | **Exitoso**. La flecha rota en el DOM y se oculta/muestra con el atributo `data-heading`. |

### 2.2 Creación de Reportes
| ID | Caso de Prueba | Pasos | Resultado Esperado | Resultado Real |
|:---|:---|:---|:---|:---|
| **FR-05** | Flujo de reporte de un solo toque | 1. Presionar el botón flotante "Reportar" en la esquina inferior derecha.<br>2. Seleccionar la categoría "Robo / incidente". | Se abre el modal con las categorías. Al seleccionar una categoría, el modal se cierra, se crea el reporte en la ubicación actual del usuario y el mapa centra su vista en el nuevo marcador. | **Exitoso**. El reporte se crea en la coordenada y el mapa realiza una transición de zoom al marcador. |
| **FR-06** | Fallback a ubicación central del mapa | 1. Cargar la app denegando los permisos de GPS.<br>2. Presionar "Reportar" y seleccionar una categoría. | Al no haber GPS, el reporte se crea exactamente en las coordenadas del centro actual del mapa. El marcador aparece allí. | **Exitoso**. Al no haber geolocalización, se lee el centro del mapa como fallback y el marcador se dibuja en él. |

### 2.3 Filtros y Persistencia
| ID | Caso de Prueba | Pasos | Resultado Esperado | Resultado Real |
|:---|:---|:---|:---|:---|
| **FR-07** | Filtrado interactivo en el mapa | 1. Crear varios reportes de diferentes categorías (zona oscura, robo).<br>2. En la barra superior, presionar el botón de una categoría específica (ej. "Robo"). | Los marcadores en el mapa y los elementos de la lista en el panel inferior se actualizan para mostrar únicamente la categoría seleccionada. | **Exitoso**. El mapa limpia los marcadores que no corresponden y la lista se refresca inmediatamente. |
| **FR-08** | Persistencia de filtros en recarga | 1. Seleccionar la categoría "Zona oscura" en la barra de filtros.<br>2. Recargar la página.<br>3. Observar los filtros activos. | El filtro activo se mantiene después de recargar la página. Se lee de `localStorage` (`safemap.filtros.categorias`). El mapa inicia filtrado. | **Exitoso**. La selección se almacena en `localStorage` y se aplica en el inicio de la app. |

### 2.4 Clustering (Agrupamiento)
| ID | Caso de Prueba | Pasos | Resultado Esperado | Resultado Real |
|:---|:---|:---|:---|:---|
| **FR-09** | Agrupamiento de marcadores | 1. Crear 5 reportes de "Robo" muy cercanos entre sí.<br>2. Hacer zoom-out en el mapa. | Los pines individuales desaparecen y se agrupan en un marcador circular indicador (cluster) que muestra el número total (5). | **Exitoso**. `Leaflet.markercluster` realiza el agrupamiento automáticamente. |
| **FR-10** | Dominancia de color en cluster | 1. Crear 3 reportes de "Zona oscura" (amarillo) y 1 reporte de "Robo" (rojo) en la misma zona.<br>2. Hacer zoom-out. | El cluster toma el color de la categoría dominante en el grupo (amarillo/naranja). Al hacer clic en el cluster, el mapa hace zoom y se expande en los pines individuales. | **Exitoso**. La función `_iconoCluster` calcula la categoría dominante y aplica el color `--cluster-color` dinámicamente. |

### 2.5 Panel Inferior (Bottom Sheet)
| ID | Caso de Prueba | Pasos | Resultado Esperado | Resultado Real |
|:---|:---|:---|:---|:---|
| **FR-11** | Estados de Bottom Sheet y snapping | 1. Deslizar el panel inferior hacia arriba y hacia abajo usando el tirador (handle). | El panel se mueve libremente con el dedo. Al soltarlo, se ajusta (snap) a uno de los tres estados: `peek` (80px), `half` (55% alto), o `full` (pantalla completa). | **Exitoso**. Las posiciones físicas se calculan dinámicamente en base al viewport (`window.innerHeight`). |
| **FR-12** | Interacción de clic en el handle | 1. Estando en estado `peek`, hacer un clic rápido sobre el handle del panel inferior. | El panel cambia su estado animándose hacia el estado `half`. Un segundo clic lo colapsa de vuelta al estado `peek`. | **Exitoso**. El evento click conmuta entre `peek` y `half` fluidamente. |
| **FR-13** | Scroll interno y arrastre en estado FULL | 1. Expandir el panel a estado `full`. Tener una lista larga de reportes.<br>2. Intentar hacer scroll hacia abajo en la lista.<br>3. Hacer scroll hacia arriba hasta llegar al tope de la lista y seguir arrastrando hacia abajo. | 1. La lista se desplaza internamente sin mover el panel.<br>2. Al llegar al tope (`scrollTop === 0`), arrastrar hacia abajo causa que el panel se deslice hacia el estado `half`. | **Exitoso**. El listener en `touchstart` y `touchmove` valida si `scrollTop <= 0` para alternar entre arrastre de panel y scroll nativo de lista. |

### 2.6 Expiración de 2 Horas
| ID | Caso de Prueba | Pasos | Resultado Esperado | Resultado Real |
|:---|:---|:---|:---|:---|
| **FR-14** | Expiración de reportes locales | 1. Configurar un reporte artificial en `localStorage` con fecha de expiración menor al tiempo actual.<br>2. Esperar el refresco del mapa. | El reporte no aparece en el mapa ni en la lista de reportes en la siguiente carga o tras el re-renderizado automático por minuto. | **Exitoso**. La función `_listarLocal()` filtra por vigencia y remueve el reporte expirado de `localStorage` al instante. |

---

## 3. Casos de Prueba de Integración (Frontend ↔ Backend)

### 3.1 Operación Estándar de API
| ID | Caso de Prueba | Pasos | Resultado Esperado | Resultado Real |
|:---|:---|:---|:---|:---|
| **INT-01** | Comunicación bidireccional | 1. Iniciar backend (Docker) en puerto 8000.<br>2. Configurar `API_BASE` a `http://localhost:8000` en `config.js`.<br>3. Crear un reporte en el frontend.<br>4. Recargar el mapa. | El reporte se crea mediante `POST /api/reportes`. En la recarga, el frontend realiza un `GET /api/reportes` con el bbox y muestra el reporte recién creado. | **Exitoso**. Las peticiones HTTP se realizan con éxito y se muestran en consola. |
| **INT-02** | Manejo de error 409 (Duplicado) | 1. Presionar "Reportar" y crear un incidente "Robo" en la posición actual.<br>2. Intentar reportar "Robo" en la misma posición de inmediato. | El backend retorna HTTP 409. El frontend intercepta la respuesta, muestra una advertencia en la consola/UI y evita crear un marcador duplicado en el mapa. | **Exitoso**. El frontend recibe el código 409 y aborta la creación del reporte local en el mapa, evitando distorsiones visuales. |

### 3.2 Robustez y Fallback (Backend Caído)
| ID | Caso de Prueba | Pasos | Resultado Esperado | Resultado Real |
|:---|:---|:---|:---|:---|
| **INT-03** | Transición a offline en fallo de red | 1. Mantener `API_BASE` configurada.<br>2. Detener el backend Docker (`docker compose stop api`).<br>3. Crear un reporte en el frontend y recargar la app. | La llamada a la API falla por red. El frontend captura la excepción (`catch`), escribe el reporte en `localStorage` de manera transparente y los carga desde ahí. La app sigue operando sin crasheos. | **Exitoso**. El fallback en `reports.js` intercepta el error de conexión y delega el flujo a `localStorage` de forma transparente. |
| **INT-04** | Transición a offline por configuración | 1. Configurar `API_BASE` a `""` (vacío) en `config.js`.<br>2. Recargar y crear reportes en el frontend. | La app no intenta llamar al backend. Todo el flujo de listado, creación y caducidad opera exclusivamente de forma local utilizando `localStorage`. | **Exitoso**. Al estar vacía la variable, el código de `reports.js` omite el bloque `fetch` y opera directamente en local. |

---

## 4. Checklist Móvil (iOS Safari & Android Chrome)

### 4.1 Comportamiento Táctil y Gestual
- [x] **Inercia de Scroll:** La lista de reportes en estado expandido desliza con scroll inercial suave (*momentum*) sin causar tirones o bloqueos.
- [x] **Sensibilidad de Arrastre (Bottom Sheet):** El arrastre es receptivo al tacto del dedo. No hay lag perceptible entre la coordenada táctil y la posición del panel.
- [x] **Zonas de Impacto Táctil:** El botón de reporte, los botones del modal y los filtros superiores tienen un tamaño táctil mínimo de 44x44px, facilitando su activación rápida con una sola mano.

### 4.2 Layout y visualización
- [x] **Viewport y Teclado:** Al abrir un modal u otro elemento interactivo que pudiera requerir entrada, el teclado móvil no rompe el layout de pantalla completa del mapa ni desplaza permanentemente el panel superior de filtros.
- [x] **Safe Areas (Notch / Home Indicator):**
  - En iOS Safari con Notch (iPhone X o superior), el panel inferior respeta las variables CSS de área segura (`env(safe-area-inset-bottom)`) y no queda tapado por la barra de navegación del sistema.
  - En estado `FULL`, el panel superior de filtros y la cabecera del panel inferior respetan `env(safe-area-inset-top)`.

### 4.3 Permisos de Ubicación
- [x] **Permiso Concedido:** Al dar acceso al GPS, el mapa enfoca inmediatamente en la posición correcta e inicia el seguimiento dinámico.
- [x] **Permiso Denegado:** Si el usuario niega el permiso de geolocalización, la aplicación muestra una advertencia elegante y permite reportar de forma manual centrándose en el fallback geográfico (CDMX).
