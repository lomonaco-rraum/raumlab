# RAUMLAB — Estado del proyecto y hoja de ruta

_Actualizado: 2026-08-27_

## Pendiente: selector de idioma funcional (portugués)

Hoy el botón "ES" del header es decorativo (`cursor:default`, no hace
nada al click) — el tooltip ya menciona "próximamente EN / FR / PT" pero
no hay ninguna interacción real. La usuaria pidió agregar portugués;
queda pendiente para retomar más adelante. Dos alcances muy distintos a
decidir cuando se retome:
- Solo la interacción: desplegar ES/PT al click, cambiar la etiqueta del
  botón — sin traducir el contenido del sitio todavía.
- Traducción completa: traducir el contenido visible de los 4 módulos y
  que cambiar de idioma cambie el texto de verdad — mucho más trabajo.

## Se saca fondo.jpg — gris oscuro liso (2026-08-27)

`.bg-layer` (hub) y `.rc-bg-layer` (compartida por los 3 módulos) usaban
una imagen de fondo (`fondo.jpg`, 16MB) con `filter: grayscale` y
`transform: rotate(180deg)`. Se reemplazó por un color sólido — cada
módulo ya tiene bastante ruido visual propio (muchos comandos/controles)
como para sumarle un fondo con textura. `--bg-navy` (el color de fondo
base, ya usado en toda la app para botones/íconos/modales, no solo el
fondo) pasó de `#0d1b2e` (navy) a `#141414` (gris oscuro, casi negro) en
`raumlab/style.css` y `raumlab/raumlab-chrome.css` — mismo nombre de
variable, valor nuevo, así que el cambio se propaga solo a todo lo que ya
usaba ese color.

De paso se sacó el hack de overscan móvil en `.rc-bg-layer` (`top/bottom:
±3vh`, `left/right: ±2vw`) — existía solo para tapar el borde de la
imagen expuesto durante el resize de la barra de direcciones en Safari;
con color liso no hace falta. `fondo.jpg` se borró del repo (ya no lo
referencia nada).

## Menú lateral: desaturado + sin borde, scrim con blur (2026-08-23)

En `.nav-panel`/`.rc-nav-panel` (hub + 3 módulos, dos archivos): fondo
pasó de `rgba(6, 9, 16, 0.92)` (tenía un tinte azulado, R<G<B) a
`rgba(10, 10, 10, 0.92)` (gris neutro, R=G=B, misma oscuridad
aproximada) — y se sacó el `border-right: 1px solid var(--surface-border)`.
En `.nav-scrim`/`.rc-nav-scrim`: se mantuvo el negro al 35% tal cual, y se
sumó `backdrop-filter: blur(4px)` (no tenía blur antes, solo el panel lo
tenía). `--surface-border` sigue en uso en `.modules-list`/`.module-row`,
no quedó huérfano.

## `--text-color` pasó de #f2efe9 a blanco puro (2026-08-23)

