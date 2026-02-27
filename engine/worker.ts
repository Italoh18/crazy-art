
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

    const allRawPaths: VectorPath[] = [];

    for (let i = 0; i < palette.length; i++) {
        const progress = 30 + (i / palette.length) * 40;
        sendProgress(`Extraindo contornos: cor ${i + 1}/${palette.length}...`, progress);

        let mask = getBinaryMask(regionMap, i, width, height);
        mask = morphologicalOpening(mask, width, height);
        const contours = extractContours(mask, width, height, palette[i]);

        for (const contour of contours) {
            // Criar caminhos brutos (apenas linhas) para o merge
            const segments = [];
            for (let j = 0; j < contour.points.length - 1; j++) {
                segments.push({
                    type: 'line' as const,
                    points: [contour.points[j], contour.points[j+1]]
                });
            }
            allRawPaths.push({
                segments,
                color: palette[i],
                isHole: contour.isHole
            });
        }
    }

    // 7. Topology Merging (Union) - Agora sobre os caminhos brutos
    sendProgress('Merging Topológico (União de Formas)...', 75);
    const mergedRawPaths = mergeTopologies(allRawPaths);

    // 8. Refitting: Corner Detection -> Curvature -> Bezier Fitting
    sendProgress('Ajuste de Curvas Bézier (Fitting)...', 85);
    const finalPaths: VectorPath[] = [];

    for (let i = 0; i < mergedRawPaths.length; i++) {
        const path = mergedRawPaths[i];
        // Converter segmentos de volta para pontos para re-processar
        const points = path.segments.map(s => s.points[0]);
        if (path.segments.length > 0) {
            points.push(path.segments[path.segments.length - 1].points[1]);
        }

        if (points.length < 2) continue;

        const pointsWithCorners = detectCorners(points, options.cornerThreshold);
        const segments = analyzeCurvature(pointsWithCorners, options.curvatureSensitivity);

        const vectorSegments = [];
        for (const seg of segments) {
            const fitted = fitBezier(seg.points, options.bezierErrorTolerance);
            vectorSegments.push(...fitted);
        }

        finalPaths.push({
            segments: vectorSegments,
            color: path.color,
            isHole: path.isHole
        });
    }

    // 9. SVG Building
    sendProgress('Gerando SVG Final...', 95);
    const svg = buildSVG(finalPaths, width, height);

    return svg;
}

function sendProgress(step: string, progress: number) {
    self.postMessage({
        type: 'progress',
        progress: { step, progress }
    });
}
