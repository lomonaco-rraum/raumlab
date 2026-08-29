/* ==========================================================================
   in_SITE - REGISTRO: descarga de PNGs sueltos o empaquetados en ZIP
   (registroZip.js)
   JSZip se carga como script global (vendor/jszip.min.js, mismo criterio
   que espacio_inm/vendor/jszip.min.js) — no hace falta importarlo, ya
   existe como `JSZip` en el scope global cuando este módulo corre.
   ========================================================================== */

export function descargarPNG(nombreArchivo, dataURL) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = nombreArchivo;
    a.click();
}

// archivos: [{ nombre, dataURL }]
export async function descargarComoZip(nombreArchivo, archivos) {
    const zip = new JSZip();
    archivos.forEach(({ nombre, dataURL }) => {
        const base64 = dataURL.split(',')[1];
        zip.file(nombre, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
}
