import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// === VARIABLES GLOBALES ===
let scene, camera, renderer, controls, transformControls;
let roomFloorGrid, floorMesh;
let objectsInScene = [];
let selectedObject = null;

// Ficha de la Sala: datos de la exposición en su conjunto (curador, no pieza).
let salaData = { titulo: '', artista: '', anio: '', textoCuratorial: '' };

// === ELEMENTOS DEL DOM ===
const inputWidth = document.getElementById('room-width');
const inputDepth = document.getElementById('room-depth');
const btnUpdateRoom = document.getElementById('btn-update-room');
const canvasContainer = document.getElementById('canvas-render-surface');

// Entradas de archivos locales — imagen y video son dos botones separados
// (cada uno con su propio selector nativo, filtrado por accept), pero ambos
// desembocan en el mismo manejador: handlePaintUpload ya distingue el tipo
// real del archivo elegido, no el botón que se usó para elegirlo.
const fileImage = document.getElementById('file-image');
const fileVideo = document.getElementById('file-video');
const fileSculpture = document.getElementById('file-sculpture');
const btnDeleteObject = document.getElementById('btn-delete-object');

// Tira de miniaturas de piezas (fila horizontal con flechas)
const piecesRowWrapper = document.querySelector('.pieces-row-wrapper');
const btnPiecesScrollLeft = document.getElementById('pieces-scroll-left');
const btnPiecesScrollRight = document.getElementById('pieces-scroll-right');

// Botones de guardado y vista previa del panel izquierdo
const btnPreviewScene = document.getElementById('btn-preview-scene');
const btnSaveProject = document.getElementById('btn-save-project');
const fileLoadProject = document.getElementById('file-load-project');

// Modal de exportación unificada
const btnOpenExportModal = document.getElementById('btn-open-export-modal');
const exportModalOverlay = document.getElementById('export-modal-overlay');
const btnExportCancel = document.getElementById('btn-export-cancel');
const btnExportConfirm = document.getElementById('btn-export-confirm');
const checkExportIncludeFloor = document.getElementById('export-include-floor');
const checkExportIncludeJson = document.getElementById('export-include-json');

// Modal de Ficha de la Sala (datos de la exposición en su conjunto, no de una pieza)
const btnOpenSalaModal = document.getElementById('btn-open-sala-modal');
const salaModalOverlay = document.getElementById('sala-modal-overlay');
const btnSalaCancel = document.getElementById('btn-sala-cancel');
const btnSalaGuardar = document.getElementById('btn-sala-guardar');
const inputSalaTitulo = document.getElementById('sala-titulo');
const inputSalaArtista = document.getElementById('sala-artista');
const inputSalaAnio = document.getElementById('sala-anio');
const textareaSalaTextoCuratorial = document.getElementById('sala-texto-curatorial');
const salaFichaCheck = document.getElementById('sala-ficha-check');

// Modal de vista previa (in-page, no navega a otra pestaña)
const previewModalOverlay = document.getElementById('preview-modal-overlay');
const previewModelViewer = document.getElementById('preview-model-viewer');
const btnPreviewClose = document.getElementById('btn-preview-close');

// Elementos del Inspector Derecho
const inspectorEmpty = document.getElementById('inspector-empty-state');
const inspectorControls = document.getElementById('inspector-controls');
const selectedIndicator = document.getElementById('selected-object-indicator');

// Lista de miniaturas de piezas
const piecesList = document.getElementById('pieces-list');
const piecesListEmpty = document.getElementById('pieces-list-empty');

const inputPosX = document.getElementById('pos-x');
const inputPosY = document.getElementById('pos-y');
const inputPosZ = document.getElementById('pos-z');

const selectAlignReference = document.getElementById('align-reference');
const btnAlignX = document.getElementById('btn-align-x');
const btnAlignY = document.getElementById('btn-align-y');
const btnAlignZ = document.getElementById('btn-align-z');

const inputRotX = document.getElementById('rot-x');
const inputRotY = document.getElementById('rot-y');
const inputRotZ = document.getElementById('rot-z');

const inputDimX = document.getElementById('dim-x');
const inputDimY = document.getElementById('dim-y');
const inputDimZ = document.getElementById('dim-z');
const dimZRow = document.getElementById('dim-z-row');
const checkLockProportion = document.getElementById('check-lock-proportion');

// Solo en celular: type="number" con step decimal se comporta como
// stepper nativo al tocar en vez de dejar escribir el valor. Se pasa a
// texto con teclado numérico (inputmode="decimal") — aplicarDimension()/
// el listener de posición ya parsean con parseFloat(.value), funciona
// igual con cualquiera de los dos tipos. No toca el input de escritorio.
if (window.rcIsMobile && window.rcIsMobile()) {
    [inputDimX, inputDimY, inputDimZ, inputPosX, inputPosY, inputPosZ].forEach((el) => {
        if (!el) return;
        el.setAttribute('type', 'text');
        el.setAttribute('inputmode', 'decimal');
    });
}

// Campos del formulario de Ficha Técnica
const inputMetaTitle = document.getElementById('meta-title');
const inputMetaArtist = document.getElementById('meta-artist');
const inputMetaYear = document.getElementById('meta-year');
const inputMetaMedium = document.getElementById('meta-medium');
const inputMetaDescription = document.getElementById('meta-description'); // <-- Captura del área de texto
const inputMetaInstalacion = document.getElementById('meta-instalacion');

// Pestañas Disposición / Atributos (panel derecho)
const tabBtnDisposicion = document.getElementById('tab-btn-disposicion');
const tabBtnAtributos = document.getElementById('tab-btn-atributos');
const tabPanelDisposicion = document.getElementById('tab-panel-disposicion');
const tabPanelAtributos = document.getElementById('tab-panel-atributos');

// Textos dinámicos con el título de la sala (panel izquierdo y arriba del visor)
const editorNombreSalaValor = document.getElementById('editor-nombre-sala-valor');
const editorProyectoLabel = document.getElementById('editor-proyecto-label');

