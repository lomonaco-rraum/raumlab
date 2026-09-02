/* ================= Sello de marca (crédito) =================
   "Creado en raumlab.org" + logo, mismo criterio visual que in_SITE
   (in_site/js/registroExportViews.js: dibujarCreditoImagen) y trans_FORMA
   (mono_plano/src/js/creditoRaumlab.js), reimplementado acá porque este
   archivo es un script plano (sin import/export). Solo se usa en la
   descarga del panorama equirectangular — no en las caras del cubemap
   (esas son piezas técnicas para recomponer en otro software, no una
   imagen que alguien mira, mismo criterio que los .glb de in_site). */
let logoRaumlabCacheado;
async function cargarLogoRaumlab() {
  if (logoRaumlabCacheado !== undefined) return logoRaumlabCacheado;
  try {
    const imagen = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = '../raumlab/favicontransparente.png';
    });

    const canvas = document.createElement('canvas');
    canvas.width = imagen.naturalWidth;
    canvas.height = imagen.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imagen, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    logoRaumlabCacheado = { canvas, aspecto: canvas.width / canvas.height };
  } catch (error) {
    console.error('No se pudo cargar el logo de raumlab:', error);
    logoRaumlabCacheado = null;
  }
  return logoRaumlabCacheado;
}

const ALTO_LOGO_CREDITO_PX_BASE = 16;
function dibujarCreditoRaumlab(ctx, anchoPx, altoPx, logo) {
  const factor = Math.max(1, Math.max(anchoPx, altoPx) / 2000);
  const margen = 20 * factor;
  const altoLogo = ALTO_LOGO_CREDITO_PX_BASE * factor;
  const y = altoPx - margen;
  const texto = 'Creado en raumlab.org';

  ctx.save();
  ctx.font = `${13 * factor}px sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.85)';

  const anchoTexto = ctx.measureText(texto).width;
  const anchoLogo = (logo && logo.canvas) ? altoLogo * (logo.aspecto || 1) : 0;
  const gap = (logo && logo.canvas) ? 6 * factor : 0;
  let x = (anchoPx - (anchoLogo + gap + anchoTexto)) / 2;

  if (logo && logo.canvas) {
    ctx.drawImage(logo.canvas, x, y - altoLogo / 2, anchoLogo, altoLogo);
    x += anchoLogo + gap;
  }
  ctx.textAlign = 'left';
  ctx.fillText(texto, x, y);
  ctx.restore();
}

// Decodifica `dataURL`, dibuja el crédito encima y devuelve un nuevo
// dataURL — no muta la imagen de origen (se sigue usando en el visor 360).
function estamparCreditoEnDataURL(dataURL) {
  return new Promise(resolve => {
    cargarLogoRaumlab().then(logo => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        dibujarCreditoRaumlab(ctx, c.width, c.height, logo);
        resolve(c.toDataURL('image/png'));
      };
      img.src = dataURL;
    });
  });
}

/* ================= Store de caras del cubemap ================= */
const CUBE_FACE_IDS = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
const faceStore = { px: null, nx: null, py: null, ny: null, pz: null, nz: null };
const FACE_LABELS = {
  px: 'Derecha (+X)', nx: 'Izquierda (−X)', py: 'Arriba (+Y)',
  ny: 'Abajo (−Y)', pz: 'Adelante (+Z)', nz: 'Atrás (−Z)'
};

// Pinta la miniatura de una cara donde sea que aparezca (botón de subida en el
// diagrama de "6 caras", la vista previa en el diagrama de "Imagen única", y el
// editor de la derecha si es la cara actualmente seleccionada).
function updateFaceThumbnail(id, dataURL) {
  const btn = document.querySelector('.file-btn[data-target="' + id + '"]');
  if (btn) btn.innerHTML = `<img src="${dataURL}" alt="miniatura">`;

  const preview = document.getElementById('sheet-preview-' + id);
  if (preview) {
    preview.src = dataURL;
    preview.style.display = 'block';
  }

  if (id === selectedFaceId) {
    const editorPreview = document.getElementById('face-editor-preview');
    if (editorPreview) editorPreview.src = dataURL;
  }
}

/* ================= Editor de cara seleccionada ================= */
let selectedFaceId = null;

function selectFace(id) {
  if (!faceStore[id]) return;
  selectedFaceId = id;
  document.getElementById('face-editor-label').textContent = FACE_LABELS[id] || id.toUpperCase();
  document.getElementById('face-editor-preview').src = faceStore[id];
  document.getElementById('face-editor-empty').style.display = 'none';
  document.getElementById('face-editor-content').style.display = 'flex';
}

document.getElementById('face-editor-rotate-cw').addEventListener('click', () => {
  if (selectedFaceId) rotateFaceImage(selectedFaceId, 1);
});

document.getElementById('face-editor-rotate-ccw').addEventListener('click', () => {
  if (selectedFaceId) rotateFaceImage(selectedFaceId, -1);
});

document.getElementById('face-editor-flip-v').addEventListener('click', () => {
  if (selectedFaceId) flipFaceImage(selectedFaceId, 'vertical');
});

document.getElementById('face-editor-flip-h').addEventListener('click', () => {
  if (selectedFaceId) flipFaceImage(selectedFaceId, 'horizontal');
});

document.getElementById('face-editor-replace').addEventListener('click', () => {
  if (!selectedFaceId) return;
  const input = document.getElementById(selectedFaceId);
  if (input) input.click();
});

// Miniaturas de "Mapa de cubos" (recorte automático): clickeables para editar
// esa cara puntual en el panel de la derecha, igual que en "6 caras".
document.querySelectorAll('#sheet-source .cube-diagram-cell img').forEach(img => {
  img.addEventListener('click', () => selectFace(img.id.replace('sheet-preview-', '')));
});

// Rota 90° los píxeles reales de una cara (no solo la vista), para que lo que se
// ve en la miniatura sea exactamente lo que se usa al armar el cubemap.
// direction: 1 = +90° (horario), -1 = -90° (antihorario).
function rotateFaceImage(id, direction) {
  const src = faceStore[id];
  if (!src) return;

  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.height;
    c.height = img.width;
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(direction * Math.PI / 2);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    const rotated = c.toDataURL('image/png');
    faceStore[id] = rotated;
    updateFaceThumbnail(id, rotated);
  };
  img.src = src;
}

// Espeja una cara (misma idea que rotar, pero sin intercambiar ancho/alto).
// axis: 'vertical' (arriba-abajo) u 'horizontal' (izquierda-derecha).
function flipFaceImage(id, axis) {
  const src = faceStore[id];
  if (!src) return;

  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    if (axis === 'vertical') {
      ctx.translate(0, c.height);
      ctx.scale(1, -1);
    } else {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, 0, 0);

    const flipped = c.toDataURL('image/png');
    faceStore[id] = flipped;
    updateFaceThumbnail(id, flipped);
  };
  img.src = src;
}

// Carga una imagen desde una URL/dataURL y devuelve el elemento Image ya
// resuelto (para leer width/height y validar relaciones de aspecto).
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// WebGL solo genera mipmaps para texturas cuyos dos ejes son potencia de 2
// (256, 512, 1024, 2048...) — 1:1 (cuadrada) es una relación de aspecto, no
// lo mismo que potencia de 2. Sin mipmaps, una cara del cubemap se ve con
// aliasing fuerte al reproyectarla a equirectangular (sobre todo cerca de
// los polos del panorama, donde la proyección comprime más). Por eso cada
// cara se redimensiona acá a la potencia de 2 más cercana antes de
// guardarla, venga de "6 caras" o recortada del mapa de cubos 4:3.
function nearestPowerOfTwo(n) {
  const lower = Math.pow(2, Math.floor(Math.log2(n)));
  const upper = lower * 2;
  return (n - lower) < (upper - n) ? lower : upper;
}

function resizeToPowerOfTwo(source, width, height) {
  const targetW = nearestPowerOfTwo(width);
  const targetH = nearestPowerOfTwo(height);
  const c = document.createElement('canvas');
  c.width = targetW;
  c.height = targetH;
  c.getContext('2d').drawImage(source, 0, 0, width, height, 0, 0, targetW, targetH);
  return c.toDataURL('image/png');
}

/* ================= Botones de archivo ================= */
document.querySelectorAll('.file-btn').forEach(btn => {
  const targetId = btn.dataset.target;
  const input = document.getElementById(targetId);

  btn.addEventListener('click', () => {
    // Cuadrante de cara ya cargado: el clic selecciona para editar en vez de
    // reabrir el selector de archivo (para eso está "Reemplazar imagen").
    if (CUBE_FACE_IDS.includes(targetId) && faceStore[targetId]) {
      selectFace(targetId);
      return;
    }
    if (input) input.click();
  });

  input && input.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      btn.innerHTML = '+';
      return;
    }
    const reader = new FileReader();
    reader.onload = async ev => {
      if (CUBE_FACE_IDS.includes(targetId)) {
        const img = await loadImage(ev.target.result);
        const ratio = img.width / img.height;
        if (Math.abs(ratio - 1) > 0.02) {
          setStatus('status', `${FACE_LABELS[targetId] || targetId.toUpperCase()}: relación inválida (${ratio.toFixed(2)}:1) — debe ser 1:1`);
          return;
        }
        const resized = resizeToPowerOfTwo(img, img.width, img.height);
        faceStore[targetId] = resized;
        updateFaceThumbnail(targetId, resized);
        selectFace(targetId);
      } else {
        btn.innerHTML = `<img src="${ev.target.result}" alt="miniatura">`;
      }
    };
    reader.readAsDataURL(file);
  });
});

/* ================= Utilidades ================= */
const setStatus = (id, msg) => {
  const el = document.getElementById(id);
  if (el) el.textContent = msg || '';
};

// Nombre de proyecto ingresado por el usuario (compartido entre CM→EQ y EQ→CM),
// usado como nombre de archivo al descargar. null si está vacío.
function getProjectName() {
  const el = document.getElementById('project-name');
  const name = el && el.value.trim();
  return name || null;
}

/* ================= Cubemap por imagen única (cruz 4:3) ================= */
const SHEET_LAYOUT = {
  py: [1, 0], nx: [0, 1], pz: [1, 1], px: [2, 1], nz: [3, 1], ny: [1, 2]
};

function sliceCubemapSheet(img) {
  const cellW = img.width / 4;
  const cellH = img.height / 3;

  Object.entries(SHEET_LAYOUT).forEach(([face, [col, row]]) => {
    const c = document.createElement('canvas');
    c.width = cellW;
    c.height = cellH;
    c.getContext('2d').drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);

    const dataURL = resizeToPowerOfTwo(c, c.width, c.height);
    faceStore[face] = dataURL;
    updateFaceThumbnail(face, dataURL);
  });
}

document.getElementById('sheet').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    const ratio = img.width / img.height;
    if (Math.abs(ratio - 4 / 3) > 0.02) {
      setStatus('status-sheet', `Relación inválida (${ratio.toFixed(2)}:1) — debe ser 4:3`);
      return;
    }
    sliceCubemapSheet(img);
    setStatus('status-sheet', 'Cubemap recortado ✓');

    // Una vez cargado, el botón/rótulo de subida (dentro de la celda
    // "Adelante") ya no hace falta — la vista previa recortada ocupa su lugar.
    const sheetBtn = document.querySelector('#sheet-source .file-btn[data-target="sheet"]');
    const sheetLabel = document.querySelector('#sheet-source .cube-diagram-cell.face-front span');
    if (sheetBtn) sheetBtn.style.display = 'none';
    if (sheetLabel) sheetLabel.style.display = 'none';
  };
  img.onerror = () => setStatus('status-sheet', 'No se pudo leer la imagen');
  img.src = URL.createObjectURL(file);
});

/* ================= Three.js comunes ================= */
const canvas = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  preserveDrawingBuffer: true,
  antialias: true,
  alpha: true
});
renderer.setClearColor(0x000000, 0);

// "Muy alta" (8192px de lado) supera el máximo de textura de algunas GPUs
// más viejas/integradas — si se deja igual, el render sale en blanco sin
// ningún error visible (mismo problema que ya se resolvió para el tope de
// celular en qualitySize()). Se oculta la opción en vez de dejarla fallar.
const muyAltaOpcion = document.getElementById('quality-muy-alta');
if (muyAltaOpcion && renderer.capabilities.maxTextureSize < 8192) {
  muyAltaOpcion.style.display = 'none';
}

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const quad = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(2, 2),
  new THREE.ShaderMaterial({
    uniforms: { tCube: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform samplerCube tCube;
      void main() {
        float PI = 3.141592653589793;
        float lon = (vUv.x - 0.5) * 2.0 * PI;
        float lat = (0.5 - vUv.y) * PI;
        vec3 dir;
        dir.x = -sin(lon) * cos(lat);
        dir.y =  sin(lat);
        dir.z =  cos(lon) * cos(lat);
        gl_FragColor = textureCube(tCube, normalize(dir));
      }
    `
  })
);
scene.add(quad);

