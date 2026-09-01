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

   Texto y líneas de cota a tamaño REAL constante en la hoja final — no en
   píxeles fijos, y no relativo a la densidad de render, sino al tamaño de
   página que se haya elegido en el diálogo de formato (registro.js): estos
   PNG se renderizan sabiendo de antemano a qué tamaño de hoja van (ver
   exportarVistasAcotadasPDF más abajo, que calcula el mm disponible ANTES
   de renderizar y se lo pasa a exportarVistasAcotadas), así que se puede
   calcular exactamente cuántos píxeles del render equivalen a 1mm en esa
   hoja — sin eso, el mismo texto en píxeles queda más chico en Planta que
   en Frontal (extent real más grande → menos px/metro), y además cambiaría
   de tamaño según A4/A3/Carta si se lo dejara atado a la densidad de
   render en vez de a la hoja final. TAMANIO_FUENTE_COTA_MM = 2.5mm es el
   mínimo pedido — ver el resto de los tamaños abajo, guardan la misma
   proporción que tenían antes (relativos al tamaño de fuente).
   ========================================================================== */

import * as THREE from 'three';
import { proyectarPuntoAPixel, esPlanoFino, calcularDimensionesPagina, dibujarNumeroPaginaPDF } from './registroGeometriaUtil.js';
import { renderizarLoteVistas, detectarPiso, calcularAlturaEscena } from './registroExportViews.js';
import { normalizarDatosJSON } from './motorVisor.js';

const FONDO_ACOTADO = 0xffffff;

const TAMANIO_FUENTE_COTA_MM = 2.5;
const DESPLAZAMIENTO_COTA_MM = 3;
const SEPARACION_CARRIL_MM = 12;
const ESPACIO_LINEA_REFERENCIA_MM = 0.5;
const MARCA_MM = 1;
const OFFSET_FICHA_MM = 5;

// Todos los tamaños de cota (texto, desplazamientos, marcas), definidos en
// mm reales de la hoja final y convertidos a píxeles del render vía
// `pxPorMm` — cuántos píxeles de ESTE render específico equivalen a 1mm en
// la hoja elegida (lo calcula exportarVistasAcotadas() a partir del ancho/
// alto disponible de la página, pasado en `opciones`).
function crearEscalaCota(pxPorMm) {
    return {
        fuentePx: TAMANIO_FUENTE_COTA_MM * pxPorMm,
        desplazamientoPx: DESPLAZAMIENTO_COTA_MM * pxPorMm,
        separacionCarrilPx: SEPARACION_CARRIL_MM * pxPorMm,
        espacioLineaReferenciaPx: ESPACIO_LINEA_REFERENCIA_MM * pxPorMm,
        marcaPx: MARCA_MM * pxPorMm,
        offsetFichaPx: OFFSET_FICHA_MM * pxPorMm
    };
}

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

// Cuántos niveles de desfasaje (ver SEPARACION_CARRIL_MM) va a
// necesitar como máximo esta sala, ANTES de renderizar nada — hace falta
// para agrandar el margen de encuadre lo suficiente y que ninguna cota
// termine fuera de la hoja. Dos fuentes de apilamiento:
// - Por lado de sala en Planta/horizontal de elevación (eje x/z × pos/neg):
//   cuántas piezas comparten el mismo límite más cercano.
// - Por altura en elevaciones: TODAS las piezas de la vista comparten el
//   mismo carril ('altura-pos' en dibujarCotasElevacion, sin distinción de
//   lado), así que el peor caso es directamente el total de piezas.
function calcularNivelMaximoDesfasaje(escenaCargada, piso, datosProyecto) {
    const dimensionesSala = (datosProyecto && datosProyecto.dimensiones_sala) || {};
    const ancho = Number(dimensionesSala.ancho) || null;
    const largo = Number(dimensionesSala.largo) || null;
    const contadorPorLado = new Map();
    let totalPiezas = 0;

    escenaCargada.traverse((nodo) => {
        if (!nodo.isMesh || nodo === piso) return;
        totalPiezas += 1;
        const box = new THREE.Box3().setFromObject(nodo);

        [['x', ancho], ['z', largo]].forEach(([eje, dimension]) => {
            if (!dimension) return;
            const min = eje === 'x' ? box.min.x : box.min.z;
            const max = eje === 'x' ? box.max.x : box.max.z;
            const { bordeSala } = distanciaAlLimiteMasCercano(min, max, dimension / 2);
            const clave = `${eje}-${bordeSala >= 0 ? 'pos' : 'neg'}`;
            contadorPorLado.set(clave, (contadorPorLado.get(clave) || 0) + 1);
        });
    });

    const maximoPorLado = Math.max(0, ...Array.from(contadorPorLado.values()));
    return Math.max(maximoPorLado, totalPiezas) - 1;
}

