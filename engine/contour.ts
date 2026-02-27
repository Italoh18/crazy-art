
import { Point, Contour, ColorRGB } from './types';

export function extractContours(mask: Uint8Array, width: number, height: number, color: ColorRGB): Contour[] {
    const contours: Contour[] = [];
    const visited = new Uint8Array(width * height);

    // Marching Squares implementation
    // We iterate through the grid and find edges
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const idx = y * width + x;
            if (mask[idx] === 1 && !visited[idx]) {
                const path = traceContour(mask, x, y, width, height, visited);
                if (path.length > 3) {
                    const isHole = calculateIsHole(path);
                    contours.push({ points: path, isHole, color });
                }
            }
        }
    }
    return contours;
}

function traceContour(mask: Uint8Array, startX: number, startY: number, width: number, height: number, visited: Uint8Array): Point[] {
    const points: Point[] = [];
    let currX = startX;
    let currY = startY;
    
    // Moore Neighborhood tracing or similar
    // For simplicity, let's use a basic edge follower
    let dir = 0; // 0: right, 1: down, 2: left, 3: up
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    
    let firstX = startX;
    let firstY = startY;
    
    let watchdog = 100000;
    
    do {
        points.push({ x: currX, y: currY });
        visited[currY * width + currX] = 1;
        
        // Try to find next pixel in neighborhood
        let found = false;
        // Search clockwise
        for (let i = 0; i < 4; i++) {
            const nextDir = (dir + 3 + i) % 4;
            const nx = currX + dirs[nextDir][0];
            const ny = currY + dirs[nextDir][1];
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx] === 1) {
                currX = nx;
                currY = ny;
                dir = nextDir;
                found = true;
                break;
            }
        }
        
        if (!found) break;
        watchdog--;
    } while ((currX !== firstX || currY !== firstY) && watchdog > 0);
    
    return points;
}

function calculateIsHole(points: Point[]): boolean {
    // Shoelace formula for area. Positive area = clockwise = outer, Negative = counter-clockwise = hole (depending on coordinate system)
    // In SVG/Canvas (y increases downwards), clockwise is usually outer.
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        area += (p1.x * p2.y - p2.x * p1.y);
    }
    return area < 0; 
}
