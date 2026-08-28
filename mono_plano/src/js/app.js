// src/js/app.js
import { calcularHomografia, calcularHomografiaGeometrica, calcularTransformSimilitud } from './geometry.js';
import { generarDXF } from './dxf.js';

console.log("RaumLab TransFORM inicializado.");

const inicioScreen = document.getElementById('inicio-screen');

// =====================================================================
// PANEL DE DIÁLOGO GLOBAL (reemplaza alert()/confirm())
// Vive fuera de #inicio-screen, así sobrevive a los reemplazos de pantalla.
// =====================================================================
const panelDialogo = document.getElementById('panel-dialogo');

// Se llama al entrar a un modo (Fotoplano o Fotomosaico) — antes de eso el
// panel no se muestra. Es un no-op si ya estaba visible.
function mostrarPanelDialogo() {
    panelDialogo.classList.add('visible');
}

function mostrarMensaje(texto, tipo) {
    const iconos = { info: 'ℹ', exito: '✓', advertencia: '⚠', error: '✕' };
    panelDialogo.innerHTML = `
        <div class="dialogo-mensaje">
            <span class="dialogo-icono">${iconos[tipo] || iconos.info}</span>
            <span>${texto}</span>
        </div>
    `;
}

function preguntarOpciones(texto, opciones) {
    return new Promise((resolve) => {
        const botonesHtml = opciones.map((op, i) =>
            `<button data-i="${i}">${op.label}</button>`
        ).join('');
        panelDialogo.innerHTML = `
            <div class="dialogo-mensaje">
                <span class="dialogo-icono">?</span>
                <span>${texto}</span>
            </div>
            <div class="dialogo-opciones">${botonesHtml}</div>
        `;
        panelDialogo.querySelectorAll('.dialogo-opciones button').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                resolve(opciones[i].valor);
                mostrarMensaje(`Elegiste: ${opciones[i].label}`, 'info');
            });
        });
    });
}

// El panel queda vacío hasta el primer mensaje real — es un espacio fijo
// siempre presente, no aparece/desaparece, pero no fuerza un texto inicial.

// =====================================================================
// SUBNAV DEL MÓDULO (Fotoplano / Fotomosaico) — vive en el header fijo y
// su espejo en el panel de navegación de celular (raumlab-chrome.js/css),
// fuera de #inicio-screen: sobrevive a sus reemplazos de pantalla, así que
// el cambio de modo pasa a resolverse acá en vez de con botones locales.
// =====================================================================
const botonesModo = document.querySelectorAll('[data-modo]');

function activarSubnavModo(modo) {
    botonesModo.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.modo === modo);
    });
}

botonesModo.forEach((btn) => {
    btn.addEventListener('click', () => {
        if (btn.dataset.modo === 'tutoriales') {
            mostrarInstrucciones();
        } else if (btn.dataset.modo === 'adaptativo') {
            mostrarAdaptativo();
        } else {
            mostrarWorkspace(btn.dataset.modo === 'fotomosaico' ? 'fotomosaico' : 'fotoplano');
        }
        activarSubnavModo(btn.dataset.modo);
    });
});

// Pantalla de introducción — mismo criterio que in_SITE y espacio_INM:
// texto de presentación (igual al de la card del módulo en la landing), sin
// ninguna pestaña de Fotoplano/Fotomosaico marcada activa todavía. Elegir
// una pestaña reemplaza esto por el workspace real (mostrarWorkspace ya
// hace ese reemplazo de #inicio-screen) — no hay vuelta a esta pantalla
// salvo recargar, mismo comportamiento que los otros dos módulos.
function mostrarIntro() {
    inicioScreen.innerHTML = `
        <div class="mode-intro-content">
            <p class="rc-intro-lede">Módulo para la rectificación de imágenes.</p>
            <p class="rc-intro-detail">Confección de fotoplanos y fotomosaicos orientados al relevamiento del patrimonio cultural y el registro de obras artísticas bidimensionales. Corrección de la deformación geométrica de las imágenes mediante métodos analítico, geométrico y adaptativo.</p>
        </div>
    `;

    // Aviso de "solo en PC" — Fotoplano/Fotomosaico están ocultos del subnav
    // en mobile (no entran las 4 pestañas), así que sin esto no habría forma
    // de que la usuaria móvil supiera que existen. Aparece una sola vez al
    // entrar al módulo, no en cada pestaña — ver rcIsMobile() en
    // raumlab-chrome.js (mismo breakpoint que el resto del sitio).
    if (window.rcIsMobile && window.rcIsMobile()) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <h3>Fotoplano y Fotomosaico</h3>
                <p class="modal-box-text">Para desarrollos de fotoplanos y fotomosaicos de alta precisión, accedé desde la versión de escritorio.</p>
                <div class="modal-actions">
                    <button type="button" class="btn-primary btn-full" id="btn-cerrar-aviso-mobile">Entendido</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('btn-cerrar-aviso-mobile').addEventListener('click', () => overlay.remove());
    }
}

mostrarIntro();

// Pantalla de Tutoriales — lista de modos a la izquierda (.instr-nav) +
// panel de contenido al centro (.instr-panel), mismo patrón en los 3 módulos
// de RaumLab que ya tienen esta pantalla (espacio_INM la resuelve con el
// helper wireSwitcher() que ya tenía ese archivo; acá no existe ese helper
// genérico, así que el wiring de clicks se hace a mano abajo). Arranca sin
// ningún modo seleccionado, mostrando el texto general — elegir un modo de
// la lista lo reemplaza, sin vuelta al texto general salvo recargar (mismo
// criterio que mostrarIntro()/mostrarWorkspace()).
function mostrarInstrucciones() {
    inicioScreen.innerHTML = `
        <div class="instr-layout">

            <aside class="instr-nav">
                <button type="button" class="instr-nav-item" data-instr="instr-fotoplano">Fotoplano</button>
                <button type="button" class="instr-nav-item" data-instr="instr-fotomosaico">Fotomosaico</button>
                <button type="button" class="instr-nav-item" data-instr="instr-adaptativo">Adaptativo</button>
            </aside>

            <div class="instr-panel">

                <div class="instr-body active" id="instr-general">
                    <h2>¿Qué es trans_FORMA?</h2>
                    <p>
                        trans_FORMA rectifica fotos oblicuas de superficies
                        planas (fachadas, planos, carteles, obras
                        bidimensionales) a escala métrica real — el resultado
                        se llama <strong>fotoplano</strong>. Cuando una sola
                        foto no cubre todo el objeto, permite fusionar varias
                        en un <strong>fotomosaico</strong>. Pensado para
                        documentación de patrimonio cultural y piezas
                        artísticas planas. Corre enteramente en el navegador.
                        Fotoplano y Fotomosaico están pensados para
                        escritorio: el marcado punto a punto sobre una imagen
                        no tiene un equivalente cómodo en celular.
                        <strong>Adaptativo</strong> es la excepción — versión
                        simplificada (4 vértices arrastrables en vez de una
                        tabla de puntos, tamaño de papel preseteado en vez de
                        coordenadas reales) pensada justamente para eso, y es
                        el único de los tres disponible desde el celular.
                    </p>
                    <p>Elegí un modo de la lista para ver sus instrucciones.</p>
                </div>

                <div class="instr-body" id="instr-fotoplano">
                    <h2>Fotoplano</h2>
                    <p>
                        Rectifica una única foto oblicua. Dos métodos, a
                        elección: <strong>Analítico</strong> (marcás puntos
                        de control con coordenadas reales conocidas) o
                        <strong>Geométrico</strong> (marcás líneas de fuga y
                        cargás el ancho/alto real de la superficie).
                    </p>

                    <h3>Método Analítico, paso a paso</h3>
                    <ol>
                        <li>Cargá una imagen.</li>
                        <li>Elegí el método <strong>Analítico</strong> y marcá al menos 4 puntos de control sobre puntos reconocibles de la imagen.</li>
                        <li>Cargá las coordenadas reales (X, Y) de cada punto y confirmá con "Confirmar valores reales".</li>
                        <li>Definí el área a rectificar (mínimo 3 vértices) y la resolución de salida (GSD, en mm/píxel).</li>
                        <li>Generá el fotoplano métrico.</li>
                    </ol>

                    <h3>Método Geométrico</h3>
                    <p>
                        Alternativa cuando no conocés coordenadas reales de
                        puntos específicos, pero sí el ancho y el alto real
                        de la superficie: marcá al menos 2 rectas verticales
                        y 2 horizontales (líneas de fuga), cargá esas
                        medidas, y confirmá con "Confirmar dimensiones
                        reales".
                    </p>

                    <h3>Medir, dibujar y exportar</h3>
                    <p>
                        Disponible sobre el resultado rectificado.
                        "Consultar medidas" anota coordenadas, distancias y
                        superficies directo sobre la imagen, y permite
                        descargar la imagen con esas anotaciones. "Dibujar"
                        marca puntos, líneas, polígonos y trazos libres
                        eligiendo un color por capa — cada color se exporta
                        como una capa distinta en el DXF, para poder
                        activarla o desactivarla en AutoCAD.
                    </p>
                </div>

                <div class="instr-body" id="instr-fotomosaico">
                    <h2>Fotomosaico</h2>
                    <p>
                        Para cuando una sola foto no alcanza: rectificás
                        varias fotos del mismo objeto y las fusionás en una
                        sola imagen marcando puntos homólogos (el mismo punto
                        real, visible en dos fotos distintas).
                    </p>

                    <h3>Paso a paso</h3>
                    <ol>
                        <li>Cargá la primera imagen — se rectifica igual que en Fotoplano (Analítico o Geométrico).</li>
                        <li>Con el "+" de la columna de miniaturas, agregá las siguientes fotos del mismo objeto y rectificá cada una.</li>
                        <li>Con 2 o más imágenes en estado "Lista", apretá <strong>Fusionar</strong>.</li>
                        <li>En cada par, marcá al menos 3 puntos homólogos — el mismo punto real, visible en las dos imágenes.</li>
                        <li>Si el desajuste entre ambas rectificaciones supera la tolerancia, la app pregunta cuál usar como referencia.</li>
                        <li>El resultado combinado se sigue fusionando con las imágenes que falten en la cola.</li>
                    </ol>

                    <h3>Medir, dibujar y exportar</h3>
                    <p>
                        Disponible sobre cualquier resultado rectificado.
                        "Consultar medidas" anota coordenadas, distancias y
                        superficies directo sobre la imagen, y permite
                        descargar la imagen con esas anotaciones. "Dibujar"
                        marca puntos, líneas, polígonos y trazos libres
                        eligiendo un color por capa — cada color se exporta
                        como una capa distinta en el DXF, para poder
                        activarla o desactivarla en AutoCAD.
                    </p>
                </div>

                <div class="instr-body" id="instr-adaptativo">
                    <h2>Adaptativo</h2>
                    <p>
                        Versión simplificada de la rectificación, pensada
                        para obras artísticas de bastidor conocido — y el
                        único de los tres modos disponible desde el celular.
                        En vez de marcar puntos de control con coordenadas
                        reales, alcanza con los 4 vértices del contorno y un
                        tamaño de papel estándar.
                    </p>

                    <h3>Paso a paso</h3>
                    <ol>
                        <li>Cargá una imagen — aparecen los 4 vértices ya ubicados sobre la foto (abajo-izq., arriba-izq., arriba-der., abajo-der.), listos para ajustar.</li>
                        <li>Seleccioná cada vértice y llevalo a su lugar sobre el contorno real de la obra.</li>
                        <li>Elegí el tamaño real: A5, A4, A3, A2 (con orientación vertical u horizontal), o personalizado en milímetros.</li>
                        <li>Elegí la resolución de salida: Baja, Media o Alta.</li>
                        <li>Generá el Adaptativo y descargalo.</li>
                    </ol>
                </div>

            </div>

        </div>
    `;

    document.querySelectorAll('.instr-nav-item').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.instr-nav-item').forEach((b) => {
                b.classList.toggle('active', b === btn);
            });
            document.querySelectorAll('.instr-body').forEach((p) => p.classList.remove('active'));
            document.getElementById(btn.dataset.instr).classList.add('active');
        });
    });
}

