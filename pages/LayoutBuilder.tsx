
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Share2, Upload, Trash2, ZoomIn, ZoomOut, Maximize, RotateCcw, Image as ImageIcon, FileText, Wrench, Sparkles, X } from 'lucide-react';
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
  const [img] = useImage(imageProps.url);
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
  const { mockupBaseUrl, mockupBackgroundUrl, mockupBaseX, mockupBaseY, mockupBaseWidth, mockupCollars, mockupParts, loadData } = useData();
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

  // Dynamic SVG parts customisations
  const [svgText, setSvgText] = useState<string>('');
  const [partColors, setPartColors] = useState<Record<string, string>>({});
  const [partTextures, setPartTextures] = useState<Record<string, string>>({});
  const [dynamicMockupUrl, setDynamicMockupUrl] = useState<string>('');

  // Dynamic Gola (collar) customisations
  const [collarColor, setCollarColor] = useState<string>('#ffffff');
  const [collarSvgText, setCollarSvgText] = useState<string>('');
  const [dynamicCollarUrl, setDynamicCollarUrl] = useState<string>('');

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

  useEffect(() => {
    if (!currentMockupUrl) {
      setSvgText('');
      return;
    }
    const fetchUrl = currentMockupUrl.startsWith('data:') 
      ? currentMockupUrl 
      : `/api/proxy-image?url=${encodeURIComponent(currentMockupUrl)}`;
      
    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) throw new Error('Não foi possível carregar o arquivo SVG');
        return res.text();
      })
      .then(text => {
        if (text.includes('<svg')) {
          setSvgText(text);
        } else {
          setSvgText('');
        }
      })
      .catch(err => {
        console.error('Erro ao buscar base SVG:', err);
        setSvgText('');
      });
  }, [currentMockupUrl]);

  useEffect(() => {
    if (!svgText) {
      setDynamicMockupUrl('');
      return;
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) {
        setDynamicMockupUrl('');
        return;
      }

      // Add interactive tags indexing (same as AdminMockupSoon.tsx)
      const interactiveTags = ['path', 'polygon', 'rect', 'circle', 'ellipse', 'g'];
      interactiveTags.forEach(tag => {
        const elements = doc.querySelectorAll(tag);
        elements.forEach((el, i) => {
          el.setAttribute('data-svg-index', `${tag}-${i}`);
        });
      });

      // Clear or create defs for patterns
      let defsEl = svgEl.querySelector('defs');
      if (!defsEl) {
        defsEl = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svgEl.insertBefore(defsEl, svgEl.firstChild);
      }

      // Inject a <style> block inside the SVG to enforce the color overrides using !important
      let styleEl = svgEl.querySelector('style#dynamic-part-styles');
      if (!styleEl) {
        styleEl = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.setAttribute('id', 'dynamic-part-styles');
        svgEl.appendChild(styleEl);
      }

      const activeParts = Array.isArray(mockupParts) ? mockupParts : [];
      let styleRules = '';

      activeParts.forEach(part => {
        const selector = part.selector;
        const color = partColors[selector];
        const texture = partTextures[selector];
        const element = svgEl.querySelector(`[data-svg-index="${selector}"]`);

        if (element) {
          if (texture) {
            const patternId = `pat-${selector.replace(/[^a-zA-Z0-9-]/g, '')}`;
            
            // Remove old pattern if exists
            const oldPat = defsEl!.querySelector(`#${patternId}`);
            if (oldPat) oldPat.remove();

            const pattern = doc.createElementNS('http://www.w3.org/2000/svg', 'pattern');
            pattern.setAttribute('id', patternId);
            pattern.setAttribute('patternUnits', 'objectBoundingBox');
            pattern.setAttribute('patternContentUnits', 'objectBoundingBox');
            pattern.setAttribute('width', '1');
            pattern.setAttribute('height', '1');

            const patternImg = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
            patternImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', texture);
            patternImg.setAttribute('x', '0');
            patternImg.setAttribute('y', '0');
            patternImg.setAttribute('width', '1');
            patternImg.setAttribute('height', '1');
            patternImg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

            pattern.appendChild(patternImg);
            defsEl!.appendChild(pattern);

            styleRules += `
              [data-svg-index="${selector}"], [data-svg-index="${selector}"] * {
                fill: url(#${patternId}) !important;
                background-color: transparent !important;
              }
            `;
          } else if (color) {
            styleRules += `
              [data-svg-index="${selector}"], [data-svg-index="${selector}"] * {
                fill: ${color} !important;
                background-color: transparent !important;
              }
            `;
          }
        }
      });

      styleEl.textContent = styleRules;

      const serializer = new XMLSerializer();
      const updatedSvgString = serializer.serializeToString(svgEl);
      
      const encoded = encodeURIComponent(updatedSvgString)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;
      setDynamicMockupUrl(dataUrl);
    } catch (err) {
      console.error('Erro ao gerar dynamic SVG:', err);
    }
  }, [svgText, partColors, partTextures, mockupParts]);
  
  const collarsList = Array.isArray(mockupCollars) ? mockupCollars : [];
  const activeCollar = collarsList.find(c => c.id === selectedCollarId);

  // Fetch Gola (collar) base SVG when selected
  useEffect(() => {
    if (!activeCollar?.svgUrl) {
      setCollarSvgText('');
      setDynamicCollarUrl('');
      return;
    }
    const fetchUrl = activeCollar.svgUrl.startsWith('data:') 
      ? activeCollar.svgUrl 
      : `/api/proxy-image?url=${encodeURIComponent(activeCollar.svgUrl)}`;
      
    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) throw new Error('Não foi possível carregar a gola');
        return res.text();
      })
      .then(text => {
        if (text.includes('<svg')) {
          setCollarSvgText(text);
        } else {
          setCollarSvgText('');
          setDynamicCollarUrl('');
        }
      })
      .catch(err => {
        console.error('Erro ao buscar gola SVG:', err);
        setCollarSvgText('');
        setDynamicCollarUrl('');
      });
  }, [activeCollar?.svgUrl]);

  // Dynamic Gola customisation with the selected color
  useEffect(() => {
    if (!collarSvgText) {
      setDynamicCollarUrl('');
      return;
    }
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(collarSvgText, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) {
        setDynamicCollarUrl('');
        return;
      }

      // Inject style block to override colors inside gola SVG
      let styleEl = svgEl.querySelector('style#dynamic-collar-styles');
      if (!styleEl) {
        styleEl = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.setAttribute('id', 'dynamic-collar-styles');
        svgEl.appendChild(styleEl);
      }

      const styleRules = `
        path, polygon, rect, circle, ellipse, g {
          fill: ${collarColor} !important;
        }
      `;
      styleEl.textContent = styleRules;

      const serializer = new XMLSerializer();
      const updatedSvgString = serializer.serializeToString(svgEl);
      
      const encoded = encodeURIComponent(updatedSvgString)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;
      setDynamicCollarUrl(dataUrl);
    } catch (err) {
      console.error('Erro ao gerar gola dinâmica:', err);
    }
  }, [collarSvgText, collarColor]);
  
  const [mockupImg, setMockupImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const src = dynamicMockupUrl || currentMockupUrl;
    if (!src) {
      setMockupImg(null);
      return;
    }
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setMockupImg(img);
    };
  }, [dynamicMockupUrl, currentMockupUrl]);

  const [bgImg] = useImage(localBgUrl || mockupBackgroundUrl || '');
  const [collarImg] = useImage(dynamicCollarUrl || activeCollar?.svgUrl || '');

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

           {/* Partes Mapeadas do SVG (Modelagem) */}
           <div className="border-b border-white/5 pb-4 space-y-3">
             <div>
               <h3 className="text-xs font-bold text-white uppercase tracking-wider">Partes do Vestuário</h3>
               <span className="text-[9px] text-zinc-500 font-mono">Personalização de Cores & Matrizes</span>
             </div>
 
             <div className="space-y-2 pr-1">
               {mockupParts && mockupParts.map((part) => {
                 const selector = part.selector;
                 const activeColor = partColors[selector] || '#ffffff';
                 const activeTexture = partTextures[selector];
 
                 return (
                   <div 
                     key={part.id} 
                     className="flex items-center justify-between p-2 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 transition gap-2"
                   >
                     <div className="flex flex-col min-w-0 flex-1">
                       <span className="text-[11px] font-bold text-zinc-200 truncate">{part.name}</span>
                       <span className="text-[8px] font-mono text-zinc-500 uppercase truncate">
                         {part.selector}
                       </span>
                     </div>
 
                     <div className="flex items-center gap-2 shrink-0">
                       {/* Selector de Cor */}
                       <div className="relative w-6 h-6 rounded-md overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center cursor-pointer" title="Selecionar Cor">
                         <input 
                           type="color"
                           value={activeColor}
                           onChange={(e) => {
                             setPartColors(prev => ({
                               ...prev,
                               [selector]: e.target.value
                             }));
                           }}
                           className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer p-0 border-none bg-transparent"
                         />
                         {/* Small preview block of selected color */}
                         <div className="absolute inset-0.5 rounded pointer-events-none" style={{ backgroundColor: activeColor }}></div>
                       </div>
 
                       {/* Botão de Textura (Upload) */}
                       <label className="w-6 h-6 flex items-center justify-center rounded-md border border-white/10 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer" title="Upload Fundo (PNG/PDF)">
                         <Upload size={12} className={activeTexture ? "text-green-400" : "text-primary"} />
                         <input 
                           type="file"
                           accept="image/png, application/pdf"
                           className="hidden"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
 
                             if (file.size > 5 * 1024 * 1024) {
                               alert("O arquivo deve ter no máximo 5MB.");
                               return;
                             }
 
                             const reader = new FileReader();
                             reader.onload = () => {
                               if (typeof reader.result === 'string') {
                                 setPartTextures(prev => ({
                                   ...prev,
                                   [selector]: reader.result as string
                                 }));
                               }
                             };
                             reader.readAsDataURL(file);
                           }}
                         />
                       </label>
 
                       {/* Limpar (Reset) */}
                       {(partColors[selector] || activeTexture) && (
                         <button
                           type="button"
                           title="Limpar personalização"
                           onClick={() => {
                             setPartColors(prev => {
                               const copy = { ...prev };
                               delete copy[selector];
                               return copy;
                             });
                             setPartTextures(prev => {
                               const copy = { ...prev };
                               delete copy[selector];
                               return copy;
                             });
                           }}
                           className="w-6 h-6 flex items-center justify-center rounded-md border border-red-500/10 bg-red-500/5 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                         >
                           <X size={12} />
                         </button>
                       )}
                     </div>
                   </div>
                 );
               })}
 
               {!mockupParts || mockupParts.length === 0 ? (
                 <div className="text-center py-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                   <p className="text-[10px] text-zinc-500 italic">Nenhuma parte cadastrada.</p>
                 </div>
               ) : null}
             </div>
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

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent snap-x">
              {collarsList.map((collar) => {
                const isSelected = selectedCollarId === collar.id;
                return (
                  <button
                    key={collar.id}
                    onClick={() => setSelectedCollarId(collar.id)}
                    className={`w-20 shrink-0 p-2 rounded-xl border text-left transition duration-200 flex flex-col gap-1.5 relative group overflow-hidden cursor-pointer snap-start ${
                      isSelected 
                        ? 'bg-primary/10 border-primary text-white shadow-lg shadow-primary/5' 
                        : 'bg-[#121215]/40 border-white/5 hover:border-white/10 hover:bg-[#121215]/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="aspect-square w-full rounded-lg bg-zinc-950 flex items-center justify-center p-1 border border-white/5 relative group-hover:border-white/10 transition">
                      <img 
                        src={collar.svgUrl} 
                        alt={collar.name} 
                        className="max-w-full max-h-full object-contain filter invert opacity-80"
                      />
                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 bg-primary text-white text-[7px] font-bold px-1 py-0.2 rounded-full">
                          ON
                        </div>
                      )}
                    </div>
                    <div className="truncate text-[10px] font-bold self-center w-full text-center text-zinc-300">
                      {collar.name}
                    </div>
                  </button>
                );
              })}
              {collarsList.length === 0 && (
                <div className="w-full text-center py-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
                  <p className="text-[10px] text-zinc-500 italic">Nenhuma gola cadastrada.</p>
                </div>
              )}
            </div>

            {/* Selector de Cor da Gola */}
            {activeCollar && (
              <div className="flex items-center justify-between p-2 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 transition gap-2 mt-2">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-zinc-200 truncate">Cor da Gola</span>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase truncate">
                    {activeCollar.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Selector de Cor */}
                  <div className="relative w-6 h-6 rounded-md overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center cursor-pointer" title="Selecionar Cor da Gola">
                    <input 
                      type="color"
                      value={collarColor}
                      onChange={(e) => {
                        setCollarColor(e.target.value);
                      }}
                      className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer p-0 border-none bg-transparent"
                    />
                    <div className="absolute inset-0.5 rounded pointer-events-none" style={{ backgroundColor: collarColor }}></div>
                  </div>

                  {/* Limpar (Reset) */}
                  {collarColor !== '#ffffff' && (
                    <button
                      type="button"
                      title="Limpar cor gola"
                      onClick={() => {
                        setCollarColor('#ffffff');
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-md border border-red-500/10 bg-red-500/5 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
