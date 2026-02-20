
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Save, MousePointer2, PenTool, Square, Circle, Minus, RotateCcw, ZoomIn, ZoomOut, RotateCw, Upload, Brush, CornerUpRight, ChevronRight, Check } from 'lucide-react';
import { VectorPath, VectorNode } from '../types';
import opentype from 'opentype.js';
import { convertOpenTypePathToStrokes } from '../utils/fontGenerator';

interface DrawingModalProps {
  char: string;
  initialStrokes: VectorPath[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (paths: VectorPath[], previewUrl: string) => void;
  onNext: (paths: VectorPath[], previewUrl: string) => void;
  isLast: boolean;
}

type Tool = 'select' | 'pen' | 'brush' | 'rect' | 'circle';

// Configurações do Editor
const BASELINE_Y = 800;
const ASCENDER_Y = 0;
// Limites virtuais para as barras de rolagem (Reduzido para limitar a área)
const SCROLL_RANGE = 1000; 

export const DrawingModal: React.FC<DrawingModalProps> = ({ 
  char, initialStrokes, isOpen, onClose, onSave, onNext, isLast 
}) => {
  // --- STATE ---
  const [paths, setPaths] = useState<VectorPath[]>([]);
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<{ pathId: string, index: number } | null>(null);
  
  // History State
  const [history, setHistory] = useState<VectorPath[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Tool State
  const [tool, setTool] = useState<Tool>('select');
  const [brushSize, setBrushSize] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'none' | 'node' | 'handleIn' | 'handleOut' | 'path' | 'pan'>('none');
  
  // Viewport State (Pan & Zoom)
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, k: 0.6 }); 
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pen/Brush Temp State
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [brushPoints, setBrushPoints] = useState<{x:number, y:number}[]>([]);

  // Inicialização
  useEffect(() => {
    if (isOpen) {
      const initial = JSON.parse(JSON.stringify(initialStrokes || []));
      setPaths(initial);
      setHistory([initial]);
      setHistoryIndex(0);
      setViewTransform({ x: 100, y: 100, k: 0.6 }); 
      setTool('select');
    }
  }, [isOpen, initialStrokes]);

  // --- HISTORY MANAGEMENT ---
  const recordHistory = (newPaths: VectorPath[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newPaths)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  const undo = useCallback(() => {
      if (historyIndex > 0) {
          setHistoryIndex(prev => prev - 1);
          setPaths(JSON.parse(JSON.stringify(history[historyIndex - 1])));
      }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
      if (historyIndex < history.length - 1) {
          setHistoryIndex(prev => prev + 1);
          setPaths(JSON.parse(JSON.stringify(history[historyIndex + 1])));
      }
  }, [history, historyIndex]);

  // Atalhos de Teclado
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
              e.preventDefault();
              if (e.shiftKey) {
                  redo();
              } else {
                  // Lógica Especial: Se estiver desenhando com a Pen, remove o último ponto
                  if (tool === 'pen' && activePathId) {
                      setPaths(prev => {
                          const pathIndex = prev.findIndex(p => p.id === activePathId);
                          if (pathIndex === -1) return prev;

                          const path = prev[pathIndex];
                          
                          // Se tiver nós para remover
                          if (path.nodes.length > 0) {
                              // Se for o último nó restante, cancela o caminho atual
                              if (path.nodes.length === 1) {
                                  setActivePathId(null);
                                  setSelectedPathIds([]);
                                  setSelectedNodeId(null);
                                  // Retorna os caminhos sem o caminho atual que foi cancelado
                                  return prev.filter(p => p.id !== activePathId);
                              }

                              // Remove o último nó
                              const newNodes = path.nodes.slice(0, -1);
                              
                              // Atualiza a seleção para o novo "último" nó para continuar desenhando dele
                              setSelectedNodeId({ pathId: activePathId, index: newNodes.length - 1 });
                              setDragType('handleOut'); // Prepara para arrastar handle se clicar

                              const newPaths = [...prev];
                              newPaths[pathIndex] = { ...path, nodes: newNodes };
                              return newPaths;
                          }
                          return prev;
                      });
                  } else {
                      // Comportamento padrão (Histórico Global)
                      undo();
                  }
              }
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (selectedPathIds.length > 0) {
                  const newPaths = paths.filter(p => !selectedPathIds.includes(p.id));
                  setPaths(newPaths);
                  recordHistory(newPaths);
                  setSelectedPathIds([]);
                  setSelectedNodeId(null);
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedPathIds, paths, tool, activePathId]);