// === 1. INICIALIZACIÓN DE THREE.JS ===
function initEditor() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFAFAFA);

    camera = new THREE.PerspectiveCamera(60, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    // En celular, devicePixelRatio completo (2-3x en la mayoría de los
    // iPhone) multiplica bastante la memoria de GPU que pide el render
    // target, encima de la que ya usa cualquier textura grande en escena
    // — puede ser lo que empuja a un dispositivo justo de memoria a fallar
    // al cargar una textura. Tope conservador solo en móvil; en escritorio
    // se mantiene el valor completo.
    renderer.setPixelRatio(window.rcIsMobile && window.rcIsMobile() ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio);
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    canvasContainer.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Configuración del Gizmo (Flechas 3D)
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.75;
    transformControls.addEventListener('dragging-changed', (e) => controls.enabled = !e.value);
    transformControls.addEventListener('objectChange', updateInspectorValues);
    scene.add(transformControls);

    // Iluminación de Galería
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(4, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    buildRoom(parseFloat(inputWidth.value), parseFloat(inputDepth.value));

    // Listeners de la interfaz
    window.addEventListener('resize', onWindowResize);
    btnUpdateRoom.addEventListener('click', () => buildRoom(parseFloat(inputWidth.value), parseFloat(inputDepth.value)));
    btnDeleteObject.addEventListener('click', deleteSelectedObject);

    // Escuchas de los inputs de archivos locales
    fileImage.addEventListener('change', handlePaintUpload);
    fileVideo.addEventListener('change', handlePaintUpload);
    fileSculpture.addEventListener('change', handleSculptureUpload);

    // Flechas de la tira de miniaturas (aparecen solo si hay piezas ocultas)
    if (btnPiecesScrollLeft) btnPiecesScrollLeft.addEventListener('click', () => piecesList.scrollBy({ left: -150, behavior: 'smooth' }));
    if (btnPiecesScrollRight) btnPiecesScrollRight.addEventListener('click', () => piecesList.scrollBy({ left: 150, behavior: 'smooth' }));
    if (piecesList) piecesList.addEventListener('scroll', actualizarFlechasPiezas);
    window.addEventListener('resize', actualizarFlechasPiezas);

    // Listeners para las funciones de guardado y vista previa
    if (btnPreviewScene) btnPreviewScene.addEventListener('click', previewSceneInViewer);
    if (btnSaveProject) btnSaveProject.addEventListener('click', saveProjectFile);
    if (fileLoadProject) fileLoadProject.addEventListener('change', loadProjectFile);

    // Modal de exportación unificada
    if (btnOpenExportModal) btnOpenExportModal.addEventListener('click', abrirModalExportacion);
    if (btnExportCancel) btnExportCancel.addEventListener('click', cerrarModalExportacion);
    if (btnExportConfirm) btnExportConfirm.addEventListener('click', confirmarExportacion);
    if (exportModalOverlay) exportModalOverlay.addEventListener('click', (e) => {
        if (e.target === exportModalOverlay) cerrarModalExportacion();
    });

    // Modal de vista previa
    if (btnPreviewClose) btnPreviewClose.addEventListener('click', cerrarModalVistaPrevia);
    if (previewModalOverlay) previewModalOverlay.addEventListener('click', (e) => {
        if (e.target === previewModalOverlay) cerrarModalVistaPrevia();
    });

    // Modal de Ficha de la Sala
    if (btnOpenSalaModal) btnOpenSalaModal.addEventListener('click', abrirModalSala);
    if (btnSalaCancel) btnSalaCancel.addEventListener('click', cerrarModalSala);
    if (btnSalaGuardar) btnSalaGuardar.addEventListener('click', guardarFichaSala);
    if (salaModalOverlay) salaModalOverlay.addEventListener('click', (e) => {
        if (e.target === salaModalOverlay) cerrarModalSala();
    });

    // Pestañas Disposición / Atributos
    if (tabBtnDisposicion) tabBtnDisposicion.addEventListener('click', () => activarTabInspector('disposicion'));
    if (tabBtnAtributos) tabBtnAtributos.addEventListener('click', () => activarTabInspector('atributos'));

    setupInspectorInputs();
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    animate();
}

function buildRoom(width, depth) {
    if (roomFloorGrid) scene.remove(roomFloorGrid);
    if (floorMesh) scene.remove(floorMesh);

    // Piso color Beige in_SITE
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0xF3F2EE, 
        roughness: 0.9, 
        side: THREE.DoubleSide 
    });
    floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Grilla en tonos oliva suaves
    const divisions = Math.max(width, depth);
    roomFloorGrid = new THREE.GridHelper(divisions, divisions, 0xC6C6B5, 0xDEDECD);
    roomFloorGrid.scale.set(width / divisions, 1, depth / divisions);
    roomFloorGrid.position.y = 0.005; // Un pelín más arriba para evitar z-fighting
    scene.add(roomFloorGrid);

    controls.target.set(0, 0, 0);
}

// El nombre de cada pieza (obj.name) es la clave que usa el visor para
// emparejar cada malla del GLB con su ficha técnica en el JSON — por eso tiene
// que ser el mismo string en los dos archivos. GLTFExporter sanea los nombres
// de malla (los espacios quedan como guión bajo, por ejemplo), así que
// saneamos acá con el mismo criterio desde el vamos, antes de que el nombre
// llegue a ningún lado. Además evitamos cortar solo por el primer punto
// (nombres como los de WhatsApp, "... at 12.34.56.mp4", tienen puntos en la
// marca de hora, no solo en la extensión) y evitamos que dos piezas
// terminen con el mismo nombre (rompería el emparejamiento para ambas).
function nombrePiezaDesdeArchivo(fileName) {
    const sinExtension = fileName.replace(/\.[^./\\]+$/, ''); // saca solo la última extensión
    const saneado = sinExtension
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    return saneado || 'pieza';
}

function generarNombreUnico(nombreBase) {
    const nombresExistentes = new Set(objectsInScene.map(o => o.name));
    let nombre = nombreBase;
    let contador = 2;
    while (nombresExistentes.has(nombre)) {
        nombre = `${nombreBase}_${contador}`;
        contador++;
    }
    return nombre;
}

