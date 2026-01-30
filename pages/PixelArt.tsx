
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Grid, Eraser, PenTool, Download, 
  Trash2, Copy, Plus, Play, Pause, Square, 
  PaintBucket, Undo, Save, Layers, Film, Loader2
} from 'lucide-react';
// @ts-ignore
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const GRID_SIZE = 32;
const DEFAULT_COLOR = '#000000';

type Frame = string[]; // Array de cores hex ou 'transparent'

export default function PixelArt() {
  // --- Estados ---
  const [frames, setFrames] = useState<Frame[]>([new Array(GRID_SIZE * GRID_SIZE).fill('transparent')]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'bucket'>('pen');
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(8);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [onionSkin, setOnionSkin] = useState(false);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false); // Novo estado de loading

  // Canvas Refs
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // --- Lógica de Desenho ---

  const getPixelIndex = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = Math.floor(((clientX - rect.left) / rect.width) * GRID_SIZE);
    const y = Math.floor(((clientY - rect.top) / rect.height) * GRID_SIZE);
    
    return { x, y, index: y * GRID_SIZE + x };
  };

  const updateFrame = (index: number, newColor: string) => {
    setFrames(prev => {
      const newFrames = [...prev];
      const currentFrame = [...newFrames[currentFrameIndex]];
      currentFrame[index] = newColor;
      newFrames[currentFrameIndex] = currentFrame;
      return newFrames;
    });
  };

  const floodFill = (startIndex: number, targetColor: string, replacementColor: string) => {
    if (targetColor === replacementColor) return;
    
    setFrames(prev => {
        const newFrames = [...prev];
        const pixels = [...newFrames[currentFrameIndex]];
        const queue = [startIndex];
        
        while (queue.length > 0) {
            const idx = queue.pop()!;
            if (pixels[idx] !== targetColor) continue;
            
            pixels[idx] = replacementColor;
            
            const x = idx % GRID_SIZE;
            const y = Math.floor(idx / GRID_SIZE);
            
            // Check vizinhos (Up, Down, Left, Right)
            if (x > 0) queue.push(idx - 1);
            if (x < GRID_SIZE - 1) queue.push(idx + 1);
            if (y > 0) queue.push(idx - GRID_SIZE);
            if (y < GRID_SIZE - 1) queue.push(idx + GRID_SIZE);
        }
        
        newFrames[currentFrameIndex] = pixels;
        return newFrames;
    });
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    if (!mainCanvasRef.current) return;
    
    const { index } = getPixelIndex(e, mainCanvasRef.current);
    if (index < 0 || index >= GRID_SIZE * GRID_SIZE) return;

    if (tool === 'bucket') {
        const targetColor = frames[currentFrameIndex][index];
        floodFill(index, targetColor, color);
    } else {
        const newColor = tool === 'eraser' ? 'transparent' : color;
        updateFrame(index, newColor);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !mainCanvasRef.current || tool === 'bucket') return;
    
    const { index } = getPixelIndex(e, mainCanvasRef.current);
    if (index >= 0 && index < GRID_SIZE * GRID_SIZE) {
        const newColor = tool === 'eraser' ? 'transparent' : color;
        // Só atualiza se a cor for diferente pra evitar re-renders excessivos
        if (frames[currentFrameIndex][index] !== newColor) {
            updateFrame(index, newColor);
        }
    }
  };

  const handlePointerUp = () => setIsDrawing(false);

  // --- Renderização ---

  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpa
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const pixelSize = canvas.width / GRID_SIZE;

    // 1. Onion Skin (Sombra do frame anterior)
    if (onionSkin && currentFrameIndex > 0) {
        const prevFrame = frames[currentFrameIndex - 1];
        
        ctx.save();
        ctx.globalAlpha = 0.3; // Opacidade reduzida
        
        prevFrame.forEach((pixelColor, i) => {
            if (pixelColor !== 'transparent') {
                const x = (i % GRID_SIZE) * pixelSize;
                const y = Math.floor(i / GRID_SIZE) * pixelSize;
                ctx.fillStyle = pixelColor;
                ctx.fillRect(x, y, pixelSize, pixelSize);
            }
        });
        
        ctx.restore();
    }

    // 2. Desenha Frame Atual
    const pixels = frames[currentFrameIndex];

    pixels.forEach((pixelColor, i) => {
        if (pixelColor !== 'transparent') {
            const x = (i % GRID_SIZE) * pixelSize;
            const y = Math.floor(i / GRID_SIZE) * pixelSize;
            ctx.fillStyle = pixelColor;
            ctx.fillRect(x, y, pixelSize, pixelSize);
        }
    });

    // 3. Grid Overlay
    if (showGrid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.moveTo(i * pixelSize, 0);
            ctx.lineTo(i * pixelSize, canvas.height);
            ctx.moveTo(0, i * pixelSize);
            ctx.lineTo(canvas.width, i * pixelSize);
        }
        ctx.stroke();
    }

  }, [frames, currentFrameIndex, showGrid, onionSkin]);

  // --- Preview Animation Loop ---
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let lastTime = 0;
    const interval = 1000 / fps;

    const animate = (time: number) => {
        if (!isPlaying) {
            // Se pausado, mostra o frame atual selecionado
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const pixelSize = canvas.width / GRID_SIZE;
            const pixels = frames[currentFrameIndex];
            pixels.forEach((pc, i) => {
                if (pc !== 'transparent') {
                    ctx.fillStyle = pc;
                    ctx.fillRect((i % GRID_SIZE) * pixelSize, Math.floor(i / GRID_SIZE) * pixelSize, pixelSize, pixelSize);
                }
            });
            animationRef.current = requestAnimationFrame(animate);
            return;
        }

        if (time - lastTime > interval) {
            lastTime = time;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const pixelSize = canvas.width / GRID_SIZE;
            const pixels = frames[frame % frames.length];
            
            pixels.forEach((pc, i) => {
                if (pc !== 'transparent') {
                    ctx.fillStyle = pc;
                    ctx.fillRect((i % GRID_SIZE) * pixelSize, Math.floor(i / GRID_SIZE) * pixelSize, pixelSize, pixelSize);
                }
            });
            
            frame++;
        }
        animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [frames, isPlaying, fps, currentFrameIndex]);

  // --- Frame Management ---
  const addFrame = () => {
    setFrames(prev => [...prev, new Array(GRID_SIZE * GRID_SIZE).fill('transparent')]);
    setCurrentFrameIndex(prev => prev + 1);
  };

  const copyFrame = () => {
    setFrames(prev => {
        const newFrames = [...prev];
        newFrames.splice(currentFrameIndex + 1, 0, [...prev[currentFrameIndex]]);
        return newFrames;
    });
    setCurrentFrameIndex(prev => prev + 1);
  };

  const deleteFrame = () => {
    if (frames.length <= 1) {
        setFrames([new Array(GRID_SIZE * GRID_SIZE).fill('transparent')]);
        return;
    }
    setFrames(prev => prev.filter((_, i) => i !== currentFrameIndex));
    setCurrentFrameIndex(prev => Math.max(0, prev - 1));
  };

  // --- Download Functions ---

  const downloadFrame = () => {
      if (!mainCanvasRef.current) return;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 512; 
      tempCanvas.height = 512;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      const pixelSize = tempCanvas.width / GRID_SIZE;
      const pixels = frames[currentFrameIndex];
      pixels.forEach((pc, i) => {
          if (pc !== 'transparent') {
              ctx.fillStyle = pc;
              ctx.fillRect((i % GRID_SIZE) * pixelSize, Math.floor(i / GRID_SIZE) * pixelSize, pixelSize, pixelSize);
          }
      });

      const link = document.createElement('a');
      link.download = `crazy-pixel-frame-${currentFrameIndex + 1}.png`;
      link.href = tempCanvas.toDataURL();
      link.click();
  };

  const downloadSpriteSheet = () => {
      const sheetCanvas = document.createElement('canvas');
      sheetCanvas.width = frames.length * GRID_SIZE;
      sheetCanvas.height = GRID_SIZE;
      const ctx = sheetCanvas.getContext('2d');
      if (!ctx) return;

      frames.forEach((frameData, idx) => {
          frameData.forEach((pc, i) => {
              if (pc !== 'transparent') {
                  ctx.fillStyle = pc;
                  ctx.fillRect((idx * GRID_SIZE) + (i % GRID_SIZE), Math.floor(i / GRID_SIZE), 1, 1);
              }
          });
      });

      const link = document.createElement('a');
      link.download = `crazy-pixel-spritesheet.png`;
      link.href = sheetCanvas.toDataURL();
      link.click();
  };

  const downloadGif = async () => {
      setIsGeneratingGif(true);
      
      // Pequeno delay para permitir que o estado de loading renderize
      setTimeout(async () => {
          try {
              const gif = new GIFEncoder();
              const width = 512; // Resolução de saída (HD Pixel Art)
              const height = 512;
              
              frames.forEach(frame => {
                  // Desenha o frame em um canvas temporário
                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d', { willReadFrequently: true });
                  if (!ctx) return;
                  
                  ctx.imageSmoothingEnabled = false;
                  
                  const pixelSize = width / GRID_SIZE;
                  
                  // Fundo transparente por padrão no canvas
                  ctx.clearRect(0, 0, width, height);

                  frame.forEach((pc, i) => {
                      if (pc !== 'transparent') {
                          ctx.fillStyle = pc;
                          ctx.fillRect((i % GRID_SIZE) * pixelSize, Math.floor(i / GRID_SIZE) * pixelSize, pixelSize, pixelSize);
                      }
                  });

                  const imageData = ctx.getImageData(0, 0, width, height);
                  const data = imageData.data;
                  
                  // 1. Coleta apenas pixels opacos para gerar a paleta
                  // Isso evita que pixels transparentes (pretos invisíveis) influenciem a paleta de cores visíveis
                  // e acabem sendo mapeados para a mesma cor do preto opaco.
                  const opaquePixels = [];
                  for (let i = 0; i < data.length; i += 4) {
                      if (data[i + 3] > 0) {
                          opaquePixels.push(data[i], data[i + 1], data[i + 2]);
                      }
                  }

                  // 2. Gera paleta (max 255 cores para sobrar 1 espaço garantido para transparência)
                  // Se não houver pixels opacos, cria paleta padrão
                  let palette;
                  if (opaquePixels.length === 0) {
                      palette = [[0, 0, 0]];
                  } else {
                      palette = quantize(new Uint8Array(opaquePixels), 255);
                  }
                  
                  // 3. Adiciona cor reservada para transparência (índice final)
                  const transparentIndex = palette.length;
                  palette.push([0, 0, 0]); // Cor dummy

                  // 4. Mapeia pixels para a paleta (baseado em RGB, o gifenc ignora alpha no applyPalette padrão)
                  const index = applyPalette(data, palette);

                  // 5. Sobrescreve índice manualmente para pixels que são transparentes no original
                  for (let i = 0; i < index.length; i++) {
                      if (data[i * 4 + 3] === 0) { // Se Alpha for 0
                          index[i] = transparentIndex;
                      }
                  }
                  
                  // Adiciona o frame ao GIF
                  gif.writeFrame(index, width, height, { 
                      palette, 
                      delay: 1000 / fps, 
                      transparent: transparentIndex, // Define qual índice é transparente
                      repeat: 0 
                  });
              });

              gif.finish();
              
              const blob = new Blob([gif.bytes()], { type: 'image/gif' });
              const url = URL.createObjectURL(blob);
              
              const link = document.createElement('a');
              link.href = url;
              link.download = 'crazy-pixel-animation.gif';
              link.click();
              
              // Cleanup
              setTimeout(() => URL.revokeObjectURL(url), 1000);

          } catch (error) {
              console.error("Erro ao gerar GIF:", error);
              alert("Erro ao gerar GIF. Tente novamente.");
          } finally {
              setIsGeneratingGif(false);
          }
      }, 100);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-zinc-800 bg-[#121215] flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-4">
            <Link to="/programs" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold flex items-center gap-2">
                <Grid className="text-primary" size={20} />
                Pixel Art Studio
            </h1>
        </div>
        <div className="flex gap-2 items-center">
            <button 
                onClick={downloadFrame} 
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition"
                title="Baixar frame atual"
            >
                <Download size={14} /> PNG
            </button>
            <button 
                onClick={downloadSpriteSheet} 
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition"
                title="Baixar tira de frames"
            >
                <Save size={14} /> SpriteSheet
            </button>
            <button 
                onClick={downloadGif} 
                disabled={isGeneratingGif}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Baixar Animação GIF"
            >
                {isGeneratingGif ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
                <span>{isGeneratingGif ? 'Gerando...' : 'GIF'}</span>
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar Ferramentas */}
          <div className="w-16 md:w-20 bg-[#121215] border-r border-zinc-800 flex flex-col items-center py-4 gap-4 shrink-0 z-10">
              <button 
                onClick={() => setTool('pen')} 
                className={`p-3 rounded-xl transition ${tool === 'pen' ? 'bg-primary text-white shadow-glow' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                title="Lápis (P)"
              >
                  <PenTool size={20} />
              </button>
              <button 
                onClick={() => setTool('eraser')} 
                className={`p-3 rounded-xl transition ${tool === 'eraser' ? 'bg-primary text-white shadow-glow' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                title="Borracha (E)"
              >
                  <Eraser size={20} />
              </button>
              <button 
                onClick={() => setTool('bucket')} 
                className={`p-3 rounded-xl transition ${tool === 'bucket' ? 'bg-primary text-white shadow-glow' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                title="Balde de Tinta (B)"
              >
                  <PaintBucket size={20} />
              </button>
              
              <div className="h-px w-8 bg-zinc-800 my-2"></div>

              <input 
                type="color" 
                value={color} 
                onChange={(e) => { setColor(e.target.value); setTool('pen'); }}
                className="w-10 h-10 rounded-full cursor-pointer border-2 border-zinc-700 p-0 overflow-hidden"
              />
              
              <div className="flex flex-col gap-2 mt-auto">
                  <button 
                    onClick={() => setOnionSkin(!onionSkin)} 
                    className={`p-2 rounded-lg text-xs transition ${onionSkin ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-600 hover:text-white'}`}
                    title="Onion Skin (Sombra do frame anterior)"
                  >
                      <Layers size={16} />
                  </button>
                  <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-lg text-xs ${showGrid ? 'text-primary' : 'text-zinc-600'}`}>
                      <Grid size={16} />
                  </button>
              </div>
          </div>

          {/* Área Central (Canvas) */}
          <div className="flex-1 bg-[#09090b] relative flex items-center justify-center p-8 overflow-hidden">
              <div className="relative shadow-2xl border border-zinc-800 bg-[#1a1a1a]" style={{ backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}>
                  <canvas
                      ref={mainCanvasRef}
                      width={512}
                      height={512}
                      className="cursor-crosshair touch-none"
                      onMouseDown={handlePointerDown}
                      onMouseMove={handlePointerMove}
                      onMouseUp={handlePointerUp}
                      onMouseLeave={handlePointerUp}
                      onTouchStart={handlePointerDown}
                      onTouchMove={handlePointerMove}
                      onTouchEnd={handlePointerUp}
                      style={{ width: 'min(80vw, 60vh)', height: 'min(80vw, 60vh)', imageRendering: 'pixelated' }}
                  />
              </div>
          </div>

          {/* Sidebar Direita (Preview & Frames) */}
          <div className="w-64 bg-[#121215] border-l border-zinc-800 flex flex-col shrink-0 z-10">
              {/* Preview */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Preview</h3>
                  <div className="flex justify-center bg-black/50 rounded-lg p-4 border border-zinc-800 mb-4">
                      <canvas 
                        ref={previewCanvasRef} 
                        width={128} 
                        height={128} 
                        className="w-32 h-32 image-pixelated bg-white/5"
                      />
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition ${isPlaying ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                      >
                          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                          {isPlaying ? 'PAUSE' : 'PLAY'}
                      </button>
                      <div className="flex items-center gap-2 bg-zinc-800 px-2 py-1 rounded-lg">
                          <span className="text-[10px] text-zinc-400">FPS</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="24" 
                            value={fps} 
                            onChange={(e) => setFps(Number(e.target.value))}
                            className="w-8 bg-transparent text-white text-xs font-mono text-center outline-none"
                          />
                      </div>
                  </div>
              </div>

              {/* Frames List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Frames ({frames.length})</h3>
                      <button onClick={addFrame} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"><Plus size={14} /></button>
                  </div>
                  
                  {frames.map((_, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setCurrentFrameIndex(idx)}
                        className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition group ${idx === currentFrameIndex ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                      >
                          <span className="text-xs font-bold font-mono">#{String(idx + 1).padStart(2, '0')}</span>
                          {idx === currentFrameIndex && (
                              <div className="flex gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); copyFrame(); }} className="p-1 hover:text-white text-primary/70" title="Duplicar"><Copy size={12} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); deleteFrame(); }} className="p-1 hover:text-red-500 text-primary/70" title="Remover"><Trash2 size={12} /></button>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
}
