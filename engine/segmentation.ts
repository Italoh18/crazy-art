
import { ColorRGB } from './types';

export function createRegionMap(imageData: ImageData, palette: ColorRGB[]): Int32Array {
    const { data, width, height } = imageData;
    const regionMap = new Int32Array(width * height);

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
        regionMap[i / 4] = bestIdx;
    }
    return regionMap;
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