// === 2. PROCESAMIENTO DE IMÁGENES Y VIDEOS LOCALES (CUADROS) ===
const VIDEO_TAMANIO_ADVERTENCIA_MB = 30;
const VIDEO_TAMANIO_MAXIMO_MB = 60;

function handlePaintUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
        const tamanioMB = file.size / (1024 * 1024);

        if (tamanioMB > VIDEO_TAMANIO_MAXIMO_MB) {
            alert(
                `Este video pesa ${tamanioMB.toFixed(0)} MB, por encima del máximo admitido (${VIDEO_TAMANIO_MAXIMO_MB} MB). ` +
                `Al codificarse en base64 para la exportación, un archivo tan pesado agota la memoria del navegador. ` +
                `Comprimí el video (menor resolución/bitrate, o recortá la duración) y volvé a intentar.`
            );
            event.target.value = '';
            return;
        }

        if (tamanioMB > VIDEO_TAMANIO_ADVERTENCIA_MB) {
            const continuar = confirm(
                `Este video pesa ${tamanioMB.toFixed(0)} MB. Los videos grandes pueden hacer más lenta la exportación y, según el navegador, agotar su memoria.\n\n¿Continuar de todos modos?`
            );
            if (!continuar) {
                event.target.value = '';
                return;
            }
        }
    }

    const reader = new FileReader();
    reader.onload = () => {
        if (file.type.startsWith('video/')) {
            crearVideoDesdeDataURL(reader.result, file.name);
        } else {
            crearCuadroDesdeDataURL(reader.result, file.name);
        }
    };
    reader.readAsDataURL(file);
}

// Tope de tamaño de imagen en celular: una textura muy grande puede
// agotar la memoria de GPU disponible en un iPhone y fallar en silencio
// (Three.js no tira error visible — el material se queda con su color
// blanco por defecto, como si no tuviera mapa). Mismo criterio que el
// tope de espacio_INM (compositeWithBackground), acá aplicado a las
// imágenes que se agregan como pieza.
function capImageDataURLParaMobile(dataURL) {
    return new Promise((resolve) => {
        if (!(window.rcIsMobile && window.rcIsMobile())) {
            resolve(dataURL);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const MAX_MOBILE = 2048;
            if (img.width <= MAX_MOBILE && img.height <= MAX_MOBILE) {
                resolve(dataURL);
                return;
            }
            const factor = MAX_MOBILE / Math.max(img.width, img.height);
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * factor);
            c.height = Math.round(img.height * factor);
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => resolve(dataURL);
        img.src = dataURL;
    });
}

async function crearCuadroDesdeDataURL(dataURL, fileName, opciones = {}) {
    const { transform = null, fichaTecnica = null, seleccionar = true } = opciones;
    dataURL = await capImageDataURLParaMobile(dataURL);
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(dataURL, (texture) => {
        const imgWidth = texture.image.width;
        const imgHeight = texture.image.height;
        const aspectRatio = imgWidth / imgHeight;

        const meshWidth = 1 * aspectRatio;
        const meshHeight = 1;

        const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            roughness: 0.2,
            transparent: true,
            alphaTest: 0.05
        });

        const paintMesh = new THREE.Mesh(geometry, material);
        paintMesh.name = generarNombreUnico(nombrePiezaDesdeArchivo(fileName));
        paintMesh.castShadow = true;
        paintMesh.userData = {
            type: 'cuadro',
            fileName: fileName,
            imageDataURL: dataURL,
            baseSize: { x: meshWidth, y: meshHeight, z: 0.01 } // un cuadro es un plano: sin profundidad real
        };

        aplicarTransformYFicha(paintMesh, transform, fichaTecnica, meshHeight / 2 + 1);

        scene.add(paintMesh);
        objectsInScene.push(paintMesh);
        refrescarListaPiezas();
        if (seleccionar) selectObject(paintMesh);
    });
}