// Margen real (metros) que hay que sumarle al encuadre de cámara para que,
// con el nivel de desfasaje máximo calculado arriba, la cota más alejada
// (línea + marca + etiqueta) siga entrando en la hoja. Ya no hay una
// densidad de render "de referencia" fija (ver crearEscalaCota más
// arriba) — el offset máximo, en mm reales de hoja, se convierte a metros
// reales de sala con la escala real de esta exportación puntual: cuántos
// metros de sala representa cada mm de la página elegida (extent más
// grande de la sala sobre el mm disponible más chico de la hoja — estimado
// ANTES de renderizar, así que usa las dimensiones base de la sala, no el
// resultado final por vista).
const BUFFER_ETIQUETA_MM = 24; // ancho aprox. de una etiqueta ("1.20 m") + su recuadro + el offset de ficha (OFFSET_FICHA_MM)
function calcularMargenExtraAcotado(escenaCargada, piso, datosProyecto, anchoDisponiblePaginaMm, altoDisponiblePaginaMm) {
    const nivelMax = calcularNivelMaximoDesfasaje(escenaCargada, piso, datosProyecto);
    const offsetMaximoMm = DESPLAZAMIENTO_COTA_MM + nivelMax * SEPARACION_CARRIL_MM + BUFFER_ETIQUETA_MM;

    const dimensionesSala = (datosProyecto && datosProyecto.dimensiones_sala) || {};
    const ancho = Number(dimensionesSala.ancho) || 4;
    const largo = Number(dimensionesSala.largo) || 4;
    const extentMaxM = Math.max(ancho, largo, calcularAlturaEscena(escenaCargada));
    const paginaDisponibleMm = Math.min(anchoDisponiblePaginaMm, altoDisponiblePaginaMm);
    const metrosRealesPorMmDeHoja = extentMaxM / paginaDisponibleMm;

    return offsetMaximoMm * metrosRealesPorMmDeHoja;
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

function dibujarEtiqueta(ctx, x, y, texto, escala, align = 'center') {
    ctx.save();
    ctx.font = `${escala.fuentePx}px Geist, sans-serif`;
    ctx.textBaseline = 'middle';
    const anchoTexto = ctx.measureText(texto).width;
    ctx.textAlign = align;
    const rectX = align === 'left' ? x - 3 : x - anchoTexto / 2 - 3;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(rectX, y - escala.fuentePx / 2 - 2, anchoTexto + 6, escala.fuentePx + 4);
    ctx.fillStyle = '#000000';
    ctx.fillText(texto, x, y);
    ctx.restore();
}

// Alto en píxeles que va a ocupar la ficha de una pieza (uno o dos
// renglones) — se necesita ANTES de dibujar nada, para poder resolver
// superposiciones entre varias fichas de la misma vista.
function medirAltoFicha(titulo, escala) {
    return titulo ? escala.fuentePx * 2 + 4 : escala.fuentePx + 4;
}

// Ficha de pieza: título en negrita (renglón de arriba, solo si hay JSON
// cargado y la pieza está identificada en él) + dimensión (renglón de
// abajo) — alineados a la izquierda desde el mismo x.
function dibujarFichaTexto(ctx, x, y, dimensiones, titulo, escala) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const fuenteNormal = `${escala.fuentePx}px Geist, sans-serif`;
    const fuenteNegrita = `700 ${escala.fuentePx}px Geist, sans-serif`;

    ctx.font = fuenteNormal;
    let anchoMax = ctx.measureText(dimensiones).width;
    if (titulo) {
        ctx.font = fuenteNegrita;
        anchoMax = Math.max(anchoMax, ctx.measureText(titulo).width);
    }

    const alto = medirAltoFicha(titulo, escala);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(x - 3, y - alto / 2, anchoMax + 6, alto);

    ctx.fillStyle = '#000000';
    if (titulo) {
        ctx.font = fuenteNegrita;
        ctx.fillText(titulo, x, y - escala.fuentePx / 2);
        ctx.font = fuenteNormal;
        ctx.fillText(dimensiones, x, y + escala.fuentePx / 2 + 2);
    } else {
        ctx.font = fuenteNormal;
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

// Busca la obra de mapaObras cuyo id coincide con el nombre del nodo O de
// alguno de sus ancestros. Hace falta el recorrido hacia arriba porque el
// nombre de una PIEZA no siempre está en el mesh que efectivamente se
// dibuja: OBJLoader.parse() devuelve un Group (no un Mesh) para cualquier
// escultura, y el nombre de la pieza se asigna a ese Group y a su
// contenedor (ver crearEsculturaDesdeTexto() en editor.js) — los meshes
// hijos reales quedan con los nombres que trae el .obj (o sin nombre). Un
// cuadro, en cambio, es directamente un Mesh con el nombre puesto encima,
// por eso ahí siempre funcionó buscar por nodo.name a secas.
function buscarObraPorNombreEnAncestros(nodo, mapaObras) {
    if (!mapaObras) return undefined;
    let actual = nodo;
    while (actual) {
        if (mapaObras.has(actual.name)) return mapaObras.get(actual.name);
        actual = actual.parent;
    }
    return undefined;
}

// Dibuja todas las fichas de una vista de una sola pasada, resolviendo
// superposiciones: se ordenan por su posición vertical "natural" (al lado
// de cada pieza) y, si la siguiente empieza antes de que termine la
// anterior, se la corre hacia abajo. Siempre se traza una línea indicativa
// fina desde el borde de la pieza hasta la ficha — con piezas cercanas o
// superpuestas entre sí, sin esa línea no queda claro a cuál corresponde
// cada ficha, se haya corrido o no.
function dibujarFichasSinSuperposicion(ctx, piezas, camera, anchoPx, altoPx, mapaObras, escala) {
    const MARGEN_ENTRE_FICHAS_PX = 6;

    const candidatas = piezas.map(({ nodo, box, tam }) => {
        const bbox = calcularBBoxPixel(box, camera, anchoPx, altoPx);
        const obra = buscarObraPorNombreEnAncestros(nodo, mapaObras);
        const titulo = obra && obra.titulo;
        return {
            anclaXPieza: bbox.maxX,
            anclaX: bbox.maxX + escala.offsetFichaPx,
            anclaY: (bbox.minY + bbox.maxY) / 2,
            alto: medirAltoFicha(titulo, escala),
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

        dibujarFichaTexto(ctx, c.anclaX, c.yFinal, c.dimensiones, c.titulo, escala);
    });
}

// Línea de cota lineal estilo IRAM: no va pegada a los puntos medidos — se
// desplaza en paralelo (líneas de referencia finas desde cada punto real
// hasta la línea de cota, con un pequeño espacio de por medio), y la línea
// de cota en sí (fina, con marcas oblicuas en los extremos) queda
// offseteada a un costado. El lado del offset se elige hacia afuera del
// centro del canvas. `nivel` (0, 1, 2…) permite apilar varias cotas que
// comparten la misma referencia (mismo límite de sala) en carriles
// paralelos cada vez más lejos, en vez de superponerse.
function dibujarLineaCotaDesplazada(ctx, pA, pB, etiqueta, anchoPx, altoPx, nivel, escala) {
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

    const desplazamiento = escala.desplazamientoPx + nivel * escala.separacionCarrilPx;
    const c1 = { x: pA.x + nx * desplazamiento, y: pA.y + ny * desplazamiento };
    const c2 = { x: pB.x + nx * desplazamiento, y: pB.y + ny * desplazamiento };

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.75;

    // Líneas de referencia (auxiliares): del punto real a la línea de cota,
    // con un pequeño espacio inicial para no tocar la pieza/pared.
    ctx.beginPath();
    ctx.moveTo(pA.x + nx * escala.espacioLineaReferenciaPx, pA.y + ny * escala.espacioLineaReferenciaPx);
    ctx.lineTo(c1.x, c1.y);
    ctx.moveTo(pB.x + nx * escala.espacioLineaReferenciaPx, pB.y + ny * escala.espacioLineaReferenciaPx);
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
    ctx.moveTo(c1.x - tx * escala.marcaPx, c1.y - ty * escala.marcaPx);
    ctx.lineTo(c1.x + tx * escala.marcaPx, c1.y + ty * escala.marcaPx);
    ctx.moveTo(c2.x - tx * escala.marcaPx, c2.y - ty * escala.marcaPx);
    ctx.lineTo(c2.x + tx * escala.marcaPx, c2.y + ty * escala.marcaPx);
    ctx.stroke();
    ctx.restore();

    dibujarEtiqueta(ctx, (c1.x + c2.x) / 2, (c1.y + c2.y) / 2, etiqueta, escala);
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
function dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, min, max, mitad, construirPunto, ejeNombre, obtenerNivel, escala) {
    if (!mitad) return;
    const { distancia, bordePieza, bordeSala } = distanciaAlLimiteMasCercano(min, max, mitad);
    const clave = `${ejeNombre}-${bordeSala >= 0 ? 'pos' : 'neg'}`;
    const nivel = obtenerNivel(clave);
    const p1 = proyectarPuntoAPixel(construirPunto(bordePieza), camera, anchoPx, altoPx);
    const p2 = proyectarPuntoAPixel(construirPunto(bordeSala), camera, anchoPx, altoPx);
    dibujarLineaCotaDesplazada(ctx, p1, p2, `${distancia.toFixed(2)} m`, anchoPx, altoPx, nivel, escala);
}

// Cotas en Planta: siempre dos por pieza (una por cada eje de la
// proyección, X y Z) — distancia al límite más cercano de la sala en ese
// eje — más la ficha de título+dimensiones al lado (todas resueltas juntas
// al final para que no se superpongan entre piezas).
export function dibujarCotasPlanta(ctx, escenaCargada, piso, camera, anchoPx, altoPx, datosProyecto, mapaObras, pxPorMm) {
    const dimensionesSala = (datosProyecto && datosProyecto.dimensiones_sala) || {};
    const ancho = Number(dimensionesSala.ancho) || null;
    const largo = Number(dimensionesSala.largo) || null;
    const escala = crearEscalaCota(pxPorMm);
    const obtenerNivel = crearContadorDesfasaje();
    const piezas = [];

    escenaCargada.traverse((nodo) => {
        if (!nodo.isMesh || nodo === piso) return;

        const box = new THREE.Box3().setFromObject(nodo);
        const centro = box.getCenter(new THREE.Vector3());

        dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, box.min.x, box.max.x, ancho ? ancho / 2 : null,
            (v) => new THREE.Vector3(v, 0, centro.z), 'x', obtenerNivel, escala);
        dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, box.min.z, box.max.z, largo ? largo / 2 : null,
            (v) => new THREE.Vector3(centro.x, 0, v), 'z', obtenerNivel, escala);

        piezas.push({ nodo, box, tam: box.getSize(new THREE.Vector3()) });
    });

    dibujarFichasSinSuperposicion(ctx, piezas, camera, anchoPx, altoPx, mapaObras, escala);
}

// Cotas en las 4 elevaciones: siempre dos por pieza — distancia horizontal
// al límite más cercano de la sala (eje X en Frontal/Posterior, eje Z en
// Laterales — "eje" lo decide exportarVistasAcotadas según la vista) +
// altura respecto del piso — más la ficha de título+dimensiones al lado.
export function dibujarCotasElevacion(ctx, escenaCargada, piso, camera, anchoPx, altoPx, datosProyecto, eje, mapaObras, pxPorMm) {
    const dimensionesSala = (datosProyecto && datosProyecto.dimensiones_sala) || {};
    const dimensionSalaHorizontal = eje === 'z'
        ? (Number(dimensionesSala.largo) || null)
        : (Number(dimensionesSala.ancho) || null);
    const mitadHorizontal = dimensionSalaHorizontal ? dimensionSalaHorizontal / 2 : null;
    const escala = crearEscalaCota(pxPorMm);
    const obtenerNivel = crearContadorDesfasaje();
    const piezas = [];

    escenaCargada.traverse((nodo) => {
        if (!nodo.isMesh || nodo === piso) return;

        const box = new THREE.Box3().setFromObject(nodo);
        const centro = box.getCenter(new THREE.Vector3());

        if (eje === 'z') {
            dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, box.min.z, box.max.z, mitadHorizontal,
                (v) => new THREE.Vector3(centro.x, 0, v), 'horizontal', obtenerNivel, escala);
        } else {
            dibujarCotaLimiteMasCercano(ctx, camera, anchoPx, altoPx, box.min.x, box.max.x, mitadHorizontal,
                (v) => new THREE.Vector3(v, 0, centro.z), 'horizontal', obtenerNivel, escala);
        }

        const p1 = proyectarPuntoAPixel(new THREE.Vector3(centro.x, 0, centro.z), camera, anchoPx, altoPx);
        const p2 = proyectarPuntoAPixel(new THREE.Vector3(centro.x, box.min.y, centro.z), camera, anchoPx, altoPx);
        const nivelAltura = obtenerNivel('altura-pos');
        dibujarLineaCotaDesplazada(ctx, p1, p2, `${box.min.y.toFixed(2)} m`, anchoPx, altoPx, nivelAltura, escala);

        piezas.push({ nodo, box, tam: box.getSize(new THREE.Vector3()) });
    });

    dibujarFichasSinSuperposicion(ctx, piezas, camera, anchoPx, altoPx, mapaObras, escala);
}

