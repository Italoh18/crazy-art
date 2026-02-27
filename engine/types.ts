
export interface Point {
    x: number;
    y: number;
}

export interface ColorRGB {
    r: number;
    g: number;
    b: number;
}

export interface ColorLAB {
    l: number;
    a: number;
    b: number;
}

export interface TraceOptions {
    blurSigma: number;
    kMeansClusters: number;
    cornerThreshold: number;
    curvatureSensitivity: number;
    bezierErrorTolerance: number;
    simplificationLevel: number;
    mergeTolerance: number;
    removeBackground: boolean;
}

export interface Contour {
    points: Point[];
    isHole: boolean;
    color: ColorRGB;
}

export interface BezierCurve {
    p0: Point;
    p1: Point;
    p2: Point;
    p3: Point;
}

export interface VectorSegment {
    type: 'line' | 'bezier';
    points: Point[]; // For line: [start, end], for bezier: [p0, p1, p2, p3]
}

export interface VectorPath {
    segments: VectorSegment[];
    color: ColorRGB;
    isHole: boolean;
}

export interface ProgressUpdate {
    step: string;
    progress: number; // 0 to 100
}

export interface WorkerMessage {
    type: 'start' | 'cancel';
    imageData?: ImageData;
    options?: TraceOptions;
}

export interface WorkerResponse {
    type: 'progress' | 'result' | 'error';
    progress?: ProgressUpdate;
    svg?: string;
    error?: string;
}