// Crea un cuadro cuya superficie reproduce un video en vivo dentro del editor
// (THREE.VideoTexture). El GLB no puede llevar video real: al exportar se usa
// en su lugar un frame fijo (userData.posterTexture), capturado acá una vez que
// el video tiene su primer frame disponible.
function crearVideoDesdeDataURL(dataURL, fileName, opciones = {}) {
    const { transform = null, fichaTecnica = null, seleccionar = true } = opciones;

    const video = document.createElement('video');
    video.loop = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('muted', ''); // algunos navegadores exigen el atributo, no solo la propiedad, para autoplay
    video.setAttribute('playsinline', '');

    // Nunca dejar al usuario esperando en silencio: si la carga no resuelve
    // en un tiempo razonable (video grande, formato problemático, etc.), avisar.
    let resuelto = false;
    const timeoutCarga = setTimeout(() => {
        if (resuelto) return;
        resuelto = true;
        alert(`El video "${fileName}" está tardando demasiado en cargar. Puede ser muy pesado para el navegador o tener un formato no compatible. Probá con un archivo más liviano (MP4/WebM).`);
    }, 20000);

    video.addEventListener('error', () => {
        if (resuelto) return;
        resuelto = true;
        clearTimeout(timeoutCarga);
        console.error(`Error al cargar el video "${fileName}":`, video.error);
        alert(`No se pudo cargar el video "${fileName}". Revisá que el formato sea compatible (MP4/WebM) y que el archivo no esté dañado.`);
    });

    video.addEventListener('loadeddata', () => {
        if (resuelto) return; // el timeout ya disparó, no seguir de todos modos
        resuelto = true;
        clearTimeout(timeoutCarga);

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const aspectRatio = videoWidth / videoHeight;

        const meshWidth = 1 * aspectRatio;
        const meshHeight = 1;

        // Capturar el frame apenas dispara 'loadeddata' a veces da negro (el
        // decodificador todavía no pintó nada, según navegador/códec). Forzamos
        // un salto a un instante > 0 y esperamos a que ESE frame esté listo
        // (evento 'seeked') antes de capturarlo — más confiable. Con un tope de
        // tiempo propio: si el salto no resuelve rápido (videos grandes pueden
        // tardar), capturamos igual lo que haya en vez de trabarnos.
        let posterCapturado = false;
        const capturarPoster = () => {
            if (posterCapturado) return;
            posterCapturado = true;

            // El poster se achica a un máximo razonable: un video de celular en
            // 1080p/4K generaría, si no, una textura enorme que hace que
            // GLTFExporter se quede sin memoria al exportar.
            const POSTER_MAX_LADO = 1024;
            const escalaPoster = Math.min(1, POSTER_MAX_LADO / Math.max(videoWidth, videoHeight));
            const posterWidth = Math.round(videoWidth * escalaPoster);
            const posterHeight = Math.round(videoHeight * escalaPoster);

            const posterCanvas = document.createElement('canvas');
            posterCanvas.width = posterWidth;
            posterCanvas.height = posterHeight;
            posterCanvas.getContext('2d').drawImage(video, 0, 0, posterWidth, posterHeight);
            const posterDataURL = posterCanvas.toDataURL('image/jpeg', 0.85);

            // El poster se carga con TextureLoader (a partir de un dataURL) en vez
            // de envolver el canvas directo en un CanvasTexture: con CanvasTexture
            // la imagen no sobrevivía bien el viaje por GLTFExporter. TextureLoader
            // es el mismo mecanismo que ya usan los cuadros normales.
            new THREE.TextureLoader().load(posterDataURL, (posterTexture) => {
                const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight);
                const material = new THREE.MeshStandardMaterial({
                    map: new THREE.VideoTexture(video),
                    side: THREE.DoubleSide,
                    roughness: 0.2
                });

                const videoMesh = new THREE.Mesh(geometry, material);
                videoMesh.name = generarNombreUnico(nombrePiezaDesdeArchivo(fileName));
                videoMesh.castShadow = true;
                videoMesh.userData = {
                    type: 'cuadro',
                    esVideo: true,
                    fileName: fileName,
                    videoDataURL: dataURL,
                    videoElement: video,
                    posterTexture: posterTexture,
                    thumbnailDataURL: posterDataURL,
                    baseSize: { x: meshWidth, y: meshHeight, z: 0.01 }
                };

                aplicarTransformYFicha(videoMesh, transform, fichaTecnica, meshHeight / 2 + 1);

                scene.add(videoMesh);
                objectsInScene.push(videoMesh);
                refrescarListaPiezas();
                if (seleccionar) selectObject(videoMesh);

                video.play().catch(() => {}); // si el navegador bloquea el autoplay, queda pausado en el primer frame
            });
        };

        if (video.duration > 0.15) {
            video.addEventListener('seeked', capturarPoster, { once: true });
            setTimeout(capturarPoster, 3000); // red de seguridad si 'seeked' no llega
            video.currentTime = 0.1;
        } else {
            capturarPoster();
        }
    }, { once: true });

    video.src = dataURL;
}

// Aplica posición/rotación/escala y ficha técnica a un objeto recién creado.
// alturaPorDefecto se usa solo cuando no viene transform (alta al crear un cuadro nuevo).
function aplicarTransformYFicha(obj, transform, fichaTecnica, alturaPorDefecto = 0) {
    if (transform && transform.posicion) {
        obj.position.set(transform.posicion.x, transform.posicion.y, transform.posicion.z);
    } else {
        obj.position.set(0, alturaPorDefecto, 0);
    }

    const rot = (transform && transform.rotacion) || {};
    obj.rotation.set(
        gradosARadianes(rot.x || 0),
        gradosARadianes(rot.y || 0),
        gradosARadianes(rot.z || 0)
    );

    const esc = (transform && transform.escala) || {};
    obj.scale.set(esc.x || 1, esc.y || 1, esc.z || 1);

    if (fichaTecnica) {
        obj.userData.titulo = fichaTecnica.titulo || "";
        obj.userData.artista = fichaTecnica.artista || "";
        obj.userData.anio = fichaTecnica.anio || "";
        obj.userData.tecnica = fichaTecnica.tecnica || "";
        obj.userData.descripcion = fichaTecnica.descripcion || "";
        obj.userData.instalacion = fichaTecnica.instalacion || "";
    }
}

// === 3. PROCESAMIENTO DE MODELOS 3D LOCALES (OBJ + MTL) ===
function handleSculptureUpload(event) {
    const files = Array.from(event.target.files);
    const objFile = files.find(f => f.name.endsWith('.obj'));
    const mtlFile = files.find(f => f.name.endsWith('.mtl'));

    if (!objFile) {
        alert("Por favor selecciona al menos el archivo .obj de la escultura.");
        return;
    }

    const leerComoTexto = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsText(file);
    });

    Promise.all([
        leerComoTexto(objFile),
        mtlFile ? leerComoTexto(mtlFile) : Promise.resolve(null)
    ]).then(([objText, mtlText]) => {
        crearEsculturaDesdeTexto(objText, mtlText, objFile.name, mtlFile ? mtlFile.name : null);
    });
}

// Renderiza una miniatura aislada de la escultura (las esculturas no tienen una
// imagen de origen como los cuadros, así que se genera una vista previa 3D).
// Usa un renderer/escena temporales, descartados apenas se captura la imagen,
// para no dejar contextos WebGL abiertos innecesariamente.
function generarThumbnailEscultura(container, baseSize) {
    const TAMANIO = 96;
    const thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    thumbRenderer.setSize(TAMANIO, TAMANIO);

    const thumbScene = new THREE.Scene();
    thumbScene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
    luzDireccional.position.set(2, 4, 3);
    thumbScene.add(luzDireccional);

    const clon = container.clone(true);
    clon.position.set(0, 0, 0);
    clon.rotation.set(0, 0, 0);
    clon.scale.set(1, 1, 1);
    thumbScene.add(clon);

    const dimensionMax = Math.max(baseSize.x, baseSize.y, baseSize.z, 0.1);
    const camaraThumb = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    camaraThumb.position.set(dimensionMax * 1.4, dimensionMax * 1.1, dimensionMax * 1.4);
    camaraThumb.lookAt(0, baseSize.y / 2, 0);

    thumbRenderer.render(thumbScene, camaraThumb);
    const dataURL = thumbRenderer.domElement.toDataURL('image/png');

    thumbRenderer.dispose();

    return dataURL;
}