Probado primero de forma acotada solo en `.home-curatorial p` (confirmado:
"se ve claro en blanco"), después llevado al token compartido —
`--text-color: #ffffff` en `raumlab/style.css` (landing) y
`raumlab/raumlab-chrome.css` (los 3 módulos). Como es un token único
reutilizado en todo el sitio, este cambio alcanza automáticamente a todo el
texto de las 4 páginas (títulos, nav, cards, Instrucciones, pantallas de
introducción, etc.) sin tocar cada regla una por una. Se sacó el override
puntual que había quedado en `.home-curatorial p` (`color: #ffffff` a
mano), ya redundante con el token. Motivo original: con `--text-color`
viejo (#f2efe9, un blanco hueso) y peso de letra fino (100), el contraste
contra el fondo con grano/textura se perdía.

No se tocó `#f2efe9` en `mono_plano/src/js/app.js` (4 usos) — es el color
de las líneas/medidas que se dibujan sobre la foto en el Fotoplano/
Fotomosaico, un color funcional de esa herramienta, no el token de texto
del sitio.

## Fondo en blanco y negro + peso de texto "fino" (2026-08-23)

- `.bg-layer` (landing) ya tenía `filter: grayscale(1)`, pero `.rc-bg-layer`
  (el fondo compartido de los 3 módulos, en `raumlab-chrome.css`) no —
  quedaba a color mientras el hub estaba en blanco y negro. Ahora los dos
  tienen el mismo filtro.
- Peso de texto bajado a 100 ("fino", mismo criterio que el texto
  curatorial) en dos lugares más: `.module-row .card-lede`/`.card-detail`
  (lista de Recursos del hub — el `h2`/título de cada módulo NO cambió) y
  `.rc-intro-detail` (el párrafo largo de la pantalla de introducción al
  entrar a cada módulo — `.rc-intro-lede`, la frase corta, tampoco cambió,
  mismo criterio "título/lede se deja, cuerpo se afina").

## Bug real: "Recursos" no llevaba a ningún lado desde dentro de un módulo (2026-08-23)

Dentro de `in_SITE`/`espacio_INM`/`trans_FORMA` (7 archivos: `mono_plano/index.html`,
los 5 HTML de `in_site/`, `espacio_inm/espacio-inm/espacio-inm.html`), el
botón "Recursos" del panel de navegación (`#recursosToggle`) era un
`<button>` que solo expandía/colapsaba la lista de módulos hermanos
localmente — nunca navegaba a ningún lado, ni siquiera de vuelta al hub.
Se convirtió en un link real (`<a class="rc-nav-link"
href=".../raumlab/index.html#recursos">Recursos</a>`), y en `raumlab/index.html`
se agregó `if (location.hash === '#recursos') showRecursos();` para que
aterrizar con ese hash muestre directo la lista de módulos en vez del texto
curatorial por defecto. `raumlab-chrome.js` ya tenía un guard (`if
(recursosToggle && recursosItem)`) que no rompe con el id ausente, así que
no hizo falta tocarlo.

## Bug real: submenú "Recursos" no llevaba a los módulos (2026-08-23)

Los links de `#recursosSub` (espacio_INM/in_SITE/trans_FORMA/estereo_GRAF
dentro del menú hamburguesa) apuntaban a anclas internas (`href="#in-site"`
etc.) pensadas para una versión vieja de la página donde alcanzaba con
revelar/scrollear hasta esa card en la lista de Recursos — nunca navegaban
al módulo real. Los 3 módulos funcionales ya usan la ruta relativa real
(`../in_site/index.html`, `../espacio_inm/espacio-inm/espacio-inm.html`,
`../mono_plano/index.html`), igual que hacen sus propios menús "Recursos"
(que sí estaban bien). estereo_GRAF pasó de `<a href="#estereo-graf">` a un
`<span aria-disabled="true">` inerte, mismo criterio que su card en la
lista de Recursos. De paso se sacó el listener de JS que llamaba
`showRecursos()`/`closeNav()` en esos links — ya no aplica, al navegar a
otra página el estado de esta no importa.

**No probado con `filter: grayscale(1)` en `.bg-layer` de `style.css`** —
prueba temporal a blanco y negro pedida por el usuario, no se tocó
`fondo.jpg`; sacar esa línea para volver al color.

## Portada / splash eliminada (2026-08-23)

Se sacó por completo la pantalla de bienvenida (tipeo de "RAUMLAB", antes con
subtítulo + botón "Comenzar"; se había probado una versión intermedia sin
subtítulo/botón que fundía el logo grande con el del header, pero el usuario
decidió que era demasiado para una impronta minimalista — se descartó
también). `index.html` ahora aterriza directo en el sitio: sin `#splash`,
sin `sessionStorage`, sin gating de opacity en el contenedor `.site`
(la clase/id `site` se sacaron del `<div>` raíz, ya no cumplían función).

**Resuelto el mismo día**: se agregó el texto curatorial (3 párrafos, ~205
palabras) como contenido de `#view-home`, nuevo `<div class="view">` dentro
de `<main>` junto a `#view-recursos` — mismo mecanismo de `hidden` que ya
tenía Recursos, ahora alternando entre las dos vistas (`showHome()`/
`showRecursos()` actualizadas para togglear ambas, no solo una). Contenido
armado a partir de palabras clave/frases dadas por el usuario: laboratorio
experimental en torno al espacio y su representación; investigación crítica
de la gráfica actual y recursos para su expansión; entornos virtuales para
propuestas curatoriales artísticas y pedagógicas; documentación no
convencional; visualización en RA — deliberadamente sin nombrar los módulos
por su nombre (decisión del usuario, ya los lista la grilla de Recursos
aparte). Con esto, "volver al inicio" ya no es una pantalla en blanco.
Estilos nuevos en `style.css`: `.home-curatorial`. Título agregado después
("Laboratorio de investigación y desarrollo transdisciplinar", `<h1>`),
tamaño corregido tras quedar excesivo en el primer intento (bajó de
`clamp(1.3rem,3vw,1.8rem)` a `clamp(0.9rem,1.6vw,1.05rem)`).

## Tipografía: Geist por defecto (2026-08-23)

Ver [[feedback_raumlab-geist-default-font]] — Space Grotesk NO va como
cuerpo de texto, solo Geist salvo acentos puntuales explícitamente
sancionados. Pasaron a Geist en esta ronda: `.home-curatorial` (hub),
`.rc-back-link`/`.back-link` ("VOLVER", en el hub y en los 3 módulos),
`.rc-intro-lede`/`.rc-intro-detail` (pantalla de introducción de los 3
módulos), `.instr-body` completo (Instrucciones/Tutoriales, los 3 módulos —
"NADA lleva grotesco" ahí, palabras del usuario), `.footer-copyright`/
`.rc-footer-copyright` (hub + 3 módulos). **Quedan deliberadamente en Space
Grotesk** (confirmado con el usuario, no tocar): `.nav-list`/`.rc-nav-list`
(panel lateral de navegación) y `.rc-breadcrumb` (el "/in_SITE" etc. del
header) — estos sí son los "acentos puntuales" que se reservan para
grotesca.

## Recursos: de cards a lista (2026-08-23)

`#view-recursos` pasó de una grilla de 3 columnas con cards de fondo
translúcido/blur (`.modules-grid`/`.module-card`) a una lista vertical de
una sola columna dividida por líneas finas (`.modules-list`/`.module-row`,
`border-top`/`border-bottom: 1px solid var(--surface-border)`) — decisión
del usuario: "el proyecto no tiene esta impronta [de cards], es más de
listas más simples". Mismo contenido por fila (etiqueta de estado, título,
lede, detalle) y misma flecha diagonal como link — se mantuvieron ambos
párrafos y la etiqueta V1.0/En desarrollo (confirmado, no se recortó). El
botón "VOLVER" de esta pantalla (`#recursosBack`) se sacó del todo (no solo
la flecha, que había quedado mal posicionada en un intento anterior) — la
vuelta a inicio queda solo por el logo del header. Al sacar el botón hubo
que sacar también su listener en JS (`document.getElementById('recursosBack')`
apuntaba a un elemento que ya no existe — habría roto todo el script de ahí
en adelante, incluido el toggle del menú, si quedaba).

