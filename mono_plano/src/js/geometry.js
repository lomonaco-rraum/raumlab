// src/js/geometry.js
// Motor matemático para cálculo de Homografía (Método Analítico y Método Geométrico)

/**
 * Método Analítico: Homografía por Mínimos Cuadrados
 */
export function calcularHomografia(puntos) {
    if (puntos.length < 4) {
        throw new Error("Se requieren al menos 4 puntos de control para calcular la homografía.");
    }

    const A = [];
    const B = [];

    for (let i = 0; i < puntos.length; i++) {
        const x = puntos[i].xImg;
        const y = puntos[i].yImg;
        const X = puntos[i].xObj;
        const Y = puntos[i].yObj;

        A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
        A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
        B.push(X);
        B.push(Y);
    }

    const h = resolverMinimosCuadrados(A, B);
    
    const H = [
        [h[0], h[1], h[2]],
        [h[3], h[4], h[5]],
        [h[6], h[7], 1.0   ]
    ];

    return H;
}

function resolverMinimosCuadrados(A, B) {
    const AT = transpuesta(A);
    const ATA = multiplicarMatrices(AT, A);
    const ATB = multiplicarMatrizVector(AT, B);
    const ATAInv = invertirMatrizNxN(ATA);
    return multiplicarMatrizVector(ATAInv, ATB);
}

function transpuesta(A) {
    const filas = A.length;
    const cols = A[0].length;
    const AT = Array(cols).fill(0).map(() => Array(filas).fill(0));
    for (let i = 0; i < filas; i++) {
        for (let j = 0; j < cols; j++) {
            AT[j][i] = A[i][j];
        }
    }
    return AT;
}

