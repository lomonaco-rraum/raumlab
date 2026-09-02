// raumlab-search.js — buscador global (command palette) compartido por
// TODAS las páginas de RaumLab (hub + los 3 módulos), mismo criterio que
// raumlab-chrome.js: un único archivo real, no una copia por módulo. Se
// carga aparte de raumlab-chrome.js (que el hub no carga, tiene su propio
// script inline) para no depender de esa lógica ni pisarla.
//
// No indexa contenido de texto: el sitio no tiene tanto contenido como
// para justificar un motor de búsqueda de texto completo. Es una lista fija
// de destinos (módulo, página, o modo dentro de un módulo de una sola
// página) que se filtra en el cliente — sin backend, sin build step.

(function () {
    // ---- Índice de destinos -------------------------------------------
    // folder/file: la carpeta y el archivo del sitio (los 4 "módulos" viven
    // en carpetas hermanas: raumlab/, in_site/, mono_plano/, espacio_inm/).
    // hash: opcional — ancla que la página de destino ya sabe interpretar.
    // Las secciones del hub (#investigacion, #soporte, etc.) son un
    // mecanismo que raumlab/index.html YA tiene (ver su <script> inline);
    // "#modo=" / "#mode=" son nuevos, agregados en app.js/espacio-inm.js
    // puntualmente para que este buscador pueda saltar directo a un modo
    // sin importar desde qué página se busca.
    const INDICE = [
        { titulo: 'Inicio', modulo: 'raumlab', folder: 'raumlab', file: 'index.html', palabras: 'home portada raumlab' },
        { titulo: 'Investigación', modulo: 'raumlab', folder: 'raumlab', file: 'index.html', hash: 'investigacion' },
        { titulo: 'Educación', modulo: 'raumlab', folder: 'raumlab', file: 'index.html', hash: 'educacion' },
        { titulo: 'Soporte', modulo: 'raumlab', folder: 'raumlab', file: 'index.html', hash: 'soporte', palabras: 'contacto ayuda solicitar' },
        { titulo: 'Materiales didácticos', modulo: 'raumlab', folder: 'raumlab', file: 'index.html', hash: 'materiales' },
        { titulo: 'Contacto', modulo: 'raumlab', folder: 'raumlab', file: 'index.html', hash: 'contacto' },

        // "palabras" sale de los textos que ya escribió la usuaria para cada
        // módulo (tarjetas de la home, raumlab/index.html) — no vocabulario
        // inventado acá. "representación" se agrega puntualmente donde ella
        // definió que aplica: los módulos/modos que GENERAN planos, eq. o
        // mapa de cubos (trans_FORMA, espacio_INM/Crear) — no in_SITE.
        { titulo: 'espacio_INM', modulo: 'Módulo', folder: 'espacio_inm', file: 'index.html', palabras: 'panorama 360 cubemap equirectangular realidad aumentada inmersivo fotomontaje entornos representación' },
        { titulo: 'in_SITE', modulo: 'Módulo', folder: 'in_site', file: 'index.html', palabras: 'salas relevamiento museo exposición curatorial proyectos artísticos educativo escenas virtuales modelos tridimensionales ficha técnica difusión' },
        { titulo: 'trans_FORMA', modulo: 'Módulo', folder: 'mono_plano', file: 'index.html', palabras: 'fotoplano rectificación imagen relevamiento patrimonio cultural obras bidimensionales deformación geométrica medición fotomosaico representación' },

        { titulo: 'Proyectos', modulo: 'in_SITE', folder: 'in_site', file: 'editor.html', palabras: 'editor salas 3D crear sala escenas virtuales modelos tridimensionales' },
        { titulo: 'Visualizador', modulo: 'in_SITE', folder: 'in_site', file: 'viewer.html', palabras: 'visor ver sala' },
        { titulo: 'Registro', modulo: 'in_SITE', folder: 'in_site', file: 'registro.html', palabras: 'documentación exportar PDF lámina acotados panorama zip ficha técnica' },
        { titulo: 'Galería', modulo: 'in_SITE', folder: 'in_site', file: 'coleccion.html', palabras: 'colección ejemplos curatorial' },
        { titulo: 'Tutoriales', modulo: 'in_SITE', folder: 'in_site', file: 'instrucciones.html', palabras: 'ayuda instrucciones' },

        { titulo: 'Fotoplano', modulo: 'trans_FORMA', folder: 'mono_plano', file: 'index.html', hash: 'modo=fotoplano', palabras: 'rectificar imagen analítico geométrico plano representación relevamiento patrimonio' },
        { titulo: 'Fotomosaico', modulo: 'trans_FORMA', folder: 'mono_plano', file: 'index.html', hash: 'modo=fotomosaico', palabras: 'unir secciones plano representación' },
        { titulo: 'Adaptativo', modulo: 'trans_FORMA', folder: 'mono_plano', file: 'index.html', hash: 'modo=adaptativo', palabras: 'dpi impresión' },
        { titulo: 'Tutoriales', modulo: 'trans_FORMA', folder: 'mono_plano', file: 'index.html', hash: 'modo=tutoriales', palabras: 'ayuda instrucciones' },

        { titulo: 'Crear', modulo: 'espacio_INM', folder: 'espacio_inm', file: 'index.html', hash: 'mode=mode-crear', palabras: 'cubemap equirectangular panorama construir representación mapa de cubos' },
        { titulo: 'Visualizar', modulo: 'espacio_INM', folder: 'espacio_inm', file: 'index.html', hash: 'mode=mode-ver', palabras: 'visor ver panorama' },
        { titulo: 'Galería', modulo: 'espacio_INM', folder: 'espacio_inm', file: 'index.html', hash: 'mode=mode-coleccion', palabras: 'colección ejemplos' },
        { titulo: 'Tutoriales', modulo: 'espacio_INM', folder: 'espacio_inm', file: 'index.html', hash: 'mode=mode-ayuda', palabras: 'ayuda instrucciones' },
    ];

    const CARPETAS = ['raumlab', 'in_site', 'mono_plano', 'espacio_inm'];

    // Mismo criterio que los links ya escritos a mano en el sitio: archivo
    // suelto si ya estoy en esa carpeta ("editor.html"), "../carpeta/archivo"
    // si no — así funciona sin importar en qué dominio/subcarpeta se sirva
    // el sitio, sin asumir que el root del sitio es "/".
    function resolverUrl(item) {
        const partes = location.pathname.split('/').filter(Boolean);
        const carpetaActual = partes.find((p) => CARPETAS.indexOf(p) !== -1);
        const ruta = carpetaActual === item.folder ? item.file : '../' + item.folder + '/' + item.file;
        return item.hash ? ruta + '#' + item.hash : ruta;
    }

    // Rango Unicode de marcas diacríticas combinantes (U+0300-U+036F) — se
    // arma con fromCharCode/RegExp en vez de un literal /̀-ͯ/ para
    // no depender de que el archivo se guarde/edite siempre en UTF-8 limpio.
    const DIACRITICOS = new RegExp(String.fromCharCode(91, 92, 117, 48, 51, 48, 48, 45, 92, 117, 48, 51, 54, 102, 93), 'g');
    function normalizar(s) {
        return s.toLowerCase().normalize('NFD').replace(DIACRITICOS, '');
    }

    const INDICE_NORMALIZADO = INDICE.map((item) => ({
        item,
        texto: normalizar([item.titulo, item.modulo, item.palabras || ''].join(' ')),
    }));

    function buscar(consulta) {
        const q = normalizar(consulta.trim());
        if (!q) return [];
        return INDICE_NORMALIZADO.filter((entry) => entry.texto.indexOf(q) !== -1).map((entry) => entry.item);
    }

    // ---- UI --------------------------------------------------------------
    // Se inyecta a mano (no vive en el HTML de cada página): el botón
    // siempre va en el mismo lugar (justo antes del selector de idioma) en
    // las 9 páginas del sitio, y esta es la única manera de garantizar que
    // las 9 copias queden idénticas sin mantener el mismo bloque de HTML
    // pegado en cada archivo.
    function iconoLupa() {
        return '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    }

    function iniciar() {
        const langPill = document.querySelector('.topbar .lang-pill, .rc-topbar .rc-lang-pill');
        if (!langPill) return;

        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'rc-search-toggle';
        boton.setAttribute('aria-label', 'Buscar en raumlab');
        boton.innerHTML = iconoLupa();
        langPill.insertAdjacentElement('beforebegin', boton);

        const overlay = document.createElement('div');
        overlay.className = 'rc-search-overlay';
        overlay.hidden = true;
        overlay.innerHTML =
            '<div class="rc-search-box" role="dialog" aria-modal="true" aria-label="Buscar en raumlab">' +
            '<div class="rc-search-input-row">' + iconoLupa() +
            '<input type="text" class="rc-search-input" placeholder="Buscar módulos, páginas..." autocomplete="off">' +
            '</div>' +
            '<ul class="rc-search-results"></ul>' +
            '<p class="rc-search-empty" hidden>Sin resultados.</p>' +
            '</div>';
        document.body.appendChild(overlay);

        const input = overlay.querySelector('.rc-search-input');
        const lista = overlay.querySelector('.rc-search-results');
        const vacio = overlay.querySelector('.rc-search-empty');
        let seleccionado = -1;

        function pintar(resultados) {
            lista.innerHTML = '';
            seleccionado = resultados.length ? 0 : -1;
            vacio.hidden = resultados.length !== 0 || !input.value.trim();
            resultados.forEach((item, i) => {
                const li = document.createElement('li');
                li.className = 'rc-search-result' + (i === 0 ? ' active' : '');
                li.innerHTML = '<span class="rc-search-result-titulo">' + item.titulo + '</span><span class="rc-search-result-modulo">' + item.modulo + '</span>';
                li.addEventListener('click', () => ir(item));
                lista.appendChild(li);
            });
        }

        function ir(item) {
            location.href = resolverUrl(item);
        }

        function actualizarActivo() {
            lista.querySelectorAll('.rc-search-result').forEach((li, i) => {
                li.classList.toggle('active', i === seleccionado);
            });
            const activo = lista.querySelector('.rc-search-result.active');
            if (activo) activo.scrollIntoView({ block: 'nearest' });
        }

        function abrir() {
            overlay.hidden = false;
            input.value = '';
            pintar([]);
            // rAF: recién con el overlay ya visible el input puede recibir foco.
            requestAnimationFrame(() => input.focus());
        }

        function cerrar() {
            overlay.hidden = true;
        }

        boton.addEventListener('click', abrir);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cerrar();
        });

        input.addEventListener('input', () => pintar(buscar(input.value)));

        input.addEventListener('keydown', (e) => {
            const resultadosActuales = lista.querySelectorAll('.rc-search-result');
            if (e.key === 'Escape') {
                cerrar();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (resultadosActuales.length) {
                    seleccionado = (seleccionado + 1) % resultadosActuales.length;
                    actualizarActivo();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (resultadosActuales.length) {
                    seleccionado = (seleccionado - 1 + resultadosActuales.length) % resultadosActuales.length;
                    actualizarActivo();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const resultados = buscar(input.value);
                if (resultados[seleccionado]) ir(resultados[seleccionado]);
            }
        });

        // Atajo global "/" (como GitHub, Slack, etc.) — solo cuando no se
        // está escribiendo en otro campo, si no interferiría con cualquier
        // input de texto normal del resto del sitio.
        document.addEventListener('keydown', (e) => {
            if (e.key !== '/' || overlay.hidden === false) return;
            const activo = document.activeElement;
            const escribiendo = activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA' || activo.isContentEditable);
            if (escribiendo) return;
            e.preventDefault();
            abrir();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
