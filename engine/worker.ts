
import { TraceOptions, WorkerMessage, WorkerResponse, VectorPath, Contour } from './types';
import { applyGaussianBlur, kMeansQuantization } from './preprocessing';
import { createRegionMap, getBinaryMask, morphologicalOpening } from './segmentation';
import { extractContours } from './contour';
import { detectCorners } from './cornerDetection';
import { analyzeCurvature } from './curvature';
import { fitBezier } from './bezierFitting';
import { mergeTopologies } from './topology';
import { buildSVG } from './svgBuilder';

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, imageData, options } = e.data;

    if (type === 'start' && imageData && options) {
        try {
            const result = await runPipeline(imageData, options);
            self.postMessage({ type: 'result', svg: result });
        } catch (err: any) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }
};

async function runPipeline(imageData: ImageData, options: TraceOptions): Promise<string> {
    const { width, height } = imageData;

    // 1. Preprocessing
    sendProgress('Pré-processamento...', 10);
    const blurred = applyGaussianBlur(imageData, options.blurSigma);
    
    sendProgress('Quantização de Cores (K-Means)...', 20);
    const { imageData: quantized, palette } = kMeansQuantization(blurred, options.kMeansClusters);

    // 2. Segmentation
    sendProgress('Segmentação de Regiões...', 30);
    const regionMap = createRegionMap(quantized, palette);

    const allPaths: VectorPath[] = [];

    for (let i = 0; i < palette.length; i++) {
        const progress = 30 + (i / palette.length) * 40;
        sendProgress(`Processando cor ${i + 1}/${palette.length}...`, progress);

        // Binary mask
        let mask = getBinaryMask(regionMap, i, width, height);
        
        // Morphological opening
        mask = morphologicalOpening(mask, width, height);

        // 3. Contour Extraction
        const contours = extractContours(mask, width, height, palette[i]);

        for (const contour of contours) {
            // 4. Corner Detection
            const pointsWithCorners = detectCorners(contour.points, options.cornerThreshold);

            // 5. Curvature Analysis
            const segments = analyzeCurvature(pointsWithCorners, options.curvatureSensitivity);

            // 6. Bezier Fitting
            const vectorSegments = [];
            for (const seg of segments) {
                const fitted = fitBezier(seg.points, options.bezierErrorTolerance);
                vectorSegments.push(...fitted);
            }

            allPaths.push({
                segments: vectorSegments,
                color: palette[i],
                isHole: contour.isHole
            });
        }
    }

    // 7. Topology Merging
    sendProgress('Merging Topológico...', 85);
    const mergedPaths = mergeTopologies(allPaths);

    // 8. SVG Building
    sendProgress('Gerando SVG...', 95);
    const svg = buildSVG(mergedPaths, width, height);

    return svg;
}

function sendProgress(step: string, progress: number) {
    self.postMessage({
        type: 'progress',
        progress: { step, progress }
    });
}
