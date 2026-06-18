
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Share2, Upload, Trash2, ZoomIn, ZoomOut, Maximize, RotateCcw, Image as ImageIcon, FileText, Wrench, Sparkles } from 'lucide-react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import { useData } from '../contexts/DataContext';

interface MockupImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

const URLImage = ({ imageProps, isSelected, onSelect, onChange }: { 
  imageProps: MockupImage, 
  isSelected: boolean, 
  onSelect: () => void,
  onChange: (newProps: MockupImage) => void 
  }) => {
  const [img] = useImage(imageProps.url, 'anonymous');
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <KonvaImage
        image={img}
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...imageProps}
        draggable
        onDragEnd={(e) => {
          onChange({
            ...imageProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...imageProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export default function LayoutBuilder() {
  const { mockupBaseUrl, mockupBackgroundUrl, mockupBaseX, mockupBaseY, mockupBaseWidth, mockupCollars, loadData } = useData();
  const [images, setImages] = useState<MockupImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const [localBgUrl, setLocalBgUrl] = useState<string>('');
  const [selectedCollarId, setSelectedCollarId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  
  const [containerSize, setContainerSize] = useState({ width: 720, height: 720 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadData) {
      loadData(true);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
         const size = Math.min(width, height) || width || 720;
        setContainerSize({ width: size, height: size });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const currentMockupUrl = mockupBaseUrl || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop';
  
  const collarsList = Array.isArray(mockupCollars) ? mockupCollars : [];
  const activeCollar = collarsList.find(c => c.id === selectedCollarId);
  const [mockupImg] = useImage(currentMockupUrl, 'anonymous');
  const [bgImg] = useImage(localBgUrl || mockupBackgroundUrl || '', 'anonymous');
  const [collarImg] = useImage(activeCollar?.svgUrl || '', 'anonymous');

  const handleMouseDown = (e: any) => {
    // Button 2 is the right mouse click
    const isRightClick = e.evt.button === 2;
    if (isRightClick) {
      isPanningRef.current = true;
      setIsPanning(true);
      startPanRef.current = {
        x: e.evt.clientX - stagePos.x,
        y: e.evt.clientY - stagePos.y,
      };
      setSelectedId(null);
    } else {
      if (e.target === e.target.getStage()) {
        setSelectedId(null);
      }
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isPanningRef.current) return;
    const newPos = {
      x: e.evt.clientX - startPanRef.current.x,
      y: e.evt.clientY - startPanRef.current.y,
    };
    setStagePos(newPos);
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    setIsPanning(false);
  };

  const handleWheel = (e: any) => {
    // Focus the area by preventing regular page scrolling while over the canvas
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    const responsiveScale = containerSize.width / 720;
    const oldScale = zoom * responsiveScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const scaleBy = 1.05;
    let newZoom = e.evt.deltaY < 0 ? zoom * scaleBy : zoom / scaleBy;
    newZoom = Math.max(0.4, Math.min(5, newZoom));

    setZoom(newZoom);

    const newScale = newZoom * responsiveScale;
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setStagePos(newPos);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const newImage: MockupImage = {
        id: Math.random().toString(36).substr(2, 9),
        url,
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        rotation: 0
      };
      setImages(prev => [...prev, newImage]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Minimum size check 200x200
    const reader = new FileReader();
    reader.onload = (event) => {
        const url = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
            if (img.width < 200 || img.height < 200) {
                alert("A imagem de fundo deve ter no mínimo 200x200 pixels.");
                return;
            }
            setLocalBgUrl(url);
        };
        img.src = url;
    };
    reader.readAsDataURL(file);
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setImages(prev => prev.filter(img => img.id !== selectedId));
    setSelectedId(null);
  };

  const clearCanvas = () => {
    if (confirm("Limpar todas as imagens?")) {
      setImages([]);
      setSelectedId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      {/* HEADER */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition text-zinc-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Mockup 2D Builder</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Artes Personalizadas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-amber-600 transition text-sm font-bold shadow-lg shadow-primary/20">
                <Share2 size={16} /> <span className="hidden sm:inline">Exportar</span>
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-row overflow-hidden">
        {/* SIDEBAR CONTROLS */}
        <div className="w-64 lg:w-80 border-r border-white/5 bg-zinc-950 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
          <div className="border-b border-white/5 pb-4">
             <h2 className="text-sm font-bold text-white flex items-center gap-2">
                 <Wrench size={16} className="text-primary" />
                 Ferramentas
             </h2>
             <span className="text-[9px] font-mono font-semibold text-primary/80 uppercase tracking-widest mt-1 block">Painel Ativo</span>
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Fundo da Área</label>
            <input 
                type="file" 
                ref={bgInputRef}
                onChange={handleBgUpload}
                accept="image/*.png,image/jpeg" 
                className="hidden" 
             />
             <button 
                onClick={() => bgInputRef.current?.click()}
                className="w-full py-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition flex items-center justify-center gap-2 text-xs font-bold"
             >
                <ImageIcon size={14} /> Alterar Fundo
             </button>
             <p className="text-[9px] text-zinc-600 mt-2 text-center">Recomendado: PNG/JPG (Mín. 200x200px)</p>
          </div>

          <div>
             <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Adicionar Estampas</label>
             <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf" 
                className="hidden" 
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-primary/50 transition group cursor-pointer"
             >
                <div className="p-3 bg-zinc-900 rounded-xl group-hover:bg-primary/20 transition">
                    <Upload size={24} className="text-zinc-500 group-hover:text-primary transition" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-zinc-300">Carregar Imagem</p>
                    <p className="text-[10px] text-zinc-600">PNG, JPG, TIFF, PDF</p>
                </div>
             </button>
          </div>

          {selectedId && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Elemento Selecionado</label>
                <button 
                    onClick={deleteSelected}
                    className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-2 font-bold text-sm"
                >
                    <Trash2 size={16} /> Remover Arte
                </button>
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-white/5">
             <button 
                onClick={clearCanvas}
                className="w-full py-2 text-zinc-600 hover:text-zinc-400 transition text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2"
             >
                <RotateCcw size={12} /> Limpar Área de Trabalho
             </button>
          </div>
        </div>

        {/* WORK AREA */}
        <div className="flex-1 bg-black relative flex flex-col overflow-hidden items-center justify-center">
            
            {/* TOOLBAR */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-zinc-900/80 backdrop-blur-md border border-white/5 rounded-full p-1 shadow-2xl">
                <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition">
                    <ZoomOut size={18} />
                </button>
                <div className="w-px h-8 bg-white/5 mx-1" />
                <button onClick={() => { setZoom(1); setStagePos({ x: 0, y: 0 }); }} className="px-3 text-xs font-mono text-zinc-500 hover:text-white transition" title="Redefinir visualização">
                    {Math.round(zoom * 100)}%
                </button>
                <div className="w-px h-8 bg-white/5 mx-1" />
                <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition">
                    <ZoomIn size={18} />
                </button>
            </div>

            {/* CANVAS WRAPPER */}
            <div 
                className="flex-1 w-full overflow-hidden flex items-center justify-center p-6 bg-[radial-gradient(#18181b_1px,transparent_1px)] bg-[size:40px_40px]"
                onClick={() => setSelectedId(null)}
                onContextMenu={(e) => {
                    e.preventDefault(); // Impede o menu de contexto nativo para permitir arrastar com botão direito
                }}
            >
                <div 
                    id="mockup-view-frame"
                    ref={containerRef}
                    className={`bg-[#121215] shadow-[0_0_80px_rgba(0,0,0,0.6)] rounded-3xl overflow-hidden relative border border-white/5 transition-shadow ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{ 
                        width: 'min(720px, 100%, calc(100vh - 240px))', 
                        height: 'min(720px, 100%, calc(100vh - 240px))',
                        aspectRatio: '1 / 1',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Stage 
                        width={containerSize.width} 
                        height={containerSize.height} 
                        scaleX={zoom * (containerSize.width / 720)}
                        scaleY={zoom * (containerSize.width / 720)}
                        x={stagePos.x}
                        y={stagePos.y}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                    >
                        <Layer>
                            {bgImg && (
                                <KonvaImage 
                                    image={bgImg} 
                                    width={720} 
                                    height={720} 
                                    listening={false}
                                />
                            )}
                            {mockupImg && (() => {
                                const w = 720 * ((mockupBaseWidth ?? 100) / 100);
                                const h = mockupImg ? (mockupImg.height / mockupImg.width) * w : 720;
                                const x = (720 * ((mockupBaseX ?? 50) / 100)) - (w / 2);
                                const y = (720 * ((mockupBaseY ?? 50) / 100)) - (h / 2);
                                return (
                                    <KonvaImage 
                                        image={mockupImg} 
                                        width={w} 
                                        height={h} 
                                        x={x}
                                        y={y}
                                        listening={false}
                                    />
                                );
                            })()}
                            {collarImg && activeCollar && (() => {
                                const scaleF = (mockupBaseWidth ?? 100) / 100;
                                const shirtCenterX = 720 * ((mockupBaseX ?? 50) / 100);
                                const shirtCenterY = 720 * ((mockupBaseY ?? 50) / 100);

                                const designedCenterX = 720 * ((activeCollar.x ?? 50) / 100);
                                const designedCenterY = 720 * ((activeCollar.y ?? 50) / 100);
                                const designedWidth = 720 * ((activeCollar.width ?? 25) / 100);

                                const offsetX = designedCenterX - 360;
                                const offsetY = designedCenterY - 360;

                                const collarW = designedWidth * scaleF;
                                const collarH = collarImg ? (collarImg.height / collarImg.width) * collarW : collarW;

                                const collarCenterX = shirtCenterX + (offsetX * scaleF);
                                const collarCenterY = shirtCenterY + (offsetY * scaleF);

                                const collarX = collarCenterX - (collarW / 2);
                                const collarY = collarCenterY - (collarH / 2);

                                return (
                                    <KonvaImage 
                                        image={collarImg} 
                                        width={collarW} 
                                        height={collarH} 
                                        x={collarX}
                                        y={collarY}
                                        listening={false}
                                    />
                                );
                            })()}
                            {images.map((img, i) => (
                                <URLImage
                                    key={img.id}
                                    imageProps={img}
                                    isSelected={img.id === selectedId}
                                    onSelect={() => setSelectedId(img.id)}
                                    onChange={(newProps) => {
                                        const newImages = images.slice();
                                        newImages[i] = newProps;
                                        setImages(newImages);
                                    }}
                                />
                            ))}
                        </Layer>
                    </Stage>
                </div>
            </div>

            {/* LEGEND / FOOTER */}
            <div className="w-full bg-zinc-950/80 border-t border-white/5 px-6 py-4 flex flex-row items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse"></div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">Canal de Impressão Direto</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-medium">
                    <span className="text-center sm:text-left">Atalhos: Scroll (Zoom) | Botão Direito (Arrastar)</span>
                    <span className="border-l border-white/10 pl-4">Workspace: 720x720px (1:1)</span>
                </div>
            </div>
        </div>

        {/* SIDEBAR DIREITA - CUSTOMIZAÇÃO DE MODELAGEM */}
        <div className="flex w-64 lg:w-80 border-l border-white/5 bg-zinc-950 p-6 flex-col gap-6 overflow-y-auto shrink-0 select-none">
          <div className="border-b border-white/5 pb-4">
             <h2 className="text-sm font-bold text-white flex items-center gap-2">
                 <Wrench size={16} className="text-primary" />
                 Modelagem
             </h2>
             <span className="text-[9px] font-mono font-semibold text-zinc-500 uppercase tracking-widest mt-1 block">Ajustes & Componentes</span>
          </div>

          {/* Seletor de Gola */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Gola do Mockup</h3>
                <span className="text-[9px] text-zinc-500 font-mono">Personalização do Molde</span>
              </div>
              {selectedCollarId && (
                <button
                  onClick={() => setSelectedCollarId('')}
                  className="text-[10px] text-zinc-500 hover:text-white font-medium transition cursor-pointer bg-transparent border-none p-0"
                >
                  Remover Gola
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
              {collarsList.map((collar) => {
                const isSelected = selectedCollarId === collar.id;
                return (
                  <button
                    key={collar.id}
                    onClick={() => setSelectedCollarId(collar.id)}
                    className={`p-3 rounded-xl border text-left transition duration-200 flex flex-col gap-2 relative group overflow-hidden cursor-pointer ${
                      isSelected 
                        ? 'bg-primary/10 border-primary text-white shadow-lg shadow-primary/5' 
                        : 'bg-[#121215]/40 border-white/5 hover:border-white/10 hover:bg-[#121215]/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="aspect-square w-full rounded-lg bg-zinc-950 flex items-center justify-center p-2 border border-white/5 relative group-hover:border-white/10 transition">
                      <img 
                        src={collar.svgUrl} 
                        alt={collar.name} 
                        className="max-w-full max-h-full object-contain filter invert opacity-80"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                          ATIVO
                        </div>
                      )}
                    </div>
                    <div className="truncate text-[11px] font-bold mt-1 self-center w-full text-center">
                      {collar.name}
                    </div>
                  </button>
                );
              })}
              {collarsList.length === 0 && (
                <div className="col-span-2 text-center py-6 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                  <p className="text-[10px] text-zinc-500 italic">Nenhuma gola cadastrada pelo administrador.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
