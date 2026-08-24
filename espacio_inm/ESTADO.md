# espacio.INM — Estado del proyecto

Módulo de RaumLab para conversión de panoramas: cubemap ↔ equirectangular, 100% del lado del cliente (sin backend, sin almacenamiento de contenido ajeno). Único punto de entrada: `espacio-inm/espacio-inm.html`.

_Última actualización: 2026-08-24_

## Ronda de mobile fixes (2026-08-24)

Contexto: revisión completa del sitio en celular real (iPhone/Safari), a partir de una lista de problemas entregada por la usuaria (`rev1 para móviles.txt`, en la raíz del repo). Regla dura de toda la ronda: **nada de esto debía cambiar el comportamiento de escritorio** — todo gateado detrás de `window.rcIsMobile()` (helper agregado en `raumlab/raumlab-chrome.js`) salvo que se indique lo contrario.

### Hecho y confirmado (o de bajo riesgo, sin reporte de problema)
- Header/footer del chrome compartido (`raumlab-chrome.css`) pasan a opacos en móvil — antes transparentes, dejaban ver el contenido superpuesto al hacer scroll.
- Modos (Crear/Visualizar/Galería/Tutoriales) en pestañas fijas bajo el header en vez de solo dentro del menú hamburguesa; la lista duplicada dentro del hamburguesa se oculta en móvil.
- `--header-h`/`--footer-h` ahora se miden con JS (`syncChromeHeights()`) en vez de estimarse a mano — se autoajustan al alto real del chrome en cualquier dispositivo.
- Bug real encontrado y corregido en `raumlab-chrome.js`: el cierre automático del menú hamburguesa al elegir un modo no andaba para espacio_INM porque sus botones usan el atributo `data-mode` y el listener solo escuchaba `data-modo` (trans_FORMA). Ahora escucha ambos. (Este fix es universal, no solo mobile — corrige un bug real preexistente.)
- Espacio vacío de más entre el header y el contenido en las 4 pantallas (Crear/Visualizar/Galería/Tutoriales): causa era un padding-top duplicado (`#app-main` + `.tool-main`/`.instr-layout`, ambos sumando `--header-h`). Corregido en `espacio-inm.css`.
- Flash de fondo azul en vez de `fondo.jpg`: overscan agregado a `.rc-bg-layer` en móvil (probable causa: el cambio de alto del viewport al mostrar/ocultar la barra de direcciones de Safari).
- Tope de resolución de textura en móvil (2048px de lado) agregado en `qualitySize()` y en `compositeWithBackground()` — medida defensiva contra fallos silenciosos de textura en GPUs de celular con imágenes grandes. **No era la causa del bug de canal alfa** (ver más abajo), pero se dejó como resguardo razonable.

### Falsa alarma investigada a fondo — canal alfa
La usuaria reportó que el canal alfa (transparencia) no se respetaba en móvil, ni en Visualizador ni en RA de espacio_INM, ni en el editor de in_SITE. Se investigó extensamente: tamaño de textura, presión de memoria de GPU (`setPixelRatio`), configuración de material de Panolens (confirmado correcto leyendo su código fuente: `alpha:true`, `transparent:true`). **Causa real: la imagen de prueba se había enviado por WhatsApp, que convierte PNG a JPEG (sin canal alfa) al comprimir.** No era un bug de código. Ningún cambio de los hechos durante la investigación (tope de resolución, pixelRatio) resultó necesario para esto — se mantuvieron igual como medidas preventivas de bajo riesgo.

### Pantalla completa de "Ver en RA" — historia larga, estado incierto
Pedido: al activar RA, poder ver la cámara en pantalla completa del teléfono (no solo en el visor chico embebido). Se intentó varias veces:
1. `requestFullscreen()` nativo solo — no funcionó (Safari/iOS tiene soporte muy limitado de la Fullscreen API para elementos que no sean `<video>`).
2. CSS (`position:fixed` + `dispatchEvent(new Event('resize'))`) — la imagen quedaba distorsionada/forzada. Causa: Panolens no escucha el evento `resize` de `window` por su cuenta.
3. CSS + `viewer.onWindowResize()` (el método real de Panolens, confirmado leyendo su código fuente no minificado) — seguía fallando ("imagen fija arriba"). Causa real encontrada: el proyecto ya trae, **desde el commit inicial (no es código de esta ronda)**, un `ResizeObserver` en `espacio-inm.js` (busca `IDS_CONTENEDOR_VISOR`/`VIEWER_POR_ID`) que fuerza una altura 16:9 por estilo inline en cada resize de los 4 visores — peleaba con el alto de pantalla completa que se quería imponer.
4. **Estado actual (commit `de86eb8`)**: botón dedicado **"⛶ Pantalla completa"**, separado de "Ver en RA" (para que la Fullscreen API tenga su propio gesto de usuario limpio). Ancho/alto se calculan en píxeles exactos por JS (`window.innerWidth/innerHeight`, no `vh`/`dvh`) y se recalculan en `resize`/`orientationchange`/`fullscreenchange`. El `ResizeObserver` existente ahora respeta una clase (`.rc-ar-fullscreen`) y no fuerza el 16:9 mientras está puesta — en cualquier otro caso, incluido todo el comportamiento de escritorio, sigue exactamente igual que siempre. Los botones "Salir de RA"/"✕ Salir de pantalla completa" flotan con fondo oscuro opaco (antes eran transparentes y quedaban invisibles sobre la cámara/panorama).

