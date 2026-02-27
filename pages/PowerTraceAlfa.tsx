
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Zap, Sliders, Image as ImageIcon, FileCode, 
  Download, ZoomIn, ZoomOut, Check, Layers, AlertTriangle, PenTool, 
  MousePointer2, Move, Settings2, Trash2, Maximize2, Minimize2,
  Type, Palette, Wand2, Info, ChevronRight, ChevronDown
} from 'lucide-react';

import { TraceOptions, WorkerMessage, WorkerResponse } from '../engine/types';

type TraceType = 'outline' | 'centerline';
type ImageType = 'clipart' | 'logo' | 'photo';

interface TraceStats {
  nodes: number;
  layers: number;
  sizeKb: number;
  durationMs: number;
}


// Helper for Ramer-Douglas-Peucker
const getSqDist = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    const dx = p1.x - p2.x, dy = p1.y - p2.y;
    return dx * dx + dy * dy;
};

const getSqSegDist = (p: {x: number, y: number}, p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    let x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y;
    if (dx !== 0 || dy !== 0) {
        const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) { x = p2.x; y = p2.y; }
        else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p.x - x; dy = p.y - y;
    return dx * dx + dy * dy;
};

const simplifyDPStep = (points: any[], first: number, last: number, sqTolerance: number, simplified: any[]) => {
    let maxSqDist = sqTolerance, index = -1;
    for (let i = first + 1; i < last; i++) {
        const sqDist = getSqSegDist(points[i], points[first], points[last]);
        if (sqDist > maxSqDist) {
            index = i;
            maxSqDist = sqDist;
        }
    }
    if (index !== -1) {
        if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
        simplified.push(points[index]);
        if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
};

const simplifyDouglasPeucker = (points: any[], tolerance: number) => {
    if (points.length <= 2) return points;
    const sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;
    const last = points.length - 1;
    const simplified = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);
    return simplified;
};

