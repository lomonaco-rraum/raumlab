/* ==========================================================================
   in_SITE - REGISTRO: (d) lámina PDF (registroLamina.js)
   Portada (título + texto curatorial de la sala) + una página por pieza
   (miniatura aislada + ficha técnica, mismo formato de texto que la cédula
   del visor en motorVisor.js). jsPDF viaja como vendor/jspdf.umd.min.js,
   cargado como script global en registro.html — se usa acá como
   window.jspdf.jsPDF, mismo criterio que JSZip en registroZip.js.
   ========================================================================== */

import * as THREE from 'three';
import { detectarPiso } from './registroExportViews.js';
import { esPlanoFino, calcularDimensionesPagina, dibujarNumeroPaginaPDF } from './registroGeometriaUtil.js';

const TAMANIO_MINIATURA_PX = 800;
const MARGEN_MINIATURA_PLANA = 1.15; // aire alrededor del cuadro/video, proporcional a su tamaño

// Cuadros y videos son planos verticales casi sin espesor en uno de sus dos
// ejes horizontales (mismo criterio que esPlanoFino()/dibujarIndicadoresDePlanos()
// en registroExportViews.js) — fotografiarlos desde el ángulo diagonal "de
// catálogo" los deforma en perspectiva. Acá van de frente, sin perspectiva
// (cámara ortográfica), para que se lean como la imagen que son.
function crearCamaraFrontalPlana(centro, tamano) {
    const ejeFinoEsX = tamano.x <= tamano.z;
    const anchoReal = (ejeFinoEsX ? tamano.z : tamano.x) * MARGEN_MINIATURA_PLANA;
    const altoReal = tamano.y * MARGEN_MINIATURA_PLANA;
    const lado = Math.max(anchoReal, altoReal, 0.1); // encuadre cuadrado, mismo formato que el resto de las miniaturas
    const D = lado * 10;

    const camera = new THREE.OrthographicCamera(-lado / 2, lado / 2, lado / 2, -lado / 2, 0.1, D * 2);
    camera.up.set(0, 1, 0);

    // La sala está centrada en el origen (mismo criterio que construirConfiguracionVistas()
    // en registroExportViews.js) — la cámara se ubica del lado de la pieza más
    // cercano al centro de la sala, no del lado de la pared, para mirarla "desde
    // adentro" como lo haría alguien parado en la sala.
    const coordenadaPieza = ejeFinoEsX ? centro.x : centro.z;
    const direccion = -Math.sign(coordenadaPieza) || 1;
    if (ejeFinoEsX) {
        camera.position.set(centro.x + direccion * D, centro.y, centro.z);
    } else {
        camera.position.set(centro.x, centro.y, centro.z + direccion * D);
    }

    camera.lookAt(centro);
    camera.updateProjectionMatrix();
    return camera;
}

// Mismo ángulo "de catálogo" que generarThumbnailEscultura() en editor.js,
// pero encuadrando el bounding box MUNDIAL del nodo en vez de clonarlo y
// resetear su transform — acá la pieza vive dentro de la escena completa de
// la sala, con su posición/rotación real, no aislada en una escena propia.
function crearCamaraOrbitalEscultura(centro, tamano) {
    const dimensionMax = Math.max(tamano.x, tamano.y, tamano.z, 0.1);
    const camera = new THREE.PerspectiveCamera(35, 1, dimensionMax / 100, dimensionMax * 50);
    camera.position.set(
        centro.x + dimensionMax * 1.4,
        centro.y + dimensionMax * 1.1,
        centro.z + dimensionMax * 1.4
    );
    camera.lookAt(centro);
    camera.updateProjectionMatrix();
    return camera;
}

// Cámara propia y descartable (no la del visor orbital) — mismo criterio que
// crearCamaraOrtografica() en registroExportViews.js: los módulos de
// exportación arman su propia cámara sobre la escena ya cargada, nunca
// mueven la cámara compartida de OrbitControls (si no, la vista previa
// queda mirando a la última pieza exportada al terminar). Esculturas: ángulo
// diagonal 3/4. Cuadros/videos (planos finos): frontal sin perspectiva.
function crearCamaraParaMiniatura(node) {
    const box = new THREE.Box3().setFromObject(node);
    const centro = box.getCenter(new THREE.Vector3());
    const tamano = box.getSize(new THREE.Vector3());

    return esPlanoFino(tamano)
        ? crearCamaraFrontalPlana(centro, tamano)
        : crearCamaraOrbitalEscultura(centro, tamano);
}