const renderTarget = new THREE.WebGLRenderTarget(4096, 2048, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat
});

/* ================= Panolens viewers ================= */
const viewer = new PANOLENS.Viewer({
  container: document.getElementById('viewer'),
  autoHideInfospot: true,
  controlBar: true,
  enableFullscreen: true
});
// Blanco opaco (no transparente): las zonas sin fondo elegido componen contra
// esto, no contra el fondo CSS del contenedor (más confiable entre navegadores).
viewer.renderer.setClearColor(0xffffff, 1);

let panorama = null;

const viewerEqr = new PANOLENS.Viewer({
  container: document.getElementById('viewer-eqr'),
  autoHideInfospot: true,
  controlBar: true,
  enableFullscreen: true
});
viewerEqr.renderer.setClearColor(0xffffff, 1);

let panoramaEqr = null;
let eqrTexture = null;

const viewerSolo = new PANOLENS.Viewer({
  container: document.getElementById('viewer-solo'),
  autoHideInfospot: true,
  controlBar: true,
  enableFullscreen: true
});
viewerSolo.renderer.setClearColor(0xffffff, 1);

let panoramaSolo = null;

const viewerColeccion = new PANOLENS.Viewer({
  container: document.getElementById('viewer-coleccion'),
  autoHideInfospot: true,
  controlBar: true,
  enableFullscreen: true
});
viewerColeccion.renderer.setClearColor(0xffffff, 1);

