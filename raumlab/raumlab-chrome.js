// raumlab-chrome — comportamiento del header/nav compartido por TODOS los
// módulos de RaumLab (toggle del panel, submenú "Recursos", cierre al
// elegir un enlace). Único archivo real, no una copia por módulo — ver el
// comentario de cabecera de raumlab-chrome.css para por qué.
// a[href]: enlaces reales de navegación (in_SITE). button[data-modo]:
// cambio de modo dentro de una app de una sola página (trans_FORMA,
// espacio_INM) — también debe cerrar el panel en celular. El cambio de
// modo en sí NO vive acá — lo resuelve el JS propio de cada módulo, que sí
// necesita disparar lógica propia.
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

    navPanel.querySelectorAll('a[href], button[data-modo]').forEach(function (link) {
        link.addEventListener('click', closeNav);
    });
})();
