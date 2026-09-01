/* ==========================================================================
   in_SITE - REGISTRO: carga de proyecto + wiring de exportación (registro.js)
   Bootstrap de la página: wiring de DOM + carga de archivos (mismo patrón
   que viewer.js), instancia de registroMotor.js, y conecta cada botón de
   exportación con su función en registroExportViews.js/registroDimensioning.js/
   registroLamina.js — nombre de archivo, logo de marca y el diálogo de
   formato de página (lámina + acotados en PDF) se resuelven acá, no en esos
   módulos.
   ========================================================================== */

import { crearMotorRegistro } from './registroMotor.js';
import { exportarVistaActual, exportarVistasGeometrales } from './registroExportViews.js';
import { exportarVistasAcotadasPDF } from './registroDimensioning.js';
import { exportarLaminaPDF } from './registroLamina.js';
import { descargarPNG, descargarComoZip } from './registroZip.js';

document.addEventListener('DOMContentLoaded', () => {
    const fileGlb = document.getElementById('registro-file-glb');
    const fileJson = document.getElementById('registro-file-json');
    const btnLoad = document.getElementById('registro-btn-load');
    const cargaSection = document.getElementById('registro-carga-section');
    const fichaSection = document.getElementById('registro-ficha-section');
    const btnVolver = document.getElementById('registro-btn-volver');

    const exportPlaceholder = document.getElementById('registro-export-placeholder');
    const exportOpciones = document.getElementById('registro-export-opciones');
    const btnExportActual = document.getElementById('registro-btn-export-actual');
    const selectCalidadActual = document.getElementById('registro-select-calidad-actual');
    const btnExportGeometrales = document.getElementById('registro-btn-export-geometrales');
    const btnExportAcotados = document.getElementById('registro-btn-export-acotados');
    const btnExportLamina = document.getElementById('registro-btn-export-lamina');
    const checkIncluirPiso = document.getElementById('registro-check-incluir-piso');
    const checksVistas = Array.from(document.querySelectorAll('.registro-check-vista'));

    const modalFormato = document.getElementById('registro-modal-formato');
    const selectFormatoTamanio = document.getElementById('registro-formato-tamanio');
    const selectFormatoOrientacion = document.getElementById('registro-formato-orientacion');
    const btnFormatoCancelar = document.getElementById('registro-formato-cancelar');
    const btnFormatoConfirmar = document.getElementById('registro-formato-confirmar');

    const motor = crearMotorRegistro({
        canvasContainer: document.getElementById('canvas-render-surface'),
        salaPlaceholder: document.getElementById('registro-sala-placeholder'),
        salaDatosReales: document.getElementById('registro-sala-datos-reales'),
        salaTitulo: document.getElementById('registro-sala-titulo'),
        salaMetadatos: document.getElementById('registro-sala-metadatos'),
        salaTextoCuratorial: document.getElementById('registro-sala-texto-curatorial')
    });

    function mostrarFichaProyecto() {
        cargaSection.classList.add('hidden');
        fichaSection.classList.remove('hidden');
        exportPlaceholder.classList.add('hidden');
        exportOpciones.classList.remove('hidden');
    }

    function mostrarCargaProyecto() {
        fichaSection.classList.add('hidden');
        cargaSection.classList.remove('hidden');
        exportOpciones.classList.add('hidden');
        exportPlaceholder.classList.remove('hidden');
    }

    // Nombre base para los archivos exportados: el de la sala si el JSON lo
    // trae, si no un fallback genérico — mismo criterio que
    // confirmarExportacion() en editor.js.
    function nombreBaseArchivo() {
        const datos = motor.obtenerDatosProyecto();
        const nombre = (datos && datos.nombre_sala) || 'proyecto_registro';
        return nombre.trim().replace(/\s+/g, '_').toLowerCase() || 'proyecto_registro';
    }

    btnLoad.addEventListener('click', () => {
        if (fileGlb.files.length === 0) {
            alert('Elegí un archivo .GLB para cargar el proyecto.');
            return;
        }

        motor.cargarGLB(URL.createObjectURL(fileGlb.files[0]));

        if (fileJson.files.length > 0) {
            const lector = new FileReader();
            lector.onload = (evento) => {
                try {
                    motor.setDatosProyecto(JSON.parse(evento.target.result));
                } catch (error) {
                    console.error('Error al parsear el archivo JSON:', error);
                    alert('El archivo de fichas técnicas no tiene un formato JSON válido.');
                }
            };
            lector.readAsText(fileJson.files[0]);
        } else {
            motor.limpiarDatosProyecto();
        }

        mostrarFichaProyecto();
    });

    btnVolver.addEventListener('click', () => {
        fileGlb.value = '';
        fileJson.value = '';
        mostrarCargaProyecto();
    });

    // El ícono fuente (favicontransparente.png) es un dibujo de líneas finas
    // que solo ocupa una fracción de su lienzo cuadrado — mucho margen
    // transparente alrededor. Si se lo deja tal cual, ese margen "roba"
    // tamaño real al trazo (queda más chico de lo que el mm asignado
    // sugiere) y descentra el logo dentro de su propio recuadro cuando se
    // arma el bloque logo+texto (el aspecto calculado con el lienzo entero
    // no es el aspecto real del contenido visible). Recorta al bounding
    // box de los píxeles no transparentes ANTES de medir aspecto/generar
    // el dataURL, así el logo ocupa todo el espacio que se le da y el
    // centrado del bloque logo+texto es el centrado real.
    function recortarAlContenidoOpaco(canvas) {
        const ctx = canvas.getContext('2d');
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let minX = width, minY = height, maxX = -1, maxY = -1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (data[(y * width + x) * 4 + 3] > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX || maxY < minY) return canvas; // todo transparente: no hay nada que recortar

        const recortado = document.createElement('canvas');
        recortado.width = maxX - minX + 1;
        recortado.height = maxY - minY + 1;
        recortado.getContext('2d').drawImage(canvas, minX, minY, recortado.width, recortado.height, 0, 0, recortado.width, recortado.height);
        return recortado;
    }

    // Carga el ícono del header y lo recolorea a negro para poder embeberlo
    // como crédito de marca — el ícono original es claro, pensado para el
    // fondo oscuro del header — sobre hoja/imagen clara no se leería. Se
    // cachea en memoria porque no cambia entre exportaciones sucesivas. Si
    // la carga falla (ej. archivo movido) se sigue sin logo en vez de
    // romper la exportación completa. `canvas` (el propio recorte ya
    // recoloreado) es lo que usan los overlays 2D de los PNG exportados
    // (ctx.drawImage acepta un <canvas> directo); `dataURL`/`aspecto` es lo
    // que usa jsPDF.addImage() en la lámina y en el PDF de acotados.
    let logoCacheado;
    async function cargarLogoRaumlab() {
        if (logoCacheado !== undefined) return logoCacheado;
        try {
            const imagen = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = '../raumlab/favicontransparente.png';
            });

            const canvasCompleto = document.createElement('canvas');
            canvasCompleto.width = imagen.naturalWidth;
            canvasCompleto.height = imagen.naturalHeight;
            const ctxCompleto = canvasCompleto.getContext('2d');
            ctxCompleto.drawImage(imagen, 0, 0);
            ctxCompleto.globalCompositeOperation = 'source-in';
            ctxCompleto.fillStyle = '#000000';
            ctxCompleto.fillRect(0, 0, canvasCompleto.width, canvasCompleto.height);

            const canvas = recortarAlContenidoOpaco(canvasCompleto);
            logoCacheado = { dataURL: canvas.toDataURL('image/png'), aspecto: canvas.width / canvas.height, canvas };
        } catch (error) {
            console.error('No se pudo cargar el logo de raumlab:', error);
            logoCacheado = null;
        }
        return logoCacheado;
    }

    // Diálogo de formato de página (tamaño + orientación), compartido entre
    // la lámina y el PDF de acotados — Promise que resuelve con
    // { tamanio, orientacion } al confirmar, o null si se cancela/cierra.
    function pedirFormatoPagina() {
        return new Promise((resolve) => {
            selectFormatoTamanio.value = 'a4';
            selectFormatoOrientacion.value = 'vertical';
            modalFormato.classList.remove('hidden');

            function cerrar(resultado) {
                modalFormato.classList.add('hidden');
                btnFormatoConfirmar.removeEventListener('click', onConfirmar);
                btnFormatoCancelar.removeEventListener('click', onCancelar);
                modalFormato.removeEventListener('click', onOverlayClick);
                resolve(resultado);
            }
            function onConfirmar() {
                cerrar({ tamanio: selectFormatoTamanio.value, orientacion: selectFormatoOrientacion.value });
            }
            function onCancelar() {
                cerrar(null);
            }
            function onOverlayClick(evento) {
                if (evento.target === modalFormato) cerrar(null);
            }

            btnFormatoConfirmar.addEventListener('click', onConfirmar);
            btnFormatoCancelar.addEventListener('click', onCancelar);
            modalFormato.addEventListener('click', onOverlayClick);
        });
    }

    btnExportActual.addEventListener('click', async () => {
        try {
            const calidad = selectCalidadActual.value;
            // "Fotomontaje / impresión": sin techo artificial, el límite real
            // es el tamaño de textura máximo que soporta la GPU — para
            // fotomontaje conviene la mayor resolución posible, no un tope
            // arbitrario pensado para uso liviano.
            const ladoMaximoPx = calidad === 'max'
                ? motor.obtenerRenderer().capabilities.maxTextureSize
                : Number(calidad);
            const logo = await cargarLogoRaumlab();
            const dataURL = exportarVistaActual(motor, { ladoMaximoPx, logo });
            descargarPNG(`${nombreBaseArchivo()}_vista-actual.png`, dataURL);
        } catch (error) {
            console.error('Error al exportar la vista actual:', error);
            alert(error.message || 'No se pudo exportar la vista actual.');
        }
    });

    btnExportGeometrales.addEventListener('click', async () => {
        const idsSeleccionados = checksVistas.filter(c => c.checked).map(c => c.value);
        if (idsSeleccionados.length === 0) {
            alert('Tildá al menos una vista para exportar.');
            return;
        }

        try {
            const logo = await cargarLogoRaumlab();
            const { vistas } = exportarVistasGeometrales(motor, idsSeleccionados, {
                incluirPiso: checkIncluirPiso.checked,
                maxPixelDim: Math.min(4096, motor.obtenerRenderer().capabilities.maxTextureSize),
                logo
            });

            const base = nombreBaseArchivo();
            if (vistas.length === 1) {
                descargarPNG(`${base}_${vistas[0].id}.png`, vistas[0].dataURL);
            } else {
                const archivos = vistas.map(v => ({ nombre: `${base}_${v.id}.png`, dataURL: v.dataURL }));
                await descargarComoZip(`${base}_geometrales.zip`, archivos);
            }
        } catch (error) {
            console.error('Error al exportar las vistas geometrales:', error);
            alert(error.message || 'No se pudieron exportar las vistas seleccionadas.');
        }
    });

    // Igual que la lámina: varios renders offscreen en secuencia + armado de
    // PDF es trabajo síncrono pesado, así que el botón avisa mientras corre.
    btnExportAcotados.addEventListener('click', async () => {
        const idsSeleccionados = checksVistas.filter(c => c.checked).map(c => c.value);
        if (idsSeleccionados.length === 0) {
            alert('Tildá al menos una vista para exportar.');
            return;
        }

        const formato = await pedirFormatoPagina();
        if (!formato) return;

        const textoOriginal = btnExportAcotados.textContent;
        btnExportAcotados.disabled = true;
        btnExportAcotados.textContent = 'Generando…';
        await new Promise((resolve) => setTimeout(resolve, 0));
        try {
            const logo = await cargarLogoRaumlab();
            const doc = exportarVistasAcotadasPDF(motor, idsSeleccionados, {
                incluirPiso: checkIncluirPiso.checked,
                maxPixelDim: Math.min(4096, motor.obtenerRenderer().capabilities.maxTextureSize),
                logo
            }, formato);
            doc.save(`${nombreBaseArchivo()}_acotado.pdf`);
        } catch (error) {
            console.error('Error al exportar las vistas acotadas:', error);
            alert(error.message || 'No se pudieron exportar las vistas acotadas.');
        } finally {
            btnExportAcotados.disabled = false;
            btnExportAcotados.textContent = textoOriginal;
        }
    });

    // Genera una miniatura offscreen por pieza en secuencia — con salas de
    // varias piezas se nota, así que el botón avisa mientras corre (a
    // diferencia de los otros exports, suficientemente rápidos como para no
    // necesitarlo).
    btnExportLamina.addEventListener('click', async () => {
        const formato = await pedirFormatoPagina();
        if (!formato) return;

        const textoOriginal = btnExportLamina.textContent;
        btnExportLamina.disabled = true;
        btnExportLamina.textContent = 'Generando…';
        // Yield al event loop antes del trabajo síncrono pesado (render de
        // miniaturas), si no el navegador nunca llega a pintar "Generando…".
        await new Promise((resolve) => setTimeout(resolve, 0));
        try {
            const logo = await cargarLogoRaumlab();
            const doc = exportarLaminaPDF(motor, logo, formato);
            doc.save(`${nombreBaseArchivo()}_lamina.pdf`);
        } catch (error) {
            console.error('Error al generar la lámina PDF:', error);
            alert(error.message || 'No se pudo generar la lámina PDF.');
        } finally {
            btnExportLamina.disabled = false;
            btnExportLamina.textContent = textoOriginal;
        }
    });
});
