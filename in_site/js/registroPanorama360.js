/* ==========================================================================
   in_SITE - REGISTRO: (d) imagen 360° equirectangular desde un punto XYZ
   (registroPanorama360.js)
   Técnica estándar para volcar un cubemap a equirectangular: THREE.CubeCamera
   renderiza la escena en 6 caras desde el punto elegido, un shader de
   "unwrap" muestrea ese cubemap por dirección de rayo (θ/φ esféricos) sobre
   un quad de pantalla completa. Mismo patrón de render-a-canvas-2D que ya
   usa registroExportViews.js (renderizarVistaOffscreen): renderiza sobre el
   renderer/canvas COMPARTIDO del motor (no abre un contexto WebGL nuevo),
   copia con ctx.drawImage(renderer.domElement, ...) y restaura tamaño/clear
   color al terminar.
   ========================================================================== */

import * as THREE from 'three';
import { dibujarCreditoImagen, detectarPiso } from './registroExportViews.js';

const VERTEX_SHADER = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

// Convención de orientación: el centro horizontal de la imagen (vUv.x = 0.5)
// mira hacia el CENTRO de la sala (el origen, en XZ) visto desde el punto
// elegido — no una dirección fija del mundo — así al abrir la panorámica en
// cualquier visor, la vista inicial ya cae "hacia adentro" en vez de mirar
// hacia afuera/a lo largo de una pared. uYaw es ese ángulo, calculado en JS
// (calcularYawHaciaCentro) y sumado a phi acá.
// theta usa (1.0 - vUv.y): el atributo `uv` de PlaneGeometry trae v=0 en el
// borde INFERIOR del plano (estándar en three.js) — con theta = vUv.y * PI
// a secas quedaba invertido (el piso arriba, el techo/fondo abajo, bug
// confirmado en la primera exportación real).
const FRAGMENT_SHADER = `
    varying vec2 vUv;
    uniform samplerCube tCube;
    uniform float uYaw;
    #define PI 3.14159265358979
    void main() {
        float phi = (vUv.x - 0.5) * 2.0 * PI + uYaw;
        float theta = (1.0 - vUv.y) * PI;
        vec3 dir = vec3(sin(theta) * sin(phi), cos(theta), -sin(theta) * cos(phi));
        gl_FragColor = textureCube(tCube, dir);
    }
`;

// Ángulo (radianes) que hay que sumarle a phi para que phi=0 (centro
// horizontal de la imagen) apunte, desde `punto`, hacia el origen del
// mundo — en vez de siempre hacia -Z. Derivación: con phi=0 la fórmula del
// shader da dir_xz=(sin(uYaw), -cos(uYaw)); igualando eso a la dirección
// normalizada (punto→origen) despeja uYaw = atan2(-punto.x, punto.z). Si el
// punto está prácticamente en el origen (sala vacía de referencia, sin
// dirección "hacia el centro" definida) se usa 0 — mismo criterio que
// tenía antes (mirar hacia -Z).
function calcularYawHaciaCentro(punto) {
    const dist = Math.hypot(punto.x, punto.z);
    if (dist < 1e-6) return 0;
    return Math.atan2(-punto.x, punto.z);
}

// punto: { x, y, z } en coordenadas del mundo (Y ya viene con la altura de
// ojos fija resuelta por quien llama, ver registro.js). incluirPiso: única
// variable de contenido del panorama (aparte del punto/calidad) — todo lo
// demás que no sea piso/piezas queda transparente (canal alfa real), como
// si las piezas flotaran, igual criterio que (a)/(b) en registroExportViews.js.
export function exportarPanorama360(motor, punto, opciones = {}) {
    const { ladoMaximoPx = 3000, logo = null, incluirPiso = true } = opciones;
    const escenaCargada = motor.obtenerEscenaCargada();
    if (!escenaCargada) throw new Error('No hay ningún proyecto cargado.');

    const renderer = motor.obtenerRenderer();
    const scene = motor.obtenerEscena();
    const anchoPx = ladoMaximoPx;
    const altoPx = Math.round(ladoMaximoPx / 2);

    const piso = detectarPiso(escenaCargada);
    const visibilidadOriginalPiso = piso ? piso.visible : null;
    if (piso) piso.visible = incluirPiso;

    // Cada cara del cubo cubre 90° (un cuarto del panorama final) — 1/4 del
    // ancho de salida alcanza sin perder detalle perceptible. Tope duro en
    // 2048: mismo motivo de estabilidad en móvil que ya motivó
    // MAX_PIXEL_DIM_SEGURO en registro.js.
    const cubeSize = Math.min(2048, Math.max(512, Math.round(anchoPx / 4)));
    const diagonal = new THREE.Box3().setFromObject(escenaCargada).getSize(new THREE.Vector3()).length();
    const far = Math.max(diagonal * 3, 20);

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(cubeSize);
    const cubeCamera = new THREE.CubeCamera(0.05, far, cubeRenderTarget);
    cubeCamera.position.set(punto.x, punto.y, punto.z);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            tCube: { value: cubeRenderTarget.texture },
            uYaw: { value: calcularYawHaciaCentro(punto) }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER
    });
    const quadScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quadScene.add(quad);
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const colorClearOriginal = new THREE.Color();
    renderer.getClearColor(colorClearOriginal);
    const alphaClearOriginal = renderer.getClearAlpha();
    const fondoOriginal = scene.background;
    const contenedor = renderer.domElement.parentElement;
    const anchoBase = contenedor.clientWidth;
    const altoBase = contenedor.clientHeight;

    // Fondo transparente real (alfa 0) para el render del cubemap — donde
    // no hay piso/piezas queda sin pintar, no gris. El renderer del motor
    // ya está creado con alpha:true (registroMotor.js) y el pase del quad
    // de abajo no mezcla contra esto (autoClear limpia el buffer con este
    // mismo clear antes de dibujar el quad) — mismo criterio que
    // renderizarVistaOffscreen() en registroExportViews.js para (a)/(b).
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    cubeCamera.update(renderer, scene);

    renderer.setSize(anchoPx, altoPx, false);
    renderer.render(quadScene, quadCamera);

    const canvasSalida = document.createElement('canvas');
    canvasSalida.width = anchoPx;
    canvasSalida.height = altoPx;
    const ctx = canvasSalida.getContext('2d');
    ctx.drawImage(renderer.domElement, 0, 0, anchoPx, altoPx);
    dibujarCreditoImagen(ctx, anchoPx, altoPx, logo);
    const dataURL = canvasSalida.toDataURL('image/png');

    scene.background = fondoOriginal;
    if (piso) piso.visible = visibilidadOriginalPiso;
    renderer.setClearColor(colorClearOriginal, alphaClearOriginal);
    renderer.setSize(anchoBase, altoBase, false);
    material.dispose();
    quad.geometry.dispose();
    cubeRenderTarget.dispose();

    return dataURL;
}