export default function PowerTraceAlfa() {
  // --- Image States ---
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedSvg, setProcessedSvg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<TraceStats | null>(null);

  // --- Configuration States ---
  const [traceType, setTraceType] = useState<TraceType>('outline');
  const [imageType, setImageType] = useState<ImageType>('logo');
  
  // New Engine Parameters
  const [blurSigma, setBlurSigma] = useState(1.0);
  const [kMeansClusters, setKMeansClusters] = useState(16);
  const [cornerThreshold, setCornerThreshold] = useState(1.0);
  const [curvatureSensitivity, setCurvatureSensitivity] = useState(0.1);
  const [bezierErrorTolerance, setBezierErrorTolerance] = useState(2.5);
  const [simplificationLevel, setSimplificationLevel] = useState(1.0);
  const [mergeTolerance, setMergeTolerance] = useState(1.0);
  
  // Advanced Options
  const [removeBackground, setRemoveBackground] = useState(true);

  // UI States
  const [viewMode, setViewMode] = useState<'split' | 'vector' | 'original'>('split');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [splitPos, setSplitPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'settings' | 'advanced'>('settings');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // --- Worker Management ---
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // --- Zoom with Scroll ---
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) return; 
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.1, Math.min(10, prev + delta)));
    };

    const wrapper = wrapperRef.current;
    if (wrapper) {
        wrapper.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
        if (wrapper) {
            wrapper.removeEventListener('wheel', handleWheel);
        }
    };
  }, [originalImage]);

  // --- Mouse Pan Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
      if (viewMode === 'split' && e.buttons === 1) {
          const container = containerRef.current;
          if (container) {
              const rect = container.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percent = (x / rect.width) * 100;
              // If clicking near the split line, we might want to drag it.
              // For simplicity, if in split mode, left click drags the split line.
              // Middle click or right click could drag the pan.
          }
      }

      if (e.button === 1 || (e.button === 0 && viewMode !== 'split')) {
          e.preventDefault();
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          setPan({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y
          });
      }
      
      if (viewMode === 'split' && e.buttons === 1 && !isDragging) {
          const container = containerRef.current;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
          setSplitPos(percent);
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  // --- Processing Functions ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
        setProcessedSvg(null);
        setStats(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const runTrace = () => {
    if (!originalImage || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    setIsProcessing(true);
    setProgress(0);
    setProcessingStep('Iniciando Engine Alfa...');

    const startTime = performance.now();

    // Initialize Worker
    if (workerRef.current) workerRef.current.terminate();
    workerRef.current = new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { type, progress: prog, svg, error } = e.data;

      if (type === 'progress' && prog) {
        setProcessingStep(prog.step);
        setProgress(prog.progress);
      } else if (type === 'result' && svg) {
        const endTime = performance.now();
        setProcessedSvg(svg);
        
        // Calculate stats
        const pathCount = (svg.match(/<path/g) || []).length;
        const nodeCount = (svg.match(/[MmLlCcz]/g) || []).length;
        const size = new Blob([svg]).size / 1024;

        setStats({
          nodes: nodeCount,
          layers: pathCount,
          sizeKb: size,
          durationMs: Math.round(endTime - startTime)
        });

        setIsProcessing(false);
        setProcessingStep(null);
      } else if (type === 'error') {
        alert("Erro na engine: " + error);
        setIsProcessing(false);
        setProcessingStep(null);
      }
    };

    const options: TraceOptions = {
      blurSigma,
      kMeansClusters,
      cornerThreshold,
      curvatureSensitivity,
      bezierErrorTolerance,
      simplificationLevel,
      mergeTolerance,
      removeBackground
    };

    workerRef.current.postMessage({ type: 'start', imageData, options });
  };

  const cancelTrace = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  const handleDownload = () => {
      if (!processedSvg) return;
      const blob = new Blob([processedSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'powertrace-alfa-export.svg';
      a.click();
      URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col h-screen overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />
        <img ref={imageRef} src={originalImage || ''} className="hidden" alt="source" />

        {/* Header */}
        <div className="h-16 border-b border-zinc-800 bg-[#121215] flex items-center justify-between px-6 shrink-0 z-30">
            <div className="flex items-center gap-4">
                <Link to="/programs" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold flex items-center gap-2 font-heading tracking-wide leading-none">
                        <Zap className="text-primary" size={20} fill="currentColor" />
                        Power Trace <span className="text-primary ml-1">Alfa</span>
                    </h1>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Vetorização Profissional v2.01</span>
                </div>
            </div>
            
            <div className="flex gap-3">
                {processedSvg && (
                    <button onClick={handleDownload} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-zinc-700">
                        <Download size={14} /> EXPORTAR SVG
                    </button>
                )}
                {originalImage && (
                    <button 
                        onClick={runTrace}
                        disabled={isProcessing}
                        className="bg-primary hover:bg-amber-600 text-white px-6 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                        {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Wand2 size={14} />}
                        {isProcessing ? 'PROCESSANDO...' : 'VETORIZAR'}
                    </button>
                )}
            </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* Left Sidebar: Controls */}
            <div className="w-80 bg-[#121215] border-r border-zinc-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-20">
                {!originalImage ? (
                    <div className="p-8 text-center text-zinc-500 mt-10">
                        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                            <Upload size={32} className="opacity-20" />
                        </div>
                        <p className="text-sm font-medium">Aguardando imagem...</p>
                        <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest">Arraste ou clique para começar</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="flex border-b border-zinc-800">
                            <button 
                                onClick={() => setActiveTab('settings')}
                                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'settings' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Configurações
                                {activeTab === 'settings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                            </button>
                            <button 
                                onClick={() => setActiveTab('advanced')}
                                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'advanced' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Avançado
                                {activeTab === 'advanced' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                            </button>
                        </div>

                        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                            {activeTab === 'settings' ? (
                                <>
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">K-Means Clusters (Cores)</label>
                                                <span className="text-xs font-mono text-primary">{kMeansClusters}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="2" max="64" 
                                                value={kMeansClusters} 
                                                onChange={(e) => setKMeansClusters(Number(e.target.value))} 
                                                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-primary" 
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Gaussian Blur (Sigma)</label>
                                                <span className="text-xs font-mono text-primary">{blurSigma.toFixed(1)}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="5" step="0.1"
                                                value={blurSigma} 
                                                onChange={(e) => setBlurSigma(Number(e.target.value))} 
                                                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-primary" 
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tolerância Bézier</label>
                                                <span className="text-xs font-mono text-primary">{bezierErrorTolerance.toFixed(1)}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0.1" max="10" step="0.1"
                                                value={bezierErrorTolerance} 
                                                onChange={(e) => setBezierErrorTolerance(Number(e.target.value))} 
                                                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-primary" 
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Limite de Canto (Rad)</label>
                                                <span className="text-xs font-mono text-primary">{cornerThreshold.toFixed(2)}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0.1" max="3.14" step="0.05"
                                                value={cornerThreshold} 
                                                onChange={(e) => setCornerThreshold(Number(e.target.value))} 
                                                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-primary" 
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sensibilidade de Curvatura</label>
                                            <span className="text-xs font-mono text-primary">{curvatureSensitivity.toFixed(2)}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0.01" max="1" step="0.01"
                                            value={curvatureSensitivity} 
                                            onChange={(e) => setCurvatureSensitivity(Number(e.target.value))} 
                                            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-primary" 
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nível de Simplificação</label>
                                            <span className="text-xs font-mono text-primary">{simplificationLevel.toFixed(1)}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0.1" max="5" step="0.1"
                                            value={simplificationLevel} 
                                            onChange={(e) => setSimplificationLevel(Number(e.target.value))} 
                                            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-primary" 
                                        />
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Opções de Objeto</h3>
                                        <div className="space-y-3">
                                            <label className="flex items-center justify-between cursor-pointer group">
                                                <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition">Remover cor de fundo</span>
                                                <div onClick={() => setRemoveBackground(!removeBackground)} className={`w-10 h-5 rounded-full transition relative ${removeBackground ? 'bg-primary' : 'bg-zinc-800'}`}>
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${removeBackground ? 'left-6' : 'left-1'}`}></div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {stats && (
                            <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
                                <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                                    <span>Nós: <span className="text-white font-mono">{stats.nodes}</span></span>
                                    <span>Tempo: <span className="text-white font-mono">{stats.durationMs}ms</span></span>
                                </div>
                                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Central Workspace */}
            <div className="flex-1 bg-[#09090b] relative flex flex-col min-w-0">
                
                {/* Toolbar Viewer */}
                <div className="h-12 bg-black/40 border-b border-zinc-800 flex justify-between items-center px-4 shrink-0">
                    <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                        <button onClick={() => setViewMode('original')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${viewMode === 'original' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Original</button>
                        <button onClick={() => setViewMode('split')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${viewMode === 'split' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Split</button>
                        <button onClick={() => setViewMode('vector')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${viewMode === 'vector' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Vetor</button>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition"><ZoomOut size={16} /></button>
                            <span className="text-[10px] font-mono text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(10, z + 0.2))} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition"><ZoomIn size={16} /></button>
                        </div>
                        <div className="h-4 w-px bg-zinc-800"></div>
                        <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition" title="Reset View"><Maximize2 size={16} /></button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div 
                    ref={wrapperRef}
                    className="flex-1 relative overflow-hidden flex items-center justify-center p-12 bg-[#1a1a1a]" 
                    style={{ 
                        backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', 
                        backgroundSize: '24px 24px', 
                        cursor: viewMode === 'split' ? 'col-resize' : isDragging ? 'grabbing' : 'grab' 
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Processing Overlay */}
                    {isProcessing && processingStep && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-xs w-full">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <Zap className="absolute inset-0 m-auto text-primary animate-pulse" size={24} fill="currentColor" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Processando Alfa</h3>
                                    <p className="text-xs text-zinc-500 font-mono animate-pulse">{processingStep}</p>
                                </div>
                                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                <button 
                                    onClick={cancelTrace}
                                    className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition"
                                >
                                    Cancelar Processamento
                                </button>
                            </div>
                        </div>
                    )}

                    {!originalImage ? (
                        <div className="text-center animate-fade-in">
                            <label className="cursor-pointer group block">
                                <div className="w-48 h-48 border-2 border-dashed border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center text-zinc-600 group-hover:border-primary group-hover:text-primary transition-all bg-zinc-900/30 backdrop-blur-sm group-hover:scale-105 duration-500">
                                    <div className="p-5 bg-zinc-900 rounded-2xl mb-4 group-hover:bg-primary/10 transition-colors">
                                        <Upload size={40} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest">Carregar Imagem</span>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </label>
                            <div className="mt-8 flex items-center justify-center gap-6 text-zinc-600">
                                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> <span className="text-[10px] font-bold uppercase tracking-tighter">PNG / JPEG</span></div>
                                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> <span className="text-[10px] font-bold uppercase tracking-tighter">Alta Fidelidade</span></div>
                            </div>
                        </div>
                    ) : (
                        <div 
                            ref={containerRef}
                            className="relative shadow-2xl transition-transform duration-100 ease-out origin-center"
                            style={{ 
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                maxWidth: 'none',
                                pointerEvents: 'none'
                            }}
                        >
                            {/* Base: Original Image */}
                            <img 
                                src={originalImage} 
                                alt="Original" 
                                style={{ 
                                    display: viewMode === 'vector' ? 'none' : 'block',
                                    maxWidth: 'none',
                                    pointerEvents: 'auto'
                                }}
                                draggable={false}
                            />

                            {/* Overlay: Vector */}
                            {processedSvg && viewMode !== 'original' && (
                                <div 
                                    className="absolute inset-0 bg-white"
                                    style={{
                                        clipPath: viewMode === 'split' ? `inset(0 0 0 ${splitPos}%)` : 'none',
                                        pointerEvents: 'auto'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: processedSvg }}
                                />
                            )}

                            {/* Split Line */}
                            {viewMode === 'split' && processedSvg && (
                                <div 
                                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_20px_rgba(0,0,0,0.8)] z-20 pointer-events-none"
                                    style={{ left: `${splitPos}%` }}
                                >
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-2xl text-black border-4 border-zinc-900">
                                        <MousePointer2 size={14} className="rotate-90" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Info Bar */}
                <div className="h-8 bg-[#121215] border-t border-zinc-800 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
                            <Info size={10} />
                            <span>Dica: Use o scroll para zoom e arraste com o botão do meio para mover.</span>
                        </div>
                    </div>
                    {stats && (
                        <div className="flex items-center gap-4 text-[9px] font-mono text-zinc-500">
                            <span>{stats.layers} Camadas</span>
                            <span className="w-px h-3 bg-zinc-800"></span>
                            <span>{stats.nodes} Nós</span>
                            <span className="w-px h-3 bg-zinc-800"></span>
                            <span>{stats.sizeKb.toFixed(1)} KB</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
