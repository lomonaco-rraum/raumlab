/* ==========================================================================
   in_SITE - REGISTRO: exportación (a) vista actual + (b) geometrales
   (registroExportViews.js)
   Cubre las salidas PNG con alfa a partir de la escena ya cargada en
   registroMotor.js: la vista orbital tal cual la dejó el usuario (a), y las
   5 vistas ortogonales (planta + 4 elevaciones) a densidad compartida (b).
   El overlay de cotas de (c) — geometrales acotados — vive en un módulo
   aparte (registroDimensioning.js, fase siguiente) que reusa las mismas
   cámaras/renders que arma este archivo.
   ========================================================================== */

import * as THREE from 'three';
import { proyectarPuntoAPixel, UMBRAL_PLANO_FINO_M } from './registroGeometriaUtil.js';

export const IDS_VISTAS_GEOMETRALES = ['planta', 'frontal', 'posterior', 'lateral-izq', 'lateral-der'];

const DENSIDAD_DEFAULT_PX_POR_METRO = 300;
const MAX_PIXEL_DIM_DEFAULT = 4096;

// Aire real (en metros) alrededor del contenido de cada vista, para que la
// sala no quede pegada al borde de la imagen. Se suma a las dimensiones
// reales ANTES de calcular densidad — es "de más" real, se dibuja a la
// misma escala que todo lo demás, no rompe la comparabilidad entre vistas.
const MARGEN_ENCUADRE_M = 0.5;

// Cálculo de densidad compartida entre todas las vistas de un mismo lote de
// exportación — función pura, sin tipos de Three.js, para que el resultado
// (y la barra de escala, que se dibuja a partir de él) sea el mismo sin
// importar cuántas vistas se tildaron ni en qué orden.
export function calcularDensidadCompartida(vistas, densidadDeseadaPxPorMetro, maxPixelDim) {
    const extentMax = Math.max(...vistas.flatMap(v => [v.anchoReal, v.altoReal]));
    let densidad = densidadDeseadaPxPorMetro;
    if (extentMax * densidad > maxPixelDim) {
        densidad = maxPixelDim / extentMax;
    }
    return {
        densidadPxPorMetro: densidad,
        vistas: vistas.map(v => ({
            id: v.id,
            anchoPx: Math.max(1, Math.round(v.anchoReal * densidad)),
            altoPx: Math.max(1, Math.round(v.altoReal * densidad))
        }))
    };
}

// El piso (si el usuario lo incluyó al exportar desde Proyectos) es un
// THREE.Mesh sin nombre, agregado como hijo directo de la escena junto a
// las piezas (ver construirGrupoExportable() en editor.js) — no hay forma
// de identificarlo por nombre. En cambio SÍ es identificable por forma: es
// el único mesh horizontal (extensión en Y casi nula) apoyado en Y≈0. Los
// cuadros son verticales y las esculturas tienen volumen real, así que no
// deberían confundirse con esto.
export function detectarPiso(escenaCargada) {
    if (!escenaCargada) return null;
    let piso = null;
    // traverse(), no children.forEach(): al volver a cargar el GLB exportado
    // desde Proyectos, el grupo exportable (construirGrupoExportable() en
    // editor.js) queda como un nodo contenedor intermedio — el piso y las
    // piezas no son hijos DIRECTOS de la escena, sino nietos.
    escenaCargada.traverse((nodo) => {
        if (piso || !nodo.isMesh) return;
        const box = new THREE.Box3().setFromObject(nodo);
        const tam = box.getSize(new THREE.Vector3());
        const esHorizontalYFino = tam.y < 0.05 * Math.max(tam.x, tam.z, 0.01);
        const apoyadoEnCero = Math.abs(box.min.y) < 0.05;
        if (esHorizontalYFino && apoyadoEnCero) piso = nodo;
    });
    return piso;
}