**Esto último NO está confirmado en dispositivo real todavía** — es la tarea pendiente más importante de este módulo. Si se prueba y sigue fallando, la recomendación es no seguir iterando a ciegas (ya fueron 4 intentos): conseguir acceso a la consola real del navegador (Mac + Safari conectado por cable al iPhone, Safari > Desarrollo > [nombre del iPhone]) para ver el error/comportamiento real en vez de seguir adivinando.

## Unificación con in_SITE/trans_FORMA (2026-08-23)

- Pestaña "Colección" renombrada a **"Galería"** en subnav, panel de
  navegación mobile, y contenido de Tutoriales — unifica el nombre con
  in_SITE (que tenía "Galería RaumLab", también acortado a "Galería" hoy).
  Los ids internos (`mode-coleccion`, `instr-coleccion`, `COLLECTION_EXAMPLES`)
  no cambiaron, solo el texto visible.

(La lista de Tutoriales, `.instr-nav-item`, quedó tal como estaba — texto
plano + acento de borde izquierdo al elegir un modo. Eso NO es lo que pedía
el usuario en este punto.)

- **`.collection-card` (lista de piezas dentro de Galería) rehecha para
  igualar `.pieza-card` de in_SITE**: era `<div>` con miniatura (`<img>`,
  aspect-ratio 4:3) + título + botón "Ver" aparte. Ahora es un `<button>`
  tipográfico (sin miniatura) donde toda la tarjeta es el área de click —
  se sacó el botón "Ver". `COLLECTION_EXAMPLES` perdió el campo `thumb`
  (ya no se usa; el archivo `coleccion/oteiza/miniatura.jpg` queda en disco
  sin referenciar). Se agregó estado `.active` (no existía antes) para
  marcar qué pieza está cargada en el visor — mismo patrón que
  `seleccionarPieza` en `in_site/js/coleccion.js`. espacio_INM no tiene
  campo "año" (in_SITE sí, y lo conserva) — decisión del usuario: no
  agregarlo acá, las cards quedan asimétricas en ese dato puntual. Tamaño
  de letra del título: 0.78rem en los dos módulos (ya era ese valor en
  espacio_INM; in_SITE bajó de 1.1rem).

## Estructura

```
espacio_inm/
├── espacio_INM (mejoras).txt      ← lista original de mejoras pedidas
├── ESTADO.md                      ← este archivo
└── espacio-inm/
    ├── espacio-inm.html
    ├── espacio-inm.css
    ├── espacio-inm.js
    ├── fondos/                    ← presets de fondo (entorno.jpg, entorno2.jpg, entorno3.jpg)
    └── coleccion/
        └── oteiza/                ← primer ejemplo de la Colección RaumLab
```

## Modos (fila superior)

### Creación
Dos sub-pestañas:

**CM → EQ** (cubemap → equirectangular), layout de 3 columnas:
- **Izquierda** (carga/exportación): nombre de proyecto (compartido con EQ→CM), modo de carga (**6 caras** / **Mapa de cubos**), Crear, Descargar, resolución, botón **Cerrar proyecto**.
- **Centro**: pestañas internas *Construcción* (diagrama en cruz de las 6 caras, o subida de imagen única 4:3) / *Vista previa* (visor del panorama armado — se activa sola al terminar "Crear").
- **Derecha** (edición): editor de cara seleccionada (clic en un cuadrante → rotar ±90°, espejar vertical/horizontal, reemplazar imagen), orientación inicial (4 botones), toggle "Incluir transparencia", selector de fondo (Ninguno / 3 presets / subida propia).

**EQ → CM** (equirectangular → cubemap): sube un equirectangular (valida 2:1), lo visualiza, genera y descarga un ZIP con las 6 caras.

### Visualizador
Sube un equirectangular (valida 2:1) y lo muestra en un visor propio. Columna derecha: orientación inicial, selector de fondo, botón "Ver en RA".

### Galería (pestaña, antes "Colección"; internamente sigue siendo "Colección RaumLab")
Galería de proyectos propios de RaumLab (arranca con la "caja vacía de Oteiza"). Visor propio (sin selector de fondo — son ejemplos ya cerrados). Botón "Ver en RA" también disponible acá. Agregar un ejemplo nuevo es sumar una entrada al array `COLLECTION_EXAMPLES` en el JS y colocar los archivos en `coleccion/<nombre>/`.

