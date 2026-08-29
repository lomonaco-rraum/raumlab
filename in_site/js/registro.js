/* ==========================================================================
   in_SITE - REGISTRO: carga de proyecto (registro.js)
   Bootstrap de la página: wiring de DOM + carga de archivos (mismo patrón
   que viewer.js) e instancia de registroMotor.js. La lógica de exportación
   (vistas, cotas, 360°, ZIP, lámina PDF) se suma en fases siguientes,
   conectada al motor ya cargado acá.
   ========================================================================== */

import { crearMotorRegistro } from './registroMotor.js';
import { exportarVistaActual, exportarVistasGeometrales } from './registroExportViews.js';
import { exportarVistasAcotadas } from './registroDimensioning.js';
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
    const btnExportGeometrales = document.getElementById('registro-btn-export-geometrales');
    const btnExportAcotados = document.getElementById('registro-btn-export-acotados');
    const checkIncluirPiso = document.getElementById('registro-check-incluir-piso');
    const checksVistas = Array.from(document.querySelectorAll('.registro-check-vista'));

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

    btnExportActual.addEventListener('click', () => {
        try {
            const dataURL = exportarVistaActual(motor);
            descargarPNG(`${nombreBaseArchivo()}_vista-actual.png`, dataURL);
        } catch (error) {
            console.error('Error al exportar la vista actual:', error);
            alert(error.message || 'No se pudo exportar la vista actual.');
        }
    });

    // Compartida entre "Geometrales" y "Geometrales acotados" — misma
    // selección de vistas y mismo checkbox de piso, solo cambia qué función
    // de exportación se llama y el sufijo del nombre de archivo.
    async function exportarYDescargarLote(fnExportar, sufijoArchivo, mensajeError) {
        const idsSeleccionados = checksVistas.filter(c => c.checked).map(c => c.value);
        if (idsSeleccionados.length === 0) {
            alert('Tildá al menos una vista para exportar.');
            return;
        }

        try {
            const { vistas } = fnExportar(motor, idsSeleccionados, {
                incluirPiso: checkIncluirPiso.checked,
                maxPixelDim: Math.min(4096, motor.obtenerRenderer().capabilities.maxTextureSize)
            });

            const base = nombreBaseArchivo();
            if (vistas.length === 1) {
                descargarPNG(`${base}_${vistas[0].id}${sufijoArchivo ? '_' + sufijoArchivo : ''}.png`, vistas[0].dataURL);
            } else {
                const archivos = vistas.map(v => ({ nombre: `${base}_${v.id}${sufijoArchivo ? '_' + sufijoArchivo : ''}.png`, dataURL: v.dataURL }));
                await descargarComoZip(`${base}_${sufijoArchivo || 'geometrales'}.zip`, archivos);
            }
        } catch (error) {
            console.error(mensajeError, error);
            alert(error.message || 'No se pudieron exportar las vistas seleccionadas.');
        }
    }

    btnExportGeometrales.addEventListener('click', () => {
        exportarYDescargarLote(exportarVistasGeometrales, '', 'Error al exportar las vistas geometrales:');
    });

    btnExportAcotados.addEventListener('click', () => {
        exportarYDescargarLote(exportarVistasAcotadas, 'acotado', 'Error al exportar las vistas acotadas:');
    });
});
