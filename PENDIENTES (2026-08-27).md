# Pendientes surgidos el 2026-08-27

Resumen de lo que quedó abierto en la sesión de hoy — no es un changelog de
lo ya resuelto (eso está en el ESTADO.md de cada módulo y en el historial
de git), solo lo que falta.

## 1. espacio_INM: "rebote" al scrollear en "Crear" (celular) — SIN RESOLVER

Reporte: en la pantalla "Crear", en celular, el scroll se siente "anclado"
— rebota tanto al bajar como al subir, incluso después de haber recorrido
la página. Solo pasa en celular, no en escritorio.

Se investigaron y se descartaron, en este orden:
- Los 4 visores de Panolens renderizando en segundo plano (se implementó
  pausado/reanudado por modo — mejora real de rendimiento, pero no
  resolvió el rebote).
- Breakpoint inconsistente (900px en espacio-inm.css vs 768px en el resto)
  — probado y revertido, el usuario confirmó que le pasa en vertical, así
  que ese breakpoint no es la causa.
- `100vh` vs `100dvh` en el cálculo de alto mínimo — probado y revertido,
  in_SITE usa el mismo patrón (`100vh`) y no tiene el problema, así que se
  descartó.
- `overflow-y: hidden` sin liberar en `#app-main` — se revisó en detalle;
  como el elemento solo tiene `min-height` (no `height`), en teoría no
  debería clipear contenido real, así que quedó sin confirmar.
- Diferencia estructural real encontrada pero sin confirmar: `.tool-main`
  en espacio_INM usa **CSS grid**, mientras que el layout equivalente de
  in_SITE (`#editor-layout`) usa **flexbox** — CSS grid tiene un
  comportamiento de tamaño mínimo distinto en estos casos. Es la pista más
  sólida que queda, pero no se llegó a probar.
- Búsqueda de `scroll-snap`/`scrollTo`/`scrollTop` en el código de
  espacio_INM: no hay nada que fuerce la posición del scroll a mano.

**Estado**: sin arreglar. Los cambios especulativos de CSS se descartaron
a pedido explícito del usuario — no hay nada tocado en el repo relacionado
a esto. La vía más confiable para seguir es inspeccionar en vivo con las
herramientas de desarrollador (Safari conectado por cable a una Mac, u
otro navegador de escritorio) en vez de seguir adivinando desde el código.

## 2. Educación (raumlab) — sin contenido

La sección "Investigación" del menú ya tiene contenido real (presentación
de Paula Lomonaco + link a Academia.edu). "Educación" quedó pendiente — la
usuaria quiere pensar bien qué va a haber ahí antes de definir el
contenido. Hoy el link vuelve al inicio en vez de mostrar nada.

Idea acordada en su momento (sujeta a repensarse): espacio para pedir
cursos/material, con actividades propuestas listadas (mismo estilo de
card que "Recursos") y el pedido vía `mailto:info@raumlab.org`.

## 3. Selector de idioma (portugués) — decorativo, sin funcionalidad

El botón "ES" del header es decorativo (`cursor:default`), no despliega
nada al click. El tooltip ya menciona "próximamente EN / FR / PT". Se
pidió agregar portugués; queda pendiente decidir el alcance:
- Solo la interacción (desplegar ES/PT al click, cambiar la etiqueta,
  sin traducir el contenido todavía), o
- Traducción completa del contenido de los 4 módulos (mucho más trabajo).

## 4. trans_FORMA: padding-top de la intro no depende de `--header-h`

De paso, revisando el bug de superposición con "VOLVER" (ya arreglado hoy
en el padding-bottom de espacio_INM y trans_FORMA), se notó que
`.mode-intro-content` en trans_FORMA usa `padding-top: 24px` fijo en
celular, a diferencia de espacio_INM que sí usa
`calc(var(--header-h) + 20px)`. No se confirmó que esto cause un problema
visible (no fue lo reportado), pero es una inconsistencia que vale la pena
revisar si en algún momento se ve texto pegado al header en trans_FORMA
en celular.

## 5. Hosting / DNS / HTTPS (ya anotado antes de hoy, sigue abierto)

No es nuevo de hoy, pero sigue sin resolver: elegir dónde hostear
raumlab.org — GitHub Pages, según lo último hablado (da HTTPS automático,
necesario para que funcione RA en celular). La usuaria dijo que lo hace
"cuando termine la página".
