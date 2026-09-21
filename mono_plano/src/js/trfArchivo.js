/* ==========================================================================
   trans_FORMA - archivo .trf (trfArchivo.js)
   Mismo mecanismo que .rml en in_SITE (ver in_site/js/rmlArchivo.js): un ZIP
   renombrado con la imagen original + la rectificada + un proyecto.json con
   todo el estado editable (homografía, referencias de escala, dibujos).
   Solo se puede generar una vez que hay un fotoplano/fotomosaico ya
   rectificado — antes de eso no hay "resultado" que empaquetar (ver
   crearPanelMedicionYDibujo en app.js, es donde vive el botón Guardar).
   JSZip viaja como script global (vendor/jszip.min.js) — no hace falta
   importarlo, ya existe como `JSZip` en el scope global cuando este módulo
   corre.
   ========================================================================== */

const NOMBRE_JSON_EN_ZIP = 'proyecto.json';
const NOMBRE_RECTIFICADA_EN_ZIP = 'rectificada.png';
const PREFIJO_ORIGINAL_EN_ZIP = 'original';

// datosProyecto: objeto plano (homografía, referencias, dibujos, etc. — ver
// construcción en app.js). rectificadaBlob: PNG del canvas ya rectificado.
// originalFile: File original subido por el usuario — en Fotomosaico no hay
// un único "original" (es la fusión de varias fotos), así que puede venir
// null; en ese caso el .trf queda sin imagen original propia (ver nota en
// desempaquetarTRF sobre cómo se resuelve eso al cargar).
export function empaquetarTRF(datosProyecto, rectificadaBlob, originalFile) {
    const zip = new JSZip();
    zip.file(NOMBRE_JSON_EN_ZIP, JSON.stringify(datosProyecto, null, 2));
    zip.file(NOMBRE_RECTIFICADA_EN_ZIP, rectificadaBlob);
    if (originalFile) {
        const nombre = originalFile.name || '';
        const ext = (nombre.includes('.') ? nombre.split('.').pop() : 'jpg').toLowerCase();
        zip.file(`${PREFIJO_ORIGINAL_EN_ZIP}.${ext}`, originalFile);
    }
    return zip.generateAsync({ type: 'blob' });
}

// archivo: File/Blob de un <input type="file" accept=".trf">. La rectificada
// es obligatoria (sin eso no hay nada que mostrar); la original es opcional
// (proyectos de Fotomosaico guardados sin ella — el caller decide qué mostrar
// en el toggle "Imagen Original" cuando no viene).
export async function desempaquetarTRF(archivo) {
    const zip = await JSZip.loadAsync(archivo);

    const entradaJson = zip.file(NOMBRE_JSON_EN_ZIP);
    if (!entradaJson) {
        throw new Error('El archivo .trf no contiene proyecto.json — ¿es un .trf válido?');
    }
    const entradaRectificada = zip.file(NOMBRE_RECTIFICADA_EN_ZIP);
    if (!entradaRectificada) {
        throw new Error('El archivo .trf no contiene la imagen rectificada — ¿es un .trf válido?');
    }
    const entradasOriginal = zip.file(new RegExp(`^${PREFIJO_ORIGINAL_EN_ZIP}\\.`));
    const entradaOriginal = entradasOriginal.length > 0 ? entradasOriginal[0] : null;

    const [textoJson, rectificadaBlob, originalBlob] = await Promise.all([
        entradaJson.async('string'),
        entradaRectificada.async('blob'),
        entradaOriginal ? entradaOriginal.async('blob') : Promise.resolve(null)
    ]);

    return {
        datosProyecto: JSON.parse(textoJson),
        rectificadaBlob,
        originalBlob,
        originalNombre: entradaOriginal ? entradaOriginal.name : null
    };
}