// Un Map<id, node> por proyecto (una sola pasada de traverse) en vez de
// buscar el nodo de cada pieza por separado — detectarPiso() usa el mismo
// criterio de traverse() porque el grupo exportado deja piso/piezas como
// nietos de la escena, no hijos directos (ver comentario en
// registroExportViews.js).
function mapearNodosPorId(escenaCargada, obras) {
    const idsBuscados = new Set(obras.map(o => o.id));
    const mapa = new Map();
    escenaCargada.traverse((nodo) => {
        if (idsBuscados.has(nodo.name) && !mapa.has(nodo.name)) {
            mapa.set(nodo.name, nodo);
        }
    });
    return mapa;
}

// Renderiza la miniatura de una pieza aislándola: oculta el resto de las
// piezas + el piso, encuadra y renderiza con el renderer/escena YA vivos del
// motor (mismo criterio anti-agotamiento-de-contextos-WebGL que
// renderizarVistaOffscreen() en registroExportViews.js), y restaura todo.
// Devuelve null si la pieza no tiene nodo asociado en la escena (JSON/GLB
// desincronizados) — la página de esa pieza se arma sin imagen en vez de
// romper la exportación completa.
function renderizarMiniaturaPieza(motor, node, nodosPieza) {
    if (!node) return null;

    const renderer = motor.obtenerRenderer();
    const scene = motor.obtenerEscena();
    const camera = crearCamaraParaMiniatura(node);
    const escenaCargada = motor.obtenerEscenaCargada();
    const piso = detectarPiso(escenaCargada);

    const visibilidadOriginal = new Map();
    nodosPieza.forEach((otroNodo) => {
        visibilidadOriginal.set(otroNodo, otroNodo.visible);
        otroNodo.visible = (otroNodo === node);
    });
    if (piso) {
        visibilidadOriginal.set(piso, piso.visible);
        piso.visible = false;
    }

    const colorClearOriginal = new THREE.Color();
    renderer.getClearColor(colorClearOriginal);
    const alphaClearOriginal = renderer.getClearAlpha();
    const fondoOriginal = scene.background;
    const contenedor = renderer.domElement.parentElement;
    const anchoBase = contenedor.clientWidth;
    const altoBase = contenedor.clientHeight;

    scene.background = new THREE.Color(0xFFFFFF);
    renderer.setClearColor(0xFFFFFF, 1);
    renderer.setSize(TAMANIO_MINIATURA_PX, TAMANIO_MINIATURA_PX, false);
    renderer.render(scene, camera);

    const canvasSalida = document.createElement('canvas');
    canvasSalida.width = TAMANIO_MINIATURA_PX;
    canvasSalida.height = TAMANIO_MINIATURA_PX;
    canvasSalida.getContext('2d').drawImage(renderer.domElement, 0, 0, TAMANIO_MINIATURA_PX, TAMANIO_MINIATURA_PX);
    const dataURL = canvasSalida.toDataURL('image/png');

    visibilidadOriginal.forEach((visible, nodo) => { nodo.visible = visible; });
    scene.background = fondoOriginal;
    renderer.setClearColor(colorClearOriginal, alphaClearOriginal);
    renderer.setSize(anchoBase, altoBase, false);

    return dataURL;
}

const MARGEN_MM = 20;

// Tamaño de página mutable: aplicarFormatoPagina() lo puebla al arrancar
// exportarLaminaPDF() según lo que haya elegido la usuaria en el diálogo de
// formato (registro.js) — todas las funciones de dibujo de acá abajo leen
// PAGINA.* en el momento de dibujar, así que no hace falta pasarles el
// tamaño como parámetro una por una.
const PAGINA = { ancho: 210, alto: 297, anchoUtil: 210 - MARGEN_MM * 2, mitad: 297 / 2, orientation: 'portrait' };

