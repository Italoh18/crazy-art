
import { VectorPath, ColorRGB } from './types';
import * as martinez from 'martinez-polygon-clipping';

export function mergeTopologies(paths: VectorPath[]): VectorPath[] {
    // Group paths by color
    const colorGroups = new Map<string, VectorPath[]>();
    for (const path of paths) {
        const key = `${path.color.r},${path.color.g},${path.color.b}`;
        if (!colorGroups.has(key)) colorGroups.set(key, []);
        colorGroups.get(key)!.push(path);
    }

    const mergedPaths: VectorPath[] = [];

    for (const [colorStr, group] of colorGroups.entries()) {
        const [r, g, b] = colorStr.split(',').map(Number);
        const color: ColorRGB = { r, g, b };

        // Convert paths to polygons for martinez
        // Martinez expects [ [ [x,y], [x,y], ... ] ]
        const polygons = group.map(path => {
            const poly: [number, number][] = [];
            for (const seg of path.segments) {
                if (seg.type === 'line') {
                    poly.push([seg.points[0].x, seg.points[0].y]);
                } else {
                    // Approximate bezier for clipping
                    for (let t = 0; t <= 1; t += 0.2) {
                        const p = getBezierPoint(seg.points, t);
                        poly.push([p.x, p.y]);
                    }
                }
            }
            // Close polygon if needed
            if (poly.length > 0 && (poly[0][0] !== poly[poly.length-1][0] || poly[0][1] !== poly[poly.length-1][1])) {
                poly.push(poly[0]);
            }
            return [poly];
        });

        if (polygons.length === 0) continue;

        try {
            let unionResult = polygons[0];
            for (let i = 1; i < polygons.length; i++) {
                // @ts-ignore
                unionResult = martinez.union(unionResult, polygons[i]);
            }

            // Convert back to VectorPath
            // unionResult can be a MultiPolygon
            // @ts-ignore
            const multiPoly = Array.isArray(unionResult[0][0][0]) ? unionResult : [unionResult];
            
            for (const poly of multiPoly) {
                // @ts-ignore
                for (const ring of poly) {
                    const segments = [];
                    for (let i = 0; i < ring.length - 1; i++) {
                        segments.push({
                            type: 'line' as const,
                            points: [{ x: ring[i][0], y: ring[i][1] }, { x: ring[i+1][0], y: ring[i+1][1] }]
                        });
                    }
                    mergedPaths.push({ segments, color, isHole: false });
                }
            }
        } catch (e) {
            console.error("Topology merge error:", e);
            // Fallback: just add original paths
            mergedPaths.push(...group);
        }
    }

    return mergedPaths;
}

function getBezierPoint(pts: any[], t: number) {
    const [p0, p1, p2, p3] = pts;
    const invT = 1 - t;
    return {
        x: Math.pow(invT, 3) * p0.x + 3 * Math.pow(invT, 2) * t * p1.x + 3 * invT * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x,
        y: Math.pow(invT, 3) * p0.y + 3 * Math.pow(invT, 2) * t * p1.y + 3 * invT * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y
    };
}
// Fix typo in getBezierPoint
