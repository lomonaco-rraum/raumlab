/* ==========================================================================
   in_SITE - MOTOR DE VISUALIZACIÓN COMPARTIDO (motorVisor.js)
   Three.js + RA (vía un <model-viewer> invisible) + panel curatorial + video
   como textura real. Lo usan tanto viewer.html ("Galería", tu propia escena)
   como coleccion.html ("Colección rraum.LAB", las muestras del estudio) —
   antes vivía duplicado en viewer.js; ver [[project_in-site]] en memoria.
   ========================================================================== */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Adapta la estructura de datos del editor in_SITE a un formato uniforme,
// independientemente de si viene con la propiedad raíz "obras" o mapeado por IDs.
export function normalizarDatosJSON(datosSucios) {
    if (!datosSucios) return [];

    let arregloObrasRaw = [];

    if (datosSucios.obras && Array.isArray(datosSucios.obras)) {
        arregloObrasRaw = datosSucios.obras;
    } else if (Array.isArray(datosSucios)) {
        arregloObrasRaw = datosSucios;
    } else if (typeof datosSucios === 'object') {
        return Object.entries(datosSucios).map(([key, item]) => {
            const ficha = item.ficha_tecnica || item || {};
            return {
                id: item.nombre || item.id || key,
                artista: ficha.artista || "Artista Desconocido",
                titulo: ficha.titulo || item.nombre || "Sin Título",
                tecnica: ficha.tecnica || "Técnica mixta",
                dimensiones: ficha.dimensiones || "Dimensiones variables",
                anio: ficha.anio || "S/F",
                descripcion: ficha.descripcion || "",
                instalacion: ficha.instalacion || "",
                esVideo: !!item.esVideo,
                videoDataURL: item.videoDataURL || null
            };
        });
    }

    return arregloObrasRaw.map((item, index) => {
        const ficha = item.ficha_tecnica || {};
        return {
            id: item.nombre || `obra_${index}`,
            artista: ficha.artista || item.artista || "Artista Desconocido",
            titulo: ficha.titulo || item.titulo || item.nombre || "Sin Título",
            tecnica: ficha.tecnica || item.tecnica || "Técnica mixta",
            dimensiones: ficha.dimensiones || item.dimensiones || "Dimensiones variables",
            anio: ficha.anio || item.anio || "S/F",
            descripcion: ficha.descripcion || item.descripcion || "",
            instalacion: ficha.instalacion || item.instalacion || "",
            esVideo: !!item.esVideo,
            videoDataURL: item.videoDataURL || null
        };
    });
}

