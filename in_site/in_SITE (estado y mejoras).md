# in_SITE — Estado del proyecto y hoja de ruta

_Actualizado: 27/08/2026_

## Ficha técnica: dimensiones automáticas + instalación opcional (2026-08-27)

Reporte: no había campo de dimensiones al completar la ficha de una pieza,
y el JSON exportado (`buildAttributesData()` en `js/editor.js`) siempre
mostraba "Dimensiones variables" en el visor — `motorVisor.js` caía a ese
fallback porque `ficha_tecnica.dimensiones` nunca se llenaba.

- **Dimensiones**: no se agregó un campo para tipear — se calculan solas
  a partir del tamaño real de la pieza en la sala (`formatDimensiones()`,
  mismo cálculo que ya usaba `actualizarInputsDimension()`:
  `escala × baseSize`, de metros a cm). Así nunca se desincroniza de cómo
  se ve la pieza. Para "cuadro" (plano, sin Z real) muestra solo ancho ×
  alto; para "escultura", ancho × alto × profundidad.
- **Instalación**: nuevo checkbox "Incluir en la ficha exportada" junto al
  campo de texto (`meta-instalacion-incluir`) — no siempre corresponde
  incluirlo. Se guarda en `userData.incluirInstalacion` (default `true`,
  compatible con proyectos guardados antes de este cambio) y se respeta
  tanto en la exportación pública (`buildAttributesData()`) como en
  Guardar/Cargar Proyecto.

## Botón "Ver en Espacio Real" aligerado (2026-08-23)

`#ar-button` (`css/viewer.css`, usado por Visualizador y Galería vía el
mismo motor) tenía `background: rgba(13, 27, 46, 0.8)` — casi
`--bg-navy` opaco, un bloque sólido pesado y distinto del resto de los
botones del sitio. Pasó a `rgba(255, 255, 255, 0.08)` + `backdrop-filter:
blur(6px)`, mismo criterio transparente/con blur que el resto (cards,
`.instr-nav-item`, etc.). También se sacó el `box-shadow` duro
(`0 4px 15px rgba(0,0,0,0.2)`) que sumaba a esa sensación de bloque. El
hover (invierte a fondo blanco sólido) no se tocó.

## Unificación con espacio_INM/trans_FORMA (2026-08-23)

- "Galería RaumLab" (nombre de `coleccion.html` en subnav, panel de
  navegación mobile, título de página, y contenido de Tutoriales) se acortó
  a **"Galería"** — unifica el nombre con espacio_INM (que tenía
  "Colección", renombrada también hoy a "Galería"). El archivo sigue
  siendo `coleccion.html`, solo cambió el texto visible.
- El título de la lista de piezas dentro de `coleccion.html` pasó de
  "Piezas y Escenas" a **"RaumLab"** (`.sidebar-section-title`, ya
  mayúsculas por CSS) — mismo texto/criterio que el `<h3
  class="settings-heading">RaumLab</h3>` que ya tenía espacio_INM sobre su
  propia grilla de colección.
(La lista de Tutoriales, `.instr-nav-item`, quedó tal como estaba — texto
plano + acento de borde izquierdo al elegir un modo. Eso NO era lo que
pedía el usuario en este punto.)

- **`.pieza-card-titulo` bajó de 1.1rem a 0.78rem** (`css/coleccion.css`) —
  para igualar el tamaño que ya usaba `.collection-card h3` en espacio_INM,
  que se tomó como referencia (no se subió el tamaño de espacio_INM, se
  bajó el de acá). `.pieza-card-anio` no cambió — in_SITE conserva el año
  donde la pieza lo tenga; espacio_INM no tiene ese dato y no lo suma.
  espacio_INM copió el resto de este componente (tarjeta tipográfica sin
  miniatura, card entera clickeable, estado `.active`) para su propia
  `.collection-card` — ver su ESTADO.md.

## Tutoriales (2026-08-23) — reskin completo + reestructura

`instrucciones.html` tenía su propia estética clara/Georgia (paleta oliva
`--color-oliva`/`--color-oscuro`, sin header/nav/footer compartidos) — la
única pantalla de todo el sitio sin el shell oscuro de RaumLab. Se
reconstruyó de cero: mismo `<head>`/header/nav-panel/footer/scripts que
`coleccion.html` (`css/styles.css` + `raumlab-chrome.css` + su propio CSS de
página), etiquetas del subnav actualizadas a como están hoy (Proyectos /
Visualizador / Galería RaumLab / Tutoriales — el borrador anterior tenía
nombres viejos, "Galería"/"Colección rraum.LAB").

