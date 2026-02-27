
import { VectorPath, ColorRGB } from './types';
import * as martinez from 'martinez-polygon-clipping';

/**
 * Módulo de Topologia Defensiva
 * Realiza operações de união de polígonos com validação rigorosa para evitar erros matemáticos.
 */

type MartinezPoint = [number, number];
type MartinezRing = MartinezPoint[];
type MartinezPolygon = MartinezRing[];

const MAX_CONSECUTIVE_ERRORS = 5;
const MAX_POLYGONS_PER_COLOR = 300; // Limite para evitar travamentos em imagens ruidosas

export function mergeTopologies(paths: VectorPath[]): VectorPath[] {
    if (paths.length === 0) return [];

    // Agrupar caminhos por cor
    const colorGroups = new Map<string, VectorPath[]>();
    for (const path of paths) {
        const key = `${path.color.r},${path.color.g},${path.color.b}`;
        if (!colorGroups.has(key)) colorGroups.set(key, []);
        colorGroups.get(key)!.push(path);
    }

    const mergedPaths: VectorPath[] = [];
    let consecutiveErrors = 0;

    for (const [colorStr, group] of colorGroups.entries()) {
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            mergedPaths.push(...group);
            continue;
        }

        const [r, g, b] = colorStr.split(',').map(Number);
        const color: ColorRGB = { r, g, b };

        // 1. Converter e Validar Polígonos
        let validPolygons: MartinezPolygon[] = [];
        for (const path of group) {
            const rawPoly = pathToMartinezPolygon(path);
            const validated = validatePolygon(rawPoly);
            if (validated) {
                validPolygons.push(validated);
            }
        }

        if (validPolygons.length === 0) continue;

        // Se houver muitos polígonos, limitar para evitar travamento
        if (validPolygons.length > MAX_POLYGONS_PER_COLOR) {
            console.warn(`[Topology] Muitos polígonos (${validPolygons.length}) para a cor ${colorStr}. Limitando merge.`);
            // Ordenar por área para manter os maiores/mais importantes
            validPolygons.sort((a, b) => calculatePolygonArea(b) - calculatePolygonArea(a));
            const toMerge = validPolygons.slice(0, MAX_POLYGONS_PER_COLOR);
            const toKeep = validPolygons.slice(MAX_POLYGONS_PER_COLOR);
            
            validPolygons = toMerge;
            // Adicionar os que sobraram diretamente ao final
            for (const p of toKeep) {
                mergedPaths.push(...martinezToVectorPaths(p, color));
            }
        }

        try {
            // 2. Operação de União (Divide and Conquer para performance)
            const unionResult = divideAndConquerUnion(validPolygons);
            
            // 3. Converter de volta para VectorPath
            const pathsFromUnion = martinezToVectorPaths(unionResult, color);
            mergedPaths.push(...pathsFromUnion);
            
            consecutiveErrors = 0;
        } catch (e) {
            consecutiveErrors++;
            console.error(`[Topology] Erro crítico no merge da cor ${colorStr}:`, e);
            mergedPaths.push(...group);
        }
    }

    return mergedPaths;
}

/**
 * União recursiva (Divide and Conquer) para melhor performance O(log N)
 */
function divideAndConquerUnion(polygons: any[]): any {
    if (polygons.length === 0) return null;
    if (polygons.length === 1) return polygons[0];

    const mid = Math.floor(polygons.length / 2);
    const left = divideAndConquerUnion(polygons.slice(0, mid));
    const right = divideAndConquerUnion(polygons.slice(mid));

    if (!left) return right;
    if (!right) return left;

    try {
        // @ts-ignore
        const result = martinez.union(left, right);
        return (result && result.length > 0) ? result : left;
    } catch (e) {
        // Se falhar a união, retorna o maior ou apenas o da esquerda para não travar
        return left;
    }
}

function calculatePolygonArea(poly: MartinezPolygon): number {
    let totalArea = 0;
    for (const ring of poly) {
        let area = 0;
        for (let j = 0; j < ring.length - 1; j++) {
            area += (ring[j][0] * ring[j + 1][1]) - (ring[j + 1][0] * ring[j][1]);
        }
        totalArea += Math.abs(area) / 2;
    }
    return totalArea;
}

/**
 * Valida um polígono Martinez: remove duplicatas, verifica área e número de pontos.
 */
