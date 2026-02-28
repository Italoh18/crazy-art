
import { VectorPath, ColorRGB } from './types';

export function buildSVG(paths: VectorPath[], width: number, height: number): string {
    // Group by color for SVG groups
    const colorGroups = new Map<string, VectorPath[]>();
    for (const path of paths) {
        const key = `rgb(${path.color.r},${path.color.g},${path.color.b})`;
        if (!colorGroups.has(key)) colorGroups.set(key, []);
        colorGroups.get(key)!.push(path);
    }

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;

    for (const [color, group] of colorGroups.entries()) {
        const pathData = group.map(path => buildPathData(path)).join(' ');
        svg += `  <path fill="${color}" d="${pathData}" />\n`;
    }

    svg += `</svg>`;
    return svg;
}

function buildPathData(path: VectorPath): string {
    if (path.segments.length === 0) return "";

    let d = `M ${path.segments[0].points[0].x} ${path.segments[0].points[0].y}`;

    for (const seg of path.segments) {
        if (seg.type === 'line') {
            d += ` L ${seg.points[1].x} ${seg.points[1].y}`;
        } else {
            const [p0, p1, p2, p3] = seg.points;
            d += ` C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
        }
    }

    d += " Z";
    return d;
}
