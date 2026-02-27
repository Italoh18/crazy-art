
import { Point, VectorSegment } from './types';

export function fitBezier(points: Point[], tolerance: number): VectorSegment[] {
    if (points.length < 2) return [];
    if (points.length === 2) {
        return [{ type: 'line', points: [points[0], points[1]] }];
    }

    // Check if it's effectively a line
    const isLine = checkLinearity(points, tolerance);
    if (isLine) {
        return [{ type: 'line', points: [points[0], points[points.length - 1]] }];
    }

    // Fit cubic bezier
    const bezier = fitCubicBezier(points);
    const error = calculateError(points, bezier);

    if (error > tolerance && points.length > 4) {
        // Subdivide and recurse
        const mid = Math.floor(points.length / 2);
        const left = fitBezier(points.slice(0, mid + 1), tolerance);
        const right = fitBezier(points.slice(mid), tolerance);
        return [...left, ...right];
    }

    return [{ type: 'bezier', points: [bezier.p0, bezier.p1, bezier.p2, bezier.p3] }];
}

function checkLinearity(points: Point[], tolerance: number): boolean {
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    
    if (mag === 0) return true;

    for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const dist = Math.abs(dy * p.x - dx * p.y + end.x * start.y - end.y * start.x) / mag;
        if (dist > tolerance) return false;
    }
    return true;
}

interface CubicBezier {
    p0: Point;
    p1: Point;
    p2: Point;
    p3: Point;
}

function fitCubicBezier(points: Point[]): CubicBezier {
    const p0 = points[0];
    const p3 = points[points.length - 1];
    
    // Simplified heuristic for control points
    // In a real implementation, we'd use Schneider's algorithm or similar least-squares approach
    const n = points.length - 1;
    const tanL = { x: points[1].x - points[0].x, y: points[1].y - points[0].y };
    const tanR = { x: points[n-1].x - points[n].x, y: points[n-1].y - points[n].y };
    
    const dist = Math.sqrt(Math.pow(p3.x - p0.x, 2) + Math.pow(p3.y - p0.y, 2)) / 3;
    
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

function calculateError(points: Point[], bezier: CubicBezier): number {
    let maxError = 0;
    for (let i = 0; i < points.length; i++) {
        const t = i / (points.length - 1);
        const bt = getBezierPoint(bezier, t);
        const dist = Math.sqrt(Math.pow(points[i].x - bt.x, 2) + Math.pow(points[i].y - bt.y, 2));
        if (dist > maxError) maxError = dist;
    }
    return maxError;
}

function getBezierPoint(b: CubicBezier, t: number): Point {
    const invT = 1 - t;
    return {
        x: Math.pow(invT, 3) * b.p0.x + 3 * Math.pow(invT, 2) * t * b.p1.x + 3 * invT * Math.pow(t, 2) * b.p2.x + Math.pow(t, 3) * b.p3.x,
        y: Math.pow(invT, 3) * b.p0.y + 3 * Math.pow(invT, 2) * t * b.p1.y + 3 * invT * Math.pow(t, 2) * b.p2.y + Math.pow(t, 3) * b.p3.y
    };
}
