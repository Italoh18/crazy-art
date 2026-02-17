
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Maximize, Upload, Eye, Ruler, AlertTriangle, 
  CheckCircle, FileText, Monitor, X, ZoomIn, ZoomOut, MousePointer2 
} from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';

interface ImageInfo {
  width: number;
  height: number;
  url: string;
  name: string;
  sizeMb: number;
}

// Fórmulas base
const MM_PER_INCH = 25.4;

export default function SmartEnlargement() {
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [mode, setMode] = useState<'client' | 'designer'>('client');
  
  // Inputs do Usuário
  const [targetWidthCm, setTargetWidthCm] = useState<number>(100); // 1 metro padrão
  const [targetHeightCm, setTargetHeightCm] = useState<number>(0);
  const [viewDistance, setViewDistance] = useState<number>(1); // Metros
  
  // Análise
  const [sharpnessScore, setSharpnessScore] = useState<number>(0); // 0-100
  const [isFalseHighRes, setIsFalseHighRes] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulação Visual
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showHumanEyeSim, setShowHumanEyeSim] = useState(true);

  // --- 1. Cálculos Matemáticos ---
  const effectiveDPI = useMemo(() => {
    if (!image || targetWidthCm <= 0) return 0;
    const inches = targetWidthCm / 2.54;
    return Math.round(image.width / inches);
  }, [image, targetWidthCm]);

  const recommendedDPI = useMemo(() => {
    if (viewDistance <= 0.5) return 300;
    if (viewDistance <= 1) return 240;
    if (viewDistance <= 2) return 150;
    if (viewDistance <= 3) return 100;
    return 72; // Outdoor/Longe
  }, [viewDistance]);

  const pixelationRisk = useMemo(() => {
    if (effectiveDPI >= recommendedDPI) return 0;
    // Risco cresce conforme DPI efetivo cai abaixo do recomendado
    const ratio = effectiveDPI / recommendedDPI;
    const risk = Math.round((1 - ratio) * 100);
    return Math.min(100, Math.max(0, risk));
  }, [effectiveDPI, recommendedDPI]);

  const statusColor = pixelationRisk < 20 ? 'text-emerald-500' : pixelationRisk < 50 ? 'text-amber-500' : 'text-red-500';
  const statusBg = pixelationRisk < 20 ? 'bg-emerald-500/10 border-emerald-500/20' : pixelationRisk < 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  // --- 2. Handlers ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const info: ImageInfo = {
            width: img.naturalWidth,
            height: img.naturalHeight,
            url: img.src,
            name: file.name,
            sizeMb: file.size / (1024 * 1024)
          };
          setImage(info);
          
          // Calcula altura proporcional inicial
          const ratio = img.naturalHeight / img.naturalWidth;
          setTargetHeightCm(parseFloat((100 * ratio).toFixed(1)));
          
          analyzeImageQuality(img);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWidthChange = (val: number) => {
    setTargetWidthCm(val);
    if (image) {
      const ratio = image.height / image.width;
      setTargetHeightCm(parseFloat((val * ratio).toFixed(1)));
    }
  };

  // --- 3. Análise de Imagem (Detector de Falsa Resolução) ---
  const analyzeImageQuality = (img: HTMLImageElement) => {
    // Cria um canvas pequeno para análise rápida de contraste local
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Downsample para análise de performance (max 1000px)
    const scale = Math.min(1, 1000 / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalEdgeStrength = 0;
    let pixelCount = 0;

    // Filtro de Nitidez Simplificado (Kernel Laplaciano leve)
    // Compara pixel atual com vizinhos para detectar bordas nítidas
    const w = canvas.width;
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const gray = (data[idx] + data[idx+1] + data[idx+2]) / 3;
        
        // Vizinhos (Cima, Baixo, Esq, Dir)
        const up = (y-1) * w + x;
        const down = (y+1) * w + x;
        const left = y * w + (x-1);
        const right = y * w + (x+1);
        
        const gUp = (data[up*4] + data[up*4+1] + data[up*4+2]) / 3;
        const gDown = (data[down*4] + data[down*4+1] + data[down*4+2]) / 3;
        const gLeft = (data[left*4] + data[left*4+1] + data[left*4+2]) / 3;
        const gRight = (data[right*4] + data[right*4+1] + data[right*4+2]) / 3;

        // Diferença absoluta (gradiente)
        const diff = Math.abs(gray - gUp) + Math.abs(gray - gDown) + Math.abs(gray - gLeft) + Math.abs(gray - gRight);
        totalEdgeStrength += diff;
        pixelCount++;
      }
    }

    const avgEdge = totalEdgeStrength / pixelCount;
    // Normalização empírica: imagens nítidas costumam ter avgEdge > 20. Upscaled < 10.
    const score = Math.min(100, (avgEdge / 30) * 100);
    
    setSharpnessScore(score);
    // Se a imagem for muito grande (>2000px) mas tiver score baixo (<20), provável upscale
    setIsFalseHighRes(img.width > 2000 && score < 25);
    setIsProcessing(false);
  };

  // --- 4. Renderização da Simulação Visual ---
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = image.url;
    img.onload = () => {
        // Tamanho do Canvas de Visualização
        canvas.width = 800;
        canvas.height = 600;

        // 1. Simular Pixelização
        // Se DPI Efetivo for baixo, precisamos desenhar "pixels grandes"
        // Screen DPI padrão ~96. 
        // Se Effective DPI = 10, cada pixel da imagem deve ocupar 9.6 pixels da tela.
        
        const screenDPI = 96;
        const pixelScale = Math.max(1, screenDPI / effectiveDPI); 
        
        // Criar offscreen canvas pequeno para simular a perda de resolução
        const offCanvas = document.createElement('canvas');
        // Tamanho proporcional à resolução real de impressão naquela área
        const viewW = canvas.width / zoomLevel;
        const viewH = canvas.height / zoomLevel;
        
        // Resolução "Real" na área de visualização
        const renderW = viewW / pixelScale;
        const renderH = viewH / pixelScale;
        
        offCanvas.width = renderW;
        offCanvas.height = renderH;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
            // Desenha a imagem inteira reduzida (simula a falta de pixels)
            // Aqui simplificamos pegando o centro da imagem para o zoom
            const sourceW = img.width / zoomLevel;
            const sourceH = img.height / zoomLevel;
            const sourceX = (img.width - sourceW) / 2;
            const sourceY = (img.height - sourceH) / 2;

            offCtx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, renderW, renderH);
        }

        // Desenhar de volta no canvas principal (Upscale "Nearest Neighbor" para ver os quadrados)
        ctx.imageSmoothingEnabled = false;
        
        // 2. Simulador de Olho Humano (Blur)
        // Quanto maior a distância, maior o blur que o olho aplica naturalmente
        // Distância (m) * Fator
        if (showHumanEyeSim) {
            const blurAmount = Math.max(0, (viewDistance - 0.5) * 1.5);
            ctx.filter = `blur(${blurAmount}px)`;
        } else {
            ctx.filter = 'none';
        }

        ctx.drawImage(offCanvas, 0, 0, renderW, renderH, 0, 0, canvas.width, canvas.height);
        
        // Reset filter
        ctx.filter = 'none';
        
        // Overlay de Texto (Escala 1:1)
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(10, 10, 160, 30);
        ctx.fillStyle = "white";
        ctx.font = "12px sans-serif";
        ctx.fillText(`Simulação: ${zoomLevel}x Zoom`, 20, 30);
    };
  }, [image, effectiveDPI, viewDistance, zoomLevel, showHumanEyeSim]);

  // --- 5. Gerar Relatório PDF ---
  const generateReport = () => {
      if (!image) return;
      const doc = new jsPDF();
      
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("Relatório de Ampliação - Crazy Art", 20, 20);
      
      doc.setFontSize(12);
      doc.text("Dados do Arquivo:", 20, 40);
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(`Nome: ${image.name}`, 25, 50);
      doc.text(`Resolução Original: ${image.width} x ${image.height} px`, 25, 55);
      doc.text(`Tamanho em Disco: ${image.sizeMb.toFixed(2)} MB`, 25, 60);
      
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("Parâmetros de Impressão:", 20, 80);
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(`Tamanho Final: ${targetWidthCm} cm x ${targetHeightCm} cm`, 25, 90);
      doc.text(`Distância de Visão: ${viewDistance} metros`, 25, 95);
      
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("Análise Técnica:", 20, 115);
      doc.setFontSize(14);
      
      if (pixelationRisk < 20) doc.setTextColor(50, 200, 100);
      else if (pixelationRisk < 50) doc.setTextColor(255, 165, 0);
      else doc.setTextColor(255, 50, 50);
      
      doc.text(`DPI Efetivo: ${effectiveDPI} DPI`, 25, 125);
      doc.text(`Classificação: ${pixelationRisk < 20 ? 'Excelente' : pixelationRisk < 50 ? 'Aceitável' : 'Inadequado'}`, 25, 132);
      
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(`Recomendado para esta distância: ${recommendedDPI} DPI`, 25, 140);
      
      if (isFalseHighRes) {
          doc.setTextColor(255, 50, 50);
          doc.text("⚠️ ALERTA: Indícios de baixa nitidez real (Upscaling detectado).", 25, 150);
      }

      doc.save("relatorio_tecnico_ampliacao.pdf");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-8 animate-fade-in-up">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <Link to="/programs" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-heading uppercase flex items-center gap-3">
                    <Maximize className="text-cyan-500" />
                    Simulador de Ampliação
                </h1>
                <p className="text-zinc-500 text-xs md:text-sm font-mono tracking-widest mt-1">Análise técnica de DPI e Distância</p>
            </div>
        </div>
        
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button onClick={() => setMode('client')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${mode === 'client' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Cliente</button>
            <button onClick={() => setMode('designer')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${mode === 'designer' ? 'bg-cyan-600 text-white' : 'text-zinc-500 hover:text-white'}`}>Designer</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna 1: Controles */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* Upload */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
                {!image ? (
                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:border-cyan-500 transition-colors bg-black/20">
                        <Upload size={32} className="text-zinc-500 mb-2 group-hover:text-cyan-500 transition-colors" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Carregar Imagem</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                ) : (
                    <div className="flex items-center gap-4">
                        <img src={image.url} className="w-16 h-16 rounded-xl object-cover border border-zinc-700" />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold truncate text-sm">{image.name}</h3>
                            <p className="text-zinc-500 text-xs">{image.width} x {image.height} px</p>
                        </div>
                        <button onClick={() => setImage(null)} className="p-2 bg-zinc-800 rounded-full hover:bg-red-500/20 hover:text-red-500 transition"><X size={16} /></button>
                    </div>
                )}
            </div>

            {image && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* Dimensões Finais */}
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Ruler size={16} className="text-cyan-500" /> Tamanho da Impressão</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Largura (cm)</label>
                                <input type="number" value={targetWidthCm} onChange={(e) => handleWidthChange(parseFloat(e.target.value))} className="w-full bg-black/40 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Altura (cm)</label>
                                <input type="number" value={targetHeightCm} disabled className="w-full bg-black/40 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-500 font-mono cursor-not-allowed" />
                            </div>
                        </div>
                    </div>

                    {/* Distância de Visão */}
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Eye size={16} className="text-cyan-500" /> Distância do Observador</h3>
                        <input type="range" min="0.5" max="10" step="0.5" value={viewDistance} onChange={(e) => setViewDistance(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 mb-2" />
                        <div className="flex justify-between text-xs font-bold">
                            <span className="text-white">{viewDistance} metros</span>
                            <span className="text-zinc-500">{viewDistance < 1 ? 'Mão/Mesa' : viewDistance < 3 ? 'Parede/Banner' : 'Outdoor'}</span>
                        </div>
                    </div>

                    {/* Resultado / Status */}
                    <div className={`p-6 rounded-3xl border ${statusBg} transition-colors duration-500`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Qualidade Estimada</span>
                            <div className={`p-1 rounded-full ${statusColor} bg-current`}></div>
                        </div>
                        <h2 className={`text-3xl font-black ${statusColor} mb-1`}>
                            {pixelationRisk < 20 ? 'Excelente' : pixelationRisk < 50 ? 'Boa / Limite' : 'Inadequada'}
                        </h2>
                        <p className="text-xs opacity-70 leading-relaxed">
                            {pixelationRisk < 20 
                                ? "Pode imprimir sem medo. A imagem ficará nítida nesta distância." 
                                : pixelationRisk < 50 
                                ? "Pode haver leve perda de nitidez se observado de perto." 
                                : "Alto risco de pixelização visível (quadrados). Recomenda-se reduzir o tamanho ou trocar a imagem."}
                        </p>
                        
                        {isFalseHighRes && (
                            <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2 text-red-300">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                <p className="text-xs"><strong>Atenção:</strong> Detectamos "Falsa Alta Resolução". A imagem é grande, mas tem pouca nitidez real (possível upscaling anterior).</p>
                            </div>
                        )}
                    </div>

                    {mode === 'designer' && (
                        <div className="bg-black/40 border border-zinc-800 p-4 rounded-2xl font-mono text-xs text-zinc-400 space-y-2">
                            <div className="flex justify-between"><span>DPI Original (Est):</span> <span>{(image.width / (targetWidthCm/2.54)).toFixed(0)}</span></div>
                            <div className="flex justify-between"><span className="text-white">DPI Efetivo:</span> <span className="text-white font-bold">{effectiveDPI}</span></div>
                            <div className="flex justify-between"><span>DPI Recomendado:</span> <span>{recommendedDPI}</span></div>
                            <div className="flex justify-between"><span>Score Nitidez:</span> <span>{sharpnessScore.toFixed(1)}/100</span></div>
                        </div>
                    )}

                    <button onClick={generateReport} className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition shadow-lg flex items-center justify-center gap-2">
                        <FileText size={18} /> Gerar Relatório PDF
                    </button>
                </div>
            )}
        </div>

        {/* Coluna 2: Visualização (Simulador) */}
        <div className="lg:col-span-2 bg-[#09090b] border border-zinc-800 rounded-3xl relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            {/* Toolbar Visualização */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20 pointer-events-none">
                <div className="bg-black/60 backdrop-blur border border-white/10 px-4 py-2 rounded-full pointer-events-auto flex items-center gap-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Simulação</span>
                    <div className="h-4 w-px bg-white/20"></div>
                    <button onClick={() => setShowHumanEyeSim(!showHumanEyeSim)} className={`text-xs font-bold flex items-center gap-1 transition ${showHumanEyeSim ? 'text-cyan-400' : 'text-zinc-500'}`}>
                        <Eye size={14} /> Olho Humano
                    </button>
                </div>
                <div className="bg-black/60 backdrop-blur border border-white/10 px-2 py-1 rounded-full pointer-events-auto flex items-center gap-1">
                    <button onClick={() => setZoomLevel(z => Math.max(1, z - 1))} className="p-2 hover:text-white text-zinc-400"><ZoomOut size={16} /></button>
                    <span className="text-xs font-mono text-white w-8 text-center">{zoomLevel}x</span>
                    <button onClick={() => setZoomLevel(z => Math.min(10, z + 1))} className="p-2 hover:text-white text-zinc-400"><ZoomIn size={16} /></button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative p-8">
                {image ? (
                    <div className="relative shadow-2xl border border-zinc-800 bg-black">
                        <canvas 
                            ref={canvasRef} 
                            className="max-w-full max-h-[70vh] object-contain"
                            style={{ imageRendering: 'pixelated' }} // Importante para o visual de pixelart se zoom alto
                        />
                        {/* Régua de Escala Aproximada */}
                        <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-1 rounded text-[10px] text-white font-mono border border-white/20">
                            1 metro na tela ≈ {(100 / targetWidthCm * 100).toFixed(0)}% da largura
                        </div>
                    </div>
                ) : (
                    <div className="text-center opacity-30">
                        <Monitor size={64} className="mx-auto mb-4" />
                        <p className="text-xl font-light">Aguardando Imagem</p>
                    </div>
                )}
            </div>
            
            {image && (
                <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-center">
                    <p className="text-xs text-zinc-500">
                        <MousePointer2 size={12} className="inline mr-1" />
                        Esta simulação é uma aproximação digital. A qualidade final depende também do material e da impressora.
                    </p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