// Altura de referencia para encuadrar las elevaciones: el punto más alto de
// la escena cargada (con un mínimo razonable para salas muy bajas/vacías).
export function calcularAlturaEscena(escenaCargada) {
    if (!escenaCargada) return 2.4;
    const box = new THREE.Box3().setFromObject(escenaCargada);
    return Math.max(box.max.y, 2.2);
}

// Arma, para cada una de las 5 vistas posibles, sus dimensiones reales
// (con margen de encuadre ya sumado) a partir de dimensiones_sala del JSON
// (ancho/largo — la sala está centrada en el origen, ver buildRoom() en
// editor.js) y la altura real de la escena cargada.
export function construirConfiguracionVistas(datosProyecto, escenaCargada) {
    const dimensionesSala = (datosProyecto && datosProyecto.dimensiones_sala) || {};
    const ancho = Number(dimensionesSala.ancho) || 4;
    const largo = Number(dimensionesSala.largo) || 4;
    const alturaEscena = calcularAlturaEscena(escenaCargada);
    const m = MARGEN_ENCUADRE_M * 2;

    return {
        'planta': { id: 'planta', etiqueta: 'Planta', anchoReal: ancho + m, altoReal: largo + m },
        'frontal': { id: 'frontal', etiqueta: 'Frontal', anchoReal: ancho + m, altoReal: alturaEscena + m },
        'posterior': { id: 'posterior', etiqueta: 'Posterior', anchoReal: ancho + m, altoReal: alturaEscena + m },
        'lateral-izq': { id: 'lateral-izq', etiqueta: 'Lateral izquierda', anchoReal: largo + m, altoReal: alturaEscena + m },
        'lateral-der': { id: 'lateral-der', etiqueta: 'Lateral derecha', anchoReal: largo + m, altoReal: alturaEscena + m }
    };
}

// Cámara ortográfica para una de las 5 vistas. "centro" es el punto del
// mundo al que apunta la cámara — (0,0,0) para Planta (la sala está
// centrada en el origen en X/Z); (0, alturaEscena/2, 0) para las 4
// elevaciones (el rango real en Y va de 0 a alturaEscena, no está
// centrado). Devuelve también centro.y, que necesita el dibujo de la línea
// de altura cero.
export function crearCamaraOrtografica(idVista, anchoReal, altoReal, alturaEscena) {
    const D = 1000; // fuera de cualquier escena real — la cámara es ortográfica, la distancia no afecta el encuadre
    const camera = new THREE.OrthographicCamera(-anchoReal / 2, anchoReal / 2, altoReal / 2, -altoReal / 2, 0.1, D * 2 + 10);

    let centro;
    switch (idVista) {
        case 'planta':
            centro = new THREE.Vector3(0, 0, 0);
            camera.position.set(0, D, 0);
            camera.up.set(0, 0, -1);
            break;
        case 'frontal':
            centro = new THREE.Vector3(0, alturaEscena / 2, 0);
            camera.position.set(0, alturaEscena / 2, D);
            camera.up.set(0, 1, 0);
            break;
        case 'posterior':
            centro = new THREE.Vector3(0, alturaEscena / 2, 0);
            camera.position.set(0, alturaEscena / 2, -D);
            camera.up.set(0, 1, 0);
            break;
        case 'lateral-izq':
            centro = new THREE.Vector3(0, alturaEscena / 2, 0);
            camera.position.set(-D, alturaEscena / 2, 0);
            camera.up.set(0, 1, 0);
            break;
        case 'lateral-der':
            centro = new THREE.Vector3(0, alturaEscena / 2, 0);
            camera.position.set(D, alturaEscena / 2, 0);
            camera.up.set(0, 1, 0);
            break;
        default:
            throw new Error(`Vista geometral desconocida: ${idVista}`);
    }

    camera.lookAt(centro);
    camera.updateProjectionMatrix();
    return { camera, centro };
}

// Elige una longitud "linda" en metros para la barra de escala, tal que su
// largo en píxeles no supere ~1/4 del ancho de la imagen.
function elegirLongitudBarra(anchoPx, densidadPxPorMetro) {
    const candidatos = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
    const maxPx = anchoPx * 0.25;
    let elegido = candidatos[0];
    for (const c of candidatos) {
        if (c * densidadPxPorMetro <= maxPx) elegido = c;
    }
    return elegido;
}

