/* ==========================================================================
   in_SITE - REGISTRO: (c) geometrales acotados (registroDimensioning.js)
   Mismas 5 vistas y misma densidad compartida que (b) — importa las
   cámaras/render de registroExportViews.js en vez de duplicarlas — pero
   suma cotas por pieza (distancia a los límites de sala + altura +
   dimensiones propias) y renderiza sobre fondo OPACO (no alfa): un plano
   acotado necesita garantizar la lectura de las cotas, a diferencia de
   (a)/(b)/(d) que sí van transparentes.

   Estilo de cota (líneas de referencia desplazadas de lo medido + línea de
   cota fina entre ellas, tipografía Geist, desfasaje entre cotas que
   comparten pared de referencia) sigue el criterio de acotado lineal de la
   norma IRAM — no una línea pegada directo a la pieza, y no dos cotas
   superpuestas cuando miden contra el mismo límite.
   ========================================================================== */

import * as THREE from 'three';
import { proyectarPuntoAPixel, esPlanoFino } from './registroGeometriaUtil.js';
import { renderizarLoteVistas } from './registroExportViews.js';
import { normalizarDatosJSON } from './motorVisor.js';

const FONDO_ACOTADO = 0xffffff;
const TAMANIO_FUENTE_COTA = 16;
const FUENTE_COTA = `${TAMANIO_FUENTE_COTA}px Geist, sans-serif`;
const FUENTE_COTA_NEGRITA = `700 ${TAMANIO_FUENTE_COTA}px Geist, sans-serif`;

// Distancia de una pieza al límite MÁS CERCANO de la sala en un eje: entre
// el borde "positivo" (hacia +mitad) y el "negativo" (hacia -mitad), la que
// sea más chica — y el punto exacto de ese borde, para trazar la línea
// hasta ahí.
function distanciaAlLimiteMasCercano(min, max, mitad) {
    const distPos = mitad - max;
    const distNeg = min - (-mitad);
    if (distPos <= distNeg) {
        return { distancia: distPos, bordePieza: max, bordeSala: mitad };
    }
    return { distancia: distNeg, bordePieza: min, bordeSala: -mitad };
}

// "1.20 × 0.80 m" para un cuadro (ancho real × alto); "0.50 × 0.40 × 0.30 m"
// (ancho × alto × profundidad) para una escultura.
function calcularEtiquetaDimensionesPropias(tam) {
    if (esPlanoFino(tam)) {
        const ancho = Math.max(tam.x, tam.z);
        return `${ancho.toFixed(2)} × ${tam.y.toFixed(2)} m`;
    }
    return `${tam.x.toFixed(2)} × ${tam.y.toFixed(2)} × ${tam.z.toFixed(2)} m`;
}

function dibujarEtiqueta(ctx, x, y, texto, align = 'center') {
    ctx.save();
    ctx.font = FUENTE_COTA;
    ctx.textBaseline = 'middle';
    const anchoTexto = ctx.measureText(texto).width;
    ctx.textAlign = align;
    const rectX = align === 'left' ? x - 3 : x - anchoTexto / 2 - 3;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(rectX, y - TAMANIO_FUENTE_COTA / 2 - 2, anchoTexto + 6, TAMANIO_FUENTE_COTA + 4);
    ctx.fillStyle = '#000000';
    ctx.fillText(texto, x, y);
    ctx.restore();
}

// Alto en píxeles que va a ocupar la ficha de una pieza (uno o dos
// renglones) — se necesita ANTES de dibujar nada, para poder resolver
// superposiciones entre varias fichas de la misma vista.
function medirAltoFicha(titulo) {
    return titulo ? TAMANIO_FUENTE_COTA * 2 + 4 : TAMANIO_FUENTE_COTA + 4;
}

// Ficha de pieza: título en negrita (renglón de arriba, solo si hay JSON
// cargado y la pieza está identificada en él) + dimensión (renglón de
// abajo) — alineados a la izquierda desde el mismo x.
function dibujarFichaTexto(ctx, x, y, dimensiones, titulo) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.font = FUENTE_COTA;
    let anchoMax = ctx.measureText(dimensiones).width;
    if (titulo) {
        ctx.font = FUENTE_COTA_NEGRITA;
        anchoMax = Math.max(anchoMax, ctx.measureText(titulo).width);
    }

    const alto = medirAltoFicha(titulo);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(x - 3, y - alto / 2, anchoMax + 6, alto);

    ctx.fillStyle = '#000000';
    if (titulo) {
        ctx.font = FUENTE_COTA_NEGRITA;
        ctx.fillText(titulo, x, y - TAMANIO_FUENTE_COTA / 2);
        ctx.font = FUENTE_COTA;
        ctx.fillText(dimensiones, x, y + TAMANIO_FUENTE_COTA / 2 + 2);
    } else {
        ctx.font = FUENTE_COTA;
        ctx.fillText(dimensiones, x, y);
    }
    ctx.restore();
}

