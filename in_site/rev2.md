# in_SITE — Migración estética a la identidad de RaumLab

_Registro de la migración visual de in_SITE al lenguaje de diseño de `raumlab/`
(fondo con grano, tipografía Geist/Space Grotesk, header/nav/footer compartidos).
Para el estado funcional del motor 3D/editor previo a esta migración, ver
`in_SITE (estado y mejoras).md` — ese documento no se toca acá, este es
específico de la migración estética._

---

## Estado por página

| Página | Estado |
|---|---|
| `index.html` (portada) | ✅ Cerrada |
| `editor.html` (Proyectos) | ✅ Cerrada |
| `viewer.html` (Visualizador) | ✅ Cerrada |
| `coleccion.html` (Galería RaumLab) | ✅ Cerrada |
| `instrucciones.html` (Tutoriales) | ⏳ Pendiente — **a propósito al final**, cuando el resto de los módulos de RaumLab (no solo in_SITE) estén cerrados. Palabras de la usuaria: "las instrucciones, para todos los módulos, las hacemos al final". |

---

## Qué se hizo

### Splash / portada de entrada
- Se **sacó el splash tipeado** que tenía `index.html` (el que decía "IN" / "SITE" letra por letra). Motivo: dependía de que cargaran las Google Fonts, de un `fondo.jpg` que no existía en `in_site/`, y tenía un bug real de z-index que tapaba el sitio entero después de la animación. Se decidió que, al entrarse a in_SITE siempre desde el hub de RaumLab (que ya tiene su propio splash), un segundo splash era redundante.
- Se borraron `raumlab-splash.css` y `raumlab-splash.js` de `in_site/` (quedaron huérfanos). El hub (`raumlab/index.html`) tiene su **propia** implementación de splash, separada — no se tocó.

### Chrome compartido (header / nav / footer)
Nuevos archivos, pensados para que **cualquier página nueva de in_SITE los reuse sin duplicar código**:

- **`css/raumlab-chrome.css`** — header fijo (hamburguesa + logo RAUMLAB + píldora ES), panel de navegación deslizable (Recursos > submenú de módulos + Investigación/Educación/Novedades/Contacto), breadcrumb + subnav del módulo (`.rc-module-subheader`, centrado en toda la página, no en el contenido), footer. Define las variables de diseño: `--bg-navy`, `--text-color`, `--border-fine`, `--font-geist`, `--font-space`, `--header-h`, `--footer-h`.
- **`js/raumlab-chrome.js`** — comportamiento del header: togglear el panel de navegación, abrir/cerrar el submenú "Recursos". Cada link del panel es un `<a href>` real (no hay ruteo por JS).
- **`css/module-shell.css`** — layout genérico de 3 columnas (izquierda / visor central / derecha) que comparten `editor.html`, `viewer.html` y `coleccion.html`: anchos (300px por columna), gaps, padding, radio y sombra del visor central, comportamiento de scroll de cada columna. **Todo lo que sea medida compartida vive acá — si algo no entra en una página, se ajusta este archivo, no cada CSS suelto**, para que las tres páginas no se desalineen entre sí con el tiempo.
- El fondo con grano (`fondo.jpg`) se referencia con ruta relativa a `raumlab/fondo.jpg` — no está duplicado dentro de `in_site/`.
- Las flechas usadas en toda la UI (volver, scroll de miniaturas) son la imagen `raumlab/flecha_derecha_ui.png` (apunta hacia arriba en el archivo original, se rota con CSS según el uso — igual que ya hace `raumlab/style.css`), no caracteres de texto ni íconos propios.

### Reglas de diseño establecidas
(romperlas fue motivo de corrección más de una vez durante la sesión — quedan anotadas para no repetir el error)

