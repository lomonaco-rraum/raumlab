// src/js/creditoRaumlab.js
// Sello de marca ("Creado en raumlab.org" + logo) para las imágenes PNG
// exportadas por trans_FORMA — mismo criterio visual que in_SITE
// (in_site/js/registroExportViews.js: dibujarCreditoImagen), reimplementado
// acá porque este módulo no comparte código con in_site.

let logoCacheado;

// Carga el favicon de raumlab, lo recolorea a negro sólido (igual que hace
// in_site) y lo cachea — se llama una vez por sesión, no por exportación.
export async function cargarLogoRaumlab() {
    if (logoCacheado !== undefined) return logoCacheado;
    try {
        const imagen = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = '../raumlab/favicontransparente.png';
        });

        const canvas = document.createElement('canvas');
        canvas.width = imagen.naturalWidth;
        canvas.height = imagen.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imagen, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        logoCacheado = { canvas, aspecto: canvas.width / canvas.height };
    } catch (error) {
        console.error('No se pudo cargar el logo de raumlab:', error);
        logoCacheado = null;
    }
    return logoCacheado;
}

// Escala el crédito con la resolución de salida, igual que in_site, para que
// se lea igual de chico tanto en un PNG de pantalla como en un adaptativo a
// DPI de impresión (que puede salir varias veces más grande).
function factorCredito(anchoPx, altoPx) {
    return Math.max(1, Math.max(anchoPx, altoPx) / 2000);
}

// Dibuja el crédito centrado, cerca del borde inferior — logo + texto como
// un solo bloque. `ctx` es el contexto 2D de un canvas de exportación
// (nunca el canvas de trabajo que se sigue editando en pantalla).
const ALTO_LOGO_CREDITO_PX_BASE = 16;
export function dibujarCreditoRaumlab(ctx, anchoPx, altoPx, logo) {
    const factor = factorCredito(anchoPx, altoPx);
    const margen = 20 * factor;
    const altoLogo = ALTO_LOGO_CREDITO_PX_BASE * factor;
    const y = altoPx - margen;
    const texto = 'Creado en raumlab.org';

    ctx.save();
    ctx.font = `${13 * factor}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.85)';

    const anchoTexto = ctx.measureText(texto).width;
    const anchoLogo = (logo && logo.canvas) ? altoLogo * (logo.aspecto || 1) : 0;
    const gap = (logo && logo.canvas) ? 6 * factor : 0;
    let x = (anchoPx - (anchoLogo + gap + anchoTexto)) / 2;

    if (logo && logo.canvas) {
        ctx.drawImage(logo.canvas, x, y - altoLogo / 2, anchoLogo, altoLogo);
        x += anchoLogo + gap;
    }
    ctx.textAlign = 'left';
    ctx.fillText(texto, x, y);
    ctx.restore();
}

// Copia `canvasOrigen` a un canvas nuevo con el crédito ya dibujado encima —
// nunca muta el canvas de trabajo (el que sigue en pantalla o se reutiliza
// para mediciones), así el sello sale solo en el archivo descargado.
export async function estamparCanvas(canvasOrigen) {
    const logo = await cargarLogoRaumlab();
    const salida = document.createElement('canvas');
    salida.width = canvasOrigen.width;
    salida.height = canvasOrigen.height;
    const ctx = salida.getContext('2d');
    ctx.drawImage(canvasOrigen, 0, 0);
    dibujarCreditoRaumlab(ctx, salida.width, salida.height, logo);
    return salida;
}
