/* ==========================================================================
   in_SITE - archivo .rml (rmlArchivo.js)
   Un .rml es un ZIP renombrado (mismo mecanismo que .docx/.epub) con
   escena.glb + datos.json adentro — combina en un solo archivo el par que
   antes había que exportar/cargar por separado. No cambia el formato de
   ninguno de los dos: la escena sigue siendo un GLB válido y los datos un
   JSON válido, solo van empaquetados juntos.
   JSZip viaja como script global (vendor/jszip.min.js, mismo criterio que
   registroZip.js) — no hace falta importarlo, ya existe como `JSZip` en el
   scope global cuando este módulo corre.
   ========================================================================== */

const NOMBRE_GLB_EN_ZIP = 'escena.glb';
const NOMBRE_JSON_EN_ZIP = 'datos.json';

// glbArrayBuffer: el ArrayBuffer binario que devuelve GLTFExporter con
// {binary:true} — datosProyecto: el objeto plano de buildAttributesData()
// en editor.js (se serializa acá, no hace falta pasarlo ya stringificado).
export function empaquetarRML(glbArrayBuffer, datosProyecto) {
    const zip = new JSZip();
    zip.file(NOMBRE_GLB_EN_ZIP, glbArrayBuffer);
    zip.file(NOMBRE_JSON_EN_ZIP, JSON.stringify(datosProyecto, null, 2));
    return zip.generateAsync({ type: 'blob' });
}

// archivo: File/Blob de un <input type="file" accept=".rml">. datos.json es
// opcional (mismo criterio que hoy permite cargar un .glb sin JSON
// vinculado) — escena.glb es obligatorio, sin eso no hay nada que mostrar.
export async function desempaquetarRML(archivo) {
    const zip = await JSZip.loadAsync(archivo);

    const entradaGlb = zip.file(NOMBRE_GLB_EN_ZIP);
    if (!entradaGlb) {
        throw new Error('El archivo .rml no contiene una escena (escena.glb) — ¿es un .rml válido?');
    }

    const entradaJson = zip.file(NOMBRE_JSON_EN_ZIP);
    const [glbBlob, textoJson] = await Promise.all([
        entradaGlb.async('blob'),
        entradaJson ? entradaJson.async('string') : Promise.resolve(null)
    ]);

    return {
        glbBlob,
        datosJSON: textoJson ? JSON.parse(textoJson) : null
    };
}
