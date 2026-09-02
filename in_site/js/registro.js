/* ==========================================================================
   in_SITE - REGISTRO: carga de proyecto + wiring de exportación (registro.js)
   Bootstrap de la página: wiring de DOM + carga de archivos (mismo patrón
   que viewer.js), instancia de registroMotor.js, y conecta cada botón de
   exportación con su función en registroExportViews.js/registroDimensioning.js/
   registroLamina.js — nombre de archivo, logo de marca y el diálogo de
   formato de página (lámina + acotados en PDF) se resuelven acá, no en esos
   módulos.
   ========================================================================== */

import * as THREE from 'three';
import { crearMotorRegistro } from './registroMotor.js';
import { exportarVistaActual, exportarVistasGeometrales, construirConfiguracionVistas, crearCamaraOrtografica, renderizarLoteVistas } from './registroExportViews.js';
import { exportarVistasAcotadasPDF } from './registroDimensioning.js';
import { exportarLaminaPDF } from './registroLamina.js';
import { exportarPanorama360 } from './registroPanorama360.js';
import { descargarPNG, descargarComoZip } from './registroZip.js';
import { desempaquetarRML } from './rmlArchivo.js';
import { proyectarPuntoAPixel, puntoPlantaDesdePixel } from './registroGeometriaUtil.js';

// Techo de seguridad para el lado mayor de cualquier render rasterizado
// (vista actual en calidad máxima, geometrales, acotados) — WebKit/Safari
// (particularmente en iPhone) puede devolver un canvas.toDataURL('image/png')
// incompleto/corrupto en canvases grandes (documentado alrededor de los
// ~16.7 millones de píxeles, 4096×4096) en vez de tirar un error claro —
// confirmado en celular con "Incomplete or corrupt PNG file" al exportar
// acotados con el tope viejo de 4096px. 3000px de lado (9M px) queda con
// margen real por debajo de ese límite.
const MAX_PIXEL_DIM_SEGURO = 3000;

