// src/js/dxf.js
// Escritor DXF R12 ASCII puro (sin dependencias, sin DOM).
// entidades: [{ tipo: 'punto'|'linea'|'poligono'|'libre', puntos: [{X,Y}, ...],
//               color?: { nombre: string, aci: number } }]
// Coordenadas ya en metros reales: 1 unidad DXF = 1 metro.
// Cada color usado se exporta como su propia capa (TABLES/LAYER) — así en
// AutoCAD se puede activar/desactivar por color, no solo verlo distinto.

export function generarDXF(entidades) {
    const capasUsadas = new Map(); // nombreCapa -> aci
    entidades.forEach(ent => {
        const capa = ent.color ? ent.color.nombre : '0';
        if (capa !== '0' && !capasUsadas.has(capa)) {
            capasUsadas.set(capa, ent.color.aci || 7);
        }
    });

    const lineas = [
        '0', 'SECTION', '2', 'HEADER',
        '9', '$ACADVER', '1', 'AC1009',
        '0', 'ENDSEC'
    ];

    if (capasUsadas.size > 0) {
        lineas.push('0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', String(capasUsadas.size));
        capasUsadas.forEach((aci, nombre) => {
            lineas.push('0', 'LAYER', '2', nombre, '70', '0', '62', String(aci), '6', 'CONTINUOUS');
        });
        lineas.push('0', 'ENDTAB', '0', 'ENDSEC');
    }

    lineas.push('0', 'SECTION', '2', 'ENTITIES');

    entidades.forEach(entidad => {
        const capa = entidad.color ? entidad.color.nombre : '0';
        if (entidad.tipo === 'punto') {
            lineas.push(...entidadPunto(entidad.puntos[0], capa));
        } else if (entidad.tipo === 'linea') {
            lineas.push(...entidadLinea(entidad.puntos[0], entidad.puntos[1], capa));
        } else if (entidad.tipo === 'poligono') {
            lineas.push(...entidadPolilinea(entidad.puntos, true, capa));
        } else if (entidad.tipo === 'libre') {
            lineas.push(...entidadPolilinea(entidad.puntos, false, capa));
        }
    });

    lineas.push('0', 'ENDSEC', '0', 'EOF');
    return lineas.join('\r\n');
}

function entidadPunto(p, capa) {
    return ['0', 'POINT', '8', capa, '10', String(p.X), '20', String(p.Y), '30', '0.0'];
}

function entidadLinea(p1, p2, capa) {
    return [
        '0', 'LINE', '8', capa,
        '10', String(p1.X), '20', String(p1.Y), '30', '0.0',
        '11', String(p2.X), '21', String(p2.Y), '31', '0.0'
    ];
}

// Polilínea "clásica" (POLYLINE/VERTEX/SEQEND) — compatible con R12.
// LWPOLYLINE no existe en R12: se agregó en versiones posteriores de AutoCAD.
function entidadPolilinea(puntos, cerrada, capa) {
    const lineas = ['0', 'POLYLINE', '8', capa, '66', '1', '70', cerrada ? '1' : '0'];
    puntos.forEach(p => {
        lineas.push('0', 'VERTEX', '8', capa, '10', String(p.X), '20', String(p.Y), '30', '0.0');
    });
    lineas.push('0', 'SEQEND');
    return lineas;
}