Contenido reestructurado además: ya no es una columna de secciones apiladas
(qué es + tarjetas de modos + paso a paso + notas, todo seguido) — ahora es
lista de modos a la izquierda (`.instr-nav`: Proyectos / Visualizador /
Galería RaumLab) + panel central (`.instr-panel`) con las instrucciones del
modo elegido. Arranca sin nada seleccionado, mostrando el texto general
("¿Qué es in_SITE?"), sin vuelta a ese texto salvo recargar. La nota sobre
video (reproducción en vivo vs. imagen fija en RA) está duplicada dentro de
los 3 modos porque aplica a los 3; la guía de compresión (30MB) solo vive en
Proyectos, que es donde se sube el archivo. Mismo patrón (`.instr-layout`,
`.instr-nav`, `.instr-nav-item`, `.instr-panel`, `.instr-body`) que
`espacio_INM`/`trans_FORMA`, así los 3 módulos quedan visualmente
consistentes — con `position:fixed` en vez de `flex:1` porque acá no hay un
contenedor de SPA que ya resuelva el alto (mismo criterio que
`#editor-layout`/`#viewer-layout` de `module-shell.css`). Wiring de clicks
en un `<script>` inline al final de `instrucciones.html` (página estática
sin JS propio hasta ahora). Primer borrador de esta versión, no verificado
aún en navegador real.

Herramienta para armar y visualizar salas expositivas virtuales en 3D. Pensada
originalmente para muestras de arte; también sirve como recurso para entornos
pedagógicos y educativos.

Sitio estático (HTML/JS/CSS plano, sin build ni framework, sin backend). Todo
corre en el navegador del usuario — ningún dato de nadie llega al operador del
sitio. Motor 3D: Three.js. Realidad Aumentada: `<model-viewer>`.

---

## Estructura actual

```
index.html          → portada (Proyectos / Galería / Colección rraum.LAB / Instrucciones)
editor.html          → modo Proyectos (armar la sala)
viewer.html           → modo Galería (cargar y ver tu propia escena)
coleccion.html         → modo Colección rraum.LAB (piezas del estudio, ya armadas)
instrucciones.html      → modo Instrucciones (ayuda)

css/
  styles.css        → reset y variables globales compartidas
  portada.css / editor.css / viewer.css / coleccion.css / instrucciones.css → por página

js/
  editor.js         → lógica completa del editor
  motorVisor.js     → motor de visualización compartido (Three.js + RA + panel curatorial + video)
  viewer.js         → conecta el motor con la carga de archivos propios (Galería)
  coleccion.js      → conecta el motor con la grilla de piezas fijas (Colección)

projects/           → piezas/escenas de la Colección rraum.LAB (.glb + .json opcional)
```

---

## Trabajo realizado en esta ronda

### Housekeeping inicial
- Eliminados `js/app.js`, `js/sceneStore.js`, `models/escena_prueba.glb` (código huérfano, sin uso).
- CSS que vivía embebido en cada `<style>` del HTML, extraído a archivos propios por página.
- Corregida la transparencia de PNG en los cuadros 2D (faltaba `transparent: true`).
- Corregido un enlace roto en el selector de galerías (`serie_espejos.glb`, archivo inexistente).

### Persistencia de proyectos
- **Guardar Proyecto / Cargar Proyecto**: exporta/reimporta el proyecto completo y editable (imágenes, videos y modelos `.obj` embebidos), para retomar la edición en otra sesión — antes solo existía la exportación final, sin forma de volver a editar.

### Exportación unificada
- Un solo botón **Exportar** abre un modal: nombre de la sala, incluir o no el plano base, exportar o no el `.json` de fichas técnicas vinculado. Antes eran dos botones separados y el piso siempre se exportaba.

### Edición de piezas
- **Dimensiones reales (m)** por eje (ancho/alto/profundo) con candado de "mantener proporción", en vez de un único campo de escala abstracta.
- **Rotación en los 3 ejes** (antes solo Y).
- **Miniaturas de piezas**: panel con la lista de piezas de la sala, click para seleccionar (antes solo se podía seleccionar clickeando directo en la escena 3D).
- **Igualar posición con otra pieza**: copia la coordenada X/Y/Z exacta de otra pieza ya ubicada — reemplaza un intento de magnetismo automático que no resultó práctico con el gizmo de un eje a la vez (documentado como decisión, no como bug).
- Nuevo campo de ficha técnica: **especificaciones de traslado y montaje**.