  // --- HELPERS DE COORDENADAS ---
  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return { x: 0, y: 0 };
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const rect = svg.getBoundingClientRect();
      const svgX = clientX - rect.left;
      const svgY = clientY - rect.top;
      
      return {
          x: (svgX - viewTransform.x) / viewTransform.k,
          y: (svgY - viewTransform.y) / viewTransform.k
      };
  };

  // --- BRUSH LOGIC (Stroke to Outline) ---
  const generateBrushOutline = (points: {x:number, y:number}[], width: number): VectorNode[] => {
      if (points.length < 2) return [];
      
      const leftSide: {x:number, y:number}[] = [];
      const rightSide: {x:number, y:number}[] = [];

      for (let i = 0; i < points.length; i++) {
          const curr = points[i];
          const next = points[i + 1] || points[i];
          const prev = points[i - 1] || points[i];
          
          // Vetor tangente
          let dx = next.x - prev.x;
          let dy = next.y - prev.y;
          if (i === 0) { dx = next.x - curr.x; dy = next.y - curr.y; }
          if (i === points.length - 1) { dx = curr.x - prev.x; dy = curr.y - prev.y; }

          const len = Math.sqrt(dx*dx + dy*dy);
          if (len === 0) continue;

          // Normal (Perpendicular)
          const nx = -dy / len;
          const ny = dx / len;

          leftSide.push({ x: curr.x + nx * (width / 2), y: curr.y + ny * (width / 2) });
          rightSide.push({ x: curr.x - nx * (width / 2), y: curr.y - ny * (width / 2) });
      }

      // Converte para VectorNodes (simplificado, sem curvas complexas por enquanto para performance)
      const allPoints = [...leftSide, ...rightSide.reverse()];
      return allPoints.map(p => ({
          x: p.x, y: p.y,
          handleIn: {x: p.x, y: p.y},
          handleOut: {x: p.x, y: p.y},
          type: 'cusp'
      }));
  };

  // --- ACTIONS ---

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getMousePos(e);
      // Botão do meio ou Espaço pressionado = Pan
      if (('button' in e && e.button === 1) || ('buttons' in e && e.buttons === 4)) {
          setDragType('pan');
          setStartPan({ 
              x: ('clientX' in e ? e.clientX : e.touches[0].clientX) - viewTransform.x, 
              y: ('clientY' in e ? e.clientY : e.touches[0].clientY) - viewTransform.y 
          });
          return;
      }

      if (tool === 'select') {
          // Se clicou no target (SVG fundo) e não num elemento específico
          if (e.target === e.currentTarget || (e.target as Element).tagName === 'svg') {
              setSelectedPathIds([]);
              setSelectedNodeId(null);
          }
      } 
      else if (tool === 'pen') {
          if (!activePathId) {
              // Start New Path
              const newId = crypto.randomUUID();
              const newNode: VectorNode = {
                  x: pos.x, y: pos.y,
                  handleIn: { x: pos.x, y: pos.y },
                  handleOut: { x: pos.x, y: pos.y },
                  type: 'cusp'
              };
              const newPath = {
                  id: newId,
                  nodes: [newNode],
                  isClosed: false,
                  fill: 'black',
                  isHole: false
              };
              setPaths(prev => [...prev, newPath]);
              setActivePathId(newId);
              setSelectedPathIds([newId]);
              setSelectedNodeId({ pathId: newId, index: 0 });
              setDragType('handleOut'); 
          } else {
              // Add Node
              setPaths(prev => prev.map(p => {
                  if (p.id === activePathId) {
                      const newNode: VectorNode = {
                          x: pos.x, y: pos.y,
                          handleIn: { x: pos.x, y: pos.y },
                          handleOut: { x: pos.x, y: pos.y },
                          type: 'smooth'
                      };
                      return { ...p, nodes: [...p.nodes, newNode] };
                  }
                  return p;
              }));
              const path = paths.find(p => p.id === activePathId);
              if (path) {
                  setSelectedNodeId({ pathId: activePathId, index: path.nodes.length });
                  setDragType('handleOut');
              }
          }
          setIsDragging(true);
      }
      else if (tool === 'brush') {
          setBrushPoints([{x: pos.x, y: pos.y}]);
          const newId = crypto.randomUUID();
          setActivePathId(newId);
          // Placeholder path
          setPaths(prev => [...prev, {
              id: newId,
              nodes: [],
              isClosed: true,
              fill: 'black',
              isHole: false
          }]);
          setIsDragging(true);
      }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (dragType === 'pan') {
          const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
          const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
          setViewTransform(prev => ({
              ...prev,
              x: clientX - startPan.x,
              y: clientY - startPan.y
          }));
          return;
      }

      if (!isDragging) return;
      const pos = getMousePos(e);

      // Lógica do Pincel (Brush)
      if (tool === 'brush' && activePathId) {
          const newPoints = [...brushPoints, {x: pos.x, y: pos.y}];
          setBrushPoints(newPoints);
          
          // Otimização: Calcular outline a cada N pontos ou throttle
          const outlineNodes = generateBrushOutline(newPoints, brushSize);
          
          setPaths(prev => prev.map(p => {
              if (p.id === activePathId) {
                  return { ...p, nodes: outlineNodes };
              }
              return p;
          }));
          return;
      }

      // Lógica de Edição de Nós
      if (dragType === 'node' && selectedNodeId) {
          setPaths(prev => prev.map(p => {
              if (p.id === selectedNodeId.pathId) {
                  const newNodes = [...p.nodes];
                  const node = newNodes[selectedNodeId.index];
                  const dx = pos.x - node.x;
                  const dy = pos.y - node.y;
                  
                  newNodes[selectedNodeId.index] = {
                      ...node,
                      x: pos.x, y: pos.y,
                      handleIn: { x: node.handleIn.x + dx, y: node.handleIn.y + dy },
                      handleOut: { x: node.handleOut.x + dx, y: node.handleOut.y + dy }
                  };
                  return { ...p, nodes: newNodes };
              }
              return p;
          }));
      } else if ((dragType === 'handleIn' || dragType === 'handleOut') && selectedNodeId) {
          setPaths(prev => prev.map(p => {
              if (p.id === selectedNodeId.pathId) {
                  const newNodes = [...p.nodes];
                  const node = newNodes[selectedNodeId.index];
                  
                  if (dragType === 'handleIn') {
                      newNodes[selectedNodeId.index] = { ...node, handleIn: { x: pos.x, y: pos.y } };
                      if (node.type === 'smooth' || node.type === 'symmetric') {
                          const dx = node.x - pos.x;
                          const dy = node.y - pos.y;
                          newNodes[selectedNodeId.index].handleOut = { x: node.x + dx, y: node.y + dy };
                      }
                  } else {
                      newNodes[selectedNodeId.index] = { ...node, handleOut: { x: pos.x, y: pos.y } };
                      if (node.type === 'smooth' || node.type === 'symmetric') {
                          const dx = node.x - pos.x;
                          const dy = node.y - pos.y;
                          newNodes[selectedNodeId.index].handleIn = { x: node.x + dx, y: node.y + dy };
                      }
                  }
                  return { ...p, nodes: newNodes };
              }
              return p;
          }));
      }
  };

  const handleMouseUp = () => {
      if (isDragging) {
          if (tool === 'brush') {
              setActivePathId(null);
              setBrushPoints([]);
              recordHistory(paths);
          } else if (tool !== 'pen') {
              // Se não for pen, terminar drag registra história
              // Se for pen, não registra ainda pois o path continua aberto
              if (dragType !== 'none') recordHistory(paths);
          }
      }
      setIsDragging(false);
      if (dragType === 'pan') setDragType('none');
      else if (tool === 'select') setDragType('none');
  };

  const handleNodeMouseDown = (e: React.MouseEvent, pathId: string, index: number) => {
      if (tool !== 'select') return;
      e.stopPropagation();
      setSelectedNodeId({ pathId, index });
      setSelectedPathIds([pathId]);
      setDragType('node');
      setIsDragging(true);
  };

  const handleHandleMouseDown = (e: React.MouseEvent, type: 'handleIn' | 'handleOut') => {
      e.stopPropagation();
      setDragType(type);
      setIsDragging(true);
  };

  const handlePathMouseDown = (e: React.MouseEvent, pathId: string) => {
      if (tool !== 'select') return;
      setSelectedPathIds([pathId]);
  };

  const closePath = () => {
      if (activePathId) {
          setPaths(prev => prev.map(p => p.id === activePathId ? { ...p, isClosed: true } : p));
          setActivePathId(null);
          setSelectedNodeId(null);
          recordHistory(paths);
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault(); 
      const scaleBy = 1.1;
      const oldScale = viewTransform.k;
      const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      setViewTransform(prev => ({ ...prev, k: Math.max(0.1, Math.min(10, newScale)) }));
  };

  // --- SVG IMPORT ---
  const handleImportSvg = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
          const svgContent = ev.target?.result as string;
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgContent, 'image/svg+xml');
          
          // Extrair paths (simplificado: pega o primeiro 'd' válido)
          const pathEl = doc.querySelector('path');
          if (pathEl) {
              const d = pathEl.getAttribute('d');
              if (d) {
                  // Usa opentype.js para parsear o path string
                  const otPath = opentype.Path.fromSVG(d);
                  // Usa nosso utilitário existente
                  const newPaths = convertOpenTypePathToStrokes(otPath, 1000, 1000);
                  
                  if (newPaths.length > 0) {
                      const updatedPaths = [...paths, ...newPaths];
                      setPaths(updatedPaths);
                      recordHistory(updatedPaths);
                  }
              }
          }
      };
      reader.readAsText(file);
  };

  // --- SVG PATH GENERATOR ---
  const generateD = (nodes: VectorNode[], closed: boolean) => {
      if (nodes.length === 0) return '';
      let d = `M ${nodes[0].x} ${nodes[0].y}`;
      for (let i = 1; i < nodes.length; i++) {
          const curr = nodes[i];
          const prev = nodes[i-1];
          d += ` C ${prev.handleOut.x} ${prev.handleOut.y}, ${curr.handleIn.x} ${curr.handleIn.y}, ${curr.x} ${curr.y}`;
      }
      if (closed) {
          const first = nodes[0];
          const last = nodes[nodes.length-1];
          d += ` C ${last.handleOut.x} ${last.handleOut.y}, ${first.handleIn.x} ${first.handleIn.y}, ${first.x} ${first.y} Z`;
      }
      return d;
  };

  const handleSaveAndExit = () => {
      const previewSvg = `<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="${paths.map(p => generateD(p.nodes, p.isClosed)).join(' ')}" fill="black" /></svg>`;
      const url = "data:image/svg+xml;base64," + btoa(previewSvg);
      onSave(paths, url);
  };

  const handleNext = () => {
      const previewSvg = `<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="${paths.map(p => generateD(p.nodes, p.isClosed)).join(' ')}" fill="black" /></svg>`;
      const url = "data:image/svg+xml;base64," + btoa(previewSvg);
      onNext(paths, url);
  };

  if (!isOpen) return null;

  return (
    // Alterado: h-screen fixo para h-[100dvh] (viewport dinâmico mobile), e flex-col no mobile
    <div className="fixed inset-0 z-[9999] bg-[#09090b] flex flex-col md:flex-row text-white font-sans overflow-hidden h-[100dvh]">
      
      {/* Sidebar Toolstrip - Agora horizontal no rodapé (mobile) e vertical na esquerda (desktop) */}
      <div className="md:w-16 w-full h-16 md:h-full border-t md:border-t-0 md:border-r border-zinc-800 bg-[#121215] flex flex-row md:flex-col items-center justify-around md:justify-start py-2 md:py-4 gap-1 md:gap-3 z-50 shrink-0 order-last md:order-first">
          <div className="mb-0 md:mb-2 hidden md:block">
             <span className="text-xl font-bold bg-purple-600 w-10 h-10 rounded-lg flex items-center justify-center shadow-glow">{char}</span>
          </div>
          
          <div className="w-px h-8 bg-zinc-800 hidden md:block my-1"></div>

          <button onClick={() => { setTool('select'); setActivePathId(null); }} className={`p-3 rounded-xl transition-all duration-200 group relative ${tool === 'select' ? 'bg-primary text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="Seleção (V)">
              <MousePointer2 size={20} />
          </button>
          
          <button onClick={() => setTool('pen')} className={`p-3 rounded-xl transition-all duration-200 group relative ${tool === 'pen' ? 'bg-primary text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="Caneta Bézier (P)">
              <PenTool size={20} />
          </button>

          <button onClick={() => setTool('brush')} className={`p-3 rounded-xl transition-all duration-200 group relative ${tool === 'brush' ? 'bg-primary text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="Pincel / Caligrafia (B)">
              <Brush size={20} />
          </button>
          
          <div className="w-px h-8 md:w-8 md:h-px bg-zinc-800 my-1 hidden md:block"></div>
          
          <button onClick={() => fileInputRef.current?.click()} className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition hidden md:block" title="Importar Vetor SVG">
              <Upload size={20} />
          </button>
          <input type="file" accept=".svg" className="hidden" ref={fileInputRef} onChange={handleImportSvg} />
          
          <div className="md:mt-auto flex flex-row md:flex-col gap-1 md:gap-2 ml-auto md:ml-0 pr-4 md:pr-0">
             <button onClick={undo} disabled={historyIndex <= 0} className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition disabled:opacity-30" title="Desfazer (Ctrl+Z)"><RotateCcw size={20} /></button>
             <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition disabled:opacity-30" title="Refazer (Ctrl+Shift+Z)"><RotateCw size={20} /></button>
          </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
          
          {/* Header Superior - Sempre Visível */}
          <div className="h-14 md:h-16 border-b border-zinc-800 bg-[#121215] flex items-center justify-between px-4 md:px-6 z-50 shrink-0 shadow-xl">
              <div className="flex items-center gap-4">
                  <span className="md:hidden text-xl font-bold bg-purple-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-glow">{char}</span>
                  <span className="text-zinc-400 text-xs md:text-sm font-medium tracking-wider hidden sm:block">EDITOR DE GLIFO</span>
                  
                  {tool === 'brush' && (
                      <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 ml-2 md:ml-4 animate-fade-in">
                          <span className="text-[10px] md:text-xs text-zinc-500 font-bold uppercase hidden sm:inline">Espessura</span>
                          <input type="range" min="10" max="200" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-16 md:w-24 h-1.5 bg-zinc-700 rounded-full accent-primary cursor-pointer" />
                      </div>
                  )}
              </div>
              
              <div className="flex items-center gap-2 md:gap-3">
                  <div className="hidden md:flex items-center bg-zinc-900 rounded-lg p-1 mr-4 border border-zinc-800">
                      <button onClick={() => setViewTransform(prev => ({...prev, k: prev.k * 1.2}))} className="p-2 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"><ZoomIn size={16} /></button>
                      <button onClick={() => setViewTransform(prev => ({...prev, k: prev.k * 0.8}))} className="p-2 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"><ZoomOut size={16} /></button>
                  </div>

                  {isLast ? (
                      <button onClick={handleSaveAndExit} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 md:px-6 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/20">
                          <Check size={16} /> <span className="hidden sm:inline">Finalizar</span>
                      </button>
                  ) : (
                      <>
                        <button onClick={handleSaveAndExit} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition">
                            <Save size={16} /> <span className="hidden sm:inline">Salvar</span>
                        </button>
                        <button onClick={handleNext} className="bg-primary hover:bg-amber-600 text-white px-4 md:px-6 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-primary/20">
                            <span className="hidden sm:inline">Próxima</span> <ChevronRight size={16} />
                        </button>
                      </>
                  )}
                  
                  <button onClick={onClose} className="p-2 hover:bg-red-900/20 text-zinc-500 hover:text-red-400 rounded-lg transition ml-1 md:ml-2"><X size={20} /></button>
              </div>
          </div>

          {/* Canvas */}
          <div 
            ref={containerRef}
            className="flex-1 relative bg-[#1a1a1a] overflow-hidden cursor-crosshair touch-none w-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
          >
              <svg width="100%" height="100%" className="block">
                  <defs>
                      <pattern id="grid" width={100 * viewTransform.k} height={100 * viewTransform.k} patternUnits="userSpaceOnUse" x={viewTransform.x} y={viewTransform.y}>
                          <path d={`M ${100 * viewTransform.k} 0 L 0 0 0 ${100 * viewTransform.k}`} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
                      </pattern>
                      <pattern id="grid-sub" width={20 * viewTransform.k} height={20 * viewTransform.k} patternUnits="userSpaceOnUse" x={viewTransform.x} y={viewTransform.y}>
                          <path d={`M ${20 * viewTransform.k} 0 L 0 0 0 ${20 * viewTransform.k}`} fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth={0.5} />
                      </pattern>
                  </defs>
                  
                  <rect width="100%" height="100%" fill="#1a1a1a" />
                  <rect width="100%" height="100%" fill="url(#grid-sub)" pointerEvents="none" />
                  <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

                  <g id="canvas-content" transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.k})`}>
                      
                      {/* Ghost Letter (Guia) */}
                      <text 
                        x="500" 
                        y="800" 
                        textAnchor="middle" 
                        fontSize="800" 
                        fill="white" 
                        opacity="0.05" 
                        pointerEvents="none"
                        fontFamily="serif"
                      >
                        {char}
                      </text>

                      {/* Guides */}
                      <line x1={-5000} y1={BASELINE_Y} x2={5000} y2={BASELINE_Y} stroke="#ef4444" strokeWidth={2} strokeDasharray="10 5" opacity={0.3} />
                      <line x1={-5000} y1={ASCENDER_Y} x2={5000} y2={ASCENDER_Y} stroke="#3b82f6" strokeWidth={2} strokeDasharray="10 5" opacity={0.3} />
                      <text x={10} y={BASELINE_Y - 10} fill="#ef4444" fontSize={24} opacity={0.5}>Baseline</text>
                      <text x={10} y={ASCENDER_Y + 30} fill="#3b82f6" fontSize={24} opacity={0.5}>Ascender</text>

                      {/* Character Paths */}
                      {paths.map(path => (
                          <path 
                            key={path.id}
                            d={generateD(path.nodes, path.isClosed)}
                            fill={path.isHole ? 'black' : 'white'}
                            fillRule="evenodd"
                            fillOpacity={0.9}
                            stroke={selectedPathIds.includes(path.id) ? '#3b82f6' : 'none'}
                            strokeWidth={2}
                            onMouseDown={(e) => handlePathMouseDown(e, path.id)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          />
                      ))}

                      {/* Pen Preview Line */}
                      {tool === 'pen' && activePathId && paths.find(p => p.id === activePathId)?.nodes.length! > 0 && (
                          <line 
                            x1={paths.find(p => p.id === activePathId)!.nodes.slice(-1)[0].x} 
                            y1={paths.find(p => p.id === activePathId)!.nodes.slice(-1)[0].y} 
                            x2={((getMousePos({ clientX: 0, clientY: 0 } as any).x) * 0) + ((getMousePos({ clientX: 0, clientY: 0 } as any).x) * 0)} // Placeholder, real calc needs ref tracking which is hard in render
                            stroke="rgba(59,130,246,0.5)" strokeWidth={2} 
                            strokeDasharray="5 5"
                          />
                      )}

                      {/* Editing UI (Nodes & Handles) */}
                      {selectedPathIds.map(pathId => {
                          const path = paths.find(p => p.id === pathId);
                          if (!path) return null;
                          return path.nodes.map((node, i) => (
                              <g key={`${pathId}-${i}`}>
                                  {/* Lines to Handles */}
                                  {selectedNodeId?.pathId === pathId && selectedNodeId.index === i && (
                                      <>
                                          <line x1={node.x} y1={node.y} x2={node.handleIn.x} y2={node.handleIn.y} stroke="#93c5fd" strokeWidth={1} />
                                          <line x1={node.x} y1={node.y} x2={node.handleOut.x} y2={node.handleOut.y} stroke="#93c5fd" strokeWidth={1} />
                                          
                                          {/* Handles - Tamanho aumentado (7px) */}
                                          <circle cx={node.handleIn.x} cy={node.handleIn.y} r={7 / viewTransform.k} fill="#93c5fd" stroke="black" strokeWidth={1} onMouseDown={(e) => handleHandleMouseDown(e, 'handleIn')} className="cursor-pointer" />
                                          <circle cx={node.handleOut.x} cy={node.handleOut.y} r={7 / viewTransform.k} fill="#93c5fd" stroke="black" strokeWidth={1} onMouseDown={(e) => handleHandleMouseDown(e, 'handleOut')} className="cursor-pointer" />
                                      </>
                                  )}
                                  {/* Anchor Point - Tamanho aumentado (14px) e removido hover:scale para evitar tremor */}
                                  <rect 
                                    x={node.x - (7 / viewTransform.k)} y={node.y - (7 / viewTransform.k)} 
                                    width={14 / viewTransform.k} height={14 / viewTransform.k} 
                                    fill={selectedNodeId?.pathId === pathId && selectedNodeId.index === i ? '#3b82f6' : 'white'} 
                                    stroke="black" strokeWidth={1}
                                    onMouseDown={(e) => handleNodeMouseDown(e, pathId, i)}
                                    className="cursor-pointer hover:stroke-primary hover:stroke-[2px] transition-colors"
                                  />
                              </g>
                          ));
                      })}
                  </g>
              </svg>

              {/* Scrollbars (Fake Pan Controllers) - Reposicionados para não conflitar no mobile */}
              <div className="absolute bottom-4 left-4 right-16 md:left-6 md:right-10 h-4 bg-zinc-900/80 rounded-full border border-zinc-700 flex items-center px-1 z-40 backdrop-blur-sm">
                  <input 
                    type="range" 
                    min={-SCROLL_RANGE} 
                    max={SCROLL_RANGE} 
                    value={-viewTransform.x} 
                    onChange={(e) => setViewTransform(prev => ({ ...prev, x: -Number(e.target.value) }))}
                    className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-primary"
                    title="Mover Horizontalmente"
                  />
              </div>
              <div className="absolute top-16 right-2 bottom-16 w-4 bg-zinc-900/80 rounded-full border border-zinc-700 flex flex-col justify-center py-1 z-40 backdrop-blur-sm">
                  <input 
                    type="range" 
                    min={-SCROLL_RANGE} 
                    max={SCROLL_RANGE} 
                    value={-viewTransform.y} 
                    onChange={(e) => setViewTransform(prev => ({ ...prev, y: -Number(e.target.value) }))}
                    className="h-full w-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-primary"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl', margin: '0 auto' }}
                    title="Mover Verticalmente"
                  />
              </div>

              {/* Floating Action Bar */}
              {selectedPathIds.length > 0 && (
                  <div className="absolute bottom-12 md:bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 md:px-6 md:py-3 flex items-center gap-4 md:gap-6 shadow-2xl animate-slide-up-bounce z-50 whitespace-nowrap">
                      <button onClick={() => {
                          setPaths(prev => prev.map(p => {
                              if (selectedPathIds.includes(p.id)) return { ...p, isHole: !p.isHole };
                              return p;
                          }));
                      }} className="flex items-center gap-2 text-xs font-bold text-white hover:text-blue-400">
                          <Minus size={16} /> <span className="hidden sm:inline">{paths.find(p => p.id === selectedPathIds[0])?.isHole ? 'Remover Buraco' : 'Tornar Buraco'}</span><span className="sm:hidden">Buraco</span>
                      </button>
                      
                      <div className="w-px h-6 bg-zinc-700"></div>
                      
                      {activePathId && selectedPathIds.includes(activePathId) && (
                          <button onClick={closePath} className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300">
                              <CornerUpRight size={16} /> <span className="hidden sm:inline">Fechar Caminho</span><span className="sm:hidden">Fechar</span>
                          </button>
                      )}
                      
                      <div className="w-px h-6 bg-zinc-700"></div>

                      <button onClick={() => {
                          const newPaths = paths.filter(p => !selectedPathIds.includes(p.id));
                          setPaths(newPaths);
                          recordHistory(newPaths);
                          setSelectedPathIds([]);
                          setSelectedNodeId(null);
                      }} className="text-red-400 hover:text-red-300 flex items-center gap-2 text-xs font-bold">
                          <X size={16} /> <span className="hidden sm:inline">Excluir</span>
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