let panoramaColeccion = null;

// Cada Viewer de Panolens arranca su propio loop de render
// (requestAnimationFrame) apenas se crea, y sigue corriendo aunque su panel
// esté oculto — a diferencia de in_SITE (que navega entre páginas separadas,
// una sola escena 3D viva a la vez), acá los 4 visores conviven siempre en
// la misma página. Sin pausarlos, son hasta 4 loops de render 3D compitiendo
// por CPU/GPU en segundo plano todo el tiempo — incluso en Tutoriales, donde
// no hace falta ninguno —, y eso es lo que hacía sentir el scroll pesado en
// celular. `requestAnimationId` (el handle del RAF) lo guarda el propio
// Viewer, confirmado leyendo panolens@0.12.1 sin minificar: animate(){
// this.requestAnimationId = requestAnimationFrame(this.animate.bind(this));
// this.onChange(); }
function pausarVisor(v) {
  if (v && v.requestAnimationId) {
    cancelAnimationFrame(v.requestAnimationId);
    v.requestAnimationId = null;
  }
}
function reanudarVisor(v) {
  if (v && !v.requestAnimationId) {
    v.animate();
  }
}

// Arrancan pausados: la pantalla por defecto al cargar es la introducción
// (mode-intro), que no necesita ninguno de los 4.
[viewer, viewerEqr, viewerSolo, viewerColeccion].forEach(pausarVisor);

// FIX real, verificado contra el código fuente de panolens@0.12.1 (no el
// minificado — se bajó y se leyó): el botón de pantalla completa de Panolens
// vive en un objeto `Widget` separado del `Viewer` (Viewer.js línea ~7732:
// `const widget = new Widget(this.container); widget.addEventListener(
// 'panolens-viewer-handler', this.eventHandler.bind(this))`). Ese widget es
// quien dispara `dispatchEvent({type:'panolens-viewer-handler',
// method:'onWindowResize'})` — sobre SÍ MISMO, no sobre el viewer.
// El código de antes (y el intento anterior, con ResizeObserver) hacía ese
// mismo dispatchEvent pero directo sobre la instancia del VIEWER — que no
// tiene ningún listener propio para ese evento. El dispatch no hacía nada;
// nunca resizeaba el canvas. Por eso el contenedor (el <div>) quedaba bien
// corregido pero el canvas de adentro seguía con el tamaño viejo — la
// "vista cuadrada desencajada" es literalmente el canvas sin actualizar
// flotando dentro de un contenedor que sí tiene el tamaño correcto.
// Fix real: llamar onWindowResize() directo como método (Viewer.js línea
// ~8609) en vez de pasar por el sistema de eventos. Es exactamente la misma
// función que usa Panolens internamente, sin la capa rota en el medio.
const IDS_CONTENEDOR_VISOR = ['viewer', 'viewer-eqr', 'viewer-solo', 'viewer-coleccion'];
const VIEWER_POR_ID = {
  viewer: viewer,
  'viewer-eqr': viewerEqr,
  'viewer-solo': viewerSolo,
  'viewer-coleccion': viewerColeccion
};

IDS_CONTENEDOR_VISOR.forEach(id => {
  const cont = document.getElementById(id);
  if (!cont) return;
  let frame = null;
  new ResizeObserver(() => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      // Pantalla completa de RA (.rc-ar-fullscreen, solo celular): mientras
      // esta clase está puesta el contenedor cubre la pantalla a propósito
      // con su propio alto (no 16:9) — no hay que forzarle nada acá, pero
      // sí seguir llamando a onWindowResize() para que Panolens renderice
      // al tamaño real en vez de quedarse con el de antes.
      if (!cont.classList.contains('rc-ar-fullscreen')) {
        const w = cont.clientWidth;
        if (w <= 0) return;
        const alto = Math.round(w * 9 / 16);
        if (cont.clientHeight !== alto) cont.style.height = alto + 'px';
      }
      VIEWER_POR_ID[id].onWindowResize();
    });
  }).observe(cont);
});

