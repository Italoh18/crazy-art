
import { Point } from './types';

export interface PointWithMetadata extends Point {
    isCorner: boolean;
    angle: number;
}

export function detectCorners(points: Point[], thresholdAngle: number): PointWithMetadata[] {
    const result: PointWithMetadata[] = points.map(p => ({ ...p, isCorner: false, angle: 0 }));
    if (points.length < 3) return result;

    const windowSize = 2; // Look ahead/behind to smooth out pixel noise

    for (let i = 0; i < points.length; i++) {
        const prevIdx = (i - windowSize + points.length) % points.length;
        const nextIdx = (i + windowSize) % points.length;

        const p = points[i];
        const prev = points[prevIdx];
        const next = points[nextIdx];

        const v1 = { x: p.x - prev.x, y: p.y - prev.y };
        const v2 = { x: next.x - p.x, y: next.y - p.y };

        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        if (mag1 > 0 && mag2 > 0) {
            const dot = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
            // Clamp dot for acos
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
            result[i].angle = angle;

            if (angle > thresholdAngle) {
                result[i].isCorner = true;
            }
        }
    }

    return result;
}