1. **Nada tiene caja/panel propio, salvo botones y tarjetas clickeables.** Las columnas laterales flotan directo sobre el fondo con grano de la página — sin `background-color` ni `border` en el contenedor. Solo los `<button>`/`<label>` de archivo y las tarjetas de sala tienen borde.
2. **Una sola familia tipográfica por función, no dos mezcladas.** Geist para todo el contenido de los módulos (labels, botones, valores); Space Grotesk queda reservado al header/menú del hub (donde ya estaba aprobado). Nada de cursivas en ningún lado.
3. **Jerarquía por peso, nunca por opacidad/gris.** El texto es siempre blanco al 100% (`var(--text-color)`); para algo que deba notarse menos, se baja el `font-weight`, no el color. Concretamente: botones en regular (400), labels/títulos de sección en fino (100 — el mismo peso que ya usa "LAB" en el logo del header). Placeholders de inputs: blancos y legibles, nunca grises.
4. **Bordes finos** (`--border-fine: rgba(242, 239, 233, 0.3)`) en vez de bordes blancos sólidos — se ven "más finos" sin bajar el ancho del borde en sí.
5. **Patrón de 3 columnas**: izquierda = general/carga/guardado, centro = visor, derecha = agregar/definir sobre lo seleccionado, arriba = pestañas de modo. Confirmado explícitamente por la usuaria comparando contra `espacio_INM` en el PDF de referencia (`raumlab/Presentación1.pdf`).
6. **Botones**: todos con texto centrado (excepto la lista "Obras en la Sala", que es una lista de ítems, no un botón suelto — queda alineada a la izquierda a propósito vía estilo inline en `motorVisor.js`). Un solo botón por pantalla lleva relleno (`.viewer-btn-main`, al 50% de opacidad — nunca blanco sólido); el resto son "fantasma" (borde fino, fondo transparente).
7. **Sin flechas arriba/abajo en ningún campo numérico** — solo carga por teclado.
8. **Mobile**: cada cambio de layout de escritorio necesita su ajuste en el mismo `@media (max-width: 768px)` en el mismo momento, no después. **Importante**: la usuaria todavía no pudo probar el resultado en un teléfono real (lo va a poder hacer recién cuando lo suba a un repositorio) — así que el trabajo mobile está hecho con ese criterio pero **no verificado en dispositivo real**.

### Cambios funcionales que se hicieron en el camino (no solo estéticos)
- **Ficha de la Sala** (editor): modal nuevo en el panel izquierdo — título de la exposición, artista/colectivo, año, texto curatorial. Datos a nivel de *toda la sala*, no de una pieza. Se guardan en el JSON exportado (`nombre_sala`, `artista_colectivo`, `anio_exposicion`, `texto_curatorial`) y en el archivo de "Guardar Proyecto".
- **Pestañas Disposición / Atributos** (editor, panel derecho): Disposición = posición/orientación/dimensión de la pieza seleccionada. Atributos = su ficha técnica (título, artista, técnica, descripción, montaje).
- **Colección / Visualizador**: columna izquierda con dos estados — lista de salas para elegir, o (una vez cargada una) su ficha (con botón para volver a la lista). Columna derecha: piezas de esa sala. Es la distinción "general de la sala" (izquierda) vs. "particular de cada pieza" (derecha), pedida explícitamente.
- **Editor**: "Agregar Piezas" pasó de 2 botones con texto a 3 botones de ícono (imagen / video / volumen 3D) — cada uno con su propio `<input type="file">` filtrado, pero todos llaman a la misma función de procesamiento (`handlePaintUpload`), que ya distinguía el tipo de archivo internamente.
- **Editor**: tira de miniaturas de piezas en fila horizontal (no grilla), con flechas que aparecen solo si hay piezas que no entran en el ancho visible.

---

## Pendiente

- **`instrucciones.html`**: sin reskinear, a propósito (ver arriba).
- **Verificación en teléfono real**: el trabajo mobile-first está hecho pero no confirmado por la usuaria en un dispositivo — revisar cuando lo suba a un repositorio/hosting.
- **Fondo del visor 3D en azul profundo**: idea que le gustó a la usuaria (un azul-negro casi neutro, no saturado, para no alterar el color real de las piezas cargadas) pero **explícitamente diferida** — hoy el visor sigue en gris claro neutro (`#FAFAFA`), que funciona bien. No cambiar sin que lo pida de nuevo.
- **`in_site/raumlab-splash.css`/`.js`**: ya no existen (se borraron). Si en algún momento se quiere un "momento de entrada" liviano a in_SITE, tendría que ser nuevo — sin las fragilidades del splash viejo (fuentes externas, `fondo.jpg` faltante, timing).
- Revisar si el resto de los módulos de RaumLab (`espacio_INM`, `trans_FORMA`) van a pasar por esta misma migración — este documento y `module-shell.css`/`raumlab-chrome.css` fueron pensados para ser reusables si así fuera, pero eso todavía no se decidió.
