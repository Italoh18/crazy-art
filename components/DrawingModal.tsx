
import React, { useRef, useState, useEffect } from 'react';
import { X, ChevronRight, Save, Square, Triangle, Circle, Undo, Eraser, PenTool, Spline, PaintBucket, Minus, Plus, Eye, EyeOff, Upload, Move, Maximize, Image as ImageIcon, Sliders, Ruler, FlipHorizontal, FlipVertical } from 'lucide-react';
import { Stroke, Point } from '../types';
import opentype from 'opentype.js';
import { convertOpenTypePathToStrokes } from '../utils/fontGenerator';

interface DrawingModalProps {
  char: string;
  initialStrokes: Stroke[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (strokes: Stroke[], previewUrl: string) => void;
  onNext: (strokes: Stroke[], previewUrl: string) => void;
  isLast: boolean;
}

type ToolType = 'pen' | 'bezier' | 'square' | 'triangle' | 'circle' | 'bucket' | 'move' | 'scale';

const CANVAS_SIZE = 500;
const BASELINE_Y = CANVAS_SIZE * 0.8; // 400px (80% da altura)

export const DrawingModal: React.FC<DrawingModalProps> = ({ 
  char, initialStrokes, isOpen, onClose, onSave, onNext, isLast 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const snapshotStrokesRef = useRef<Stroke[]>([]); 
  
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [strokeWidth, setStrokeWidth] = useState<number>(15);
  const [showGuide, setShowGuide] = useState<boolean>(true); 
  
  // Trace Image State (Imagem de Referência)
  const [traceImage, setTraceImage] = useState<HTMLImageElement | null>(null);
  const [traceOpacity, setTraceOpacity] = useState(0.3);
  
  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  
  const [bezierPhase, setBezierPhase] = useState<0 | 1 | 2>(0);
  const [bezierControlPoint, setBezierControlPoint] = useState<Point | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStrokes(initialStrokes || []);
      setBezierPhase(0);
      setStartPoint(null);
      setCurrentPoint(null);
      setActiveTool('pen');
      setStrokeWidth(15);
      setShowGuide(true);
      setTraceImage(null); // Reseta imagem ao abrir novo modal
      snapshotStrokesRef.current = [];
    }
  }, [isOpen, initialStrokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Limpar
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1.5 Desenhar Imagem de Referência (Trace)
    if (traceImage) {
        ctx.save();
        ctx.globalAlpha = traceOpacity;
        // Centralizar e ajustar imagem (contain)
        const scale = Math.min(canvas.width / traceImage.width, canvas.height / traceImage.height);
        const x = (canvas.width / 2) - (traceImage.width / 2) * scale;
        const y = (canvas.height / 2) - (traceImage.height / 2) * scale;
        ctx.drawImage(traceImage, x, y, traceImage.width * scale, traceImage.height * scale);
        ctx.restore();
    }

    // 2. Desenhar Guia (Letra Sombra)
    if (showGuide) {
        drawGuideChar(ctx, canvas.width, canvas.height);
    }

    // 3. Desenhar Grade
    drawGuidelines(ctx, canvas.width, canvas.height);

    // Para suportar "buracos" (destination-out) sem apagar a grade, precisamos desenhar os strokes
    // em um canvas temporário ou gerenciar as camadas.
    // Solução simplificada: Para visualização no editor, desenhamos tudo no mesmo canvas.
    // Se o usuário usar 'destination-out' (buraco), vai apagar a grade visualmente naquela área, o que é aceitável.
    
    // Configuração base
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'white';

    // 4. Desenhar Traços Salvos
    strokes.forEach(stroke => {
      // Se for buraco, usa modo borracha
      ctx.globalCompositeOperation = stroke.isHole ? 'destination-out' : 'source-over';
      drawStroke(ctx, stroke);
    });
    
    // Reseta modo
    ctx.globalCompositeOperation = 'source-over';

    // 5. Desenhar Preview da Ferramenta Atual
    if (activeTool !== 'pen' && activeTool !== 'bucket' && activeTool !== 'move' && activeTool !== 'scale' && startPoint && currentPoint) {
       drawPreviewShape(ctx);
    }
  }, [strokes, startPoint, currentPoint, activeTool, isDrawing, bezierPhase, bezierControlPoint, strokeWidth, showGuide, char, traceImage, traceOpacity]);

  // --- Import Logic (SVG, Image & TTF) ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();

    // 1. Fontes (TTF/OTF)
    if (fileType === 'ttf' || fileType === 'otf') {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                const font = opentype.parse(arrayBuffer);
                const glyph = font.charToGlyph(char);
                
                // Converter Glyph Path para Strokes (Agora usando a função utilitária com detecção de buracos)
                const path = glyph.getPath(0, 0, 350); 
                const newStrokes = convertOpenTypePathToStrokes(path, 500, 500); 
                
                setStrokes(prev => [...prev, ...newStrokes]);
                setActiveTool('pen');
            } catch (err) {
                console.error(err);
                alert("Erro ao ler arquivo de fonte. Verifique se é um TTF/OTF válido.");
            }
        };
        reader.readAsArrayBuffer(file);
    }
    // 2. Imagens (Trace)
    else if (file.type.includes('image') && !file.type.includes('svg')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => setTraceImage(img);
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    } 
    // 3. Vetores (SVG)
    else if (file.type.includes('svg')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            // Tenta parsear vetores
            const success = parseAndLoadSvg(text);
            
            // Se falhar ou não tiver paths, carrega como imagem de fundo
            if (!success) {
                const img = new Image();
                img.onload = () => setTraceImage(img);
                img.src = 'data:image/svg+xml;base64,' + btoa(text);
            }
        };
        reader.readAsText(file);
    }
    else {
        alert("Formato não suportado. Use TTF, OTF, SVG, PNG ou JPG.");
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseAndLoadSvg = (svgText: string): boolean => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(svgText, "image/svg+xml");
      const pathElements = xmlDoc.getElementsByTagName("path");
      
      if (pathElements.length === 0) return false;

      let newStrokes: Stroke[] = [];
      
      for (let i = 0; i < pathElements.length; i++) {
        const d = pathElements[i].getAttribute("d");
        if (d) {
          // Parse path data into multiple strokes (handles M commands correctly)
          const extractedStrokes = parseSvgPathToStrokes(d);
          newStrokes.push(...extractedStrokes);
        }
      }

      if (newStrokes.length > 0) {
        const centeredStrokes = normalizeStrokesToCanvas(newStrokes, CANVAS_SIZE, CANVAS_SIZE);
        setStrokes(prev => [...prev, ...centeredStrokes]);
        setActiveTool('pen'); 
        return true;
      }
      return false;
    } catch (err) {
      console.error("Erro ao processar SVG", err);
      return false;
    }
  };

  // Improved SVG Parser that supports relative coordinates and sub-paths
  const parseSvgPathToStrokes = (d: string): Stroke[] => {
    const commands = d.match(/([a-zA-Z])|([-+]?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?)/g);
    if (!commands) return [];

    const strokes: Stroke[] = [];
    let currentPoints: Point[] = [];
    let startX = 0, startY = 0; // For 'Z' (close path)
    let currentX = 0, currentY = 0;
    
    let i = 0;
    
    const pushPoint = (x: number, y: number) => {
        currentPoints.push({ x, y });
        currentX = x;
        currentY = y;
    };

    const flushStroke = (closed: boolean) => {
        if (currentPoints.length > 1) {
            strokes.push({
                points: [...currentPoints],
                type: 'shape',
                filled: true,
                isClosed: closed,
                width: strokeWidth
            });
        }
        currentPoints = [];
    };

    while (i < commands.length) {
      const cmd = commands[i];
      if (!isNaN(parseFloat(cmd))) { i++; continue; } // Skip loose numbers

      const nextNum = () => parseFloat(commands[++i]);

      switch (cmd) {
        case 'M': // Move Absolute
          flushStroke(false); // If we have pending points, save them as open path
          currentX = nextNum(); currentY = nextNum();
          startX = currentX; startY = currentY;
          pushPoint(currentX, currentY);
          break;
        case 'm': // Move Relative
          flushStroke(false);
          currentX += nextNum(); currentY += nextNum();
          startX = currentX; startY = currentY;
          pushPoint(currentX, currentY);
          break;
        
        case 'L': // Line Absolute
          pushPoint(nextNum(), nextNum());
          break;
        case 'l': // Line Relative
          pushPoint(currentX + nextNum(), currentY + nextNum());
          break;
        
        case 'H': // Horizontal Absolute
          pushPoint(nextNum(), currentY);
          break;
        case 'h': // Horizontal Relative
          pushPoint(currentX + nextNum(), currentY);
          break;
        
        case 'V': // Vertical Absolute
          pushPoint(currentX, nextNum());
          break;
        case 'v': // Vertical Relative
          pushPoint(currentX, currentY + nextNum());
          break;

        case 'Z': 
        case 'z': // Close Path
          pushPoint(startX, startY);
          flushStroke(true);
          break;

        case 'C': // Cubic Bezier Absolute
          {
            const cp1x = nextNum(), cp1y = nextNum();
            const cp2x = nextNum(), cp2y = nextNum();
            const x = nextNum(), y = nextNum();
            for (let t = 0.2; t <= 1; t += 0.2) {
                const xt = (1-t)**3 * currentX + 3*(1-t)**2*t*cp1x + 3*(1-t)*t**2*cp2x + t**3*x;
                const yt = (1-t)**3 * currentY + 3*(1-t)**2*t*cp1y + 3*(1-t)*t**2*cp2y + t**3*y;
                pushPoint(xt, yt);
            }
          }
          break;
        case 'c': // Cubic Bezier Relative
          {
            const cp1x = currentX + nextNum(), cp1y = currentY + nextNum();
            const cp2x = currentX + nextNum(), cp2y = currentY + nextNum();
            const x = currentX + nextNum(), y = currentY + nextNum();
            const startX_bez = currentX; // Need to store start because currentX updates in pushPoint
            const startY_bez = currentY;
            
            // Reset current to start for calculation
            // Actually pushPoint updates currentX/Y, so we can't use currentX in loop directly if it updates
            // But here we calculate points first
            const pointsToAdd = [];
            for (let t = 0.2; t <= 1; t += 0.2) {
                const xt = (1-t)**3 * startX_bez + 3*(1-t)**2*t*cp1x + 3*(1-t)*t**2*cp2x + t**3*x;
                const yt = (1-t)**3 * startY_bez + 3*(1-t)**2*t*cp1y + 3*(1-t)*t**2*cp2y + t**3*y;
                pointsToAdd.push({x: xt, y: yt});
            }
            pointsToAdd.forEach(p => pushPoint(p.x, p.y));
          }
          break;
          
        case 'Q': // Quadratic Absolute
           {
             const cp1x = nextNum(), cp1y = nextNum();
             const x = nextNum(), y = nextNum();
             for (let t = 0.2; t <= 1; t += 0.2) {
                 const xt = (1-t)**2 * currentX + 2*(1-t)*t*cp1x + t**2*x;
                 const yt = (1-t)**2 * currentY + 2*(1-t)*t*cp1y + t**2*y;
                 pushPoint(xt, yt);
             }
           }
           break;
        case 'q': // Quadratic Relative
           {
             const cp1x = currentX + nextNum(), cp1y = currentY + nextNum();
             const x = currentX + nextNum(), y = currentY + nextNum();
             const startX_bez = currentX;
             const startY_bez = currentY;
             const pointsToAdd = [];
             for (let t = 0.2; t <= 1; t += 0.2) {
                 const xt = (1-t)**2 * startX_bez + 2*(1-t)*t*cp1x + t**2*x;
                 const yt = (1-t)**2 * startY_bez + 2*(1-t)*t*cp1y + t**2*y;
                 pointsToAdd.push({x: xt, y: yt});
             }
             pointsToAdd.forEach(p => pushPoint(p.x, p.y));
           }
           break;
      }
      i++;
    }
    
    // Flush remaining points if not closed
    flushStroke(false);

    return strokes;
  };

  const normalizeStrokesToCanvas = (strokes: Stroke[], width: number, height: number): Stroke[] => {
     let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
     let hasPoints = false;
     strokes.forEach(s => s.points.forEach(p => {
       if (p.x < minX) minX = p.x;
       if (p.x > maxX) maxX = p.x;
       if (p.y < minY) minY = p.y;
       if (p.y > maxY) maxY = p.y;
       hasPoints = true;
     }));

     if (!hasPoints || minX === Infinity) return strokes;

     const shapeW = maxX - minX;
     const shapeH = maxY - minY;
     if (shapeW === 0 || shapeH === 0) return strokes;

     const padding = 50;
     const targetW = width - (padding * 2);
     const targetH = height - (padding * 2);
     
     const scale = Math.min(targetW / shapeW, targetH / shapeH);
     
     const offsetX = (width - shapeW * scale) / 2;
     const offsetY = (height - shapeH * scale) / 2;

     return strokes.map(s => ({
       ...s,
       points: s.points.map(p => ({
         x: (p.x - minX) * scale + offsetX,
         y: (p.y - minY) * scale + offsetY
       }))
     }));
  };

  // --- Handlers de Transformação (Flip) ---

  const handleFlipHorizontal = () => {
    const cx = CANVAS_SIZE / 2;
    setStrokes(prev => prev.map(s => ({
        ...s,
        points: s.points.map(p => ({ ...p, x: cx + (cx - p.x) }))
    })));
  };

  const handleFlipVertical = () => {
    const cy = CANVAS_SIZE / 2;
    setStrokes(prev => prev.map(s => ({
        ...s,
        points: s.points.map(p => ({ ...p, y: cy + (cy - p.y) }))
    })));
  };

  // --- Funções de Desenho ---

  const drawGuideChar = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.font = `bold ${h * 0.65}px sans-serif`; 
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(char, w / 2, BASELINE_Y);
    ctx.restore();
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;
    ctx.lineWidth = stroke.width || 15;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    if (stroke.type === 'bezier' && stroke.points.length === 3) {
      ctx.quadraticCurveTo(stroke.points[1].x, stroke.points[1].y, stroke.points[2].x, stroke.points[2].y);
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
    }
    
    if (stroke.isClosed) ctx.closePath();
    if (stroke.filled) ctx.fill(); else ctx.stroke();
  };

  const drawPreviewShape = (ctx: CanvasRenderingContext2D) => {
    if (!startPoint || !currentPoint) return;
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.beginPath();

    if (activeTool === 'square') {
      const w = currentPoint.x - startPoint.x;
      const h = currentPoint.y - startPoint.y;
      ctx.rect(startPoint.x, startPoint.y, w, h);
    } 
    else if (activeTool === 'circle') {
      const rx = Math.abs(currentPoint.x - startPoint.x) / 2;
      const ry = Math.abs(currentPoint.y - startPoint.y) / 2;
      const cx = Math.min(startPoint.x, currentPoint.x) + rx;
      const cy = Math.min(startPoint.y, currentPoint.y) + ry;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    }
    else if (activeTool === 'triangle') {
      const x1 = startPoint.x;
      const y1 = startPoint.y;
      const x2 = currentPoint.x;
      const y2 = currentPoint.y;
      const midX = (x1 + x2) / 2;
      ctx.moveTo(midX, Math.min(y1, y2));
      ctx.lineTo(Math.min(x1, x2), Math.max(y1, y2));
      ctx.lineTo(Math.max(x1, x2), Math.max(y1, y2));
      ctx.closePath();
    }
    else if (activeTool === 'bezier') {
      if (bezierPhase === 1) {
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
      } else if (bezierPhase === 2 && bezierControlPoint) {
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.quadraticCurveTo(bezierControlPoint.x, bezierControlPoint.y, currentPoint.x, currentPoint.y);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(bezierControlPoint.x, bezierControlPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();
        ctx.restore();
        ctx.stroke();
        return;
      }
    }
    ctx.stroke();
  };

  const drawGuidelines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Cores
    const gridColor = '#1e293b'; 
    const subLineColor = '#334155';
    const rulerColor = '#64748b';

    // Medidas em Pixels
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // 1. Grade de Fundo (50px) e Régua Y
    ctx.lineWidth = 1;
    ctx.strokeStyle = gridColor;
    ctx.beginPath();
    
    // Linhas Verticais e Régua X
    for (let x = 0; x <= w; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        
        // Números no topo
        if (x > 0 && x < w) {
            ctx.save();
            ctx.fillStyle = rulerColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(x.toString(), x, 5);
            ctx.restore();
        }
    }

    // Linhas Horizontais e Régua Y
    for (let y = 0; y <= h; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);

        // Números na esquerda
        if (y > 0 && y < h) {
            ctx.save();
            ctx.fillStyle = rulerColor;
            ctx.fillText(y.toString(), 25, y);
            ctx.restore();
        }
    }
    ctx.stroke();

    // 2. Linhas Principais (BASELINE)
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 2;

    // Baseline (Sólida e Vermelha para destaque)
    ctx.strokeStyle = '#ef4444'; // Red 500
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, BASELINE_Y);
    ctx.lineTo(w, BASELINE_Y);
    ctx.stroke();
    
    // Label Baseline
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'right';
    ctx.fillText("BASELINE", w - 5, BASELINE_Y - 8);

    // 3. Linhas Auxiliares (Tracejadas)
    const capHeightY = h * 0.2; 
    const xHeightY = h * 0.5;
    const centerX = w * 0.5;

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#3b82f6'; // Blue for helpers
    ctx.setLineDash([5, 5]);

    // Cap Height
    ctx.beginPath();
    ctx.moveTo(0, capHeightY);
    ctx.lineTo(w, capHeightY);
    ctx.stroke();

    // Center Vertical
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, h);
    ctx.stroke();

    // Reset
    ctx.setLineDash([]);
    ctx.shadowColor = "transparent";

    // Labels
    ctx.fillStyle = '#3b82f6';
    ctx.textAlign = 'left';
    ctx.fillText("Cap Height", 30, capHeightY - 5);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const isPointInStroke = (p: Point, stroke: Stroke): boolean => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    stroke.points.forEach(pt => {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    });
    
    const tolerance = 20;
    if (p.x < minX - tolerance || p.x > maxX + tolerance || p.y < minY - tolerance || p.y > maxY + tolerance) {
      return false;
    }

    for(const pt of stroke.points) {
      const dist = Math.sqrt(Math.pow(p.x - pt.x, 2) + Math.pow(p.y - pt.y, 2));
      if (dist < tolerance) return true;
    }
    return false;
  };

  // --- Handlers ---

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;

    if (activeTool === 'bucket') {
      const newStrokes = [...strokes];
      for (let i = newStrokes.length - 1; i >= 0; i--) {
        if (isPointInStroke(pos, newStrokes[i])) {
          // Toggle entre Preenchido -> Buraco -> Outline -> Preenchido
          const current = newStrokes[i];
          if (current.filled && !current.isHole) {
              // Vira buraco
              newStrokes[i] = { ...current, isHole: true };
          } else if (current.isHole) {
              // Vira outline (sem preenchimento)
              newStrokes[i] = { ...current, isHole: false, filled: false };
          } else {
              // Vira preenchido normal
              newStrokes[i] = { ...current, filled: true, isClosed: true };
          }
          setStrokes(newStrokes);
          return;
        }
      }
      return;
    }

    if (activeTool === 'move') {
      setIsDrawing(true);
      setCurrentPoint(pos); // Define ponto inicial do movimento
      return;
    }

    if (activeTool === 'scale') {
      setIsDrawing(true);
      setStartPoint(pos);
      snapshotStrokesRef.current = JSON.parse(JSON.stringify(strokes));
      return;
    }

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setStrokes(prev => [...prev, { points: [pos], type: 'freehand', width: strokeWidth }]);
    } 
    else if (activeTool === 'bezier') {
      if (bezierPhase === 0) {
        setStartPoint(pos);
        setCurrentPoint(pos);
        setBezierPhase(1);
        setIsDrawing(true);
      } else if (bezierPhase === 2) {
        if (startPoint && currentPoint && bezierControlPoint) {
            setStrokes(prev => [...prev, {
                points: [startPoint, bezierControlPoint, currentPoint],
                type: 'bezier',
                width: strokeWidth
            }]);
            setBezierPhase(0);
            setStartPoint(null);
            setCurrentPoint(null);
            setBezierControlPoint(null);
            setIsDrawing(false);
        }
      }
    }
    else {
      setStartPoint(pos);
      setCurrentPoint(pos);
      setIsDrawing(true);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;

    if (activeTool === 'move' && isDrawing && currentPoint) {
       const dx = pos.x - currentPoint.x;
       const dy = pos.y - currentPoint.y;
       
       setStrokes(prev => prev.map(stroke => ({
         ...stroke,
         points: stroke.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
       })));
       
       setCurrentPoint(pos);
       return;
    }

    if (activeTool === 'scale' && isDrawing && startPoint) {
       const sensitivity = 0.005;
       const dy = startPoint.y - pos.y; 
       const scale = Math.max(0.1, 1 + (dy * sensitivity));
       
       const cx = CANVAS_SIZE / 2;
       const cy = CANVAS_SIZE / 2;

       const newStrokes = snapshotStrokesRef.current.map(s => ({
         ...s,
         width: (s.width || 15) * scale,
         points: s.points.map(p => ({
             x: cx + (p.x - cx) * scale,
             y: cy + (p.y - cy) * scale
         }))
       }));
       
       setStrokes(newStrokes);
       return;
    }

    if (activeTool === 'pen' && isDrawing) {
      setStrokes(prev => {
        const lastStroke = prev[prev.length - 1];
        if (!lastStroke || lastStroke.type !== 'freehand') return prev;
        return [
          ...prev.slice(0, -1),
          { ...lastStroke, points: [...lastStroke.points, pos] }
        ];
      });
    } 
    else if (activeTool === 'bezier') {
      if (bezierPhase === 1) setCurrentPoint(pos);
      else if (bezierPhase === 2) setBezierControlPoint(pos);
    }
    else if (isDrawing) {
      setCurrentPoint(pos);
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    if (activeTool === 'bucket') return;

    if (activeTool === 'move') {
      setIsDrawing(false);
      setCurrentPoint(null);
      return;
    }

    if (activeTool === 'scale') {
      setIsDrawing(false);
      setStartPoint(null);
      snapshotStrokesRef.current = []; // Limpa snapshot
      return;
    }

    if (activeTool === 'pen') {
      setIsDrawing(false);
    }
    else if (activeTool === 'bezier') {
        if (bezierPhase === 1) {
            setBezierPhase(2);
            if (startPoint && currentPoint) {
                setBezierControlPoint({
                    x: (startPoint.x + currentPoint.x) / 2,
                    y: (startPoint.y + currentPoint.y) / 2
                });
            }
        }
    }
    else if (isDrawing && startPoint && currentPoint) {
      setIsDrawing(false);
      const newStroke = createShapeStroke(activeTool, startPoint, currentPoint);
      if (newStroke) {
        setStrokes(prev => [...prev, newStroke]);
      }
      setStartPoint(null);
      setCurrentPoint(null);
    }
  };

  const createShapeStroke = (tool: ToolType, p1: Point, p2: Point): Stroke | null => {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const w = maxX - minX;
    const h = maxY - minY;

    if (w < 5 && h < 5) return null;

    let points: Point[] = [];

    if (tool === 'square') {
      points = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: minX, y: minY }
      ];
    } else if (tool === 'triangle') {
      points = [
        { x: minX + w / 2, y: minY },
        { x: minX, y: maxY },
        { x: maxX, y: maxY },
        { x: minX + w / 2, y: minY }
      ];
    } else if (tool === 'circle') {
      const cx = minX + w / 2;
      const cy = minY + h / 2;
      const rx = w / 2;
      const ry = h / 2;
      const segments = 32;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        points.push({ x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) });
      }
    }

    return { points, type: 'shape', isClosed: true, filled: false, width: strokeWidth };
  };

  // --- Utils ---

  const handleUndo = () => {
    if (bezierPhase !== 0) {
        setBezierPhase(0);
        setStartPoint(null);
        setCurrentPoint(null);
        setIsDrawing(false);
    } else {
        setStrokes(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setTraceImage(null); 
    setBezierPhase(0);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  const handleSaveInternal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Para preview, desenha os buracos como transparência
    strokes.forEach(stroke => {
        ctx.globalCompositeOperation = stroke.isHole ? 'destination-out' : 'source-over';
        // Configurações visuais do stroke
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        drawStroke(ctx, stroke);
    });
    ctx.globalCompositeOperation = 'source-over';
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 100;
    tempCanvas.height = 100;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0, 100, 100);
    }
    const preview = tempCanvas.toDataURL('image/png');
    onSave(strokes, preview);
    
    if (showGuide) drawGuideChar(ctx, canvas.width, canvas.height);
    drawGuidelines(ctx, canvas.width, canvas.height);
  };

  const handleNextInternal = () => {
    // Mesma lógica de salvar
    handleSaveInternal();
    onNext(strokes, ""); // O preview já foi salvo em handleSaveInternal se necessário, mas aqui só passamos o trigger
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col h-[90vh] md:h-auto">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
               {char}
             </div>
             <div>
               <h3 className="text-white font-bold">Desenhando caractere</h3>
               <p className="text-xs text-slate-400">
                   {activeTool === 'bucket' ? 'Toque na forma: Preenchido > Buraco > Linha' :
                    activeTool === 'move' ? 'Arraste para mover o desenho' :
                    activeTool === 'scale' ? 'Arraste (Cima/Baixo) para redimensionar' :
                    activeTool === 'bezier' ? '1. Arraste a linha | 2. Arraste a curva' : 
                    activeTool === 'pen' ? 'Desenho livre' : 'Use a régua para alinhar na Baseline'}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center touch-none">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className={`bg-slate-950 touch-none border border-slate-800 shadow-inner w-full h-auto max-w-[500px] max-h-[500px]
                ${activeTool === 'bucket' ? 'cursor-alias' : 
                  activeTool === 'move' ? 'cursor-move' : 
                  activeTool === 'scale' ? 'cursor-ns-resize' : 'cursor-crosshair'}
            `}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>

        <div className="p-4 bg-slate-800 border-t border-slate-700 space-y-4">
            
          {/* Toolbar Top Row: Tools */}
          <div className="flex justify-between items-center overflow-x-auto pb-2 gap-2">
             <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTool('pen')} 
                    className={`p-2 rounded transition-colors ${activeTool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Lápis Livre"
                >
                  <PenTool className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool('bezier')} 
                    className={`p-2 rounded transition-colors ${activeTool === 'bezier' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Curva Bézier"
                >
                  <Spline className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool('bucket')} 
                    className={`p-2 rounded transition-colors ${activeTool === 'bucket' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Modificador (Preencher/Buraco/Linha)"
                >
                  <PaintBucket className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool('move')} 
                    className={`p-2 rounded transition-colors ${activeTool === 'move' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Mover Desenho"
                >
                  <Move className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool('scale')} 
                    className={`p-2 rounded transition-colors ${activeTool === 'scale' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Redimensionar Desenho"
                >
                  <Maximize className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleFlipHorizontal}
                    className="p-2 rounded transition-colors text-slate-400 hover:text-white hover:bg-slate-700" 
                    title="Espelhar Horizontalmente"
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>
                <button 
                    onClick={handleFlipVertical}
                    className="p-2 rounded transition-colors text-slate-400 hover:text-white hover:bg-slate-700" 
                    title="Espelhar Verticalmente"
                >
                  <FlipVertical className="w-5 h-5" />
                </button>
             </div>

             <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTool('square')} 
                    className={`p-2 rounded transition-colors ${activeTool === 'square' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Retângulo"
                >
                  <Square className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool('triangle')} 
                    className={`p-2 rounded transition-colors ${activeTool === 'triangle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Triângulo"
                >
                  <Triangle className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setActiveTool('circle')} 
                    className={`p-2 rounded transition-colors ${activeTool === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Círculo"
                >
                  <Circle className="w-5 h-5" />
                </button>
             </div>
             
             <div className="flex gap-1 items-center bg-slate-900 p-1 rounded-lg">
                 <button 
                    onClick={() => setShowGuide(!showGuide)} 
                    className={`p-2 rounded transition-colors ${showGuide ? 'text-blue-400 bg-slate-800' : 'text-slate-500 hover:text-white'}`} 
                    title="Guia de Caractere (Sombra)"
                 >
                   {showGuide ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                 </button>
                 
                 {/* Botão de Importar SVG/Imagem/TTF */}
                 <div className="relative group">
                   <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded transition-colors text-purple-400 hover:text-white hover:bg-slate-700" 
                      title="Importar (TTF, SVG, PNG, JPG)"
                   >
                     {traceImage ? <ImageIcon className="w-5 h-5 text-green-400" /> : <Upload className="w-5 h-5" />}
                   </button>
                   <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black/90 text-[10px] text-white rounded hidden group-hover:block z-50">
                      Importar Fonte (TTF) ou Imagem
                   </span>
                   <input 
                      type="file" 
                      accept=".svg,.png,.jpg,.jpeg,.webp,.ttf,.otf" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload}
                   />
                 </div>
             </div>

             <div className="flex gap-1 items-center ml-2">
                <button onClick={handleUndo} className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-slate-300" title="Desfazer">
                  <Undo className="w-5 h-5" />
                </button>
                <button onClick={handleClear} className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-red-400" title="Limpar Tudo">
                  <Eraser className="w-5 h-5" />
                </button>
             </div>
          </div>

          {/* Toolbar Bottom Row: Stroke Size & Actions */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
             
             {/* Slider de Espessura */}
             <div className="flex items-center gap-3 w-full md:w-auto bg-slate-900 px-4 py-2 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Traço</span>
                <input 
                  type="range" 
                  min="2" 
                  max="60" 
                  value={strokeWidth} 
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full md:w-24 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="w-3 h-3 rounded-full bg-white transition-all" style={{ transform: `scale(${strokeWidth / 20})` }} />
             </div>

             {/* Slider de Opacidade do Trace (Se imagem carregada) */}
             {traceImage && (
                 <div className="flex items-center gap-3 w-full md:w-auto bg-slate-900 px-4 py-2 rounded-xl border border-slate-700 border-purple-500/30">
                    <Sliders className="w-3 h-3 text-purple-400" />
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1"
                      value={traceOpacity} 
                      onChange={(e) => setTraceOpacity(Number(e.target.value))}
                      className="w-full md:w-20 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      title="Opacidade da Imagem de Fundo"
                    />
                 </div>
             )}

             <div className="flex gap-2 w-full md:w-auto flex-1 justify-end">
                <button 
                  onClick={handleSaveInternal}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button 
                  onClick={handleNextInternal}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors text-sm"
                >
                  {isLast ? "Finalizar" : "Salvar & Próximo"}
                  {!isLast && <ChevronRight className="w-4 h-4" />}
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