## Centrado + lista compacta (2026-08-23)

`.home-curatorial` y `.modules-list` sumaron `margin: 0 auto` — antes
quedaban pegados al borde izquierdo de `.main` (que sí estaba centrado como
contenedor de 1180px, pero eso no centra a sus hijos si ellos no tienen su
propio auto-margin). Además, `.module-row` se reordenó para ocupar menos
alto por fila: título + etiqueta de estado ("V1.0"/"En desarrollo") ahora
comparten una misma línea arriba (antes el estado tenía su propia línea
separada) vía `.module-row-head` (`align-items: baseline`), y la flecha
quedó al final de la fila, abajo a la derecha (`align-self: flex-end` en un
`.module-row` que ahora es `flex-direction: column`). Padding y tamaños de
fuente de la fila también se ajustaron a la baja (objetivo: que las 4 filas
entren sin scroll vertical). **No verificado en navegador real** — el
ajuste exacto depende del alto de viewport real del usuario; puede necesitar
otra pasada de ajuste si todavía scrollea en su pantalla.

## Bugs reales encontrados y corregidos (2026-08-23)

- **Texto curatorial y lista de módulos superpuestos**: `#view-home {
  display: flex; ... }` (selector por ID) le ganaba en especificidad al
  `[hidden] { display: none }` del navegador — al elegir "Recursos",
  `viewHome.hidden = true` quedaba sin efecto visual y las dos vistas se
  veían juntas. No era caché (se descartó esa hipótesis a pedido del
  usuario). Se resolvió sacando el CSS propio de `#view-home` por completo
  (ver más abajo, el usuario pidió simplificarlo de otra forma).
- **La flecha de "Comenzar" se veía vertical al pasar el mouse**: quedó una
  regla vieja (`.card-cta:hover .cta-arrow-img { transform: translateX(4px)
  }`) que reemplazaba la rotación fija de 90° en vez de sumarse a ella. El
  hover se movió a `.card-cta` (sin rotación propia), donde `translateX`
  no choca con nada.

## Padding-top igualado entre inicio y Recursos (2026-08-23)

`#view-home` tenía `justify-content: flex-end` para empujar el texto
curatorial cerca del footer (pedido explícito de una ronda anterior) — el
usuario pidió revertir eso: ambas vistas (`#view-home` y `#view-recursos`)
comparten el mismo padding-top, heredado directo de `.main` (`calc(var(--header-h)
+ 56px)` — 174px con el valor por defecto de `--header-h`, se recalcula en
tiempo real). Se sacó todo el CSS propio de `#view-home`.

## Ajustes finos: inicio abajo + CTA de la lista (2026-08-23)

