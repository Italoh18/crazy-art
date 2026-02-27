
import { ColorRGB, ColorLAB } from './types';

export function rgbToLab(rgb: ColorRGB): ColorLAB {
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

    x /= 95.047;
    y /= 100.000;
    z /= 108.883;

    x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

    return {
        l: (116 * y) - 16,
        a: 500 * (x - y),
        b: 200 * (y - z)
    };
}

export function labToRgb(lab: ColorLAB): ColorRGB {
    let y = (lab.l + 16) / 116;
    let x = lab.a / 500 + y;
    let z = y - lab.b / 200;

    x = Math.pow(x, 3) > 0.008856 ? Math.pow(x, 3) : (x - 16 / 116) / 7.787;
    y = Math.pow(y, 3) > 0.008856 ? Math.pow(y, 3) : (y - 16 / 116) / 7.787;
    z = Math.pow(z, 3) > 0.008856 ? Math.pow(z, 3) : (z - 16 / 116) / 7.787;

    x *= 95.047;
    y *= 100.000;
    z *= 108.883;

    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b = x * 0.0557 + y * -0.2040 + z * 1.0570;

    r /= 100; g /= 100; b /= 100;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

    return {
        r: Math.max(0, Math.min(255, Math.round(r * 255))),
        g: Math.max(0, Math.min(255, Math.round(g * 255))),
        b: Math.max(0, Math.min(255, Math.round(b * 255)))
    };
}

export function applyGaussianBlur(imageData: ImageData, sigma: number): ImageData {
    if (sigma <= 0) return imageData;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
    const kernel = new Float32Array(kernelSize);
    const sigma2 = sigma * sigma;
    let sum = 0;

    for (let i = 0; i < kernelSize; i++) {
        const x = i - Math.floor(kernelSize / 2);
        kernel[i] = Math.exp(-(x * x) / (2 * sigma2));
        sum += kernel[i];
    }
    for (let i = 0; i < kernelSize; i++) kernel[i] /= sum;

    const temp = new Float32Array(data.length);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let k = 0; k < kernelSize; k++) {
                const kx = Math.min(width - 1, Math.max(0, x + k - Math.floor(kernelSize / 2)));
                const idx = (y * width + kx) * 4;
                r += data[idx] * kernel[k];
                g += data[idx + 1] * kernel[k];
                b += data[idx + 2] * kernel[k];
                a += data[idx + 3] * kernel[k];
            }
            const idx = (y * width + x) * 4;
            temp[idx] = r; temp[idx + 1] = g; temp[idx + 2] = b; temp[idx + 3] = a;
        }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let k = 0; k < kernelSize; k++) {
                const ky = Math.min(height - 1, Math.max(0, y + k - Math.floor(kernelSize / 2)));
                const idx = (ky * width + x) * 4;
                r += temp[idx] * kernel[k];
                g += temp[idx + 1] * kernel[k];
                b += temp[idx + 2] * kernel[k];
                a += temp[idx + 3] * kernel[k];
            }
            const idx = (y * width + x) * 4;
            output[idx] = r; output[idx + 1] = g; output[idx + 2] = b; output[idx + 3] = a;
        }
    }

    return new ImageData(output, width, height);
}

export function kMeansQuantization(imageData: ImageData, k: number): { imageData: ImageData, palette: ColorRGB[] } {
    const { data, width, height } = imageData;
    const pixels: ColorLAB[] = [];
    for (let i = 0; i < data.length; i += 4) {
        pixels.push(rgbToLab({ r: data[i], g: data[i + 1], b: data[i + 2] }));
    }

    // Initialize centroids
    let centroids: ColorLAB[] = [];
    for (let i = 0; i < k; i++) {
        centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
    }

    const assignments = new Int32Array(pixels.length);
    let iterations = 10;

    while (iterations--) {
        // Assign pixels to nearest centroid
        for (let i = 0; i < pixels.length; i++) {
            let minDist = Infinity;
            let bestK = 0;
            for (let j = 0; j < k; j++) {
                const dist = Math.pow(pixels[i].l - centroids[j].l, 2) +
                             Math.pow(pixels[i].a - centroids[j].a, 2) +
                             Math.pow(pixels[i].b - centroids[j].b, 2);
                if (dist < minDist) {
                    minDist = dist;
                    bestK = j;
                }
            }
            assignments[i] = bestK;
        }

        // Update centroids
        const newCentroids = Array.from({ length: k }, () => ({ l: 0, a: 0, b: 0, count: 0 }));
        for (let i = 0; i < pixels.length; i++) {
            const kIdx = assignments[i];
            newCentroids[kIdx].l += pixels[i].l;
            newCentroids[kIdx].a += pixels[i].a;
            newCentroids[kIdx].b += pixels[i].b;
            newCentroids[kIdx].count++;
        }

        for (let j = 0; j < k; j++) {
            if (newCentroids[j].count > 0) {
                centroids[j] = {
                    l: newCentroids[j].l / newCentroids[j].count,
                    a: newCentroids[j].a / newCentroids[j].count,
                    b: newCentroids[j].b / newCentroids[j].count
                };
            }
        }
    }

    const outputData = new Uint8ClampedArray(data.length);
    const palette: ColorRGB[] = centroids.map(labToRgb);

    for (let i = 0; i < pixels.length; i++) {
        const rgb = palette[assignments[i]];
        outputData[i * 4] = rgb.r;
        outputData[i * 4 + 1] = rgb.g;
        outputData[i * 4 + 2] = rgb.b;
        outputData[i * 4 + 3] = 255;
    }

    return { imageData: new ImageData(outputData, width, height), palette };
}