// refs: los IDs de DOM son los mismos en viewer.html y coleccion.html
// (canvasContainer, arModelViewer, btnAR, panelCedula, listaObrasIndexadas,
// cedulaPlaceholder, cedulaDatosReales, cedulaArtista, cedulaTitulo,
// cedulaMetadatos, cedulaDescripcion, cedulaInstalacion).
export function crearMotorVisor(refs) {
    const {
        canvasContainer, arModelViewer, btnAR,
        panelCedula, listaObrasIndexadas, cedulaPlaceholder, cedulaDatosReales,
        cedulaArtista, cedulaTitulo, cedulaMetadatos, cedulaDescripcion, cedulaInstalacion,
        salasListaContainer, salaFichaContainer, salaFichaVolverBtn, onVolverASalas,
        salaPlaceholder, salaDatosReales, salaTitulo, salaMetadatos, salaTextoCuratorial
    } = refs;

    let listaObrasProcesadas = [];
    let mapaObrasPorNombre = new Map();
    let escenaCargada = null;
    let videosActivos = [];

    let scene, camera, renderer, controls;

    function initThree() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xFAFAFA);

        camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
        camera.position.set(4, 3, 6);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        renderer.shadowMap.enabled = true;
        canvasContainer.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 1, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.7);
        luzDireccional.position.set(4, 10, 5);
        scene.add(luzDireccional);

        renderer.domElement.addEventListener('click', onCanvasClick);
        window.addEventListener('resize', onResize);

        animate();
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    function onResize() {
        camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    }

    function encuadrarCamara(objeto) {
        const box = new THREE.Box3().setFromObject(objeto);
        const centro = box.getCenter(new THREE.Vector3());
        const tamano = box.getSize(new THREE.Vector3());
        const dimensionMax = Math.max(tamano.x, tamano.y, tamano.z, 1);

        controls.target.copy(centro);
        camera.position.set(
            centro.x + dimensionMax * 0.9,
            centro.y + dimensionMax * 0.6,
            centro.z + dimensionMax * 0.9
        );
        camera.near = dimensionMax / 100;
        camera.far = dimensionMax * 50;
        camera.updateProjectionMatrix();
        controls.update();
    }

    function onCanvasClick(event) {
        if (mapaObrasPorNombre.size === 0 || !escenaCargada) return;

        const rect = renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const intersects = raycaster.intersectObject(escenaCargada, true);
        if (intersects.length === 0) return;

        let nodo = intersects[0].object;
        while (nodo && !mapaObrasPorNombre.has(nodo.name)) {
            nodo = nodo.parent;
        }
        if (nodo) mostrarObraEnPanel(nodo.name);
    }

    function limpiarEscenaAnterior() {
        videosActivos.forEach(video => { video.pause(); video.src = ''; });
        videosActivos = [];

        if (!escenaCargada) return;
        escenaCargada.traverse((nodo) => {
            if (nodo.isMesh) {
                nodo.geometry.dispose();
                const materiales = Array.isArray(nodo.material) ? nodo.material : [nodo.material];
                materiales.forEach(mat => {
                    if (mat.map) mat.map.dispose();
                    mat.dispose();
                });
            }
        });
        scene.remove(escenaCargada);
        escenaCargada = null;
    }

    function vincularVideosYObras() {
        if (!escenaCargada || listaObrasProcesadas.length === 0) return;

        escenaCargada.traverse((nodo) => {
            if (!nodo.isMesh) return;
            const obra = mapaObrasPorNombre.get(nodo.name);
            if (!obra || !obra.esVideo || !obra.videoDataURL) return;
            if (nodo.userData.videoVinculado) return;

            nodo.userData.videoVinculado = true;

            const video = document.createElement('video');
            video.loop = true;
            video.muted = true;
            video.setAttribute('muted', '');
            video.playsInline = true;
            video.setAttribute('playsinline', '');

            video.addEventListener('error', () => {
                console.error(`No se pudo cargar el video de la pieza "${obra.id}":`, video.error);
            });

            video.addEventListener('loadeddata', () => {
                const videoTexture = new THREE.VideoTexture(video);

                nodo.material = nodo.material.clone();
                nodo.material.map = videoTexture;
                nodo.material.needsUpdate = true;

                videosActivos.push(video);
                video.play().catch((err) => console.error(`No se pudo reproducir el video de "${obra.id}":`, err));
            }, { once: true });

            video.src = obra.videoDataURL;
        });
    }

    // Columna izquierda: lista de salas (para elegir) ↔ ficha de la sala ya
    // cargada (info del curador — título, artista/colectivo, año, texto
    // curatorial). Son dos estados excluyentes de la MISMA columna, no
    // pestañas del panel derecho (ese queda dedicado solo a las piezas).
    function mostrarListaDeSalas() {
        if (!salasListaContainer || !salaFichaContainer) return;
        salasListaContainer.classList.remove('hidden');
        salaFichaContainer.classList.add('hidden');
    }

    function mostrarFichaDeSala() {
        if (!salasListaContainer || !salaFichaContainer) return;
        salasListaContainer.classList.add('hidden');
        salaFichaContainer.classList.remove('hidden');
    }

    if (salaFichaVolverBtn) {
        salaFichaVolverBtn.addEventListener('click', () => {
            mostrarListaDeSalas();
            if (onVolverASalas) onVolverASalas();
        });
    }

    // Completa el texto de la ficha de sala con los campos nuevos del JSON
    // (a nivel de toda la exposición, distintos de la ficha técnica por
    // pieza) — ver buildAttributesData en editor.js.
    function poblarFichaSala(datosJSON) {
        if (!salaPlaceholder || !salaDatosReales) return;

        const titulo = (datosJSON && datosJSON.nombre_sala) || '';
        const artista = (datosJSON && datosJSON.artista_colectivo) || '';
        const anio = (datosJSON && datosJSON.anio_exposicion) || '';
        const texto = (datosJSON && datosJSON.texto_curatorial) || '';

        const hayDatos = !!(titulo || artista || anio || texto);

        if (!hayDatos) {
            salaPlaceholder.style.display = 'block';
            salaDatosReales.style.display = 'none';
            return;
        }

        salaPlaceholder.style.display = 'none';
        salaDatosReales.style.display = 'block';

        if (salaTitulo) salaTitulo.textContent = titulo || 'Sin título';
        if (salaMetadatos) salaMetadatos.textContent = [artista, anio].filter(Boolean).join(' — ');
        if (salaTextoCuratorial) salaTextoCuratorial.textContent = texto;
    }

    function mostrarObraEnPanel(idObra) {
        const obra = listaObrasProcesadas.find(o => o.id === idObra);
        if (!obra) {
            console.warn(`No se encontró información para la obra con ID: ${idObra}`);
            return;
        }

        document.querySelectorAll('.viewer-btn').forEach(btn => btn.classList.remove('active-item'));
        const botonActivo = document.getElementById(`btn-item-${idObra}`);
        if (botonActivo) botonActivo.classList.add('active-item');

        cedulaPlaceholder.style.display = 'none';
        cedulaDatosReales.style.display = 'block';

        cedulaArtista.textContent = obra.artista;
        cedulaTitulo.textContent = obra.titulo;
        cedulaMetadatos.textContent = `${obra.anio} — ${obra.tecnica} — ${obra.dimensiones}`;
        cedulaDescripcion.textContent = obra.descripcion || "Esta obra no cuenta con un texto curatorial registrado.";

        if (cedulaInstalacion) {
            if (obra.instalacion) {
                cedulaInstalacion.textContent = `Traslado y montaje: ${obra.instalacion}`;
                cedulaInstalacion.style.display = 'block';
            } else {
                cedulaInstalacion.style.display = 'none';
            }
        }
    }

    function construirInterfazCuratorial() {
        listaObrasIndexadas.innerHTML = '';
        mapaObrasPorNombre = new Map(listaObrasProcesadas.map(obra => [obra.id, obra]));

        if (listaObrasProcesadas.length === 0) {
            panelCedula.classList.remove('active');
            return;
        }

        listaObrasProcesadas.forEach(obra => {
            const botonObra = document.createElement('button');
            botonObra.className = 'viewer-btn';
            botonObra.id = `btn-item-${obra.id}`;
            botonObra.style.textAlign = 'left';
            botonObra.style.textTransform = 'none';
            botonObra.style.letterSpacing = 'normal';

            botonObra.innerHTML = `<strong style="font-weight: 600;">${obra.artista}</strong> — <span style="font-style: italic;">${obra.titulo}</span>`;
            botonObra.addEventListener('click', () => mostrarObraEnPanel(obra.id));

            listaObrasIndexadas.appendChild(botonObra);
        });

        panelCedula.classList.add('active');
        cedulaPlaceholder.style.display = 'block';
        cedulaDatosReales.style.display = 'none';

        vincularVideosYObras();
    }

    if (btnAR) {
        // Solo en celular: "Ver en Espacio Real" pasa a "Ver en RA" para
        // ser consistente con el resto del producto, sin tocar el texto
        // de escritorio.
        if (window.rcIsMobile && window.rcIsMobile()) {
            btnAR.textContent = 'Ver en RA';
        }
        btnAR.addEventListener('click', () => {
            if (!arModelViewer) return;
            if (arModelViewer.canActivateAR === false) {
                alert("Tu dispositivo o navegador no soporta Realidad Aumentada.");
                return;
            }
            arModelViewer.activateAR();
        });
    }

    initThree();

    return {
        // Carga la geometría (GLB) en la escena Three.js y, si hay un
        // model-viewer de RA, le pasa la misma URL para que la RA siga andando.
        cargarGLB(url) {
            if (arModelViewer) arModelViewer.src = url;

            limpiarEscenaAnterior();

            const loader = new GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    escenaCargada = gltf.scene;
                    scene.add(escenaCargada);
                    encuadrarCamara(escenaCargada);
                    vincularVideosYObras();
                    mostrarFichaDeSala();
                },
                undefined,
                (error) => {
                    console.error("Error al cargar el GLB:", error);
                    alert("No se pudo cargar la escena .GLB. Revisá que el archivo sea válido.");
                }
            );
        },

        // Aplica la ficha técnica (ya parseada con normalizarDatosJSON) y la
        // ficha de sala (mismo JSON, campos a nivel de toda la exposición),
        // reconstruye el panel curatorial + vincula videos si la escena ya cargó.
        setFichaTecnica(datosJSON) {
            listaObrasProcesadas = normalizarDatosJSON(datosJSON);
            poblarFichaSala(datosJSON);
            construirInterfazCuratorial();
        },

        limpiarFichaTecnica() {
            listaObrasProcesadas = [];
            mapaObrasPorNombre = new Map();
            poblarFichaSala(null);
            panelCedula.classList.remove('active');
        }
    };
}