/* ================= Fondo (equirectangular) ================= */
const BACKGROUND_PRESETS = {
  entorno1: 'fondos/entorno1.jpg', // Interior
  entorno2: 'fondos/entorno2.jpg', // Bosque
  entorno3: 'fondos/entorno3.jpg', // Desierto
  entorno4: 'fondos/entorno4.jpg', // Campo
  entorno5: 'fondos/entorno5.jpg', // Ruina
  entorno6: 'fondos/entorno6.jpg'  // Garage abandonado
};

// Arma un selector de fondo (Ninguno / presets / subida propia) dentro de `container`,
// sin interferir con otros selectores de fondo que pueda haber en otras secciones.
function wireBackgroundPicker(container, onChange) {
  const presetBtns = container.querySelectorAll('.bg-preset');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.dataset.bg;
      onChange(key === 'none' ? null : BACKGROUND_PRESETS[key]);
    });
  });

  container.querySelector('.bg-upload-input').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    presetBtns.forEach(b => b.classList.remove('active'));
    onChange(URL.createObjectURL(file));
  });
}

// El equirectangular que arma el shader CM→EQ queda invertido respecto a una imagen
// "normal" (se compensa en el visor con panorama.rotation.z, y en la descarga con el
// blit en espejo) — así que el fondo necesita el mismo volteo para calzar con cada uno.
// flipMode: 'vertical' (visor CM→EQ), 'horizontal' (descarga CM→EQ — confirmado por
// testeo del usuario: con 'both' el fondo quedaba invertido verticalmente en el PNG
// descargado, aunque el visor ya estaba bien), o ninguno (Visualizador, donde tanto el
// EQ subido como el fondo son imágenes normales, sin ese desfase).
function compositeWithBackground(foregroundDataURL, bgURL, flipMode) {
  return new Promise(resolve => {
    if (!bgURL) {
      resolve(foregroundDataURL);
      return;
    }
    const bg = new Image();
    bg.onload = () => {
      const fg = new Image();
      fg.onload = () => {
        try {
          // Mismo límite de textura de celular que qualitySize() (ver más
          // abajo) — acá hace falta aparte porque esta función también la
          // usa Visualizador al subir/componer una imagen que puede venir
          // de cualquier tamaño (por ejemplo, exportada antes desde una PC),
          // no solo desde el render interno de Crear.
          let cw = fg.width, ch = fg.height;
          if (window.rcIsMobile && window.rcIsMobile()) {
            const MAX_MOBILE = 2048;
            if (cw > MAX_MOBILE || ch > MAX_MOBILE) {
              const factor = MAX_MOBILE / Math.max(cw, ch);
              cw = Math.round(cw * factor);
              ch = Math.round(ch * factor);
            }
          }
          const c = document.createElement('canvas');
          c.width = cw;
          c.height = ch;
          const ctx = c.getContext('2d');

          ctx.save();
          if (flipMode === 'vertical') {
            ctx.translate(0, c.height);
            ctx.scale(1, -1);
          } else if (flipMode === 'horizontal') {
            ctx.translate(c.width, 0);
            ctx.scale(-1, 1);
          } else if (flipMode === 'both') {
            ctx.translate(c.width, c.height);
            ctx.scale(-1, -1);
          }
          ctx.drawImage(bg, 0, 0, c.width, c.height);
          ctx.restore();

          ctx.drawImage(fg, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        } catch (e) {
          console.error('No se pudo componer el fondo:', e);
          resolve(foregroundDataURL);
        }
      };
      fg.onerror = () => {
        console.error('No se pudo leer la imagen base para componer el fondo');
        resolve(foregroundDataURL);
      };
      fg.src = foregroundDataURL;
    };
    bg.onerror = () => {
      console.error('No se pudo cargar el fondo:', bgURL);
      resolve(foregroundDataURL);
    };
    bg.src = bgURL;
  });
}

let backgroundURL = null;
wireBackgroundPicker(document.getElementById('bg-picker-crear'), url => { backgroundURL = url; });

// Rellena de blanco donde había transparencia — usado cuando se excluye el
// canal alfa. Mismo patrón async que compositeWithBackground, pero sin
// cargar ninguna imagen de fondo externa.
function flattenToWhite(dataURL) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.src = dataURL;
  });
}

// Si se excluye la transparencia, elegir un fondo deja de tener sentido
// (no hay nada transparente por donde se vea) — se oculta el selector.
let includeAlpha = true;
document.getElementById('include-alpha').addEventListener('change', e => {
  includeAlpha = e.target.checked;
  // 'block', no 'flex': este contenedor tiene la etiqueta "Fondo" Y la fila
  // de miniaturas como hijos — 'flex' los acomoda en fila (uno al lado del
  // otro) en vez de apilados. El que sí es flex es .bg-picker-row (la fila
  // en sí), que no se toca acá.
  document.getElementById('bg-picker-crear').style.display = includeAlpha ? 'block' : 'none';
});

/* ================= Orientación inicial ================= */
// NOTA: la correspondencia exacta "botón → cara real del cubo" no se pudo
// verificar en navegador — son 4 direcciones parejas (cada 90° alrededor del
// horizonte) derivadas del vector que ya usaba el código; si alguna etiqueta
// no corresponde a la cara esperada, es reordenar qué vector va con qué botón.
const ORIENTATION_VECTORS = {
  front: new THREE.Vector3(0, 0, -1),
  left: new THREE.Vector3(-1, 0, 0),
  back: new THREE.Vector3(0, 0, 1),
  right: new THREE.Vector3(1, 0, 0)
};

// Escopado por contenedor (independiente entre Creación y Visualizador).
// Devuelve un objeto { direction } que el caller lee al mostrar un panorama;
// si ya hay uno visible, además lo reorienta al toque con un tween.
function wireOrientationPicker(container, getViewer) {
  const state = { direction: 'front' };
  const btns = container.querySelectorAll('.orient-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.direction = btn.dataset.dir;
      const v = getViewer && getViewer();
      if (v) v.tweenControlCenter(ORIENTATION_VECTORS[state.direction], 300);
    });
  });
  return state;
}

const orientationCrear = wireOrientationPicker(document.getElementById('orient-picker-crear'), () => viewer);
const orientationVer = wireOrientationPicker(document.getElementById('orient-picker-ver'), () => viewerSolo);