function crearEsculturaDesdeTexto(objText, mtlText, objFileName, mtlFileName, opciones = {}) {
    const { transform = null, fichaTecnica = null, seleccionar = true } = opciones;
    const objLoader = new OBJLoader();

    const construirObjeto = (materials = null) => {
        if (materials) {
            materials.preload();
            objLoader.setMaterials(materials);
        }
        const object = objLoader.parse(objText);
        object.name = generarNombreUnico(nombrePiezaDesdeArchivo(objFileName));
        const box = new THREE.Box3().setFromObject(object);
        const tamanoBase = box.getSize(new THREE.Vector3());
        object.position.set(0, -box.min.y, 0);

        const container = new THREE.Group();
        container.name = object.name;
        container.add(object);
        container.castShadow = true;

        container.userData = {
            type: 'escultura',
            objName: objFileName,
            mtlName: mtlFileName,
            objText: objText,
            mtlText: mtlText,
            baseSize: {
                x: tamanoBase.x || 0.01,
                y: tamanoBase.y || 0.01,
                z: tamanoBase.z || 0.01
            }
        };
        container.userData.thumbnailDataURL = generarThumbnailEscultura(container, container.userData.baseSize);

        aplicarTransformYFicha(container, transform, fichaTecnica, 0);

        scene.add(container);
        objectsInScene.push(container);
        refrescarListaPiezas();
        if (seleccionar) selectObject(container);
    };

    if (mtlText) {
        const mtlLoader = new MTLLoader();
        construirObjeto(mtlLoader.parse(mtlText, ''));
    } else {
        construirObjeto();
    }
}

// === 4. SISTEMA DE SELECCIÓN ===
function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycaster.intersectObjects(objectsInScene, true);

    if (intersects.length > 0) {
        let rootObj = intersects[0].object;
        while (rootObj.parent && !objectsInScene.includes(rootObj)) {
            rootObj = rootObj.parent;
        }
        if (objectsInScene.includes(rootObj)) selectObject(rootObj);
    } else {
        if (!transformControls.dragging && event.target === renderer.domElement) {
            deselectObject();
        }
    }
}

// Pestañas del inspector: "Disposición" (posición/orientación/dimensión) y
// "Atributos" (ficha técnica de la pieza) — dos vistas de la misma pieza
// seleccionada, no dos objetos distintos.
function activarTabInspector(nombre) {
    if (!tabBtnDisposicion || !tabBtnAtributos || !tabPanelDisposicion || !tabPanelAtributos) return;
    const esDisposicion = nombre === 'disposicion';
    tabBtnDisposicion.classList.toggle('active', esDisposicion);
    tabBtnAtributos.classList.toggle('active', !esDisposicion);
    tabPanelDisposicion.classList.toggle('active', esDisposicion);
    tabPanelAtributos.classList.toggle('active', !esDisposicion);
}

function selectObject(obj) {
    selectedObject = obj;
    transformControls.attach(obj);

    inspectorEmpty.classList.add('hidden');
    inspectorControls.classList.remove('hidden');
    activarTabInspector('disposicion');
    selectedIndicator.innerText = `Editando: ${obj.name}`;

    actualizarInputsPosicionYRotacion();
    actualizarInputsDimension();

    // Los cuadros son planos (sin profundidad real): ocultar el campo Z.
    dimZRow.classList.toggle('hidden', obj.userData.type === 'cuadro');

    // Cargar metadatos existentes (incluyendo la nueva descripción)
    inputMetaTitle.value = obj.userData.titulo || "";
    inputMetaArtist.value = obj.userData.artista || "";
    inputMetaYear.value = obj.userData.anio || "";
    inputMetaMedium.value = obj.userData.tecnica || "";
    inputMetaDescription.value = obj.userData.descripcion || "";
    inputMetaInstalacion.value = obj.userData.instalacion || "";

    refrescarListaPiezas();
    refrescarSelectorAlineacion();
}

function deselectObject() {
    selectedObject = null;
    transformControls.detach();
    inspectorEmpty.classList.remove('hidden');
    inspectorControls.classList.add('hidden');
    selectedIndicator.innerText = "Ningún objeto seleccionado";

    refrescarListaPiezas();
}

// Reconstruye la grilla de miniaturas del panel derecho a partir de objectsInScene.
// Los cuadros usan directamente la imagen que subió el usuario; las esculturas,
// la miniatura 3D generada al crearlas (userData.thumbnailDataURL).
function refrescarListaPiezas() {
    piecesList.innerHTML = '';
    piecesListEmpty.classList.toggle('hidden', objectsInScene.length > 0);

    objectsInScene.forEach((obj) => {
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'piece-thumb' + (obj === selectedObject ? ' active' : '');

        const img = document.createElement('img');
        img.className = 'piece-thumb-image';
        img.src = obj.userData.imageDataURL || obj.userData.thumbnailDataURL || '';
        img.alt = obj.name;

        const label = document.createElement('span');
        label.className = 'piece-thumb-label';
        label.textContent = obj.name;

        thumb.appendChild(img);
        thumb.appendChild(label);
        thumb.addEventListener('click', () => selectObject(obj));

        piecesList.appendChild(thumb);
    });

    actualizarFlechasPiezas();
}

// Muestra cada flecha solo si hay contenido oculto de ese lado — si todas
// las piezas entran en el ancho visible, no se muestra ninguna flecha.
function actualizarFlechasPiezas() {
    if (!piecesList || !btnPiecesScrollLeft || !btnPiecesScrollRight) return;

    const haySobrante = piecesList.scrollWidth > piecesList.clientWidth + 1;
    const puedeIrIzquierda = haySobrante && piecesList.scrollLeft > 4;
    const puedeIrDerecha = haySobrante && piecesList.scrollLeft < (piecesList.scrollWidth - piecesList.clientWidth - 4);

    btnPiecesScrollLeft.classList.toggle('hidden', !puedeIrIzquierda);
    btnPiecesScrollRight.classList.toggle('hidden', !puedeIrDerecha);
}