### Instrucciones (pestaña "Tutoriales")
Contenido real (2026-08-23, rediseñado el mismo día tras feedback del
usuario). Vive dentro de `mode-ayuda` en `espacio-inm.html` (no es una página
aparte, a diferencia de in_SITE). Layout: lista de modos a la izquierda
(`.instr-nav`, tarjetas con borde — Crear/Visualizar/Galería) + panel de contenido
al centro (`.instr-panel`) que muestra las instrucciones del modo elegido;
arranca sin nada seleccionado, mostrando el texto general ("¿Qué es
espacio_INM?"), sin vuelta a ese texto una vez elegido un modo (salvo
recargar — mismo criterio que el resto de los flujos "modo elegido, sin
vuelta" del sitio). Notas que aplican a más de un modo (Realidad Aumentada)
están duplicadas dentro de cada modo relevante, no en un ítem aparte.
Conectado con `wireSwitcher('.instr-nav-item', 'instr', '.instr-body')` en
`espacio-inm.js` — reutiliza el helper genérico que ya usaba el módulo para
`.mode-btn`/`.tab-btn`, no un manejador nuevo. Clases en `espacio-inm.css`:
`.instr-layout`, `.instr-nav`, `.instr-nav-item`, `.instr-panel`,
`.instr-body`. Primer borrador de esta versión, no verificado aún en
navegador real (mismo bloqueo de entorno que el resto del proyecto).

La primera versión (una sola columna de secciones apiladas, sin lista de
modos) se descartó por decisión del usuario — quedaba como una columna de
texto pegada a la izquierda en vez de aprovechar el layout de rail+panel que
ya usa el resto del módulo.

## Bugs no obvios encontrados durante el desarrollo (vale la pena recordarlos si algo se rompe)

- **Panolens sin versión fijada** traía una build rota (`process.env...`, variable de Node inexistente en el navegador). Se fijó `panolens@0.12.1` + shim de `process`.
- **`CubeTextureLoader` usa `RGBFormat` por defecto** (sin alfa) — hay que forzar `cube.format = THREE.RGBAFormat` después de cargar.
- **`Viewer.remove(panorama)` de Panolens no limpia `this.panorama`** — la segunda vez que se recompone un panorama, no se activa (queda invisible/negro) salvo que se llame `viewer.setPanorama(panorama)` explícitamente.
- **Especificidad CSS**: `.tab-content.active`/`.mode-content.active` (2 clases) le ganaba a `.tool-main` (1 clase) sin importar el orden — el layout de 3 columnas no se veía como grid hasta corregir esto.
- **Botones `<button>` sin `padding:0`** dejan un margen invisible del navegador — rompía el "cubo pegado" del diagrama.
- **El fondo se compone contra el `setClearColor` interno del visor de Panolens**, no contra el `background` CSS del contenedor — hay que setearlo en blanco ahí también.
- **El volteo del fondo en la descarga es distinto al del visor** (`'horizontal'` vs `'vertical'`) porque la descarga es un archivo plano que nunca pasa por la compensación de Panolens.

## Pendiente

### Prioritario
1. **Confirmar en dispositivo real si la pantalla completa de "Ver en RA" funciona** (commit `de86eb8`, ver sección "Ronda de mobile fixes" arriba) — botón dedicado + píxeles exactos por JS + coordinación con el `ResizeObserver` existente. Cuatro intentos previos fallaron; este es el quinto, sin confirmar todavía. Si vuelve a fallar, conseguir acceso a la consola remota del navegador (Mac + Safari > Desarrollo > iPhone) antes de seguir iterando a ciegas.
2. RA en sí (cámara real + `DeviceOrientationControls` de Panolens) ya está confirmado funcionando en el visor de tamaño normal — lo que falta validar es específicamente la pantalla completa (punto 1).

### Verificaciones en navegador que quedaron sin confirmar explícitamente
- Rotar (±90°) y espejar (vertical/horizontal) por cara.
- Toggle "Incluir transparencia": que oculte el selector de fondo al destildar y lo muestre de nuevo al tildar.
- Los 4 botones de orientación inicial — **las etiquetas Front/Right/Back/Left son una suposición matemática, no confirmada contra la cara real** (puede necesitar reordenamiento).
- Las 3 validaciones de relación de aspecto (1:1 por cara, 4:3 mapa de cubos, 2:1 equirectangular) bloqueando correctamente con imágenes fuera de rango.

### Backlog explícitamente diferido
- **Difuminado de costuras** (seam blending) en el equirectangular resultante — el usuario pidió dejarlo pendiente.
- **`URL.createObjectURL` sin `revokeObjectURL`** — fuga de memoria menor en sesiones muy largas con muchas subidas, no priorizada todavía.

### Descartado
- Compartir una panorámica por enlace — incompatible con no almacenar contenido ajeno en el sitio; la app termina en "Crear → Descargar", compartir queda en manos del usuario con su propio hosting.
