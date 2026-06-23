import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Zap, Download, ZoomIn, ZoomOut,
  Maximize2, Wand2, Info, RefreshCw, PenTool
} from 'lucide-react';

import { TraceOptions, WorkerResponse } from '../engine/types';

interface TraceStats {
  nodes: number;
  layers: number;
  sizeKb: number;
  durationMs: number;
}

export default function TraceMagic() {
  // --- Image States ---
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedSvg, setProcessedSvg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<TraceStats | null>(null);

  // --- Fixed Optimization Parameters ---
  const blurSigma = 1.0;
  const kMeansClusters = 16;
  const cornerThreshold = 1.0;
  const curvatureSensitivity = 0.1;
  const bezierErrorTolerance = 2.5;
  const simplificationLevel = 1.0;
  const mergeTolerance = 1.0;
  const removeBackground = true;

  // --- Interaction States ---
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // --- Refs ---
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
      if (!originalImage) return;
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          setPan({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y
          });
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
    setProcessingStep('Iniciando o Trace Magic...');

    const startTime = performance.now();

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
        alert("Erro no motor de vetorização: " + error);
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
      a.download = 'tracemagic-export.svg';
      a.click();
      URL.revokeObjectURL(url);
  };

  const clearImage = () => {
    setOriginalImage(null);
    setProcessedSvg(null);
    setStats(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col h-screen overflow-hidden font-sans">
        <canvas ref={canvasRef} className="hidden" />
        <img ref={imageRef} src={originalImage || ''} className="hidden" alt="source" />

        {/* Header */}
        <header className="h-16 border-b border-zinc-800 bg-[#121215] flex items-center justify-between px-6 shrink-0 z-30">
            <div className="flex items-center gap-4">
                <Link to="/tools" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition" id="pt-back-btn">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold flex items-center gap-2 tracking-wide leading-none" id="pt-title">
                        <PenTool className="text-amber-500" size={20} />
                        Trace Magic <span className="text-amber-500 ml-1">Alfa</span>
                    </h1>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Vetorização Simplificada de Alta Fidelidade</span>
                </div>
            </div>
            
            <div className="flex gap-3">
                {originalImage && (
                    <button 
                        onClick={clearImage}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-zinc-800"
                        id="pt-clear-btn"
                    >
                        <RefreshCw size={14} /> Novo Upload
                    </button>
                )}
                {processedSvg && (
                    <button 
                        onClick={handleDownload} 
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                        id="pt-export-btn"
                    >
                        <Download size={14} /> Exportar SVG
                    </button>
                )}
            </div>
        </header>

        {/* Workspace Area */}
        <main className="flex-1 bg-[#0d0d11] relative flex flex-col min-w-0 overflow-hidden">
            
            {/* Canvas / Stage Area */}
            <div 
                ref={wrapperRef}
                className="flex-1 relative overflow-hidden flex items-center justify-center p-8 bg-[#111115]" 
                style={{ 
                    backgroundImage: 'radial-gradient(#2a2a30 1.2px, transparent 1.2px)', 
                    backgroundSize: '32px 32px', 
                    cursor: originalImage ? (isDragging ? 'grabbing' : 'grab') : 'default'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                id="pt-interaction-stage"
            >
                {/* Processing Overlay */}
                {isProcessing && processingStep && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in" id="pt-processing-overlay">
                        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-xs w-full">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                                <Zap className="absolute inset-0 m-auto text-amber-500 animate-pulse" size={24} fill="currentColor" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Processando</h3>
                                <p className="text-xs text-zinc-400 font-mono animate-pulse">{processingStep}</p>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                            <button 
                                onClick={cancelTrace}
                                className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest transition"
                                id="pt-cancel-btn"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* State 1: No Image Uploaded */}
                {!originalImage ? (
                    <div className="text-center max-w-md px-4" id="pt-initial-upload">
                        <label className="cursor-pointer group block">
                            <div className="w-56 h-56 border-2 border-dashed border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center text-zinc-500 group-hover:border-amber-500 group-hover:text-amber-500 transition-all bg-zinc-900/30 backdrop-blur-sm group-hover:scale-105 duration-300 mx-auto">
                                <div className="p-5 bg-zinc-900 rounded-2xl mb-4 group-hover:bg-amber-500/10 transition-colors">
                                    <Upload size={36} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest px-4">Selecionar Imagem</span>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                        <p className="mt-6 text-xs text-zinc-500 uppercase tracking-wider font-semibold">Suporta PNG ou JPG — Carregue para vetorizar</p>
                    </div>
                ) : (
                    /* State 2: Image Active (Original or Processed Vector) */
                    <div 
                        ref={containerRef}
                        className="relative shadow-2xl transition-transform duration-100 ease-out origin-center select-none"
                        style={{ 
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            maxWidth: 'none',
                        }}
                        id="pt-image-container"
                    >
                        {/* Display the vectorized SVG if ready */}
                        {processedSvg ? (
                            <div 
                                className="bg-white p-6 rounded-2xl shadow-xl border border-zinc-800 overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: processedSvg }}
                                style={{ pointerEvents: 'none' }}
                                id="pt-rendered-vector"
                            />
                        ) : (
                            /* Otherwise, show the uploaded original image */
                            <img 
                                src={originalImage} 
                                alt="Original" 
                                style={{ 
                                    maxHeight: '75vh',
                                    maxWidth: '85vw',
                                    objectFit: 'contain',
                                }}
                                draggable={false}
                                id="pt-preview-original"
                            />
                        )}
                    </div>
                )}

                {/* Floating "Vetorizar Agora" Trigger */}
                {originalImage && !processedSvg && !isProcessing && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2" id="pt-vectorize-action-card">
                        <button 
                            onClick={runTrace}
                            className="bg-amber-500 hover:bg-amber-400 text-black px-10 py-4 rounded-2xl text-sm font-black tracking-widest uppercase transition-all shadow-xl shadow-amber-505/20 flex items-center gap-3 hover:scale-105 duration-200 active:scale-95"
                            id="pt-run-btn"
                        >
                            <Wand2 size={16} fill="currentColor" />
                            Vetorizar Agora
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Status / Navigation Bar */}
            <footer className="h-10 bg-[#121215] border-t border-zinc-800 flex items-center justify-between px-6 shrink-0 text-zinc-500 text-[10px] font-mono">
                <div className="flex items-center gap-2">
                    <Info size={12} className="text-zinc-600" />
                    <span>Use o scroll para dar zoom e arraste com o mouse para mover.</span>
                </div>
                {/* Visual adjustment controls */}
                {originalImage && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="p-1 hover:text-white transition" id="pt-zoom-out"><ZoomOut size={14} /></button>
                            <span>{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(10, z + 0.2))} className="p-1 hover:text-white transition" id="pt-zoom-in"><ZoomIn size={14} /></button>
                        </div>
                        <span className="text-zinc-800">|</span>
                        <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="hover:text-white transition flex items-center gap-1" id="pt-zoom-reset">
                            <Maximize2 size={12} /> Centralizar
                        </button>
                    </div>
                )}
                {stats && (
                    <div className="flex items-center gap-4">
                        <span>Caminhos: {stats.layers}</span>
                        <span>Pontos: {stats.nodes}</span>
                        <span>Tamanho: {stats.sizeKb.toFixed(1)} KB</span>
                        <span>Tempo: {stats.durationMs}ms</span>
                    </div>
                )}
            </footer>
        </main>
    </div>
  );
}