// Llena el selector "Igualar posición con" con todas las piezas de la sala
// excepto la seleccionada (usa uuid, estable, en vez del nombre por si dos
// piezas se llaman igual).
function refrescarSelectorAlineacion() {
    selectAlignReference.innerHTML = '';

    const otras = objectsInScene.filter(obj => obj !== selectedObject);
    const hayReferencias = otras.length > 0;

    if (!hayReferencias) {
        const opcion = document.createElement('option');
        opcion.textContent = 'No hay otra pieza en la sala';
        selectAlignReference.appendChild(opcion);
    } else {
        otras.forEach(obj => {
            const opcion = document.createElement('option');
            opcion.value = obj.uuid;
            opcion.textContent = obj.name;
            selectAlignReference.appendChild(opcion);
        });
    }

    selectAlignReference.disabled = !hayReferencias;
    [btnAlignX, btnAlignY, btnAlignZ].forEach(btn => btn.disabled = !hayReferencias);
}

function igualarPosicion(eje) {
    if (!selectedObject) return;
    const referencia = objectsInScene.find(obj => obj.uuid === selectAlignReference.value);
    if (!referencia) return;

    selectedObject.position[eje] = referencia.position[eje];
    actualizarInputsPosicionYRotacion();
}

function deleteSelectedObject() {
    if (!selectedObject) return;
    scene.remove(selectedObject);
    objectsInScene = objectsInScene.filter(item => item !== selectedObject);
    deselectObject();
}

function gradosARadianes(grados) { return grados * (Math.PI / 180); }
function radianesAGrados(radianes) { return Math.round(radianes * (180 / Math.PI)); }

function actualizarInputsPosicionYRotacion() {
    if (!selectedObject) return;
    inputPosX.value = selectedObject.position.x.toFixed(2);
    inputPosY.value = selectedObject.position.y.toFixed(2);
    inputPosZ.value = selectedObject.position.z.toFixed(2);

    inputRotX.value = radianesAGrados(selectedObject.rotation.x);
    inputRotY.value = radianesAGrados(selectedObject.rotation.y);
    inputRotZ.value = radianesAGrados(selectedObject.rotation.z);
}

// Recalcula los 3 campos de dimensión real (m) a partir de la escala actual
// del objeto y su tamaño base (guardado en userData.baseSize al crearlo).
// skipEje: eje que NO hay que reescribir (el que el usuario está tipeando
// en este momento) — solo se usa en móvil, ver aplicarDimension() más
// abajo. Sin skipEje (desktop, comportamiento sin cambios) reescribe los 3
// campos siempre, igual que antes.
function actualizarInputsDimension(skipEje) {
    if (!selectedObject) return;
    const base = selectedObject.userData.baseSize || { x: 1, y: 1, z: 1 };
    if (skipEje !== 'x') inputDimX.value = (selectedObject.scale.x * base.x).toFixed(2);
    if (skipEje !== 'y') inputDimY.value = (selectedObject.scale.y * base.y).toFixed(2);
    if (skipEje !== 'z') inputDimZ.value = (selectedObject.scale.z * base.z).toFixed(2);
}

function updateInspectorValues() {
    if (!selectedObject) return;
    actualizarInputsPosicionYRotacion();
}

function setupInspectorInputs() {
    const applyPosicionYRotacion = () => {
        if (!selectedObject) return;

        selectedObject.position.set(
            parseFloat(inputPosX.value) || 0,
            parseFloat(inputPosY.value) || 0,
            parseFloat(inputPosZ.value) || 0
        );

        selectedObject.rotation.set(
            gradosARadianes(parseFloat(inputRotX.value) || 0),
            gradosARadianes(parseFloat(inputRotY.value) || 0),
            gradosARadianes(parseFloat(inputRotZ.value) || 0)
        );
    };

    inputPosX.addEventListener('input', applyPosicionYRotacion);
    inputPosY.addEventListener('input', applyPosicionYRotacion);
    inputPosZ.addEventListener('input', applyPosicionYRotacion);
    inputRotX.addEventListener('input', applyPosicionYRotacion);
    inputRotY.addEventListener('input', applyPosicionYRotacion);
    inputRotZ.addEventListener('input', applyPosicionYRotacion);

    // Dimensiones reales: editar un eje recalcula su escala; con la proporción
    // bloqueada, el factor de cambio se aplica también a los otros dos ejes.
    const inputsDimension = { x: inputDimX, y: inputDimY, z: inputDimZ };
    const aplicarDimension = (eje) => {
        if (!selectedObject) return;
        const base = selectedObject.userData.baseSize || { x: 1, y: 1, z: 1 };
        const valorDeseado = parseFloat(inputsDimension[eje].value) || 0.01;
        const escalaNueva = valorDeseado / (base[eje] || 1);

        if (checkLockProportion.checked) {
            const escalaActual = selectedObject.scale[eje] || 1;
            const factor = escalaNueva / escalaActual;
            selectedObject.scale.multiplyScalar(factor);
        } else {
            selectedObject.scale[eje] = escalaNueva;
        }

        // En móvil no se reescribe el campo que se está tipeando (eje) —
        // eso era lo que cortaba la escritura de decimales a mitad de
        // tecla ("1.5" se convertía en "1.00" apenas se tipeaba el "1").
        // Los otros dos ejes sí se actualizan (necesario con proporción
        // bloqueada). Desktop sigue igual: reescribe los 3 siempre.
        actualizarInputsDimension(window.rcIsMobile && window.rcIsMobile() ? eje : undefined);
    };

    inputDimX.addEventListener('input', () => aplicarDimension('x'));
    inputDimY.addEventListener('input', () => aplicarDimension('y'));
    inputDimZ.addEventListener('input', () => aplicarDimension('z'));

    // Igualar posición exacta con otra pieza de la sala, eje por eje
    btnAlignX.addEventListener('click', () => igualarPosicion('x'));
    btnAlignY.addEventListener('click', () => igualarPosicion('y'));
    btnAlignZ.addEventListener('click', () => igualarPosicion('z'));

    // Guardado de textos curatoriales en el objeto
    inputMetaTitle.addEventListener('input', () => { if(selectedObject) selectedObject.userData.titulo = inputMetaTitle.value; });
    inputMetaArtist.addEventListener('input', () => { if(selectedObject) selectedObject.userData.artista = inputMetaArtist.value; });
    inputMetaYear.addEventListener('input', () => { if(selectedObject) selectedObject.userData.anio = inputMetaYear.value; });
    inputMetaMedium.addEventListener('input', () => { if(selectedObject) selectedObject.userData.tecnica = inputMetaMedium.value; });
    inputMetaDescription.addEventListener('input', () => { if(selectedObject) selectedObject.userData.descripcion = inputMetaDescription.value; });
    inputMetaInstalacion.addEventListener('input', () => { if(selectedObject) selectedObject.userData.instalacion = inputMetaInstalacion.value; });
}