function dibujarBarraEscala(ctx, densidadPxPorMetro, anchoPx, altoPx) {
    const metros = elegirLongitudBarra(anchoPx, densidadPxPorMetro);
    const largoPx = metros * densidadPxPorMetro;
    const x0 = 20;
    const y0 = altoPx - 20;

    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + largoPx, y0);
    ctx.moveTo(x0, y0 - 5);
    ctx.lineTo(x0, y0 + 5);
    ctx.moveTo(x0 + largoPx, y0 - 5);
    ctx.lineTo(x0 + largoPx, y0 + 5);
    ctx.stroke();
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${metros} m`, x0 + largoPx / 2, y0 - 10);
    ctx.restore();
}

// Convierte una altura del mundo (Y) a fila de píxel en una vista de
// elevación ya renderizada, a partir del centro al que apunta la cámara y
// su frustum top/bottom (ver crearCamaraOrtografica). Misma idea que el
// overlay de cotas de (c), pero acá alcanza con esta cuenta directa porque
// solo se necesita una altura fija (Y=0), no puntos 3D arbitrarios.
function alturaMundoAPixelY(alturaMundo, centroY, top, bottom, altoPx) {
    const frac = (top - (alturaMundo - centroY)) / (top - bottom);
    return frac * altoPx;
}

// margenPx: la línea representa el piso de la SALA, no del canvas — tiene
// que terminar donde termina la sala (el margen de encuadre, MARGEN_ENCUADRE_M,
// convertido a píxeles), no ir de punta a punta de la imagen. Antes iba de
// borde a borde del canvas ignorando el margen — quedaba "a sangre".
function dibujarLineaAlturaCero(ctx, centroY, top, bottom, anchoPx, altoPx, margenPx) {
    const y = alturaMundoAPixelY(0, centroY, top, bottom, altoPx);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(margenPx, y);
    ctx.lineTo(anchoPx - margenPx, y);
    ctx.stroke();
    ctx.restore();
}

function dibujarIndicadoresDePlanos(ctx, escenaCargada, piso, camera, anchoPx, altoPx) {
    // traverse(), mismo motivo que detectarPiso().
    escenaCargada.traverse((nodo) => {
        if (!nodo.isMesh || nodo === piso) return;

        const box = new THREE.Box3().setFromObject(nodo);
        const tam = box.getSize(new THREE.Vector3());
        const centro = box.getCenter(new THREE.Vector3());
        if (Math.min(tam.x, tam.z) >= UMBRAL_PLANO_FINO_M) return;

        const p1 = new THREE.Vector3();
        const p2 = new THREE.Vector3();
        if (tam.x >= tam.z) {
            p1.set(centro.x - tam.x / 2, 0, centro.z);
            p2.set(centro.x + tam.x / 2, 0, centro.z);
        } else {
            p1.set(centro.x, 0, centro.z - tam.z / 2);
            p2.set(centro.x, 0, centro.z + tam.z / 2);
        }

        const px1 = proyectarPuntoAPixel(p1, camera, anchoPx, altoPx);
        const px2 = proyectarPuntoAPixel(p2, camera, anchoPx, altoPx);

        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px1.x, px1.y);
        ctx.lineTo(px2.x, px2.y);
        ctx.stroke();
        ctx.restore();
    });
}

// Renderiza `camera` sobre `scene` a un canvas 2D nuevo — con fondo
// transparente real (alfa) por default, u opaco si se pasa `fondoColor`
// (los planos acotados de (c) necesitan fondo opaco para que las cotas se
// lean bien, a diferencia de (a)/(b)/(d) que sí van con alfa) — y encima la
// barra de escala + los overlays que correspondan (línea de altura cero,
// indicadores de plano, cotas de (c) vía `dibujarCotasFn`). Reusa el
// renderer/contexto WebGL ya vivo de la vista orbital en vez de crear uno
// nuevo por vista — evita agotar el límite de contextos WebGL simultáneos
// del navegador al exportar un lote de varias vistas seguidas (mismo
// renderer, se redimensiona y se restaura al terminar).
function renderizarVistaOffscreen({
    renderer, scene, camera, anchoPx, altoPx, dibujarCero, centroY, densidadPxPorMetro,
    escenaCargada, piso, dibujarIndicadoresDePlano, dibujarCotasFn, fondoColor
}) {
    const colorClearOriginal = new THREE.Color();
    renderer.getClearColor(colorClearOriginal);
    const alphaClearOriginal = renderer.getClearAlpha();
    const fondoOriginal = scene.background;

    if (fondoColor !== undefined && fondoColor !== null) {
        scene.background = new THREE.Color(fondoColor);
        renderer.setClearColor(fondoColor, 1);
    } else {
        scene.background = null;
        renderer.setClearColor(0x000000, 0);
    }
    renderer.setSize(anchoPx, altoPx, false);
    renderer.render(scene, camera);

    const canvasSalida = document.createElement('canvas');
    canvasSalida.width = anchoPx;
    canvasSalida.height = altoPx;
    const ctx = canvasSalida.getContext('2d');
    ctx.drawImage(renderer.domElement, 0, 0, anchoPx, altoPx);

    if (dibujarCero) {
        dibujarLineaAlturaCero(ctx, centroY, camera.top, camera.bottom, anchoPx, altoPx, MARGEN_ENCUADRE_M * densidadPxPorMetro);
    }
    if (dibujarIndicadoresDePlano) {
        dibujarIndicadoresDePlanos(ctx, escenaCargada, piso, camera, anchoPx, altoPx);
    }
    if (dibujarCotasFn) {
        dibujarCotasFn(ctx, anchoPx, altoPx);
    }
    dibujarBarraEscala(ctx, densidadPxPorMetro, anchoPx, altoPx);

    scene.background = fondoOriginal;
    renderer.setClearColor(colorClearOriginal, alphaClearOriginal);

    return canvasSalida.toDataURL('image/png');
}

// (a) Vista actual: snapshot con alfa de la cámara orbital tal cual la dejó
// el usuario, exportado a una resolución mayor que la de pantalla (mismo
// aspecto). Sin barra de escala ni línea de piso — eso es propio de las
// vistas ortogonales arquitectónicas de (b)/(c), no de una vista libre.
export function exportarVistaActual(motor, opciones = {}) {
    const { ladoMaximoPx = 2000 } = opciones;

    if (!motor.obtenerEscenaCargada()) {
        throw new Error('No hay ningún proyecto cargado.');
    }

    const renderer = motor.obtenerRenderer();
    const scene = motor.obtenerEscena();
    const camera = motor.obtenerCamaraActual();
    const contenedor = renderer.domElement.parentElement;
    const anchoBase = contenedor.clientWidth;
    const altoBase = contenedor.clientHeight;
    const factor = ladoMaximoPx / Math.max(anchoBase, altoBase);
    const anchoPx = Math.max(1, Math.round(anchoBase * factor));
    const altoPx = Math.max(1, Math.round(altoBase * factor));

    const colorClearOriginal = new THREE.Color();
    renderer.getClearColor(colorClearOriginal);
    const alphaClearOriginal = renderer.getClearAlpha();
    const fondoOriginal = scene.background;

    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(anchoPx, altoPx, false);
    renderer.render(scene, camera);

    const canvasSalida = document.createElement('canvas');
    canvasSalida.width = anchoPx;
    canvasSalida.height = altoPx;
    canvasSalida.getContext('2d').drawImage(renderer.domElement, 0, 0, anchoPx, altoPx);
    const dataURL = canvasSalida.toDataURL('image/png');

    scene.background = fondoOriginal;
    renderer.setClearColor(colorClearOriginal, alphaClearOriginal);
    renderer.setSize(anchoBase, altoBase, false);

    return dataURL;
}

// Núcleo compartido de exportación en lote de las 5 vistas ortogonales:
// arma la densidad compartida, detecta/oculta el piso según el checkbox, y
// renderiza cada vista tildada. `armarOverlay({ id, config, camera, centro,
// esElevacion, escenaCargada, piso, datosProyecto })`, si se pasa, decide
// qué overlay extra (cotas, fondo opaco) lleva cada vista — lo usan tanto
// (b) exportarVistasGeometrales como (c) exportarVistasAcotadas en
// registroDimensioning.js, así ninguna de las dos duplica esta orquestación.
export function renderizarLoteVistas(motor, idsSeleccionados, opciones = {}, armarOverlay) {
    const {
        incluirPiso = true,
        densidadDeseadaPxPorMetro = DENSIDAD_DEFAULT_PX_POR_METRO,
        maxPixelDim = MAX_PIXEL_DIM_DEFAULT
    } = opciones;

    const escenaCargada = motor.obtenerEscenaCargada();
    if (!escenaCargada) throw new Error('No hay ningún proyecto cargado.');
    if (!idsSeleccionados || idsSeleccionados.length === 0) {
        throw new Error('No se seleccionó ninguna vista geometral.');
    }

    const datosProyecto = motor.obtenerDatosProyecto();
    const configs = construirConfiguracionVistas(datosProyecto, escenaCargada);
    const alturaEscena = calcularAlturaEscena(escenaCargada);

    const vistasParaDensidad = idsSeleccionados.map(id => ({
        id, anchoReal: configs[id].anchoReal, altoReal: configs[id].altoReal
    }));
    const { densidadPxPorMetro, vistas: vistasConTamano } =
        calcularDensidadCompartida(vistasParaDensidad, densidadDeseadaPxPorMetro, maxPixelDim);

    const piso = detectarPiso(escenaCargada);
    const visibilidadOriginalPiso = piso ? piso.visible : null;
    if (piso) piso.visible = incluirPiso;

    const renderer = motor.obtenerRenderer();
    const scene = motor.obtenerEscena();
    const contenedor = renderer.domElement.parentElement;
    const anchoBase = contenedor.clientWidth;
    const altoBase = contenedor.clientHeight;

    const resultado = vistasConTamano.map(({ id, anchoPx, altoPx }) => {
        const config = configs[id];
        const esElevacion = id !== 'planta';
        const { camera, centro } = crearCamaraOrtografica(id, config.anchoReal, config.altoReal, alturaEscena);
        const overlay = armarOverlay
            ? (armarOverlay({ id, config, camera, centro, esElevacion, escenaCargada, piso, datosProyecto }) || {})
            : {};

        const dataURL = renderizarVistaOffscreen({
            renderer, scene, camera, anchoPx, altoPx,
            dibujarCero: overlay.dibujarCero ?? esElevacion,
            centroY: centro.y,
            densidadPxPorMetro,
            escenaCargada, piso,
            dibujarIndicadoresDePlano: overlay.dibujarIndicadoresDePlano ?? (id === 'planta'),
            dibujarCotasFn: overlay.dibujarCotasFn,
            fondoColor: overlay.fondoColor
        });
        return { id, etiqueta: config.etiqueta, dataURL, anchoPx, altoPx };
    });

    if (piso) piso.visible = visibilidadOriginalPiso;
    renderer.setSize(anchoBase, altoBase, false);

    return { densidadPxPorMetro, vistas: resultado };
}

// (b) Geometrales: renderiza cada vista tildada a la misma densidad
// px/metro, respetando el checkbox de incluir/excluir el plano base.
// Devuelve un PNG independiente por vista, con alfa (comportamiento
// default de renderizarLoteVistas, sin overlay de cotas).
export function exportarVistasGeometrales(motor, idsSeleccionados, opciones = {}) {
    return renderizarLoteVistas(motor, idsSeleccionados, opciones);
}
