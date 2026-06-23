
import { ColorRGB } from './types';

export function createRegionMap(imageData: ImageData, palette: ColorRGB[]): Int32Array {
    const { data, width, height } = imageData;
    const initialRegionMap = new Int32Array(width * height);

    // Step 1: Base color mapping (nearest palette color)
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        let minDist = Infinity;
        let bestIdx = 0;

        for (let j = 0; j < palette.length; j++) {
            const dist = Math.pow(r - palette[j].r, 2) +
                         Math.pow(g - palette[j].g, 2) +
                         Math.pow(b - palette[j].b, 2);
            if (dist < minDist) {
                minDist = dist;
                bestIdx = j;
            }
        }
        initialRegionMap[i / 4] = bestIdx;
    }

    // Step 2: Find connected components (blobs) in initialRegionMap
    const visited = new Uint8Array(width * height);
    const components: Array<{ cx: number; cy: number; colorId: number; size: number }> = [];

    // Auxiliary buffers for queue-based flood fill/BFS
    const localQueueX = new Int32Array(width * height);
    const localQueueY = new Int32Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (visited[idx] === 0) {
                const colorId = initialRegionMap[idx];

                // Perform flood fill to collect all pixels in this component
                let head = 0;
                let tail = 0;

                localQueueX[tail] = x;
                localQueueY[tail] = y;
                visited[idx] = 1;
                tail++;

                let sumX = 0;
                let sumY = 0;

                while (head < tail) {
                    const qx = localQueueX[head];
                    const qy = localQueueY[head];
                    head++;

                    sumX += qx;
                    sumY += qy;

                    // 4-connectivity
                    const n1x = qx + 1;
                    const n1y = qy;
                    if (n1x < width) {
                        const nidx = n1y * width + n1x;
                        if (visited[nidx] === 0 && initialRegionMap[nidx] === colorId) {
                            visited[nidx] = 1;
                            localQueueX[tail] = n1x;
                            localQueueY[tail] = n1y;
                            tail++;
                        }
                    }

                    const n2x = qx - 1;
                    const n2y = qy;
                    if (n2x >= 0) {
                        const nidx = n2y * width + n2x;
                        if (visited[nidx] === 0 && initialRegionMap[nidx] === colorId) {
                            visited[nidx] = 1;
                            localQueueX[tail] = n2x;
                            localQueueY[tail] = n2y;
                            tail++;
                        }
                    }

                    const n3x = qx;
                    const n3y = qy + 1;
                    if (n3y < height) {
                        const nidx = n3y * width + n3x;
                        if (visited[nidx] === 0 && initialRegionMap[nidx] === colorId) {
                            visited[nidx] = 1;
                            localQueueX[tail] = n3x;
                            localQueueY[tail] = n3y;
                            tail++;
                        }
                    }

                    const n4x = qx;
                    const n4y = qy - 1;
                    if (n4y >= 0) {
                        const nidx = n4y * width + n4x;
                        if (visited[nidx] === 0 && initialRegionMap[nidx] === colorId) {
                            visited[nidx] = 1;
                            localQueueX[tail] = n4x;
                            localQueueY[tail] = n4y;
                            tail++;
                        }
                    }
                }

                const numPixels = tail;
                if (numPixels > 0) {
                    let cx = Math.round(sumX / numPixels);
                    let cy = Math.round(sumY / numPixels);

                    // Clamp to legal image bounds
                    cx = Math.max(0, Math.min(width - 1, cx));
                    cy = Math.max(0, Math.min(height - 1, cy));

                    components.push({
                        cx,
                        cy,
                        colorId,
                        size: numPixels
                    });
                }
            }
        }
    }

    // Step 3: Filter components to only keep stable, dominant centers.
    // Extremely small single/two pixel noise is discarded from being a center, unless that color has no other centers.
    const finalCenters: Array<{ cx: number; cy: number; colorId: number }> = [];

    // Find which colors have at least one large component (size >= 3)
    const colorsWithLargeComponents = new Set<number>();
    for (const comp of components) {
        if (comp.size >= 3) {
            colorsWithLargeComponents.add(comp.colorId);
        }
    }

    // Keep the largest component of a rare color if all its components are under size 3
    const largestCompForColor = new Map<number, { cx: number; cy: number; size: number }>();
    for (const comp of components) {
        const existing = largestCompForColor.get(comp.colorId);
        if (!existing || comp.size > existing.size) {
            largestCompForColor.set(comp.colorId, { cx: comp.cx, cy: comp.cy, size: comp.size });
        }
    }

    for (const comp of components) {
        if (comp.size >= 3) {
            finalCenters.push({ cx: comp.cx, cy: comp.cy, colorId: comp.colorId });
        } else {
            // If this is the largest component for a color that has NO components >= 3, keep it to preserve the color index
            if (!colorsWithLargeComponents.has(comp.colorId)) {
                const largest = largestCompForColor.get(comp.colorId);
                if (largest && largest.cx === comp.cx && largest.cy === comp.cy) {
                    finalCenters.push({ cx: comp.cx, cy: comp.cy, colorId: comp.colorId });
                }
            }
        }
    }

    // If for some reason we have no centers, fallback directly to the initial mapped region
    if (finalCenters.length === 0) {
        return initialRegionMap;
    }

    // Step 4: Wave expansion (BFS) from centers.
    // We expand concentric waves from all centers simultaneously at equal speeds.
    // This declares the boundary exactly in the middle ("no meio do caminho") between centers.
    const newRegionMap = new Int32Array(width * height);
    newRegionMap.fill(-1);

    const bfsQueueX = new Int32Array(width * height);
    const bfsQueueY = new Int32Array(width * height);
    const bfsQueueColor = new Int32Array(width * height);
    const bfsDistance = new Int32Array(width * height);
    bfsDistance.fill(-1);

    let head = 0;
    let tail = 0;

    // Initialize BFS with centers
    for (const center of finalCenters) {
        const idx = center.cy * width + center.cx;
        if (bfsDistance[idx] === -1) {
            bfsQueueX[tail] = center.cx;
            bfsQueueY[tail] = center.cy;
            bfsQueueColor[tail] = center.colorId;
            bfsDistance[idx] = 0;
            newRegionMap[idx] = center.colorId;
            tail++;
        }
    }

    // BFS directional steps (4-connectivity)
    const dx = [1, -1, 0, 0];
    const dy = [0, 0, 1, -1];

    while (head < tail) {
        const x = bfsQueueX[head];
        const y = bfsQueueY[head];
        const color = bfsQueueColor[head];
        const dist = bfsDistance[y * width + x];
        head++;

        for (let d = 0; d < 4; d++) {
            const nx = x + dx[d];
            const ny = y + dy[d];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nidx = ny * width + nx;
                if (bfsDistance[nidx] === -1) {
                    bfsDistance[nidx] = dist + 1;
                    bfsQueueX[tail] = nx;
                    bfsQueueY[tail] = ny;
                    bfsQueueColor[tail] = color;
                    newRegionMap[nidx] = color;
                    tail++;
                }
            }
        }
    }

    // Fallback any remaining unassigned pixels (if any) to initial map
    for (let i = 0; i < newRegionMap.length; i++) {
        if (newRegionMap[i] === -1) {
            newRegionMap[i] = initialRegionMap[i];
        }
    }

    return newRegionMap;
}

export function getBinaryMask(regionMap: Int32Array, colorIdx: number, width: number, height: number): Uint8Array {
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < regionMap.length; i++) {
        if (regionMap[i] === colorIdx) {
            mask[i] = 1;
        }
    }
    return mask;
}

export function morphologicalOpening(mask: Uint8Array, width: number, height: number): Uint8Array {
    // Erosion followed by Dilation
    const eroded = erode(mask, width, height);
    return dilate(eroded, width, height);
}

function erode(mask: Uint8Array, width: number, height: number): Uint8Array {
    const output = new Uint8Array(mask.length);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (mask[idx] === 1 &&
                mask[idx - 1] === 1 && mask[idx + 1] === 1 &&
                mask[idx - width] === 1 && mask[idx + width] === 1) {
                output[idx] = 1;
            }
        }
    }
    return output;
}

function dilate(mask: Uint8Array, width: number, height: number): Uint8Array {
    const output = new Uint8Array(mask.length);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (mask[idx] === 1) {
                output[idx] = 1;
                output[idx - 1] = 1;
                output[idx + 1] = 1;
                output[idx - width] = 1;
                output[idx + width] = 1;
            }
        }
    }
    return output;
}