// =====================================================================
// ESTACIÓN DE RECTIFICACIÓN (reutilizable: Fotoplano la usa una vez,
// Fotomosaico la monta una vez por imagen del proyecto — ver
// mostrarWorkspace más abajo).
// =====================================================================
function crearEstacionFotoplano(file, contenedor, opciones) {
    mostrarPanelDialogo();
    const imageUrl = URL.createObjectURL(file);

    // Variables Analítico
    let puntosControl = [];
    let capturandoPunto = false;

    // Variables Geométrico
    let rectasVerticales = [];
    let rectasHorizontales = [];
    let capturandoRectaTipo = null;
    let puntoTemporalRecta = null;

    // Escalas Independientes (Ancho y Alto)
    let escalaRefX = { ref: null, distReal: 0 };
    let escalaRefY = { ref: null, distReal: 0 };
    let capturandoEscalaTipo = null; // 'X' o 'Y'

    // Compartidas (Área y GSD)
    let poligonoAreaImg = [];
    let capturandoArea = false;
    let metodoActivo = 'analytic';

    const tituloExtra = opciones.tituloExtra || '';

    // Fotomosaico monta esta estación dentro de su propio workspace (que ya
    // tiene su header y su "Cerrar Proyecto"), así que ahí no se repite.
    const headerHtml = opciones.sinHeader ? '' : `
        <header class="app-header" style="display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
            <h1>RaumLab <span>TransFORM</span> &mdash; <strong>${file.name}</strong> ${tituloExtra}</h1>
            <button class="btn-primary" style="padding: 0.4rem 1rem; background: #27272a;" onclick="location.reload()">Cerrar Proyecto</button>
        </header>
    `;

    // Lienzo central: solo la imagen y sus capas — nada de controles acá.
    // El zoom ya no es un visor de lupa aparte: ahora se hace directo sobre
    // la imagen central (rueda del mouse para acercar, arrastrar para
    // recorrer) — ver aplicarZoom()/panActivo más abajo.
    // view-mode-bar pasó de ser dos botones grandes superpuestos con la
    // imagen a dos pestañas livianas (mismo criterio que Analítico/
    // Geométrico), en su propia fila arriba del lienzo — ya no tapan nada.
    // "Descargar" se mudó a la columna izquierda (opciones.contenedorDescarga).
    const imagenHtml = `
        <div style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
            <div id="view-mode-bar" class="view-mode-tabs">
                <button id="btn-view-original" type="button" class="active" data-view="original">Imagen Original</button>
                <button id="btn-view-rectified" type="button" data-view="rectificado">Fotoplano</button>
            </div>
            <div class="canvas-area" id="canvas-container" style="cursor: crosshair;">
            <div id="image-wrapper" style="position: relative; display: inline-flex; justify-content: center; align-items: center; flex-shrink: 0;">
                <img id="main-image" src="${imageUrl}" style="width: 100%; height: 100%; object-fit: fill; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border-radius: 4px; display: block;" />
                <canvas id="rectified-canvas" style="display: none; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border-radius: 4px; background: black;"></canvas>
                <svg id="overlay-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></svg>
                <canvas id="capa-cuadricula" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none;"></canvas>
                <canvas id="capa-medidas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none;"></canvas>
                <canvas id="capa-dibujo" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none;"></canvas>
            </div>
            </div>
        </div>
    `;

    // Panel de controles (Analítico/Geométrico → Área → GSD, y Medir/Dibujar
    // sobre el resultado): en el flujo actual (mostrarWorkspace) siempre se
    // monta como columna derecha propia vía opciones.contenedorControles —
    // ver composición de 3 columnas en mostrarWorkspace. El fallback de acá
    // abajo (sidebar-panel embebido) solo entra si algún día se llama a esta
    // función sin ese contenedor.
    const controlesHtml = `
        <!-- Controles de rectificación: solo tienen sentido mirando la imagen
             original. Se ocultan al pasar a "Ver Fotoplano Rectificado". -->
        <div id="panel-rectificacion" class="controles-panel" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">

            <div class="method-tabs">
                <button class="tab-btn active" data-target="analytic-section">Analítico</button>
                <button class="tab-btn" data-target="geometric-section">Geométrico</button>
            </div>

            <div class="panel-content">

                <!-- SECCIÓN ANALÍTICO -->
                <div id="analytic-section" class="method-section active">
                    <h3 class="controles-heading">1. Puntos de Control (Mín. 4) <button type="button" class="controles-help-btn" id="ayuda-puntos" title="Ayuda">?</button></h3>
                    <div class="controles-table-wrap">
                        <table class="controles-table">
                            <thead>
                                <tr>
                                    <th>Pt</th>
                                    <th>Img X</th>
                                    <th>Img Y</th>
                                    <th>X real</th>
                                    <th>Y real</th>
                                </tr>
                            </thead>
                            <tbody id="cuerpo-tabla-puntos">
                                <tr><td colspan="5" class="controles-table-empty">Sin puntos (0 / 4)</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="controles-btn-row">
                        <button id="btn-iniciar-puntos" class="btn-text" style="flex: 1;">+ Marcar Puntos</button>
                        <button id="btn-reset-puntos" class="btn-text" style="flex: 0.5;">Reiniciar</button>
                    </div>
                    <button id="btn-confirmar-puntos" class="btn-text btn-full" disabled>✓ Confirmar valores reales</button>
                </div>

                <!-- SECCIÓN GEOMÉTRICO -->
                <div id="geometric-section" class="method-section">
                    <h3 class="controles-heading">1. Rectas de Fuga y Escala <button type="button" class="controles-help-btn" id="ayuda-rectas" title="Ayuda">?</button></h3>
                    <div class="controles-btn-row">
                        <button id="btn-recta-vert" class="controles-icon-btn" title="Recta vertical">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><line x1="7" y1="21" x2="10" y2="3"/><line x1="17" y1="21" x2="14" y2="3"/></svg>
                            <span class="visually-hidden">Recta vertical</span>
                        </button>
                        <button id="btn-recta-horiz" class="controles-icon-btn" title="Recta horizontal">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><line x1="21" y1="7" x2="3" y2="10"/><line x1="21" y1="17" x2="3" y2="14"/></svg>
                            <span class="visually-hidden">Recta horizontal</span>
                        </button>
                    </div>
                    <div class="controles-hint" style="margin-bottom: 0.6rem;">
                        Registradas: <span id="contador-rectas-v">0</span> verticales | <span id="contador-rectas-h">0</span> horizontales
                    </div>

                    <!-- MÓDULO DE ESCALA INDEPENDIENTE (ANCHO Y ALTO) -->
                    <div class="controles-subbox">
                        <div class="controles-subbox-title">Dimensiones Reales (Objeto)</div>

                        <div class="controles-field-row">
                            <span>Ancho real (X):</span>
                            <div style="display: flex; gap: 0.3rem; align-items: center;">
                                <input type="number" id="input-ancho-real" value="5.0" step="0.1" class="controles-input-num" /> m
                                <button id="btn-ref-ancho" class="btn-text controles-btn-icon" title="Marcar segmento de ancho en imagen">📍</button>
                            </div>
                        </div>

                        <div class="controles-field-row">
                            <span>Alto real (Y):</span>
                            <div style="display: flex; gap: 0.3rem; align-items: center;">
                                <input type="number" id="input-alto-real" value="3.0" step="0.1" class="controles-input-num" /> m
                                <button id="btn-ref-alto" class="btn-text controles-btn-icon" title="Marcar segmento de alto en imagen">📍</button>
                            </div>
                        </div>
                        <button id="btn-confirmar-escala" class="btn-text btn-full">✓ Confirmar dimensiones reales</button>
                    </div>
                </div>

                <hr class="controles-divider">

                <!-- PASO COMPARTIDO 2: ÁREA DE RECTIFICACIÓN -->
                <div id="modulo-area" class="controles-step-disabled">
                    <h3 class="controles-heading">2. Área de Rectificación <button type="button" class="controles-help-btn" id="ayuda-area" title="Ayuda">?</button></h3>
                    <div class="controles-table-wrap">
                        <table class="controles-table">
                            <thead>
                                <tr>
                                    <th>Vértice</th>
                                    <th>Img X</th>
                                    <th>Img Y</th>
                                </tr>
                            </thead>
                            <tbody id="cuerpo-tabla-area" style="max-height: 90px;">
                                <tr><td colspan="3" class="controles-table-empty">Sin vértices</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="controles-btn-row">
                        <button id="btn-iniciar-area" class="btn-text" style="flex: 1;">Marcar Vértices</button>
                        <button id="btn-reset-area" class="btn-text" style="flex: 0.5;">Limpiar</button>
                    </div>
                </div>

                <hr class="controles-divider">

                <!-- PASO COMPARTIDO 3: GSD Y DETALLE MÉTRICO -->
                <div id="modulo-tamanio" class="controles-step-disabled">
                    <h3 class="controles-heading">3. Resolución y Detalle (GSD)</h3>
                    <div class="controles-radio-group">
                        <label><input type="radio" name="gsd-option" value="0.5"> Detalle fino (≈ 0.5 mm / px)</label>
                        <label><input type="radio" name="gsd-option" value="1.0" checked> Documentación general (≈ 1 mm / px)</label>
                        <label><input type="radio" name="gsd-option" value="2.0"> Fachadas grandes (≈ 2 mm / px)</label>
                        <label style="display: flex; align-items: center; gap: 0.4rem;">
                            <input type="radio" name="gsd-option" value="custom"> Personalizado:
                            <input type="number" id="input-gsd-custom" value="1.5" step="0.1" min="0.1" class="controles-input-num" /> mm/px
                        </label>
                    </div>
                    <div id="info-dimensiones-previas" class="controles-hint">
                        Dimensiones estimadas: define el área para calcular.
                    </div>
                    <button id="btn-calcular" class="btn-primary btn-full">Generar Fotoplano Métrico</button>
                </div>

            </div>
        </div>

        <!-- Medir/Dibujar: solo tiene sentido mirando el resultado rectificado.
             Se muestra al pasar a "Ver Fotoplano Rectificado". -->
        <div id="panel-resultado" class="panel-content" style="display: none;">
            <div id="modulo-medicion"></div>
        </div>
    `;

    if (opciones.contenedorControles) {
        contenedor.innerHTML = `${headerHtml}${imagenHtml}`;
        opciones.contenedorControles.innerHTML = controlesHtml;
    } else {
        contenedor.innerHTML = `
            ${headerHtml}
            <div class="workspace-layout" style="${opciones.sinHeader ? 'height: 100%;' : ''}">
                ${imagenHtml}
                <div class="sidebar-panel">${controlesHtml}</div>
            </div>
        `;
    }

    // Botón de descarga: vive en la columna izquierda (opciones.contenedorDescarga),
    // no flotando sobre la imagen — oculto hasta pasar a la pestaña "Fotoplano"
    // Y tener un resultado generado (ver mostrarResultado()/btnOriginal).
    if (opciones.contenedorDescarga) {
        opciones.contenedorDescarga.innerHTML = `
            <a id="btn-descargar" class="btn-text btn-full" style="display: none; text-decoration: none; margin-bottom: 0.5rem;" download="fotoplano-rectificado.png">⬇ Descargar Fotoplano</a>
        `;
    }

    document.getElementById('ayuda-puntos').addEventListener('click', () => {
        mostrarMensaje('Hacé clic en "Marcar Puntos" y usá la lupa superior para precisar el píxel. Cargá sus coordenadas reales.', 'info');
    });
    document.getElementById('ayuda-rectas').addEventListener('click', () => {
        mostrarMensaje('Marcá líneas de referencia y definí las dimensiones reales.', 'info');
    });
    document.getElementById('ayuda-area').addEventListener('click', () => {
        mostrarMensaje('Marcá los vértices consecutivos. Presioná Enter al terminar.', 'info');
    });

    const btnIniciarPuntos = document.getElementById('btn-iniciar-puntos');
    const btnResetPuntos = document.getElementById('btn-reset-puntos');
    const btnConfirmarPuntos = document.getElementById('btn-confirmar-puntos');
    const btnRectaVert = document.getElementById('btn-recta-vert');
    const btnRectaHoriz = document.getElementById('btn-recta-horiz');
    const btnRefAncho = document.getElementById('btn-ref-ancho');
    const btnRefAlto = document.getElementById('btn-ref-alto');
    const btnConfirmarEscala = document.getElementById('btn-confirmar-escala');
    const inputAnchoReal = document.getElementById('input-ancho-real');
    const inputAltoReal = document.getElementById('input-alto-real');
    const contadorRectasV = document.getElementById('contador-rectas-v');
    const contadorRectasH = document.getElementById('contador-rectas-h');
    let valoresPuntosConfirmados = false;
    let escalasConfirmadas = false;

    const btnIniciarArea = document.getElementById('btn-iniciar-area');
    const btnResetArea = document.getElementById('btn-reset-area');
    const btnCalcular = document.getElementById('btn-calcular');
    const cuerpoTablaPuntos = document.getElementById('cuerpo-tabla-puntos');
    const cuerpoTablaArea = document.getElementById('cuerpo-tabla-area');
    const moduloArea = document.getElementById('modulo-area');
    const moduloTamanio = document.getElementById('modulo-tamanio');
    const moduloMedicion = document.getElementById('modulo-medicion');
    const panelRectificacion = document.getElementById('panel-rectificacion');
    const panelResultado = document.getElementById('panel-resultado');
    const imgElement = document.getElementById('main-image');
    const svgOverlay = document.getElementById('overlay-svg');
    const capaCuadricula = document.getElementById('capa-cuadricula');
    const capaMedidas = document.getElementById('capa-medidas');
    const capaDibujo = document.getElementById('capa-dibujo');
    const canvasRectificado = document.getElementById('rectified-canvas');
    const viewModeBar = document.getElementById('view-mode-bar');
    const btnOriginal = document.getElementById('btn-view-original');
    const btnRectified = document.getElementById('btn-view-rectified');
    const btnDescargar = document.getElementById('btn-descargar');

    const infoDimensionesPrevias = document.getElementById('info-dimensiones-previas');
    const radioGsdOptions = document.querySelectorAll('input[name="gsd-option"]');
    const inputGsdCustom = document.getElementById('input-gsd-custom');

    // =====================================================================
    // ZOOM — reemplaza el visor de lupa aparte. Aplica tanto a la imagen
    // original como al fotoplano rectificado (cada uno con su propio nivel
    // de zoom recordado, ver zoomImagen/zoomRectificado más abajo).
    // Solo rueda del mouse: acerca/aleja centrado en el cursor. Sin arrastre
    // ni doble clic — un clic siempre marca un punto/vértice, nunca mueve
    // la vista (eso fue lo que se sacó de la primera versión).
    //
    // El zoom cambia el tamaño REAL del elemento visible (no transform:
    // scale), así que la fórmula de conversión clic→píxel que ya usan
    // puntos/rectas/área (naturalWidth/clientWidth) y las mediciones sobre
    // el resultado (canvas.width/getBoundingClientRect) siguen siendo
    // válidas sin tocarlas.
    //
    // La escala se mide en "px de pantalla por px real de la imagen": el
    // mínimo es el que encaja la imagen completa (igual que antes de tener
    // zoom); el máximo es 4 — cuatro px de pantalla por cada px real, la
    // misma profundidad de acercamiento que ofrecía la lupa "Zoom 4x".
    // =====================================================================
    const canvasContainerEl = document.getElementById('canvas-container');
    const imageWrapperEl = document.getElementById('image-wrapper');
    const ESCALA_MAX = 4;
    const zoomImagen = { ajustada: 0, actual: 0 };
    const zoomRectificado = { ajustada: 0, actual: 0 };

    // Devuelve el elemento actualmente visible (imagen original o canvas
    // rectificado) junto con su tamaño real y su estado de zoom propio.
    function elementoYZoomActivos() {
        if (canvasRectificado.style.display === 'block') {
            return { el: canvasRectificado, zoom: zoomRectificado, anchoNat: canvasRectificado.width, altoNat: canvasRectificado.height };
        }
        return { el: imgElement, zoom: zoomImagen, anchoNat: imgElement.naturalWidth, altoNat: imgElement.naturalHeight };
    }

    function medirEscalaAjustada(zoom, anchoNat, altoNat) {
        const contRect = canvasContainerEl.getBoundingClientRect();
        const maxW = Math.max(50, contRect.width - 24);
        const maxH = Math.max(50, contRect.height - 24);
        zoom.ajustada = Math.min(maxW / anchoNat, maxH / altoNat);
    }

    // Aplica una escala sin recentrar — se usa para redibujar en el mismo
    // nivel de zoom (ej. al volver de "Ver Fotoplano Rectificado").
    function fijarTamanioActivo() {
        const { el, zoom, anchoNat, altoNat } = elementoYZoomActivos();
        const w = anchoNat * zoom.actual;
        const h = altoNat * zoom.actual;
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        imageWrapperEl.style.width = w + 'px';
        imageWrapperEl.style.height = h + 'px';
    }

    // cursorClientX/Y: punto de la imagen bajo el cursor, en coordenadas de
    // viewport — queda fijo en pantalla al acercar/alejar (zoom "al cursor").
    // null → sin recentrado (carga inicial / vuelta a una vista).
    function aplicarEscala(nuevaEscala, cursorClientX, cursorClientY) {
        const { el, zoom, anchoNat, altoNat } = elementoYZoomActivos();
        zoom.actual = Math.min(ESCALA_MAX, Math.max(zoom.ajustada, nuevaEscala));

        if (cursorClientX == null) {
            fijarTamanioActivo();
            return;
        }

        const contRect = canvasContainerEl.getBoundingClientRect();
        const rectAntes = el.getBoundingClientRect();
        // Punto de la imagen (0..1 de su ancho/alto ANTES de este cambio)
        // que está bajo el cursor.
        const fx = rectAntes.width > 0 ? (cursorClientX - rectAntes.left) / rectAntes.width : 0.5;
        const fy = rectAntes.height > 0 ? (cursorClientY - rectAntes.top) / rectAntes.height : 0.5;

        fijarTamanioActivo();

        const w = anchoNat * zoom.actual;
        const h = altoNat * zoom.actual;
        canvasContainerEl.scrollLeft += fx * w - (cursorClientX - contRect.left) - canvasContainerEl.scrollLeft;
        canvasContainerEl.scrollTop += fy * h - (cursorClientY - contRect.top) - canvasContainerEl.scrollTop;

        // El overlay SVG de puntos/rectas/área solo existe sobre la imagen
        // original — el resultado rectificado se redibuja solo (raster fijo
        // + capas que ya escalan al 100% del wrapper por CSS).
        if (el === imgElement) redibujarSVG();
    }

    // Recalcula el "encaje" si cambia el tamaño de la ventana — trans_FORMA
    // es de escritorio, pero un resize de ventana es normal.
    window.addEventListener('resize', () => {
        const { zoom, anchoNat, altoNat } = elementoYZoomActivos();
        const estabaEnMinimo = zoom.actual <= zoom.ajustada + 0.0001;
        medirEscalaAjustada(zoom, anchoNat, altoNat);
        if (estabaEnMinimo) aplicarEscala(zoom.ajustada, null, null);
    });

    canvasContainerEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        const { zoom } = elementoYZoomActivos();
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        aplicarEscala(zoom.actual * factor, e.clientX, e.clientY);
    }, { passive: false });

    function iniciarTamanioImagen() {
        medirEscalaAjustada(zoomImagen, imgElement.naturalWidth, imgElement.naturalHeight);
        zoomImagen.actual = zoomImagen.ajustada;
        aplicarEscala(zoomImagen.ajustada, null, null);
    }
    imgElement.onload = iniciarTamanioImagen;
    // Si la imagen ya estaba en caché, "load" puede disparar antes de que
    // este handler quede asignado.
    if (imgElement.complete && imgElement.naturalWidth > 0) iniciarTamanioImagen();

    // Encaja el fotoplano rectificado la primera vez que se muestra (recién
    // generado, o uno ya guardado al reabrir una miniatura en Fotomosaico).
    function iniciarTamanioRectificado() {
        medirEscalaAjustada(zoomRectificado, canvasRectificado.width, canvasRectificado.height);
        zoomRectificado.actual = zoomRectificado.ajustada;
        aplicarEscala(zoomRectificado.ajustada, null, null);
    }

    // Analítico/Geométrico viven en el panel de controles, que desde
    // mostrarWorkspace es un contenedor aparte del de la imagen (columna
    // derecha vs. columna central) — hay que buscarlos ahí, no en
    // `contenedor` (que solo tiene la imagen en ese flujo).
    const contenedorTabs = opciones.contenedorControles || contenedor;
    const tabButtons = contenedorTabs.querySelectorAll('.tab-btn');
    const methodSections = contenedorTabs.querySelectorAll('.method-section');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            methodSections.forEach(s => s.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            metodoActivo = (targetId === 'analytic-section') ? 'analytic' : 'geometric';
            redibujarSVG();
            verificarEstadoInicial();
        });
    });

    btnIniciarPuntos.addEventListener('click', () => {
        capturandoPunto = true;
        capturandoRectaTipo = null;
        capturandoEscalaTipo = null;
        capturandoArea = false;
        mostrarMensaje("Modo puntos de control activo. Hacé clic en 4 puntos conocidos.", 'info');
    });

    btnRectaVert.addEventListener('click', () => {
        capturandoRectaTipo = 'vertical';
        puntoTemporalRecta = null;
        capturandoPunto = false;
        capturandoEscalaTipo = null;
        capturandoArea = false;
        mostrarMensaje("Modo Recta Vertical: abajo hacia arriba.", 'info');
    });

    btnRectaHoriz.addEventListener('click', () => {
        capturandoRectaTipo = 'horizontal';
        puntoTemporalRecta = null;
        capturandoPunto = false;
        capturandoEscalaTipo = null;
        capturandoArea = false;
        mostrarMensaje("Modo Recta Horizontal: izquierda a derecha.", 'info');
    });

    btnRefAncho.addEventListener('click', () => {
        capturandoEscalaTipo = 'X';
        puntoTemporalRecta = null;
        capturandoRectaTipo = null;
        capturandoPunto = false;
        mostrarMensaje("Hacé clic en los dos extremos del ancho real conocido.", 'info');
    });

    btnRefAlto.addEventListener('click', () => {
        capturandoEscalaTipo = 'Y';
        puntoTemporalRecta = null;
        capturandoRectaTipo = null;
        capturandoPunto = false;
        mostrarMensaje("Hacé clic en los dos extremos del alto real conocido.", 'info');
    });

    btnIniciarArea.addEventListener('click', () => {
        if (metodoActivo === 'analytic' && puntosControl.length < 4) {
            mostrarMensaje("Completá al menos 4 puntos de control primero.", 'advertencia');
            return;
        }
        if (metodoActivo === 'geometric' && (rectasVerticales.length < 2 || rectasHorizontales.length < 2)) {
            mostrarMensaje("Definí al menos 2 rectas verticales y 2 horizontales primero.", 'advertencia');
            return;
        }
        capturandoArea = true;
        capturandoPunto = false;
        capturandoRectaTipo = null;
        capturandoEscalaTipo = null;
        poligonoAreaImg = [];
        actualizarTablaArea();
        mostrarMensaje("Marcá los vértices del área y presioná Enter al terminar.", 'info');
    });

    imgElement.addEventListener('click', (e) => {
        const rect = imgElement.getBoundingClientRect();
        const xClick = e.clientX - rect.left;
        const yClick = e.clientY - rect.top;

        const scaleX = imgElement.naturalWidth / imgElement.clientWidth;
        const scaleY = imgElement.naturalHeight / imgElement.clientHeight;

        const xImg = Math.round(xClick * scaleX);
        const yImg = Math.round(yClick * scaleY);

        if (capturandoPunto) {
            puntosControl.push({ xImg, yImg, xObj: 0.0, yObj: 0.0, clientX: xClick, clientY: yClick });
            actualizarTablaPuntos();
        } else if (capturandoRectaTipo) {
            if (!puntoTemporalRecta) {
                puntoTemporalRecta = { xImg, yImg, clientX: xClick, clientY: yClick };
                mostrarMensaje("Primer punto registrado. Hacé clic en el segundo extremo.", 'info');
            } else {
                const nuevaRecta = { p1: puntoTemporalRecta, p2: { xImg, yImg, clientX: xClick, clientY: yClick } };
                if (capturandoRectaTipo === 'vertical') {
                    rectasVerticales.push(nuevaRecta);
                    contadorRectasV.textContent = rectasVerticales.length;
                } else {
                    rectasHorizontales.push(nuevaRecta);
                    contadorRectasH.textContent = rectasHorizontales.length;
                }
                puntoTemporalRecta = null;
                capturandoRectaTipo = null;
                redibujarSVG();
                verificarEstadoInicial();
            }
        } else if (capturandoEscalaTipo) {
            if (!puntoTemporalRecta) {
                puntoTemporalRecta = { xImg, yImg, clientX: xClick, clientY: yClick };
                mostrarMensaje("Primer extremo registrado. Hacé clic en el segundo extremo.", 'info');
            } else {
                const seg = { p1: puntoTemporalRecta, p2: { xImg, yImg, clientX: xClick, clientY: yClick } };
                if (capturandoEscalaTipo === 'X') {
                    escalaRefX = { ref: seg, distReal: parseFloat(inputAnchoReal.value) || 5.0 };
                    mostrarMensaje("Referencia de ancho (X) registrada.", 'exito');
                } else {
                    escalaRefY = { ref: seg, distReal: parseFloat(inputAltoReal.value) || 3.0 };
                    mostrarMensaje("Referencia de alto (Y) registrada.", 'exito');
                }
                puntoTemporalRecta = null;
                capturandoEscalaTipo = null;
                redibujarSVG();
            }
        } else if (capturandoArea) {
            poligonoAreaImg.push({ xImg, yImg, clientX: xClick, clientY: yClick });
            actualizarTablaArea();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && capturandoArea) {
            if (poligonoAreaImg.length < 3) {
                mostrarMensaje("Mínimo 3 vértices necesarios.", 'advertencia');
                return;
            }
            capturandoArea = false;
            actualizarTablaArea();
        }
    });

    function obtenerGSDValor() {
        let seleccion = contenedorTabs.querySelector('input[name="gsd-option"]:checked').value;
        if (seleccion === 'custom') return parseFloat(inputGsdCustom.value) || 1.0;
        return parseFloat(seleccion);
    }

    function actualizarCalculoPrevio() {
        if ((metodoActivo === 'analytic' && puntosControl.length < 4) || poligonoAreaImg.length < 3) {
            infoDimensionesPrevias.innerHTML = `<strong>Dimensiones estimadas:</strong> Define puntos/rectas y área para calcular.`;
            return;
        }
        try {
            let H;
            if (metodoActivo === 'analytic') {
                H = calcularHomografia(puntosControl);
            } else {
                if (rectasVerticales.length < 2 || rectasHorizontales.length < 2) return;
                escalaRefX.distReal = parseFloat(inputAnchoReal.value) || 5.0;
                escalaRefY.distReal = parseFloat(inputAltoReal.value) || 3.0;
                H = calcularHomografiaGeometrica(rectasVerticales, rectasHorizontales, escalaRefX, escalaRefY);
            }

            let verticesObjeto = [];
            poligonoAreaImg.forEach(pt => {
                const denom = H[2][0] * pt.xImg + H[2][1] * pt.yImg + H[2][2];
                const X = (H[0][0] * pt.xImg + H[0][1] * pt.yImg + H[0][2]) / denom;
                const Y = (H[1][0] * pt.xImg + H[1][1] * pt.yImg + H[1][2]) / denom;
                verticesObjeto.push({ X, Y });
            });

            let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
            verticesObjeto.forEach(v => {
                if (v.X < xMin) xMin = v.X;
                if (v.X > xMax) xMax = v.X;
                if (v.Y < yMin) yMin = v.Y;
                if (v.Y > yMax) yMax = v.Y;
            });

            const anchoReal = xMax - xMin;
            const altoReal = yMax - yMin;
            const gsdMm = obtenerGSDValor();
            const pxPorMetro = 1000 / gsdMm;

            const outWidth = Math.round(anchoReal * pxPorMetro);
            const outHeight = Math.round(altoReal * pxPorMetro);
            const megapixeles = ((outWidth * outHeight) / 1000000).toFixed(1);

            infoDimensionesPrevias.innerHTML = `<strong>Salida estimada:</strong> ${outWidth} x ${outHeight} px (${megapixeles} MP) a GSD ${gsdMm} mm/px.`;
        } catch (err) {
            infoDimensionesPrevias.innerHTML = `<strong>Dimensiones estimadas:</strong> Esperando datos consistentes...`;
        }
    }

    radioGsdOptions.forEach(r => r.addEventListener('change', actualizarCalculoPrevio));
    inputGsdCustom.addEventListener('input', actualizarCalculoPrevio);
    inputAnchoReal.addEventListener('input', actualizarCalculoPrevio);
    inputAltoReal.addEventListener('input', actualizarCalculoPrevio);
    inputAnchoReal.addEventListener('input', () => { escalasConfirmadas = false; verificarEstadoInicial(); });
    inputAltoReal.addEventListener('input', () => { escalasConfirmadas = false; verificarEstadoInicial(); });

    btnConfirmarPuntos.addEventListener('click', () => {
        valoresPuntosConfirmados = true;
        verificarEstadoInicial();
    });

    btnConfirmarEscala.addEventListener('click', () => {
        escalasConfirmadas = true;
        // Refleja en la cota el valor recién confirmado (si se cambió el
        // campo después de marcar la referencia, la etiqueta quedaba con
        // el valor viejo).
        if (escalaRefX.ref) escalaRefX.distReal = parseFloat(inputAnchoReal.value) || escalaRefX.distReal;
        if (escalaRefY.ref) escalaRefY.distReal = parseFloat(inputAltoReal.value) || escalaRefY.distReal;
        redibujarSVG();
        verificarEstadoInicial();
    });

    function actualizarTablaPuntos() {
        // Cualquier cambio en la lista de puntos invalida una confirmación
        // anterior — hay que revisar los valores reales de nuevo antes de
        // seguir (si no, "4 puntos marcados" se confundía con "listo").
        valoresPuntosConfirmados = false;

        cuerpoTablaPuntos.innerHTML = "";
        puntosControl.forEach((pt, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600;">P${index + 1}</td>
                <td>${pt.xImg}</td>
                <td>${pt.yImg}</td>
                <td><input type="number" step="any" value="${pt.xObj}" data-index="${index}" class="input-coord-x" /></td>
                <td><input type="number" step="any" value="${pt.yObj}" data-index="${index}" class="input-coord-y" /></td>
            `;
            cuerpoTablaPuntos.appendChild(tr);
        });

        contenedorTabs.querySelectorAll('.input-coord-x').forEach(input => {
            input.addEventListener('input', (e) => {
                puntosControl[parseInt(e.target.getAttribute('data-index'))].xObj = parseFloat(e.target.value) || 0;
                valoresPuntosConfirmados = false;
                verificarEstadoInicial();
                actualizarCalculoPrevio();
            });
        });
        contenedorTabs.querySelectorAll('.input-coord-y').forEach(input => {
            input.addEventListener('input', (e) => {
                puntosControl[parseInt(e.target.getAttribute('data-index'))].yObj = parseFloat(e.target.value) || 0;
                valoresPuntosConfirmados = false;
                verificarEstadoInicial();
                actualizarCalculoPrevio();
            });
        });

        redibujarSVG();
        verificarEstadoInicial();
        actualizarCalculoPrevio();
    }

    function verificarEstadoInicial() {
        btnConfirmarPuntos.disabled = puntosControl.length < 4;

        let listo = false;
        if (metodoActivo === 'analytic') {
            listo = (puntosControl.length >= 4 && valoresPuntosConfirmados);
        } else {
            listo = (rectasVerticales.length >= 2 && rectasHorizontales.length >= 2 && escalasConfirmadas);
        }

        if (listo) {
            moduloArea.style.opacity = "1";
            moduloArea.style.pointerEvents = "auto";
            mostrarMensaje('Parámetros base listos. Ya podés marcar el área.', 'exito');
        } else {
            if (metodoActivo === 'analytic' && puntosControl.length >= 4 && !valoresPuntosConfirmados) {
                mostrarMensaje('Revisá el valor real (X, Y) de cada punto en la tabla y presioná "Confirmar valores reales".', 'advertencia');
            } else if (metodoActivo === 'geometric' && rectasVerticales.length >= 2 && rectasHorizontales.length >= 2 && !escalasConfirmadas) {
                mostrarMensaje('Revisá el ancho y alto real cargados y presioná "Confirmar dimensiones reales".', 'advertencia');
            }
            moduloArea.style.opacity = "0.4";
            moduloArea.style.pointerEvents = "none";
            moduloTamanio.style.opacity = "0.4";
            moduloTamanio.style.pointerEvents = "none";
        }
    }

    function actualizarTablaArea() {
        cuerpoTablaArea.innerHTML = "";
        poligonoAreaImg.forEach((pt, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-weight: 600;">V${index + 1}</td><td>${pt.xImg}</td><td>${pt.yImg}</td>`;
            cuerpoTablaArea.appendChild(tr);
        });

        redibujarSVG();

        if (poligonoAreaImg.length >= 3) {
            moduloTamanio.style.opacity = "1";
            moduloTamanio.style.pointerEvents = "auto";
            mostrarMensaje(`Área definida (${poligonoAreaImg.length} vértices).`, 'exito');
            actualizarCalculoPrevio();
        }
    }

    const SVG_NS = "http://www.w3.org/2000/svg";
    const BLANCO = "#f2efe9";

    // Convierte coordenadas de imagen (estables, no cambian con el zoom) a
    // coordenadas de pantalla ACTUALES — se recalcula en cada redibujado en
    // vez de guardar clientX/clientY fijos, así puntos/rectas/área quedan
    // en su lugar real al acercar/alejar o mover la imagen.
    function imgAClient(xImg, yImg) {
        const scaleX = imgElement.clientWidth / imgElement.naturalWidth;
        const scaleY = imgElement.clientHeight / imgElement.naturalHeight;
        return { x: xImg * scaleX, y: yImg * scaleY };
    }

    // Extiende la recta que pasa por (x1,y1)-(x2,y2) (coordenadas de
    // imagen) hasta los bordes del rectángulo de la imagen, para dibujarla
    // como línea de construcción auxiliar completa.
    function extenderLineaAMargenes(x1, y1, x2, y2) {
        const W = imgElement.naturalWidth, H = imgElement.naturalHeight;
        const dx = x2 - x1, dy = y2 - y1;
        const candidatos = [];
        if (Math.abs(dx) > 1e-9) { candidatos.push((0 - x1) / dx); candidatos.push((W - x1) / dx); }
        if (Math.abs(dy) > 1e-9) { candidatos.push((0 - y1) / dy); candidatos.push((H - y1) / dy); }
        const validos = candidatos.filter(t => {
            const px = x1 + t * dx, py = y1 + t * dy;
            return px >= -0.5 && px <= W + 0.5 && py >= -0.5 && py <= H + 0.5;
        });
        if (validos.length < 2) return null;
        const tMin = Math.min(...validos), tMax = Math.max(...validos);
        return {
            x1: x1 + tMin * dx, y1: y1 + tMin * dy,
            x2: x1 + tMax * dx, y2: y1 + tMax * dy
        };
    }

    function dibujarCruz(xImg, yImg, etiqueta) {
        const p = imgAClient(xImg, yImg);
        const l = 7;
        [[p.x - l, p.y, p.x + l, p.y], [p.x, p.y - l, p.x, p.y + l]].forEach(([x1, y1, x2, y2]) => {
            const line = document.createElementNS(SVG_NS, "line");
            line.setAttribute("x1", x1); line.setAttribute("y1", y1);
            line.setAttribute("x2", x2); line.setAttribute("y2", y2);
            line.setAttribute("stroke", BLANCO); line.setAttribute("stroke-width", "1.5");
            svgOverlay.appendChild(line);
        });
        if (etiqueta) {
            const text = document.createElementNS(SVG_NS, "text");
            text.setAttribute("x", p.x + 9); text.setAttribute("y", p.y - 9);
            text.setAttribute("fill", BLANCO); text.setAttribute("font-size", "11px"); text.setAttribute("font-weight", "600");
            text.textContent = etiqueta;
            svgOverlay.appendChild(text);
        }
    }

    // Recta con su construcción auxiliar: el segmento marcado (grosor
    // normal) + la extensión fina hasta los bordes de la imagen, siempre
    // visible — ayuda a chequear a simple vista que las rectas realmente
    // sean paralelas/verticales entre sí antes de confirmar.
    function dibujarRectaConstruccion(r) {
        const extendida = extenderLineaAMargenes(r.p1.xImg, r.p1.yImg, r.p2.xImg, r.p2.yImg);
        if (extendida) {
            const pA = imgAClient(extendida.x1, extendida.y1);
            const pB = imgAClient(extendida.x2, extendida.y2);
            const aux = document.createElementNS(SVG_NS, "line");
            aux.setAttribute("x1", pA.x); aux.setAttribute("y1", pA.y);
            aux.setAttribute("x2", pB.x); aux.setAttribute("y2", pB.y);
            aux.setAttribute("stroke", BLANCO); aux.setAttribute("stroke-width", "0.75");
            aux.setAttribute("stroke-opacity", "0.6");
            svgOverlay.appendChild(aux);
        }
        const p1 = imgAClient(r.p1.xImg, r.p1.yImg);
        const p2 = imgAClient(r.p2.xImg, r.p2.yImg);
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
        line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);
        line.setAttribute("stroke", BLANCO); line.setAttribute("stroke-width", "2");
        svgOverlay.appendChild(line);
    }

    function redibujarSVG() {
        svgOverlay.innerHTML = "";

        if (metodoActivo === 'analytic') {
            puntosControl.forEach((pt, index) => dibujarCruz(pt.xImg, pt.yImg, `P${index + 1}`));
        } else {
            rectasVerticales.forEach(dibujarRectaConstruccion);
            rectasHorizontales.forEach(dibujarRectaConstruccion);

            dibujarCota(escalaRefX.ref, 'X', escalaRefX.distReal);
            dibujarCota(escalaRefY.ref, 'Y', escalaRefY.distReal);
        }

        if (poligonoAreaImg.length > 0) {
            let areaPointsStr = "";
            poligonoAreaImg.forEach(pt => {
                const p = imgAClient(pt.xImg, pt.yImg);
                areaPointsStr += `${p.x},${p.y} `;
            });
            if (poligonoAreaImg.length >= 3) {
                const polygon = document.createElementNS(SVG_NS, "polygon");
                polygon.setAttribute("points", areaPointsStr);
                polygon.setAttribute("fill", "rgba(242, 239, 233, 0.12)"); polygon.setAttribute("stroke", BLANCO); polygon.setAttribute("stroke-width", "2");
                svgOverlay.insertBefore(polygon, svgOverlay.firstChild);
            }
        }
    }

    // Cota de referencia (Ancho/Alto real en Geométrico): línea punteada +
    // etiqueta "X=valor"/"Y=valor" — mismo blanco que el resto de las
    // marcas, ya no un color propio por eje.
    function dibujarCota(ref, eje, distReal) {
        if (!ref || !ref.p1 || !ref.p2) return;
        const p1 = imgAClient(ref.p1.xImg, ref.p1.yImg);
        const p2 = imgAClient(ref.p2.xImg, ref.p2.yImg);
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
        line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);
        line.setAttribute("stroke", BLANCO); line.setAttribute("stroke-width", "2");
        line.setAttribute("stroke-dasharray", "4");
        svgOverlay.appendChild(line);

        const text = document.createElementNS(SVG_NS, "text");
        text.setAttribute("x", (p1.x + p2.x) / 2 + 8);
        text.setAttribute("y", (p1.y + p2.y) / 2 - 8);
        text.setAttribute("fill", BLANCO); text.setAttribute("font-size", "11px"); text.setAttribute("font-weight", "600");
        text.textContent = `${eje}=${Number(distReal).toFixed(2)}`;
        svgOverlay.appendChild(text);
    }

    btnResetPuntos.addEventListener('click', () => {
        puntosControl = []; rectasVerticales = []; rectasHorizontales = []; poligonoAreaImg = [];
        escalaRefX = { ref: null, distReal: 0 };
        escalaRefY = { ref: null, distReal: 0 };
        escalasConfirmadas = false;
        contadorRectasV.textContent = "0"; contadorRectasH.textContent = "0";
        actualizarTablaPuntos();
        actualizarTablaArea();
        imgElement.style.display = 'block';
        canvasRectificado.style.display = 'none';
        viewModeBar.style.display = 'none';
        svgOverlay.style.display = 'block';
        panelResultado.style.display = 'none';
        panelRectificacion.style.display = 'flex';
    });

    btnResetArea.addEventListener('click', () => {
        poligonoAreaImg = [];
        capturandoArea = false;
        actualizarTablaArea();
    });

    // --- CÁLCULO FINAL Y RECTIFICACIÓN MÉTRICA ---
    btnCalcular.addEventListener('click', () => {
        try {
            if (poligonoAreaImg.length < 3) throw new Error("Se requiere un área delimitada con al menos 3 vértices.");

            const gsdMm = obtenerGSDValor();
            const pxPorMetro = 1000 / gsdMm;
            let H;

            if (metodoActivo === 'analytic') {
                if (puntosControl.length < 4) throw new Error("Se requieren al menos 4 puntos de control.");
                H = calcularHomografia(puntosControl);
            } else {
                if (rectasVerticales.length < 2 || rectasHorizontales.length < 2) {
                    throw new Error("Se requieren al menos 2 rectas verticales y 2 horizontales.");
                }
                escalaRefX.distReal = parseFloat(inputAnchoReal.value) || 5.0;
                escalaRefY.distReal = parseFloat(inputAltoReal.value) || 3.0;

                H = calcularHomografiaGeometrica(rectasVerticales, rectasHorizontales, escalaRefX, escalaRefY);
            }

            let verticesObjeto = [];
            poligonoAreaImg.forEach(pt => {
                const denom = H[2][0] * pt.xImg + H[2][1] * pt.yImg + H[2][2];
                if (Math.abs(denom) < 1e-8) throw new Error("Un vértice interseca la línea del horizonte proyectiva.");
                const X = (H[0][0] * pt.xImg + H[0][1] * pt.yImg + H[0][2]) / denom;
                const Y = (H[1][0] * pt.xImg + H[1][1] * pt.yImg + H[1][2]) / denom;
                verticesObjeto.push({ X, Y });
            });

            let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
            verticesObjeto.forEach(v => {
                if (v.X < xMin) xMin = v.X;
                if (v.X > xMax) xMax = v.X;
                if (v.Y < yMin) yMin = v.Y;
                if (v.Y > yMax) yMax = v.Y;
            });

            const anchoReal = xMax - xMin;
            const altoReal = yMax - yMin;

            if (anchoReal <= 0 || altoReal <= 0) throw new Error("Las dimensiones del área proyectada no son válidas.");

            const outWidth = Math.round(anchoReal * pxPorMetro);
            const outHeight = Math.round(altoReal * pxPorMetro);

            if (!Number.isFinite(outWidth) || !Number.isFinite(outHeight) || outWidth < 1 || outHeight < 1) {
                throw new Error("El tamaño resultante es demasiado pequeño (0 px). Revisá las coordenadas reales que cargaste en la tabla o el GSD elegido.");
            }

            const offScreenCanvas = document.createElement('canvas');
            offScreenCanvas.width = imgElement.naturalWidth;
            offScreenCanvas.height = imgElement.naturalHeight;
            const offCtx = offScreenCanvas.getContext('2d');
            offCtx.drawImage(imgElement, 0, 0);
            const imgDataOriginal = offCtx.getImageData(0, 0, offScreenCanvas.width, offScreenCanvas.height);

            canvasRectificado.width = outWidth;
            canvasRectificado.height = outHeight;
            const outCtx = canvasRectificado.getContext('2d');
            const imgDataDestino = outCtx.createImageData(outWidth, outHeight);

            const HInv = invertirMatriz3x3(H);

            for (let yOut = 0; yOut < outHeight; yOut++) {
                for (let xOut = 0; xOut < outWidth; xOut++) {
                    const X = xMin + (xOut / pxPorMetro);
                    const Y = yMax - (yOut / pxPorMetro);

                    const denom = HInv[2][0] * X + HInv[2][1] * Y + HInv[2][2];
                    const xOriginal = (HInv[0][0] * X + HInv[0][1] * Y + HInv[0][2]) / denom;
                    const yOriginal = (HInv[1][0] * X + HInv[1][1] * Y + HInv[1][2]) / denom;

                    const srcX = Math.round(xOriginal);
                    const srcY = Math.round(yOriginal);

                    if (srcX >= 0 && srcX < offScreenCanvas.width && srcY >= 0 && srcY < offScreenCanvas.height) {
                        const indexSrc = (srcY * offScreenCanvas.width + srcX) * 4;
                        const indexDest = (yOut * outWidth + xOut) * 4;

                        imgDataDestino.data[indexDest]     = imgDataOriginal.data[indexSrc];
                        imgDataDestino.data[indexDest + 1] = imgDataOriginal.data[indexSrc + 1];
                        imgDataDestino.data[indexDest + 2] = imgDataOriginal.data[indexSrc + 2];
                        imgDataDestino.data[indexDest + 3] = 255;
                    }
                }
            }

            outCtx.putImageData(imgDataDestino, 0, 0);

            mostrarMensaje(`Fotoplano generado con éxito (${outWidth}x${outHeight} px, GSD: ${gsdMm} mm/px). Ya podés descargarlo.`, 'exito');

            const canvasClon = document.createElement('canvas');
            canvasClon.width = outWidth;
            canvasClon.height = outHeight;
            canvasClon.getContext('2d').drawImage(canvasRectificado, 0, 0);

            const resultado = { canvas: canvasClon, H, xMin, yMax, pxPorMetro, gsdMm, outWidth, outHeight, nombreArchivo: file.name };
            mostrarResultado(resultado);

            if (opciones.onCompletar) opciones.onCompletar(resultado);

        } catch (error) {
            mostrarMensaje("Error en la rectificación: " + error.message, 'error');
            console.error(error);
        }
    });

    // Muestra un resultado ya rectificado (recién generado, o uno guardado de
    // antes al volver a seleccionar una miniatura ya "lista" en Fotomosaico).
    function mostrarResultado(resultado) {
        canvasRectificado.width = resultado.outWidth;
        canvasRectificado.height = resultado.outHeight;
        canvasRectificado.getContext('2d').drawImage(resultado.canvas, 0, 0);

        const dataUrl = resultado.canvas.toDataURL('image/png');
        btnDescargar.href = dataUrl;
        btnDescargar.download = `fotoplano_rectificado_${resultado.gsdMm}mm.png`;

        imgElement.style.display = 'none';
        canvasRectificado.style.display = 'block';
        viewModeBar.style.display = 'flex';
        btnOriginal.classList.remove('active');
        btnRectified.classList.add('active');
        btnDescargar.style.display = 'block';
        svgOverlay.style.display = 'none';
        capaMedidas.width = resultado.outWidth;
        capaMedidas.height = resultado.outHeight;
        capaMedidas.style.display = 'block';
        capaDibujo.width = resultado.outWidth;
        capaDibujo.height = resultado.outHeight;
        capaDibujo.style.display = 'block';

        panelRectificacion.style.display = 'none';
        panelResultado.style.display = 'block';
        // #image-wrapper es compartido con la imagen original — encaja el
        // fotoplano a su propio zoom (ver zoomRectificado) en vez de heredar
        // el tamaño en el que había quedado la imagen original.
        iniciarTamanioRectificado();
        crearPanelMedicionYDibujo(resultado, canvasRectificado, capaMedidas, capaDibujo, capaCuadricula, moduloMedicion);
    }

    if (opciones.resultadoPrevio) {
        mostrarResultado(opciones.resultadoPrevio);
    }

    btnOriginal.addEventListener('click', () => {
        imgElement.style.display = 'block';
        canvasRectificado.style.display = 'none';
        btnOriginal.classList.add('active');
        btnRectified.classList.remove('active');
        btnDescargar.style.display = 'none';
        svgOverlay.style.display = 'block';
        capaCuadricula.style.display = 'none';
        capaMedidas.style.display = 'none';
        capaDibujo.style.display = 'none';
        panelResultado.style.display = 'none';
        panelRectificacion.style.display = 'flex';
        // Recupera el tamaño/zoom en el que había quedado la imagen
        // original (cada vista guarda el suyo — ver zoomImagen/zoomRectificado).
        fijarTamanioActivo();
    });

    btnRectified.addEventListener('click', () => {
        imgElement.style.display = 'none';
        canvasRectificado.style.display = 'block';
        btnOriginal.classList.remove('active');
        btnRectified.classList.add('active');
        btnDescargar.style.display = 'block';
        svgOverlay.style.display = 'none';
        const chkCuadricula = document.getElementById('chk-cuadricula');
        capaCuadricula.style.display = (chkCuadricula && chkCuadricula.checked) ? 'block' : 'none';
        capaMedidas.style.display = 'block';
        capaDibujo.style.display = 'block';
        panelRectificacion.style.display = 'none';
        panelResultado.style.display = 'block';
        // Recupera el zoom propio del fotoplano (ver zoomRectificado).
        fijarTamanioActivo();
    });
}

