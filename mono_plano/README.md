# trans_FORMA — RaumLab

Uno de los cuatro módulos de [raumlab.org](https://raumlab.org): rectificación
fotográfica 2D. A partir de una o varias fotos oblicuas de una fachada u
objeto plano, genera un **fotoplano** (imagen rectificada a escala métrica
real), permite medir y dibujar sobre el resultado, y exportarlo como imagen
o DXF.

Es una app estática sin build ni dependencias externas: HTML + JS plano
(módulos ES), pensada para abrirse directo o servirse con cualquier servidor
estático (ej. Live Server de VSCode).

## Estructura del proyecto

```
mono_plano/
├── index.html                    Pantalla de inicio (solo "Nuevo Proyecto" / "Abrir Proyecto")
├── trans_FORMA (mejoras).txt     Diagnóstico original de UX que originó este trabajo
└── src/
    ├── css/
    │   └── styles.css            Estilos base y tokens (--ancho-rail, --ancho-sidebar, --alto-dialogo)
    └── js/
        ├── app.js                Toda la lógica de UI y orquestación
        ├── geometry.js           Motor matemático puro: homografía y fusión
        └── dxf.js                Escritor DXF R12 puro, sin dependencias
```

`geometry.js` y `dxf.js` no tocan el DOM — son funciones puras, fáciles de
verificar por separado. Toda la interacción vive en `app.js`.

## Flujo de pantallas

1. **Inicio** (`index.html`): solo "+ Nuevo Proyecto" y "📂 Abrir Proyecto"
   (este último inerte por ahora — ver idea #1 más abajo). Sin drag&drop en
   ningún lado de la app; todo carga con botones de archivo.
2. **Selector de modo**: pestañas **Fotoplano** / **Fotomosaico**.
   - Fotoplano: botón "+ Cargar Imagen" en la misma pantalla.
   - Fotomosaico: entra directo al workspace multi-imagen (sin pantalla
     intermedia) — el "+" de la columna de miniaturas carga la primera
     imagen y las siguientes.
3. **Workspace de rectificación** (`crearEstacionFotoplano`, reutilizada en
   los dos modos): marcado de puntos/rectas → área → generar → resultado
   con medición/dibujo.

## Modos de trabajo

### Fotoplano (una imagen)
Rectifica una única foto oblicua a un plano métrico real. Dos métodos, a
elección del usuario:

- **Analítico**: se marcan mínimo 4 puntos de control sobre la imagen, se
  cargan sus coordenadas reales (X, Y), y se confirman con el botón
  "✓ Confirmar valores reales" (habilitado recién con 4+ puntos). Resuelve
  una homografía por mínimos cuadrados (DLT). Cualquier edición posterior
  invalida la confirmación.
- **Geométrico**: se marcan al menos 2 rectas verticales y 2 horizontales
  (líneas de fuga), se cargan ancho/alto reales, y se confirman con
  "✓ Confirmar dimensiones reales". Calcula las 4 esquinas virtuales del
  rectángulo por intersección de rectas y resuelve la homografía a partir
  de esos puntos virtuales.

En los dos casos, el paso de "Área de Rectificación" queda bloqueado hasta
confirmar — antes alcanzaba con la cantidad de puntos/rectas, sin
garantizar que sus valores reales estuvieran realmente cargados.

Luego se define el área a rectificar (polígono, mínimo 3 vértices) y la
resolución de salida (GSD: mm/píxel). "Generar Fotoplano Métrico" resuelve
la homografía inversa y rellena el canvas de salida píxel a píxel.

### Fotomosaico (múltiples imágenes)
Para cuando una sola foto no cubre todo el objeto. Workspace con una
columna de miniaturas (A, B, C, D...), cada una con estado "Pendiente" o
"Lista". Click en una miniatura carga esa imagen en el mismo espacio de
rectificación (reutiliza `crearEstacionFotoplano` tal cual, vía
`opciones.resultadoPrevio` si ya estaba generada). Cambiar de miniatura sin
haber generado descarta lo marcado en esa imagen — solo se conserva el
resultado de las que llegaron a "Lista".

Con 2+ imágenes listas se habilita "Fusionar", que encadena de a pares
consecutivos:
1. Pantalla de **puntos homólogos**: ambas rectificaciones lado a lado, se
   marca un mínimo de 3 pares de puntos que representen el mismo punto real
   en las dos imágenes (mínimo 3, no 2 — da la redundancia necesaria para
   detectar error entre rectificaciones, no solo alinearlas).
2. Transformación de similitud (rotación + escala uniforme + traslación)
   por mínimos cuadrados. Si el error residual supera una tolerancia
   configurable (en mm), pregunta qué imagen usar como referencia
   ("principal") — la otra se ajusta a esa.
3. Composición: la imagen principal conserva sus píxeles tal cual; la
   secundaria solo rellena la extensión que la principal no cubre.
4. Si quedan más imágenes en la cola, se repite con la siguiente contra el
   resultado ya combinado.

## Interfaz

- **Paleta**: minimalista, escala de grises en toda la interfaz. Única
  excepción: la paleta de colores del panel "Dibujar" (ROJO/AMARILLO/
  VERDE/CIAN/AZUL/MAGENTA) — es funcional, no estética, porque define
  capas distintas en el DXF exportado.
- **Panel de diálogo** (`#panel-dialogo`, `mostrarMensaje`/
  `preguntarOpciones` en `app.js`): reemplaza todos los `alert()`/
  `confirm()`. Alto fijo (`--alto-dialogo`), oculto hasta entrar a un modo,
  abajo a la izquierda, mismo ancho que la columna izquierda
  (`--ancho-rail`). Los diálogos de elección (ej. "¿imagen A o B es la
  referencia?") son botones nombrados reales, no un `confirm()` binario.
- **Columna izquierda**: zoom (proporción 4:3, pegado abajo de su columna)
  siempre presente mientras se marcan puntos sobre la imagen original — se
  oculta al pasar a "Ver Fotoplano Rectificado". En Fotomosaico comparte
  columna con las miniaturas (`opciones.contenedorZoom` en
  `crearEstacionFotoplano`); las miniaturas tienen su propio scroll interno
  para no empujar el zoom ni los botones fuera de vista. La columna
  reserva el alto del panel de diálogo con `padding-bottom` para que nunca
  se superpongan.
- **Cuadrícula métrica** (toggle en "Consultar medidas"): se dibuja en un
  canvas más grande que la foto, con margen a los cuatro lados
  (`FRACCION_MARGEN_CUADRICULA`) — las líneas cruzan la imagen (color
  adaptativo blanco/negro según luminancia promedio de la foto) pero las
  etiquetas y marcas quedan afuera, en el margen, sin fondo propio (se ve
  el oscuro del workspace) para no ensuciar la foto. Espaciado autoajustado
  a un valor redondo (0.1, 0.5, 1, 5, 10m...). "Descargar imagen con cotas"
  la incluye si estaba activa.

## Medir y Dibujar

Disponible sobre cualquier resultado rectificado (Fotoplano o Fotomosaico),
dividido en dos grupos independientes:

- **Consultar medidas** (Coordenada XY / Lineal / Superficie): el resultado
  se anota directo sobre la imagen (marcador + etiqueta con el valor), no en
  una tabla. Botón para limpiar y para descargar la imagen con esas
  anotaciones quemadas en los píxeles (incluye la cuadrícula si está activa).
- **Dibujar** (Punto / Línea / Polígono / Forma libre): mantiene una tabla
  lateral con la métrica de cada figura y borrado individual. Se puede
  elegir color de una paleta fija antes de dibujar — **cada color se
  exporta como una capa distinta en el DXF**, así se puede activar/
  desactivar por color en AutoCAD. Descarga como imagen o como DXF.

Las capas de anotación son `<canvas>` transparentes a la resolución real de
la imagen (no SVG escalado por CSS), para que lo que se ve en pantalla y lo
que se descarga sean exactamente los mismos píxeles.

## Exportación DXF

`src/js/dxf.js` escribe DXF **R12 ASCII** a mano, sin ninguna librería.
Detalles de compatibilidad que costó descubrir (AutoCAD real es estricto,
a diferencia de visores livianos como QCAD/LibreCAD):

- Necesita declarar `HEADER` con `$ACADVER = AC1009` — sin eso, AutoCAD
  rechaza el archivo.
- `LWPOLYLINE` **no existe en R12** (se agregó en versiones posteriores).
  Los polígonos y trazos libres se escriben con el formato clásico
  `POLYLINE` / `VERTEX` / `SEQEND`.
- Cada color usado declara su propia capa en una sección `TABLES/LAYER`
  (grupo 62 = índice de color ACI); las entidades heredan el color de su
  capa (comportamiento `BYLAYER`, sin necesidad de fijarlo por entidad).
- Coordenadas en metros reales = unidades DXF (1:1), consistente con el
  resto de la app.

## Motor matemático (`geometry.js`)

- `calcularHomografia(puntos)` — DLT clásico por mínimos cuadrados a partir
  de ≥4 pares de puntos imagen↔mundo real.
- `calcularHomografiaGeometrica(rectasV, rectasH, escalaX, escalaY)` —
  método de líneas de fuga: intersección de rectas para hallar 4 esquinas
  virtuales, y de ahí resuelve la homografía con el mismo DLT.
- `calcularTransformSimilitud(paresHomologos)` — transformación de
  similitud 2D (rotación + escala + traslación) resuelta como sistema
  lineal (modelo de número complejo `Z_A = a·Z_B + b`), con cálculo de
  residuo por punto y RMS para detectar desajustes entre rectificaciones.
- Toda inversión de matriz usa el mismo Gauss-Jordan genérico
  (`invertirMatrizNxN`), reutilizado tanto para el sistema 8×8 de la
  homografía como el 4×4 de la similitud.

## Estado actual

Comparado con el diagnóstico original (`trans_FORMA (mejoras).txt`):

- ✅ Fotoplano (analítico y geométrico, con confirmación de valores reales)
- ✅ Fotomosaico multi-imagen (motor + interfaz + miniaturas)
- ✅ Medir y Dibujar + exportación DXF (con capas por color)
- ✅ Deuda de UI de la primera pasada (alerts reemplazados, zoom
  reposicionado, paleta a escala de grises, diálogo de descarga con
  nombre/formato pendiente todavía — ver ideas)

## Ideas para versiones futuras

1. **Guardar/Abrir proyecto (`.mpl`, "mono plano")**: archivo con el
   fotoplano/fotomosaico, variables de rectificación y atributos agregados
   (dibujos, cotas, textos), para reabrir sin re-marcar nada. Confirmado
   como función **"PRO"** — se implementa cuando exista esa capa en
   RaumLab, no ahora.
2. **Indicador de error en la homografía del Fotoplano**: reproyectar los
   puntos de control y mostrar cuánto se desvían (mismo concepto que ya
   existe para Fotomosaico). Solo tiene información real con 5+ puntos
   (con exactamente 4 el residuo es siempre cero). Requiere una
   **tolerancia** configurable, igual que la de Fotomosaico.
3. **Corrección de distorsión de lente** antes de rectificar: hoy se
   resuelve manualmente en un editor externo (ej. Photoshop). Confirmado
   como importante, pendiente.
4. **Diálogo de descarga con nombre de archivo y formato elegibles**: hoy
   las descargas usan nombre fijo y PNG siempre.

## Cómo correrlo

No requiere build. Basta con servir la carpeta con cualquier servidor
estático (ej. extensión Live Server de VSCode) y abrir `index.html` — los
`<script type="module">` necesitan `http://`, no funcionan bien abiertos
directo como `file://`.