// Caja de la pieza proyectada a píxeles (las 8 esquinas del Box3, min/max en
// pantalla) — para poder ubicar la ficha de título+dimensiones AL LADO de
// la pieza en vez de superpuesta.
function calcularBBoxPixel(box, camera, anchoPx, altoPx) {
    const esquinas = [
        [box.min.x, box.min.y, box.min.z], [box.min.x, box.min.y, box.max.z],
        [box.min.x, box.max.y, box.min.z], [box.min.x, box.max.y, box.max.z],
        [box.max.x, box.min.y, box.min.z], [box.max.x, box.min.y, box.max.z],
        [box.max.x, box.max.y, box.min.z], [box.max.x, box.max.y, box.max.z]
    ];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    esquinas.forEach(([x, y, z]) => {
        const px = proyectarPuntoAPixel(new THREE.Vector3(x, y, z), camera, anchoPx, altoPx);
        minX = Math.min(minX, px.x); maxX = Math.max(maxX, px.x);
        minY = Math.min(minY, px.y); maxY = Math.max(maxY, px.y);
    });
    return { minX, maxX, minY, maxY };
}

// Dibuja todas las fichas de una vista de una sola pasada, resolviendo
// superposiciones: se ordenan por su posición vertical "natural" (al lado
// de cada pieza) y, si la siguiente empieza antes de que termine la
// anterior, se la corre hacia abajo. Siempre se traza una línea indicativa
// fina desde el borde de la pieza hasta la ficha — con piezas cercanas o
// superpuestas entre sí, sin esa línea no queda claro a cuál corresponde
// cada ficha, se haya corrido o no.
function dibujarFichasSinSuperposicion(ctx, piezas, camera, anchoPx, altoPx, mapaObras) {
    const MARGEN_ENTRE_FICHAS_PX = 6;

    const candidatas = piezas.map(({ nodo, box, tam }) => {
        const bbox = calcularBBoxPixel(box, camera, anchoPx, altoPx);
        const obra = mapaObras && mapaObras.get(nodo.name);
        const titulo = obra && obra.titulo;
        return {
            anclaXPieza: bbox.maxX,
            anclaX: bbox.maxX + 10,
            anclaY: (bbox.minY + bbox.maxY) / 2,
            alto: medirAltoFicha(titulo),
            dimensiones: calcularEtiquetaDimensionesPropias(tam),
            titulo
        };
    });

    candidatas.sort((a, b) => a.anclaY - b.anclaY);

    let limiteInferiorAnterior = -Infinity;
    candidatas.forEach((c) => {
        const mitadAlto = c.alto / 2;
        let y = c.anclaY;
        if (y - mitadAlto < limiteInferiorAnterior + MARGEN_ENTRE_FICHAS_PX) {
            y = limiteInferiorAnterior + MARGEN_ENTRE_FICHAS_PX + mitadAlto;
        }
        c.yFinal = y;
        limiteInferiorAnterior = y + mitadAlto;
    });

    candidatas.forEach((c) => {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(c.anclaXPieza, c.anclaY);
        ctx.lineTo(c.anclaX, c.yFinal);
        ctx.stroke();
        ctx.restore();

        dibujarFichaTexto(ctx, c.anclaX, c.yFinal, c.dimensiones, c.titulo);
    });
}

// Línea de cota lineal estilo IRAM: no va pegada a los puntos medidos — se
// desplaza en paralelo (líneas de referencia finas desde cada punto real
// hasta la línea de cota, con un pequeño espacio de por medio), y la línea
// de cota en sí (fina, con marcas oblicuas en los extremos) queda
// offseteada a un costado. El lado del offset se elige hacia afuera del
// centro del canvas. `nivel` (0, 1, 2…) permite apilar varias cotas que
// comparten la misma referencia (mismo límite de sala) en carriles
// paralelos cada vez más lejos, en vez de superponerse — el salto entre
// carriles (SEPARACION_CARRIL_PX) tiene que ser más ancho que el texto de
// la etiqueta ("1.07 m" ronda los 60-70px a 16px Geist), si no las LÍNEAS
// quedan separadas pero las ETIQUETAS de cada una se siguen pisando.
const DESPLAZAMIENTO_COTA_PX = 20;
const SEPARACION_CARRIL_PX = 80;
const ESPACIO_LINEA_REFERENCIA_PX = 3;
const MARCA_PX = 6;

