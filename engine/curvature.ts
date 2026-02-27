
import { Point } from './types';
import { PointWithMetadata } from './cornerDetection';

export interface Segment {
    points: Point[];
    isCorner: boolean;
}

export function analyzeCurvature(points: PointWithMetadata[], sensitivity: number): Segment[] {
    if (points.length === 0) return [];
    
    const segments: Segment[] = [];
    let currentSegment: Point[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
        const p = points[i];
        const prev = points[i - 1];

        // Split conditions:
        // 1. Point is a corner
        // 2. Significant change in curvature (angle)
        // 3. Change in sign of curvature (not easily done with just angle, but we can detect sharp turns)
        
        const shouldSplit = p.isCorner || Math.abs(p.angle - prev.angle) > sensitivity;

        if (shouldSplit) {
            segments.push({ points: currentSegment, isCorner: prev.isCorner });
            currentSegment = [p];
        } else {
            currentSegment.push(p);
        }
    }

    if (currentSegment.length > 0) {
        segments.push({ points: currentSegment, isCorner: points[points.length - 1].isCorner });
    }

    return segments;
}
