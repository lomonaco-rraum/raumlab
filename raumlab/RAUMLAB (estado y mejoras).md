# RAUMLAB — Estado del proyecto y hoja de ruta

_Actualizado: 2026-08-23_

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
├── fondo.jpg, flecha_*.png     → assets compartidos
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

## Pendiente / conocido pero no resuelto

- **Sin verificar en dispositivo móvil real** todo lo de esta ronda (header,
  footer, pantallas de introducción) — el CSS de mobile se ajustó por código,
  pero este entorno no tiene acceso a un navegador ni a un celular real para
  probarlo (mismo bloqueo que ya documentan los ESTADO.md de los módulos).
- **Links muertos en la landing**: "Investigación", "Educación" y "Novedades"
  del menú apuntan a anclas (`#investigacion`, `#educacion`, `#novedades`) que
  no existen en la página — hoy no llevan a ningún lado. Solo "Recursos"
  (grilla de módulos) y "Contacto" (footer) tienen contenido real detrás.
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
