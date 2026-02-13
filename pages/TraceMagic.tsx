
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Zap, Sliders, Image as ImageIcon, FileCode, 
  Download, Eye, Maximize, ZoomIn, ZoomOut, Check, Layers, AlertTriangle, PenTool, MousePointer2
} from 'lucide-react';

// Declaration for the CDN library
declare const ImageTracer: any;

type TraceMode = 'bw' | 'grayscale' | 'color';

interface TraceStats {
  nodes: number;
  layers: number;
  sizeKb: number;
  durationMs: number;
}

export default function TraceMagic() {
  // --- Estados de Imagem ---
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedSvg, setProcessedSvg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<TraceStats | null>(null);

  // --- Estados de Configuração ---
  const [mode, setMode] = useState<TraceMode>('color');
  
  // Imagem Prep
  const [brightness, setBrightness] = useState(0); 
  const [contrast, setContrast] = useState(0); 
  const [blur, setBlur] = useState(0); 

  // Trace Settings Otimizados
  const [colors, setColors] = useState(8); // Reduzido padrão para 8 para evitar sujeira
  const [threshold, setThreshold] = useState(128); 
  const [turdSize, setTurdSize] = useState(10); // Aumentado padrão para limpar "sujeira"
  const [curveFidelity, setCurveFidelity] = useState(5); // 1 (Reta/Simples) a 10 (Curva Perfeita)
  const [smoothness, setSmoothness] = useState(0); // Blur radius no vetor

  // UI States
  const [viewMode, setViewMode] = useState<'split' | 'vector' | 'original'>('split');
  const [zoom, setZoom] = useState(1);
  const [splitPos, setSplitPos] = useState(50);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- Zoom com Scroll (Nativo para evitar scroll da pagina) ---
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) return; // Permite zoom do navegador se segurar Ctrl
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
  }, [originalImage]); // Re-attach se imagem mudar

  // --- Funções de Processamento ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
        setProcessedSvg(null);
        setStats(null);
        setZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  // Aplica filtros de imagem no Canvas
  const applyImageFilters = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Filtros CSS-like no Context
    let filterStr = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`;
    if (blur > 0) filterStr += ` blur(${blur}px)`;
    if (mode === 'bw' || mode === 'grayscale') filterStr += ` grayscale(100%)`;
    
    ctx.filter = filterStr;
    ctx.drawImage(img, 0, 0);
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const runTrace = () => {
    if (!originalImage || !imageRef.current) return;
    setIsProcessing(true);

    setTimeout(() => {
        try {
            const startTime = performance.now();
            
            const imgData = applyImageFilters();
            if (!imgData) throw new Error("Falha ao processar imagem");

            // Cálculo Inverso para Curvas:
            // High Fidelity (10) -> Low QTres (0.1) -> Mais pontos, mais curvas.
            // Low Fidelity (1) -> High QTres (5) -> Menos pontos, mais retas.
            const calculatedQtres = Math.max(0.01, (11 - curveFidelity) * 0.2); 
            const calculatedLtres = Math.max(0.1, (11 - curveFidelity) * 0.2);

            const options: any = {
                // Algoritmo de Traçado
                ltres: calculatedLtres, 
                qtres: calculatedQtres, // Ponto chave para arredondar curvas!
                pathomit: turdSize, // Limpeza de sujeira
                
                // Melhorias visuais
                rightangleenhance: false, // IMPORTANTE: Desligar isso evita cantos quadrados artificiais
                
                // Cores e Otimização
                colorsampling: 2, // Deterministic
                numberofcolors: colors,
                mincolorratio: 0.02, // 2% da imagem. Ignora cores que aparecem muito pouco (reduz camadas sujas)
                colorquantcycles: 10, // Mais ciclos = melhor separação de cores
                
                // Suavização Pós-Vetor
                blurradius: smoothness, 
                blurdelta: 20,
                
                strokewidth: 0,
                viewbox: true,
                desc: false,
            };

            if (mode === 'grayscale') {
                options.colorsampling = 0; 
            } else if (mode === 'bw') {
                options.colorsampling = 0;
                options.numberofcolors = 2;
            }

            const svgStr = ImageTracer.imagedataToSVG(imgData, options);
            
            const endTime = performance.now();
            
            const pathCount = (svgStr.match(/<path/g) || []).length;
            const nodeCount = (svgStr.match(/[MmLlCcz]/g) || []).length;
            const size = new Blob([svgStr]).size / 1024;

            setStats({
                nodes: nodeCount,
                layers: pathCount,
                sizeKb: size,
                durationMs: Math.round(endTime - startTime)
            });

            setProcessedSvg(svgStr);

        } catch (e) {
            console.error("Erro na vetorização:", e);
            alert("Erro ao vetorizar imagem.");
        } finally {
            setIsProcessing(false);
        }
    }, 100);
  };

  const handleDownload = (format: 'svg' | 'pdf') => {
      if (!processedSvg) return;
      
      if (format === 'svg') {
          const blob = new Blob([processedSvg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'trace-magic-vetor.svg';
          a.click();
          URL.revokeObjectURL(url);
      } else {
          const printWindow = window.open('', '', 'width=800,height=600');
          if (printWindow) {
              printWindow.document.write(processedSvg);
              printWindow.document.close();
              printWindow.print();
          }
      }
  };

  const handleSplitDrag = (e: React.MouseEvent | React.TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSplitPos(percent);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col h-screen overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />
        <img ref={imageRef} src={originalImage || ''} className="hidden" alt="source" />

        {/* Header */}
        <div className="h-16 border-b border-zinc-800 bg-[#121215] flex items-center justify-between px-6 shrink-0 z-20">
            <div className="flex items-center gap-4">
                <Link to="/programs" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-lg font-bold flex items-center gap-2 font-heading tracking-wide">
                    <PenTool className="text-primary" size={20} />
                    Trace Magic <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30 uppercase">Beta</span>
                </h1>
            </div>
            
            <div className="flex gap-2">
                {processedSvg && (
                    <>
                        <button onClick={() => handleDownload('svg')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2">
                            <FileCode size={14} /> SVG
                        </button>
                        <button onClick={() => handleDownload('pdf')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2">
                            <Download size={14} /> PDF
                        </button>
                    </>
                )}
                {originalImage && (
                    <button 
                        onClick={runTrace}
                        disabled={isProcessing}
                        className="bg-primary hover:bg-amber-600 text-white px-6 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                        {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Zap size={14} fill="currentColor" />}
                        {isProcessing ? 'VETORIZANDO...' : 'VETORIZAR AGORA'}
                    </button>
                )}
            </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* Left Sidebar: Controls */}
            <div className="w-72 bg-[#121215] border-r border-zinc-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-10">
                {!originalImage ? (
                    <div className="p-6 text-center text-zinc-500 mt-10">
                        <Upload size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Carregue uma imagem para habilitar os controles.</p>
                    </div>
                ) : (
                    <div className="p-5 space-y-8">
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Modo de Vetorização</label>
                            <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                                <button onClick={() => setMode('bw')} className={`py-2 text-[10px] font-bold rounded transition ${mode === 'bw' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>P&B</button>
                                <button onClick={() => setMode('grayscale')} className={`py-2 text-[10px] font-bold rounded transition ${mode === 'grayscale' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Cinza</button>
                                <button onClick={() => setMode('color')} className={`py-2 text-[10px] font-bold rounded transition ${mode === 'color' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Cores</button>
                            </div>
                        </div>

                        {/* Image Prep */}
                        <div className="space-y-4 border-t border-zinc-800 pt-6">
                            <h3 className="text-xs font-bold text-white flex items-center gap-2"><ImageIcon size={14} /> Pré-processamento</h3>
                            
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-zinc-400"><span>Brilho</span><span>{brightness}</span></div>
                                <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-primary" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-zinc-400"><span>Contraste</span><span>{contrast}</span></div>
                                <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-primary" />
                            </div>
                        </div>

                        {/* Trace Settings */}
                        <div className="space-y-4 border-t border-zinc-800 pt-6">
                            <h3 className="text-xs font-bold text-white flex items-center gap-2"><Sliders size={14} /> Configuração do Vetor</h3>
                            
                            {(mode === 'color' || mode === 'grayscale') && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-zinc-400"><span>Cores (Camadas)</span><span>{colors}</span></div>
                                    <input type="range" min="2" max="64" value={colors} onChange={(e) => setColors(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500" />
                                    <p className="text-[9px] text-zinc-600 mt-1">Menos cores = Vetor mais limpo.</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-zinc-400"><span>Limpeza de Ruído</span><span>{turdSize}px</span></div>
                                <input type="range" min="0" max="100" value={turdSize} onChange={(e) => setTurdSize(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500" />
                                <p className="text-[9px] text-zinc-600 mt-1">Remove manchas pequenas.</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-zinc-400"><span>Fidelidade da Curva</span><span>{curveFidelity}</span></div>
                                <input type="range" min="1" max="10" step="0.5" value={curveFidelity} onChange={(e) => setCurveFidelity(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                                <p className="text-[9px] text-zinc-600 mt-1">
                                    1 = Retas (Simplificado) <br/>
                                    10 = Curvas (Segue os pixels)
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Central Canvas / Viewer */}
            <div className="flex-1 bg-[#09090b] relative flex flex-col min-w-0">
                
                {/* Toolbar Viewer */}
                <div className="h-12 bg-black/40 border-b border-zinc-800 flex justify-between items-center px-4">
                    <div className="flex gap-2">
                        <button onClick={() => setViewMode('original')} className={`p-1.5 rounded transition ${viewMode === 'original' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`} title="Original"><ImageIcon size={16} /></button>
                        <button onClick={() => setViewMode('split')} className={`p-1.5 rounded transition ${viewMode === 'split' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`} title="Split Screen"><div className="w-4 h-4 border-r border-current flex"><div className="w-1/2"></div></div></button>
                        <button onClick={() => setViewMode('vector')} className={`p-1.5 rounded transition ${viewMode === 'vector' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`} title="Vetor"><FileCode size={16} /></button>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="text-zinc-500 hover:text-white"><ZoomOut size={16} /></button>
                        <span className="text-xs font-mono text-zinc-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(10, z + 0.2))} className="text-zinc-500 hover:text-white"><ZoomIn size={16} /></button>
                    </div>
                </div>

                {/* Canvas Area with Wheel Zoom (Attached via ref for passive:false) */}
                <div 
                    ref={wrapperRef}
                    className="flex-1 relative overflow-hidden flex items-center justify-center p-8 bg-[#1a1a1a]" 
                    style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                >
                    {!originalImage ? (
                        <div className="text-center">
                            <label className="cursor-pointer group">
                                <div className="w-32 h-32 border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center text-zinc-600 group-hover:border-primary group-hover:text-primary transition-all bg-zinc-900/50">
                                    <Upload size={32} className="mb-2" />
                                    <span className="text-xs font-bold uppercase">Upload</span>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                            </label>
                        </div>
                    ) : (
                        <div 
                            ref={containerRef}
                            className="relative shadow-2xl transition-transform duration-100 ease-out origin-center"
                            style={{ 
                                transform: `scale(${zoom})`,
                                maxWidth: '100%',
                                maxHeight: '100%',
                                cursor: viewMode === 'split' ? 'col-resize' : 'default'
                            }}
                            onMouseMove={viewMode === 'split' ? handleSplitDrag : undefined}
                            onTouchMove={viewMode === 'split' ? handleSplitDrag : undefined}
                        >
                            {/* Base: Original Image */}
                            <img 
                                src={originalImage} 
                                alt="Original" 
                                style={{ 
                                    filter: `brightness(${100+brightness}%) contrast(${100+contrast}%) blur(${blur}px) ${mode !== 'color' ? 'grayscale(100%)' : ''}`,
                                    display: viewMode === 'vector' ? 'none' : 'block',
                                    maxWidth: 'none'
                                }}
                                draggable={false}
                            />

                            {/* Overlay: Vector (Controlled by clip-path for Split) */}
                            {processedSvg && viewMode !== 'original' && (
                                <div 
                                    className="absolute inset-0 bg-white" // SVG container bg
                                    style={{
                                        clipPath: viewMode === 'split' ? `inset(0 0 0 ${splitPos}%)` : 'none',
                                    }}
                                    dangerouslySetInnerHTML={{ __html: processedSvg }}
                                />
                            )}

                            {/* Split Line */}
                            {viewMode === 'split' && processedSvg && (
                                <div 
                                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 pointer-events-none"
                                    style={{ left: `${splitPos}%` }}
                                >
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg text-black">
                                        <MousePointer2 size={12} className="rotate-90" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar: Stats */}
            {stats && (
                <div className="w-60 bg-[#121215] border-l border-zinc-800 flex flex-col shrink-0 p-5 space-y-6 z-10">
                    <div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Estatísticas</h3>
                        <div className="space-y-3">
                            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                <div className="flex items-center gap-2 text-zinc-400 mb-1"><Layers size={14} /> <span className="text-[10px] uppercase">Camadas/Paths</span></div>
                                <p className="text-xl font-mono text-white font-bold">{stats.layers}</p>
                            </div>
                            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                <div className="flex items-center gap-2 text-zinc-400 mb-1"><PenTool size={14} /> <span className="text-[10px] uppercase">Nós (Estimado)</span></div>
                                <p className="text-xl font-mono text-white font-bold">{stats.nodes}</p>
                            </div>
                            <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                <div className="flex items-center gap-2 text-zinc-400 mb-1"><FileCode size={14} /> <span className="text-[10px] uppercase">Tamanho SVG</span></div>
                                <p className="text-xl font-mono text-white font-bold">{stats.sizeKb.toFixed(2)} KB</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800">
                        <div className={`flex items-center gap-2 p-3 rounded-lg border ${stats.nodes > 5000 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                            {stats.nodes > 5000 ? <AlertTriangle size={16} /> : <Check size={16} />}
                            <span className="text-xs font-bold">
                                {stats.nodes > 5000 ? 'Alta Complexidade' : 'Vetor Otimizado'}
                            </span>
                        </div>
                        {stats.nodes > 5000 && <p className="text-[10px] text-zinc-500 mt-2">Tente aumentar a "Limpeza de Ruído" ou diminuir as Cores para simplificar.</p>}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}