document.addEventListener('DOMContentLoaded', () => {
    const fileRml = document.getElementById('registro-file-rml');
    const fileGlb = document.getElementById('registro-file-glb');
    const fileJson = document.getElementById('registro-file-json');
    const btnLoad = document.getElementById('registro-btn-load');
    const cargaSection = document.getElementById('registro-carga-section');
    const fichaSection = document.getElementById('registro-ficha-section');
    const btnVolver = document.getElementById('registro-btn-volver');

    const exportPlaceholder = document.getElementById('registro-export-placeholder');
    const exportOpciones = document.getElementById('registro-export-opciones');
    const btnExportActual = document.getElementById('registro-btn-export-actual');
    const pickerCalidadActual = document.getElementById('registro-picker-calidad-actual');
    const btnExportGeometrales = document.getElementById('registro-btn-export-geometrales');
    const btnExportAcotados = document.getElementById('registro-btn-export-acotados');
    const btnExportLamina = document.getElementById('registro-btn-export-lamina');
    const checkIncluirPiso = document.getElementById('registro-check-incluir-piso');
    const checksVistas = Array.from(document.querySelectorAll('.registro-check-vista'));

    const pickerCalidad360 = document.getElementById('registro-picker-calidad-360');
    const checkIncluirPiso360 = document.getElementById('registro-check-incluir-piso-360');
    const btn360Punto = document.getElementById('registro-btn-360-punto');
    const btnExport360 = document.getElementById('registro-btn-export-360');
    const modal360 = document.getElementById('registro-modal-360');
    const canvas360 = document.getElementById('registro-360-canvas-planta');
    const btn360Cancelar = document.getElementById('registro-360-cancelar');
    const btn360Confirmar = document.getElementById('registro-360-confirmar');

    const modalFormato = document.getElementById('registro-modal-formato');
    const pickerFormatoTamanio = document.getElementById('registro-picker-formato-tamanio');
    const pickerFormatoOrientacion = document.getElementById('registro-picker-formato-orientacion');
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

    // Punto del panorama 360° (d): X/Z elegidos por click en la planta
    // (ver abrirModalPunto), altura siempre fija en 1.60 m (no se guarda
    // acá, se resuelve recién al exportar). Se resetea al centro de la
    // sala cada vez que se carga un proyecto nuevo — evita que quede un
    // punto de una sala de otro tamaño/forma.
    let puntoPanorama = { x: 0, z: 0 };
    const ALTURA_OJOS_PANORAMA_M = 1.6;

    // Renderiza la planta (chica, tamaño fijo) para el modal de ubicar el
    // punto. `camera` viene con updateMatrixWorld() ya aplicado:
    // crearCamaraOrtografica() solo fija position/lookAt/projectionMatrix,
    // pero nunca la renderiza (a
    // diferencia de las vistas que sí pasan por renderer.render()) — sin
    // este paso, matrixWorld queda en identidad y project()/unproject()
    // devuelven puntos sin sentido (bug real: Z terminaba en ~-1005, la
    // mitad del far plane de esta cámara, sin rotar hacia abajo).
    function renderizarPlantaConPunto(maxPixelDim) {
        const datosProyecto = motor.obtenerDatosProyecto();
        const escenaCargada = motor.obtenerEscenaCargada();
        const configPlanta = construirConfiguracionVistas(datosProyecto, escenaCargada).planta;
        const { camera } = crearCamaraOrtografica('planta', configPlanta.anchoReal, configPlanta.altoReal, 0);
        camera.updateMatrixWorld(true);

        const { vistas } = renderizarLoteVistas(motor, ['planta'], {
            omitirCromo: true,
            densidadDeseadaPxPorMetro: 99999,
            maxPixelDim
        });
        const { dataURL, anchoPx, altoPx } = vistas[0];
        return { dataURL, anchoPx, altoPx, camera };
    }

    // Marcador gráfico del punto en el picker — blanco con borde oscuro,
    // visible tanto sobre el piso claro como sobre las líneas de los
    // cuadros.
    function dibujarMarcadorPunto(ctx, camera, punto, anchoPx, altoPx) {
        const px = proyectarPuntoAPixel(new THREE.Vector3(punto.x, 0, punto.z), camera, anchoPx, altoPx);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px.x, px.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // Desplegables de Registro — mismo patrón "picker" que usa espacio_inm
    // (botón + lista propia, ver registro.css) en vez de <select> nativo:
    // el navegador no deja tematizar el fondo/resaltado de las opciones de
    // un <select> (queda el azul del sistema, imposible de anular por
    // CSS). wirePicker() es genérico — cada picker de la página pasa por
    // acá una sola vez, con su propio callback para guardar el valor
    // elegido; setPickerValor() lo lleva a un valor puntual por código
    // (ej. al reabrir el diálogo de formato con los defaults).
    function wirePicker(picker, onSeleccionar) {
        const boton = picker.querySelector('.picker-boton');
        const label = picker.querySelector('.picker-boton-label');
        const lista = picker.querySelector('.picker-lista');

        boton.addEventListener('click', () => {
            const abierta = !lista.hidden;
            lista.hidden = abierta;
            boton.setAttribute('aria-expanded', String(!abierta));
        });

        picker.querySelectorAll('.picker-opcion').forEach((opcion) => {
            opcion.addEventListener('click', () => {
                picker.querySelectorAll('.picker-opcion').forEach((o) => o.classList.remove('active'));
                opcion.classList.add('active');
                const nombre = opcion.querySelector('.picker-opcion-nombre');
                label.textContent = (nombre || opcion).textContent.trim();
                lista.hidden = true;
                boton.setAttribute('aria-expanded', 'false');
                onSeleccionar(opcion.dataset.value);
            });
        });
    }

    function setPickerValor(picker, valor) {
        const label = picker.querySelector('.picker-boton-label');
        picker.querySelectorAll('.picker-opcion').forEach((opcion) => {
            const activa = opcion.dataset.value === valor;
            opcion.classList.toggle('active', activa);
            if (activa) {
                const nombre = opcion.querySelector('.picker-opcion-nombre');
                label.textContent = (nombre || opcion).textContent.trim();
            }
        });
    }

    document.addEventListener('click', (evento) => {
        document.querySelectorAll('.picker-lista:not([hidden])').forEach((lista) => {
            const picker = lista.closest('.picker');
            if (picker && !picker.contains(evento.target)) {
                lista.hidden = true;
                picker.querySelector('.picker-boton').setAttribute('aria-expanded', 'false');
            }
        });
    });

    // Valores fijos (no dependen del maxTextureSize de la GPU, a
    // diferencia del viejo tier "máxima"): en Vista actual el aspecto real
    // sigue al del encuadre orbital vigente (por eso su detalle solo
    // muestra el lado mayor); en Panorama 360° el aspecto es siempre 2:1
    // (restricción del formato equirectangular), por eso ahí sí se muestra
    // el ancho×alto real de salida.
    let calidadActualValor = '4000';
    wirePicker(pickerCalidadActual, (valor) => { calidadActualValor = valor; });

    let calidad360Valor = '4000';
    wirePicker(pickerCalidad360, (valor) => { calidad360Valor = valor; });

    let formatoTamanioValor = 'a4';
    wirePicker(pickerFormatoTamanio, (valor) => { formatoTamanioValor = valor; });

    let formatoOrientacionValor = 'vertical';
    wirePicker(pickerFormatoOrientacion, (valor) => { formatoOrientacionValor = valor; });

    // Nombre base para los archivos exportados: el de la sala si el JSON lo
    // trae, si no un fallback genérico — mismo criterio que
    // confirmarExportacion() en editor.js.
    function nombreBaseArchivo() {
        const datos = motor.obtenerDatosProyecto();
        const nombre = (datos && datos.nombre_sala) || 'proyecto_registro';
        return nombre.trim().replace(/\s+/g, '_').toLowerCase() || 'proyecto_registro';
    }

    function leerJSONComoTexto(archivo) {
        return new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = (evento) => resolve(evento.target.result);
            lector.onerror = reject;
            lector.readAsText(archivo);
        });
    }

    // Botón deshabilitado mientras carga: evita disparar una segunda carga
    // (doble-tap, típico en celular) antes de que la primera termine —
    // motor.cargarGLB() ya se protege igual internamente (token de carga)
    // por si se dispara desde otro lado, pero acá cortamos de raíz la forma
    // más común de gatillarlo. mostrarFichaProyecto() ahora espera a que la
    // escena esté REALMENTE aplicada, no que la carga recién haya arrancado.
    //
    // Dos caminos posibles: un .rml (GLB+JSON empaquetados, ver
    // rmlArchivo.js) o el par de archivos sueltos de siempre — se prioriza
    // el .rml si hay uno elegido, sin importar si además quedaron
    // seleccionados un .glb/.json de un intento anterior.
    btnLoad.addEventListener('click', async () => {
        const hayRml = fileRml.files.length > 0;
        if (!hayRml && fileGlb.files.length === 0) {
            alert('Elegí un archivo .RML, o un .GLB para cargar el proyecto.');
            return;
        }

        const textoOriginal = btnLoad.textContent;
        btnLoad.disabled = true;
        btnLoad.textContent = 'Cargando…';
        try {
            if (hayRml) {
                const { glbBlob, datosJSON } = await desempaquetarRML(fileRml.files[0]);
                await motor.cargarGLB(URL.createObjectURL(glbBlob));
                if (datosJSON) {
                    motor.setDatosProyecto(datosJSON);
                } else {
                    motor.limpiarDatosProyecto();
                }
            } else {
                await motor.cargarGLB(URL.createObjectURL(fileGlb.files[0]));

                if (fileJson.files.length > 0) {
                    try {
                        motor.setDatosProyecto(JSON.parse(await leerJSONComoTexto(fileJson.files[0])));
                    } catch (error) {
                        console.error('Error al parsear el archivo JSON:', error);
                        alert('El archivo de fichas técnicas no tiene un formato JSON válido.');
                    }
                } else {
                    motor.limpiarDatosProyecto();
                }
            }

            puntoPanorama = { x: 0, z: 0 };
            mostrarFichaProyecto();
        } catch (error) {
            // El error de carga del GLB ya se alertó desde registroMotor.js;
            // acá solo faltan los errores propios de desempaquetarRML().
            if (hayRml) {
                console.error('Error al leer el archivo .rml:', error);
                alert(error.message || 'No se pudo leer el archivo .rml.');
            }
        } finally {
            btnLoad.disabled = false;
            btnLoad.textContent = textoOriginal;
        }
    });

    btnVolver.addEventListener('click', () => {
        fileRml.value = '';
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
            formatoTamanioValor = 'a4';
            formatoOrientacionValor = 'vertical';
            setPickerValor(pickerFormatoTamanio, 'a4');
            setPickerValor(pickerFormatoOrientacion, 'vertical');
            modalFormato.classList.remove('hidden');

            function cerrar(resultado) {
                modalFormato.classList.add('hidden');
                btnFormatoConfirmar.removeEventListener('click', onConfirmar);
                btnFormatoCancelar.removeEventListener('click', onCancelar);
                modalFormato.removeEventListener('click', onOverlayClick);
                resolve(resultado);
            }
            function onConfirmar() {
                cerrar({ tamanio: formatoTamanioValor, orientacion: formatoOrientacionValor });
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

    // Picker de punto para el panorama 360° (d): abre el modal con la
    // planta clickeable (renderizarPlantaConPunto) y deja elegir X/Z —
    // mismo patrón Promise que pedirFormatoPagina(). Devuelve {x, z} al
    // confirmar, o null si se cancela/cierra sin cambiar el punto.
    function abrirModalPunto() {
        return new Promise((resolve) => {
            const { dataURL, anchoPx, altoPx, camera } = renderizarPlantaConPunto(640);

            canvas360.width = anchoPx;
            canvas360.height = altoPx;
            const ctx = canvas360.getContext('2d');
            const imagenPlanta = new Image();
            let puntoPendiente = { x: puntoPanorama.x, z: puntoPanorama.z };

            function redibujar() {
                ctx.drawImage(imagenPlanta, 0, 0, anchoPx, altoPx);
                dibujarMarcadorPunto(ctx, camera, puntoPendiente, anchoPx, altoPx);
            }

            function onClickCanvas(evento) {
                const rect = canvas360.getBoundingClientRect();
                const px = (evento.clientX - rect.left) * (canvas360.width / rect.width);
                const py = (evento.clientY - rect.top) * (canvas360.height / rect.height);
                puntoPendiente = puntoPlantaDesdePixel(px, py, camera, anchoPx, altoPx);
                redibujar();
            }

            function cerrar(resultado) {
                modal360.classList.add('hidden');
                canvas360.removeEventListener('click', onClickCanvas);
                btn360Confirmar.removeEventListener('click', onConfirmar);
                btn360Cancelar.removeEventListener('click', onCancelar);
                modal360.removeEventListener('click', onOverlayClick);
                resolve(resultado);
            }
            function onConfirmar() { cerrar(puntoPendiente); }
            function onCancelar() { cerrar(null); }
            function onOverlayClick(evento) { if (evento.target === modal360) cerrar(null); }

            imagenPlanta.onload = redibujar;
            imagenPlanta.src = dataURL;

            canvas360.addEventListener('click', onClickCanvas);
            btn360Confirmar.addEventListener('click', onConfirmar);
            btn360Cancelar.addEventListener('click', onCancelar);
            modal360.addEventListener('click', onOverlayClick);
            modal360.classList.remove('hidden');
        });
    }

    btnExportActual.addEventListener('click', async () => {
        try {
            const ladoMaximoPx = Number(calidadActualValor);
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
                maxPixelDim: Math.min(MAX_PIXEL_DIM_SEGURO, motor.obtenerRenderer().capabilities.maxTextureSize),
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
                maxPixelDim: Math.min(MAX_PIXEL_DIM_SEGURO, motor.obtenerRenderer().capabilities.maxTextureSize),
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

    btn360Punto.addEventListener('click', async () => {
        const resultado = await abrirModalPunto();
        if (resultado) {
            puntoPanorama = resultado;
        }
    });

    btnExport360.addEventListener('click', async () => {
        try {
            const ladoMaximoPx = Number(calidad360Valor);
            const logo = await cargarLogoRaumlab();
            const dataURL = exportarPanorama360(motor, {
                x: puntoPanorama.x,
                y: ALTURA_OJOS_PANORAMA_M,
                z: puntoPanorama.z
            }, { ladoMaximoPx, logo, incluirPiso: checkIncluirPiso360.checked });
            descargarPNG(`${nombreBaseArchivo()}_360.png`, dataURL);
        } catch (error) {
            console.error('Error al exportar el panorama 360°:', error);
            alert(error.message || 'No se pudo exportar el panorama 360°.');
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