/* ================= Build CM → EQ ================= */
document.getElementById('build').onclick = async () => {
  try {
    for (const id of CUBE_FACE_IDS) {
      if (!faceStore[id]) {
        setStatus('status', 'Falta subir: ' + id.toUpperCase());
        return;
      }
    }

    setStatus('status', 'Cargando cubemap…');
    const urls = CUBE_FACE_IDS.map(id => faceStore[id]);

    new THREE.CubeTextureLoader().load(urls, async cube => {
      // CubeTextureLoader crea la textura con format RGBFormat (sin alfa) por defecto.
      cube.format = THREE.RGBAFormat;
      cube.encoding = THREE.sRGBEncoding;
      quad.material.uniforms.tCube.value = cube;

      const sizeBuild = qualitySize();
      renderer.setSize(sizeBuild.w, sizeBuild.h, false);
      renderer.render(scene, camera);

      const rawURL = renderer.domElement.toDataURL('image/png');
      const panoURL = includeAlpha
        ? await compositeWithBackground(rawURL, backgroundURL, 'vertical')
        : await flattenToWhite(rawURL);

      if (panorama) viewer.remove(panorama);
      panorama = new PANOLENS.ImagePanorama(panoURL);
      panorama.rotation.z = Math.PI;

      panorama.addEventListener('enter', () => {
        viewer.tweenControlCenter(ORIENTATION_VECTORS[orientationCrear.direction], 0);
      });

      viewer.add(panorama);
      viewer.setPanorama(panorama);

      document.getElementById('download').disabled = false;
      document.getElementById('btn-vista-previa').disabled = false;
      setStatus('status', 'Listo ✓');

      // Abre la Vista previa automáticamente al terminar.
      abrirVistaPrevia();
    });

  } catch (e) {
    console.error(e);
    setStatus('status', 'Error al generar panorama');
  }
};

/* ================= Download CM → EQ ================= */
document.getElementById('download').onclick = async () => {
  const sizeDownload = qualitySize();
  // renderTarget se crea una sola vez a 4096x2048 (ver más arriba) — sin
  // este resize, pedir cualquier resolución distinta (Baja, Media, o la
  // nueva Muy alta) deja el viewport más grande/chico que la textura real
  // de destino, y el resultado sale recortado a un sector de la imagen.
  renderTarget.setSize(sizeDownload.w, sizeDownload.h);
  renderer.setRenderTarget(renderTarget);
  renderer.setSize(sizeDownload.w, sizeDownload.h, false);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);

  const blitScene = new THREE.Scene();
  const blitMesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: renderTarget.texture })
  );

  blitMesh.scale.x = -1;
  blitMesh.scale.y = -1;
  blitScene.add(blitMesh);

  const exportCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  renderer.render(blitScene, exportCamera);

  const rawURL = renderer.domElement.toDataURL('image/png');
  const finalURL = includeAlpha
    ? await compositeWithBackground(rawURL, backgroundURL, 'horizontal')
    : await flattenToWhite(rawURL);
  const finalURLConCredito = await estamparCreditoEnDataURL(finalURL);

  const a = document.createElement('a');
  a.download = (getProjectName() || 'panorama') + '.png';
  a.href = finalURLConCredito;
  a.click();

  setStatus('status', 'PNG descargado ✓');
};

