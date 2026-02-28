
import { Point, VectorSegment } from './types';

/**
 * Módulo de Fitting de Curvas Bézier Adaptativo
 * Implementação 100% iterativa para evitar Stack Overflow.
 */

const MAX_SUBDIVISION = 25; // Aumentado para permitir curvas mais complexas
const DEBUG = true; 

interface CubicBezier {
    p0: Point;
    p1: Point;
    p2: Point;
    p3: Point;
}

interface StackItem {
    points: Point[];
    depth: number;
}

export function fitBezier(points: Point[], tolerance: number): VectorSegment[] {
    if (points.length < 2) return [];
    
    const result: VectorSegment[] = [];
    const stack: StackItem[] = [{ points, depth: 0 }];
    
    let totalSubdivisions = 0;
    let curvesAccepted = 0;
    let linesAccepted = 0;
    let fallbacks = 0;

    while (stack.length > 0) {
        const item = stack.pop()!;
        const currentPoints = item.points;
        const depth = item.depth;

        // Só permitir fallback linear se o segmento tiver menos de 5 pontos (ou for realmente linear)
        if (currentPoints.length < 5) {
            result.push({ 
                type: 'line', 
                points: [currentPoints[0], currentPoints[currentPoints.length - 1]] 
            });
            linesAccepted++;
            continue;
        }

        if (depth >= MAX_SUBDIVISION) {
            fallbacks++;
            result.push({ 
                type: 'line', 
                points: [currentPoints[0], currentPoints[currentPoints.length - 1]] 
            });
            linesAccepted++;
            continue;
        }

        if (checkLinearity(currentPoints, tolerance)) {
            result.push({ 
                type: 'line', 
                points: [currentPoints[0], currentPoints[currentPoints.length - 1]] 
            });
            linesAccepted++;
            continue;
        }

        const bezier = fitCubicBezier(currentPoints);
        const error = calculateError(currentPoints, bezier);

        // Aumentar tolerância de erro conforme solicitado (usando o valor passado ou um base mais alto)
        const adjustedTolerance = Math.max(tolerance, 2.5);

        if (error > adjustedTolerance) {
            const mid = Math.floor(currentPoints.length / 2);
            const leftPoints = currentPoints.slice(0, mid + 1);
            const rightPoints = currentPoints.slice(mid);

            if (leftPoints.length < 3 || rightPoints.length < 3) {
                 result.push({ 
                     type: 'line', 
                     points: [currentPoints[0], currentPoints[currentPoints.length - 1]] 
                 });
                 linesAccepted++;
                 continue;
            }

            // Removida a regra de melhoria mínima percentual (1%) para permitir mais subdivisões se necessário
            stack.push({ points: rightPoints, depth: depth + 1 });
            stack.push({ points: leftPoints, depth: depth + 1 });
            totalSubdivisions++;
        } else {
            result.push({ 
                type: 'bezier', 
                points: [bezier.p0, bezier.p1, bezier.p2, bezier.p3] 
            });
            curvesAccepted++;
        }
    }

    if (DEBUG) {
        console.log(`[BezierFitting] Curvas: ${curvesAccepted}, Linhas: ${linesAccepted}, Subdivisões: ${totalSubdivisions}, Fallbacks: ${fallbacks}`);
    }

    return result;
}

/**
 * Verifica se um conjunto de pontos pode ser representado por uma linha reta
 * dentro da tolerância especificada.
 */
function checkLinearity(points: Point[], tolerance: number): boolean {
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    
    if (mag === 0) return true;

    for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        // Distância do ponto à reta (fórmula simplificada)
        const dist = Math.abs(dy * p.x - dx * p.y + end.x * start.y - end.y * start.x) / mag;
        if (dist > tolerance) return false;
    }
    return true;
}

/**
 * Ajusta uma curva Bézier cúbica aos pontos usando uma heurística de tangentes.
 */