function invertirMatriz3x3(M) {
    const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
                M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
                M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

    if (Math.abs(det) < 1e-12) throw new Error("Matriz singular, no invertible.");

    const invDet = 1.0 / det;

    return [
        [
            (M[1][1] * M[2][2] - M[1][2] * M[2][1]) * invDet,
            (M[0][2] * M[2][1] - M[0][1] * M[2][2]) * invDet,
            (M[0][1] * M[1][2] - M[0][2] * M[1][1]) * invDet
        ],
        [
            (M[1][2] * M[2][0] - M[1][0] * M[2][2]) * invDet,
            (M[0][0] * M[2][2] - M[0][2] * M[2][0]) * invDet,
            (M[0][2] * M[1][0] - M[0][0] * M[1][2]) * invDet
        ],
        [
            (M[1][0] * M[2][1] - M[1][1] * M[2][0]) * invDet,
            (M[0][1] * M[2][0] - M[0][0] * M[2][1]) * invDet,
            (M[0][0] * M[1][1] - M[0][1] * M[1][0]) * invDet
        ]
    ];
}

// =====================================================================
// CUADRÍCULA MÉTRICA DE REFERENCIA (opcional, activable con un toggle)
// Reutilizable: se usa igual sobre el Fotoplano y sobre el Fotomosaico.
// =====================================================================
function calcularEspaciadoCuadricula(dimensionMenorReal) {
    const candidatos = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
    const divisionesObjetivo = 8;
    let mejor = candidatos[0];
    let mejorDiferencia = Infinity;
    candidatos.forEach(c => {
        const diferencia = Math.abs((dimensionMenorReal / c) - divisionesObjetivo);
        if (diferencia < mejorDiferencia) {
            mejorDiferencia = diferencia;
            mejor = c;
        }
    });
    return mejor;
}

