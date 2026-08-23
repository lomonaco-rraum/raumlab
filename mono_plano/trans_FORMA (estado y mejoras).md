# trans_FORMA — Estado del proyecto y hoja de ruta

_Actualizado: 23/08/2026_

## Tutoriales (2026-08-23)

Se activó y se completó la pestaña "Tutoriales" del subnav — antes estaba
`disabled` a propósito ("se suma cuando estén cerrados todos los módulos de
RaumLab"), decisión que se revisó y se cambió hoy: se activa ya, en línea
con lo hecho en `espacio_INM` en la misma ronda de trabajo.

A diferencia de `in_SITE` (página HTML aparte) y de `espacio_INM` (sección
oculta por CSS dentro de una SPA de una sola página), acá no existe ninguna
de esas dos estructuras: `app.js` reemplaza `#inicio-screen` por completo en
cada pantalla. Se agregó `mostrarInstrucciones()` (junto a `mostrarIntro()`,
mismo patrón) y se conectó al botón vía `data-modo="tutoriales"` en el
listener ya existente de `botonesModo`. El scroll de esta pantalla lo
resuelve `#app-main` (`position:fixed` + `overflow-y:auto` en
`app-shell.css`) — no hizo falta agregar overflow propio, a diferencia de
`espacio_INM`.

**Rediseñado el mismo día** tras feedback del usuario: la primera versión
(secciones apiladas en una sola columna) quedaba como texto pegado a la
izquierda, sin aprovechar el espacio. Layout actual: lista de modos a la
izquierda (`.instr-nav` — Fotoplano/Fotomosaico) + panel central
(`.instr-panel`) con las instrucciones del modo elegido; arranca sin nada
seleccionado, mostrando el texto general ("¿Qué es trans_FORMA?"), sin vuelta
a ese texto salvo recargar. La nota "Medir, dibujar y exportar" (aplica a
los dos modos) está duplicada dentro de cada uno, no en un ítem aparte —
mismo criterio que espacio_INM. Wiring de clicks escrito a mano dentro de
`mostrarInstrucciones()` (este módulo no tiene el helper `wireSwitcher()`
genérico que sí tiene `espacio-inm.js`). Clases en `styles.css`:
`.instr-layout`, `.instr-nav`, `.instr-nav-item`, `.instr-panel`,
`.instr-body` (mismos nombres que en `espacio-inm.css`, vocabulario
consistente entre módulos aunque cada uno lo inserte con una mecánica
distinta). Primer borrador de esta versión, no verificado aún en navegador
real — mismo bloqueo de entorno que el resto del proyecto.

Herramienta de rectificación fotográfica: convierte una foto oblicua de una
superficie plana (fachada, plano, cartel) en una imagen rectificada a escala
real ("fotoplano"), y permite fusionar dos fotoplanos en uno solo
("fotomosaico") mediante puntos homólogos.

Sitio estático (HTML/JS/CSS plano, sin build ni framework, sin backend). Todo
corre en el navegador del usuario.

---

## Estructura actual

```
index.html            → portada del módulo (Fotoplano / Fotomosaico)

src/css/
  styles.css           → estilos propios del módulo (paneles, tablas, dropdowns, canvas)
  raumlab-chrome.css    → header/nav/breadcrumb/footer compartidos con el resto de RaumLab
  app-shell.css        → layout de 3 columnas compartido

src/js/
  app.js              → lógica completa (carga de imagen, marcado de puntos,
                        rectificación, medición, dibujo, fotomosaico, homólogos)
  geometry.js           → matemática de la rectificación (homografía/transformación)
  dxf.js              → exportación de dibujos a DXF
  raumlab-chrome.js      → header/nav compartido (idéntico al de los demás módulos)
```

---

## Trabajo realizado en esta ronda (reskin visual RaumLab)

### Dropdowns y selectores
- Selector de capa/color en "Dibujar": fondo pasó de gris oscuro sólido a la
  misma transparencia con blur que se usa en el resto de RaumLab. Las
  etiquetas ya no muestran el nombre del color entre paréntesis (el propio
  color ya se ve en el recuadro).
- Selector de imágenes en Fotomosaico: se reemplazó el `<select>` nativo
  (imposible de themear del todo — el navegador no deja controlar el fondo
  de las opciones desplegadas) por el mismo widget custom que ya se usa en
  "Dibujar", con la misma transparencia.

### Alineación y tipografía
- Los tabs Crear/Proyecto, Imagen Original/Fotoplano y Analítico/Geométrico
  quedaron alineados a la misma altura (antes tenían un offset vertical de
  ~14px por heredar un padding distinto).

### Cotas y marcado sobre la imagen (modo Geométrico)
- Las líneas de "ancho real (X)" / "alto real (Y)" ahora se dibujan con el
  mismo estilo de cota que el resto del módulo: línea blanca punteada con
  etiqueta de texto `X=5.23` / `Y=1.58` (antes: colores distintos, sin
  formato de cota).
- El área de rectificación pasó de violeta a blanco.
- El cuadro de "dimensiones previas" perdió el recuadro y el ícono — ahora
  es texto plano, sin caja.

### Marcado de puntos (resultado rectificado)
- El marcador de punto (medición XY, dibujo) ahora es una cruz — el mismo
  tipo de marca que ya se usa para los puntos de control del modo
  Analítico — en vez de un punto relleno.
- En el modo Dibujar, la cruz toma el color de capa seleccionado.
- Las etiquetas de coordenadas ya no tienen recuadro de fondo, y el formato
  pasó de `(2.15, 0.97) m` a `(2.15;0.97)` (coma → punto y coma, sin la "m").

### Tablas — header fijo sin superposición
Bug encontrado durante la revisión: al bajar el scroll de las tablas
(Puntos de Control, Homólogos, etc.) el texto de las filas se superponía
con el encabezado y ambos quedaban ilegibles. La solución con
`position: sticky` + fondo semitransparente en el header quedaba
técnicamente prolija pero volvía a introducir una caja gris, algo que ya
se había pedido evitar varias veces. Se resolvió de raíz separando
`<thead>` de `<tbody>` (el header queda fuera del área que hace scroll, y
las filas que suben quedan directamente recortadas por el propio límite de
la tabla) — sin ningún fondo agregado. Aplica a las 4 tablas del módulo.

### Zoom sobre el fotoplano rectificado
Bug reportado en el test: al generar un fotoplano, si no entraba en el
ancho/alto visible del panel central, la parte que sobraba quedaba oculta y
no había forma de acercar/alejar para verla — el zoom con rueda del mouse
solo estaba conectado a la imagen original, nunca al resultado rectificado
(que además tenía un tamaño fijo por CSS, `max-width:80vw;max-height:75vh`,
en vez de ajustarse al espacio real disponible). Se generalizó el mismo
sistema de zoom que ya tenía la imagen original (rueda del mouse, centrado
en el cursor, mínimo = encaja completo, máximo = 4x) para que funcione
también sobre el fotoplano rectificado, cada uno con su propio nivel de
zoom recordado al cambiar entre pestañas "Imagen Original" / "Fotoplano".
Verificado con una imagen deliberadamente más ancha que el panel: encaja
completa al generarse, y la rueda del mouse la acerca/aleja correctamente.

### Puntos Homólogos (Fotomosaico) — reescrito
- **Bug corregido**: al cargar los puntos H1–H4 el botón de fusión dejaba
  de aparecer y no había forma de confirmar la fusión. La causa era que el
  flujo viejo confirmaba automáticamente el par de puntos al segundo click,
  sin dar lugar a revisar/corregir antes de confirmar.
- Flujo nuevo: se marca el punto en Imagen A y en Imagen B (se puede volver
  a marcar antes de confirmar), y recién se confirma con el botón
  "Cargar Punto H1" (que avanza a "H2", "H3"... automáticamente y se
  deshabilita hasta tener ambos lados marcados).
- Layout de 3 columnas: izquierda con las imágenes cargadas y "Cerrar
  Proyecto"; centro con las dos imágenes lado a lado; derecha con la tabla
  de puntos homólogos, tolerancia y los botones de Reiniciar Fusión /
  Calcular Fusión.

---

## Pendiente importante (para la próxima ronda)

Anotado explícitamente por la usuaria durante el test, a propósito dejado
para después — no tocar sin hablarlo primero:

- **Descargar / cargar proyecto completo**: hoy solo se puede descargar el
  fotoplano final (imagen). Falta poder guardar el proyecto completo para
  retomarlo después — debería incluir la imagen original, las rectificadas
  si ya se hizo el proceso, y los valores definidos en cada paso (puntos de
  control, rectas/escala, área, GSD). Falta definir qué formato conviene.
- **Revisar el archivo DXF exportado**: nombre de capa (que sea editable),
  por qué se abre en solo lectura, y en general repasar la exportación.

Además, durante esta revisión encontré un tercer punto relacionado que
todavía no está resuelto — lo dejo anotado para que se decida cuándo
abordarlo: la pantalla final de **Fotomosaico con más de 2 imágenes**
(`mostrarResultadoFotomosaico`, la que se muestra al terminar de fusionar
todas las imágenes de la lista) es una pantalla vieja, previa al reskin —
no usa el layout de 3 columnas de RaumLab ni sus estilos, y tiene el mismo
problema de zoom que se corrigió arriba (tamaño fijo por CSS, sin forma de
acercar/alejar). No la toqué todavía porque implica rehacerla, no solo
ajustarla.

---

## Pendiente de verificación

Estás por hacer una pasada de test intensivo — todo lo de arriba se
verificó con capturas de un flujo automatizado (headless), pero conviene
que la confirmación real de uso quede en tus manos, en particular:

- Fotomosaico con imágenes reales (el test usó imágenes sintéticas de
  color plano, no fotos con contenido real).
- Exportación DXF después de dibujar con la cruz/colores nuevos (no se
  volvió a probar la exportación en sí en esta ronda, solo el dibujo en
  pantalla).
- Selector de imágenes de Fotomosaico ya abierto (se confirmó que
  funciona, pero no se volvió a capturar el estado desplegado tras el
  cambio de widget).

---

## Del plan original, todavía pendiente

- **Vista mobile**: hoy el módulo directamente oculta el workspace de
  3 columnas por debajo de 768px y muestra un aviso de "usar en
  escritorio" (`.workspace-mobile-notice`), sin una versión real para
  teléfono. Dado que es una herramienta de marcado punto a punto sobre una
  imagen, no es evidente qué tratamiento mobile tendría sentido — conviene
  charlarlo antes de tocarlo (¿solo lectura de resultados en el teléfono?
  ¿queda fuera de alcance directamente?).

---

## Sugerencias a futuro

Sin comprometer nada — para cuando quieras seguir sumando funciones:

- **Persistencia de puntos homólogos entre sesiones**: hoy si se cierra el
  proyecto de fotomosaico a mitad de marcado, se pierde el progreso de
  H1/H2/H3.
- **Deshacer último punto/marca**, tanto en el marcado de puntos de control
  como en dibujo — hoy la única forma de corregir un punto mal puesto es
  reiniciar toda la etapa.
- **Vista previa en miniatura del fotoplano final** antes de confirmar la
  resolución/GSD, para elegir el nivel de detalle con una referencia visual
  y no solo con el valor en mm/px.