function dibujarLineaCotaDesplazada(ctx, pA, pB, etiqueta, anchoPx, altoPx, nivel = 0) {
    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const largo = Math.hypot(dx, dy) || 1;
    const ux = dx / largo;
    const uy = dy / largo;
    // Marca terminal a 45° respecto de la línea de cota (trazo oblicuo,
    // criterio IRAM/ISO 129 de acotado lineal) — no perpendicular, para que
    // se lea claramente como marca de cota y no se confunda con una flecha.
    const tx = ux * Math.SQRT1_2 - uy * Math.SQRT1_2;
    const ty = ux * Math.SQRT1_2 + uy * Math.SQRT1_2;
    let nx = -dy / largo;
    let ny = dx / largo;

    const medioX = (pA.x + pB.x) / 2;
    const medioY = (pA.y + pB.y) / 2;
    const haciaAfueraX = medioX - anchoPx / 2;
    const haciaAfueraY = medioY - altoPx / 2;
    if (nx * haciaAfueraX + ny * haciaAfueraY < 0) {
        nx = -nx;
        ny = -ny;
    }

    const desplazamiento = DESPLAZAMIENTO_COTA_PX + nivel * SEPARACION_CARRIL_PX;
    const c1 = { x: pA.x + nx * desplazamiento, y: pA.y + ny * desplazamiento };
    const c2 = { x: pB.x + nx * desplazamiento, y: pB.y + ny * desplazamiento };

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.75;

    // Líneas de referencia (auxiliares): del punto real a la línea de cota,
    // con un pequeño espacio inicial para no tocar la pieza/pared.
    ctx.beginPath();
    ctx.moveTo(pA.x + nx * ESPACIO_LINEA_REFERENCIA_PX, pA.y + ny * ESPACIO_LINEA_REFERENCIA_PX);
    ctx.lineTo(c1.x, c1.y);
    ctx.moveTo(pB.x + nx * ESPACIO_LINEA_REFERENCIA_PX, pB.y + ny * ESPACIO_LINEA_REFERENCIA_PX);
    ctx.lineTo(c2.x, c2.y);
    ctx.stroke();

    // Línea de cota.
    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.stroke();

    // Marcas terminales oblicuas — un poco más gruesas que las líneas finas
    // de arriba, para que se distingan como marca y no como parte del trazo.
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(c1.x - tx * MARCA_PX, c1.y - ty * MARCA_PX);
    ctx.lineTo(c1.x + tx * MARCA_PX, c1.y + ty * MARCA_PX);
    ctx.moveTo(c2.x - tx * MARCA_PX, c2.y - ty * MARCA_PX);
    ctx.lineTo(c2.x + tx * MARCA_PX, c2.y + ty * MARCA_PX);
    ctx.stroke();
    ctx.restore();

    dibujarEtiqueta(ctx, (c1.x + c2.x) / 2, (c1.y + c2.y) / 2, etiqueta);
}

// Cuenta cuántas cotas ya se dibujaron contra cada límite de sala (clave =
// eje + lado) en la vista actual, para que dibujarCotaLimiteMasCercano sepa
// en qué "carril" (nivel de desplazamiento) va cada una nueva.
function crearContadorDesfasaje() {
    const contadores = new Map();
    return (clave) => {
        const nivel = contadores.get(clave) || 0;
        contadores.set(clave, nivel + 1);
        return nivel;
    };
}

// Cota de distancia al límite más cercano de la sala en un eje —
// `construirPunto(valor)` arma el Vector3 correspondiente a un valor de ese
// eje, manteniendo fijos los otros dos (así sirve tanto para X/Z en Planta
// como para el eje horizontal de una elevación). `ejeNombre` + `obtenerNivel`
// arman la clave de desfasaje (mismo eje + mismo lado de la sala = mismo
// carril, apilado).
function dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, min, max, mitad, construirPunto, ejeNombre, obtenerNivel) {
    if (!mitad) return;
    const { distancia, bordePieza, bordeSala } = distanciaAlLimiteMasCercano(min, max, mitad);
    const clave = `${ejeNombre}-${bordeSala >= 0 ? 'pos' : 'neg'}`;
    const nivel = obtenerNivel(clave);
    const p1 = proyectarPuntoAPixel(construirPunto(bordePieza), camera, anchoPx, altoPx);
    const p2 = proyectarPuntoAPixel(construirPunto(bordeSala), camera, anchoPx, altoPx);
    dibujarLineaCotaDesplazada(ctx, p1, p2, `${distancia.toFixed(2)} m`, anchoPx, altoPx, nivel);
}

