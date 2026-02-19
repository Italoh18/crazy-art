
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, Save, Square, Triangle, Circle, Undo, Eraser, PenTool, Spline, PaintBucket, Minus, Plus, Eye, EyeOff, Upload, Move, Maximize, Image as ImageIcon, Sliders, Ruler, FlipHorizontal, FlipVertical, MousePointer2 } from 'lucide-react';
import { Stroke, Point, NodeType } from '../types';
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

type ToolType = 'select' | 'pen' | 'square' | 'circle' | 'move';

const CANVAS_SIZE = 500;
const BASELINE_Y = CANVAS_SIZE * 0.8;

// --- Helper Functions for Vector Math ---

const dist = (p1: {x:number, y:number}, p2: {x:number, y:number}) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

export const DrawingModal: React.FC<DrawingModalProps> = ({ 
  char, initialStrokes, isOpen, onClose, onSave, onNext, isLast 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  
  // Data Model
  const [paths, setPaths] = useState<Stroke[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  
  // UI State
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [strokeWidth, setStrokeWidth] = useState<number>(15); // Used for Pen stroke expansion width
  const [showGuide, setShowGuide] = useState<boolean>(true); 
  const [traceImage, setTraceImage] = useState<HTMLImageElement | null>(null);
  const [traceOpacity, setTraceOpacity] = useState(0.3);
  
  // Interaction State
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'none' | 'node' | 'handleIn' | 'handleOut' | 'path'>('none');
  const [activeNodeIndex, setActiveNodeIndex] = useState<{pathId: string, nodeIndex: number} | null>(null);
  const [dragStartPos, setDragStartPos] = useState({x:0, y:0});
  
  // Pen Drawing State
  const [rawPoints, setRawPoints] = useState<{x:number, y:number}[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPaths(initialStrokes || []);
      setHistory([]);
      setActiveTool('pen');
      setStrokeWidth(15);
      setShowGuide(true);
      setTraceImage(null);
      setSelectedPathIds([]);
    }
  }, [isOpen]);

  const saveToHistory = () => {
      setHistory(prev => [...prev.slice(-20), JSON.parse(JSON.stringify(paths))]);
  };

  const handleUndo = () => {
      if (history.length === 0) return;
      const previous = history[history.length - 1];
      setPaths(previous);
      setHistory(prev => prev.slice(0, -1));
  };

  // --- Rendering ---

  const drawPath = (ctx: CanvasRenderingContext2D, path: Stroke, isSelected: boolean) => {
      if (path.points.length === 0) return;
      
      ctx.beginPath();
      const start = path.points[0];
      ctx.moveTo(start.x, start.y);
      
      for (let i = 1; i < path.points.length; i++) {
          const p = path.points[i];
          const prev = path.points[i-1];
          // Use handles if present
          if ((prev.handleOut && (prev.handleOut.x !== 0 || prev.handleOut.y !== 0)) || 
              (p.handleIn && (p.handleIn.x !== 0 || p.handleIn.y !== 0))) {
              ctx.bezierCurveTo(
                  prev.x + (prev.handleOut?.x || 0), prev.y + (prev.handleOut?.y || 0),
                  p.x + (p.handleIn?.x || 0), p.y + (p.handleIn?.y || 0),
                  p.x, p.y
              );
          } else {
              ctx.lineTo(p.x, p.y);
          }
      }
      
      if (path.isClosed) {
          const first = path.points[0];
          const last = path.points[path.points.length - 1];
          if ((last.handleOut && (last.handleOut.x !== 0 || last.handleOut.y !== 0)) ||
              (first.handleIn && (first.handleIn.x !== 0 || first.handleIn.y !== 0))) {
              ctx.bezierCurveTo(
                  last.x + (last.handleOut?.x || 0), last.y + (last.handleOut?.y || 0),
                  first.x + (first.handleIn?.x || 0), first.y + (first.handleIn?.y || 0),
                  first.x, first.y
              );
          } else {
              ctx.closePath();
          }
      }

      ctx.fillStyle = path.isHole ? 'rgba(0,0,0,1)' : (path.fillColor || 'white');
      if (path.isHole) ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      
      if (path.strokeColor) {
          ctx.strokeStyle = path.strokeColor;
          ctx.lineWidth = path.width || 1;
          ctx.stroke();
      }

      // Draw UI for selected path
      if (isSelected && activeTool === 'select') {
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#3b82f6'; // Blue selection
          ctx.stroke();
          
          // Nodes
          path.points.forEach((pt, idx) => {
              // Draw Node
              ctx.fillStyle = '#3b82f6';
              ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
              
              // Draw Handles if selected Node
              if (activeNodeIndex?.pathId === path.id && activeNodeIndex?.nodeIndex === idx) {
                  // Handle In
                  if (pt.handleIn) {
                      const hx = pt.x + pt.handleIn.x;
                      const hy = pt.y + pt.handleIn.y;
                      ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(hx, hy); ctx.strokeStyle='#93c5fd'; ctx.stroke();
                      ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI*2); ctx.fillStyle='#93c5fd'; ctx.fill();
                  }
                  // Handle Out
                  if (pt.handleOut) {
                      const hx = pt.x + pt.handleOut.x;
                      const hy = pt.y + pt.handleOut.y;
                      ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(hx, hy); ctx.strokeStyle='#93c5fd'; ctx.stroke();
                      ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI*2); ctx.fillStyle='#93c5fd'; ctx.fill();
                  }
              }
          });
      }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reference Image
    if (traceImage) {
        ctx.save();
        ctx.globalAlpha = traceOpacity;
        const scale = Math.min(canvas.width / traceImage.width, canvas.height / traceImage.height);
        const x = (canvas.width - traceImage.width * scale) / 2;
        const y = (canvas.height - traceImage.height * scale) / 2;
        ctx.drawImage(traceImage, x, y, traceImage.width * scale, traceImage.height * scale);
        ctx.restore();
    }

    // Guides
    if (showGuide) {
        ctx.save();
        ctx.font = `bold ${CANVAS_SIZE * 0.65}px sans-serif`; 
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; 
        ctx.textAlign = 'center';
        ctx.fillText(char, CANVAS_SIZE / 2, BASELINE_Y);
        ctx.restore();
    }
    
    // Baseline
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, BASELINE_Y); ctx.lineTo(CANVAS_SIZE, BASELINE_Y); ctx.stroke();

    // Paths
    paths.forEach(p => drawPath(ctx, p, selectedPathIds.includes(p.id || '')));

    // Current Drawing (Pen)
    if (activeTool === 'pen' && rawPoints.length > 0) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rawPoints[0].x, rawPoints[0].y);
        for(let i=1; i<rawPoints.length; i++) ctx.lineTo(rawPoints[i].x, rawPoints[i].y);
        ctx.stroke();
    }

  }, [paths, selectedPathIds, activeTool, rawPoints, showGuide, traceImage, traceOpacity, activeNodeIndex, char]);

  // --- Interaction Logic ---

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return {x:0, y:0};
      const rect = canvas.getBoundingClientRect();
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const pos = getPointerPos(e);
      setIsDragging(true);
      setDragStartPos(pos);

      if (activeTool === 'pen') {
          setRawPoints([pos]);
          return;
      }

      if (activeTool === 'select') {
          // Check for Nodes/Handles interaction first
          if (selectedPathIds.length === 1) {
              const pathId = selectedPathIds[0];
              const path = paths.find(p => p.id === pathId);
              if (path) {
                  // Check Handles of active node
                  if (activeNodeIndex?.pathId === pathId) {
                      const pt = path.points[activeNodeIndex.nodeIndex];
                      // Check Handle In
                      if (pt.handleIn) {
                          const hx = pt.x + pt.handleIn.x, hy = pt.y + pt.handleIn.y;
                          if (dist(pos, {x:hx, y:hy}) < 8) {
                              setDragMode('handleIn');
                              saveToHistory();
                              return;
                          }
                      }
                      // Check Handle Out
                      if (pt.handleOut) {
                          const hx = pt.x + pt.handleOut.x, hy = pt.y + pt.handleOut.y;
                          if (dist(pos, {x:hx, y:hy}) < 8) {
                              setDragMode('handleOut');
                              saveToHistory();
                              return;
                          }
                      }
                  }

                  // Check Nodes
                  for (let i = 0; i < path.points.length; i++) {
                      if (dist(pos, path.points[i]) < 8) {
                          setActiveNodeIndex({ pathId, nodeIndex: i });
                          setDragMode('node');
                          saveToHistory();
                          return;
                      }
                  }
              }
          }

          // Check Path Selection
          // Simple bounding box check or point in poly
          // Lógica simplificada: Clicar perto de um ponto ou dentro do path
          // Reverse loop for Z-order
          for (let i = paths.length - 1; i >= 0; i--) {
              // Basic Hit Test on points
              const p = paths[i];
              const hit = p.points.some(pt => dist(pos, pt) < 20); // Close to outline
              // Or inside (implementing point in poly is expensive, skip for now or use library)
              
              if (hit) {
                  setSelectedPathIds([p.id || '']);
                  setDragMode('path');
                  saveToHistory();
                  return;
              }
          }
          
          // Click on empty space
          setSelectedPathIds([]);
          setActiveNodeIndex(null);
          setDragMode('none');
      }
      
      // Shape Tools
      if (activeTool === 'square' || activeTool === 'circle') {
          saveToHistory();
      }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDragging) return;
      const pos = getPointerPos(e);

      if (activeTool === 'pen') {
          setRawPoints(prev => [...prev, pos]);
          return;
      }

      if (activeTool === 'select') {
          const dx = pos.x - dragStartPos.x;
          const dy = pos.y - dragStartPos.y;
          setDragStartPos(pos);

          if (dragMode === 'path' && selectedPathIds.length > 0) {
              setPaths(prev => prev.map(p => {
                  if (selectedPathIds.includes(p.id || '')) {
                      return {
                          ...p,
                          points: p.points.map(pt => ({ ...pt, x: pt.x + dx, y: pt.y + dy }))
                      };
                  }
                  return p;
              }));
          } else if (dragMode === 'node' && activeNodeIndex) {
              setPaths(prev => prev.map(p => {
                  if (p.id === activeNodeIndex.pathId) {
                      const newPoints = [...p.points];
                      const pt = newPoints[activeNodeIndex.nodeIndex];
                      newPoints[activeNodeIndex.nodeIndex] = { ...pt, x: pt.x + dx, y: pt.y + dy };
                      return { ...p, points: newPoints };
                  }
                  return p;
              }));
          } else if ((dragMode === 'handleIn' || dragMode === 'handleOut') && activeNodeIndex) {
              setPaths(prev => prev.map(p => {
                  if (p.id === activeNodeIndex.pathId) {
                      const newPoints = [...p.points];
                      const pt = newPoints[activeNodeIndex.nodeIndex];
                      
                      // Handle moves relative to Node
                      // New Handle Pos (Absolute) = Mouse Pos
                      // Handle Vector (Relative) = Mouse Pos - Node Pos
                      const newHx = pos.x - pt.x;
                      const newHy = pos.y - pt.y;

                      if (dragMode === 'handleIn') {
                          newPoints[activeNodeIndex.nodeIndex] = { 
                              ...pt, 
                              handleIn: { x: newHx, y: newHy },
                              // If symmetric/smooth, update handleOut? 
                              // For simple implementation, let's keep them independent (Cusp) or 
                              // mirror if shift held (omitted for brevity)
                          };
                      } else {
                          newPoints[activeNodeIndex.nodeIndex] = { 
                              ...pt, 
                              handleOut: { x: newHx, y: newHy }
                          };
                      }
                      return { ...p, points: newPoints };
                  }
                  return p;
              }));
          }
      }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setDragMode('none');

      if (activeTool === 'pen' && rawPoints.length > 2) {
          saveToHistory();
          // Convert Pen Stroke to Vector Path (Expanded)
          // 1. Simplify points (Basic subsampling)
          const simplified = rawPoints.filter((_, i) => i % 3 === 0);
          
          // 2. Create Offset Path (Outline)
          // Simple method: Create polygon by offsetting normals
          const width = strokeWidth / 2;
          const leftPts: Point[] = [];
          const rightPts: Point[] = [];
          
          for (let i = 0; i < simplified.length - 1; i++) {
              const p1 = simplified[i];
              const p2 = simplified[i+1];
              const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
              const normal = angle + Math.PI/2;
              
              const dx = Math.cos(normal) * width;
              const dy = Math.sin(normal) * width;
              
              leftPts.push({ x: p1.x + dx, y: p1.y + dy, type: 'smooth' });
              rightPts.push({ x: p1.x - dx, y: p1.y - dy, type: 'smooth' });
          }
          // Add last point
          const last = simplified[simplified.length - 1];
          // Use previous normal
          const prev = simplified[simplified.length - 2];
          const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
          const normal = angle + Math.PI/2;
          const dx = Math.cos(normal) * width;
          const dy = Math.sin(normal) * width;
          leftPts.push({ x: last.x + dx, y: last.y + dy, type: 'smooth' });
          rightPts.push({ x: last.x - dx, y: last.y - dy, type: 'smooth' });

          // Combine: Left + Right(Reverse)
          const polyPoints = [...leftPts, ...rightPts.reverse()];
          
          const newPath: Stroke = {
              id: crypto.randomUUID(),
              points: polyPoints,
              type: 'path',
              isClosed: true,
              filled: true,
              fillColor: 'white'
          };
          
          setPaths(prev => [...prev, newPath]);
          setRawPoints([]);
      }
      
      // Handle Shape Creation
      if (activeTool === 'square' || activeTool === 'circle') {
          // Calculate bounding box from drag
          const pos = getPointerPos(e); // End pos
          const start = dragStartPos;
          const w = pos.x - start.x;
          const h = pos.y - start.y;
          
          if (Math.abs(w) > 5 && Math.abs(h) > 5) {
              const pts: Point[] = [];
              if (activeTool === 'square') {
                  pts.push({x: start.x, y: start.y, type:'cusp'});
                  pts.push({x: start.x + w, y: start.y, type:'cusp'});
                  pts.push({x: start.x + w, y: start.y + h, type:'cusp'});
                  pts.push({x: start.x, y: start.y + h, type:'cusp'});
              } else {
                  // Circle approximation with 4 bezier points
                  const kappa = 0.552284749831;
                  const ox = (w / 2) * kappa; // control point offset horizontal
                  const oy = (h / 2) * kappa; // control point offset vertical
                  const xe = start.x + w; // x-end
                  const ye = start.y + h; // y-end
                  const xm = start.x + w / 2; // x-middle
                  const ym = start.y + h / 2; // y-middle
                  
                  // Top
                  pts.push({ x: xm, y: start.y, handleIn: {x:-ox, y:0}, handleOut: {x:ox, y:0}, type:'smooth' });
                  // Right
                  pts.push({ x: xe, y: ym, handleIn: {x:0, y:-oy}, handleOut: {x:0, y:oy}, type:'smooth' });
                  // Bottom
                  pts.push({ x: xm, y: ye, handleIn: {x:ox, y:0}, handleOut: {x:-ox, y:0}, type:'smooth' });
                  // Left
                  pts.push({ x: start.x, y: ym, handleIn: {x:0, y:oy}, handleOut: {x:0, y:-oy}, type:'smooth' });
              }
              
              const newShape: Stroke = {
                  id: crypto.randomUUID(),
                  points: pts,
                  type: 'path',
                  isClosed: true,
                  filled: true,
                  fillColor: 'white'
              };
              setPaths(prev => [...prev, newShape]);
          }
      }
  };

  const handleCreateHole = () => {
      if (selectedPathIds.length > 0) {
          saveToHistory();
          setPaths(prev => prev.map(p => {
              if (selectedPathIds.includes(p.id || '')) {
                  return { ...p, isHole: !p.isHole };
              }
              return p;
          }));
      }
  };

  const handleDelete = () => {
      if (selectedPathIds.length > 0) {
          saveToHistory();
          setPaths(prev => prev.filter(p => !selectedPathIds.includes(p.id || '')));
          setSelectedPathIds([]);
          setActiveNodeIndex(null);
      }
  };

  // --- Rendering Utils ---
  const saveResult = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Get data URL for preview
      const previewUrl = canvas.toDataURL('image/png');
      onSave(paths, previewUrl);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900">
            <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-white bg-blue-600 w-8 h-8 flex items-center justify-center rounded">{char}</span>
                <span className="text-slate-400 text-xs hidden sm:inline">Editor Vetorial</span>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleUndo} className="p-2 text-slate-400 hover:text-white" title="Desfazer"><Undo size={18}/></button>
                <button onClick={handleDelete} className="p-2 text-red-400 hover:text-red-300" title="Excluir"><Eraser size={18}/></button>
                <div className="h-6 w-px bg-slate-700 mx-2"></div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">
            {/* Toolbar */}
            <div className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-2 z-10">
                <button onClick={() => setActiveTool('select')} className={`p-3 rounded-xl transition ${activeTool === 'select' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`} title="Selecionar / Editar Nós">
                    <MousePointer2 size={20} />
                </button>
                <button onClick={() => setActiveTool('pen')} className={`p-3 rounded-xl transition ${activeTool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`} title="Pincel (Desenhar)">
                    <PenTool size={20} />
                </button>
                <button onClick={() => setActiveTool('square')} className={`p-3 rounded-xl transition ${activeTool === 'square' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`} title="Retângulo">
                    <Square size={20} />
                </button>
                <button onClick={() => setActiveTool('circle')} className={`p-3 rounded-xl transition ${activeTool === 'circle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`} title="Círculo">
                    <Circle size={20} />
                </button>
                
                <div className="h-px w-8 bg-slate-800 my-2"></div>
                
                {/* Context Actions */}
                <button onClick={handleCreateHole} className={`p-3 rounded-xl text-slate-400 hover:text-white ${selectedPathIds.length > 0 ? '' : 'opacity-50 cursor-not-allowed'}`} title="Tornar Buraco (Subtrair)">
                    <Minus size={20} />
                </button>
                
                <div className="mt-auto flex flex-col gap-2">
                    <button onClick={() => setShowGuide(!showGuide)} className={`p-2 rounded ${showGuide ? 'text-blue-400' : 'text-slate-500'}`}><Eye size={18}/></button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                <canvas 
                    ref={canvasRef}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    className="bg-black border border-slate-800 shadow-2xl cursor-crosshair touch-none"
                    style={{ width: 'min(90vw, 80vh)', height: 'min(90vw, 80vh)' }}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                />
                
                {/* Float Controls */}
                {activeTool === 'pen' && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 px-4 py-2 rounded-full border border-slate-700 flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold uppercase">Espessura</span>
                        <input type="range" min="5" max="100" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                        <span className="text-xs text-white w-6 text-center">{strokeWidth}</span>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="h-16 border-t border-slate-800 bg-slate-900 flex items-center justify-end px-6 gap-4">
            <button onClick={saveResult} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm transition">
                Salvar
            </button>
            <button onClick={() => { saveResult(); onNext([], ""); }} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition flex items-center gap-2">
                {isLast ? "Finalizar" : "Próximo"} <ChevronRight size={16} />
            </button>
        </div>
    </div>
  );
};