function multiplicarMatrices(A, B) {
    const filasA = A.length, colsA = A[0].length, colsB = B[0].length;
    const C = Array(filasA).fill(0).map(() => Array(colsB).fill(0));
    for (let i = 0; i < filasA; i++) {
        for (let j = 0; j < colsB; j++) {
            for (let k = 0; k < colsA; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return C;
}

function multiplicarMatrizVector(A, v) {
    const filas = A.length;
    const cols = A[0].length;
    const resultado = Array(filas).fill(0);
    for (let i = 0; i < filas; i++) {
        for (let j = 0; j < cols; j++) {
            resultado[i] += A[i][j] * v[j];
        }
    }
    return resultado;
}

function invertirMatrizNxN(M) {
    const n = M.length;
    const identidad = Array(n).fill(0).map((_, i) => {
        const fila = Array(n).fill(0);
        fila[i] = 1;
        return fila;
    });

    const mat = M.map((fila, i) => [...fila, ...identidad[i]]);

    for (let i = 0; i < n; i++) {
        let pivote = mat[i][i];
        if (Math.abs(pivote) < 1e-12) {
            let swapRow = i + 1;
            while (swapRow < n && Math.abs(mat[swapRow][i]) < 1e-12) swapRow++;
            if (swapRow < n) {
                const temp = mat[i];
                mat[i] = mat[swapRow];
                mat[swapRow] = temp;
                pivote = mat[i][i];
            }
        }

        for (let j = 0; j < 2 * n; j++) {
            mat[i][j] /= pivote;
        }

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = mat[k][i];
                for (let j = 0; j < 2 * n; j++) {
                    mat[k][j] -= factor * mat[i][j];
                }
            }
        }
    }

    return mat.map(fila => fila.slice(n));
}

/**
 * Método Geométrico (RDF): Homografía por Puntos de Fuga e Intersección de Rectas (4 Esquinas)
 */
export function calcularHomografiaGeometrica(rectasVerticales, rectasHorizontales, escalaRefX, escalaRefY) {
    if (rectasVerticales.length < 2 || rectasHorizontales.length < 2) {
        throw new Error("Se requieren al menos 2 rectas verticales y 2 horizontales.");
    }

    // 1. Líneas verticales
    const p1v = [rectasVerticales[0].p1.xImg, rectasVerticales[0].p1.yImg, 1];
    const p2v = [rectasVerticales[0].p2.xImg, rectasVerticales[0].p2.yImg, 1];
    const l1v = productoCruz(p1v, p2v);

    const p3v = [rectasVerticales[1].p1.xImg, rectasVerticales[1].p1.yImg, 1];
    const p4v = [rectasVerticales[1].p2.xImg, rectasVerticales[1].p2.yImg, 1];
    const l2v = productoCruz(p3v, p4v);

    // 2. Líneas horizontales
    const p1h = [rectasHorizontales[0].p1.xImg, rectasHorizontales[0].p1.yImg, 1];
    const p2h = [rectasHorizontales[0].p2.xImg, rectasHorizontales[0].p2.yImg, 1];
    const l1h = productoCruz(p1h, p2h);

    const p3h = [rectasHorizontales[1].p1.xImg, rectasHorizontales[1].p1.yImg, 1];
    const p4h = [rectasHorizontales[1].p2.xImg, rectasHorizontales[1].p2.yImg, 1];
    const l2h = productoCruz(p3h, p4h);

    // 3. Intersección de rectas para hallar las 4 esquinas virtuales del rectángulo en la imagen
    const c1 = productoCruz(l1v, l1h);
    const c2 = productoCruz(l2v, l1h);
    const c3 = productoCruz(l2v, l2h);
    const c4 = productoCruz(l1v, l2h);

    if (Math.abs(c1[2]) < 1e-8 || Math.abs(c2[2]) < 1e-8 || Math.abs(c3[2]) < 1e-8 || Math.abs(c4[2]) < 1e-8) {
        throw new Error("Las rectas no forman intersecciones válidas (paralelas o mal definidas).");
    }

    const pImg1 = { xImg: c1[0] / c1[2], yImg: c1[1] / c1[2] };
    const pImg2 = { xImg: c2[0] / c2[2], yImg: c2[1] / c2[2] };
    const pImg3 = { xImg: c3[0] / c3[2], yImg: c3[1] / c3[2] };
    const pImg4 = { xImg: c4[0] / c4[2], yImg: c4[1] / c4[2] };

    // 4. Dimensiones reales desde los inputs de escala
    const anchoMasa = (escalaRefX && escalaRefX.distReal > 0) ? escalaRefX.distReal : 5.0;
    const altoMasa = (escalaRefY && escalaRefY.distReal > 0) ? escalaRefY.distReal : 3.0;

    // Las 4 esquinas (c1..c4) salen en el orden en que se cruzan "recta
    // vertical 1" con "recta horizontal 1", etc. — pero cuál recta es la
    // "1" depende de cuál marcó primero el usuario, no de si está a la
    // izquierda/arriba o a la derecha/abajo en la imagen. Asignar xObj/yObj
    // por ese orden de marcado (en vez de por posición real) es lo que
    // producía un fotoplano espejado/rotado según el orden de clics.
    // Acá se identifica cada esquina por su posición real en la imagen
    // (izquierda/derecha, arriba/abajo) antes de asignarle coordenadas
    // reales, así el resultado no depende del orden en que se marcaron
    // las rectas.
    const esquinas = [pImg1, pImg2, pImg3, pImg4];
    const cx = esquinas.reduce((s, p) => s + p.xImg, 0) / 4;
    const cy = esquinas.reduce((s, p) => s + p.yImg, 0) / 4;

    const supIzq = esquinas.find(p => p.xImg < cx && p.yImg < cy);
    const supDer = esquinas.find(p => p.xImg >= cx && p.yImg < cy);
    const infDer = esquinas.find(p => p.xImg >= cx && p.yImg >= cy);
    const infIzq = esquinas.find(p => p.xImg < cx && p.yImg >= cy);

    if (!supIzq || !supDer || !infDer || !infIzq) {
        throw new Error("No se pudieron identificar las 4 esquinas del rectángulo (rectas casi paralelas o mal definidas).");
    }

    const puntosVirtuales = [
        { xImg: supIzq.xImg, yImg: supIzq.yImg, xObj: 0,         yObj: altoMasa },
        { xImg: supDer.xImg, yImg: supDer.yImg, xObj: anchoMasa, yObj: altoMasa },
        { xImg: infDer.xImg, yImg: infDer.yImg, xObj: anchoMasa, yObj: 0         },
        { xImg: infIzq.xImg, yImg: infIzq.yImg, xObj: 0,         yObj: 0         }
    ];

    // 5. Resolver homografía proyectiva completa usando el motor DLT
    return calcularHomografia(puntosVirtuales);
}

function productoCruz(u, v) {
    return [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
    ];
}

/**
 * Fotomosaico: transformación de similitud 2D (rotación + escala uniforme + traslación)
 * entre el plano métrico de una imagen secundaria (B) y el de la principal (A),
 * ajustada por mínimos cuadrados a partir de puntos homólogos.
 *
 * Modelo (B y A como números complejos z = x + iy): Z_A = a·Z_B + b,
 * con a = escala·e^{iθ}. Expandido a reales es lineal en (a1, a2, b1, b2):
 *   X_A = a1·xB − a2·yB + b1
 *   Y_A = a2·xB + a1·yB + b2
 */
export function calcularTransformSimilitud(paresHomologos) {
    if (paresHomologos.length < 3) {
        throw new Error("Se requieren al menos 3 puntos homólogos.");
    }

    const A = [];
    const B = [];

    for (const par of paresHomologos) {
        A.push([par.xB, -par.yB, 1, 0]);
        B.push(par.xA);
        A.push([par.yB, par.xB, 0, 1]);
        B.push(par.yA);
    }

    const [a1, a2, b1, b2] = resolverMinimosCuadrados(A, B);

    const escala = Math.sqrt(a1 * a1 + a2 * a2);
    const rotacionRad = Math.atan2(a2, a1);

    const aplicar = (xB, yB) => ({
        X: a1 * xB - a2 * yB + b1,
        Y: a2 * xB + a1 * yB + b2
    });

    // Inversa: rotar por -θ y escalar por 1/escala, sobre el punto ya destraslado.
    const aplicarInversa = (X, Y) => {
        const dx = X - b1, dy = Y - b2;
        const denom = a1 * a1 + a2 * a2;
        return {
            X: (a1 * dx + a2 * dy) / denom,
            Y: (-a2 * dx + a1 * dy) / denom
        };
    };

    const residuosPorPunto = paresHomologos.map(par => {
        const pred = aplicar(par.xB, par.yB);
        return Math.hypot(pred.X - par.xA, pred.Y - par.yA);
    });
    const residuoRMS = Math.sqrt(
        residuosPorPunto.reduce((acc, r) => acc + r * r, 0) / residuosPorPunto.length
    );

    return { escala, rotacionRad, tx: b1, ty: b2, aplicar, aplicarInversa, residuoRMS, residuosPorPunto };
}