// Cotas en Planta: siempre dos por pieza (una por cada eje de la
// proyección, X y Z) — distancia al límite más cercano de la sala en ese
// eje — más la ficha de título+dimensiones al lado (todas resueltas juntas
// al final para que no se superpongan entre piezas).
export function dibujarCotasPlanta(ctx, escenaCargada, piso, camera, anchoPx, altoPx, datosProyecto, mapaObras) {
    const dimensionesSala = (datosProyecto && datosProyecto.dimensiones_sala) || {};
    const ancho = Number(dimensionesSala.ancho) || null;
    const largo = Number(dimensionesSala.largo) || null;
    const obtenerNivel = crearContadorDesfasaje();
    const piezas = [];

    escenaCargada.traverse((nodo) => {
        if (!nodo.isMesh || nodo === piso) return;

        const box = new THREE.Box3().setFromObject(nodo);
        const centro = box.getCenter(new THREE.Vector3());

        dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, box.min.x, box.max.x, ancho ? ancho / 2 : null,
            (v) => new THREE.Vector3(v, 0, centro.z), 'x', obtenerNivel);
        dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, box.min.z, box.max.z, largo ? largo / 2 : null,
            (v) => new THREE.Vector3(centro.x, 0, v), 'z', obtenerNivel);

        piezas.push({ nodo, box, tam: box.getSize(new THREE.Vector3()) });
    });

    dibujarFichasSinSuperposicion(ctx, piezas, camera, anchoPx, altoPx, mapaObras);
}

// Cotas en las 4 elevaciones: siempre dos por pieza — distancia horizontal
// al límite más cercano de la sala (eje X en Frontal/Posterior, eje Z en
// Laterales — "eje" lo decide exportarVistasAcotadas según la vista) +
// altura respecto del piso — más la ficha de título+dimensiones al lado.
export function dibujarCotasElevacion(ctx, escenaCargada, piso, camera, anchoPx, altoPx, datosProyecto, eje, mapaObras) {
    const dimensionesSala = (datosProyecto && datosProyecto.dimensiones_sala) || {};
    const dimensionSalaHorizontal = eje === 'z'
        ? (Number(dimensionesSala.largo) || null)
        : (Number(dimensionesSala.ancho) || null);
    const mitadHorizontal = dimensionSalaHorizontal ? dimensionSalaHorizontal / 2 : null;
    const obtenerNivel = crearContadorDesfasaje();
    const piezas = [];

    escenaCargada.traverse((nodo) => {
        if (!nodo.isMesh || nodo === piso) return;

        const box = new THREE.Box3().setFromObject(nodo);
        const centro = box.getCenter(new THREE.Vector3());

        if (eje === 'z') {
            dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, box.min.z, box.max.z, mitadHorizontal,
                (v) => new THREE.Vector3(centro.x, 0, v), 'horizontal', obtenerNivel);
        } else {
            dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, box.min.x, box.max.x, mitadHorizontal,
                (v) => new THREE.Vector3(v, 0, centro.z), 'horizontal', obtenerNivel);
        }

        const p1 = proyectarPuntoAPixel(new THREE.Vector3(centro.x, 0, centro.z), camera, anchoPx, altoPx);
        const p2 = proyectarPuntoAPixel(new THREE.Vector3(centro.x, box.min.y, centro.z), camera, anchoPx, altoPx);
        const nivelAltura = obtenerNivel('altura-pos');
        dibujarLineaCotaDesplazada(ctx, p1, p2, `${box.min.y.toFixed(2)} m`, anchoPx, altoPx, nivelAltura);

        piezas.push({ nodo, box, tam: box.getSize(new THREE.Vector3()) });
    });

    dibujarFichasSinSuperposicion(ctx, piezas, camera, anchoPx, altoPx, mapaObras);
}

function ejeHorizontalDeVista(id) {
    return (id === 'lateral-izq' || id === 'lateral-der') ? 'z' : 'x';
}

// (c) Geometrales acotados: mismas 5 vistas y misma densidad compartida que
// (b) (reusa renderizarLoteVistas de registroExportViews.js), sumando el
// overlay de cotas y forzando fondo opaco (blanco) en vez de alfa.
export function exportarVistasAcotadas(motor, idsSeleccionados, opciones = {}) {
    const mapaObras = new Map(normalizarDatosJSON(motor.obtenerDatosProyecto()).map(o => [o.id, o]));

    return renderizarLoteVistas(motor, idsSeleccionados, opciones, ({ id, camera, escenaCargada, piso, datosProyecto }) => {
        if (id === 'planta') {
            return {
                dibujarIndicadoresDePlano: true,
                fondoColor: FONDO_ACOTADO,
                dibujarCotasFn: (ctx, anchoPx, altoPx) =>
                    dibujarCotasPlanta(ctx, escenaCargada, piso, camera, anchoPx, altoPx, datosProyecto, mapaObras)
            };
        }
        return {
            dibujarCero: true,
            fondoColor: FONDO_ACOTADO,
            dibujarCotasFn: (ctx, anchoPx, altoPx) =>
                dibujarCotasElevacion(ctx, escenaCargada, piso, camera, anchoPx, altoPx, datosProyecto, ejeHorizontalDeVista(id), mapaObras)
        };
    });
}
