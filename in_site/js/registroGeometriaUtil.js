/* ==========================================================================
   in_SITE - REGISTRO: utilidades geométricas compartidas
   (registroGeometriaUtil.js)
   Funciones puras (sin acceso a renderer/DOM) usadas tanto por
   registroExportViews.js ((a)/(b)) como por registroDimensioning.js ((c)) —
   viven en su propio módulo para que ninguno de los dos dependa del otro
   (evita un import circular entre ambos).
   ========================================================================== */

// Proyección exacta de un punto del mundo a píxel de pantalla para
// CUALQUIER cámara (usa matrixWorldInverse + projectionMatrix vía
// Vector3.project) — no hace falta derivar la fórmula a mano por cada
// orientación de cámara. Debe llamarse DESPUÉS de renderer.render() con esa
// misma cámara, para que sus matrices estén actualizadas.
export function proyectarPuntoAPixel(puntoWorld, camera, anchoPx, altoPx) {
    const ndc = puntoWorld.clone().project(camera);
    return {
        x: (ndc.x * 0.5 + 0.5) * anchoPx,
        y: (1 - (ndc.y * 0.5 + 0.5)) * altoPx
    };
}

// Un "cuadro" (imagen/video colgado) es un plano vertical prácticamente sin
// espesor (baseSize.z = 0.01, ver crearCuadroDesdeDataURL en editor.js) —
// se identifica por tener una de sus dos extensiones horizontales (X o Z)
// casi nula, a diferencia de una escultura, que tiene volumen real en
// ambas.
export const UMBRAL_PLANO_FINO_M = 0.05;

export function esPlanoFino(tam) {
    return Math.min(tam.x, tam.z) < UMBRAL_PLANO_FINO_M;
}