function ejeHorizontalDeVista(id) {
    return (id === 'lateral-izq' || id === 'lateral-der') ? 'z' : 'x';
}

// Nombre de cada vista — usado por exportarVistasAcotadasPDF() para
// dibujarlo directo en la página (abajo a la izquierda, tamaño fijo), no
// horneado en el render: así no cambia de tamaño con la resolución/escala
// de cada exportación (ver comentario de cabecera del archivo).
const ETIQUETA_VISTA = {
    'planta': 'Planta',
    'frontal': 'Vista frontal',
    'posterior': 'Vista posterior',
    'lateral-izq': 'Alzado izquierdo',
    'lateral-der': 'Alzado derecho'
};

// (c) Geometrales acotados: mismas 5 vistas y misma densidad compartida que
// (b) (reusa renderizarLoteVistas de registroExportViews.js), sumando el
// overlay de cotas y forzando fondo opaco (blanco) en vez de alfa. Antes de
// renderizar, calcula cuánto margen extra de encuadre hace falta para que
// la cota más apilada (ver calcularMargenExtraAcotado) entre en la hoja.
// `opciones.anchoDisponiblePaginaMm`/`altoDisponiblePaginaMm`: mm útiles de
// la página elegida en el diálogo de formato (ya con el margen del PDF
// descontado) — los pasa exportarVistasAcotadasPDF ANTES de renderizar,
// para que cada vista pueda calcular cuántos píxeles propios equivalen a
// 1mm en la hoja final (`pxPorMm`, ver crearEscalaCota) y el texto/las
// líneas de cota salgan al tamaño real correcto sin importar a qué tamaño
// de hoja se termine imprimiendo.
export function exportarVistasAcotadas(motor, idsSeleccionados, opciones = {}) {
    // Defaults = A4 con el margen de exportarVistasAcotadasPDF ya
    // descontado (210×297mm − 15mm de margen por lado) — por si esta
    // función se llama alguna vez sin pasar por el wrapper de PDF.
    const { anchoDisponiblePaginaMm = 180, altoDisponiblePaginaMm = 267 } = opciones;
    const datosProyecto = motor.obtenerDatosProyecto();
    const mapaObras = new Map(normalizarDatosJSON(datosProyecto).map(o => [o.id, o]));

    const escenaCargada = motor.obtenerEscenaCargada();
    const piso = escenaCargada ? detectarPiso(escenaCargada) : null;
    const margenExtraM = escenaCargada
        ? calcularMargenExtraAcotado(escenaCargada, piso, datosProyecto, anchoDisponiblePaginaMm, altoDisponiblePaginaMm)
        : 0;

    return renderizarLoteVistas(motor, idsSeleccionados, { ...opciones, margenExtraM, omitirCromo: true }, ({ id, camera, escenaCargada, piso, datosProyecto }) => {
        // pxPorMm: cuántos píxeles de ESTA vista puntual (anchoPx/altoPx,
        // recién conocidos acá porque dependen de la densidad compartida ya
        // resuelta) van a representar 1mm cuando renderizarVistasAcotadasPDF
        // la encoja/agrande para entrar en anchoDisponiblePaginaMm ×
        // altoDisponiblePaginaMm — mismo cálculo de ajuste que hace esa
        // función al ubicar la imagen en la página, así el tamaño de fuente
        // calculado acá coincide exactamente con el tamaño final impreso.
        const calcularPxPorMm = (anchoPx, altoPx) =>
            Math.max(anchoPx / anchoDisponiblePaginaMm, altoPx / altoDisponiblePaginaMm);

        if (id === 'planta') {
            return {
                dibujarIndicadoresDePlano: true,
                fondoColor: FONDO_ACOTADO,
                dibujarCotasFn: (ctx, anchoPx, altoPx) =>
                    dibujarCotasPlanta(ctx, escenaCargada, piso, camera, anchoPx, altoPx, datosProyecto, mapaObras, calcularPxPorMm(anchoPx, altoPx))
            };
        }
        return {
            dibujarCero: true,
            fondoColor: FONDO_ACOTADO,
            dibujarCotasFn: (ctx, anchoPx, altoPx) =>
                dibujarCotasElevacion(ctx, escenaCargada, piso, camera, anchoPx, altoPx, datosProyecto, ejeHorizontalDeVista(id), mapaObras, calcularPxPorMm(anchoPx, altoPx))
        };
    });
}