// Margen reservado alrededor de la foto para la cuadrícula (en píxeles reales
// de la imagen) — se comparte con la descarga para que ambas coincidan.
const FRACCION_MARGEN_CUADRICULA = 0.09;
function calcularMargenCuadricula(imagenBase) {
    return Math.round(imagenBase.width * FRACCION_MARGEN_CUADRICULA);
}

// La cuadrícula se dibuja en un canvas más grande que la foto (con margen a
// los cuatro lados) y se posiciona con un offset negativo para que sobresalga
// visualmente — así las etiquetas quedan afuera de la imagen, no encima, y
// pueden usar un tamaño de letra legible sin ensuciar la foto. Líneas y
// texto siempre blancos y finos — antes eran gruesos y (sobre la foto)
// blanco/negro según el brillo de la imagen; ahora es un único criterio.
function dibujarCuadriculaMetrica(canvas, xMin, yMax, pxPorMetro, imagenBase, canvasVisible) {
    const margenPx = calcularMargenCuadricula(imagenBase);
    canvas.width = imagenBase.width + margenPx * 2;
    canvas.height = imagenBase.height + margenPx * 2;

    // Reubica el canvas (más grande que la foto) centrado sobre ella, usando
    // el tamaño ya renderizado en pantalla para que el margen se vea a la
    // misma escala visual que la imagen, sin importar su resolución real.
    if (canvasVisible && canvasVisible.clientWidth) {
        const escalaDisplay = canvasVisible.clientWidth / imagenBase.width;
        const margenDisplay = margenPx * escalaDisplay;
        canvas.style.left = `-${margenDisplay}px`;
        canvas.style.top = `-${margenDisplay}px`;
        canvas.style.width = `${canvasVisible.clientWidth + margenDisplay * 2}px`;
        canvas.style.height = `${canvasVisible.clientHeight + margenDisplay * 2}px`;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const anchoReal = imagenBase.width / pxPorMetro;
    const altoReal = imagenBase.height / pxPorMetro;
    const espaciadoMenor = calcularEspaciadoCuadricula(Math.min(anchoReal, altoReal));
    // Imagen chica (grilla fina, de a 0.1m o menos): a esa densidad el texto
    // de cada línea se superpone — se cotea en texto solo cada 0.5m, el
    // resto de las líneas (cada espaciadoMenor) quedan sin etiqueta.
    const ESPACIADO_MAYOR_FIJO = 0.5;
    const esGrillaFina = espaciadoMenor <= 0.1 + 1e-9;
    const espaciadoMayor = esGrillaFina ? ESPACIADO_MAYOR_FIJO : espaciadoMenor;
    const decimales = espaciadoMenor < 1 ? 1 : 0;

    function esLineaMayor(valor) {
        const masCercano = Math.round(valor / espaciadoMayor) * espaciadoMayor;
        return Math.abs(masCercano - valor) < espaciadoMenor / 2;
    }

    // Tamaño de letra pensado para verse igual de legible en pantalla sin
    // importar la resolución real de la foto (usa la escala de despliegue
    // medida; si todavía no está montada en el DOM, cae a una aproximación).
    const escalaTexto = (canvasVisible && canvasVisible.clientWidth)
        ? imagenBase.width / canvasVisible.clientWidth
        : Math.max(1, imagenBase.width / 1200);
    const fontSize = 11 * escalaTexto;
    const grosor = Math.max(0.75, fontSize * 0.05);
    const largoMarca = margenPx * 0.3;

    const colorLinea = 'rgba(242, 239, 233, 0.55)';
    // El margen no tiene fondo propio (se ve el fondo oscuro del workspace
    // por detrás) — ahí solo sobresalen la marca y el texto, en blanco pleno.
    const colorMargen = 'rgba(242, 239, 233, 0.9)';

    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';

    const xInicio = Math.ceil(xMin / espaciadoMenor) * espaciadoMenor;
    for (let x = xInicio; x <= xMin + anchoReal + 1e-9; x += espaciadoMenor) {
        const xPx = margenPx + (x - xMin) * pxPorMetro;

        ctx.strokeStyle = colorLinea;
        ctx.lineWidth = grosor;
        ctx.beginPath();
        ctx.moveTo(xPx, margenPx);
        ctx.lineTo(xPx, margenPx + imagenBase.height);
        ctx.stroke();

        if (!esLineaMayor(x)) continue;

        // La marca y la etiqueta van en el margen de ABAJO, no arriba: el
        // margen superior queda libre para no taparse con la barra "Ver
        // Original"/"Ver Fotoplano Rectificado" que está justo encima.
        const yBase = margenPx + imagenBase.height;
        ctx.strokeStyle = colorMargen;
        ctx.beginPath();
        ctx.moveTo(xPx, yBase);
        ctx.lineTo(xPx, yBase + largoMarca);
        ctx.stroke();

        ctx.fillStyle = colorMargen;
        ctx.textAlign = 'center';
        ctx.fillText(`${x.toFixed(decimales)}m`, xPx, yBase + largoMarca + fontSize * 0.7);
    }

    const yInicio = Math.floor(yMax / espaciadoMenor) * espaciadoMenor;
    for (let y = yInicio; y >= yMax - altoReal - 1e-9; y -= espaciadoMenor) {
        const yPx = margenPx + (yMax - y) * pxPorMetro;

        ctx.strokeStyle = colorLinea;
        ctx.lineWidth = grosor;
        ctx.beginPath();
        ctx.moveTo(margenPx, yPx);
        ctx.lineTo(margenPx + imagenBase.width, yPx);
        ctx.stroke();

        if (!esLineaMayor(y)) continue;

        ctx.strokeStyle = colorMargen;
        ctx.beginPath();
        ctx.moveTo(margenPx, yPx);
        ctx.lineTo(margenPx - largoMarca, yPx);
        ctx.stroke();

        ctx.fillStyle = colorMargen;
        ctx.textAlign = 'right';
        ctx.fillText(`${y.toFixed(decimales)}m`, margenPx - largoMarca - fontSize * 0.3, yPx);
    }
}

// =====================================================================
// WORKSPACE (Fotoplano y Fotomosaico comparten el mismo armazón: panel
// izquierdo de miniaturas, centro con la estación de rectificación activa,
// panel derecho con pestañas Crear/Proyecto). Fotoplano es, en los hechos,
// un Fotomosaico limitado a una sola imagen y sin fusión — de ahí que
// ambos modos usen la misma función con distinto `modo`.
//
// Reutiliza crearEstacionFotoplano tal cual para cada imagen individual,
// y encadena la fusión de a pares consecutivos con
// mostrarPantallaPuntosHomologos/componerFotomosaico (solo Fotomosaico).
//
// Pantalla de escritorio únicamente — ver app-shell.css: marcar puntos
// sobre una imagen no tiene un equivalente razonable en una pantalla de
// celular, así que en mobile se muestra un aviso en vez de achicar esto.
// =====================================================================
function mostrarWorkspace(modo) {
    mostrarPanelDialogo();
    let imagenesProyecto = [];
    let idImagenActiva = null;
    let idCounter = 0;
    let tabActiva = 'crear';

    function agregarImagen(file) {
        const id = idCounter++;
        imagenesProyecto.push({
            id, file, nombreArchivo: file.name,
            thumbnailUrl: URL.createObjectURL(file),
            estado: 'pendiente', resultado: null
        });
        return id;
    }

    renderWorkspace();

    function renderWorkspace() {
        // El botón "Cargar Imagen" del tab Crear solo sirve para la PRIMERA
        // imagen, en los dos modos: en Fotoplano no hay una segunda (no hay
        // fusión); en Fotomosaico, a partir de la segunda ya está el "+" de
        // la columna de miniaturas — tener las dos formas a la vez era el
        // botón duplicado que se pidió sacar.
        const puedeCargarImagen = imagenesProyecto.length === 0;

        inicioScreen.innerHTML = `
            <p class="workspace-mobile-notice">Fotoplano y Fotomosaico están pensados para pantallas de escritorio — abrí trans_FORMA desde una computadora para usarlos.</p>
            <div class="workspace-layout">
                <!-- Columna izquierda: general/carga — Crear o Proyecto arriba,
                     miniaturas + zoom debajo (mismo patrón que in_SITE:
                     izquierda = general, centro = visor, derecha = controles). -->
                <aside class="rail-izquierdo">
                    <div class="panel-crear-proyecto" id="panel-crear-proyecto">
                        <div class="method-tabs">
                            <button type="button" class="tab-btn ${tabActiva === 'crear' ? 'active' : ''}" data-tab="crear">Crear</button>
                            <button type="button" class="tab-btn ${tabActiva === 'proyecto' ? 'active' : ''}" data-tab="proyecto">Proyecto</button>
                        </div>
                        <div class="panel-content">
                            <div class="method-section ${tabActiva === 'crear' ? 'active' : ''}" id="tab-crear">
                                ${puedeCargarImagen ? `
                                    <button id="btn-cargar-imagen" class="btn-text btn-full">Cargar Imagen</button>
                                    <input type="file" id="file-input" accept="image/*" hidden>
                                ` : ''}
                            </div>
                            <div class="method-section ${tabActiva === 'proyecto' ? 'active' : ''}" id="tab-proyecto">
                                <button id="btn-cargar-archivo" class="btn-text btn-full" title="Próximamente (.mpl)">Cargar Archivo</button>
                            </div>
                        </div>
                    </div>
                    <!-- Descargar el fotoplano: vive acá (no flotando sobre la
                         imagen) y solo se muestra con la pestaña "Fotoplano"
                         activa — la llena crearEstacionFotoplano vía
                         opciones.contenedorDescarga. -->
                    <div id="area-descarga"></div>
                    <div class="miniaturas-rail" id="miniaturas-rail"></div>
                </aside>

                <!-- Columna central: solo la imagen/visor. -->
                <div id="area-imagen-activa" class="fotoplano-canvas-area"></div>

                <!-- Columna derecha: controles (Analítico/Geométrico → Área →
                     GSD, y Medir/Dibujar sobre el resultado) — la llena
                     crearEstacionFotoplano vía opciones.contenedorControles. -->
                <aside class="rail-derecho" id="area-controles"></aside>
            </div>

            <!-- "Cerrar Proyecto": entre "Volver al Inicio" (global, ver
                 raumlab-chrome.css) y el cuadro de diálogo — mismo criterio
                 posicional que in_SITE (enlace fijo, no botón con caja). -->
            ${imagenesProyecto.length > 0 ? `<button id="btn-cerrar-proyecto" class="btn-text workspace-cerrar-proyecto">Cerrar Proyecto</button>` : ''}
        `;

        // Sin botón (ni mensaje fijo en la columna) cuando ya no corresponde
        // cargar por acá: la explicación va al cuadro de diálogo, no perdida
        // en la columna — ahí es donde ya aparecen el resto de los avisos.
        if (!puedeCargarImagen && tabActiva === 'crear') {
            mostrarMensaje(
                modo === 'fotomosaico'
                    ? 'Para agregar otra imagen, usá el "+" debajo del desplegable de la izquierda.'
                    : 'Ya cargaste una imagen para este fotoplano. Usá "Cerrar Proyecto" para empezar de nuevo.',
                'info'
            );
        }

        inicioScreen.querySelectorAll('#panel-crear-proyecto .tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                tabActiva = btn.dataset.tab;
                renderWorkspace();
            });
        });

        document.getElementById('btn-cargar-archivo').addEventListener('click', () => {
            mostrarMensaje('Abrir proyecto (.mpl) todavía no está disponible — es una función planeada para más adelante.', 'info');
        });

        const btnCerrarProyecto = document.getElementById('btn-cerrar-proyecto');
        if (btnCerrarProyecto) btnCerrarProyecto.addEventListener('click', () => location.reload());

        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            document.getElementById('btn-cargar-imagen').addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    idImagenActiva = agregarImagen(file);
                    renderWorkspace();
                }
            });
        }

        renderMiniaturas();
        renderImagenActiva();
    }

    function renderMiniaturas() {
        const rail = document.getElementById('miniaturas-rail');
        const listas = imagenesProyecto.filter(i => i.estado === 'lista');
        // Fotoplano nunca muestra miniatura (una sola imagen — ya se ve en
        // el centro, repetirla en la izquierda no aporta). En Fotomosaico,
        // en vez de una fila de tarjetas, un desplegable con los nombres —
        // ahorra espacio y evita que el zoom quede superpuesto con algo.
        const mostrarSelector = modo === 'fotomosaico' && imagenesProyecto.length > 0;
        // El "+" de agregar solo tiene sentido en Fotomosaico y solo a
        // partir de la segunda imagen — la primera ya se carga con el
        // botón "Cargar Imagen" del tab Crear (evita el botón duplicado).
        const puedeAgregarMas = modo === 'fotomosaico' && imagenesProyecto.length > 0;

        const imgActiva = imagenesProyecto.find(i => i.id === idImagenActiva);

        rail.innerHTML = `
            ${mostrarSelector ? `
                <!-- HTML propio, no <select> nativo: el navegador no deja
                     tematizar el fondo/acento de la lista abierta (quedaba
                     con foco azul y fondo blanco opaco, ilegible). -->
                <div class="capa-selector" id="imagen-selector">
                    <button type="button" class="capa-selector-boton" id="imagen-selector-boton" aria-haspopup="listbox" aria-expanded="false">
                        <span id="imagen-selector-label">${imgActiva ? `${imgActiva.nombreArchivo} — ${imgActiva.estado === 'lista' ? 'Lista' : 'Pendiente'}` : 'Elegir imagen'}</span>
                    </button>
                    <ul class="capa-selector-lista" id="imagen-selector-lista" role="listbox" hidden>
                        ${imagenesProyecto.map(img => `
                            <li role="option">
                                <button type="button" class="capa-selector-opcion ${img.id === idImagenActiva ? 'activa' : ''}" data-id="${img.id}">
                                    ${img.nombreArchivo} — ${img.estado === 'lista' ? 'Lista' : 'Pendiente'}
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            ${puedeAgregarMas ? `
                <button id="btn-agregar-imagen" class="miniatura-add-btn" title="Agregar imagen">+</button>
                <input type="file" id="file-input-agregar" accept="image/*" hidden>
            ` : ''}
            ${modo === 'fotomosaico' && listas.length >= 2 ? `<button id="btn-fusionar" class="btn-text btn-full">Fusionar (${listas.length})</button>` : ''}
        `;

        const imagenSelector = document.getElementById('imagen-selector');
        if (imagenSelector) {
            const imagenSelectorBoton = document.getElementById('imagen-selector-boton');
            const imagenSelectorLista = document.getElementById('imagen-selector-lista');
            imagenSelectorBoton.addEventListener('click', () => {
                const abierta = !imagenSelectorLista.hidden;
                imagenSelectorLista.hidden = abierta;
                imagenSelectorBoton.setAttribute('aria-expanded', String(!abierta));
            });
            document.addEventListener('click', (e) => {
                if (!imagenSelector.contains(e.target)) {
                    imagenSelectorLista.hidden = true;
                    imagenSelectorBoton.setAttribute('aria-expanded', 'false');
                }
            });
            imagenSelectorLista.querySelectorAll('.capa-selector-opcion').forEach((btn) => {
                btn.addEventListener('click', () => {
                    idImagenActiva = parseInt(btn.dataset.id);
                    renderMiniaturas();
                    renderImagenActiva();
                });
            });
        }

        const fileInputAgregar = document.getElementById('file-input-agregar');
        if (fileInputAgregar) {
            document.getElementById('btn-agregar-imagen').addEventListener('click', () => fileInputAgregar.click());
            fileInputAgregar.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    idImagenActiva = agregarImagen(file);
                    renderWorkspace();
                }
            });
        }

        const btnFusionar = document.getElementById('btn-fusionar');
        if (btnFusionar) btnFusionar.addEventListener('click', () => fusionarSiguiente(listas[0].resultado, listas.slice(1)));
    }

    function renderImagenActiva() {
        const contenedor = document.getElementById('area-imagen-activa');
        const contenedorControles = document.getElementById('area-controles');
        const contenedorDescarga = document.getElementById('area-descarga');
        const img = imagenesProyecto.find(i => i.id === idImagenActiva);
        if (!img) {
            contenedor.innerHTML = `<div class="fotoplano-canvas-placeholder">Cargá una imagen para empezar.</div>`;
            contenedorControles.innerHTML = '';
            contenedorDescarga.innerHTML = '';
            return;
        }

        if (img.estado === 'lista') {
            crearEstacionFotoplano(img.file, contenedor, { sinHeader: true, contenedorControles, contenedorDescarga, resultadoPrevio: img.resultado });
        } else {
            crearEstacionFotoplano(img.file, contenedor, {
                sinHeader: true,
                contenedorControles,
                contenedorDescarga,
                onCompletar: (resultado) => {
                    img.resultado = resultado;
                    img.estado = 'lista';
                    renderMiniaturas();
                }
            });
        }
    }

    function fusionarSiguiente(resultadoAcumulado, restantes) {
        if (restantes.length === 0) {
            mostrarResultadoFotomosaico(resultadoAcumulado);
            return;
        }
        mostrarPantallaPuntosHomologos(resultadoAcumulado, restantes[0].resultado, (rectificadoCombinado) => {
            fusionarSiguiente(rectificadoCombinado, restantes.slice(1));
        });
    }
}