// === 5. SISTEMAS DE GUARDADO Y VISTA PREVIA ===

// Arma el grupo que se exporta a GLB. Las piezas normales se clonan tal cual;
// las de video no se pueden clonar (compartirían el material con el video en
// vivo de la escena real, y GLTFExporter no puede serializar un VideoTexture de
// todos modos) — para esas se arma una malla nueva con el frame fijo (poster).
function construirGrupoExportable(incluirPlano) {
    const grupo = new THREE.Group();
    if (incluirPlano && floorMesh) grupo.add(floorMesh.clone());

    objectsInScene.forEach(obj => {
        if (obj.userData.esVideo) {
            const meshExportable = new THREE.Mesh(
                obj.geometry,
                new THREE.MeshStandardMaterial({
                    map: obj.userData.posterTexture,
                    side: THREE.DoubleSide,
                    roughness: 0.2
                })
            );
            meshExportable.name = obj.name;
            meshExportable.position.copy(obj.position);
            meshExportable.rotation.copy(obj.rotation);
            meshExportable.scale.copy(obj.scale);
            grupo.add(meshExportable);
        } else {
            grupo.add(obj.clone());
        }
    });

    return grupo;
}

// URL del blob de la última vista previa, para poder liberarla (evitar fugas de
// memoria) cuando se genera una nueva o se cierra el modal.
let previewObjectURL = null;

function previewSceneInViewer() {
    if (objectsInScene.length === 0) {
        alert("Primero agrega alguna obra a la sala para poder visualizarla.");
        return;
    }

    deselectObject();

    const exporter = new GLTFExporter();
    const exportGroup = construirGrupoExportable(true);

    exporter.parse(
        exportGroup,
        function (gltf) {
            if (previewObjectURL) URL.revokeObjectURL(previewObjectURL);

            const blob = new Blob([gltf], { type: 'model/gltf-binary' });
            previewObjectURL = URL.createObjectURL(blob);
            previewModelViewer.src = previewObjectURL;

            previewModalOverlay.classList.remove('hidden');
        },
        function (error) {
            console.error("Error al compilar la vista previa:", error);
            alert("Ocurrió un error al generar la vista previa. Revisá la consola para más detalles.");
        },
        { binary: true }
    );
}

function cerrarModalVistaPrevia() {
    previewModalOverlay.classList.add('hidden');
    previewModelViewer.src = '';
    if (previewObjectURL) {
        URL.revokeObjectURL(previewObjectURL);
        previewObjectURL = null;
    }
}

// Exporta el proyecto completo y editable (incluye assets embebidos en base64/texto)
// para poder retomar la edición más adelante con "Cargar Proyecto".
function saveProjectFile() {
    deselectObject();

    const projectData = {
        version: 1,
        sala: salaData,
        dimensiones_sala: {
            ancho: parseFloat(inputWidth.value),
            largo: parseFloat(inputDepth.value)
        },
        objetos: objectsInScene.map(obj => {
            const base = {
                nombre: obj.name,
                tipo: obj.userData.type || 'objeto',
                posicion: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                rotacion: {
                    x: radianesAGrados(obj.rotation.x),
                    y: radianesAGrados(obj.rotation.y),
                    z: radianesAGrados(obj.rotation.z)
                },
                escala: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
                ficha_tecnica: {
                    titulo: obj.userData.titulo || "",
                    artista: obj.userData.artista || "",
                    anio: obj.userData.anio || "",
                    tecnica: obj.userData.tecnica || "",
                    descripcion: obj.userData.descripcion || "",
                    instalacion: obj.userData.instalacion || ""
                }
            };

            if (obj.userData.type === 'cuadro' && obj.userData.esVideo) {
                base.archivoOriginal = obj.userData.fileName;
                base.esVideo = true;
                base.videoDataURL = obj.userData.videoDataURL;
            } else if (obj.userData.type === 'cuadro') {
                base.archivoOriginal = obj.userData.fileName;
                base.imageDataURL = obj.userData.imageDataURL;
            } else if (obj.userData.type === 'escultura') {
                base.objFileName = obj.userData.objName;
                base.mtlFileName = obj.userData.mtlName;
                base.objText = obj.userData.objText;
                base.mtlText = obj.userData.mtlText;
            }

            return base;
        })
    };

    const jsonString = JSON.stringify(projectData);
    triggerDownload(jsonString, 'proyecto_insite.json', 'application/json');
}

// Lee un .json de proyecto (generado por "Guardar Proyecto") y reconstruye la escena completa.
function loadProjectFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        let data;
        try {
            data = JSON.parse(reader.result);
        } catch (e) {
            alert("El archivo de proyecto no tiene un formato JSON válido.");
            return;
        }
        cargarProyectoDesdeDatos(data);
    };
    reader.readAsText(file);
    event.target.value = ''; // permite volver a cargar el mismo archivo si hace falta
}