function fitCubicBezier(points: Point[]): CubicBezier {
    const p0 = points[0];
    const p3 = points[points.length - 1];
    
    const n = points.length - 1;
    // Tangentes aproximadas nas extremidades
    const tanL = { x: points[1].x - points[0].x, y: points[1].y - points[0].y };
    const tanR = { x: points[n-1].x - points[n].x, y: points[n-1].y - points[n].y };
    
    // Heurística melhorada: se as tangentes forem muito curtas, olhar um pouco mais longe
    if (points.length > 4) {
        tanL.x = (points[1].x - points[0].x) * 0.5 + (points[2].x - points[1].x) * 0.5;
        tanL.y = (points[1].y - points[0].y) * 0.5 + (points[2].y - points[1].y) * 0.5;
        tanR.x = (points[n-1].x - points[n].x) * 0.5 + (points[n-2].x - points[n-1].x) * 0.5;
        tanR.y = (points[n-1].y - points[n].y) * 0.5 + (points[n-2].y - points[n-1].y) * 0.5;
    }
    
    const chord = Math.sqrt(Math.pow(p3.x - p0.x, 2) + Math.pow(p3.y - p0.y, 2));
    const dist = chord / 3;
    
    const magL = Math.sqrt(tanL.x * tanL.x + tanL.y * tanL.y);
    const magR = Math.sqrt(tanR.x * tanR.x + tanR.y * tanR.y);
    
    const p1 = {
        x: p0.x + (magL > 0 ? (tanL.x / magL) * dist : 0),
        y: p0.y + (magL > 0 ? (tanL.y / magL) * dist : 0)
    };
    
    const p2 = {
        x: p3.x + (magR > 0 ? (tanR.x / magR) * dist : 0),
        y: p3.y + (magR > 0 ? (tanR.y / magR) * dist : 0)
    };

    return { p0, p1, p2, p3 };
}

/**
 * Calcula o erro máximo de distância entre os pontos originais e a curva Bézier.
 */
function calculateError(points: Point[], bezier: CubicBezier): number {
    let maxError = 0;
    
    // 4️⃣ Proteger parametrização por comprimento de arco
    const u = chordLengthParameterize(points);
    if (!u) return 0;

    for (let i = 0; i < points.length; i++) {
        const bt = getBezierPoint(bezier, u[i]);
        const dist = Math.sqrt(Math.pow(points[i].x - bt.x, 2) + Math.pow(points[i].y - bt.y, 2));
        if (dist > maxError) maxError = dist;
    }
    return maxError;
}

/**
 * Parametriza os pontos com base no comprimento da corda (Chord Length Parameterization).
 * Evita divisão por zero.
 */
function chordLengthParameterize(points: Point[]): number[] | null {
    const u: number[] = [0];
    let totalDist = 0;
    for (let i = 1; i < points.length; i++) {
        totalDist += Math.sqrt(Math.pow(points[i].x - points[i-1].x, 2) + Math.pow(points[i].y - points[i-1].y, 2));
        u.push(totalDist);
    }
    
    // 4️⃣ Evitar divisão por zero ou geração de NaN
    if (totalDist === 0) return null;

    for (let i = 0; i < u.length; i++) {
        u[i] /= totalDist;
    }
    return u;
}

/**
 * Calcula um ponto na curva Bézier cúbica para um valor t [0, 1].
 */
function getBezierPoint(b: CubicBezier, t: number): Point {
    const invT = 1 - t;
    const b0 = Math.pow(invT, 3);
    const b1 = 3 * Math.pow(invT, 2) * t;
    const b2 = 3 * invT * Math.pow(t, 2);
    const b3 = Math.pow(t, 3);
    
    return {
        x: b0 * b.p0.x + b1 * b.p1.x + b2 * b.p2.x + b3 * b.p3.x,
        y: b0 * b.p0.y + b1 * b.p1.y + b2 * b.p2.y + b3 * b.p3.y
    };
}