// =====================================================================
// ADAPTATIVO — modo simplificado pensado para mobile (a diferencia de
// Fotoplano/Fotomosaico, que están pensados para escritorio, ver
// app-shell.css): exactamente 4 vértices arrastrables en vez de una tabla
// de N puntos de control, tamaño de papel preseteado (A5/A4/A3/A2 +
// personalizado) en vez de coordenadas reales cargadas a mano, y
// resolución en 3 niveles (Baja/Media/Alta, en DPI) en vez de un GSD en
// mm/px. Reutiliza el mismo motor de homografía que Fotoplano
// (calcularHomografia de geometry.js) y el mismo loop de warpeo por
// muestreo inverso — con exactamente 4 correspondencias el ajuste por
// mínimos cuadrados da la solución exacta, es el mismo cálculo.
// Una sola imagen, sin miniaturas/fusión (eso es exclusivo de
// Fotomosaico) — por eso tiene su propio flujo en vez de sumarse a
// mostrarWorkspace(), que está armado alrededor de esa lógica de
// multi-imagen. Sin zoom (a diferencia de Fotoplano): la imagen se
// muestra completa, ajustada al ancho de la columna — los 4 vértices son
// arrastrables para ajustar precisión, no hace falta acercar con la
// rueda del mouse (que además no tiene equivalente táctil en celular).
// =====================================================================
function mostrarAdaptativo() {
    mostrarPanelDialogo();
    let archivoImagen = null;

    render();

    function render() {
        // "Cerrar Proyecto" como hermano de .workspace-layout, con la misma
        // clase que usa Fotoplano (.workspace-cerrar-proyecto, position:fixed
        // sobre la columna izquierda) — mismo criterio visual pedido como
        // referencia, no un botón suelto dentro del riel.
        inicioScreen.innerHTML = `
            <div class="workspace-layout adaptativo-layout">
                <aside class="rail-izquierdo">
                    <div class="panel-crear-proyecto">
                        <div class="panel-content">
                            ${!archivoImagen ? `
                                <button id="btn-cargar-adaptativo" class="btn-text btn-full">Cargar Imagen</button>
                                <input type="file" id="file-input-adaptativo" accept="image/*" hidden>
                            ` : ''}
                        </div>
                    </div>
                    <div id="area-descarga-adaptativo"></div>
                </aside>

                <div id="area-imagen-adaptativo" class="fotoplano-canvas-area"></div>

                <aside class="rail-derecho" id="area-controles-adaptativo"></aside>
            </div>
            ${archivoImagen ? `<button id="btn-cerrar-adaptativo" class="btn-text workspace-cerrar-proyecto">Cerrar Proyecto</button>` : ''}
        `;

        const fileInput = document.getElementById('file-input-adaptativo');
        if (fileInput) {
            document.getElementById('btn-cargar-adaptativo').addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    archivoImagen = file;
                    render();
                }
            });
        }
        const btnCerrar = document.getElementById('btn-cerrar-adaptativo');
        if (btnCerrar) btnCerrar.addEventListener('click', () => location.reload());

        const contenedorImagen = document.getElementById('area-imagen-adaptativo');
        const contenedorControles = document.getElementById('area-controles-adaptativo');
        const contenedorDescarga = document.getElementById('area-descarga-adaptativo');

        if (archivoImagen) {
            crearEstacionAdaptativo(archivoImagen, contenedorImagen, { contenedorControles, contenedorDescarga });
        } else {
            contenedorImagen.innerHTML = `<div class="fotoplano-canvas-placeholder">Cargá una imagen para empezar.</div>`;
            contenedorControles.innerHTML = '';
            contenedorDescarga.innerHTML = '';
        }
    }
}

// Formatos ISO en mm, en orientación vertical (ancho × alto) — el toggle
// Vertical/Horizontal de la UI intercambia w/h sobre estos valores base.
const FORMATOS_ADAPTATIVO = {
    a5: { label: 'A5', w: 148, h: 210 },
    a4: { label: 'A4', w: 210, h: 297 },
    a3: { label: 'A3', w: 297, h: 420 },
    a2: { label: 'A2', w: 420, h: 594 },
};

// Presets de resolución en DPI (no GSD numérico como Fotoplano — acá el
// tamaño real ya está fijado por el formato de papel, lo único variable
// es cuántos píxeles por pulgada le da la salida).
const RESOLUCIONES_ADAPTATIVO = {
    baja: { label: 'Baja', dpi: 100 },
    media: { label: 'Media', dpi: 200 },
    alta: { label: 'Alta', dpi: 300 },
};