/* ================= Cerrar proyecto (CM→EQ) ================= */
document.getElementById('reset-project').addEventListener('click', () => {
  // Caras
  CUBE_FACE_IDS.forEach(id => {
    faceStore[id] = null;

    // "+" como texto plano, igual que el HTML original — envolverlo en un
    // <span> lo hacía caer en la regla .cube-diagram-cell span (pensada
    // para la etiqueta del nombre: chica, gris, pegada abajo del
    // cuadrante), así que se veía chico en vez de la cruz grande centrada.
    const btn = document.querySelector('.file-btn[data-target="' + id + '"]');
    if (btn) btn.innerHTML = '+';

    const input = document.getElementById(id);
    if (input) input.value = '';

    const preview = document.getElementById('sheet-preview-' + id);
    if (preview) {
      preview.src = '';
      preview.style.display = 'none';
    }
  });

  const sheetInput = document.getElementById('sheet');
  if (sheetInput) sheetInput.value = '';
  setStatus('status-sheet', '');
  const sheetBtn = document.querySelector('#sheet-source .file-btn[data-target="sheet"]');
  const sheetLabel = document.querySelector('#sheet-source .cube-diagram-cell.face-front span');
  if (sheetBtn) sheetBtn.style.display = '';
  if (sheetLabel) sheetLabel.style.display = '';

  // Editor de cara seleccionada
  selectedFaceId = null;
  document.getElementById('face-editor-empty').style.display = 'block';
  document.getElementById('face-editor-content').style.display = 'none';

  // Nombre de proyecto
  document.getElementById('project-name').value = '';

  // Fondo y canal alfa
  backgroundURL = null;
  document.querySelectorAll('#bg-picker-crear .bg-preset').forEach(b => b.classList.remove('active'));
  const noneBtn = document.querySelector('#bg-picker-crear .bg-preset[data-bg="none"]');
  if (noneBtn) noneBtn.classList.add('active');
  includeAlpha = true;
  document.getElementById('include-alpha').checked = true;
  document.getElementById('bg-picker-crear').style.display = 'block';

  // Modo de carga (vuelve a "6 caras")
  document.querySelectorAll('.cm-mode-option').forEach(b => b.classList.remove('active'));
  document.querySelector('.cm-mode-option[data-value="faces-source"]').classList.add('active');
  document.querySelectorAll('.source-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('faces-source').classList.add('active');

  // Resolución (vuelve al placeholder "Seleccionar"; el valor real usado
  // al exportar sigue siendo Alta salvo que se elija otro explícitamente)
  document.querySelectorAll('.quality-option').forEach(b => b.classList.remove('active'));
  document.querySelector('.quality-option[data-value=""]').classList.add('active');
  const pickerResolucionLabel = document.querySelector('#picker-resolucion .picker-boton-label');
  if (pickerResolucionLabel) pickerResolucionLabel.textContent = 'Seleccionar';
  qualityValue = '4096x2048';

  // Visor y descarga
  if (panorama) {
    viewer.remove(panorama);
    panorama = null;
  }
  document.getElementById('download').disabled = true;
  document.getElementById('btn-vista-previa').disabled = true;
  setStatus('status', '');

  // Cierra la Vista previa si había quedado abierta.
  cerrarVistaPrevia();
});

/* ================= Build EQ → CM ================= */
document.getElementById('build-eqr').onclick = async () => {
  try {
    const input = document.getElementById('eqr');
    if (!input || !input.files || input.files.length === 0) {
      setStatus('status-eqr', 'Falta subir equirectangular');
      return;
    }
    const file = input.files[0];
    const url = URL.createObjectURL(file);

    const img = await loadImage(url);
    const ratio = img.width / img.height;
    if (Math.abs(ratio - 2) > 0.02) {
      setStatus('status-eqr', `Relación inválida (${ratio.toFixed(2)}:1) — debe ser 2:1`);
      return;
    }

    // Mostrar en visor Panolens
    if (panoramaEqr) viewerEqr.remove(panoramaEqr);
    panoramaEqr = new PANOLENS.ImagePanorama(url);
    viewerEqr.add(panoramaEqr);
    viewerEqr.setPanorama(panoramaEqr);

    const texture = new THREE.TextureLoader().load(url);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    eqrTexture = texture; // guardar para exportar

    document.getElementById('download-eqr').disabled = false;
    setStatus('status-eqr', 'Panorama listo ✓');
  } catch (e) {
    console.error(e);
    setStatus('status-eqr', 'Error al generar cubemap');
  }
};

/* ================= Download EQ → CM ================= */
document.getElementById('download-eqr').onclick = async () => {
  if (!eqrTexture) {
    setStatus('status-eqr', 'No hay equirectangular cargada');
    return;
  }

  const sceneEqr = new THREE.Scene();
  const sphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry(500, 60, 40),
    new THREE.MeshBasicMaterial({ map: eqrTexture, side: THREE.BackSide })
  );
  sceneEqr.add(sphere);

  const directions = [
    { name: 'Right', dir: new THREE.Vector3(1,0,0), up: new THREE.Vector3(0,-1,0) },
    { name: 'Left', dir: new THREE.Vector3(-1,0,0), up: new THREE.Vector3(0,-1,0) },
    { name: 'Top', dir: new THREE.Vector3(0,1,0), up: new THREE.Vector3(0,0,1) },
    { name: 'Bottom', dir: new THREE.Vector3(0,-1,0), up: new THREE.Vector3(0,0,-1) },
    { name: 'Front', dir: new THREE.Vector3(0,0,1), up: new THREE.Vector3(0,-1,0) },
    { name: 'Back', dir: new THREE.Vector3(0,0,-1), up: new THREE.Vector3(0,-1,0) }
  ];

  const cam = new THREE.PerspectiveCamera(90, 1, 0.1, 1000);
  const zip = new JSZip();

  for (const d of directions) {
    cam.position.set(0,0,0);
    cam.up.copy(d.up);
    cam.lookAt(d.dir);

    const rendererLocal = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, alpha: true });
    rendererLocal.setClearColor(0x000000, 0);
    rendererLocal.setSize(1024, 1024);
    rendererLocal.render(sceneEqr, cam);

    const dataURL = rendererLocal.domElement.toDataURL('image/png');
    const base64 = dataURL.split(',')[1];
    zip.file(`${d.name}.png`, base64, {base64: true});

    // Libera el contexto WebGL de este renderer temporal — si no, el
    // navegador acumula uno sin cerrar por cada cara exportada, en cada
    // descarga, hasta agotar el límite de contextos que permite tener abiertos.
    rendererLocal.dispose();
  }

  const zipName = (getProjectName() || 'cubemap') + '.zip';
  const content = await zip.generateAsync({type:"blob"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = zipName;
  a.click();

  setStatus('status-eqr', 'ZIP descargado ✓');
};

/* ================= Visualizador ================= */
let backgroundURLViewer = null;
let viewerEqSource = null; // URL del equirectangular subido, sin componer con el fondo

async function refreshViewerPanorama() {
  if (!viewerEqSource) return;

  try {
    const url = await compositeWithBackground(viewerEqSource, backgroundURLViewer, null);

    if (panoramaSolo) viewerSolo.remove(panoramaSolo);
    panoramaSolo = new PANOLENS.ImagePanorama(url);

    panoramaSolo.addEventListener('enter', () => {
      viewerSolo.tweenControlCenter(ORIENTATION_VECTORS[orientationVer.direction], 0);
    });

    viewerSolo.add(panoramaSolo);
    viewerSolo.setPanorama(panoramaSolo);

    setStatus('status-viewer', 'Panorama cargado ✓');
  } catch (e) {
    console.error(e);
    setStatus('status-viewer', 'Error al aplicar el fondo');
  }
}

wireBackgroundPicker(document.getElementById('bg-picker-ver'), url => {
  backgroundURLViewer = url;
  refreshViewerPanorama();
});

document.getElementById('viewer-input').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const ratio = img.width / img.height;
  if (Math.abs(ratio - 2) > 0.02) {
    setStatus('status-viewer', `Relación inválida (${ratio.toFixed(2)}:1) — debe ser 2:1`);
    return;
  }

  viewerEqSource = url;
  refreshViewerPanorama();
});

