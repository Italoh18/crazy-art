
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Scissors, Image as ImageIcon, Download, 
  Loader2, Sliders, Eraser, PenTool, Undo, Check, X, 
  Clipboard, ZoomIn, ZoomOut, Move, Maximize2, RotateCcw,
  Pipette, MousePointer2
} from 'lucide-react';

type Point = { x: number, y: number };

export default function BackgroundRemover() {
  // --- Estados Principais ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Estados Magic Wand (Cor) ---
  const [tolerance, setTolerance] = useState(30); 
  const [removeMode, setRemoveMode] = useState<'corner' | 'white' | 'green' | 'custom'>('corner');
  const [customColor, setCustomColor] = useState<{r: number, g: number, b: number} | null>(null);
  const [isPickingColor, setIsPickingColor] = useState(false);

  // --- Estados Editor Manual (Fullscreen) ---
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [manualPoints, setManualPoints] = useState<Point[]>([]);
  const [editorZoom, setEditorZoom] = useState(1);
  const [editorPan, setEditorPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Imagem sendo editada no modo manual
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);

  // Refs
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorImageRef = useRef<HTMLImageElement>(null);
  const displayImageRef = useRef<HTMLImageElement>(null); // Ref para a imagem na tela principal

  // --- 1. Lógica Global: Colar Imagem (Ctrl+V) ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isEditorOpen) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSelectedImage(event.target?.result as string);
                setProcessedImage(null);
                setCustomColor(null);
                setRemoveMode('corner');
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isEditorOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setProcessedImage(null);
        setCustomColor(null);
        setRemoveMode('corner');
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 2. Lógica de Seleção de Cor (Conta-Gotas) ---
  const handleMainImageClick = (e: React.MouseEvent) => {
      if (!isPickingColor || !displayImageRef.current || !selectedImage) return;

      const imgEl = displayImageRef.current;
      const rect = imgEl.getBoundingClientRect();
      
      // Coordenadas relativas ao elemento visível
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Mapear para coordenadas reais da imagem (naturalWidth)
      const scaleX = imgEl.naturalWidth / rect.width;
      const scaleY = imgEl.naturalHeight / rect.height;

      const realX = Math.floor(x * scaleX);
      const realY = Math.floor(y * scaleY);

      // Usar Canvas temporário para ler o pixel
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Desenhar apenas o pixel clicado (muito mais rápido que desenhar a imagem toda)
      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      // sx, sy = coordenadas reais na imagem fonte
      ctx.drawImage(imgEl, realX, realY, 1, 1, 0, 0, 1, 1);
      
      const p = ctx.getImageData(0, 0, 1, 1).data;
      
      setCustomColor({ r: p[0], g: p[1], b: p[2] });
      setRemoveMode('custom');
      setIsPickingColor(false); // Sai do modo conta-gotas automaticamente
  };

  // --- 3. Processamento Automático (Magic) ---
  const processMagic = () => {
    if (!selectedImage) return;
    setIsProcessing(true);

    setTimeout(() => {
        const img = new Image();
        img.src = selectedImage;
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const maxWidth = 1920; 
            const scale = img.width > maxWidth ? maxWidth / img.width : 1;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let targetR = 0, targetG = 0, targetB = 0;

            if (removeMode === 'corner') {
                targetR = data[0]; targetG = data[1]; targetB = data[2];
            } else if (removeMode === 'white') {
                targetR = 255; targetG = 255; targetB = 255;
            } else if (removeMode === 'green') {
                targetR = 0; targetG = 255; targetB = 0;
            } else if (removeMode === 'custom' && customColor) {
                targetR = customColor.r; targetG = customColor.g; targetB = customColor.b;
            }

            const threshold = (tolerance / 100) * 442; 

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const distance = Math.sqrt(
                    Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2)
                );

                if (distance < threshold) {
                    data[i + 3] = 0;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            setProcessedImage(canvas.toDataURL('image/png'));
            setIsProcessing(false);
        };
    }, 100);
  };

  // --- 4. Lógica do Editor Manual (Fullscreen) ---
  
  const openManualEditor = (sourceImage: string) => {
      setEditorImageSrc(sourceImage);
      setManualPoints([]);
      setEditorZoom(1);
      setEditorPan({ x: 0, y: 0 });
      setIsEditorOpen(true);
  };

  const handleEditorClick = (e: React.MouseEvent) => {
      if (isDraggingPan) return;
      if (!editorImageRef.current) return;

      const rect = editorImageRef.current.getBoundingClientRect();
      const clickX = e.clientX;
      const clickY = e.clientY;
      
      const relX = (clickX - rect.left) / rect.width * editorImageRef.current.naturalWidth;
      const relY = (clickY - rect.top) / rect.height * editorImageRef.current.naturalHeight;

      if (relX >= 0 && relY >= 0 && relX <= editorImageRef.current.naturalWidth && relY <= editorImageRef.current.naturalHeight) {
          setManualPoints(prev => [...prev, { x: relX, y: relY }]);
      }
  };

  const handlePanStart = (e: React.MouseEvent) => {
      if (e.button === 1 || e.shiftKey) { // Botão do meio ou Shift+Click para Pan
          e.preventDefault();
          setIsDraggingPan(true);
          setDragStart({ x: e.clientX - editorPan.x, y: e.clientY - editorPan.y });
      }
  };

  const handlePanMove = (e: React.MouseEvent) => {
      if (!isDraggingPan) return;
      setEditorPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
      });
  };

  const handlePanEnd = () => setIsDraggingPan(false);

  const applyManualCut = (shouldDownload = false) => {
      if (!editorImageSrc || manualPoints.length < 3) return;
      setIsProcessing(true);

      const img = new Image();
      img.src = editorImageSrc;
      img.crossOrigin = "Anonymous";

      img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          ctx.beginPath();
          ctx.moveTo(manualPoints[0].x, manualPoints[0].y);
          for (let i = 1; i < manualPoints.length; i++) {
              ctx.lineTo(manualPoints[i].x, manualPoints[i].y);
          }
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 0, 0);

          const resultDataUrl = canvas.toDataURL('image/png');
          setProcessedImage(resultDataUrl);
          setIsEditorOpen(false);
          setIsProcessing(false);

          if (shouldDownload) {
              const link = document.createElement('a');
              link.href = resultDataUrl;
              link.download = 'crazy-art-recorte-manual.png';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          }
      };
  };

  const handleDownload = () => {
    if (processedImage) {
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = 'crazy-art-recorte.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const renderEditorOverlay = () => {
      if (!editorImageRef.current || manualPoints.length === 0) return null;
      
      const w = editorImageRef.current.naturalWidth;
      const h = editorImageRef.current.naturalHeight;
      const pointsStr = manualPoints.map(p => `${p.x},${p.y}`).join(' ');

      return (
          <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
              <polygon points={pointsStr} fill="rgba(245, 158, 11, 0.3)" stroke="#F59E0B" strokeWidth={2 / editorZoom} vectorEffect="non-scaling-stroke" />
              {manualPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={3 / editorZoom} fill="white" stroke="#F59E0B" strokeWidth={1 / editorZoom} />
              ))}
          </svg>
      );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col">
      {/* Header */}
      <div className="max-w-6xl mx-auto w-full mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
            <Link to="/programs" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Scissors className="text-primary" /> Recorte Inteligente
                </h1>
                <p className="text-zinc-500 text-sm">Remova fundos automaticamente ou use a Caneta para precisão.</p>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Coluna 1: Upload e Preview Original */}
        <div className="space-y-6 lg:col-span-1">
            <div className={`border-2 border-dashed rounded-3xl h-80 flex flex-col items-center justify-center relative overflow-hidden transition-all group ${selectedImage ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 hover:border-primary/50 hover:bg-zinc-900/50'}`}>
                {selectedImage ? (
                    <div 
                        className={`relative w-full h-full flex items-center justify-center p-4 ${isPickingColor ? 'cursor-crosshair' : ''}`}
                        onClick={handleMainImageClick}
                        title={isPickingColor ? "Clique na cor que deseja remover" : ""}
                    >
                        <img 
                            ref={displayImageRef}
                            src={selectedImage} 
                            alt="Original" 
                            className="max-w-full max-h-full object-contain select-none" 
                        />
                        {/* Overlay para modo Picker */}
                        {isPickingColor && (
                            <div className="absolute inset-0 bg-black/10 pointer-events-none flex items-center justify-center">
                                <div className="bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl animate-bounce">
                                    Clique na imagem para selecionar a cor
                                </div>
                            </div>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setProcessedImage(null); setCustomColor(null); }}
                            className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-red-500/80 transition z-20"
                            title="Remover imagem"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="text-center p-6 pointer-events-none">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500 group-hover:scale-110 transition-transform">
                            <Upload size={32} />
                        </div>
                        <p className="text-lg font-bold text-zinc-300">Carregar Imagem</p>
                        <p className="text-zinc-500 text-sm mt-1">Cole com <span className="text-white font-mono bg-zinc-800 px-1 rounded">Ctrl+V</span> ou clique</p>
                    </div>
                )}
                
                {!selectedImage && (
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                )}
            </div>

            {/* Controles Automáticos */}
            {selectedImage && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <Eraser size={16} className="text-primary" /> Recorte Automático
                        </h3>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Cor Alvo</label>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            <button onClick={() => {setRemoveMode('corner'); setIsPickingColor(false);}} className={`py-2 text-xs font-bold rounded-md transition ${removeMode === 'corner' ? 'bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>Auto</button>
                            <button onClick={() => {setRemoveMode('white'); setIsPickingColor(false);}} className={`py-2 text-xs font-bold rounded-md transition ${removeMode === 'white' ? 'bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>Branco</button>
                            <button onClick={() => {setRemoveMode('green'); setIsPickingColor(false);}} className={`py-2 text-xs font-bold rounded-md transition ${removeMode === 'green' ? 'bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>Verde</button>
                            
                            <button 
                                onClick={() => setIsPickingColor(!isPickingColor)}
                                className={`py-2 flex items-center justify-center rounded-md transition relative overflow-hidden ${isPickingColor || removeMode === 'custom' ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-zinc-900' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}
                                title="Conta-Gotas: Selecionar cor na imagem"
                            >
                                <Pipette size={14} />
                                {customColor && (
                                    <div 
                                        className="absolute bottom-0 right-0 w-3 h-3 rounded-tl-md border-l border-t border-black/20"
                                        style={{ backgroundColor: `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})` }}
                                    ></div>
                                )}
                            </button>
                        </div>
                        {isPickingColor && <p className="text-[10px] text-primary animate-pulse text-center">Clique na imagem acima para pegar a cor.</p>}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Sliders size={12} /> Tolerância
                            </label>
                            <span className="text-xs font-mono text-primary">{tolerance}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="80" 
                            value={tolerance} 
                            onChange={(e) => setTolerance(parseInt(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <button 
                        onClick={processMagic}
                        disabled={isProcessing}
                        className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-md"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Eraser size={18} />}
                        {isProcessing ? 'Processando...' : 'Aplicar Recorte Automático'}
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-zinc-700"></div>
                        <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase">OU</span>
                        <div className="flex-grow border-t border-zinc-700"></div>
                    </div>

                    <button 
                        onClick={() => openManualEditor(selectedImage)}
                        className="w-full bg-primary hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition flex items-center justify-center gap-2 active:scale-95 group"
                    >
                        <PenTool size={18} className="group-hover:-translate-y-1 transition-transform" />
                        Abrir Editor Manual (Caneta)
                    </button>
                </div>
            )}
        </div>

        {/* Coluna 2: Resultado */}
        <div className="lg:col-span-2 bg-[#18181b] border border-zinc-800 rounded-3xl h-[700px] flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Background Checkerboard pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)', backgroundSize: '24px 24px', backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px' }}></div>

            {processedImage ? (
                <div className="relative z-10 w-full h-full flex flex-col p-8 animate-fade-in">
                    <div className="flex-1 flex items-center justify-center relative">
                        <img src={processedImage} alt="Resultado" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                    </div>
                    
                    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                        <button 
                            onClick={handleDownload}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transform"
                        >
                            <Download size={20} /> BAIXAR PNG (Transparente)
                        </button>
                        
                        <button 
                            onClick={() => openManualEditor(processedImage)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl font-bold transition flex items-center justify-center gap-2 border border-zinc-700"
                        >
                            <Scissors size={20} /> Refinar Recorte Manualmente
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative z-10 text-zinc-600 flex flex-col items-center p-8">
                    <div className="p-6 rounded-full bg-zinc-900 mb-4 border border-zinc-800">
                        <ImageIcon size={48} className="opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-500">Área de Resultado</h3>
                    <p className="text-zinc-600 text-sm max-w-xs mt-2 mb-6">
                        O recorte aparecerá aqui.
                    </p>
                    
                    {!selectedImage && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                            <Clipboard size={14} />
                            <span className="text-xs text-zinc-500">Dica: Use Ctrl+V para colar</span>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* --- EDITOR MANUAL (MODAL FULLSCREEN) --- */}
      {isEditorOpen && editorImageSrc && (
          <div className="fixed inset-0 z-[100] bg-[#09090b] flex flex-col animate-fade-in">
              {/* Toolbar Superior */}
              <div className="h-16 border-b border-zinc-800 bg-[#121215] flex items-center justify-between px-6 z-20 shadow-xl">
                  <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-white font-bold">
                          <PenTool className="text-primary" />
                          <span>Editor Manual</span>
                      </div>
                      <div className="h-6 w-px bg-zinc-800 mx-2"></div>
                      <div className="flex items-center gap-2 bg-black/50 p-1 rounded-lg">
                          <button onClick={() => setEditorZoom(z => Math.max(0.2, z - 0.2))} className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white" title="Zoom Out (-)"><ZoomOut size={18} /></button>
                          <span className="text-xs font-mono w-12 text-center">{Math.round(editorZoom * 100)}%</span>
                          <button onClick={() => setEditorZoom(z => Math.min(5, z + 0.2))} className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white" title="Zoom In (+)"><ZoomIn size={18} /></button>
                      </div>
                      <div className="text-xs text-zinc-500 hidden sm:flex items-center gap-2 ml-4">
                          <Move size={14} /> Segure <b>Shift</b> para mover (Pan)
                      </div>
                  </div>

                  <div className="flex items-center gap-3">
                      <button 
                          onClick={() => setManualPoints(pts => pts.slice(0, -1))} 
                          disabled={manualPoints.length === 0}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition disabled:opacity-50"
                      >
                          <Undo size={16} /> Desfazer
                      </button>
                      <button 
                          onClick={() => setIsEditorOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg text-sm transition"
                      >
                          <X size={18} /> Cancelar
                      </button>
                      
                      <div className="h-6 w-px bg-zinc-800 mx-1"></div>

                      <button 
                          onClick={() => applyManualCut(false)}
                          disabled={manualPoints.length < 3}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition disabled:opacity-50"
                          title="Cortar e voltar para tela principal"
                      >
                          <Check size={18} /> Aplicar
                      </button>

                      <button 
                          onClick={() => applyManualCut(true)}
                          disabled={manualPoints.length < 3}
                          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <Download size={18} /> Cortar e Baixar
                      </button>
                  </div>
              </div>

              {/* Área do Canvas */}
              <div 
                  className="flex-1 overflow-hidden relative bg-[#18181b] cursor-crosshair"
                  onMouseDown={handlePanStart}
                  onMouseMove={handlePanMove}
                  onMouseUp={handlePanEnd}
                  onMouseLeave={handlePanEnd}
              >
                  {/* Background Checkerboard Full */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)', backgroundSize: '40px 40px' }}></div>

                  {/* Container Transformável */}
                  <div 
                      ref={editorContainerRef}
                      style={{ 
                          transform: `translate(${editorPan.x}px, ${editorPan.y}px) scale(${editorZoom})`, 
                          transformOrigin: 'center center',
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: isDraggingPan ? 'none' : 'transform 0.1s ease-out'
                      }}
                  >
                      <div className="relative shadow-2xl">
                          <img 
                              ref={editorImageRef}
                              src={editorImageSrc} 
                              alt="Editor Target" 
                              className="max-w-none pointer-events-auto"
                              draggable={false}
                              onClick={handleEditorClick}
                              style={{ display: 'block' }}
                          />
                          {renderEditorOverlay()}
                      </div>
                  </div>

                  {/* Instruções Flutuantes */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur px-6 py-3 rounded-full border border-white/10 text-white text-sm shadow-xl flex items-center gap-4 pointer-events-none">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Clique para adicionar pontos</span>
                      <span className="w-px h-4 bg-white/20"></span>
                      <span>Pontos: <b>{manualPoints.length}</b></span>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