function aplicarFormatoPagina(formato) {
    const dim = calcularDimensionesPagina(formato);
    PAGINA.ancho = dim.ancho;
    PAGINA.alto = dim.alto;
    PAGINA.orientation = dim.orientation;
    PAGINA.anchoUtil = PAGINA.ancho - MARGEN_MM * 2;
    PAGINA.mitad = PAGINA.alto / 2;
}

// Composición de la página de pieza: mitad superior para la imagen, el
// texto arranca recién pasada la mitad + un aire — no pegado a la imagen.
const Y_INICIO_IMAGEN_MM = 22;
const AIRE_IMAGEN_TEXTO_MM = 16;

const ALTO_LOGO_MM = 8;

// Marca centrada ("Producido en © raumlab", + logo si se pudo cargar uno —
// ver cargarLogoRaumlab() en registro.js, que lo trae ya convertido a
// dataURL porque este módulo no hace fetch de assets por su cuenta) en el
// pie de TODAS las páginas — portada y piezas por igual. Sin fecha: la
// lámina no queda fechada, ni en portada ni en el resto de las hojas.
function dibujarPie(doc, logo) {
    const y = PAGINA.alto - 12;
    const texto = 'Producido en © raumlab';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140);

    const anchoTexto = doc.getTextWidth(texto);
    const anchoLogo = logo ? ALTO_LOGO_MM * (logo.aspecto || 1) : 0;
    const gap = logo ? 3 : 0;
    let x = (PAGINA.ancho - (anchoLogo + gap + anchoTexto)) / 2;

    if (logo) {
        doc.addImage(logo.dataURL, 'PNG', x, y - ALTO_LOGO_MM + 1.5, anchoLogo, ALTO_LOGO_MM);
        x += anchoLogo + gap;
    }
    doc.text(texto, x, y);
    doc.setTextColor(0);
}

// Escribe un párrafo envuelto a PAGINA.anchoUtil, agregando páginas nuevas
// cuando el cursor Y llega al margen inferior — reusado por el texto
// curatorial de portada y la descripción de cada pieza. Devuelve el Y final.
function escribirParrafoConSalto(doc, texto, x, yInicial, opciones = {}) {
    const { tamanioFuente = 10, interlineado = 5.5, yLimite = PAGINA.alto - 25, alPaginar = null } = opciones;
    doc.setFontSize(tamanioFuente);
    const lineas = doc.splitTextToSize(texto, PAGINA.anchoUtil - (x - MARGEN_MM));
    let y = yInicial;
    lineas.forEach((linea) => {
        if (y > yLimite) {
            doc.addPage();
            if (alPaginar) alPaginar();
            y = MARGEN_MM + 10;
        }
        doc.text(linea, x, y);
        y += interlineado;
    });
    return y;
}

function dibujarPortada(doc, datosProyecto, totalPiezas, logo) {
    const titulo = (datosProyecto && datosProyecto.nombre_sala) || 'Sin título';
    const artista = (datosProyecto && datosProyecto.artista_colectivo) || '';
    const anio = (datosProyecto && datosProyecto.anio_exposicion) || '';
    const texto = (datosProyecto && datosProyecto.texto_curatorial) || '';
    const subtitulo = [artista, anio].filter(Boolean).join(' — ');

    let y = 45;
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(24);
    const lineasTitulo = doc.splitTextToSize(titulo, PAGINA.anchoUtil);
    lineasTitulo.forEach((linea) => { doc.text(linea, MARGEN_MM, y); y += 11; });

    if (subtitulo) {
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(110);
        doc.text(subtitulo, MARGEN_MM, y);
        doc.setTextColor(0);
        y += 14;
    } else {
        y += 10;
    }

    if (texto) {
        doc.setFont('helvetica', 'normal');
        escribirParrafoConSalto(doc, texto, MARGEN_MM, y, { tamanioFuente: 11, interlineado: 6 });
    }

    dibujarPie(doc, logo);
    dibujarNumeroPaginaPDF(doc, 1, totalPiezas > 0 ? totalPiezas + 1 : 1, PAGINA.ancho, PAGINA.alto, MARGEN_MM);
}