function validatePolygon(polygon: MartinezPolygon): MartinezPolygon | null {
    if (!polygon || polygon.length === 0) return null;

    const validatedRings: MartinezRing[] = [];

    for (let i = 0; i < polygon.length; i++) {
        const ring = polygon[i];
        let cleanRing: MartinezRing = [];

        // Remover pontos duplicados consecutivos e segmentos de comprimento zero
        for (let j = 0; j < ring.length; j++) {
            const p = ring[j];
            if (cleanRing.length === 0) {
                cleanRing.push(p);
            } else {
                const last = cleanRing[cleanRing.length - 1];
                const distSq = Math.pow(p[0] - last[0], 2) + Math.pow(p[1] - last[1], 2);
                if (distSq > 0.000001) { // Tolerância para duplicatas
                    cleanRing.push(p);
                }
            }
        }

        // Garantir que o anel esteja fechado
        if (cleanRing.length > 1) {
            const first = cleanRing[0];
            const last = cleanRing[cleanRing.length - 1];
            const distSq = Math.pow(first[0] - last[0], 2) + Math.pow(first[1] - last[1], 2);
            if (distSq > 0.000001) {
                cleanRing.push([first[0], first[1]]);
            }
        }

        // Verificar se tem pelo menos 3 pontos únicos (4 total com o fechamento)
        if (cleanRing.length < 4) continue;

        // Calcular área (Fórmula de Shoelace)
        let area = 0;
        for (let j = 0; j < cleanRing.length - 1; j++) {
            area += (cleanRing[j][0] * cleanRing[j + 1][1]) - (cleanRing[j + 1][0] * cleanRing[j][1]);
        }
        area = Math.abs(area) / 2;

        if (area > 0.0001) {
            validatedRings.push(cleanRing);
        }
    }

    // O primeiro anel deve ser o anel externo e deve ser válido
    if (validatedRings.length === 0) return null;
    
    return validatedRings;
}

/**
 * Converte um VectorPath para o formato Martinez [ [ [x,y], ... ] ]
 */
function pathToMartinezPolygon(path: VectorPath): MartinezPolygon {
    const ring: MartinezPoint[] = [];
    for (const seg of path.segments) {
        if (seg.type === 'line') {
            ring.push([seg.points[0].x, seg.points[0].y]);
        } else {
            // Aproximação de Bézier para clipping
            const steps = 10;
            for (let t = 0; t < 1; t += 1/steps) {
                const p = getBezierPoint(seg.points, t);
                ring.push([p.x, p.y]);
            }
        }
    }
    
    // Adicionar o último ponto do último segmento
    const lastSeg = path.segments[path.segments.length - 1];
    if (lastSeg) {
        const lastPt = lastSeg.points[lastSeg.points.length - 1];
        ring.push([lastPt.x, lastPt.y]);
    }

    return [ring];
}

/**
 * Converte o resultado do Martinez de volta para VectorPath
 */
function martinezToVectorPaths(result: any, color: ColorRGB): VectorPath[] {
    if (!result || !Array.isArray(result)) return [];

    const paths: VectorPath[] = [];
    
    // Martinez pode retornar Polygon ou MultiPolygon
    // Polygon: [ Ring, Ring, ... ]
    // MultiPolygon: [ Polygon, Polygon, ... ]
    
    const isMultiPolygon = Array.isArray(result[0]) && Array.isArray(result[0][0]) && Array.isArray(result[0][0][0]);
    const polygons = isMultiPolygon ? result : [result];

    for (const poly of polygons) {
        if (!Array.isArray(poly)) continue;
        
        for (let r = 0; r < poly.length; r++) {
            const ring = poly[r];
            if (!Array.isArray(ring) || ring.length < 2) continue;

            const segments = [];
            for (let i = 0; i < ring.length - 1; i++) {
                const p1 = ring[i];
                const p2 = ring[i + 1];
                if (!p1 || !p2) continue;

                segments.push({
                    type: 'line' as const,
                    points: [{ x: p1[0], y: p1[1] }, { x: p2[0], y: p2[1] }]
                });
            }

            if (segments.length > 0) {
                paths.push({
                    segments,
                    color,
                    isHole: r > 0 // O primeiro anel é o externo, os outros são furos
                });
            }
        }
    }

    return paths;
}

function getBezierPoint(pts: any[], t: number) {
    const [p0, p1, p2, p3] = pts;
    const invT = 1 - t;
    const b0 = Math.pow(invT, 3);
    const b1 = 3 * Math.pow(invT, 2) * t;
    const b2 = 3 * invT * Math.pow(t, 2);
    const b3 = Math.pow(t, 3);
    
    return {
        x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
        y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y
    };
}