function cargarProyectoDesdeDatos(data) {
    deselectObject();
    objectsInScene.forEach(obj => scene.remove(obj));
    objectsInScene = [];

    salaData = {
        titulo: (data.sala && data.sala.titulo) || '',
        artista: (data.sala && data.sala.artista) || '',
        anio: (data.sala && data.sala.anio) || '',
        textoCuratorial: (data.sala && data.sala.textoCuratorial) || ''
    };
    actualizarIndicadorSala();

    const ancho = (data.dimensiones_sala && data.dimensiones_sala.ancho) || parseFloat(inputWidth.value);
    const largo = (data.dimensiones_sala && data.dimensiones_sala.largo) || parseFloat(inputDepth.value);
    inputWidth.value = ancho;
    inputDepth.value = largo;
    buildRoom(ancho, largo);

    (data.objetos || []).forEach(obj => {
        const opciones = { transform: obj, fichaTecnica: obj.ficha_tecnica, seleccionar: false };

        if (obj.tipo === 'cuadro' && obj.esVideo && obj.videoDataURL) {
            crearVideoDesdeDataURL(obj.videoDataURL, obj.archivoOriginal || 'video.mp4', opciones);
        } else if (obj.tipo === 'cuadro' && obj.imageDataURL) {
            crearCuadroDesdeDataURL(obj.imageDataURL, obj.archivoOriginal || 'imagen.png', opciones);
        } else if (obj.tipo === 'escultura' && obj.objText) {
            crearEsculturaDesdeTexto(obj.objText, obj.mtlText, obj.objFileName || 'objeto.obj', obj.mtlFileName || null, opciones);
        }
    });
}

// === 6. FICHA DE LA SALA (datos de la exposición en su conjunto) ===

function abrirModalSala() {
    inputSalaTitulo.value = salaData.titulo;
    inputSalaArtista.value = salaData.artista;
    inputSalaAnio.value = salaData.anio;
    textareaSalaTextoCuratorial.value = salaData.textoCuratorial;
    salaModalOverlay.classList.remove('hidden');
    inputSalaTitulo.focus();
}

function cerrarModalSala() {
    salaModalOverlay.classList.add('hidden');
}

function guardarFichaSala() {
    salaData = {
        titulo: inputSalaTitulo.value.trim(),
        artista: inputSalaArtista.value.trim(),
        anio: inputSalaAnio.value.trim(),
        textoCuratorial: textareaSalaTextoCuratorial.value.trim()
    };
    actualizarIndicadorSala();
    cerrarModalSala();
}

function actualizarIndicadorSala() {
    const completa = !!(salaData.titulo || salaData.artista || salaData.anio || salaData.textoCuratorial);
    salaFichaCheck.classList.toggle('hidden', !completa);

    const nombre = salaData.titulo || 'Sin título';
    if (editorNombreSalaValor) editorNombreSalaValor.textContent = nombre;
    if (editorProyectoLabel) editorProyectoLabel.textContent = `Editando proyecto: ${nombre}`;
}

// === 7. EXPORTACIÓN UNIFICADA (Modal: plano base + JSON vinculado) ===

function abrirModalExportacion() {
    if (objectsInScene.length === 0) {
        alert("Primero agrega alguna obra a la sala para poder exportarla.");
        return;
    }
    deselectObject();
    exportModalOverlay.classList.remove('hidden');
}

function cerrarModalExportacion() {
    exportModalOverlay.classList.add('hidden');
}

function sanitizarNombreArchivo(nombre) {
    const limpio = nombre
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase();
    return limpio || 'sala_exposicion';
}

function buildAttributesData(nombreSala) {
    const projectData = {
        nombre_sala: nombreSala,
        artista_colectivo: salaData.artista,
        anio_exposicion: salaData.anio,
        texto_curatorial: salaData.textoCuratorial,
        dimensiones_sala: {
            ancho: parseFloat(inputWidth.value),
            largo: parseFloat(inputDepth.value)
        },
        obras: objectsInScene.map(obj => {
            const objData = {
                nombre: obj.name,
                tipo: obj.userData.type || 'objeto',
                archivoOriginal: obj.userData.fileName || obj.userData.objName || '',
                posicion: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                rotacion: {
                    x: radianesAGrados(obj.rotation.x),
                    y: radianesAGrados(obj.rotation.y),
                    z: radianesAGrados(obj.rotation.z)
                },
                escala: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
                ficha_tecnica: {
                    titulo: obj.userData.titulo || "Sin título",
                    artista: obj.userData.artista || "Anónimo",
                    anio: obj.userData.anio || "-",
                    tecnica: obj.userData.tecnica || "-",
                    descripcion: obj.userData.descripcion || "",
                    instalacion: obj.userData.instalacion || ""
                }
            };

            // El GLB exportado solo puede llevar un frame fijo del video (poster);
            // acá va el video real para que el visor lo aplique como textura en 3D.
            if (obj.userData.esVideo) {
                objData.esVideo = true;
                objData.videoDataURL = obj.userData.videoDataURL;
            }

            return objData;
        })
    };

    return projectData;
}

function buildAttributesJSON(nombreSala) {
    return JSON.stringify(buildAttributesData(nombreSala), null, 2);
}

function confirmarExportacion() {
    const nombreCrudo = salaData.titulo || 'Sala de Exposición';
    const nombreArchivo = sanitizarNombreArchivo(nombreCrudo);
    const incluirPlano = checkExportIncludeFloor.checked;
    const incluirJson = checkExportIncludeJson.checked;

    const exporter = new GLTFExporter();
    const exportGroup = construirGrupoExportable(incluirPlano);

    exporter.parse(
        exportGroup,
        function (gltf) {
            triggerDownload(gltf, `${nombreArchivo}.glb`, 'model/gltf-binary');

            if (incluirJson) {
                const jsonString = buildAttributesJSON(nombreCrudo);
                triggerDownload(jsonString, `${nombreArchivo}.json`, 'application/json');
            }

            cerrarModalExportacion();
        },
        function (error) {
            console.error("Error al exportar la galería:", error);
            alert("Ocurrió un error al exportar. Revisá la consola para más detalles.");
        },
        { binary: true }
    );
}

function triggerDownload(content, fileName, contentType) {
    const blob = content instanceof ArrayBuffer ? new Blob([content], { type: contentType }) : new Blob([content], { type: contentType });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera.updateProjectionMatrix();
    // En celular, devicePixelRatio completo (2-3x en la mayoría de los
    // iPhone) multiplica bastante la memoria de GPU que pide el render
    // target, encima de la que ya usa cualquier textura grande en escena
    // — puede ser lo que empuja a un dispositivo justo de memoria a fallar
    // al cargar una textura. Tope conservador solo en móvil; en escritorio
    // se mantiene el valor completo.
    renderer.setPixelRatio(window.rcIsMobile && window.rcIsMobile() ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio);
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

document.addEventListener('DOMContentLoaded', initEditor);