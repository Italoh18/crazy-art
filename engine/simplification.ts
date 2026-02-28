
import { Point } from './types';

/**
 * Ramer-Douglas-Peucker algorithm for path simplification.
 */
export function simplifyPath(points: Point[], epsilon: number): Point[] {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let index = 0;

    for (let i = 1; i < points.length - 1; i++) {
        const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
        if (dist > maxDist) {
            index = i;
            maxDist = dist;
        }
    }

    if (maxDist > epsilon) {
        const left = simplifyPath(points.slice(0, index + 1), epsilon);
        const right = simplifyPath(points.slice(index), epsilon);
        return [...left.slice(0, left.length - 1), ...right];
    } else {
        return [points[0], points[points.length - 1]];
    }
}

function perpendicularDistance(p: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    
    if (mag === 0) {
        return Math.sqrt(Math.pow(p.x - lineStart.x, 2) + Math.pow(p.y - lineStart.y, 2));
    }

    return Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / mag;
}
