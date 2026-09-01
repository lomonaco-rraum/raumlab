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

// Tamaños de hoja disponibles en el diálogo de formato (registro.js) —
// compartidos entre registroLamina.js (d) y el PDF de acotados (c), para no
// definirlos dos veces.
export const FORMATOS_PAGINA_MM = {
    a4: { ancho: 210, alto: 297 },
    a3: { ancho: 297, alto: 420 },
    carta: { ancho: 215.9, alto: 279.4 }
};

// `formato`: { tamanio: 'a4'|'a3'|'carta', orientacion: 'vertical'|'horizontal' }
// → dimensiones ya ordenadas según la orientación pedida + el string de
// orientación que espera jsPDF.
export function calcularDimensionesPagina(formato) {
    const base = FORMATOS_PAGINA_MM[(formato && formato.tamanio) || 'a4'] || FORMATOS_PAGINA_MM.a4;
    const horizontal = !!(formato && formato.orientacion === 'horizontal');
    const menor = Math.min(base.ancho, base.alto);
    const mayor = Math.max(base.ancho, base.alto);
    return {
        ancho: horizontal ? mayor : menor,
        alto: horizontal ? menor : mayor,
        orientation: horizontal ? 'landscape' : 'portrait'
    };
}

// Número de página estilo "3/12" — actual en negrita, total en fino,
// pegados sin espacio — abajo a la derecha. Reusado por registroLamina.js
// (d) y por el PDF de acotados (c), antes duplicado solo en el primero.
export function dibujarNumeroPaginaPDF(doc, actual, total, anchoPagina, altoPagina, margen) {
    const y = altoPagina - 12;
    const xDerecha = anchoPagina - margen;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140);
    const textoTotal = `/${total}`;
    doc.text(textoTotal, xDerecha, y, { align: 'right' });
    const anchoTotal = doc.getTextWidth(textoTotal);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(String(actual), xDerecha - anchoTotal, y, { align: 'right' });

    doc.setFont('helvetica', 'normal');
}
