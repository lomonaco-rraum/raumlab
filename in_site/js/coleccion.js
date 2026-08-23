/* ==========================================================================
   in_SITE - COLECCIÓN RRAUM.LAB: piezas y escenas del estudio (coleccion.js)
   Misma lógica de visualización que Galería (ver motorVisor.js), pero acá el
   origen de la escena es fijo (los archivos en /projects) en vez de que el
   usuario suba los suyos.
   ========================================================================== */

import { crearMotorVisor } from './motorVisor.js';

// Para sumar una pieza nueva a la colección: agregar el .glb (y opcionalmente
// el .json de fichas técnicas, mismo nombre) a /projects, y una entrada acá.
const COLECCION = [
    { id: 'muestra_antologica', nombre: 'Exposición Antológica', anio: '2026', glb: 'projects/muestra_antologica.glb' },
    { id: 'gestus', nombre: 'Gestus', anio: '2026', glb: 'projects/gestus.glb' }
];

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('coleccion-grid');
    const placeholder = document.getElementById('coleccion-placeholder');

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
            document.querySelectorAll('.pieza-card').forEach(t => t.classList.remove('active'));
        },
        salaPlaceholder: document.getElementById('sala-placeholder'),
        salaDatosReales: document.getElementById('sala-datos-reales'),
        salaTitulo: document.getElementById('sala-titulo'),
        salaMetadatos: document.getElementById('sala-metadatos'),
        salaTextoCuratorial: document.getElementById('sala-texto-curatorial')
    });

    async function seleccionarPieza(pieza, tarjeta) {
        document.querySelectorAll('.pieza-card').forEach(t => t.classList.remove('active'));
        tarjeta.classList.add('active');
        placeholder.classList.add('hidden');

        motor.cargarGLB(pieza.glb);

        try {
            const respuesta = await fetch(pieza.glb.replace('.glb', '.json'));
            if (respuesta.ok) {
                motor.setFichaTecnica(await respuesta.json());
            } else {
                motor.limpiarFichaTecnica();
            }
        } catch (err) {
            motor.limpiarFichaTecnica();
        }
    }

    COLECCION.forEach((pieza) => {
        const tarjeta = document.createElement('button');
        tarjeta.type = 'button';
        tarjeta.className = 'pieza-card';

        tarjeta.innerHTML = `
            <span class="pieza-card-titulo">${pieza.nombre}</span>
            <span class="pieza-card-anio">${pieza.anio}</span>
        `;

        tarjeta.addEventListener('click', () => seleccionarPieza(pieza, tarjeta));
        grid.appendChild(tarjeta);
    });
});