const MARGEN_PDF_ACOTADO_MM = 15;

// Franja reservada al pie de cada página para el pie fijo (nombre de vista +
// escala gráfica a la izquierda, crédito + número de página a la derecha) —
// se descuenta del alto disponible para la imagen, así el pie nunca queda
// tapado por el contenido ni al revés. Dos renglones fijos, no atados a la
// resolución/escala de cada vista (ver comentario de cabecera del archivo).
const ALTO_PIE_ACOTADO_MM = 26;

// Elige una longitud "linda" en metros para la barra de escala gráfica tal
// que su largo en mm no supere `anchoMaxMm` — misma lógica que
// elegirLongitudBarra() en registroExportViews.js, pero en mm de página en
// vez de px de render (acá no hay "imagen" de referencia, es geometría de
// la página).
function elegirLongitudBarraMm(mmPorMetroReal, anchoMaxMm) {
    const candidatos = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
    let elegido = candidatos[0];
    for (const c of candidatos) {
        if (c * mmPorMetroReal <= anchoMaxMm) elegido = c;
    }
    return elegido;
}

// Pie fijo de cada página del PDF de acotados, dibujado directo con jsPDF
// (no horneado en el render) — así queda a tamaño y posición constantes en
// TODAS las hojas sin importar la escala real de lo que estén mostrando.
// Nombre de vista + escala gráfica van pegados al borde inferior REAL de la
// imagen (`yDebajoDeImagen`, calculado por exportarVistasAcotadasPDF a
// partir de dónde terminó esa imagen en particular — no una posición fija
// de página, porque el alto de la imagen varía según su proporción).
// Crédito de marca + número de página van en una única línea fija abajo de
// la página, crédito centrado en el ancho completo. `mmPorMetroReal`:
// cuántos mm de esta página real representan 1 metro real de la sala en
// ESTA vista puntual — con eso la barra sí refleja la escala verdadera de
// la imagen (lo único de acá que NO puede ser un tamaño fijo: esa es la
// función de una escala gráfica).
const GAP_BAJO_IMAGEN_MM = 6;
function dibujarPieAcotado(doc, id, indice, totalPaginas, mmPorMetroReal, logo, anchoPagina, altoPagina, yDebajoDeImagen) {
    const yNombreVista = yDebajoDeImagen + GAP_BAJO_IMAGEN_MM;
    const yEscala = yNombreVista + 6;
    const yPiePagina = altoPagina - 12;
    const xIzquierda = MARGEN_PDF_ACOTADO_MM;

    // Nombre de vista.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(ETIQUETA_VISTA[id] || '', xIzquierda, yNombreVista);

    // Escala gráfica.
    const anchoMaxBarraMm = 45;
    const metros = elegirLongitudBarraMm(mmPorMetroReal, anchoMaxBarraMm);
    const largoBarraMm = metros * mmPorMetroReal;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(xIzquierda, yEscala, xIzquierda + largoBarraMm, yEscala);
    doc.line(xIzquierda, yEscala - 1, xIzquierda, yEscala + 1);
    doc.line(xIzquierda + largoBarraMm, yEscala - 1, xIzquierda + largoBarraMm, yEscala + 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`${metros} m`, xIzquierda + largoBarraMm + 3, yEscala);

    // Crédito de marca — logo + texto como un solo bloque, centrado en el
    // ancho de la página — y número de página, ambos en la misma línea fija
    // al pie de la hoja (mismo criterio de centrado que dibujarPie() en
    // registroLamina.js).
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140);
    const textoCredito = 'Producido en © raumlab';
    const anchoTextoCredito = doc.getTextWidth(textoCredito);
    const altoLogo = 5;
    const anchoLogo = logo ? altoLogo * (logo.aspecto || 1) : 0;
    const gapLogo = logo ? 2 : 0;
    let xCredito = (anchoPagina - (anchoLogo + gapLogo + anchoTextoCredito)) / 2;
    if (logo) {
        doc.addImage(logo.dataURL, 'PNG', xCredito, yPiePagina - altoLogo + 1.5, anchoLogo, altoLogo);
        xCredito += anchoLogo + gapLogo;
    }
    doc.text(textoCredito, xCredito, yPiePagina);
    doc.setTextColor(0);

    dibujarNumeroPaginaPDF(doc, indice + 1, totalPaginas, anchoPagina, altoPagina, MARGEN_PDF_ACOTADO_MM);
}

