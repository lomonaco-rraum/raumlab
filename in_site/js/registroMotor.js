/* ==========================================================================
   in_SITE - REGISTRO: motor de escena para documentación exportable
   (registroMotor.js)
   No es una variante de crearMotorVisor() (motorVisor.js) — ese motor trae
   RA + video + panel curatorial interactivo empaquetados en un solo closure,
   y Registro necesita en cambio exponer la escena/cámara/renderer crudos
   para que los módulos de exportación (vistas ortogonales, cotas, 360°)
   armen sus propias cámaras sobre la MISMA escena ya cargada. Sí reutiliza
   de motorVisor.js: normalizarDatosJSON() y poblarFichaSala() (ambas ya
   exportadas de nivel superior, sin duplicar esa lógica acá).
   ========================================================================== */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { normalizarDatosJSON, poblarFichaSala } from './motorVisor.js';

// refs: canvasContainer (div donde se monta el canvas de preview orbital) +
// los mismos refs de "ficha de sala" que ya usa poblarFichaSala en
// motorVisor.js (salaPlaceholder, salaDatosReales, salaTitulo,
// salaMetadatos, salaTextoCuratorial).
export function crearMotorRegistro(refs) {
    const { canvasContainer } = refs;

    let scene, camera, renderer, controls;
    let escenaCargada = null;
    let datosProyecto = null;
    let obrasProcesadas = [];

    function initThree() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xFAFAFA);

        camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
        camera.position.set(4, 3, 6);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        canvasContainer.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 1, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.7);
        luzDireccional.position.set(4, 10, 5);
        scene.add(luzDireccional);

        window.addEventListener('resize', onResize);

        animate();
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    function onResize() {
        if (!canvasContainer.clientWidth || !canvasContainer.clientHeight) return;
        camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    }

    // Mismo patrón que encuadrarCamara() en motorVisor.js: encuadre
    // automático por bounding box, reusado acá tal cual porque Registro
    // también necesita esta lógica para su vista orbital de previsualización.
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

    function limpiarEscenaAnterior() {
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

    initThree();

    return {
        cargarGLB(url) {
            limpiarEscenaAnterior();

            const loader = new GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    escenaCargada = gltf.scene;
                    scene.add(escenaCargada);
                    encuadrarCamara(escenaCargada);
                },
                undefined,
                (error) => {
                    console.error("Error al cargar el GLB:", error);
                    alert("No se pudo cargar la escena .GLB. Revisá que el archivo sea válido.");
                }
            );
        },

        setDatosProyecto(json) {
            datosProyecto = json;
            obrasProcesadas = normalizarDatosJSON(json);
            poblarFichaSala(refs, json);
        },

        limpiarDatosProyecto() {
            datosProyecto = null;
            obrasProcesadas = [];
            poblarFichaSala(refs, null);
        },

        // Getters de solo lectura para que los módulos de exportación
        // (vistas ortogonales, cotas, 360°) armen sus propias cámaras y
        // renders sobre la misma escena/datos ya cargados, sin duplicar
        // estado.
        obtenerEscena() { return scene; },
        obtenerRenderer() { return renderer; },
        obtenerCamaraActual() { return camera; },
        obtenerEscenaCargada() { return escenaCargada; },
        obtenerDatosProyecto() { return datosProyecto; },
        obtenerObrasProcesadas() { return obrasProcesadas; }
    };
}