/* ================= RA (experimental — requiere celular real para probar) ================= */
// Escopado por botones/visor, así Visualizador y Colección tienen cada uno
// su propia cámara (nunca las dos prendidas a la vez).
// El botón de pantalla completa es una acción SEPARADA de "Ver en RA", a
// propósito: la Fullscreen API nativa necesita su propio gesto de usuario
// "fresco" — pedirla encadenada después de otro permiso ya solicitado
// (el de orientación) la deja rechazada en varios navegadores móviles.
// Al tener su propio botón/click, tiene la mejor chance posible de andar
// nativamente; y si el navegador igual no la soporta, la clase CSS
// (.rc-ar-fullscreen) cubre la pantalla igual por su cuenta — para lo
// cual el ResizeObserver de más arriba ya sabe no forzarle el 16:9
// mientras esa clase está puesta.
// RA entra directo a pantalla completa (antes eran dos acciones separadas
// — "Ver en RA" y un botón aparte de "Pantalla completa" — con hasta dos
// botones flotantes a la vez; se fusionaron en una sola).
function wireARToggle(enterBtnId, exitBtnId, statusId, getViewer, containerId) {
  let cameraPanorama = null;

  // Ancho/alto en píxeles exactos por JS, no vh/dvh ni aspect-ratio: en
  // Safari, al entrar a pantalla completa nativa la barra de direcciones
  // se oculta y el viewport cambia de tamaño DESPUÉS del click — hay que
  // recalcular con el tamaño real disponible en ese momento, no con el
  // que había al tocar el botón. Misma función para el ajuste inicial y
  // para cualquier resize/orientationchange real mientras dura la sesión.
  function ajustarTamanioFullscreen() {
    const viewerContainer = document.getElementById(containerId);
    if (!viewerContainer) return;
    viewerContainer.style.width = window.innerWidth + 'px';
    viewerContainer.style.height = window.innerHeight + 'px';
    getViewer().onWindowResize();
  }

  document.getElementById(enterBtnId).addEventListener('click', async () => {
    try {
      // iOS 13+ exige pedir el permiso de orientación a mano, desde el gesto
      // del usuario (este clic) — Panolens no lo hace por su cuenta.
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          setStatus(statusId, 'Permiso de orientación denegado');
          return;
        }
      }

      const v = getViewer();
      cameraPanorama = new PANOLENS.CameraPanorama({ video: { facingMode: 'environment' }, audio: false });
      v.add(cameraPanorama);
      v.enableControl(PANOLENS.CONTROLS.DEVICEORIENTATION);

      const viewerContainer = document.getElementById(containerId);
      if (viewerContainer) viewerContainer.classList.add('rc-ar-fullscreen');
      document.getElementById(exitBtnId).classList.add('rc-ar-exit-floating');
      document.body.classList.add('rc-ar-activo');
      ajustarTamanioFullscreen();
      window.addEventListener('resize', ajustarTamanioFullscreen);
      window.addEventListener('orientationchange', ajustarTamanioFullscreen);
      document.addEventListener('fullscreenchange', ajustarTamanioFullscreen);

      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();

      document.getElementById(enterBtnId).style.display = 'none';
      document.getElementById(exitBtnId).style.display = 'block';
      setStatus(statusId, 'RA activa ✓');
    } catch (e) {
      console.error(e);
      setStatus(statusId, 'No se pudo activar RA (¿permiso de cámara denegado?)');
    }
  });

  document.getElementById(exitBtnId).addEventListener('click', () => {
    const v = getViewer();
    if (cameraPanorama) {
      v.remove(cameraPanorama);
      if (typeof cameraPanorama.stop === 'function') cameraPanorama.stop();
      cameraPanorama = null;
    }
    v.enableControl(PANOLENS.CONTROLS.ORBIT);

    window.removeEventListener('resize', ajustarTamanioFullscreen);
    window.removeEventListener('orientationchange', ajustarTamanioFullscreen);
    document.removeEventListener('fullscreenchange', ajustarTamanioFullscreen);
    const viewerContainer = document.getElementById(containerId);
    if (viewerContainer) {
      viewerContainer.classList.remove('rc-ar-fullscreen');
      viewerContainer.style.width = '';
      viewerContainer.style.height = '';
    }
    document.getElementById(exitBtnId).classList.remove('rc-ar-exit-floating');
    document.body.classList.remove('rc-ar-activo');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    v.onWindowResize();

    document.getElementById(enterBtnId).style.display = 'block';
    document.getElementById(exitBtnId).style.display = 'none';
    setStatus(statusId, '');
  });
}

wireARToggle('ar-enter', 'ar-exit', 'status-ar', () => viewerSolo, 'viewer-solo');
wireARToggle('ar-enter-coleccion', 'ar-exit-coleccion', 'status-ar-coleccion', () => viewerColeccion, 'viewer-coleccion');

/* ================= Colección RaumLab ================= */
// Sumar un ejemplo nuevo a la colección es agregar un objeto acá — no hace
// falta tocar más código. Tiene su propio visor (sin fondo, son ejemplos ya
// cerrados) para no saltar a la pestaña Visualizador.
const COLLECTION_EXAMPLES = [
  { title: 'Caja vacía de Oteiza', eq: 'coleccion/oteiza/equirectangular.png' }
];

// Tarjeta tipográfica clickeable entera — mismo componente que .pieza-card
// de in_SITE (ver seleccionarPieza en in_site/js/coleccion.js), sin
// miniatura ni botón "Ver" aparte.
COLLECTION_EXAMPLES.forEach(example => {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'collection-card';
  card.innerHTML = `<span class="collection-card-titulo">${example.title}</span>`;
  card.addEventListener('click', () => {
    document.querySelectorAll('.collection-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    if (panoramaColeccion) viewerColeccion.remove(panoramaColeccion);
    panoramaColeccion = new PANOLENS.ImagePanorama(example.eq);
    viewerColeccion.add(panoramaColeccion);
    viewerColeccion.setPanorama(panoramaColeccion);
  });
  document.getElementById('collection-grid').appendChild(card);
});

/* ================= Modos / Tabs / Selector de fuente ================= */
// Compara por el VALOR del atributo (no por "es el botón que se clickeó"):
// hace falta porque el subnav del header y su espejo en el panel de
// navegación de celular son dos elementos [data-mode] distintos apuntando
// al mismo modo — deben quedar "active" los dos a la vez, no solo el que
// se clickeó.
function wireSwitcher(buttonSelector, dataAttr, panelSelector, onSwitch) {
  document.querySelectorAll(buttonSelector).forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset[dataAttr];
      document.querySelectorAll(buttonSelector).forEach(b => {
        b.classList.toggle('active', b.dataset[dataAttr] === targetId);
      });
      document.querySelectorAll(panelSelector).forEach(p => p.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');

      // Los visores Panolens se crean con el panel oculto (tamaño 0x0);
      // al mostrarlo hay que forzar que recalculen su tamaño.
      window.dispatchEvent(new Event('resize'));

      if (onSwitch) onSwitch(targetId);
    });
  });
}