- **`#view-home`** pasa a `display:flex; flex-direction:column;
  justify-content:flex-end;` con `min-height: calc(100vh - header-h -
  footer-h - 96px)` — empuja `.home-curatorial` al fondo del espacio
  disponible (cerca del footer) sin usar un margin-top fijo, que solo
  hubiera quedado bien en una resolución puntual. Peso de los párrafos
  bajó de 300 a 100 (el título se dejó en 300, sin cambios — "el título
  está ok", palabras del usuario).
- **`.card-cta`** (el link de cada fila de Recursos) ahora antepone el
  texto "Comenzar" al ícono, y el ícono cambió de `flecha_diagonal_ui.png`
  a `flecha_derecha_ui.png` (horizontal). "Comenzar" es el único uso de
  Space Grotesk en esta lista — acento puntual explícitamente pedido, no
  una excepción que decidí yo. La fila deshabilitada de estereo_GRAF
  cambió el ícono por consistencia visual pero **no** sumó el texto
  "Comenzar" (no aplica, el módulo no se puede empezar todavía) — decisión
  propia, no confirmada con el usuario. El hover del ícono pasó de
  `scale(1.2)` a `translateX(4px)` (un empujón hacia adelante calza mejor
  con una flecha horizontal que un escalado).

Este documento es sobre el **shell compartido** (`raumlab/`: landing, header, footer,
panel de navegación, pantalla de introducción de cada módulo) y sobre lo que falta
para publicar el sitio completo en **raumlab.org**. No repite el detalle interno de
cada módulo — para eso están sus propios documentos:

- `espacio_inm/ESTADO.md`
- `in_site/in_SITE (estado y mejoras).md`
- `mono_plano/trans_FORMA (estado y mejoras).md`

Sitio 100% estático (HTML/CSS/JS plano, sin build ni framework, sin backend).
`raumlab/raumlab-chrome.css` + `raumlab-chrome.js` son el ÚNICO archivo real de
header/footer/nav — lo referencian por ruta relativa in_SITE, trans_FORMA y
espacio_INM (nunca se duplica). `raumlab/style.css` es exclusivo de la landing.

## Estructura

```
raumlab/
├── index.html              → landing (grilla de módulos, sin splash)
├── style.css                → estilos exclusivos de la landing
├── raumlab-chrome.css        → header/footer/nav compartidos por los 3 módulos
├── raumlab-chrome.js          → JS del mismo shell compartido
├── flecha_*.png, favicon.png, og-image.jpg → assets compartidos
└── Presentación1.pdf            → mockup original de identidad visual

in_site/      → módulo in_SITE (curaduría de salas expositivas 3D)
mono_plano/   → módulo trans_FORMA (rectificación fotográfica 2D)
espacio_inm/  → módulo espacio_INM (cubemap ↔ equirectangular)
```

## Trabajo realizado en esta ronda (consistencia visual entre los 3 módulos)

Todo lo de acá salió de comparar los módulos lado a lado y encontrar diferencias
que no debían existir — elementos que se supone son "el mismo" en los tres pero
se habían ido desalineando con el tiempo.

1. **Header**: la landing tenía una cinta ("LANZAMIENTO OFICIAL 2027") que le
   agregaba una fila extra arriba del logo — no existe en los módulos. Se sacó,
   así el header ocupa exactamente el mismo espacio en los 4 (landing + 3 módulos).
2. **Footer**: la landing tenía íconos de contacto (mail/Instagram) que los
   módulos no tienen — se movieron al panel de navegación (hamburguesa), y el
   footer quedó igual en los 4 lugares (solo línea + copyright centrado, mismo
   padding). Aparte, **espacio_INM** era el único módulo sin el reset CSS
   universal (`* { margin:0; padding:0; box-sizing:border-box }`) que sí tienen
   in_SITE y trans_FORMA — eso hacía que su `<p>` de copyright (y el breadcrumb)
   se quedaran con el margen por defecto del navegador, más alto que los demás.
   Mismo tipo de bug que ya había pasado una vez antes con la tipografía del
   logo en trans_FORMA (documentado en el propio CSS).
3. **Tipografía**: el botón "ES" y las etiquetas de estado de las cards
   ("V1.0"/"En desarrollo") usaban 3 fuentes distintas entre landing y módulos
   (mono / Space Grotesk / Geist según el archivo) — unificadas a Geist, la
   misma del logo y las pestañas.
4. **Enlace "VOLVER"**: texto distinto en cada lugar ("Volver al Inicio" /
   "Volver a RaumLab", mayúscula/minúscula inconsistente) — unificado a
   "VOLVER" en los 6 lugares donde aparece. De paso se encontró que la versión
   de in_SITE nunca había tenido el ícono de flecha que sí tienen las otras 5.
5. **Pantalla de introducción**: solo in_SITE la tenía (texto de presentación
   antes de elegir una pestaña de trabajo) — se agregó la misma pantalla a
   espacio_INM y trans_FORMA, con el texto exacto de la card de cada módulo en
   la landing (lede en regular + detalle en fino, igual que en la card),
   mismo ancho de columna (420px), mismo margen izquierdo (35px medidos desde
   el borde real de la ventana, no desde ningún contenedor centrado) y mismo
   margen superior en los tres.
6. **Bug de espacio_INM** (pantalla completa): al salir con ESC del visor en
   pantalla completa, quedaba con el tamaño roto (cuadrado, o gigante tapando
   el botón de cerrar en el modal de Vista previa). La causa real —confirmada
   leyendo el código fuente de Panolens 0.12.1, no supuesta—: el intento de
   forzar el resize disparaba un evento interno de Panolens que nunca tenía un
   listener enganchado en esa instancia — no hacía nada. Se reemplazó por una
   llamada directa al método real (`viewer.onWindowResize()`).

## Adaptativo — corrige regresión visual del recorte anterior (2026-08-28)

La usuaria mandó una captura de su propio navegador real (Chrome, no la
de prueba) mostrando dos problemas que el recorte anterior había
introducido, aunque el número de scroll diera 0: el botón "Reiniciar"
había quedado como un link subrayado suelto (se leía como texto, no
como acción — "falta el botón de reiniciar"), y los desplegables
("Seleccionar")/el toggle Vertical-Horizontal/el botón Generar tenían
alturas distintas entre sí porque cada uno se había ajustado por
separado en la carrera por ganar espacio, sin chequear consistencia
visual entre ellos.

Corrección: mismo font-size (0.75rem) y mismo padding vertical (8px)
en `.capa-selector-boton`/`.controles-toggle-btn`/`.btn-text`/
`.btn-primary` dentro de `#panel-adaptativo` — con borde transparente en
`.btn-primary` (que no tiene borde propio) para igualar la altura sin
cambiarle el aspecto, mismo criterio que ya usa `.viewer-btn-main` en
in_SITE. "Reiniciar" pasó a botón chico de verdad (borde + fondo propio
al pasar el mouse), no un link. Reverificado con el mismo método de
captura headless (ver sección de abajo): al restaurar alturas prolijas
volvió a aparecer scroll (57px), se recortaron de nuevo SOLO los
márgenes entre elementos (no las alturas de los controles) hasta
0px, iterando con captura real en cada paso — no a ojo.

## Adaptativo — verificación real con navegador headless (2026-08-28)

La usuaria preguntó "¿no podés verificarlo?" ante el reclamo de que
seguía apareciendo scroll — hasta acá cada ronda se probaba solo
razonando sobre el CSS, sin ver el resultado real. Se encontró que este
entorno SÍ tiene Microsoft Edge instalado
(`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`), que
soporta `--headless=new --screenshot=archivo.png --window-size=WxH
--virtual-time-budget=ms`. Con un servidor HTTP local mínimo (PowerShell,
`System.Net.HttpListener`, lanzado con `run_in_background` para que
sobreviva entre llamadas — con `Start-Job` normal el proceso moría al
terminar la invocación) sirviendo el repo, y una página de prueba
temporal (`mono_plano/_test_adaptativo.html`, borrada al terminar) que
simulaba clickear la pestaña Adaptativo y cargar una imagen real vía
`DataTransfer`, se pudo tomar capturas reales del estado post-carga e
inyectar un panel de medición (`scrollHeight` vs `clientHeight`) visible
en la propia captura — mismo truco que ya se había usado antes para
diagnosticar el bug de `top:header-h` en mobile, pero esta vez con
captura visual real en vez de solo texto.

Con esto se confirmó y resolvió el reclamo con datos, no a ojo:
- A 1920×1080 el panel ya entraba sin scroll (`overflow=0`).
- A 1366×768 (laptop típica) desbordaba **296px** — mucho más que lo
  estimado a mano en rondas anteriores.
- Recorte iterativo verificado con captura en cada paso (296 → 89 → 45 →
  16 → **0px** a 1366×768): se sacó el párrafo de ayuda fijo del panel
  (ya está en el cuadro de diálogo), se movió "Reiniciar vértices" a un
  link chico junto al título de la sección 1 (en vez de una fila propia,
  mismo lugar que el "?" de ayuda de Fotoplano), y se compactaron
  paddings/márgenes DENTRO de `#panel-adaptativo` únicamente (selector
  scoped, no toca `.panel-content`/`.controles-heading`/etc. compartidas
  con Fotoplano).
- A 720px de alto (ventana más chica todavía) queda un resto de 47px —
  no se siguió comprimiendo más para no dejar el panel ilegible; el
  objetivo elegido fue la altura de laptop más común (768px), no
  cualquier alto posible.

## Adaptativo — cuarto modo de trans_FORMA (2026-08-28, tres rondas de revisión el mismo día)

**Tercera revisión** — el zoom/encaje de la segunda ronda quedó
confirmado funcionando. Dos ajustes finos:
- El cuadro de diálogo decía "seleccioná y llevá" el vértice pero no
  explicaba el gesto (clic sostenido + arrastrar) — la usuaria tuvo que
  probarlo sola para descubrirlo. Mensaje actualizado, explícito.
- Ancho y Alto personalizados pasaron de dos filas apiladas a una sola
  fila compartida (con un solo "mm" al final, no repetido) — el objetivo
  es que el panel de controles entre completo sin scroll vertical; cada
  fila por separado ya entraba en una línea (ronda anterior), pero dos
  filas seguían usando más alto del que el panel tiene disponible.

## Adaptativo — cuarto modo de trans_FORMA (2026-08-28, dos rondas de revisión el mismo día)

**Segunda revisión — causa raíz encontrada, no solo síntomas**: la usuaria
reportó que la imagen no encajaba en pantalla y que era imposible
agarrar/arrastrar los vértices del polígono. Causa real: la primera
versión ajustaba la imagen por CSS (`max-width/max-height:100%`), pero el
contenedor directo de la imagen no tenía una altura definida — un
porcentaje de alto no se puede calcular sin eso, así que el navegador lo
ignoraba y la imagen se mostraba a tamaño natural completo (por eso no
encajaba, y por eso los vértices quedaban fuera de la vista o
inalcanzables). Se reemplazó por la mecánica REAL de Fotoplano
(`medirEscalaAjustada`/`aplicarEscala`/`fijarTamanioActivo`, que miden el
contenedor con JS y asignan ancho/alto en píxeles), agregando zoom con
rueda del mouse en escritorio y **pellizco de dos dedos en mobile** (no
existía en ningún lado del sitio, se construyó de cero con Pointer
Events — 2 punteros activos = pellizco centrado en el punto medio; 1
puntero sobre un vértice = arrastre; 1 puntero en el resto de la imagen =
pan, necesario porque `touch-action:none` en la imagen desactiva también
el scroll táctil nativo).

Otros cambios de esta segunda ronda:
- Se sacó la checklist de vértices por completo — la usuaria aclaró que
  la idea era trabajar directo con el polígono (vértices con nombre
  dibujados sobre la imagen, ver `ETIQUETAS_VERTICES`), no una lista de
  texto aparte.
- "Cerrar Proyecto" mueve, y la ventana de diálogo (`#panel-dialogo`)
  ahora se usa para guiar los pasos (al cargar la imagen, al reiniciar
  vértices, al no haber imagen todavía) — antes solo se usaba para
  errores/éxito de "Generar", faltaba en el resto del flujo.
- Menús de formato/resolución sin valor por defecto: arrancan en
  "Seleccionar", y "Generar" permanece deshabilitado hasta elegir ambos
  a propósito.
- `.controles-field-row span` (el label de cualquier fila tipo "Ancho
  real (X):") no tenía font-size propio — heredaba el default del
  navegador (16px) al lado de un input de 0.75rem. Bug preexistente en
  Fotoplano, no exclusivo de Adaptativo — se corrigió en la regla base,
  beneficia a los dos.
- Inputs deshabilitados (Ancho/Alto personalizados) pasan a un gris
  sólido (no solo opacity, que contra el fondo oscuro se veía como un
  rectángulo fantasma en vez de gris) — vuelven al tono claro normal
  (`.controles-input-num`, ya casi blanco de por sí) al elegir
  "Personalizado".

## Adaptativo — cuarto modo de trans_FORMA (2026-08-28, revisado el mismo día)

Modo nuevo, más simple que Fotoplano/Fotomosaico y pensado justamente para
eso: es el único de los cuatro accesible desde el celular (Fotoplano y
Fotomosaico requieren escritorio, ver más abajo).

**Revisión del mismo día — cambió la interacción principal**: la primera
versión pedía tocar la imagen para "crear" cada uno de los 4 vértices.
En celular, sin zoom, cualquier toque para simplemente mirar la foto
generaba un punto sin querer — imposible de usar bien. Ahora los 4
vértices aparecen ya ubicados apenas carga la imagen (rectángulo inscripto
al 18% de margen, `posicionesIniciales()`), y la única interacción es
seleccionar un vértice existente y arrastrarlo a su lugar — nunca se
"crean" puntos tocando. Se aplicó también en escritorio (no solo mobile),
a pedido explícito de la usuaria. Otros ajustes de la misma revisión:
- Checklist con tilde por vértice (`tocado[]`, marca cuándo se lo
  seleccionó al menos una vez) en vez del contador "X / 4".
- Formato de papel y resolución pasaron de radios/toggle a menús
  desplegables temáticos, reutilizando el componente `.capa-selector` que
  ya usaba Fotomosaico para "Elegir imagen" (no un `<select>` nativo — el
  motivo ya documentado en el propio CSS es que el navegador no deja
  tematizar el fondo/acento de la lista abierta de un `<select>`).
- Ancho/Alto personalizados y el toggle Vertical/Horizontal ahora están
  siempre visibles (deshabilitados salvo que el formato sea
  "Personalizado"), no aparecen/desaparecen — evita el salto de layout.
- "Cerrar Proyecto" pasó a usar la misma clase fija que Fotoplano
  (`.workspace-cerrar-proyecto`, hermano de `.workspace-layout`, no un
  botón suelto dentro del riel izquierdo) — con su propio override en
  mobile (`position:static`) porque en Fotoplano nunca se prueba ahí (todo
  ese workspace se oculta en mobile).
- Imagen centrada en la columna central con `margin:auto` sobre el
  wrapper (mismo patrón que Fotoplano), en vez de flexbox propio.
- Texto del aviso "solo en PC" acortado (sacada la oración final, que no
  aportaba).

- **Flujo**: cargar imagen → marcar los 4 vértices del contorno de la obra
  (sentido horario, empezando abajo-izquierda: abajo-izq. → arriba-izq. →
  arriba-der. → abajo-der. — arrastrables para ajustar precisión) → elegir
  tamaño real (A5/A4/A3/A2 con toggle vertical/horizontal, o personalizado
  en mm) → elegir resolución (Baja/Media/Alta, en DPI: 100/200/300) →
  generar → descargar.
- **Reutiliza el motor de homografía de Fotoplano** (`calcularHomografia`
  de `geometry.js`) sin tocarlo: con exactamente 4 correspondencias
  imagen↔objeto, el ajuste por mínimos cuadrados da la solución exacta.
  También reutiliza el loop de warpeo por muestreo inverso de
  `crearEstacionFotoplano` (adaptado, no compartido como función — la
  lógica de UI alrededor es demasiado distinta para reutilizar la función
  completa). `xObj/yObj` en metros para que las unidades calcen con ese
  motor sin modificarlo.
- **Sin zoom** (a diferencia de Fotoplano, que solo tiene zoom por rueda
  del mouse, sin equivalente táctil): la imagen se muestra completa,
  ajustada al ancho de columna — los vértices arrastrables alcanzan para
  ajustar precisión sin necesitar acercar.
- **Interacción con Pointer Events** (`pointerdown`/`pointermove`/
  `pointerup`), no mouse events como el resto de trans_FORMA — mismo
  código atiende mouse en escritorio y dedo en celular. Radio de detección
  de arrastre de 22px de pantalla (generoso a propósito, para el dedo).
- **Mobile**: Fotoplano/Fotomosaico se ocultan del subnav (`.rc-subnav
  button[data-modo="fotoplano/fotomosaico"] { display:none }`,
  `mono_plano/src/css/styles.css`) — antes estaban visibles pero llevaban
  a un aviso de "usá escritorio" recién al entrar (`.workspace-mobile-notice`,
  ya existente). Además, un modal aparece una sola vez al entrar al módulo
  en mobile (`mostrarIntro()`) explicando que Fotoplano/Fotomosaico
  requieren escritorio y que Adaptativo es la alternativa — sin esto no
  habría forma de que la usuaria supiera que esos dos modos existen, ya
  que las pestañas están ocultas. El layout de Adaptativo (`.workspace-layout.adaptativo-layout`,
  selector compuesto a propósito) es la EXCEPCIÓN a la regla general
  `.workspace-layout{display:none}` en mobile — reflow a una columna en
  vez de ocultarse.
- **Corrección de un error propio**: en la conversación donde se acordó
  "sentido horario, empezando abajo a la izquierda", el orden que propuse
  (abajo-izq. → abajo-der. → arriba-der. → arriba-izq.) estaba mal
  etiquetado — ese orden es antihorario. El sentido horario real desde
  abajo-izquierda es abajo-izq. → arriba-izq. → arriba-der. → abajo-der.
  (equivalente a la lista de `border-radius` en CSS: TL,TR,BR,BL,
  rotada para arrancar en BL). Implementado con el orden geométricamente
  correcto, no el que propuse originalmente — de haber usado el original,
  el resultado hubiera salido espejado.
- **Sin probar en navegador real** (mismo bloqueo que el resto de esta
  ronda) — en particular, sin confirmar visualmente el layout mobile a una
  columna, el arrastre táctil de los vértices, y que el warpeo con 4
  puntos (en vez de N≥4 como Analítico) da un resultado correcto.

## Pendiente / conocido pero no resuelto

- **Sin verificar en dispositivo móvil real** todo lo de esta ronda (header,
  footer, pantallas de introducción) — el CSS de mobile se ajustó por código,
  pero este entorno no tiene acceso a un navegador ni a un celular real para
  probarlo (mismo bloqueo que ya documentan los ESTADO.md de los módulos).
- **Posición de la pantalla de introducción en mobile — fix incompleto
  corregido (2026-08-28)**: la usuaria probó en celular real la ronda
  anterior (que decía dejar in_SITE/espacio_INM/trans_FORMA con el mismo
  margen) y el texto de espacio_INM/trans_FORMA seguía sin coincidir con
  in_SITE. Causa real: en mobile, `#app-main` (`app-shell.css`, compartido
  por espacio_INM y trans_FORMA — in_SITE no lo usa, tiene un solo
  contenedor `.rc-intro-screen`) ya pone
  `padding: calc(header-h+20) 20px mobile-bottom-reserve;` — es decir,
  reserva los CUATRO lados, no solo arriba. `.mode-intro-content` (la
  pantalla de intro en sí, hija de `#app-main`) volvía a sumar su propio
  padding en los cuatro lados encima. Un primer intento en esta misma
  ronda solo corrigió el padding-top (quedaba en header-h × 2) pero dejó
  intactos derecha/abajo (20+20 y mobile-bottom-reserve × 2) y sobre todo
  la izquierda, que daba 55px en vez del margen de 35px documentado más
  arriba (20 de `#app-main` + 35 propios) — nada de esto se nota mirando
  la regla de `.mode-intro-content` sola, hay que sumarla con la de
  `#app-main` para verlo. Fix real:
  `.mode-intro-content { padding: 0 0 0 15px; }` en mobile — cero en los
  tres lados que `#app-main` ya cierra exacto, y 15px de margen propio a
  la izquierda (20+15=35, igual que in_SITE). Mismo cambio en
  `espacio_inm/espacio-inm.css` y `mono_plano/src/css/styles.css`.
  Sigue sin verificarse en un celular real — la usuaria lo va a probar
  después de este push.
- **Links de la landing (actualizado 2026-08-27)**: "Novedades" se sacó del
  menú (la usuaria la va a manejar aparte, en Zoho — no es contenido de este
  sitio). "Investigación" ya tiene contenido real: una vista (`#investigacion`,
  mismo patrón de `view` mostrado/ocultado por JS que ya usaba "Recursos")
  con la presentación de Paula Lomonaco (docente/investigadora/artista
  visual, directora/fundadora de RaumLab) y un link a su perfil de
  Academia.edu. **"Educación" implementada (2026-08-28)**, a partir del
  contenido final que mandó la usuaria en `revision de textos.txt` — más
  simple que la primera aproximación del 27/08 (esa hablaba de una card
  por módulo vinculando in_SITE/espacio_INM/trans_FORMA como recurso
  formativo; se descartó a favor de esto):
  - Vista `#educacion` (mismo patrón `view` que Recursos/Investigación),
    con dos tarjetas en `.modules-list`: **Soporte** y **Materiales
    didácticos**. En el menú, "Educación" pasó a ser un `nav-item.has-sub`
    igual que "Recursos", con esas dos entradas en el submenú — al
    elegirlas se muestra la vista y hace scroll a la tarjeta
    correspondiente (no son páginas propias, viven en `raumlab/index.html`).
  - **Soporte**: tarjeta con la propuesta de valor y un botón "Solicitar"
    que abre un modal (`#soporte-modal-overlay`) con el formulario
    completo pedido: nombre y apellido, correo, entidad educativa/cultural,
    checkboxes de "objeto de la solicitud" (capacitación/colaboración/
    asesoría/otros, con campo condicional si se tilda "otros"), checkboxes
    de "contexto/marco" (educativo/artístico-cultural/investigación/otro,
    con código de proyecto + becaria sí/no si se tilda "investigación"),
    descripción libre, y Cancelar/Enviar. Mecanismo de envío resuelto:
    **`mailto:info@raumlab.org`** con asunto y cuerpo prearmados a partir
    de las respuestas (se descartó Formspree/Netlify Forms por ahora — sin
    dependencias de terceros, consistente con los demás contactos del
    sitio que ya usan `mailto:`).
  - **Materiales didácticos**: tarjeta placeholder ("Próximamente"/"En
    preparación") — reserva el lugar en el menú, todavía sin el contenido
    real (fichas de los PDFs propios). Pendiente que la usuaria lo mande.
  - Estilos nuevos en `style.css`: `.view-lede`/`.view-detail` (intro de
    la vista), y el sistema de modal/formulario (`.modal-overlay`,
    `.modal-box`, `.input-row`, `.form-fieldset`, `.checkbox-row`,
    `.form-btn`/`.form-btn-main`) — mismo criterio visual que el modal de
    exportación de in_SITE (`in_site/editor.html`), pero con sus propias
    clases porque `raumlab/index.html` no carga `raumlab-chrome.css` (no
    tiene la variable `--border-fine`; se usó `--surface-border`, ya
    definida en este `style.css`).
  - **Sin probar en navegador real**: este entorno no tiene Chromium ni
    Node disponibles para levantar un visor headless (mismo bloqueo que ya
    documentan otras rondas de este archivo). Se validó de forma estática
    (IDs sin duplicar, cada `getElementById` del script tiene su elemento,
    llaves de CSS y tags balanceados) pero falta la verificación visual
    real: abrir el menú, entrar a Educación → Soporte, tildar "otros" e
    "investigación" para confirmar que los campos condicionales aparecen,
    y mandar el formulario de prueba.
- **Selector de idioma ("ES")** es decorativo — el tooltip dice "próximamente
  EN / FR / PT", no cambia nada todavía.
- **estereo_GRAF**: card visible en la landing, marcada "En desarrollo", sin
  módulo real detrás (el link queda inerte a propósito).
- **Breakpoint de mobile inconsistente**: `raumlab-chrome.css` usa 768px para
  su propio media query; `espacio-inm.css` usa 900px para el suyo. No se tocó
  en esta ronda (no era parte de lo pedido) pero puede valer la pena
  unificarlo en algún momento.

## Rumbo a raumlab.org — lo que falta para publicar

No hay ningún archivo de configuración de hosting/deploy en el repo todavía
(sin `package.json`, sin `netlify.toml`/`vercel.json`, sin `CNAME`, sin CI) —
hoy el proyecto se sirve 100% como archivos estáticos, probado localmente con
Live Server. Antes de apuntar el dominio:

- **Elegir dónde hostear** (Netlify, Vercel, GitHub Pages, hosting propio) y
  configurar el DNS de raumlab.org para que apunte ahí.
- **HTTPS**: obligatorio para que funcione la Realidad Aumentada en celular
  (WebXR/cámara) — confirmar que el hosting elegido lo sirva por defecto (la
  mayoría lo hace automático).
- **Revisar que las rutas relativas sobrevivan al deploy** (`../../raumlab/...`
  entre módulos, `../raumlab/...`, etc.) — hoy funcionan porque todo vive bajo
  una carpeta común; si el hosting reorganiza la jerarquía de carpetas, hay
  que ajustarlas.
- **Dependencias vendorizadas (2026-08-27)**: Three.js, Panolens y JSZip
  cargaban desde `cdn.jsdelivr.net`/`cdnjs.cloudflare.com` sin SRI (Subresource
  Integrity) ni plan de respaldo si el CDN caía. Se bajaron las mismas
  versiones pinneadas (`three@0.105.2`, `panolens@0.12.1`, `jszip@3.10.1`) a
  `espacio_inm/vendor/` y los 3 `<script src>` en `espacio_inm/index.html`
  ahora apuntan ahí — el sitio ya no depende de que esos CDN estén arriba.
  Verificado con servidor estático local: `index.html` y los 3 archivos de
  `vendor/` responden 200. Si en el futuro se actualiza alguna de las 3
  librerías, hay que volver a descargar el archivo a mano (no hay `npm`/build
  step en el proyecto que lo automatice).
- **Meta tags / SEO / Open Graph**: agregados `description`, `canonical`,
  Open Graph y Twitter Card en las 4 páginas de entrada (raumlab, in_SITE,
  espacio_INM, trans_FORMA), más `BreadcrumbList` (JSON-LD) en los 3 módulos
  para declarar ante los buscadores que cuelgan de RaumLab (no se agregó en
  la home porque es la raíz, sin padre del que colgar). Las URLs canónicas
  ya asumen la estructura aplanada decidida (raumlab.org/ como raíz,
  `/in_site/`, `/mono_plano/`, `/espacio_inm/`) — si la estructura final
  cambia, hay que ajustarlas.
  - **espacio_INM emprolijado (2026-08-27)**: vivía anidado en
    `espacio_inm/espacio-inm/espacio-inm.html`; se aplanó a
    `espacio_inm/index.html` (se movieron `app-shell.css`, `espacio-inm.css`,
    `espacio-inm.js`, `fondos/` y `coleccion/` un nivel arriba, y se
    actualizaron las rutas relativas internas y los 7 links del sitio que
    apuntaban al path viejo). URL pública ahora limpia: `raumlab.org/espacio_inm/`.
  - **favicon**: no hay ícono definido todavía (mismo bloqueo que el
    og:image, ver abajo).
  - **og:image / twitter:image**: no se agregaron porque todavía no hay
    una imagen de marca elegida. Cuando exista un ícono/símbolo de RaumLab,
    conviene un solo asset (1200×630px) reutilizado en las 4 páginas vía
    `og:image`/`twitter:image` (con `twitter:card` pasando de `summary` a
    `summary_large_image`), en vez de una imagen distinta por módulo.
- **`info@raumlab.org` todavía NO está activo** (confirmado 2026-08-27) —
  sigue hardcodeado en el footer y el panel de navegación de la landing;
  no debería anunciarse/publicarse ese contacto hasta que exista la casilla.
  **`@raum.lab` (Instagram) sí está activo.**

## Potencialidades (ideas a futuro, sin comprometer nada)

- **Analítica respetuosa de la privacidad** (tipo Plausible/GoatCounter, sin
  cookies): coherente con la decisión ya tomada en los 3 módulos de que ningún
  dato de los usuarios llegue al operador del sitio — mediría visitas sin
  contradecir esa regla.
- **Contenido real para Investigación/Educación/Novedades**, o sacar esos
  links del menú hasta tenerlo (hoy prometen algo que no está).
- **estereo_GRAF ↔ in_SITE**: si estereo_GRAF llega a exportar modelos 3D
  texturizados por fotogrametría en un formato que in_SITE pueda importar, se
  podría escanear una escultura real y montarla en una sala virtual sin
  modelado manual — la conexión más interesante entre módulos hoy (ya
  señalada en el documento de in_SITE).