function dibujarPaginaPieza(doc, obra, dataURLMiniatura, nombreSala, indice, totalPiezas, logo) {
    doc.addPage();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(nombreSala || '', MARGEN_MM, 14);
    doc.setTextColor(0);

    const altoDisponibleImagen = PAGINA.mitad - Y_INICIO_IMAGEN_MM;
    const ladoImagenMm = Math.min(altoDisponibleImagen, PAGINA.anchoUtil);
    if (dataURLMiniatura) {
        const xImagen = (PAGINA.ancho - ladoImagenMm) / 2;
        const yImagen = Y_INICIO_IMAGEN_MM + (altoDisponibleImagen - ladoImagenMm) / 2;
        doc.addImage(dataURLMiniatura, 'PNG', xImagen, yImagen, ladoImagenMm, ladoImagenMm);
    }

    let y = PAGINA.mitad + AIRE_IMAGEN_TEXTO_MM;

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(14);
    doc.text(obra.titulo || 'Sin título', MARGEN_MM, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(obra.artista || 'Artista Desconocido', MARGEN_MM, y);
    y += 7;

    doc.setFontSize(9);
    doc.setTextColor(110);
    [obra.anio, obra.tecnica, obra.dimensiones].forEach((linea) => {
        doc.text(String(linea), MARGEN_MM, y);
        y += 5;
    });
    doc.setTextColor(0);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const descripcion = obra.descripcion || 'Esta obra no cuenta con un texto curatorial registrado.';
    y = escribirParrafoConSalto(doc, descripcion, MARGEN_MM, y, { tamanioFuente: 10, interlineado: 5.5 });

    if (obra.instalacion) {
        y += 4;
        doc.setFontSize(9);
        doc.setTextColor(110);
        y = escribirParrafoConSalto(doc, `Traslado y montaje: ${obra.instalacion}`, MARGEN_MM, y, { tamanioFuente: 9, interlineado: 5 });
        doc.setTextColor(0);
    }

    dibujarPie(doc, logo);
    dibujarNumeroPaginaPDF(doc, indice + 2, totalPiezas + 1, PAGINA.ancho, PAGINA.alto, MARGEN_MM);
}

// Punto de entrada: arma y devuelve el documento jsPDF (sin descargarlo —
// mismo criterio que exportarVistaActual/exportarVistasGeometrales, que
// devuelven el contenido y dejan que registro.js decida el nombre de
// archivo y dispare la descarga). `logo`: { dataURL, aspecto } o null — lo
// trae ya cargado registro.js (fetch de assets no es responsabilidad de
// este módulo), se dibuja en el pie de cada página si está disponible.
// `formato`: { tamanio: 'a4'|'a3'|'carta', orientacion: 'vertical'|'horizontal' }
// — lo elige la usuaria en el diálogo de formato (registro.js).
export function exportarLaminaPDF(motor, logo = null, formato = null) {
    if (!motor.obtenerEscenaCargada()) {
        throw new Error('No hay ningún proyecto cargado.');
    }

    aplicarFormatoPagina(formato);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [PAGINA.ancho, PAGINA.alto], orientation: PAGINA.orientation });

    const datosProyecto = motor.obtenerDatosProyecto();
    const obras = motor.obtenerObrasProcesadas();
    const nombreSala = (datosProyecto && datosProyecto.nombre_sala) || '';

    dibujarPortada(doc, datosProyecto, obras.length, logo);

    if (obras.length > 0) {
        const escenaCargada = motor.obtenerEscenaCargada();
        const nodosPorId = mapearNodosPorId(escenaCargada, obras);
        const nodosPieza = Array.from(nodosPorId.values());

        obras.forEach((obra, indice) => {
            const dataURLMiniatura = renderizarMiniaturaPieza(motor, nodosPorId.get(obra.id), nodosPieza);
            dibujarPaginaPieza(doc, obra, dataURLMiniatura, nombreSala, indice, obras.length, logo);
        });
    }

    return doc;
}