wireSwitcher('.mode-btn', 'mode', '.mode-content', targetId => {
  // Visualizar/Galería: solo corren si son el modo elegido.
  targetId === 'mode-ver' ? reanudarVisor(viewerSolo) : pausarVisor(viewerSolo);
  targetId === 'mode-coleccion' ? reanudarVisor(viewerColeccion) : pausarVisor(viewerColeccion);

  if (targetId !== 'mode-crear') {
    // Vista previa (modal) y EQ→CM: ninguno hace falta fuera de Crear.
    pausarVisor(viewer);
    pausarVisor(viewerEqr);
  } else {
    // Al volver a Crear, reanudar viewerEqr solo si el tab activo es
    // eq2cm (la vista previa del modal se maneja aparte, en
    // abrirVistaPrevia()/cerrarVistaPrevia(), no depende del modo).
    const tabActivo = document.querySelector('.tab-btn.active');
    if (tabActivo && tabActivo.dataset.target === 'eq2cm') reanudarVisor(viewerEqr);
    else pausarVisor(viewerEqr);
  }
});

wireSwitcher('.tab-btn', 'target', '.tab-content', targetId => {
  targetId === 'eq2cm' ? reanudarVisor(viewerEqr) : pausarVisor(viewerEqr);
});

// Saltar directo a un modo por hash ("#mode=mode-crear") — lo usa el
// buscador global (raumlab/raumlab-search.js) para linkear a un modo
// puntual de espacio_INM desde cualquier página del sitio. Reusa el mismo
// botón/handler ya conectado por wireSwitcher() de acá arriba, en vez de
// duplicar la lógica de cambio de modo. Listener de hashchange aparte: si
// ya se está en esta página, el buscador solo cambia el hash (sin recarga),
// así que sin esto no pasaría nada hasta refrescar a mano.
function aplicarHashModo() {
  const match = /^#mode=(.+)$/.exec(location.hash);
  if (!match) return;
  const boton = document.querySelector('.mode-btn[data-mode="' + match[1] + '"]');
  if (boton) boton.click();
}
aplicarHashModo();
window.addEventListener('hashchange', aplicarHashModo);

wireSwitcher('.instr-nav-item', 'instr', '.instr-body');

// Selector "Modo" (6 caras / Mapa de cubos) — lista de botones en vez de
// <select> nativo (mismo criterio que en trans_FORMA: el navegador no deja
// tematizar el fondo de las opciones desplegadas de un <select>).
document.querySelectorAll('.cm-mode-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cm-mode-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.source-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(btn.dataset.value).classList.add('active');
  });
});

// Selector "Resolución" — mismo criterio de lista de botones. No estaba
// conectado antes (el renderer usaba 4096x2048 fijo); ahora sí determina el
// tamaño real de export en Crear y Descargar.
// "Seleccionar" (data-value vacío) es el placeholder inicial — no tiene una
// resolución real asociada, así que no toca qualityValue (el export sigue
// usando el último valor real elegido; por defecto Alta).
let qualityValue = '4096x2048';
document.querySelectorAll('.quality-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.quality-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.value) qualityValue = btn.dataset.value;
  });
});
function qualitySize() {
  const [w, h] = qualityValue.split('x').map(Number);
  // "Alta" (4096x2048, la opción por defecto) puede fallar en silencio en
  // GPUs/canvas de celular — el límite de textura de muchos navegadores
  // móviles queda justo ahí o por debajo, y el resultado es una textura en
  // blanco sin ningún error visible. Tope conservador solo en móvil; en
  // escritorio se respeta siempre la resolución elegida.
  if (window.rcIsMobile && window.rcIsMobile()) {
    const MAX_MOBILE = 2048;
    if (w > MAX_MOBILE || h > MAX_MOBILE) {
      const factor = MAX_MOBILE / Math.max(w, h);
      return { w: Math.round(w * factor), h: Math.round(h * factor) };
    }
  }
  return { w, h };
}

// Desplegable (Operación / Modo / Resolución): abre/cierra la lista y
// refleja en el botón el texto de la opción elegida — la selección en sí
// la manejan los listeners de .tab-btn/.cm-mode-option/.quality-option ya
// wireados arriba, esto solo agrega el comportamiento propio del menú.
function wirePicker(picker) {
  const boton = picker.querySelector('.picker-boton');
  const label = picker.querySelector('.picker-boton-label');
  const lista = picker.querySelector('.picker-lista');

  boton.addEventListener('click', () => {
    const abierta = !lista.hidden;
    lista.hidden = abierta;
    boton.setAttribute('aria-expanded', String(!abierta));
  });

  picker.querySelectorAll('.picker-opcion').forEach(opcion => {
    opcion.addEventListener('click', () => {
      const nombre = opcion.querySelector('.picker-opcion-nombre');
      label.textContent = (nombre || opcion).textContent.trim();
      lista.hidden = true;
      boton.setAttribute('aria-expanded', 'false');
    });
  });
}

document.querySelectorAll('.picker').forEach(wirePicker);

document.addEventListener('click', e => {
  document.querySelectorAll('.picker-lista:not([hidden])').forEach(lista => {
    const picker = lista.closest('.picker');
    if (picker && !picker.contains(e.target)) {
      lista.hidden = true;
      picker.querySelector('.picker-boton').setAttribute('aria-expanded', 'false');
    }
  });
});

/* ================= Vista previa (modal superpuesto) ================= */
// No reemplaza la pantalla de construcción del cubemap (que queda siempre
// visible detrás) — mismo patrón que la Vista previa del editor de in_SITE.
const modalVistaPrevia = document.getElementById('modal-vista-previa');

function abrirVistaPrevia() {
  modalVistaPrevia.hidden = false;
  reanudarVisor(viewer);
  // El visor Panolens se crea con el modal oculto (tamaño 0x0); al mostrarlo
  // hay que forzar que recalcule su tamaño.
  window.dispatchEvent(new Event('resize'));
}

function cerrarVistaPrevia() {
  modalVistaPrevia.hidden = true;
  pausarVisor(viewer);
}

document.getElementById('btn-vista-previa').addEventListener('click', abrirVistaPrevia);
document.getElementById('cerrar-vista-previa').addEventListener('click', cerrarVistaPrevia);
