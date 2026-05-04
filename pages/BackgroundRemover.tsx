
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Scissors, Image as ImageIcon, Download, 
  Loader2, Sliders, Eraser, PenTool, Undo, Check, X, 
  Clipboard, ZoomIn, ZoomOut, Move, Pipette, Feather, RefreshCcw,
  FolderOpen, Tv, ShoppingBag, Sparkles, LayoutGrid, Layers, Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Estrutura de Ponto atualizada para suportar Bezier
type Point = { 
    x: number; 
    y: number; 
    // Control Points (Alças) para curvas
    cpNext?: { x: number, y: number }; 
    cpPrev?: { x: number, y: number };
};

export default function BackgroundRemover() {
  // --- SEO ---
  useEffect(() => {
    document.title = "Remove Background from Image Online Grátis | CrazyArt";
    const metaDescription = document.querySelector('meta[name="description"]');
    const content = "Remove image backgrounds instantly online. Upload your image and download a transparent PNG in seconds.";
    if (metaDescription) {
      metaDescription.setAttribute("content", content);
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = content;
      document.head.appendChild(meta);
    }
  }, []);

  // --- Estados Principais ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [maskData, setMaskData] = useState<Uint8ClampedArray | null>(null);

  // --- Estados Magic Wand (Cor) ---
  const [tolerance, setTolerance] = useState(21); 
  const [edgeSmoothing, setEdgeSmoothing] = useState(4); 
  const [removeMode, setRemoveMode] = useState<'corner' | 'white' | 'green' | 'custom'>('corner');
  const [useFloodFill, setUseFloodFill] = useState(true);
  const [customColor, setCustomColor] = useState<{r: number, g: number, b: number} | null>(null);
  const [isPickingColor, setIsPickingColor] = useState(false);

  // --- Estados Editor Manual (Bezier) ---
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [manualPoints, setManualPoints] = useState<Point[]>([]);
  const [editorZoom, setEditorZoom] = useState(1);
  const [editorPan, setEditorPan] = useState({ x: 0, y: 0 });
  
  // --- Estados Remoção Avançada 2.0 ---
  const [isAdvancedMode, setIsAdvancedMode] = useState(true);
  const [advancedMask, setAdvancedMask] = useState<Uint8Array | null>(null);
  const [hoverMask, setHoverMask] = useState<Uint8Array | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [advancedHistory, setAdvancedHistory] = useState<Uint8Array[]>([]);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  
  // --- Estados Margens (Crop) ---
  const [margins, setMargins] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  
  // Novo Estado: Modo de Edição Manual (Manter ou Apagar)
  const [manualMode, setManualMode] = useState<'keep' | 'erase'>('keep');
  
  // Estados de Interação do Mouse
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [isCreatingPoint, setIsCreatingPoint] = useState(false); // Se está segurando o clique para fazer curva
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Imagem sendo editada no modo manual
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);

  // Refs
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorImageRef = useRef<HTMLImageElement>(null);
  const displayImageRef = useRef<HTMLImageElement>(null); 
  const maskCanvasRef = useRef<HTMLCanvasElement>(null); // Re-added because it was used in processMagic too
  // --- Estados Edição Final ---
  const [editMode, setEditMode] = useState<'none' | 'background' | 'text' | 'emoji'>('none');
  const [bgType, setBgType] = useState<'color' | 'image'>('image');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [addedTexts, setAddedTexts] = useState<{id: string, text: string, x: number, y: number, size: number, color: string}[]>([]);
  const [addedEmojis, setAddedEmojis] = useState<{id: string, emoji: string, x: number, y: number, size: number}[]>([]);
  const [selectedElement, setSelectedElement] = useState<{type: 'text' | 'emoji', id: string} | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hoverCanvasRef = useRef<HTMLCanvasElement>(null);

  // --- 4.5 Lógica Remoção Avançada 2.0 ---
  // Inicialização automática ao carregar imagem
  useEffect(() => {
    if (isAdvancedMode && selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setOriginalImageData(data);
          const initialMask = new Uint8Array(canvas.width * canvas.height).fill(255);
          setAdvancedMask(initialMask);
          setAdvancedHistory([]);
          setProcessedImage(selectedImage);
        }
      };
    }
  }, [selectedImage, isAdvancedMode]);

  const undoAdvanced = useCallback(() => {
    if (advancedHistory.length === 0) return;
    
    const prevMask = advancedHistory[advancedHistory.length - 1];
    setAdvancedHistory(prev => prev.slice(0, -1));
    setAdvancedMask(prevMask);
    
    if (originalImageData) {
      const { width, height, data } = originalImageData;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const idata = ctx.createImageData(width, height);
        for (let i = 0; i < width * height; i++) {
          const pIdx = i * 4;
          idata.data[pIdx] = data[pIdx];
          idata.data[pIdx + 1] = data[pIdx + 1];
          idata.data[pIdx + 2] = data[pIdx + 2];
          idata.data[pIdx + 3] = prevMask[i];
        }
        ctx.putImageData(idata, 0, 0);
        setProcessedImage(canvas.toDataURL('image/png'));
      }
    }
  }, [advancedHistory, originalImageData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            undoAdvanced();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoAdvanced]);

  const applyMargins = useCallback(() => {
    if (!processedImage) return;
    
    const img = new Image();
    img.src = processedImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const newWidth = Math.max(1, img.width - margins.left - margins.right);
      const newHeight = Math.max(1, img.height - margins.top - margins.bottom);
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      ctx.drawImage(img, margins.left, margins.top, newWidth, newHeight, 0, 0, newWidth, newHeight);
      setProcessedImage(canvas.toDataURL('image/png'));
      // Reset margins after apply to avoid double cropping
      setMargins({ top: 0, bottom: 0, left: 0, right: 0 });
    };
  }, [processedImage, margins]);

  const handleAdvancedModeInteraction = (e: React.MouseEvent, type: 'move' | 'click' | 'leave') => {
    if (!isAdvancedMode || !originalImageData || !advancedMask) {
      if (type === 'leave') setHoverMask(null);
      return;
    }

    if (type === 'leave') {
      setHoverMask(null);
      return;
    }

    const imgEl = e.currentTarget as HTMLImageElement;
    const rect = imgEl.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = originalImageData.width / rect.width;
    const scaleY = originalImageData.height / rect.height;

    const realX = Math.floor(x * scaleX);
    const realY = Math.floor(y * scaleY);

    if (realX < 0 || realX >= originalImageData.width || realY < 0 || realY >= originalImageData.height) return;

    const width = originalImageData.width;
    const height = originalImageData.height;
    const data = originalImageData.data;

    if (advancedMask[realY * width + realX] === 0) {
      setHoverMask(null);
      return;
    }

    // Identificar região (Flood Fill)
    const currentMask = new Uint8Array(width * height);
    const visited = new Uint8Array(width * height);
    const stack: [number, number][] = [[realX, realY]];
    
    const startIdx = (realY * width + realX) * 4;
    const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2];
    
    const tol = tolerance;

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const idx = cy * width + cx;
      if (visited[idx] || advancedMask[idx] === 0) continue;
      visited[idx] = 1;
      
      const pIdx = idx * 4;
      const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];
      
      const dist = Math.sqrt(
        Math.pow(r - sr, 2) * 0.299 + 
        Math.pow(g - sg, 2) * 0.587 + 
        Math.pow(b - sb, 2) * 0.114
      );
      
      if (dist < tol) {
        currentMask[idx] = 255;
        if (cx > 0) stack.push([cx - 1, cy]);
        if (cx < width - 1) stack.push([cx + 1, cy]);
        if (cy > 0) stack.push([cx, cy - 1]);
        if (cy < height - 1) stack.push([cx, cy + 1]);
      }
    }

    if (type === 'move') {
      setHoverMask(currentMask);
    } else if (type === 'click') {
      // Salvar estado atual no histórico antes de mudar (limite de 20 passos)
      setAdvancedHistory(prev => {
        const next = [...prev, new Uint8Array(advancedMask!)];
        if (next.length > 20) return next.slice(1);
        return next;
      });
      
      const newAdvancedMask = new Uint8Array(advancedMask);
      for (let i = 0; i < width * height; i++) {
        if (currentMask[i] === 255) newAdvancedMask[i] = 0;
      }
      setAdvancedMask(newAdvancedMask);
      setHoverMask(null);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const idata = ctx.createImageData(width, height);
        for (let i = 0; i < width * height; i++) {
          const pIdx = i * 4;
          idata.data[pIdx] = data[pIdx];
          idata.data[pIdx + 1] = data[pIdx + 1];
          idata.data[pIdx + 2] = data[pIdx + 2];
          idata.data[pIdx + 3] = newAdvancedMask[i];
        }
        ctx.putImageData(idata, 0, 0);
        setProcessedImage(canvas.toDataURL('image/png'));
      }
    }
  };

  // Efeito para desenhar o destaque (hover)
  useEffect(() => {
    if (isAdvancedMode && hoverMask && hoverCanvasRef.current && originalImageData) {
      const canvas = hoverCanvasRef.current;
      const { width, height } = originalImageData;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        const idata = ctx.createImageData(width, height);
        for (let i = 0; i < width * height; i++) {
          if (hoverMask[i] === 255) {
            idata.data[i * 4] = 255;   // Red
            idata.data[i * 4 + 1] = 0; // Green
            idata.data[i * 4 + 2] = 0; // Blue
            idata.data[i * 4 + 3] = 150; // Alpha
          }
        }
        ctx.putImageData(idata, 0, 0);
      }
    }
  }, [hoverMask, isAdvancedMode, originalImageData]);

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
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const scaleX = imgEl.naturalWidth / rect.width;
      const scaleY = imgEl.naturalHeight / rect.height;

      const realX = Math.floor(x * scaleX);
      const realY = Math.floor(y * scaleY);

      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(imgEl, realX, realY, 1, 1, 0, 0, 1, 1);
      const p = ctx.getImageData(0, 0, 1, 1).data;
      
      setCustomColor({ r: p[0], g: p[1], b: p[2] });
      setRemoveMode('custom');
      setIsPickingColor(false); 
  };

  // --- 3. Processamento Automático (Advanced Algorithm) ---
  const processMagic = () => {
    if (!selectedImage) return;
    setIsProcessing(true);

    setTimeout(() => {
        const img = new Image();
        img.src = selectedImage;
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, width, height);
            const pixels = imageData.data;

            // 1. Amostragem robusta do fundo
            let targetR = 0, targetG = 0, targetB = 0;
            if (removeMode === 'corner') {
                const samples = [];
                // Amostra bordas para definir o "fundo"
                const stepX = Math.max(1, Math.floor(width / 20));
                const stepY = Math.max(1, Math.floor(height / 20));
                for (let x = 0; x < width; x += stepX) {
                    samples.push([x, 0], [x, height - 1]);
                }
                for (let y = 0; y < height; y += stepY) {
                    samples.push([0, y], [width - 1, y]);
                }
                
                samples.forEach(([x, y]) => {
                    const idx = (y * width + x) * 4;
                    targetR += pixels[idx];
                    targetG += pixels[idx + 1];
                    targetB += pixels[idx + 2];
                });
                targetR /= samples.length; 
                targetG /= samples.length; 
                targetB /= samples.length;
            } else if (removeMode === 'white') {
                targetR = 255; targetG = 255; targetB = 255;
            } else if (removeMode === 'green') {
                targetR = 0; targetG = 255; targetB = 0;
            } else if (removeMode === 'custom' && customColor) {
                targetR = customColor.r; targetG = customColor.g; targetB = customColor.b;
            }

            // 2. Cálculo de Distâncias e Tolerância
            const getDistLocal = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
                const dr = r1 - r2;
                const dg = g1 - g2;
                const db = b1 - b2;
                // Distância Euclidiana Ponderada (Perceptual)
                return Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);
            };

            const threshold = (tolerance / 100) * 200; 
            const edgeTolerance = 35; // Relaxado para permitir propagação em fundos com leve ruído
            const feather = 20; 

            const mask = new Uint8Array(width * height);
            const visited = new Uint8Array(width * height);
            
            // Inicializa tudo como Objeto (255)
            mask.fill(255);

            if (useFloodFill) {
                const stack: [number, number, number, number, number][] = []; // x, y, lastR, lastG, lastB
                
                // Sementes iniciais: bordas
                for (let x = 0; x < width; x++) { 
                    stack.push([x, 0, targetR, targetG, targetB]); 
                    stack.push([x, height - 1, targetR, targetG, targetB]); 
                }
                for (let y = 0; y < height; y++) { 
                    stack.push([0, y, targetR, targetG, targetB]); 
                    stack.push([width - 1, y, targetR, targetG, targetB]); 
                }

                while (stack.length > 0) {
                    const [x, y, lr, lg, lb] = stack.pop()!;
                    const idx = y * width + x;
                    
                    if (visited[idx]) continue;
                    visited[idx] = 1;

                    const pIdx = idx * 4;
                    const r = pixels[pIdx];
                    const g = pixels[pIdx + 1];
                    const b = pixels[pIdx + 2];

                    // 1. Distância para o fundo global (Target)
                    const globalDist = getDistLocal(r, g, b, targetR, targetG, targetB);
                    
                    // 2. Distância para o pixel vizinho (Local Gradient)
                    const localDist = getDistLocal(r, g, b, lr, lg, lb);

                    // Condição relaxada: Prioriza o globalDist para garantir que o fundo seja removido
                    if (globalDist < threshold + feather) {
                        // Calcula Alpha
                        if (globalDist < threshold) {
                            mask[idx] = 0; // Fundo total
                        } else {
                            const ratio = (globalDist - threshold) / feather;
                            mask[idx] = Math.max(0, Math.min(255, ratio * 255));
                        }

                        // Expansão: Só bloqueia propagação se houver um salto local muito forte (borda do objeto)
                        // ou se o global dist já estiver no limite do feather
                        if (localDist < edgeTolerance || globalDist < threshold) {
                            const neighbors = [[x-1, y], [x+1, y], [x, y-1], [x, y+1]];
                            for (const [nx, ny] of neighbors) {
                                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                    stack.push([nx, ny, r, g, b]);
                                }
                            }
                        }
                    } else {
                        mask[idx] = 255; // Mantém como objeto
                    }
                }
            } else {
                // Modo Global (sem flood fill)
                for (let i = 0; i < mask.length; i++) {
                    const pIdx = i * 4;
                    const d = getDistLocal(pixels[pIdx], pixels[pIdx + 1], pixels[pIdx + 2], targetR, targetG, targetB);
                    if (d < threshold) mask[i] = 0;
                    else if (d < threshold + feather) mask[i] = ((d - threshold) / feather) * 255;
                    else mask[i] = 255;
                }
            }

            // 3. Renderização Final com Feathering de Borda
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = width;
            maskCanvas.height = height;
            const mCtx = maskCanvas.getContext('2d');
            if (!mCtx) return;

            const maskImageData = mCtx.createImageData(width, height);
            for (let i = 0; i < mask.length; i++) {
                maskImageData.data[i * 4] = 255;
                maskImageData.data[i * 4 + 1] = 255;
                maskImageData.data[i * 4 + 2] = 255;
                maskImageData.data[i * 4 + 3] = mask[i];
            }
            mCtx.putImageData(maskImageData, 0, 0);

            ctx.clearRect(0, 0, width, height);
            ctx.save();
            
            // Aplica filtro de suavização opcional se o usuário desejar refine extra
            if (edgeSmoothing > 0) {
                ctx.filter = `blur(${edgeSmoothing * 0.5}px)`; 
            }
            
            ctx.drawImage(maskCanvas, 0, 0);
            ctx.restore();

            ctx.globalCompositeOperation = 'source-in';
            ctx.drawImage(img, 0, 0);

            setProcessedImage(canvas.toDataURL('image/png'));
            setIsProcessing(false);
            
            // Salvar máscara para refinamentos posteriores
            const finalMaskCanvas = document.createElement('canvas');
            finalMaskCanvas.width = width;
            finalMaskCanvas.height = height;
            const fmCtx = finalMaskCanvas.getContext('2d');
            if (fmCtx) {
                fmCtx.drawImage(maskCanvas, 0, 0);
                maskCanvasRef.current = finalMaskCanvas;
            }
        };
    }, 100);
  };

  // --- 4. Lógica do Editor Manual (Fullscreen) ---
  
  const openManualEditor = (sourceImage: string) => {
      setEditorImageSrc(sourceImage);
      setManualPoints([]);
      setEditorZoom(1);
      setEditorPan({ x: 0, y: 0 });
      setManualMode('keep'); // Resetar para modo "Manter" ao abrir
      setIsEditorOpen(true);
  };

  // Helper para converter coordenadas da tela para a imagem
  const getRelCoords = (clientX: number, clientY: number) => {
      if (!editorImageRef.current) return { x: 0, y: 0 };
      const rect = editorImageRef.current.getBoundingClientRect();
      const relX = (clientX - rect.left) / rect.width * editorImageRef.current.naturalWidth;
      const relY = (clientY - rect.top) / rect.height * editorImageRef.current.naturalHeight;
      return { x: relX, y: relY };
  };

  const handleEditorMouseDown = (e: React.MouseEvent) => {
      // 1. Pan (Shift ou Botão do Meio)
      if (e.button === 1 || e.shiftKey) { 
          e.preventDefault();
          setIsDraggingPan(true);
          setDragStart({ x: e.clientX - editorPan.x, y: e.clientY - editorPan.y });
          return;
      }

      // 2. Criar Ponto (Botão Esquerdo)
      if (e.button === 0 && editorImageRef.current) {
          const { x, y } = getRelCoords(e.clientX, e.clientY);
          
          // Adiciona novo ponto. Inicialmente sem curvas (cps iguais ao ponto)
          const newPoint: Point = { 
              x, y, 
              cpNext: { x, y }, 
              cpPrev: { x, y } 
          };
          
          setManualPoints(prev => [...prev, newPoint]);
          setIsCreatingPoint(true); // Começa a "escutar" se o usuário vai arrastar para fazer curva
      }
  };

  const handleEditorMouseMove = (e: React.MouseEvent) => {
      // 1. Lógica de Pan
      if (isDraggingPan) {
          setEditorPan({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y
          });
          return;
      }

      // 2. Lógica de Curva Bezier (Arrastar enquanto cria ponto)
      if (isCreatingPoint && manualPoints.length > 0) {
          const { x: mouseX, y: mouseY } = getRelCoords(e.clientX, e.clientY);
          
          setManualPoints(prev => {
              const updated = [...prev];
              const activeIndex = updated.length - 1;
              const anchor = updated[activeIndex];

              // A lógica da caneta padrão:
              // Você clicou no Anchor. Agora está arrastando para MousePos.
              // O Handle "Next" segue o mouse.
              // O Handle "Prev" é espelhado em relação ao Anchor.
              
              // Diferença entre mouse e ancora
              const dx = mouseX - anchor.x;
              const dy = mouseY - anchor.y;

              updated[activeIndex] = {
                  ...anchor,
                  cpNext: { x: anchor.x + dx, y: anchor.y + dy }, // Puxa a alça para onde o mouse vai
                  cpPrev: { x: anchor.x - dx, y: anchor.y - dy }  // Espelha para suavidade
              };
              return updated;
          });
      }
  };

  const handleEditorMouseUp = () => {
      setIsDraggingPan(false);
      setIsCreatingPoint(false);
  };

  // Zoom com Scroll
  const handleEditorWheel = (e: React.WheelEvent) => {
      // Impede o scroll da página, garantindo que a barra fique fixa
      e.stopPropagation(); 
      // Não podemos usar preventDefault em Evento React Sintético de forma passiva, 
      // mas como o container é fixed inset-0 overflow-hidden, o scroll não deve propagar.
      
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      setEditorZoom(prev => Math.max(0.1, Math.min(20, prev + delta)));
  };

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

          // Habilita suavização no canvas se necessário
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Helper para desenhar o caminho
          const drawPath = () => {
              ctx.beginPath();
              const start = manualPoints[0];
              ctx.moveTo(start.x, start.y);

              for (let i = 1; i < manualPoints.length; i++) {
                  const p = manualPoints[i];
                  const prev = manualPoints[i - 1];

                  if (prev.cpNext && p.cpPrev) {
                      ctx.bezierCurveTo(
                          prev.cpNext.x, prev.cpNext.y, 
                          p.cpPrev.x, p.cpPrev.y, 
                          p.x, p.y
                      );
                  } else {
                      ctx.lineTo(p.x, p.y);
                  }
              }

              const last = manualPoints[manualPoints.length - 1];
              const first = manualPoints[0];
              if (last.cpNext && first.cpPrev) {
                  ctx.bezierCurveTo(
                      last.cpNext.x, last.cpNext.y,
                      first.cpPrev.x, first.cpPrev.y,
                      first.x, first.y
                  );
              } else {
                  ctx.lineTo(first.x, first.y);
              }
              ctx.closePath();
          };

          if (manualMode === 'keep') {
              // --- MODO MANTER (Corte Padrão) ---
              // 1. Desenhar a Máscara (Suavizada)
              ctx.save();
              if (edgeSmoothing > 0) {
                  ctx.filter = `blur(${edgeSmoothing}px)`;
              }
              drawPath();
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
              ctx.restore();

              // 2. Composição: Manter apenas onde a forma existe (source-in)
              ctx.globalCompositeOperation = 'source-in';
              ctx.drawImage(img, 0, 0);

          } else {
              // --- MODO APAGAR (Borracha/Remover Área) ---
              // 1. Desenhar a Imagem Original Primeiro
              ctx.drawImage(img, 0, 0);

              // 2. "Apagar" a forma desenhada (destination-out)
              ctx.save();
              ctx.globalCompositeOperation = 'destination-out';
              if (edgeSmoothing > 0) {
                  ctx.filter = `blur(${edgeSmoothing}px)`;
              }
              drawPath();
              ctx.fillStyle = '#FFFFFF'; // A cor não importa para destination-out, apenas a opacidade (alpha)
              ctx.fill();
              ctx.restore();
          }

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

  // Render SVG Overlay para o Editor Manual
  const renderEditorOverlay = () => {
      if (!editorImageRef.current || manualPoints.length === 0) return null;
      
      const w = editorImageRef.current.naturalWidth;
      const h = editorImageRef.current.naturalHeight;

      // Construir o "d" do path SVG
      let d = `M ${manualPoints[0].x} ${manualPoints[0].y}`;
      for (let i = 1; i < manualPoints.length; i++) {
          const p = manualPoints[i];
          const prev = manualPoints[i - 1];
          // Lógica SVG Cubic Bezier: C x1 y1, x2 y2, x y
          if (prev.cpNext && p.cpPrev && (prev.cpNext.x !== prev.x || p.cpPrev.x !== p.x)) {
             d += ` C ${prev.cpNext.x} ${prev.cpNext.y}, ${p.cpPrev.x} ${p.cpPrev.y}, ${p.x} ${p.y}`;
          } else {
             d += ` L ${p.x} ${p.y}`;
          }
      }
      
      // Cor da linha baseada no modo
      const strokeColor = manualMode === 'keep' ? '#22c55e' : '#ef4444'; // Verde para manter, Vermelho para apagar

      return (
          <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
              {/* Caminho Principal */}
              <path 
                d={d} 
                fill={manualMode === 'keep' ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"} 
                stroke={strokeColor} 
                strokeWidth={2 / editorZoom} 
                vectorEffect="non-scaling-stroke" 
              />
              
              {/* Pontos e Alças */}
              {manualPoints.map((p, i) => (
                  <g key={i}>
                      {/* Linhas das Alças (Handles) */}
                      {(i === manualPoints.length - 1 && isCreatingPoint) && (
                          <>
                            {p.cpPrev && <line x1={p.x} y1={p.y} x2={p.cpPrev.x} y2={p.cpPrev.y} stroke="white" strokeWidth={1 / editorZoom} opacity="0.5" />}
                            {p.cpNext && <line x1={p.x} y1={p.y} x2={p.cpNext.x} y2={p.cpNext.y} stroke="white" strokeWidth={1 / editorZoom} opacity="0.5" />}
                            {p.cpNext && <circle cx={p.cpNext.x} cy={p.cpNext.y} r={2 / editorZoom} fill="white" />}
                            {p.cpPrev && <circle cx={p.cpPrev.x} cy={p.cpPrev.y} r={2 / editorZoom} fill="white" />}
                          </>
                      )}

                      {/* Ponto Âncora */}
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r={3 / editorZoom} 
                        fill={i === manualPoints.length - 1 ? "#fff" : strokeColor} 
                        stroke="white" 
                        strokeWidth={1 / editorZoom} 
                      />
                  </g>
              ))}
          </svg>
      );
  };

  return (
      <div className="min-h-[calc(100vh-140px)] bg-black text-white p-1 flex flex-col overflow-hidden">
      {/* Header - Mais impactante */}
      <div className="max-w-6xl mx-auto w-full mb-1 flex flex-col items-center text-center gap-1 shrink-0">
        <div className="flex items-center gap-4">
            <Link to="/tools" className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition border border-zinc-800">
                <ArrowLeft size={18} />
            </Link>
            <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Scissors size={22} />
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent font-heading">
                Remover Fundo de Imagem Grátis
            </h1>
        </div>
        <p className="text-zinc-400 text-sm md:text-lg font-medium max-w-2xl mx-auto">
            Remova o fundo de qualquer imagem instantaneamente e de graça.
        </p>
      </div>

      <div className="max-w-6xl mx-auto w-full flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {!selectedImage ? (
            <motion.div 
              key="upload-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar pb-1 items-center"
            >
              {/* Área de Upload Principal */}
              <div className="w-full max-w-4xl flex flex-col items-center gap-2 mt-0">
                
                {/* O "Botão" Principal de Drop */}
                <motion.div 
                  className="relative w-full group"
                  whileHover="hover"
                >
                  {/* Efeito de brilho no hover */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  
                  <div className="relative flex items-center justify-center min-h-[150px] w-full bg-zinc-900/30 rounded-[2.5rem] overflow-hidden">
                    {/* Borda Tracejada Gradiente (SVG) */}
                    <div className="absolute inset-0 pointer-events-none">
                      <svg className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                        </defs>
                        <rect 
                          x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" 
                          rx="40" 
                          fill="none" 
                          stroke="url(#borderGradient)" 
                          strokeWidth="3" 
                          strokeDasharray="12 8"
                          className="group-hover:stroke-[4px] transition-all duration-300"
                        />
                      </svg>
                    </div>

                    {/* Conteúdo Interno do Botão */}
                    <div className="flex items-center justify-between w-full px-12 md:px-20 py-1 gap-8">
                      
                      {/* JPG Card (Esquerda) */}
                      <motion.div 
                        variants={{
                          hover: { y: -15, rotate: -15, scale: 1.1, x: -5 }
                        }}
                        className="hidden md:flex w-24 h-32 bg-zinc-800/80 border border-zinc-700 rounded-xl flex-col items-center justify-center shadow-xl transform -rotate-6 shrink-0 transition-all duration-500"
                      >
                        <span className="text-[12px] font-black text-zinc-500 uppercase mb-2">.jpg</span>
                        <ImageIcon size={32} className="text-zinc-600" />
                      </motion.div>

                      {/* Texto Central */}
                      <div className="flex flex-col items-center text-center gap-2 flex-1">
                        <motion.div 
                          variants={{
                            hover: { scale: 1.1, rotate: 5, y: -5 }
                          }}
                          className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 mb-1"
                        >
                          <Upload size={24} />
                        </motion.div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                          Jogue sua imagem aqui
                        </h2>
                        <p className="text-zinc-500 text-xs font-medium">
                          ou clique para selecionar um arquivo
                        </p>
                      </div>

                      {/* PNG Card (Direita) */}
                      <motion.div 
                        variants={{
                          hover: { y: -15, rotate: 15, scale: 1.1, x: 5 }
                        }}
                        className="hidden md:flex w-24 h-32 bg-zinc-800/80 border border-zinc-700 rounded-xl flex-col items-center justify-center shadow-xl transform rotate-6 shrink-0 transition-all duration-500"
                      >
                        <span className="text-[12px] font-black text-zinc-500 uppercase mb-2">.png</span>
                        <ImageIcon size={32} className="text-zinc-600" />
                      </motion.div>
                    </div>

                    {/* Input Invisível cobrindo tudo */}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                  </div>
                </motion.div>

                {/* Opções Secundárias */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold bg-zinc-900/50 px-4 py-1.5 rounded-full border border-zinc-800/50">
                    <Clipboard size={12} className="text-zinc-600" />
                    <span>Ou aperte <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px] font-mono text-orange-500 border border-zinc-700">Ctrl + V</kbd> para colar</span>
                  </div>
                </div>
              </div>

              {/* Divisor Sutil */}
              <div className="w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-1 shrink-0" />

              {/* Seção Informativa Reduzida */}
              <div className="w-full max-w-4xl text-center px-4 shrink-0">
                <h3 className="text-base font-bold text-white mb-0.5 font-heading">Por que usar o removedor de fundo?</h3>
                <p className="text-zinc-400 text-[11px] leading-relaxed max-w-2xl mx-auto mb-2">
                  Nossa ferramenta utiliza processamento inteligente para identificar o objeto principal e remover o fundo com precisão cirúrgica, ideal para e-commerce, criadores de conteúdo e designers.
                </p>

                {/* Exemplos de Uso em Duas Linhas */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-3xl mx-auto">
                  {[
                    { label: "YouTube", icon: <Tv size={14} /> },
                    { label: "Produtos", icon: <ShoppingBag size={14} /> },
                    { label: "Logos", icon: <Sparkles size={14} /> },
                    { label: "Social", icon: <LayoutGrid size={14} /> },
                    { label: "Slides", icon: <Layers size={14} /> },
                    { label: "Branding", icon: <Palette size={14} /> }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-center gap-2 py-1.5 px-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl text-zinc-400 text-[11px] font-bold hover:bg-zinc-800/50 hover:text-white transition-colors">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="tool-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-4 h-full overflow-hidden"
            >
              {/* Top Section: Thumbnail and Settings Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 shrink-0">
                {/* Thumbnail Original */}
                <div className="border-2 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center relative overflow-hidden transition-all group border-zinc-700 bg-zinc-900">
                    <div 
                        className={`relative w-full h-full flex items-center justify-center p-3 ${isPickingColor ? 'cursor-crosshair' : ''}`}
                        onClick={handleMainImageClick}
                        title={isPickingColor ? "Clique na cor que deseja remover" : ""}
                    >
                        <img 
                            ref={displayImageRef}
                            src={selectedImage} 
                            alt="Original" 
                            className="max-w-full max-h-full object-contain select-none" 
                        />
                        {isPickingColor && (
                            <div className="absolute inset-0 bg-black/10 pointer-events-none flex items-center justify-center">
                                <div className="bg-black/80 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-xl animate-bounce">
                                    Clique para selecionar a cor
                                </div>
                            </div>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setProcessedImage(null); setCustomColor(null); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg hover:bg-red-500 transition z-20"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Configurações */}
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3 flex flex-col justify-center">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                            <Eraser size={12} className="text-primary" /> Configurações de Remoção
                        </h3>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                        <button onClick={() => {setRemoveMode('corner'); setIsPickingColor(false);}} className={`py-1.5 text-[9px] font-bold rounded-md transition ${removeMode === 'corner' ? 'bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>Auto</button>
                        <button onClick={() => {setRemoveMode('white'); setIsPickingColor(false);}} className={`py-1.5 text-[9px] font-bold rounded-md transition ${removeMode === 'white' ? 'bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>Branco</button>
                        <button onClick={() => {setRemoveMode('green'); setIsPickingColor(false);}} className={`py-1.5 text-[9px] font-bold rounded-md transition ${removeMode === 'green' ? 'bg-zinc-700 text-white' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>Verde</button>
                        <button 
                            onClick={() => setIsPickingColor(!isPickingColor)}
                            className={`py-1.5 flex items-center justify-center rounded-md transition relative overflow-hidden ${isPickingColor || removeMode === 'custom' ? 'bg-primary text-white' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}
                        >
                            <Pipette size={12} />
                            {customColor && (
                                <div className="absolute bottom-0 right-0 w-2 h-2" style={{ backgroundColor: `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})` }}></div>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Sensibilidade</label>
                                <span className="text-[10px] font-mono text-primary">{tolerance}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" max="100" step="1" 
                                value={tolerance} 
                                onChange={(e) => setTolerance(parseInt(e.target.value))}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Suavização</label>
                                <span className="text-[10px] font-mono text-primary">{edgeSmoothing}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" max="10" step="0.5"
                                value={edgeSmoothing} 
                                onChange={(e) => setEdgeSmoothing(parseFloat(e.target.value))}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <button 
                            onClick={processMagic}
                            disabled={isProcessing}
                            className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 text-[10px]"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={12} /> : <Eraser size={12} />}
                            Recorte Auto
                        </button>

                        <button 
                            onClick={() => openManualEditor(selectedImage!)}
                            className="bg-primary hover:bg-amber-600 text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-2 text-[10px]"
                        >
                            <PenTool size={12} />
                            Manual
                        </button>
                    </div>

                    <button 
                        onClick={() => {
                            setIsAdvancedMode(!isAdvancedMode);
                        }}
                        className={`w-full py-2 rounded-lg transition flex items-center justify-center gap-2 text-[10px] font-bold mt-1 border ${isAdvancedMode ? 'bg-primary text-white border-primary-foreground' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
                    >
                        <Layers size={14} />
                        Remoção Avançada 2.0
                    </button>

                    {isAdvancedMode && (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 mt-2">
                            <p className="text-[9px] text-primary font-bold leading-tight">
                                ✨ Passe o mouse para destacar áreas e clique para removê-las. Pressione Ctrl + Z para desfazer.
                            </p>
                        </div>
                    )}

                    {/* Barra de Corte de Margens */}
                    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 space-y-2 mt-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                                <Scissors size={10} /> Cortar Margens
                            </label>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                             <div className="flex flex-col gap-1">
                                <span className="text-[8px] text-zinc-500 text-center">Topo</span>
                                <input 
                                    type="number" value={margins.top} 
                                    onChange={(e) => setMargins({...margins, top: parseInt(e.target.value) || 0})}
                                    className="bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-[10px] text-center w-full focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                             </div>
                             <div className="flex flex-col gap-1">
                                <span className="text-[8px] text-zinc-500 text-center">Base</span>
                                <input 
                                    type="number" value={margins.bottom} 
                                    onChange={(e) => setMargins({...margins, bottom: parseInt(e.target.value) || 0})}
                                    className="bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-[10px] text-center w-full focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                             </div>
                             <div className="flex flex-col gap-1">
                                <span className="text-[8px] text-zinc-500 text-center">Esq.</span>
                                <input 
                                    type="number" value={margins.left} 
                                    onChange={(e) => setMargins({...margins, left: parseInt(e.target.value) || 0})}
                                    className="bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-[10px] text-center w-full focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                             </div>
                             <div className="flex flex-col gap-1">
                                <span className="text-[8px] text-zinc-500 text-center">Dir.</span>
                                <input 
                                    type="number" value={margins.right} 
                                    onChange={(e) => setMargins({...margins, right: parseInt(e.target.value) || 0})}
                                    className="bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-[10px] text-center w-full focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                             </div>
                        </div>
                        <button 
                            onClick={applyMargins}
                            className="w-full py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-[9px] font-bold text-white transition mt-1"
                        >
                            Aplicar Corte
                        </button>
                    </div>
                </div>
              </div>

              {/* Bottom Section: Visualization and Editing */}
              <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                  <div className="flex items-center justify-between px-2 shrink-0">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                          <ImageIcon size={14} /> Visualização do Recorte
                      </h3>
                      <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditMode(editMode === 'background' ? 'none' : 'background')}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-2 ${editMode === 'background' ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                          >
                            <Palette size={12} /> Fundo
                          </button>
                          <button 
                            onClick={() => setEditMode(editMode === 'text' ? 'none' : 'text')}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-2 ${editMode === 'text' ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                          >
                            <span className="font-serif">T</span> Texto
                          </button>
                          <button 
                            onClick={() => setEditMode(editMode === 'emoji' ? 'none' : 'emoji')}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-2 ${editMode === 'emoji' ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                          >
                            <span>😊</span> Emoji
                          </button>
                      </div>
                  </div>
                  
                  <div className="bg-black border border-zinc-800 rounded-2xl flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden group/result">
                      {/* Checkerboard (Only if no background is set) */}
                      {!bgImage && bgType !== 'color' && (
                        <div className="absolute inset-0 opacity-100 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #333333 25%, transparent 25%), linear-gradient(-45deg, #333333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333333 75%), linear-gradient(-45deg, transparent 75%, #333333 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}></div>
                      )}

                      {/* Custom Background */}
                      {bgType === 'color' && (
                        <div className="absolute inset-0" style={{ backgroundColor: bgColor }}></div>
                      )}
                      {bgType === 'image' && bgImage && (
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgImage})` }}></div>
                      )}

                      {processedImage ? (
                          <div 
                            className="relative z-10 w-full h-full flex flex-col p-4 animate-fade-in overflow-hidden"
                            onMouseMove={(e) => {
                                if (isDraggingElement && selectedElement) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left - dragOffset.x;
                                    const y = e.clientY - rect.top - dragOffset.y;
                                    
                                    if (selectedElement.type === 'text') {
                                        setAddedTexts(prev => prev.map(t => t.id === selectedElement.id ? { ...t, x, y } : t));
                                    } else {
                                        setAddedEmojis(prev => prev.map(em => em.id === selectedElement.id ? { ...em, x, y } : em));
                                    }
                                }
                            }}
                            onMouseUp={() => setIsDraggingElement(false)}
                          >
                               <div className="flex-1 relative w-full overflow-hidden min-h-0 flex items-center justify-center">
                                  <img 
                                    src={processedImage} 
                                    alt="Resultado" 
                                    className={`max-w-full max-h-full object-contain drop-shadow-2xl relative z-10 transition-opacity ${isAdvancedMode ? 'cursor-crosshair' : ''}`}
                                    onMouseMove={(e) => handleAdvancedModeInteraction(e, 'move')}
                                    onClick={(e) => handleAdvancedModeInteraction(e, 'click')}
                                    onMouseLeave={(e) => handleAdvancedModeInteraction(e, 'leave')}
                                  />
                                  
                                  {isAdvancedMode && hoverMask && (
                                    <canvas 
                                        ref={hoverCanvasRef}
                                        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 mix-blend-overlay"
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                  )}
                                  
                                  {/* Added Texts */}
                                  {addedTexts.map(t => (
                                    <div 
                                        key={t.id}
                                        style={{ left: t.x, top: t.y, fontSize: `${t.size}px`, color: t.color, position: 'absolute', cursor: 'move', zIndex: 20 }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setSelectedElement({ type: 'text', id: t.id });
                                            setIsDraggingElement(true);
                                            setDragOffset({ x: e.clientX - e.currentTarget.getBoundingClientRect().left, y: e.clientY - e.currentTarget.getBoundingClientRect().top });
                                        }}
                                        className={`select-none ${selectedElement?.id === t.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : ''}`}
                                    >
                                        {t.text}
                                    </div>
                                  ))}

                                  {/* Added Emojis */}
                                  {addedEmojis.map(em => (
                                    <div 
                                        key={em.id}
                                        style={{ left: em.x, top: em.y, fontSize: `${em.size}px`, position: 'absolute', cursor: 'move', zIndex: 20 }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setSelectedElement({ type: 'emoji', id: em.id });
                                            setIsDraggingElement(true);
                                            setDragOffset({ x: e.clientX - e.currentTarget.getBoundingClientRect().left, y: e.clientY - e.currentTarget.getBoundingClientRect().top });
                                        }}
                                        className={`select-none ${selectedElement?.id === em.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : ''}`}
                                    >
                                        {em.emoji}
                                    </div>
                                  ))}
                              </div>
                              
                              <div className="mt-4 flex flex-col sm:flex-row justify-center gap-2 shrink-0 z-30">
                                  <button 
                                      onClick={handleDownload}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-emerald-900/20 transition flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transform text-sm"
                                  >
                                      <Download size={18} /> <span className="whitespace-nowrap">Baixar PNG</span>
                                  </button>
                              </div>

                              {/* Edit Panels */}
                              <AnimatePresence>
                                {editMode === 'background' && (
                                    <motion.div 
                                        initial={{ y: 50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 50, opacity: 0 }}
                                        className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl z-40 flex flex-col gap-3 w-80"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Fundo</span>
                                            <button onClick={() => setEditMode('none')}><X size={14} /></button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setBgType('color')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${bgType === 'color' ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-400'}`}>Cor</button>
                                            <button onClick={() => setBgType('image')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${bgType === 'image' ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-400'}`}>Imagem</button>
                                        </div>
                                        {bgType === 'color' ? (
                                            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full h-10 bg-transparent cursor-pointer" />
                                        ) : (
                                            <input type="file" accept="image/*" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => setBgImage(ev.target?.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                            }} className="text-xs text-zinc-500" />
                                        )}
                                    </motion.div>
                                )}

                                {editMode === 'text' && (
                                    <motion.div 
                                        initial={{ y: 50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 50, opacity: 0 }}
                                        className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl z-40 flex flex-col gap-3 w-80"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Adicionar Texto</span>
                                            <button onClick={() => setEditMode('none')}><X size={14} /></button>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="Digite aqui..." 
                                            className="bg-black border border-zinc-800 rounded-lg p-2 text-sm text-white"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = (e.target as HTMLInputElement).value;
                                                    if (val) {
                                                        setAddedTexts(prev => [...prev, { id: Math.random().toString(), text: val, x: 50, y: 50, size: 32, color: '#ffffff' }]);
                                                        (e.target as HTMLInputElement).value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <p className="text-[9px] text-zinc-500">Pressione Enter para adicionar</p>
                                    </motion.div>
                                )}

                                {editMode === 'emoji' && (
                                    <motion.div 
                                        initial={{ y: 50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 50, opacity: 0 }}
                                        className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl z-40 flex flex-col gap-3 w-80"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Emoji</span>
                                            <button onClick={() => setEditMode('none')}><X size={14} /></button>
                                        </div>
                                        <div className="grid grid-cols-6 gap-2">
                                            {['😊', '🔥', '✨', '🚀', '❤️', '👍', '🎨', '📸', '🌟', '💎', '🌈', '⚡'].map(emoji => (
                                                <button 
                                                    key={emoji} 
                                                    onClick={() => setAddedEmojis(prev => [...prev, { id: Math.random().toString(), emoji, x: 50, y: 50, size: 48 }])}
                                                    className="text-2xl hover:scale-125 transition-transform"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                              </AnimatePresence>
                          </div>
                      ) : (
                          <div className="relative z-10 text-zinc-600 flex flex-col items-center p-6">
                              <div className="p-4 rounded-full bg-zinc-900 mb-3 border border-zinc-800">
                                  <ImageIcon size={32} className="opacity-50" />
                              </div>
                              <h3 className="text-lg font-bold text-zinc-500">Área de Resultado</h3>
                              <p className="text-zinc-600 text-xs max-w-xs mt-1 mb-4">
                                  O recorte aparecerá aqui após o processamento.
                              </p>
                          </div>
                      )}
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Seção Informativa Compacta removida pois foi restaurada acima */}

      {/* --- EDITOR MANUAL (MODAL FULLSCREEN) --- */}
      {isEditorOpen && editorImageSrc && (
          <div className="fixed inset-0 z-[100] bg-[#09090b] flex flex-col animate-fade-in overflow-hidden h-screen w-screen">
              {/* Toolbar Superior - FIXA NO TOPO */}
              <div className="flex-shrink-0 min-h-16 border-b border-zinc-800 bg-[#121215] flex flex-wrap items-center justify-between px-4 py-3 gap-4 z-50 shadow-xl relative w-full">
                  
                  {/* Left Controls */}
                  <div className="flex items-center gap-4 shrink-0 flex-wrap">
                      <div className="flex items-center gap-2 text-white font-bold shrink-0">
                          <PenTool className="text-primary" size={20} />
                          <span className="hidden sm:inline">Editor Manual</span>
                      </div>
                      
                      <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>
                      
                      {/* Modo Toggle */}
                      <div className="flex bg-black/50 p-1 rounded-lg">
                          <button 
                            onClick={() => setManualMode('keep')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${manualMode === 'keep' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                          >
                              <Scissors size={14} /> Manter
                          </button>
                          <button 
                            onClick={() => setManualMode('erase')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${manualMode === 'erase' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                          >
                              <Eraser size={14} /> Apagar
                          </button>
                      </div>

                      <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>

                      <div className="flex items-center gap-2 bg-black/50 p-1 rounded-lg shrink-0">
                          <button onClick={() => setEditorZoom(z => Math.max(0.1, z - 0.2))} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white" title="Zoom Out"><ZoomOut size={16} /></button>
                          <span className="text-xs font-mono w-10 text-center">{Math.round(editorZoom * 100)}%</span>
                          <button onClick={() => setEditorZoom(z => Math.min(20, z + 0.2))} className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white" title="Zoom In"><ZoomIn size={16} /></button>
                      </div>
                      
                      {/* Slider Suavização */}
                      <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-lg border border-zinc-800 shrink-0">
                          <Feather size={14} className="text-zinc-400" />
                          <input 
                                type="range" 
                                min="0" 
                                max="20" 
                                step="1"
                                value={edgeSmoothing} 
                                onChange={(e) => setEdgeSmoothing(parseInt(e.target.value))}
                                className="w-20 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                title={`Suavidade da borda: ${edgeSmoothing}px`}
                            />
                            <span className="text-[10px] font-mono text-primary w-5">{edgeSmoothing}</span>
                      </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap justify-end">
                      <button 
                          onClick={() => setManualPoints(pts => pts.slice(0, -1))} 
                          disabled={manualPoints.length === 0}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition disabled:opacity-50"
                          title="Desfazer Último Ponto"
                      >
                          <Undo size={18} />
                      </button>
                      <button 
                          onClick={() => setIsEditorOpen(false)}
                          className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg transition"
                          title="Cancelar"
                      >
                          <X size={20} />
                      </button>
                      
                      <div className="h-6 w-px bg-zinc-800 mx-1 hidden sm:block"></div>

                      <button 
                          onClick={() => applyManualCut(false)}
                          disabled={manualPoints.length < 3}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition disabled:opacity-50"
                      >
                          <Check size={16} /> <span className="hidden sm:inline">Aplicar</span>
                      </button>

                      <button 
                          onClick={() => applyManualCut(true)}
                          disabled={manualPoints.length < 3}
                          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <Download size={16} /> <span className="hidden sm:inline">Cortar & Baixar</span>
                          <span className="sm:hidden">Baixar</span>
                      </button>
                  </div>
              </div>

              {/* Área do Canvas */}
              <div 
                  className="flex-1 overflow-hidden relative bg-black cursor-crosshair w-full h-full"
                  onMouseDown={handleEditorMouseDown}
                  onMouseMove={handleEditorMouseMove}
                  onMouseUp={handleEditorMouseUp}
                  onMouseLeave={handleEditorMouseUp}
                  onWheel={handleEditorWheel}
              >
                  {/* Background Checkerboard Full */}
                  <div className="absolute inset-0 opacity-100 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #333333 25%, transparent 25%), linear-gradient(-45deg, #333333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333333 75%), linear-gradient(-45deg, transparent 75%, #333333 75%)', backgroundSize: '40px 40px' }}></div>

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
                              style={{ display: 'block' }}
                          />
                          {renderEditorOverlay()}
                      </div>
                  </div>

                  {/* Instruções Flutuantes */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur px-6 py-3 rounded-full border border-white/10 text-white text-sm shadow-xl flex items-center gap-4 pointer-events-none w-max max-w-[90vw]">
                      <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full animate-pulse ${manualMode === 'keep' ? 'bg-emerald-500' : 'bg-red-500'}`}></span> 
                          <span className="font-bold mr-1">{manualMode === 'keep' ? 'MANTER' : 'APAGAR'}</span>
                          <span className="hidden sm:inline">Clique para linha reta, Segure para curva</span><span className="sm:hidden">Desenhe</span>
                      </span>
                      <span className="w-px h-4 bg-white/20"></span>
                      <span>Pontos: <b>{manualPoints.length}</b></span>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
