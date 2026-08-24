// raumlab-chrome — comportamiento del header/nav compartido por TODOS los
// módulos de RaumLab (toggle del panel, submenú "Recursos", cierre al
// elegir un enlace). Único archivo real, no una copia por módulo — ver el
// comentario de cabecera de raumlab-chrome.css para por qué.
// a[href]: enlaces reales de navegación (in_SITE). button[data-modo]:
// cambio de modo dentro de una app de una sola página (trans_FORMA,
// espacio_INM) — también debe cerrar el panel en celular. El cambio de
// modo en sí NO vive acá — lo resuelve el JS propio de cada módulo, que sí
// necesita disparar lógica propia.

// Helper compartido: mismo breakpoint que @media (max-width: 768px) en
// raumlab-chrome.css, para gatear en JS cualquier comportamiento que deba
// existir solo en celular sin tocar la versión de escritorio.
window.rcIsMobile = function () {
    return window.matchMedia('(max-width: 768px)').matches;
};

// --header-h/--footer-h en el media query de celular son una ESTIMACIÓN de
// respaldo (la primera pintura los necesita antes de que exista el DOM para
// medir nada) — según cambie la fuente cargada, el wrap de las pestañas, o
// el modelo de teléfono, esa estimación queda corta o larga y el padding
// del contenido no calza con el alto real. Corregirla acá una vez que el
// header/footer ya están pintados (y de nuevo si cambian de tamaño) evita
// tener que ajustar el número a mano por cada dispositivo.
function syncChromeHeights() {
    var headerStack = document.querySelector('.rc-header-stack');
    var footer = document.querySelector('.rc-footer');
    if (headerStack) {
        document.documentElement.style.setProperty('--header-h', headerStack.offsetHeight + 'px');
    }
    if (footer) {
        document.documentElement.style.setProperty('--footer-h', footer.offsetHeight + 'px');
    }
}

if (window.rcIsMobile && window.rcIsMobile()) {
    syncChromeHeights();
    window.addEventListener('resize', syncChromeHeights);
    window.addEventListener('orientationchange', syncChromeHeights);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(syncChromeHeights);
    }
}

// ============================================================
// DIAGNÓSTICO TEMPORAL — panel de errores visible en pantalla.
// Varios bugs reportados (canal alfa "en blanco", texturas que no
// cargan) no tiran ningún error visible en la interfaz — fallan en
// silencio del lado de Three.js/Panolens. Esto muestra en la propia
// pantalla del celular cualquier error de JS o de carga de imagen que
// hoy se pierde, para diagnosticar con el error real en vez de con
// hipótesis. Sacar una vez resueltos los bugs de canal alfa/texturas.
// ============================================================
if (window.rcIsMobile && window.rcIsMobile()) {
    var rcDebugPanel = null;
    var rcDebugLines = [];

    function rcShowDebug(msg) {
        rcDebugLines.push(msg);
        if (!rcDebugPanel) {
            rcDebugPanel = document.createElement('div');
            rcDebugPanel.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;' +
                'max-height:40vh;overflow-y:auto;background:rgba(200,0,0,0.95);color:#fff;' +
                'font:11px/1.4 monospace;padding:8px;border-radius:6px;white-space:pre-wrap;' +
                'word-break:break-word;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
            var closeBtn = document.createElement('button');
            closeBtn.textContent = 'X cerrar diagnóstico';
            closeBtn.style.cssText = 'display:block;margin-bottom:6px;background:#fff;color:#c00;' +
                'border:none;padding:4px 8px;border-radius:4px;font-weight:bold;';
            closeBtn.onclick = function () { rcDebugPanel.remove(); rcDebugPanel = null; };
            rcDebugPanel.appendChild(closeBtn);
            document.body.appendChild(rcDebugPanel);
        }
        var line = document.createElement('div');
        line.style.cssText = 'border-top:1px solid rgba(255,255,255,0.3);padding-top:4px;margin-top:4px;';
        line.textContent = '[' + rcDebugLines.length + '] ' + msg;
        rcDebugPanel.appendChild(line);
    }
    window.rcShowDebug = rcShowDebug;

    window.addEventListener('error', function (e) {
        rcShowDebug('JS error: ' + (e.message || e) + (e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : ''));
    });
    window.addEventListener('unhandledrejection', function (e) {
        var reason = e.reason;
        rcShowDebug('Promise rechazada: ' + (reason && reason.message ? reason.message : reason));
    });
}

(function () {
    var navToggle = document.getElementById('navToggle');
    var navPanel = document.getElementById('navPanel');
    var navScrim = document.getElementById('navScrim');
    var recursosToggle = document.getElementById('recursosToggle');
    var recursosItem = document.getElementById('recursosItem');

    if (!navToggle || !navPanel || !navScrim) return;

    function closeNav() {
        navPanel.classList.remove('open');
        navScrim.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
    }

    navToggle.addEventListener('click', function () {
        var isOpen = navPanel.classList.toggle('open');
        navScrim.classList.toggle('open', isOpen);
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navScrim.addEventListener('click', closeNav);

    if (recursosToggle && recursosItem) {
        recursosToggle.addEventListener('click', function () {
            var isOpen = recursosItem.classList.toggle('open');
            recursosToggle.setAttribute('aria-expanded', String(isOpen));
        });
    }

    // data-modo (trans_FORMA) y data-mode (espacio_INM): mismo rol, dos
    // nombres de atributo distintos entre módulos — hay que cerrar el panel
    // al elegir cualquiera de los dos.
    navPanel.querySelectorAll('a[href], button[data-modo], button[data-mode]').forEach(function (link) {
        link.addEventListener('click', closeNav);
    });
})();