### Video
- Soporte de video en superficies 2D, con reproducción real (textura en vivo) tanto en el editor como en la vista de escritorio de Galería/Colección.
- En Realidad Aumentada el video se ve como una imagen fija — **limitación del formato `.glb`, no de la aplicación** (la RA depende del sistema operativo del celular, que solo puede leer el archivo estático).
- Límites de tamaño para evitar que el navegador se quede sin memoria: aviso arriba de 30 MB, bloqueo arriba de 60 MB.
- Corregidos varios bugs encadenados: poster (frame fijo) que salía negro, nombres de pieza que no coincidían entre el `.glb` y el `.json` (por ejemplo con nombres de archivo de WhatsApp, que tienen puntos en la marca de hora).

### Vista previa
- Se muestra **dentro del propio editor** (modal con su propio visor), en vez de abrir `viewer.html` en otra pestaña — el mecanismo anterior podía dejar al usuario sin forma de volver al editor en ciertos navegadores.

### Motor de visualización (Galería/Colección)
- Migrado de `<model-viewer>` a **Three.js puro** para la vista de escritorio, específicamente para que el video funcione como textura 3D real (se inclina con la pared) en vez de un cartel plano siempre de frente a cámara.
- La Realidad Aumentada sigue funcionando exactamente igual que antes — mismo `<model-viewer>`, mismos `ar-modes`, ahora invisible en el fondo y disparado por un botón propio.
- Motor extraído a un módulo compartido (`js/motorVisor.js`) que usan tanto Galería como Colección, para no duplicar código.

### Reestructuración de navegación
- De 2 accesos (Galerías/Proyectos) a 4: **Proyectos, Galería, Colección rraum.LAB, Instrucciones**.
- **Colección rraum.LAB**: página nueva con grilla de tarjetas (tipográficas, sin foto) para elegir y visitar las piezas del estudio directamente, sin subir archivos.
- **Instrucciones**: página nueva con un primer borrador de contenido — qué es in_SITE, los 4 modos, paso a paso para armar una sala, nota sobre el comportamiento del video. Falta revisión/ajuste de texto.

---

## Pendiente de verificación

Esta sesión no tuvo acceso a un navegador real para probar (sin Node/Python/
herramientas de automatización disponibles) — todo lo de video y la migración
del motor a Three.js se hizo mediante revisión de código y se fue corrigiendo
en base a las pruebas que hiciste vos. Puntos que conviene re-chequear:

- **RA en celular**, específicamente después de la migración a Three.js (la lógica no debería haber cambiado, pero no se volvió a confirmar en el teléfono desde antes de ese cambio).
- Encuadre de cámara automático en el visor nuevo (`encuadrarCamara` es una reconstrucción manual de lo que `model-viewer` hacía solo).
- Flujo completo en **Colección rraum.LAB** (página nueva, sin probar aún).
- Texto de **Instrucciones** — revisar y ajustar contenido.

---

## Del plan original, todavía pendiente

**Fase 5 — Cédulas técnicas visibles en RA**: hoy en modo RA no hay forma de
ver la ficha técnica de una pieza (limitación de que `model-viewer` no puede
superponer overlays HTML propios dentro del modo AR nativo del dispositivo).
Requiere diseñar una solución basada en hotspots anclados en el propio GLB.

---

## Sugerencias a futuro

Sin comprometer nada — ideas para cuando decidas seguir sumando funciones,
ordenadas por relación esfuerzo/valor:

- **Audio**: mismo patrón que el video (vivo en editor/escritorio, congelado en RA), mucho más liviano. Sirve para ambientación de sala o audioguía por pieza.
- **Recorrido guiado**: secuencia fija de piezas con textos de acompañamiento — habla directamente del uso pedagógico mencionado al inicio del proyecto.
- **Deshacer/rehacer** en el editor — hoy no existe, y con la cantidad de ajuste manual que requiere ubicar piezas, se nota.
- **Lectura en voz alta** de la ficha técnica (Web Speech API del navegador, sin servicio externo — respeta la regla de cero datos hacia el operador del sitio).
- **Salas conectadas** (un "portal" de una sala a otra) para exposiciones de más de un ambiente.
- **Integración con `estereo_graf`**: ese módulo genera modelos 3D texturizados por fotogrametría — si en algún momento exporta a un formato que in_SITE pueda importar, se podría escanear una escultura real y montarla en una sala virtual sin modelado manual. Es la conexión más interesante entre los módulos RaumLab que tenés hoy.

**Explícitamente no recomendado**: edición colaborativa en tiempo real entre
varios usuarios. Es la sugerencia obvia para un contexto de aula, pero
requeriría servidor y sincronización — contradice directamente la decisión ya
tomada de que ningún dato de los usuarios llegue al operador del sitio.
