/* ==========================================================================
   in_SITE - GALERÍA: cargar y visualizar tu propia escena (viewer.js)
   La lógica de visualización (Three.js + RA + panel curatorial + video como
   textura) vive en motorVisor.js, compartida con coleccion.html.
   ========================================================================== */

import { crearMotorVisor } from './motorVisor.js';

document.addEventListener('DOMContentLoaded', () => {
    const fileGlb = document.getElementById('file-user-glb');
    const fileJson = document.getElementById('file-user-json');
    const btnLoadScene = document.getElementById('btn-load-scene');

    const motor = crearMotorVisor({
        canvasContainer: document.getElementById('viewer-canvas-container'),
        arModelViewer: document.getElementById('ar-model-viewer'),
        btnAR: document.getElementById('ar-button'),
        panelCedula: document.getElementById('panel-cedula'),
        listaObrasIndexadas: document.getElementById('lista-obras-indexadas'),
        cedulaPlaceholder: document.getElementById('cedula-placeholder'),
        cedulaDatosReales: document.getElementById('cedula-datos-reales'),
        cedulaArtista: document.getElementById('cedula-artista'),
        cedulaTitulo: document.getElementById('cedula-titulo'),
        cedulaMetadatos: document.getElementById('cedula-metadatos'),
        cedulaDescripcion: document.getElementById('cedula-descripcion'),
        cedulaInstalacion: document.getElementById('cedula-instalacion'),
        salasListaContainer: document.getElementById('salas-lista-section'),
        salaFichaContainer: document.getElementById('sala-ficha-section'),
        salaFichaVolverBtn: document.getElementById('btn-volver-salas'),
        onVolverASalas: () => {
            fileGlb.value = '';
            fileJson.value = '';
        },
        salaPlaceholder: document.getElementById('sala-placeholder'),
        salaDatosReales: document.getElementById('sala-datos-reales'),
        salaTitulo: document.getElementById('sala-titulo'),
        salaMetadatos: document.getElementById('sala-metadatos'),
        salaTextoCuratorial: document.getElementById('sala-texto-curatorial')
    });

    btnLoadScene.addEventListener('click', () => {
        if (fileGlb.files.length > 0) {
            motor.cargarGLB(URL.createObjectURL(fileGlb.files[0]));
        }

        if (fileJson.files.length > 0) {
            const lector = new FileReader();
            lector.onload = (evento) => {
                try {
                    motor.setFichaTecnica(JSON.parse(evento.target.result));
                } catch (error) {
                    console.error("Error al parsear el archivo JSON:", error);
                    alert("El archivo de cédulas no tiene un formato JSON válido.");
                }
            };
            lector.readAsText(fileJson.files[0]);
        } else {
            motor.limpiarFichaTecnica();
        }
    });
});