function crearEstacionAdaptativo(file, contenedor, opciones) {
    const imageUrl = URL.createObjectURL(file);

    // vertices: siempre 4 puntos {xImg, yImg}, en sentido horario empezando
    // abajo a la izquierda (abajo-izq. → arriba-izq. → arriba-der. →
    // abajo-der.) — ese orden es el que después define la orientación de
    // la homografía, así que hay que ser consistente al armar
    // puntosVirtuales en btnGenerar. Arrancan en posiciones por defecto
    // (ver posicionesIniciales) apenas carga la imagen — no hace falta
    // "crear" un punto tocando la imagen (eso confundía en celular: sin
    // zoom, cualquier toque para simplemente mirar la foto generaba un
    // punto nuevo). Ahora la única acción es seleccionar un vértice
    // existente y arrastrarlo a su lugar — funciona igual con mouse que
    // con el dedo, así que se aplicó también en escritorio.
    let vertices = [];
    let tocado = [false, false, false, false];
    let arrastrando = null;
    let formatoSeleccionado = 'a4';
    let orientacion = 'vertical';
    let resolucionSeleccionada = 'media';

    const imagenHtml = `
        <div style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
            <div id="view-mode-bar-adaptativo" class="view-mode-tabs">
                <button id="btn-view-original-adaptativo" type="button" class="active" data-view="original">Imagen Original</button>
                <button id="btn-view-rectified-adaptativo" type="button" data-view="rectificado">Adaptativo</button>
            </div>
            <div class="canvas-area" id="canvas-container-adaptativo" style="cursor: crosshair;">
                <div id="image-wrapper-adaptativo" style="position: relative; margin: auto;">
                    <img id="main-image-adaptativo" src="${imageUrl}" style="max-width: 100%; max-height: 100%; height: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border-radius: 4px; display: block; touch-action: none;" />
                    <canvas id="rectified-canvas-adaptativo" style="display: none; max-width: 100%; height: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border-radius: 4px; background: black;"></canvas>
                    <svg id="overlay-svg-adaptativo" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></svg>
                </div>
            </div>
        </div>
    `;

    // Menús desplegables temáticos (.capa-selector, el mismo componente que
    // ya usa Fotomosaico para "Elegir imagen") en vez de <select> nativo —
    // el motivo original de esa decisión (el navegador no deja tematizar
    // el fondo/acento de la lista abierta de un <select>) aplica igual acá.
    const etiquetaFormato = (valor) => valor === 'personalizado'
        ? 'Personalizado'
        : `${FORMATOS_ADAPTATIVO[valor].label} (${FORMATOS_ADAPTATIVO[valor].w} × ${FORMATOS_ADAPTATIVO[valor].h} mm)`;
    const etiquetaResolucion = (valor) => `${RESOLUCIONES_ADAPTATIVO[valor].label} (${RESOLUCIONES_ADAPTATIVO[valor].dpi} dpi)`;

    const controlesHtml = `
        <div id="panel-adaptativo" class="controles-panel" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
            <div class="panel-content">

                <h3 class="controles-heading">1. Vértices del contorno</h3>
                <p class="controles-hint">Seleccioná cada vértice y llevalo a su lugar sobre la imagen.</p>
                <ul class="controles-checklist" id="checklist-vertices-adaptativo">
                    <li data-idx="0"><span class="check-icon"></span>Abajo Izq.</li>
                    <li data-idx="1"><span class="check-icon"></span>Arriba Izq.</li>
                    <li data-idx="2"><span class="check-icon"></span>Arriba Der.</li>
                    <li data-idx="3"><span class="check-icon"></span>Abajo Der.</li>
                </ul>
                <button id="btn-reset-vertices-adaptativo" class="btn-text btn-full">Reiniciar vértices</button>

                <hr class="controles-divider">

                <h3 class="controles-heading">2. Tamaño real</h3>
                <div class="capa-selector" id="formato-selector">
                    <button type="button" class="capa-selector-boton" id="formato-selector-boton" aria-haspopup="listbox" aria-expanded="false">
                        <span id="formato-selector-label">${etiquetaFormato(formatoSeleccionado)}</span>
                    </button>
                    <ul class="capa-selector-lista" id="formato-selector-lista" role="listbox" hidden>
                        ${Object.keys(FORMATOS_ADAPTATIVO).map((valor) => `
                            <li role="option"><button type="button" class="capa-selector-opcion ${valor === formatoSeleccionado ? 'activa' : ''}" data-formato="${valor}">${etiquetaFormato(valor)}</button></li>
                        `).join('')}
                        <li role="option"><button type="button" class="capa-selector-opcion" data-formato="personalizado">Personalizado</button></li>
                    </ul>
                </div>

                <div class="controles-toggle-row" id="grupo-orientacion-adaptativo">
                    <button type="button" class="controles-toggle-btn active" data-orientacion="vertical">Vertical</button>
                    <button type="button" class="controles-toggle-btn" data-orientacion="horizontal">Horizontal</button>
                </div>

                <!-- Siempre presentes (no aparecen/desaparecen): deshabilitadas
                     salvo que el formato elegido sea "Personalizado" — evita
                     el salto de layout de mostrar/ocultar. -->
                <div class="controles-field-row controles-field-row-compact">
                    <span>Ancho (X):</span>
                    <div class="controles-field-inline">
                        <input type="number" id="input-ancho-personalizado" value="210" step="1" min="1" class="controles-input-num" disabled /> mm
                    </div>
                </div>
                <div class="controles-field-row controles-field-row-compact">
                    <span>Alto (Y):</span>
                    <div class="controles-field-inline">
                        <input type="number" id="input-alto-personalizado" value="297" step="1" min="1" class="controles-input-num" disabled /> mm
                    </div>
                </div>

                <hr class="controles-divider">

                <h3 class="controles-heading">3. Resolución</h3>
                <div class="capa-selector" id="resolucion-selector">
                    <button type="button" class="capa-selector-boton" id="resolucion-selector-boton" aria-haspopup="listbox" aria-expanded="false">
                        <span id="resolucion-selector-label">${etiquetaResolucion(resolucionSeleccionada)}</span>
                    </button>
                    <ul class="capa-selector-lista" id="resolucion-selector-lista" role="listbox" hidden>
                        ${Object.keys(RESOLUCIONES_ADAPTATIVO).map((valor) => `
                            <li role="option"><button type="button" class="capa-selector-opcion ${valor === resolucionSeleccionada ? 'activa' : ''}" data-resolucion="${valor}">${etiquetaResolucion(valor)}</button></li>
                        `).join('')}
                    </ul>
                </div>

                <hr class="controles-divider">

                <button id="btn-generar-adaptativo" class="btn-primary btn-full" disabled>Generar Adaptativo</button>
            </div>
        </div>

        <div id="panel-resultado-adaptativo" class="panel-content" style="display: none;">
            <p class="controles-hint" id="info-resultado-adaptativo"></p>
        </div>
    `;

    if (opciones.contenedorControles) {
        contenedor.innerHTML = imagenHtml;
        opciones.contenedorControles.innerHTML = controlesHtml;
    } else {
        contenedor.innerHTML = `
            <div class="workspace-layout adaptativo-layout">
                ${imagenHtml}
                <div class="sidebar-panel">${controlesHtml}</div>
            </div>
        `;
    }

    if (opciones.contenedorDescarga) {
        opciones.contenedorDescarga.innerHTML = `
            <a id="btn-descargar-adaptativo" class="btn-text btn-full" style="display: none; text-decoration: none; margin-bottom: 0.5rem;" download="adaptativo-rectificado.png">⬇ Descargar Adaptativo</a>
        `;
    }

    const imgElement = document.getElementById('main-image-adaptativo');
    const canvasRectificado = document.getElementById('rectified-canvas-adaptativo');
    // Un <canvas> sin width/height explícitos arranca en 300×150 (default
    // del navegador, no 0) — sin esto, la guarda de btnViewRectified de
    // más abajo (canvasRectificado.width === 0) nunca se cumplía, y se
    // podía pasar a "Ver Adaptativo" antes de generar nada.
    canvasRectificado.width = 0;
    canvasRectificado.height = 0;
    const svgOverlay = document.getElementById('overlay-svg-adaptativo');
    const btnViewOriginal = document.getElementById('btn-view-original-adaptativo');
    const btnViewRectified = document.getElementById('btn-view-rectified-adaptativo');
    const btnDescargar = document.getElementById('btn-descargar-adaptativo');
    const checklistVertices = document.getElementById('checklist-vertices-adaptativo');
    const btnResetVertices = document.getElementById('btn-reset-vertices-adaptativo');
    const btnGenerar = document.getElementById('btn-generar-adaptativo');
    const grupoOrientacion = document.getElementById('grupo-orientacion-adaptativo');
    const inputAnchoPersonalizado = document.getElementById('input-ancho-personalizado');
    const inputAltoPersonalizado = document.getElementById('input-alto-personalizado');
    const panelAdaptativo = document.getElementById('panel-adaptativo');
    const panelResultado = document.getElementById('panel-resultado-adaptativo');
    const infoResultado = document.getElementById('info-resultado-adaptativo');

    const SVG_NS = "http://www.w3.org/2000/svg";
    const BLANCO = "#f2efe9";
    const ETIQUETAS_VERTICES = ['abajo-izq.', 'arriba-izq.', 'arriba-der.', 'abajo-der.'];

    function imgAClient(xImg, yImg) {
        const scaleX = imgElement.clientWidth / imgElement.naturalWidth;
        const scaleY = imgElement.clientHeight / imgElement.naturalHeight;
        return { x: xImg * scaleX, y: yImg * scaleY };
    }

    function dibujarCruz(xImg, yImg, etiqueta) {
        const p = imgAClient(xImg, yImg);
        const l = 9;
        [[p.x - l, p.y, p.x + l, p.y], [p.x, p.y - l, p.x, p.y + l]].forEach(([x1, y1, x2, y2]) => {
            const line = document.createElementNS(SVG_NS, "line");
            line.setAttribute("x1", x1); line.setAttribute("y1", y1);
            line.setAttribute("x2", x2); line.setAttribute("y2", y2);
            line.setAttribute("stroke", BLANCO); line.setAttribute("stroke-width", "2.5");
            line.setAttribute("stroke-linecap", "round");
            svgOverlay.appendChild(line);
        });
        if (etiqueta) {
            const text = document.createElementNS(SVG_NS, "text");
            text.setAttribute("x", p.x + 12); text.setAttribute("y", p.y - 12);
            text.setAttribute("fill", BLANCO); text.setAttribute("font-size", "11px"); text.setAttribute("font-weight", "600");
            text.textContent = etiqueta;
            svgOverlay.appendChild(text);
        }
    }

    function redibujarSVG() {
        svgOverlay.innerHTML = "";
        if (vertices.length >= 3) {
            const pointsStr = vertices.map(v => {
                const p = imgAClient(v.xImg, v.yImg);
                return `${p.x},${p.y}`;
            }).join(' ');
            const polygon = document.createElementNS(SVG_NS, "polygon");
            polygon.setAttribute("points", pointsStr);
            polygon.setAttribute("fill", "rgba(242, 239, 233, 0.12)");
            polygon.setAttribute("stroke", BLANCO);
            polygon.setAttribute("stroke-width", "2");
            svgOverlay.appendChild(polygon);
        }
        vertices.forEach((v, i) => dibujarCruz(v.xImg, v.yImg, ETIQUETAS_VERTICES[i]));
    }

    function actualizarChecklist() {
        checklistVertices.querySelectorAll('li').forEach((li) => {
            const i = parseInt(li.dataset.idx, 10);
            li.classList.toggle('checked', tocado[i]);
        });
    }

    // Rectángulo inscripto con un margen del 18% por lado — punto de
    // partida razonable para arrastrar desde ahí, no una posición al azar.
    function posicionesIniciales() {
        const w = imgElement.naturalWidth, h = imgElement.naturalHeight;
        const mx = Math.round(w * 0.18), my = Math.round(h * 0.18);
        return [
            { xImg: mx, yImg: h - my },     // abajo-izq.
            { xImg: mx, yImg: my },         // arriba-izq.
            { xImg: w - mx, yImg: my },     // arriba-der.
            { xImg: w - mx, yImg: h - my }, // abajo-der.
        ];
    }

    // La imagen recién tiene naturalWidth/Height una vez cargada — acá se
    // arman las posiciones iniciales de los 4 vértices y se habilita
    // "Generar" (arranca disabled en el HTML: sin esto se podía generar
    // antes de que la imagen terminara de cargar, con naturalWidth/Height
    // todavía en 0).
    function alCargarImagen() {
        vertices = posicionesIniciales();
        redibujarSVG();
        btnGenerar.disabled = false;
    }
    imgElement.addEventListener('load', alCargarImagen);
    // Si la imagen ya estaba en caché, "load" puede disparar antes de que
    // este handler quede asignado — mismo criterio que crearEstacionFotoplano.
    if (imgElement.complete && imgElement.naturalWidth > 0) alCargarImagen();

    window.addEventListener('resize', redibujarSVG);

    // Arrastre — Pointer Events (no mouse/touch por separado): un mismo
    // código atiende mouse en escritorio y dedo en celular. Es la ÚNICA
    // interacción: los 4 vértices ya existen desde que carga la imagen
    // (ver posicionesIniciales), tocar la imagen nunca crea un punto nuevo
    // — antes, sin zoom, cualquier toque para simplemente mirar la foto en
    // celular generaba un punto sin querer. RADIO_ARRASTRE es el radio de
    // detección en píxeles de PANTALLA (no de imagen) — bastante generoso
    // porque tiene que funcionar con el dedo, no solo con un cursor fino.
    const RADIO_ARRASTRE = 26;

    function posicionDesdeEvento(e) {
        const rect = imgElement.getBoundingClientRect();
        const xClient = e.clientX - rect.left;
        const yClient = e.clientY - rect.top;
        const scaleX = imgElement.naturalWidth / imgElement.clientWidth;
        const scaleY = imgElement.naturalHeight / imgElement.clientHeight;
        return {
            xImg: Math.round(xClient * scaleX),
            yImg: Math.round(yClient * scaleY),
            xClient, yClient
        };
    }

    function indiceVerticeCercano(xClient, yClient) {
        let mejor = -1, mejorDist = RADIO_ARRASTRE;
        vertices.forEach((v, i) => {
            const p = imgAClient(v.xImg, v.yImg);
            const d = Math.hypot(p.x - xClient, p.y - yClient);
            if (d < mejorDist) { mejorDist = d; mejor = i; }
        });
        return mejor;
    }

    imgElement.addEventListener('pointerdown', (e) => {
        if (canvasRectificado.style.display === 'block') return;
        const pos = posicionDesdeEvento(e);
        const idx = indiceVerticeCercano(pos.xClient, pos.yClient);
        if (idx >= 0) {
            arrastrando = idx;
            tocado[idx] = true;
            actualizarChecklist();
            imgElement.setPointerCapture(e.pointerId);
        }
    });

    imgElement.addEventListener('pointermove', (e) => {
        if (arrastrando === null) return;
        const pos = posicionDesdeEvento(e);
        vertices[arrastrando] = { xImg: pos.xImg, yImg: pos.yImg };
        redibujarSVG();
    });

    imgElement.addEventListener('pointerup', () => { arrastrando = null; });
    imgElement.addEventListener('pointercancel', () => { arrastrando = null; });

    btnResetVertices.addEventListener('click', () => {
        if (!imgElement.naturalWidth) return;
        vertices = posicionesIniciales();
        tocado = [false, false, false, false];
        actualizarChecklist();
        redibujarSVG();
    });

    // Menús desplegables temáticos (mismo patrón que el selector "Elegir
    // imagen" de Fotomosaico: botón + lista que se muestra/oculta a mano,
    // en vez de <select> nativo — ver nota donde se arma controlesHtml).
    function wireSelector(idSelector, idBoton, idLista, idLabel, datasetKey, onSeleccion) {
        const selector = document.getElementById(idSelector);
        const boton = document.getElementById(idBoton);
        const lista = document.getElementById(idLista);
        const label = document.getElementById(idLabel);
        boton.addEventListener('click', () => {
            const abierta = !lista.hidden;
            lista.hidden = abierta;
            boton.setAttribute('aria-expanded', String(!abierta));
        });
        document.addEventListener('click', (e) => {
            if (!selector.contains(e.target)) {
                lista.hidden = true;
                boton.setAttribute('aria-expanded', 'false');
            }
        });
        lista.querySelectorAll('.capa-selector-opcion').forEach((opt) => {
            opt.addEventListener('click', () => {
                lista.querySelectorAll('.capa-selector-opcion').forEach((o) => o.classList.remove('activa'));
                opt.classList.add('activa');
                label.textContent = opt.textContent.trim();
                lista.hidden = true;
                boton.setAttribute('aria-expanded', 'false');
                onSeleccion(opt.dataset[datasetKey]);
            });
        });
    }

    // Campos siempre visibles (ver controlesHtml): deshabilitados salvo que
    // el formato elegido sea "Personalizado" — evita el salto de layout de
    // mostrar/ocultar el bloque entero.
    function actualizarDisponibilidadFormato() {
        const esPersonalizado = formatoSeleccionado === 'personalizado';
        inputAnchoPersonalizado.disabled = !esPersonalizado;
        inputAltoPersonalizado.disabled = !esPersonalizado;
        grupoOrientacion.querySelectorAll('.controles-toggle-btn').forEach((b) => { b.disabled = esPersonalizado; });
        grupoOrientacion.classList.toggle('disabled', esPersonalizado);
    }

    wireSelector('formato-selector', 'formato-selector-boton', 'formato-selector-lista', 'formato-selector-label', 'formato', (valor) => {
        formatoSeleccionado = valor;
        actualizarDisponibilidadFormato();
    });

    wireSelector('resolucion-selector', 'resolucion-selector-boton', 'resolucion-selector-lista', 'resolucion-selector-label', 'resolucion', (valor) => {
        resolucionSeleccionada = valor;
    });

    actualizarDisponibilidadFormato();

    grupoOrientacion.querySelectorAll('.controles-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            orientacion = btn.dataset.orientacion;
            grupoOrientacion.querySelectorAll('.controles-toggle-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    function obtenerTamanioReal() {
        if (formatoSeleccionado === 'personalizado') {
            const w = parseFloat(inputAnchoPersonalizado.value) || 210;
            const h = parseFloat(inputAltoPersonalizado.value) || 297;
            return { w, h };
        }
        const f = FORMATOS_ADAPTATIVO[formatoSeleccionado];
        return orientacion === 'horizontal' ? { w: f.h, h: f.w } : { w: f.w, h: f.h };
    }

    btnViewOriginal.addEventListener('click', () => {
        imgElement.style.display = 'block';
        canvasRectificado.style.display = 'none';
        btnViewOriginal.classList.add('active');
        btnViewRectified.classList.remove('active');
        btnDescargar.style.display = 'none';
        svgOverlay.style.display = 'block';
        panelResultado.style.display = 'none';
        panelAdaptativo.style.display = 'flex';
    });

    btnViewRectified.addEventListener('click', () => {
        if (canvasRectificado.width === 0) return;
        imgElement.style.display = 'none';
        canvasRectificado.style.display = 'block';
        btnViewOriginal.classList.remove('active');
        btnViewRectified.classList.add('active');
        btnDescargar.style.display = 'block';
        svgOverlay.style.display = 'none';
        panelAdaptativo.style.display = 'none';
        panelResultado.style.display = 'block';
    });

    btnGenerar.addEventListener('click', () => {
        try {
            const { w: wMm, h: hMm } = obtenerTamanioReal();
            if (!(wMm > 0) || !(hMm > 0)) throw new Error("El tamaño elegido no es válido.");

            // xObj/yObj en metros — mismas unidades que usa calcularHomografia
            // en Fotoplano (pxPorMetro), así se reutiliza tal cual ese motor
            // sin tocar geometry.js. Orden de vertices[]: abajo-izq.,
            // arriba-izq., arriba-der., abajo-der. (sentido horario) — yObj
            // crece hacia arriba, igual que en el método Geométrico.
            const wM = wMm / 1000, hM = hMm / 1000;
            const puntosVirtuales = [
                { xImg: vertices[0].xImg, yImg: vertices[0].yImg, xObj: 0,  yObj: 0 },
                { xImg: vertices[1].xImg, yImg: vertices[1].yImg, xObj: 0,  yObj: hM },
                { xImg: vertices[2].xImg, yImg: vertices[2].yImg, xObj: wM, yObj: hM },
                { xImg: vertices[3].xImg, yImg: vertices[3].yImg, xObj: wM, yObj: 0 },
            ];

            const H = calcularHomografia(puntosVirtuales);

            const dpi = RESOLUCIONES_ADAPTATIVO[resolucionSeleccionada].dpi;
            const pxPorMetro = dpi / 25.4 * 1000;

            const outWidth = Math.max(1, Math.round(wM * pxPorMetro));
            const outHeight = Math.max(1, Math.round(hM * pxPorMetro));

            // Resguardo: un tipeo en Personalizado (ej. cm en vez de mm)
            // podría pedir un canvas de decenas de miles de píxeles por
            // lado, algo que el navegador no puede generar de forma
            // confiable. A2 a 300dpi (la combinación más grande de los
            // presets) ronda 5000×7000 — el límite deja margen sobre eso.
            const LIMITE_PX = 6000;
            if (outWidth > LIMITE_PX || outHeight > LIMITE_PX) {
                throw new Error(`El tamaño resultante (${outWidth}×${outHeight}px) es demasiado grande. Probá con una resolución menor o revisá el tamaño personalizado.`);
            }

            const offScreenCanvas = document.createElement('canvas');
            offScreenCanvas.width = imgElement.naturalWidth;
            offScreenCanvas.height = imgElement.naturalHeight;
            const offCtx = offScreenCanvas.getContext('2d');
            offCtx.drawImage(imgElement, 0, 0);
            const imgDataOriginal = offCtx.getImageData(0, 0, offScreenCanvas.width, offScreenCanvas.height);

            canvasRectificado.width = outWidth;
            canvasRectificado.height = outHeight;
            const outCtx = canvasRectificado.getContext('2d');
            const imgDataDestino = outCtx.createImageData(outWidth, outHeight);

            const HInv = invertirMatriz3x3(H);

            for (let yOut = 0; yOut < outHeight; yOut++) {
                for (let xOut = 0; xOut < outWidth; xOut++) {
                    const X = xOut / pxPorMetro;
                    const Y = hM - (yOut / pxPorMetro);

                    const denom = HInv[2][0] * X + HInv[2][1] * Y + HInv[2][2];
                    const xOriginal = (HInv[0][0] * X + HInv[0][1] * Y + HInv[0][2]) / denom;
                    const yOriginal = (HInv[1][0] * X + HInv[1][1] * Y + HInv[1][2]) / denom;

                    const srcX = Math.round(xOriginal);
                    const srcY = Math.round(yOriginal);

                    if (srcX >= 0 && srcX < offScreenCanvas.width && srcY >= 0 && srcY < offScreenCanvas.height) {
                        const indexSrc = (srcY * offScreenCanvas.width + srcX) * 4;
                        const indexDest = (yOut * outWidth + xOut) * 4;
                        imgDataDestino.data[indexDest] = imgDataOriginal.data[indexSrc];
                        imgDataDestino.data[indexDest + 1] = imgDataOriginal.data[indexSrc + 1];
                        imgDataDestino.data[indexDest + 2] = imgDataOriginal.data[indexSrc + 2];
                        imgDataDestino.data[indexDest + 3] = 255;
                    }
                }
            }

            outCtx.putImageData(imgDataDestino, 0, 0);

            const dataUrl = canvasRectificado.toDataURL('image/png');
            btnDescargar.href = dataUrl;
            btnDescargar.download = `adaptativo_${Math.round(wMm)}x${Math.round(hMm)}mm_${dpi}dpi.png`;

            infoResultado.textContent = `${outWidth} × ${outHeight} px — ${Math.round(wMm)} × ${Math.round(hMm)} mm a ${dpi} dpi.`;
            mostrarMensaje(`Adaptativo generado con éxito (${outWidth}×${outHeight}px). Ya podés descargarlo.`, 'exito');
            btnViewRectified.click();

        } catch (error) {
            mostrarMensaje("Error en la rectificación: " + error.message, 'error');
            console.error(error);
        }
    });
}

function mostrarPantallaPuntosHomologos(resultadoA, resultadoB, onFusionado) {
    const alTerminar = onFusionado || mostrarResultadoFotomosaico;
    // Pares ya confirmados (con el botón "Cargar Punto"). pendienteA/B son
    // el punto que se está marcando ahora, todavía sin confirmar — antes
    // se confirmaba solo con el 2do clic, sin poder revisar ni volver a
    // marcar, y no había ningún botón "Cargar Punto" visible.
    let paresHomologos = [];
    let pendienteA = null;
    let pendienteB = null;

    inicioScreen.innerHTML = `
        <div class="workspace-layout">
            <aside class="rail-izquierdo">
                <div class="panel-crear-proyecto">
                    <div class="panel-content">
                        <h3 class="controles-heading">Imágenes</h3>
                        <div class="capa-selector-boton" style="cursor: default;">Imagen A — ${resultadoA.nombreArchivo || 'sin nombre'}</div>
                        <div class="capa-selector-boton" style="cursor: default;">Imagen B — ${resultadoB.nombreArchivo || 'sin nombre'}</div>
                    </div>
                </div>
            </aside>

            <div class="homologos-centro">
                <div class="canvas-homologo-mitad">
                    <div class="canvas-homologo-wrapper">
                        <canvas id="canvas-homologo-a"></canvas>
                        <svg id="overlay-homologo-a"></svg>
                    </div>
                </div>
                <div class="canvas-homologo-mitad">
                    <div class="canvas-homologo-wrapper">
                        <canvas id="canvas-homologo-b"></canvas>
                        <svg id="overlay-homologo-b"></svg>
                    </div>
                </div>
            </div>

            <aside class="rail-derecho">
                <div class="panel-content">
                    <h3 class="controles-heading">Puntos Homólogos <button type="button" class="controles-help-btn" id="ayuda-homologos" title="Ayuda">?</button></h3>
                    <p class="controles-hint" id="estado-homologos">Marcá el mismo punto real en Imagen A y en Imagen B.</p>
                    <button id="btn-cargar-punto" class="btn-text btn-full" disabled>Cargar Punto H1</button>
                    <div class="controles-table-wrap">
                        <table class="controles-table">
                            <thead><tr><th>#</th><th>A (X;Y)</th><th>B (X;Y)</th><th></th></tr></thead>
                            <tbody id="cuerpo-tabla-homologos" style="max-height: 130px;"><tr><td colspan="4" class="controles-table-empty">Sin puntos</td></tr></tbody>
                        </table>
                    </div>

                    <hr class="controles-divider">

                    <div class="controles-field-row">
                        <span>Tolerancia (mm)</span>
                        <input type="number" id="input-tolerancia-mm" value="5" min="0.1" step="0.1" class="controles-input-num" />
                    </div>
                    <button id="btn-reset-homologos" class="btn-text btn-full">Reiniciar Fusión</button>
                    <button id="btn-calcular-fusion" class="btn-primary btn-full" disabled>Calcular Fusión</button>
                </div>
            </aside>
        </div>
        <button id="btn-cerrar-proyecto" class="btn-text workspace-cerrar-proyecto">Cerrar Proyecto</button>
    `;

    document.getElementById('ayuda-homologos').addEventListener('click', () => {
        mostrarMensaje('Marcá el mismo punto real primero en Imagen A y después en Imagen B (podés volver a marcar cualquiera de las dos antes de confirmar) y presioná "Cargar Punto". Repetí al menos 3 veces.', 'info');
    });
    document.getElementById('btn-cerrar-proyecto').addEventListener('click', () => location.reload());

    const canvasA = document.getElementById('canvas-homologo-a');
    const canvasB = document.getElementById('canvas-homologo-b');
    const overlayA = document.getElementById('overlay-homologo-a');
    const overlayB = document.getElementById('overlay-homologo-b');
    const estadoHomologos = document.getElementById('estado-homologos');
    const btnCargarPunto = document.getElementById('btn-cargar-punto');
    const cuerpoTablaHomologos = document.getElementById('cuerpo-tabla-homologos');
    const btnCalcularFusion = document.getElementById('btn-calcular-fusion');
    const btnResetHomologos = document.getElementById('btn-reset-homologos');
    const inputToleranciaMm = document.getElementById('input-tolerancia-mm');

    canvasA.width = resultadoA.canvas.width;
    canvasA.height = resultadoA.canvas.height;
    canvasA.getContext('2d').drawImage(resultadoA.canvas, 0, 0);

    canvasB.width = resultadoB.canvas.width;
    canvasB.height = resultadoB.canvas.height;
    canvasB.getContext('2d').drawImage(resultadoB.canvas, 0, 0);

    function coordsCanvas(e, canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const scaleX = canvasEl.width / rect.width;
        const scaleY = canvasEl.height / rect.height;
        return {
            xPx: Math.round((e.clientX - rect.left) * scaleX),
            yPx: Math.round((e.clientY - rect.top) * scaleY)
        };
    }

    function realAPixelCanvas(resultado, xReal, yReal) {
        return {
            x: (xReal - resultado.xMin) * resultado.pxPorMetro,
            y: (resultado.yMax - yReal) * resultado.pxPorMetro
        };
    }

    // Cruz blanca — mismo tipo de marca que el resto del módulo (puntos de
    // control, Consultar medidas). El número (H1, H2...) va sin recuadro.
    function dibujarCruzHomologa(overlay, canvasEl, xPx, yPx, etiqueta) {
        const escala = canvasEl.getBoundingClientRect().width / canvasEl.width || 1;
        const x = xPx * escala, y = yPx * escala;
        const l = 7;
        const SVG_NS = "http://www.w3.org/2000/svg";
        [[x - l, y, x + l, y], [x, y - l, x, y + l]].forEach(([x1, y1, x2, y2]) => {
            const line = document.createElementNS(SVG_NS, "line");
            line.setAttribute("x1", x1); line.setAttribute("y1", y1);
            line.setAttribute("x2", x2); line.setAttribute("y2", y2);
            line.setAttribute("stroke", "#f2efe9"); line.setAttribute("stroke-width", "1.5");
            overlay.appendChild(line);
        });
        if (etiqueta) {
            const text = document.createElementNS(SVG_NS, "text");
            text.setAttribute("x", x + 9); text.setAttribute("y", y - 9);
            text.setAttribute("fill", "#f2efe9"); text.setAttribute("font-size", "11px"); text.setAttribute("font-weight", "600");
            text.textContent = etiqueta;
            overlay.appendChild(text);
        }
    }

    // Redibuja TODO desde el estado (pares confirmados + el pendiente) en
    // vez de ir agregando marcas sueltas — así remarcar A o B antes de
    // confirmar reemplaza la cruz anterior en vez de dejar restos.
    function redibujarHomologos() {
        overlayA.innerHTML = "";
        overlayB.innerHTML = "";
        paresHomologos.forEach((par, i) => {
            const pA = realAPixelCanvas(resultadoA, par.xA, par.yA);
            const pB = realAPixelCanvas(resultadoB, par.xB, par.yB);
            dibujarCruzHomologa(overlayA, canvasA, pA.x, pA.y, `H${i + 1}`);
            dibujarCruzHomologa(overlayB, canvasB, pB.x, pB.y, `H${i + 1}`);
        });
        const numeroActual = paresHomologos.length + 1;
        if (pendienteA) {
            const p = realAPixelCanvas(resultadoA, pendienteA.xReal, pendienteA.yReal);
            dibujarCruzHomologa(overlayA, canvasA, p.x, p.y, `H${numeroActual}`);
        }
        if (pendienteB) {
            const p = realAPixelCanvas(resultadoB, pendienteB.xReal, pendienteB.yReal);
            dibujarCruzHomologa(overlayB, canvasB, p.x, p.y, `H${numeroActual}`);
        }
    }

    function actualizarTablaHomologos() {
        if (paresHomologos.length === 0) {
            cuerpoTablaHomologos.innerHTML = `<tr><td colspan="4" class="controles-table-empty">Sin puntos</td></tr>`;
            return;
        }
        cuerpoTablaHomologos.innerHTML = paresHomologos.map((par, i) => `
            <tr>
                <td style="font-weight: 600;">H${i + 1}</td>
                <td>${par.xA.toFixed(2)};${par.yA.toFixed(2)}</td>
                <td>${par.xB.toFixed(2)};${par.yB.toFixed(2)}</td>
                <td><button data-index="${i}" class="btn-eliminar-entidad">✕</button></td>
            </tr>
        `).join('');
        cuerpoTablaHomologos.querySelectorAll('.btn-eliminar-entidad').forEach((btn) => {
            btn.addEventListener('click', () => {
                paresHomologos.splice(parseInt(btn.dataset.index), 1);
                actualizarEstadoHomologos();
            });
        });
    }

    function actualizarEstadoHomologos(mensaje) {
        const n = paresHomologos.length;
        estadoHomologos.textContent = mensaje || (n < 3
            ? `Faltan puntos homólogos (mínimo 3). Registrados: ${n}.`
            : `${n} puntos homólogos registrados. Ya podés calcular la fusión.`);
        btnCalcularFusion.disabled = n < 3;
        btnCargarPunto.disabled = !(pendienteA && pendienteB);
        btnCargarPunto.textContent = `Cargar Punto H${n + 1}`;
        actualizarTablaHomologos();
        redibujarHomologos();
    }

    canvasA.addEventListener('click', (e) => {
        const { xPx, yPx } = coordsCanvas(e, canvasA);
        pendienteA = {
            xReal: resultadoA.xMin + xPx / resultadoA.pxPorMetro,
            yReal: resultadoA.yMax - yPx / resultadoA.pxPorMetro
        };
        actualizarEstadoHomologos(pendienteB
            ? 'Punto marcado en las dos imágenes. Presioná "Cargar Punto" para confirmar (o volvé a marcar si no quedó bien).'
            : 'Punto marcado en Imagen A. Ahora marcá el mismo punto real en Imagen B.');
    });

    canvasB.addEventListener('click', (e) => {
        if (!pendienteA) {
            actualizarEstadoHomologos("Primero marcá el punto en Imagen A.");
            return;
        }
        const { xPx, yPx } = coordsCanvas(e, canvasB);
        pendienteB = {
            xReal: resultadoB.xMin + xPx / resultadoB.pxPorMetro,
            yReal: resultadoB.yMax - yPx / resultadoB.pxPorMetro
        };
        actualizarEstadoHomologos('Punto marcado en las dos imágenes. Presioná "Cargar Punto" para confirmar (o volvé a marcar si no quedó bien).');
    });

    btnCargarPunto.addEventListener('click', () => {
        if (!pendienteA || !pendienteB) return;
        paresHomologos.push({ xA: pendienteA.xReal, yA: pendienteA.yReal, xB: pendienteB.xReal, yB: pendienteB.yReal });
        pendienteA = null;
        pendienteB = null;
        actualizarEstadoHomologos();
    });

    btnResetHomologos.addEventListener('click', () => {
        paresHomologos = [];
        pendienteA = null;
        pendienteB = null;
        actualizarEstadoHomologos();
    });

    btnCalcularFusion.addEventListener('click', async () => {
        if (paresHomologos.length < 3) {
            mostrarMensaje("Se requieren al menos 3 puntos homólogos.", 'advertencia');
            return;
        }
        try {
            const transform = calcularTransformSimilitud(paresHomologos);

            let principal = 'A';
            const toleranciaMm = parseFloat(inputToleranciaMm.value) || 5;
            const umbralResiduoM = toleranciaMm / 1000;
            if (transform.residuoRMS > umbralResiduoM) {
                principal = await preguntarOpciones(
                    `Las dos rectificaciones no coinciden del todo entre sí (error promedio: ${(transform.residuoRMS * 1000).toFixed(1)} mm, tolerancia: ${toleranciaMm} mm). ¿Cuál imagen usamos como referencia?`,
                    [
                        { label: 'Usar Imagen A (se ajusta la B)', valor: 'A' },
                        { label: 'Usar Imagen B (se ajusta la A)', valor: 'B' }
                    ]
                );
            }

            const rectificadoMosaico = componerFotomosaico(resultadoA, resultadoB, transform, principal);
            alTerminar(rectificadoMosaico);
        } catch (err) {
            mostrarMensaje("Error al calcular la fusión: " + err.message, 'error');
            console.error(err);
        }
    });

    actualizarEstadoHomologos();
}

function componerFotomosaico(resultadoA, resultadoB, transform, principal) {
    const ref = principal === 'A' ? resultadoA : resultadoB;
    const sec = principal === 'A' ? resultadoB : resultadoA;

    // sec -> ref (para ubicar la extensión de la secundaria en el sistema de referencia)
    const mapearSecARef = principal === 'A' ? transform.aplicar : transform.aplicarInversa;
    // ref -> sec (para el muestreo inverso por píxel)
    const mapearRefASec = principal === 'A' ? transform.aplicarInversa : transform.aplicar;

    const secXMinReal = sec.xMin;
    const secXMaxReal = sec.xMin + sec.canvas.width / sec.pxPorMetro;
    const secYMaxReal = sec.yMax;
    const secYMinReal = sec.yMax - sec.canvas.height / sec.pxPorMetro;

    const esquinasSecEnRef = [
        mapearSecARef(secXMinReal, secYMaxReal),
        mapearSecARef(secXMaxReal, secYMaxReal),
        mapearSecARef(secXMinReal, secYMinReal),
        mapearSecARef(secXMaxReal, secYMinReal)
    ];

    const refXMinReal = ref.xMin;
    const refXMaxReal = ref.xMin + ref.canvas.width / ref.pxPorMetro;
    const refYMaxReal = ref.yMax;
    const refYMinReal = ref.yMax - ref.canvas.height / ref.pxPorMetro;

    const xsReales = [refXMinReal, refXMaxReal, ...esquinasSecEnRef.map(p => p.X)];
    const ysReales = [refYMinReal, refYMaxReal, ...esquinasSecEnRef.map(p => p.Y)];
    const outXMin = Math.min(...xsReales);
    const outXMax = Math.max(...xsReales);
    const outYMin = Math.min(...ysReales);
    const outYMax = Math.max(...ysReales);

    const pxPorMetro = ref.pxPorMetro;
    const outWidth = Math.max(1, Math.round((outXMax - outXMin) * pxPorMetro));
    const outHeight = Math.max(1, Math.round((outYMax - outYMin) * pxPorMetro));

    const ctxRef = ref.canvas.getContext('2d');
    const ctxSec = sec.canvas.getContext('2d');
    const dataRef = ctxRef.getImageData(0, 0, ref.canvas.width, ref.canvas.height);
    const dataSec = ctxSec.getImageData(0, 0, sec.canvas.width, sec.canvas.height);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = outWidth;
    outCanvas.height = outHeight;
    const outCtx = outCanvas.getContext('2d');
    const outData = outCtx.createImageData(outWidth, outHeight);

    for (let yOut = 0; yOut < outHeight; yOut++) {
        for (let xOut = 0; xOut < outWidth; xOut++) {
            const Xreal = outXMin + xOut / pxPorMetro;
            const Yreal = outYMax - yOut / pxPorMetro;
            const idxOut = (yOut * outWidth + xOut) * 4;

            const xRefPx = Math.round((Xreal - ref.xMin) * pxPorMetro);
            const yRefPx = Math.round((ref.yMax - Yreal) * pxPorMetro);

            if (xRefPx >= 0 && xRefPx < ref.canvas.width && yRefPx >= 0 && yRefPx < ref.canvas.height) {
                const idxRef = (yRefPx * ref.canvas.width + xRefPx) * 4;
                outData.data[idxOut] = dataRef.data[idxRef];
                outData.data[idxOut + 1] = dataRef.data[idxRef + 1];
                outData.data[idxOut + 2] = dataRef.data[idxRef + 2];
                outData.data[idxOut + 3] = 255;
                continue;
            }

            const secReal = mapearRefASec(Xreal, Yreal);
            const xSecPx = Math.round((secReal.X - sec.xMin) * sec.pxPorMetro);
            const ySecPx = Math.round((sec.yMax - secReal.Y) * sec.pxPorMetro);

            if (xSecPx >= 0 && xSecPx < sec.canvas.width && ySecPx >= 0 && ySecPx < sec.canvas.height) {
                const idxSec = (ySecPx * sec.canvas.width + xSecPx) * 4;
                outData.data[idxOut] = dataSec.data[idxSec];
                outData.data[idxOut + 1] = dataSec.data[idxSec + 1];
                outData.data[idxOut + 2] = dataSec.data[idxSec + 2];
                outData.data[idxOut + 3] = 255;
            }
        }
    }

    outCtx.putImageData(outData, 0, 0);
    return { canvas: outCanvas, xMin: outXMin, yMax: outYMax, pxPorMetro };
}

function mostrarResultadoFotomosaico(rectificadoMosaico) {
    const canvasFinal = rectificadoMosaico.canvas;
    inicioScreen.innerHTML = `
        <header class="app-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h1>RaumLab <span>TransFORM</span> &mdash; Fotomosaico Generado</h1>
            <button class="btn-primary" style="padding: 0.4rem 1rem; background: #27272a;" onclick="location.reload()">Cerrar Proyecto</button>
        </header>
        <div class="workspace-layout">
            <div class="canvas-area" style="flex-direction: column;">
                <a id="btn-descargar-mosaico" class="btn-primary" style="margin-bottom: 10px; background: #18181b; text-decoration: none; align-self: flex-end;" download="fotomosaico.png">⬇ Descargar Fotomosaico</a>
                <div id="mosaico-canvas-wrapper" style="position: relative; display: inline-flex;">
                    <div id="mosaico-canvas-host"></div>
                    <canvas id="capa-cuadricula-mosaico" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none;"></canvas>
                    <canvas id="capa-medidas-mosaico" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></canvas>
                    <canvas id="capa-dibujo-mosaico" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></canvas>
                </div>
            </div>
            <div class="sidebar-panel">
                <div class="panel-content">
                    <div id="modulo-medicion-mosaico"></div>
                </div>
            </div>
        </div>
    `;

    canvasFinal.style.maxWidth = '80vw';
    canvasFinal.style.maxHeight = '75vh';
    canvasFinal.style.display = 'block';
    canvasFinal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    canvasFinal.style.borderRadius = '4px';
    document.getElementById('mosaico-canvas-host').appendChild(canvasFinal);

    const btnDescargarMosaico = document.getElementById('btn-descargar-mosaico');
    btnDescargarMosaico.href = canvasFinal.toDataURL('image/png');
    btnDescargarMosaico.download = 'fotomosaico.png';

    const capaCuadriculaMosaico = document.getElementById('capa-cuadricula-mosaico');
    const capaMedidasMosaico = document.getElementById('capa-medidas-mosaico');
    const capaDibujoMosaico = document.getElementById('capa-dibujo-mosaico');
    capaMedidasMosaico.width = canvasFinal.width;
    capaMedidasMosaico.height = canvasFinal.height;
    capaDibujoMosaico.width = canvasFinal.width;
    capaDibujoMosaico.height = canvasFinal.height;

    const moduloMedicionMosaico = document.getElementById('modulo-medicion-mosaico');
    crearPanelMedicionYDibujo(rectificadoMosaico, canvasFinal, capaMedidasMosaico, capaDibujoMosaico, capaCuadriculaMosaico, moduloMedicionMosaico);
}

// =====================================================================
// PANEL REUTILIZABLE: CONSULTAR MEDIDAS (cotas sobre la imagen) + DIBUJAR
// (con exportación a imagen y DXF). Usado sobre el Fotoplano y el Fotomosaico.
// =====================================================================
function crearPanelMedicionYDibujo(rectificado, canvasVisible, capaMedidas, capaDibujo, capaCuadricula, contenedorPanel) {
    const ctxMedidas = capaMedidas.getContext('2d');
    const ctxDibujo = capaDibujo.getContext('2d');
    // Las capas están al 100% de resolución real de la imagen (no al tamaño
    // reducido en pantalla), así que el trazo/texto se escala en base al
    // tamaño real para que se vea igual de legible en pantalla y al descargar.
    const factorEscala = Math.max(1, capaDibujo.width / 1200);

    capaCuadricula.width = canvasVisible.width;
    capaCuadricula.height = canvasVisible.height;
    dibujarCuadriculaMetrica(capaCuadricula, rectificado.xMin, rectificado.yMax, rectificado.pxPorMetro, rectificado.canvas, canvasVisible);

    let dibujos = [];
    let modoActivo = null; // 'medida:xy' | 'medida:lineal' | 'medida:superficie' | 'dibujo:punto' | 'dibujo:linea' | 'dibujo:poligono' | 'dibujo:libre'
    let puntosPendientes = [];
    let capturandoLibre = false;
    let trazoLibre = [];

    const COLOR_MEDIDA = '#f2efe9';

    // Paleta fija de colores ACI (AutoCAD Color Index): DXF R12 usa color
    // indexado, no RGB libre. Cada color se exporta como su propia capa.
    // etiqueta: como se muestra en "Capa N (etiqueta)" — en minúscula, no
    // siempre igual al nombre interno (nombre queda igual que ya se usaba
    // para la capa del DXF, para no renombrarla de golpe).
    const PALETA_COLORES = [
        { nombre: 'ROJO', etiqueta: 'rojo', aci: 1, hex: '#e11d1d' },
        { nombre: 'AMARILLO', etiqueta: 'amarillo', aci: 2, hex: '#eab308' },
        { nombre: 'VERDE', etiqueta: 'verde', aci: 3, hex: '#16a34a' },
        { nombre: 'CIAN', etiqueta: 'cyan', aci: 4, hex: '#06b6d4' },
        { nombre: 'AZUL', etiqueta: 'azul', aci: 5, hex: '#2563eb' },
        { nombre: 'MAGENTA', etiqueta: 'magenta', aci: 6, hex: '#d946ef' },
        { nombre: 'NEGRO', etiqueta: 'negro', aci: 7, hex: '#18181b' }
    ];
    let colorActivo = PALETA_COLORES[0];

    contenedorPanel.innerHTML = `
        <h3 class="controles-heading">Consultar medidas <button type="button" class="controles-help-btn" id="ayuda-medidas" title="Ayuda">?</button></h3>
        <div class="controles-btn-row">
            <button id="btn-medir-xy" class="controles-icon-btn" title="Coordenada XY">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="3"/><polyline points="1,8 4,3 7,8"/><line x1="3" y1="20" x2="21" y2="20"/><polyline points="16,17 21,20 16,23"/></svg>
                <span class="visually-hidden">Coordenada XY</span>
            </button>
            <button id="btn-medir-lineal" class="controles-icon-btn" title="Medida lineal">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="8" x2="4" y2="16"/><line x1="20" y1="8" x2="20" y2="16"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
                <span class="visually-hidden">Medida lineal</span>
            </button>
            <button id="btn-medir-superficie" class="controles-icon-btn" title="Superficie">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="4,7 15,4 20,13 14,20 5,17"/></svg>
                <span class="visually-hidden">Superficie</span>
            </button>
        </div>
        <div id="estado-medida" class="controles-hint-box">
            Elegí una herramienta para consultar.
        </div>
        <label class="controles-checkbox-row">
            <input type="checkbox" id="chk-cuadricula"> Mostrar cuadrícula métrica de referencia
        </label>
        <div class="controles-btn-row">
            <button id="btn-limpiar-medidas" class="btn-text" style="flex: 1;">Limpiar</button>
            <button id="btn-descargar-cotas" class="btn-text" style="flex: 1.4;">⬇ Imagen con cotas</button>
        </div>

        <hr class="controles-divider">

        <h3 class="controles-heading">Dibujar <button type="button" class="controles-help-btn" id="ayuda-dibujar" title="Ayuda">?</button></h3>
        <!-- Desplegable propio (no <select> nativo): el navegador no deja
             tematizar el fondo/color de la lista abierta de un <select>, y
             ahí es donde se leía mal — acá el menú es HTML normal. -->
        <div class="capa-selector" id="capa-selector">
            <button type="button" class="capa-selector-boton" id="capa-selector-boton" aria-haspopup="listbox" aria-expanded="false">
                <span class="capa-selector-swatch" style="background: ${colorActivo.hex};"></span>
                <span id="capa-selector-label">Capa ${PALETA_COLORES.indexOf(colorActivo) + 1}</span>
            </button>
            <ul class="capa-selector-lista" id="capa-selector-lista" role="listbox" hidden>
                ${PALETA_COLORES.map((c, i) => `
                    <li role="option">
                        <button type="button" class="capa-selector-opcion ${c.nombre === colorActivo.nombre ? 'activa' : ''}" data-nombre="${c.nombre}" title="${c.etiqueta}">
                            <span class="capa-selector-swatch" style="background: ${c.hex};"></span>
                            Capa ${i + 1}
                        </button>
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="controles-btn-row">
            <button id="btn-dibujar-punto" class="controles-icon-btn" title="Punto">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/></svg>
                <span class="visually-hidden">Punto</span>
            </button>
            <button id="btn-dibujar-linea" class="controles-icon-btn" title="Línea">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="4"/><circle cx="4" cy="20" r="1.6" fill="currentColor" stroke="none"/><circle cx="20" cy="4" r="1.6" fill="currentColor" stroke="none"/></svg>
                <span class="visually-hidden">Línea</span>
            </button>
            <button id="btn-dibujar-poligono" class="controles-icon-btn" title="Polígono">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,3 21,9 18,20 6,20 3,9"/></svg>
                <span class="visually-hidden">Polígono</span>
            </button>
            <button id="btn-dibujar-libre" class="controles-icon-btn" title="Forma libre">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c2-7 3 7 5 0s3-11 5-4 3 9 5 3 2-6 3-3"/></svg>
                <span class="visually-hidden">Forma libre</span>
            </button>
        </div>
        <div id="estado-dibujo" class="controles-hint-box">
            Elegí una herramienta para empezar.
        </div>
        <div class="controles-table-wrap">
            <table class="controles-table">
                <thead>
                    <tr>
                        <th>#</th><th>Tipo</th><th>Métrica</th><th></th>
                    </tr>
                </thead>
                <tbody id="cuerpo-tabla-dibujo" style="max-height: 140px;"><tr><td colspan="4" class="controles-table-empty">Sin figuras</td></tr></tbody>
            </table>
        </div>
        <div class="controles-btn-row" style="margin-bottom: 0;">
            <button id="btn-descargar-dibujo" class="btn-text" style="flex: 1;">⬇ Imagen</button>
            <button id="btn-exportar-dxf" class="btn-primary" style="flex: 1;" disabled>⬇ DXF</button>
        </div>
    `;

    contenedorPanel.querySelector('#ayuda-medidas').addEventListener('click', () => {
        mostrarMensaje('El resultado se anota directo sobre la imagen. En superficie, presioná Enter para cerrar (mínimo 3 vértices).', 'info');
    });
    contenedorPanel.querySelector('#ayuda-dibujar').addEventListener('click', () => {
        mostrarMensaje('Punto, línea, superficie o forma libre (mantené apretado y arrastrá). Cada color se exporta como una capa distinta en el DXF.', 'info');
    });

    const btnMedirXY = contenedorPanel.querySelector('#btn-medir-xy');
    const btnMedirLineal = contenedorPanel.querySelector('#btn-medir-lineal');
    const btnMedirSuperficie = contenedorPanel.querySelector('#btn-medir-superficie');
    const estadoMedida = contenedorPanel.querySelector('#estado-medida');
    const btnLimpiarMedidas = contenedorPanel.querySelector('#btn-limpiar-medidas');
    const btnDescargarCotas = contenedorPanel.querySelector('#btn-descargar-cotas');
    const chkCuadricula = contenedorPanel.querySelector('#chk-cuadricula');
    chkCuadricula.addEventListener('change', () => {
        capaCuadricula.style.display = chkCuadricula.checked ? 'block' : 'none';
    });

    const capaSelector = contenedorPanel.querySelector('#capa-selector');
    const capaSelectorBoton = contenedorPanel.querySelector('#capa-selector-boton');
    const capaSelectorLista = contenedorPanel.querySelector('#capa-selector-lista');
    const capaSelectorLabel = contenedorPanel.querySelector('#capa-selector-label');
    const capaSelectorSwatchBoton = capaSelectorBoton.querySelector('.capa-selector-swatch');

    capaSelectorBoton.addEventListener('click', () => {
        const abierta = !capaSelectorLista.hidden;
        capaSelectorLista.hidden = abierta;
        capaSelectorBoton.setAttribute('aria-expanded', String(!abierta));
    });
    document.addEventListener('click', (e) => {
        if (!capaSelector.contains(e.target)) {
            capaSelectorLista.hidden = true;
            capaSelectorBoton.setAttribute('aria-expanded', 'false');
        }
    });
    capaSelectorLista.querySelectorAll('.capa-selector-opcion').forEach((btn, i) => {
        btn.addEventListener('click', () => {
            colorActivo = PALETA_COLORES.find(c => c.nombre === btn.dataset.nombre);
            capaSelectorLabel.textContent = `Capa ${i + 1}`;
            capaSelectorSwatchBoton.style.background = colorActivo.hex;
            capaSelectorLista.querySelectorAll('.capa-selector-opcion').forEach(b => b.classList.remove('activa'));
            btn.classList.add('activa');
            capaSelectorLista.hidden = true;
            capaSelectorBoton.setAttribute('aria-expanded', 'false');
        });
    });

    const btnPunto = contenedorPanel.querySelector('#btn-dibujar-punto');
    const btnLinea = contenedorPanel.querySelector('#btn-dibujar-linea');
    const btnPoligono = contenedorPanel.querySelector('#btn-dibujar-poligono');
    const btnLibre = contenedorPanel.querySelector('#btn-dibujar-libre');
    const estadoDibujo = contenedorPanel.querySelector('#estado-dibujo');
    const cuerpoTablaDibujo = contenedorPanel.querySelector('#cuerpo-tabla-dibujo');
    const btnDescargarDibujo = contenedorPanel.querySelector('#btn-descargar-dibujo');
    const btnExportarDXF = contenedorPanel.querySelector('#btn-exportar-dxf');

    // --- Conversión de coordenadas ---
    // Clics: llegan en píxeles de pantalla (CSS), hay que pasarlos a metros reales.
    function coordsReales(e) {
        const rect = canvasVisible.getBoundingClientRect();
        const scaleX = canvasVisible.width / rect.width;
        const scaleY = canvasVisible.height / rect.height;
        const xPx = (e.clientX - rect.left) * scaleX;
        const yPx = (e.clientY - rect.top) * scaleY;
        return {
            X: rectificado.xMin + xPx / rectificado.pxPorMetro,
            Y: rectificado.yMax - yPx / rectificado.pxPorMetro
        };
    }

    // Dibujo: las capas están en píxeles reales de la imagen, no de pantalla.
    function realAPixel(P) {
        return {
            x: (P.X - rectificado.xMin) * rectificado.pxPorMetro,
            y: (rectificado.yMax - P.Y) * rectificado.pxPorMetro
        };
    }

    // Sin recuadro de fondo — solo el texto, mismo criterio que el resto
    // del módulo (nada de cajas salvo botones/tarjetas).
    function dibujarEtiqueta(ctx, x, y, texto, color) {
        const fontSize = 14 * factorEscala;
        ctx.font = `600 ${fontSize}px sans-serif`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(texto, x + 9 * factorEscala, y - 9 * factorEscala);
    }

    // Cruz — mismo tipo de marca que los puntos de control del modo
    // Analítico, para que se lea igual en toda la app. Responde al color
    // que se le pasa (capa activa en Dibujar; blanco en Consultar medidas).
    function dibujarPuntoEn(ctx, P, color, etiqueta) {
        const { x, y } = realAPixel(P);
        const l = 7 * factorEscala;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5 * factorEscala;
        ctx.beginPath();
        ctx.moveTo(x - l, y); ctx.lineTo(x + l, y);
        ctx.moveTo(x, y - l); ctx.lineTo(x, y + l);
        ctx.stroke();
        if (etiqueta) dibujarEtiqueta(ctx, x, y, etiqueta, color);
    }

    function dibujarLineaEn(ctx, P1, P2, color, etiqueta) {
        const a = realAPixel(P1), b = realAPixel(P2);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5 * factorEscala;
        ctx.stroke();
        if (etiqueta) dibujarEtiqueta(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2, etiqueta, color);
    }

    function dibujarPolilineaEn(ctx, puntos, color, cerrada, etiqueta) {
        const pxPts = puntos.map(realAPixel);
        ctx.beginPath();
        pxPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        if (cerrada) {
            ctx.closePath();
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5 * factorEscala;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        if (etiqueta) {
            const cx = pxPts.reduce((s, p) => s + p.x, 0) / pxPts.length;
            const cy = pxPts.reduce((s, p) => s + p.y, 0) / pxPts.length;
            dibujarEtiqueta(ctx, cx, cy, etiqueta, color);
        }
    }

    function calcularAreaPoligono(puntos) {
        let area = 0;
        for (let i = 0; i < puntos.length; i++) {
            const p1 = puntos[i], p2 = puntos[(i + 1) % puntos.length];
            area += p1.X * p2.Y - p2.X * p1.Y;
        }
        return Math.abs(area) / 2;
    }

    function calcularLongitudPolilinea(puntos) {
        let total = 0;
        for (let i = 0; i < puntos.length - 1; i++) {
            total += Math.hypot(puntos[i + 1].X - puntos[i].X, puntos[i + 1].Y - puntos[i].Y);
        }
        return total;
    }

    // incluirCuadricula: si la grilla está activa, se compone en un canvas
    // más grande (imagen + margen) para que la descarga coincida con lo que
    // se ve en pantalla, con las etiquetas fuera de la foto.
    function descargarComposicion(capa, nombreArchivo, incluirCuadricula) {
        const conGrid = incluirCuadricula && chkCuadricula.checked;
        const margenPx = conGrid ? (capaCuadricula.width - rectificado.canvas.width) / 2 : 0;
        const tmp = document.createElement('canvas');
        tmp.width = rectificado.canvas.width + margenPx * 2;
        tmp.height = rectificado.canvas.height + margenPx * 2;
        const tctx = tmp.getContext('2d');
        // El margen de la cuadrícula es transparente en pantalla (se ve el
        // fondo oscuro del workspace) — acá no hay workspace detrás, así que
        // se pinta el mismo oscuro a mano para que el margen no salga en
        // blanco/transparente en el archivo descargado.
        if (conGrid) {
            tctx.fillStyle = '#18181b';
            tctx.fillRect(0, 0, tmp.width, tmp.height);
        }
        tctx.drawImage(rectificado.canvas, margenPx, margenPx);
        if (conGrid) tctx.drawImage(capaCuadricula, 0, 0);
        tctx.drawImage(capa, margenPx, margenPx);
        const a = document.createElement('a');
        a.href = tmp.toDataURL('image/png');
        a.download = nombreArchivo;
        a.click();
    }

    // --- Grupo "Consultar medidas" ---
    function actualizarEstadoMedida(mensaje) {
        estadoMedida.textContent = mensaje || 'Elegí una herramienta para consultar.';
    }

    function setModoMedida(modo) {
        modoActivo = modo;
        puntosPendientes = [];
        const mensajes = {
            'medida:xy': 'Click en la imagen para consultar sus coordenadas.',
            'medida:lineal': 'Click en los dos extremos a medir.',
            'medida:superficie': 'Click en los vértices y presioná Enter para cerrar (mínimo 3).'
        };
        actualizarEstadoMedida(mensajes[modo]);
    }

    btnMedirXY.addEventListener('click', () => setModoMedida('medida:xy'));
    btnMedirLineal.addEventListener('click', () => setModoMedida('medida:lineal'));
    btnMedirSuperficie.addEventListener('click', () => setModoMedida('medida:superficie'));

    btnLimpiarMedidas.addEventListener('click', () => {
        ctxMedidas.clearRect(0, 0, capaMedidas.width, capaMedidas.height);
        actualizarEstadoMedida(null);
    });

    btnDescargarCotas.addEventListener('click', () => descargarComposicion(capaMedidas, 'fotoplano_con_cotas.png', true));

    // --- Grupo "Dibujar" ---
    function actualizarTablaDibujo() {
        if (dibujos.length === 0) {
            cuerpoTablaDibujo.innerHTML = `<tr><td colspan="4" class="controles-table-empty">Sin figuras</td></tr>`;
        } else {
            cuerpoTablaDibujo.innerHTML = dibujos.map((ent, i) => {
                let metrica = '';
                if (ent.tipo === 'punto') metrica = `(${ent.puntos[0].X.toFixed(2)}, ${ent.puntos[0].Y.toFixed(2)}) m`;
                else if (ent.tipo === 'linea') metrica = `${Math.hypot(ent.puntos[1].X - ent.puntos[0].X, ent.puntos[1].Y - ent.puntos[0].Y).toFixed(3)} m`;
                else if (ent.tipo === 'poligono') metrica = `${calcularAreaPoligono(ent.puntos).toFixed(3)} m²`;
                else if (ent.tipo === 'libre') metrica = `${calcularLongitudPolilinea(ent.puntos).toFixed(3)} m (trazo)`;
                return `<tr><td>${i + 1}</td><td><span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${ent.color.hex}; margin-right: 4px;"></span>${ent.tipo}</td><td>${metrica}</td><td><button data-index="${i}" class="btn-eliminar-entidad">✕</button></td></tr>`;
            }).join('');

            contenedorPanel.querySelectorAll('.btn-eliminar-entidad').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    dibujos.splice(parseInt(e.target.getAttribute('data-index')), 1);
                    redibujarCapaDibujo();
                });
            });
        }
        btnExportarDXF.disabled = dibujos.length === 0;
    }

    function redibujarSoloCapaDibujo() {
        ctxDibujo.clearRect(0, 0, capaDibujo.width, capaDibujo.height);
        dibujos.forEach(ent => {
            const color = ent.color.hex;
            if (ent.tipo === 'punto') dibujarPuntoEn(ctxDibujo, ent.puntos[0], color, null);
            else if (ent.tipo === 'linea') dibujarLineaEn(ctxDibujo, ent.puntos[0], ent.puntos[1], color, null);
            else if (ent.tipo === 'poligono') dibujarPolilineaEn(ctxDibujo, ent.puntos, color, true, null);
            else if (ent.tipo === 'libre') dibujarPolilineaEn(ctxDibujo, ent.puntos, color, false, null);
        });
        if (capturandoLibre && trazoLibre.length >= 2) {
            dibujarPolilineaEn(ctxDibujo, trazoLibre, colorActivo.hex, false, null);
        }
    }

    // Redibuja la capa Y actualiza la tabla lateral — usar solo cuando cambió
    // la lista de figuras (agregar/borrar), no en cada tick de "forma libre"
    // (ahí alcanza con redibujarSoloCapaDibujo, evita reconstruir la tabla en
    // cada mousemove mientras se arrastra).
    function redibujarCapaDibujo() {
        redibujarSoloCapaDibujo();
        actualizarTablaDibujo();
    }

    function volverAModoInicialDibujo() {
        modoActivo = null;
        puntosPendientes = [];
        estadoDibujo.textContent = 'Elegí una herramienta para empezar.';
    }

    function setModoDibujo(modo) {
        modoActivo = modo;
        puntosPendientes = [];
        const mensajes = {
            'dibujo:punto': 'Click en la imagen para agregar un punto.',
            'dibujo:linea': 'Click en los dos extremos de la línea.',
            'dibujo:poligono': 'Click en los vértices y presioná Enter para cerrar (mínimo 3).',
            'dibujo:libre': 'Mantené apretado el botón del mouse y arrastrá para dibujar.'
        };
        estadoDibujo.textContent = mensajes[modo];
    }

    btnPunto.addEventListener('click', () => setModoDibujo('dibujo:punto'));
    btnLinea.addEventListener('click', () => setModoDibujo('dibujo:linea'));
    btnPoligono.addEventListener('click', () => setModoDibujo('dibujo:poligono'));
    btnLibre.addEventListener('click', () => setModoDibujo('dibujo:libre'));

    btnDescargarDibujo.addEventListener('click', () => descargarComposicion(capaDibujo, 'fotoplano_con_dibujo.png'));

    btnExportarDXF.addEventListener('click', () => {
        const dxfTexto = generarDXF(dibujos);
        const blob = new Blob([dxfTexto], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'medicion.dxf';
        a.click();
        URL.revokeObjectURL(url);
    });

    // --- Captura de clics/mouse compartida entre ambos grupos ---
    // Si el panel se vuelve a montar (ej. el usuario regenera el fotoplano con
    // otro GSD), hay que sacar los manejadores anteriores antes de agregar los
    // nuevos: si no, quedarían pegados al mismo <canvas> y cada click dispararía
    // varias veces con datos de escala desactualizados.
    if (canvasVisible._medicionClickHandler) canvasVisible.removeEventListener('click', canvasVisible._medicionClickHandler);
    if (canvasVisible._medicionMouseDownHandler) canvasVisible.removeEventListener('mousedown', canvasVisible._medicionMouseDownHandler);
    if (canvasVisible._medicionMouseMoveHandler) canvasVisible.removeEventListener('mousemove', canvasVisible._medicionMouseMoveHandler);
    if (canvasVisible._medicionMouseUpHandler) document.removeEventListener('mouseup', canvasVisible._medicionMouseUpHandler);
    if (canvasVisible._medicionKeyHandler) document.removeEventListener('keydown', canvasVisible._medicionKeyHandler);

    const manejarClick = (e) => {
        if (!modoActivo) return;
        const p = coordsReales(e);

        if (modoActivo === 'medida:xy') {
            dibujarPuntoEn(ctxMedidas, p, COLOR_MEDIDA, `(${p.X.toFixed(2)};${p.Y.toFixed(2)})`);
            actualizarEstadoMedida(`Consultado: (${p.X.toFixed(2)};${p.Y.toFixed(2)})`);
        } else if (modoActivo === 'medida:lineal') {
            puntosPendientes.push(p);
            dibujarPuntoEn(ctxMedidas, p, COLOR_MEDIDA, null);
            if (puntosPendientes.length === 2) {
                const dist = Math.hypot(puntosPendientes[1].X - puntosPendientes[0].X, puntosPendientes[1].Y - puntosPendientes[0].Y);
                dibujarLineaEn(ctxMedidas, puntosPendientes[0], puntosPendientes[1], COLOR_MEDIDA, `${dist.toFixed(3)} m`);
                actualizarEstadoMedida(`Medido: ${dist.toFixed(3)} m`);
                puntosPendientes = [];
                modoActivo = null;
            }
        } else if (modoActivo === 'medida:superficie') {
            puntosPendientes.push(p);
            dibujarPuntoEn(ctxMedidas, p, COLOR_MEDIDA, null);
        } else if (modoActivo === 'dibujo:punto') {
            dibujos.push({ tipo: 'punto', puntos: [{ X: p.X, Y: p.Y }], color: colorActivo });
            redibujarCapaDibujo();
            volverAModoInicialDibujo();
        } else if (modoActivo === 'dibujo:linea') {
            puntosPendientes.push(p);
            dibujarPuntoEn(ctxDibujo, p, colorActivo.hex, null);
            if (puntosPendientes.length === 2) {
                dibujos.push({ tipo: 'linea', puntos: puntosPendientes.map(pt => ({ X: pt.X, Y: pt.Y })), color: colorActivo });
                redibujarCapaDibujo();
                volverAModoInicialDibujo();
            }
        } else if (modoActivo === 'dibujo:poligono') {
            puntosPendientes.push(p);
            dibujarPuntoEn(ctxDibujo, p, colorActivo.hex, null);
        }
    };

    const manejarKeydown = (e) => {
        if (e.key !== 'Enter') return;
        if (modoActivo === 'medida:superficie') {
            if (puntosPendientes.length < 3) {
                mostrarMensaje('Mínimo 3 vértices para una superficie.', 'advertencia');
                return;
            }
            const area = calcularAreaPoligono(puntosPendientes);
            dibujarPolilineaEn(ctxMedidas, puntosPendientes, COLOR_MEDIDA, true, `${area.toFixed(3)} m²`);
            actualizarEstadoMedida(`Medido: ${area.toFixed(3)} m²`);
            puntosPendientes = [];
            modoActivo = null;
        } else if (modoActivo === 'dibujo:poligono') {
            if (puntosPendientes.length < 3) {
                mostrarMensaje('Mínimo 3 vértices para un polígono.', 'advertencia');
                return;
            }
            dibujos.push({ tipo: 'poligono', puntos: puntosPendientes.map(pt => ({ X: pt.X, Y: pt.Y })), color: colorActivo });
            redibujarCapaDibujo();
            volverAModoInicialDibujo();
        }
    };

    const manejarMouseDown = (e) => {
        if (modoActivo !== 'dibujo:libre') return;
        capturandoLibre = true;
        trazoLibre = [coordsReales(e)];
    };

    const manejarMouseMove = (e) => {
        if (!capturandoLibre) return;
        const p = coordsReales(e);
        const ultimo = trazoLibre[trazoLibre.length - 1];
        const distReal = Math.hypot(p.X - ultimo.X, p.Y - ultimo.Y);
        if (distReal > 1 / rectificado.pxPorMetro) { // ~1px real mínimo entre puntos
            trazoLibre.push(p);
            redibujarSoloCapaDibujo();
        }
    };

    const manejarMouseUp = () => {
        if (!capturandoLibre) return;
        capturandoLibre = false;
        if (trazoLibre.length >= 2) {
            dibujos.push({ tipo: 'libre', puntos: trazoLibre.map(pt => ({ X: pt.X, Y: pt.Y })), color: colorActivo });
        }
        trazoLibre = [];
        redibujarCapaDibujo();
        volverAModoInicialDibujo();
    };

    canvasVisible.addEventListener('click', manejarClick);
    canvasVisible.addEventListener('mousedown', manejarMouseDown);
    canvasVisible.addEventListener('mousemove', manejarMouseMove);
    document.addEventListener('mouseup', manejarMouseUp);
    document.addEventListener('keydown', manejarKeydown);

    canvasVisible._medicionClickHandler = manejarClick;
    canvasVisible._medicionMouseDownHandler = manejarMouseDown;
    canvasVisible._medicionMouseMoveHandler = manejarMouseMove;
    canvasVisible._medicionMouseUpHandler = manejarMouseUp;
    canvasVisible._medicionKeyHandler = manejarKeydown;

    actualizarTablaDibujo();
}