// (c) Geometrales acotados, como PDF multipágina en vez de PNG/ZIP: reusa
// exportarVistasAcotadas() tal cual (cotas ya "horneadas" en cada PNG por
// renderizarVistaOffscreen(), registroExportViews.js — con omitirCromo, sin
// barra/crédito ni etiqueta de vista) y arma una página por vista tildada:
// imagen ajustada dentro del área disponible (por encima del pie, ver
// ALTO_PIE_ACOTADO_MM) preservando su proporción, más el pie fijo de
// dibujarPieAcotado(). `formato`: mismo shape que exportarLaminaPDF() en
// registroLamina.js — { tamanio, orientacion }, elegido en el diálogo de
// formato de registro.js.
export function exportarVistasAcotadasPDF(motor, idsSeleccionados, opciones = {}, formato = null) {
    // El tamaño de página se resuelve ANTES de renderizar (no después,
    // como el resto del armado del PDF) — exportarVistasAcotadas() necesita
    // el mm disponible para calcular el pxPorMm de cada vista y que el
    // texto/las cotas salgan al tamaño real correcto en la hoja elegida
    // (ver comentario de cabecera del archivo).
    const dimensionesPagina = calcularDimensionesPagina(formato);
    const anchoDisponible = dimensionesPagina.ancho - MARGEN_PDF_ACOTADO_MM * 2;
    const altoDisponibleImagen = dimensionesPagina.alto - MARGEN_PDF_ACOTADO_MM * 2 - ALTO_PIE_ACOTADO_MM;

    const { vistas, densidadPxPorMetro } = exportarVistasAcotadas(motor, idsSeleccionados, {
        ...opciones,
        anchoDisponiblePaginaMm: anchoDisponible,
        altoDisponiblePaginaMm: altoDisponibleImagen
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [dimensionesPagina.ancho, dimensionesPagina.alto], orientation: dimensionesPagina.orientation });
    const logo = opciones.logo || null;

    vistas.forEach((vista, indice) => {
        if (indice > 0) doc.addPage();

        const proporcion = Math.min(anchoDisponible / vista.anchoPx, altoDisponibleImagen / vista.altoPx);
        const anchoMm = vista.anchoPx * proporcion;
        const altoMm = vista.altoPx * proporcion;
        const x = (dimensionesPagina.ancho - anchoMm) / 2;
        const y = MARGEN_PDF_ACOTADO_MM + (altoDisponibleImagen - altoMm) / 2;
        doc.addImage(vista.dataURL, 'PNG', x, y, anchoMm, altoMm);

        const mmPorMetroReal = densidadPxPorMetro * proporcion;
        dibujarPieAcotado(doc, vista.id, indice, vistas.length, mmPorMetroReal, logo, dimensionesPagina.ancho, dimensionesPagina.alto, y + altoMm);
    });

    return doc;
}
