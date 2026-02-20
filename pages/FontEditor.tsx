
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Download, Upload, MousePointer2, PenTool, Brush, 
  RotateCcw, RotateCw, ZoomIn, ZoomOut, Save, CaseSensitive, 
  Hash, Languages, Minus, CornerUpRight, Trash2, MoveHorizontal,
  Square, Circle, FolderInput, Ruler, Combine, Scissors, Layers as LayersIcon,
  ArrowUpToLine, ArrowDownToLine
} from 'lucide-react';
import { GlyphMap, VectorPath, VectorNode } from '../types';
import { generateTTF, generatePreviewFromStrokes, convertOpenTypePathToStrokes } from '../utils/fontGenerator';
import opentype from 'opentype.js';
// @ts-ignore
import * as martinez from 'martinez-polygon-clipping';

// --- CONFIGURAÇÕES ---
const BASELINE_Y = 800;
const ASCENDER_Y = 0;
const CANVAS_SIZE = 1000;

const CHAR_SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  numbers: '0123456789?!@#$&%+-/*='.split(''),
  accents: 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ'.split('')
};

type Tool = 'select' | 'pen' | 'brush' | 'shape';

interface SelectionBox {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

export default function FontEditor() {
  const [fontName, setFontName] = useState("MinhaFonte");
  const [spacing, setSpacing] = useState(3);
  const [glyphs, setGlyphs] = useState<GlyphMap>({});
  const [activeTab, setActiveTab] = useState<'lowercase' | 'uppercase' | 'numbers' | 'accents'>('lowercase');
  const [activeChar, setActiveChar] = useState<string>('a'); 

  const [paths, setPaths] = useState<VectorPath[]>([]);
  const [history, setHistory] = useState<VectorPath[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [tool, setTool] = useState<Tool>('select'); 
  const [brushSize, setBrushSize] = useState(60);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showBrushMenu, setShowBrushMenu] = useState(false);
  
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<{ pathId: string, index: number }[]>([]);
  
  const [viewTransform, setViewTransform] = useState({ x: 50, y: 50, k: 0.45 }); 
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 }); 
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'none' | 'node' | 'handleIn' | 'handleOut' | 'path' | 'pan' | 'box' | 'pen_new_node'>('none');
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [brushPoints, setBrushPoints] = useState<{x:number, y:number}[]>([]);
  const [isShiftDown, setIsShiftDown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const singleCharInputRef = useRef<HTMLInputElement>(null);

  // Identifica o ID do objeto que está no topo da seleção atual
  const topSelectedId = useMemo(() => {
      if (selectedPathIds.length <= 1) return null;
      let maxIdx = -1;
      let topId = null;
      selectedPathIds.forEach(id => {
          const idx = paths.findIndex(p => p.id === id);
          if (idx > maxIdx) {
              maxIdx = idx;
              topId = id;
          }
      });
      return topId;
  }, [paths, selectedPathIds]);

  useEffect(() => {
      if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          const padding = 100;
          const scale = Math.min((width - padding) / CANVAS_SIZE, (height - padding) / CANVAS_SIZE);
          const x = (width - CANVAS_SIZE * scale) / 2;
          const y = (height - CANVAS_SIZE * scale) / 2;
          setViewTransform({ x, y, k: Math.max(0.1, scale) });
      }
  }, []);

  useEffect(() => {
      const data = glyphs[activeChar];
      const initialPaths = data ? JSON.parse(JSON.stringify(data.paths)) : [];
      setPaths(initialPaths);
      setHistory([initialPaths]);
      setHistoryIndex(0);
      setActivePathId(null);
      setSelectedPathIds([]);
      setSelectedNodeId([]);
  }, [activeChar]);

  useEffect(() => {
      const timeout = setTimeout(() => {
          const previewUrl = generatePreviewFromStrokes(paths, 50, 50);
          setGlyphs(prev => ({
              ...prev,
              [activeChar]: {
                  char: activeChar,
                  paths: paths,
                  previewUrl,
                  advanceWidth: 0 
              }
          }));
      }, 500);
      return () => clearTimeout(timeout);
  }, [paths, activeChar]);

  const recordHistory = useCallback((newPaths: VectorPath[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newPaths)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
      if (historyIndex > 0) {
          const newIdx = historyIndex - 1;
          setHistoryIndex(newIdx);
          setPaths(JSON.parse(JSON.stringify(history[newIdx])));
          setActivePathId(null);
          setSelectedPathIds([]);
          setSelectedNodeId([]);
      }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
      if (historyIndex < history.length - 1) {
          const newIdx = historyIndex + 1;
          setHistoryIndex(newIdx);
          setPaths(JSON.parse(JSON.stringify(history[newIdx])));
      }
  }, [history, historyIndex]);

  const handleLayerOrder = useCallback((direction: 'up' | 'down') => {
      if (selectedPathIds.length === 0) return;
      const newPaths = [...paths];
      const targetId = selectedPathIds[0];
      const idx = newPaths.findIndex(p => p.id === targetId);
      if (idx === -1) return;

      const item = newPaths.splice(idx, 1)[0];
      if (direction === 'up') newPaths.push(item); else newPaths.unshift(item);
      setPaths(newPaths); recordHistory(newPaths);
  }, [paths, selectedPathIds, recordHistory]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Shift') setIsShiftDown(true);
          if (e.key === 'Escape') {
              setActivePathId(null);
              setSelectedPathIds([]);
              setSelectedNodeId([]);
          }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
              e.preventDefault();
              if (e.shiftKey) redo(); else undo();
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
              e.preventDefault();
              handleLayerOrder('up');
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
              e.preventDefault();
              handleLayerOrder('down');
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (selectedNodeId.length > 0) {
                  const newPaths = paths.map(p => {
                      const nodesToDelete = selectedNodeId.filter(n => n.pathId === p.id).map(n => n.index);
                      if (nodesToDelete.length === 0) return p;
                      const newNodes = p.nodes.filter((_, idx) => !nodesToDelete.includes(idx));
                      if (newNodes.length < 2) return null;
                      return { ...p, nodes: newNodes };
                  }).filter(Boolean) as VectorPath[];
                  setPaths(newPaths);
                  recordHistory(newPaths);
                  setSelectedNodeId([]);
              } else if (selectedPathIds.length > 0 && !activePathId) {
                  const newPaths = paths.filter(p => !selectedPathIds.includes(p.id));
                  setPaths(newPaths);
                  recordHistory(newPaths);
                  setSelectedPathIds([]);
              }
          }
      };
      const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftDown(false); };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [undo, redo, selectedPathIds, selectedNodeId, paths, tool, activePathId, handleLayerOrder]);

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault(); 
      e.stopPropagation();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - viewTransform.x) / viewTransform.k;
      const worldY = (mouseY - viewTransform.y) / viewTransform.k;
      const scaleBy = 1.1;
      const newScale = e.deltaY < 0 ? viewTransform.k * scaleBy : viewTransform.k / scaleBy;
      const clampedScale = Math.max(0.1, Math.min(10, newScale));
      const newX = mouseX - worldX * clampedScale;
      const newY = mouseY - worldY * clampedScale;
      setViewTransform({ x: newX, y: newY, k: clampedScale });
  };

  const getMousePos = (e: React.MouseEvent | React.TouchEvent | MouseEvent) => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return { x: 0, y: 0 };
      const clientX = 'clientX' in e ? e.clientX : (e as any).touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : (e as any).touches[0].clientY;
      const rect = svg.getBoundingClientRect();
      return {
          x: (clientX - rect.left - viewTransform.x) / viewTransform.k,
          y: (clientY - rect.top - viewTransform.y) / viewTransform.k
      };
  };

  // Aumentamos a amostragem para cortes mais precisos
  const getPointsOnBezier = (p0: any, p1: any, p2: any, p3: any, samples = 30) => {
      const pts = [];
      for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const mt = 1 - t;
          const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
          const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
          pts.push([x, y]);
      }
      return pts;
  };

  const vectorPathToCoords = (path: VectorPath): number[][][] => {
      const ring: number[][] = [];
      if (path.nodes.length === 0) return [[]];

      for (let i = 0; i < path.nodes.length; i++) {
          const curr = path.nodes[i];
          const next = path.nodes[(i + 1) % path.nodes.length];
          if (curr.handleOut.x === curr.x && curr.handleOut.y === curr.y && 
              next.handleIn.x === next.x && next.handleIn.y === next.y) {
              ring.push([curr.x, curr.y]);
          } else {
              const curvePts = getPointsOnBezier(
                  {x: curr.x, y: curr.y}, 
                  {x: curr.handleOut.x, y: curr.handleOut.y}, 
                  {x: next.handleIn.x, y: next.handleIn.y}, 
                  {x: next.x, y: next.y}
              );
              curvePts.pop();
              ring.push(...curvePts);
          }
      }
      if (ring.length > 0) ring.push([ring[0][0], ring[0][1]]);
      return [ring];
  };

  const coordsToVectorPath = (coords: any): VectorPath[] => {
      if (!coords || coords.length === 0) return [];
      const results: VectorPath[] = [];
      coords.forEach((poly: any) => {
          poly.forEach((ring: any) => {
              const nodes: VectorNode[] = ring.slice(0, -1).map((pt: any) => ({
                  x: pt[0], y: pt[1], handleIn: {x: pt[0], y: pt[1]}, handleOut: {x: pt[0], y: pt[1]}, type: 'cusp'
              }));
              if (nodes.length >= 3) {
                  results.push({ id: crypto.randomUUID(), nodes, isClosed: true, fill: 'black', isHole: false });
              }
          });
      });
      return results;
  };

  const handleBooleanOp = (op: 'union' | 'hole') => {
      if (selectedPathIds.length < 2) return;
      
      const sortedIndices = selectedPathIds
          .map(id => paths.findIndex(p => p.id === id))
          .sort((a, b) => a - b);
          
      if (op === 'union') {
          const targetPaths = sortedIndices.map(i => paths[i]);
          let resultPoly: any = vectorPathToCoords(targetPaths[0]);
          for (let i = 1; i < targetPaths.length; i++) {
              resultPoly = martinez.union(resultPoly, vectorPathToCoords(targetPaths[i]));
          }
          const newPathsFromOp = coordsToVectorPath(resultPoly);
          const finalPaths = [...paths.filter(p => !selectedPathIds.includes(p.id)), ...newPathsFromOp];
          setPaths(finalPaths); recordHistory(finalPaths); setSelectedPathIds(newPathsFromOp.map(p => p.id));
      } 
      else if (op === 'hole') {
          const topIdx = sortedIndices[sortedIndices.length - 1];
          const cutterPath = paths[topIdx];
          const cutterPoly = vectorPathToCoords(cutterPath);
          
          const otherIds = selectedPathIds.filter(id => id !== cutterPath.id);
          let workingPaths = paths.filter(p => !selectedPathIds.includes(p.id));
          let allNewResults: VectorPath[] = [];

          otherIds.forEach(id => {
              const targetPath = paths.find(p => p.id === id);
              if (!targetPath) return;
              const targetPoly = vectorPathToCoords(targetPath);
              const resultPoly = martinez.diff(targetPoly, cutterPoly);
              const resultVectorPaths = coordsToVectorPath(resultPoly);
              allNewResults.push(...resultVectorPaths);
          });

          const finalPaths = [...workingPaths, ...allNewResults];
          setPaths(finalPaths); 
          recordHistory(finalPaths); 
          setSelectedPathIds(allNewResults.map(p => p.id));
      }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getMousePos(e);
      if (('button' in e && e.button === 1) || ('buttons' in e && e.buttons === 4)) {
          setDragType('pan');
          setStartPan({ x: ('clientX' in e ? e.clientX : (e as any).touches[0].clientX) - viewTransform.x, y: ('clientY' in e ? e.clientY : (e as any).touches[0].clientY) - viewTransform.y });
          return;
      }

      if (tool === 'select') {
          const target = e.target as Element;
          if (target.tagName === 'svg' || target.id === 'grid-rect') {
              if (!isShiftDown) { setSelectedPathIds([]); setSelectedNodeId([]); }
              setDragType('box'); setSelectionBox({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
          }
      } 
      else if (tool === 'pen') {
          if (!activePathId) {
              const newId = crypto.randomUUID();
              const newNode: VectorNode = { 
                  x: pos.x, y: pos.y, 
                  handleIn: {x: pos.x, y: pos.y}, 
                  handleOut: {x: pos.x, y: pos.y}, 
                  type: 'cusp' 
              };
              const newPath: VectorPath = { id: newId, nodes: [newNode], isClosed: false, fill: 'black', isHole: false };
              setPaths(prev => [...prev, newPath]);
              setActivePathId(newId);
              setSelectedPathIds([newId]);
              setSelectedNodeId([{ pathId: newId, index: 0 }]);
              setDragType('pen_new_node');
          } else {
              const path = paths.find(p => p.id === activePathId);
              if (!path) return;
              setPaths(prev => prev.map(p => {
                  if (p.id === activePathId) {
                      const newNode: VectorNode = { 
                          x: pos.x, y: pos.y, 
                          handleIn: {x: pos.x, y: pos.y}, 
                          handleOut: {x: pos.x, y: pos.y}, 
                          type: 'cusp' 
                      };
                      return { ...p, nodes: [...p.nodes, newNode] };
                  }
                  return p;
              }));
              setSelectedNodeId([{ pathId: activePathId, index: path.nodes.length }]);
              setDragType('pen_new_node');
          }
          setIsDragging(true);
      }
      else if (tool === 'brush') {
          setBrushPoints([{x: pos.x, y: pos.y}]);
          const newId = crypto.randomUUID();
          setActivePathId(newId);
          setPaths(prev => [...prev, { id: newId, nodes: [], isClosed: true, fill: 'black', isHole: false }]);
          setIsDragging(true);
      }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getMousePos(e);
      setCursorPos(pos); 

      if (dragType === 'pan') {
          const cx = 'clientX' in e ? e.clientX : (e as any).touches[0].clientX;
          const cy = 'clientY' in e ? e.clientY : (e as any).touches[0].clientY;
          setViewTransform(prev => ({ ...prev, x: cx - startPan.x, y: cy - startPan.y }));
          return;
      }

      if (dragType === 'box' && selectionBox) { 
          setSelectionBox({ ...selectionBox, currentX: pos.x, currentY: pos.y }); 
          return; 
      }

      if (!isDragging) return;

      if (tool === 'brush' && activePathId) {
          const newPoints = [...brushPoints, {x: pos.x, y: pos.y}];
          setBrushPoints(newPoints);
          const outlineNodes = generateBrushOutline(newPoints, brushSize);
          if (outlineNodes.length > 0) setPaths(prev => prev.map(p => p.id === activePathId ? { ...p, nodes: outlineNodes } : p));
          return;
      }

      if (dragType === 'pen_new_node' && activePathId && selectedNodeId.length > 0) {
          setPaths(prev => prev.map(p => {
              if (p.id !== activePathId) return p;
              const newNodes = [...p.nodes];
              const nodeIdx = selectedNodeId[0].index;
              const node = newNodes[nodeIdx];
              const dx = pos.x - node.x;
              const dy = pos.y - node.y;
              newNodes[nodeIdx] = {
                  ...node,
                  type: 'smooth',
                  handleOut: { x: node.x + dx, y: node.y + dy },
                  handleIn: { x: node.x - dx, y: node.y - dy }
              };
              return { ...p, nodes: newNodes };
          }));
          return;
      }

      if (dragType === 'path' && selectedPathIds.length > 0) {
          const dx = pos.x - lastMousePos.x;
          const dy = pos.y - lastMousePos.y;
          setPaths(prev => prev.map(p => {
              if (!selectedPathIds.includes(p.id)) return p;
              const newNodes = p.nodes.map(node => ({
                  ...node,
                  x: node.x + dx,
                  y: node.y + dy,
                  handleIn: { x: node.handleIn.x + dx, y: node.handleIn.y + dy },
                  handleOut: { x: node.handleOut.x + dx, y: node.handleOut.y + dy }
              }));
              return { ...p, nodes: newNodes };
          }));
          setLastMousePos(pos);
          return;
      }

      if (dragType === 'node' && selectedNodeId.length > 0) {
          const primary = selectedNodeId[0];
          const path = paths.find(p => p.id === primary.pathId);
          if (!path) return;
          const dx = pos.x - path.nodes[primary.index].x;
          const dy = pos.y - path.nodes[primary.index].y;
          setPaths(prev => prev.map(p => {
              const nodesInPath = selectedNodeId.filter(sel => sel.pathId === p.id);
              if (nodesInPath.length === 0) return p;
              const newNodes = [...p.nodes];
              nodesInPath.forEach(sel => {
                  const node = newNodes[sel.index];
                  newNodes[sel.index] = { ...node, x: node.x + dx, y: node.y + dy, handleIn: { x: node.handleIn.x + dx, y: node.handleIn.y + dy }, handleOut: { x: node.handleOut.x + dx, y: node.handleOut.y + dy } };
              });
              return { ...p, nodes: newNodes };
          }));
      } else if ((dragType === 'handleIn' || dragType === 'handleOut') && selectedNodeId.length === 1) {
          setPaths(prev => prev.map(p => {
              if (p.id !== selectedNodeId[0].pathId) return p;
              const newNodes = [...p.nodes]; const node = newNodes[selectedNodeId[0].index];
              if (dragType === 'handleIn') {
                  newNodes[selectedNodeId[0].index] = { ...node, handleIn: { x: pos.x, y: pos.y }, handleOut: node.type === 'smooth' ? { x: node.x + (node.x - pos.x), y: node.y + (node.y - pos.y) } : node.handleOut };
              } else {
                  newNodes[selectedNodeId[0].index] = { ...node, handleOut: { x: pos.x, y: pos.y }, handleIn: node.type === 'smooth' ? { x: node.x + (node.x - pos.x), y: node.y + (node.y - pos.y) } : node.handleIn };
              }
              return { ...p, nodes: newNodes };
          }));
      }
  };

  const handleMouseUp = () => {
      if (dragType === 'box' && selectionBox) {
          const x1 = Math.min(selectionBox.startX, selectionBox.currentX); const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
          const y1 = Math.min(selectionBox.startY, selectionBox.currentY); const y2 = Math.max(selectionBox.startY, selectionBox.currentY);
          const nNodes: any[] = []; const nPaths: string[] = [];
          paths.forEach(p => { let sel = false; p.nodes.forEach((n, i) => { if (n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2) { nNodes.push({ pathId: p.id, index: i }); sel = true; } }); if (sel) nPaths.push(p.id); });
          if (isShiftDown) { setSelectedNodeId(prev => [...prev, ...nNodes]); setSelectedPathIds(prev => Array.from(new Set([...prev, ...nPaths]))); }
          else { setSelectedNodeId(nNodes); setSelectedPathIds(nPaths); }
          setSelectionBox(null); setDragType('none'); return;
      }
      
      if (isDragging) { 
          if (tool === 'brush') { setActivePathId(null); setBrushPoints([]); recordHistory(paths); } 
          else if (tool === 'pen') { recordHistory(paths); }
          else if (dragType !== 'none') recordHistory(paths); 
      }
      setIsDragging(false); 
      if (dragType === 'pan') setDragType('none'); 
      else if (tool === 'select' || tool === 'pen') setDragType('none');
  };

  const generateBrushOutline = (points: {x:number, y:number}[], width: number): VectorNode[] => {
      if (points.length < 2) return [];
      const leftSide: {x:number, y:number}[] = [];
      const rightSide: {x:number, y:number}[] = [];
      for (let i = 0; i < points.length; i++) {
          const curr = points[i];
          const next = points[Math.min(i + 1, points.length - 1)];
          const prev = points[Math.max(0, i - 1)];
          let dx = next.x - prev.x;
          let dy = next.y - prev.y;
          if (i === 0) { dx = next.x - curr.x; dy = next.y - curr.y; }
          const len = Math.sqrt(dx*dx + dy*dy);
          if (len === 0) continue;
          const nx = -dy / len; const ny = dx / len;
          const halfWidth = width / 2;
          leftSide.push({ x: curr.x + nx * halfWidth, y: curr.y + ny * halfWidth });
          rightSide.push({ x: curr.x - nx * halfWidth, y: curr.y - ny * halfWidth });
      }
      const createNodes = (pts: {x:number, y:number}[]) => pts.map((p, i, arr) => {
          const prev = arr[i - 1] || p; const next = arr[i + 1] || p;
          const tension = 0.2; const cpMx = (next.x - prev.x) * tension; const cpMy = (next.y - prev.y) * tension;
          return { x: p.x, y: p.y, handleIn: { x: p.x - cpMx, y: p.y - cpMy }, handleOut: { x: p.x + cpMx, y: p.y + cpMy }, type: 'smooth' } as VectorNode;
      });
      return [...createNodes(leftSide), ...createNodes(rightSide.reverse())];
  };

  const closePath = () => {
      if (activePathId) {
          const newPaths = paths.map(p => p.id === activePathId ? { ...p, isClosed: true } : p);
          setPaths(newPaths); recordHistory(newPaths); setActivePathId(null); setSelectedNodeId([]);
      }
  };

  const addShape = (type: 'rect' | 'circle') => {
      const center = CANVAS_SIZE / 2; const size = 200; const half = size / 2; const kappa = 0.552284749831; const offset = half * kappa;
      let nodes: VectorNode[] = [];
      if (type === 'rect') nodes = [{ x: center - half, y: center - half, handleIn: {x: center - half, y: center - half}, handleOut: {x: center - half, y: center - half}, type: 'cusp' }, { x: center + half, y: center - half, handleIn: {x: center + half, y: center - half}, handleOut: {x: center + half, y: center - half}, type: 'cusp' }, { x: center + half, y: center + half, handleIn: {x: center + half, y: center + half}, handleOut: {x: center + half, y: center + half}, type: 'cusp' }, { x: center - half, y: center + half, handleIn: {x: center - half, y: center + half}, handleOut: {x: center - half, y: center + half}, type: 'cusp' }];
      else nodes = [{ x: center, y: center - half, handleIn: {x: center - offset, y: center - half}, handleOut: {x: center + offset, y: center - half}, type: 'smooth' }, { x: center + half, y: center, handleIn: {x: center + half, y: center - offset}, handleOut: {x: center + half, y: center + offset}, type: 'smooth' }, { x: center, y: center + half, handleIn: {x: center + offset, y: center + half}, handleOut: {x: center - offset, y: center + half}, type: 'smooth' }, { x: center - half, y: center, handleIn: {x: center - half, y: center + offset}, handleOut: {x: center - half, y: center - offset}, type: 'smooth' }];
      const nId = crypto.randomUUID(); const nPath: VectorPath = { id: nId, nodes, isClosed: true, fill: 'black', isHole: false };
      const nPaths = [...paths, nPath]; setPaths(nPaths); recordHistory(nPaths); setTool('select'); setShowShapesMenu(false);
  };

  const handleFullFontImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     try {
       const arrayBuffer = await file.arrayBuffer();
       const font = opentype.parse(arrayBuffer);
       const names = font.names.fontFamily;
       if (names && names.en) setFontName(names.en); else setFontName(file.name.replace(/\.[^/.]+$/, ""));
       const newGlyphs: GlyphMap = {};
       const allChars = [...CHAR_SETS.lowercase, ...CHAR_SETS.uppercase, ...CHAR_SETS.numbers, ...CHAR_SETS.accents];
       for (const char of allChars) {
           try {
               const glyph = font.charToGlyph(char);
               const path = glyph.getPath(0, 0, 72); 
               if (path && path.commands.length > 0) {
                   const strokes = convertOpenTypePathToStrokes(path, CANVAS_SIZE, CANVAS_SIZE);
                   if (strokes.length > 0) {
                       const previewUrl = generatePreviewFromStrokes(strokes, 100, 100);
                       newGlyphs[char] = { char, paths: strokes, previewUrl, advanceWidth: 0 };
                   }
               }
           } catch (err) {}
       }
       setGlyphs(newGlyphs);
       alert(`Importação concluída! ${Object.keys(newGlyphs).length} caracteres carregados.`);
     } catch (e: any) { alert("Erro ao importar fonte."); }
     if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSingleCharImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return;
      try {
          const ab = await file.arrayBuffer(); const font = opentype.parse(ab); const glyph = font.charToGlyph(activeChar); const path = glyph.getPath(0, 0, 72);
          if (path && path.commands.length > 0) { const nStrokes = convertOpenTypePathToStrokes(path, CANVAS_SIZE, CANVAS_SIZE); const mPaths = [...paths, ...nStrokes]; setPaths(mPaths); recordHistory(mPaths); }
          else alert(`Caractere '${activeChar}' não encontrado.`);
      } catch (err) { alert("Erro ao importar."); }
      if (singleCharInputRef.current) singleCharInputRef.current.value = '';
  };

  const generateD = (nodes: VectorNode[], closed: boolean) => {
      if (nodes.length === 0) return '';
      let d = `M ${nodes[0].x} ${nodes[0].y}`;
      for (let i = 1; i < nodes.length; i++) {
          const c = nodes[i]; const p = nodes[i-1];
          d += ` C ${p.handleOut.x} ${p.handleOut.y}, ${c.handleIn.x} ${c.handleIn.y}, ${c.x} ${c.y}`;
      }
      if (closed) { const f = nodes[0]; const l = nodes[nodes.length-1]; d += ` C ${l.handleOut.x} ${l.handleOut.y}, ${f.handleIn.x} ${f.handleIn.y}, ${f.x} ${f.y} Z`; }
      return d;
  };

  const handleExport = async () => {
      if (Object.keys(glyphs).length === 0) { alert("Desenhe pelo menos um caractere."); return; }
      try {
          const buf = await generateTTF(fontName, glyphs, spacing); const blob = new Blob([buf], { type: 'font/ttf' }); const url = URL.createObjectURL(blob);
          const link = document.createElement('a'); link.href = url; link.download = `${fontName.replace(/\s+/g, '-')}.ttf`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
      } catch (e) { alert("Erro ao exportar."); }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#09090b] text-white overflow-hidden select-none">
        <div className="shrink-0 border-b border-zinc-800 bg-[#121215]">
            <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Link to="/programs" className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition"><ArrowLeft size={20} /></Link>
                    <div className="flex flex-col"><label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Nome da Fonte</label><input type="text" value={fontName} onChange={(e) => setFontName(e.target.value)} className="bg-transparent text-base font-bold text-white outline-none w-32 placeholder-zinc-600 focus:bg-zinc-800/50 rounded px-1" placeholder="MinhaFonte"/></div>
                    <div className="h-8 w-px bg-zinc-800 mx-2"></div>
                    <div className="flex flex-col"><label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1"><MoveHorizontal size={10} /> Espaçamento</label><div className="flex items-center gap-2"><input type="range" min="0" max="150" value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} className="w-24 h-1.5 bg-zinc-700 rounded-full accent-primary cursor-pointer" /><span className="text-xs font-mono text-primary">{spacing}</span></div></div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border border-zinc-700"><Upload size={14} /> Importar TTF</button>
                    <input type="file" accept=".ttf,.otf" className="hidden" ref={fileInputRef} onChange={handleFullFontImport} />
                    <button onClick={handleExport} className="bg-primary hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-primary/20"><Download size={14} /> Exportar TTF</button>
                </div>
            </div>
            <div className="px-4 py-2 flex items-center justify-between bg-[#0c0c0e] border-t border-zinc-800 relative">
                <div className="flex items-center gap-1">
                    <button onClick={() => {setTool('select'); setActivePathId(null);}} className={`p-2 rounded-lg transition ${tool === 'select' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`} title="Seleção (V)"><MousePointer2 size={18} /></button>
                    <button onClick={() => setTool('pen')} className={`p-2 rounded-lg transition ${tool === 'pen' ? 'bg-primary text-white shadow-glow' : 'text-zinc-400 hover:text-white'}`} title="Ferramenta Caneta Bézier (P)"><PenTool size={18} /></button>
                    <div className="relative" onMouseEnter={() => setShowBrushMenu(true)} onMouseLeave={() => setShowBrushMenu(false)}>
                        <button onClick={() => setTool('brush')} className={`p-2 rounded-lg transition ${tool === 'brush' ? 'bg-primary text-white shadow-glow' : 'text-zinc-400 hover:text-white'}`} title="Pincel Vetorial (B)"><Brush size={18} /></button>
                        {showBrushMenu && (<div className="absolute top-full left-0 mt-2 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 animate-fade-in w-40"><label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Grossura: {brushSize}px</label><input type="range" min="5" max="150" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full h-1.5 bg-zinc-600 rounded-full accent-primary cursor-pointer" /></div>)}
                    </div>
                    <div className="relative">
                        <button onClick={() => setShowShapesMenu(!showShapesMenu)} className={`p-2 rounded-lg transition ${showShapesMenu ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`} title="Formas"><Square size={18} /></button>
                        {showShapesMenu && (<div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg p-1 flex flex-col gap-1 z-50 shadow-xl animate-fade-in"><button onClick={() => addShape('rect')} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 rounded text-xs text-white"><Square size={14} /> Quadrado</button><button onClick={() => addShape('circle')} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700 rounded text-xs text-white"><Circle size={14} /> Círculo</button></div>)}
                    </div>
                    <div className="w-px h-6 bg-zinc-800 mx-2"></div>
                    <button onClick={() => singleCharInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg" title={`Importar letra '${activeChar}'`}><FolderInput size={18} /></button>
                    <input type="file" accept=".ttf,.otf" className="hidden" ref={singleCharInputRef} onChange={handleSingleCharImport} />
                    <div className="w-px h-6 bg-zinc-800 mx-2"></div>
                    <button onClick={undo} disabled={historyIndex === 0} className="p-2 text-zinc-400 hover:text-white disabled:opacity-30"><RotateCcw size={18} /></button>
                    <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 text-zinc-400 hover:text-white disabled:opacity-30"><RotateCw size={18} /></button>
                    <div className="w-px h-6 bg-zinc-800 mx-2"></div>
                    <button onClick={() => handleLayerOrder('down')} className="p-2 text-zinc-400 hover:text-white" title="Enviar para Trás (Ctrl+Seta Baixo)"><ArrowDownToLine size={18} /></button>
                    <button onClick={() => handleLayerOrder('up')} className="p-2 text-zinc-400 hover:text-white" title="Trazer para Frente (Ctrl+Seta Cima)"><ArrowUpToLine size={18} /></button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setViewTransform(prev => ({...prev, k: prev.k * 0.8}))} className="p-2 text-zinc-400 hover:text-white"><ZoomOut size={16} /></button>
                    <span className="text-xs font-mono text-zinc-500 w-12 text-center">{(viewTransform.k * 100).toFixed(0)}%</span>
                    <button onClick={() => setViewTransform(prev => ({...prev, k: prev.k * 1.2}))} className="p-2 text-zinc-400 hover:text-white"><ZoomIn size={16} /></button>
                </div>
            </div>
        </div>
        <div className="flex-1 relative flex overflow-hidden">
            <div className="w-6 bg-[#0c0c0e] border-r border-zinc-800 relative hidden md:block overflow-hidden">
                {Array.from({ length: 50 }).map((_, i) => (<div key={i} className="absolute right-0 h-px bg-zinc-700 w-2" style={{ top: (i * 100 * viewTransform.k) + viewTransform.y }}></div>))}
                <div className="absolute right-0 h-0.5 bg-primary w-full z-20 pointer-events-none" style={{ top: (cursorPos.y * viewTransform.k) + viewTransform.y }}></div>
            </div>
            <div className="flex-1 flex flex-col relative">
                <div className="h-6 bg-[#0c0c0e] border-b border-zinc-800 relative hidden md:block overflow-hidden">
                    {Array.from({ length: 50 }).map((_, i) => (<div key={i} className="absolute bottom-0 w-px bg-zinc-700 h-2" style={{ left: (i * 100 * viewTransform.k) + viewTransform.x }}></div>))}
                    <div className="absolute bottom-0 w-0.5 bg-primary h-full z-20 pointer-events-none" style={{ left: (cursorPos.x * viewTransform.k) + viewTransform.x }}></div>
                </div>
                <div ref={containerRef} className="flex-1 relative bg-[#1a1a1a] overflow-hidden cursor-crosshair touch-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} onWheel={handleWheel}>
                    <svg width="100%" height="100%" className="block">
                        <defs><pattern id="grid" width={100 * viewTransform.k} height={100 * viewTransform.k} patternUnits="userSpaceOnUse" x={viewTransform.x} y={viewTransform.y}><path d={`M ${100 * viewTransform.k} 0 L 0 0 0 ${100 * viewTransform.k}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} /></pattern></defs>
                        <rect id="grid-rect" width="100%" height="100%" fill="url(#grid)" />
                        <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.k})`}>
                            <rect x="0" y="0" width={CANVAS_SIZE} height={CANVAS_SIZE} fill="none" stroke="rgba(255,255,255,0.1)" strokeDasharray="5 5" />
                            <text x="500" y="800" textAnchor="middle" fontSize="800" fill="white" opacity="0.03" pointerEvents="none" fontFamily="serif">{activeChar}</text>
                            <line x1={-5000} y1={BASELINE_Y} x2={5000} y2={BASELINE_Y} stroke="#ef4444" strokeWidth={2} opacity={0.3} />
                            <line x1={-5000} y1={ASCENDER_Y} x2={5000} y2={ASCENDER_Y} stroke="#3b82f6" strokeWidth={2} opacity={0.3} />
                            
                            {/* CAMADA DE PREENCHIMENTO UNIFICADA: 
                                Para furos funcionarem visualmente, todos os caminhos devem estar no mesmo elemento 'd' 
                                com a regra de preenchimento 'evenodd'. 
                            */}
                            <path 
                                d={paths.map(p => generateD(p.nodes, p.isClosed)).join(' ')} 
                                fill="white" 
                                fillRule="evenodd" 
                                fillOpacity={0.9} 
                                pointerEvents="none" 
                            />

                            {/* ELEMENTOS DE INTERAÇÃO (TRANSPARENTES) */}
                            {paths.map(path => {
                                const isSelected = selectedPathIds.includes(path.id);
                                const isTop = path.id === topSelectedId;
                                
                                return (
                                    <path 
                                        key={path.id} 
                                        d={generateD(path.nodes, path.isClosed)} 
                                        fill="transparent" 
                                        stroke={isTop ? '#ef4444' : (isSelected || activePathId === path.id ? '#3b82f6' : 'none')} 
                                        strokeWidth={isTop ? 4 : 3} 
                                        style={{ pointerEvents: tool === 'pen' ? 'none' : 'auto' }} 
                                        onMouseDown={(e) => { 
                                            e.stopPropagation(); 
                                            const pos = getMousePos(e);
                                            if (tool === 'select') { 
                                                if (isShiftDown) setSelectedPathIds(prev => prev.includes(path.id) ? prev.filter(id => id !== path.id) : [...prev, path.id]); 
                                                else { 
                                                    if (!selectedPathIds.includes(path.id)) {
                                                        setSelectedPathIds([path.id]); 
                                                    }
                                                    setSelectedNodeId([]); 
                                                    setDragType('path'); 
                                                    setLastMousePos(pos);
                                                    setIsDragging(true); 
                                                } 
                                            } 
                                        }} 
                                        className="cursor-pointer" 
                                    />
                                );
                            })}
                            
                            {/* Rubber Band */}
                            {tool === 'pen' && activePathId && paths.find(p => p.id === activePathId) && !paths.find(p => p.id === activePathId)?.isClosed && (() => {
                                const activePath = paths.find(p => p.id === activePathId)!;
                                const lastNode = activePath.nodes[activePath.nodes.length - 1];
                                const isCurve = lastNode.handleOut.x !== lastNode.x || lastNode.handleOut.y !== lastNode.y;
                                const d = isCurve 
                                    ? `M ${lastNode.x} ${lastNode.y} C ${lastNode.handleOut.x} ${lastNode.handleOut.y}, ${cursorPos.x} ${cursorPos.y}, ${cursorPos.x} ${cursorPos.y}`
                                    : `M ${lastNode.x} ${lastNode.y} L ${cursorPos.x} ${cursorPos.y}`;
                                return <path d={d} fill="none" stroke="rgba(59,130,246,0.8)" strokeWidth={2} strokeDasharray="5 5" pointerEvents="none" />;
                            })()}

                            {/* UI de Seleção de Nós */}
                            {(selectedPathIds.length > 0 || activePathId) && paths.map(p => {
                                if (!selectedPathIds.includes(p.id) && activePathId !== p.id) return null;
                                return p.nodes.map((node, i) => {
                                    const isNodeSelected = selectedNodeId.some(n => n.pathId === p.id && n.index === i);
                                    const isLastCreated = activePathId === p.id && i === p.nodes.length - 1;
                                    return (<g key={`${p.id}-${i}`}>{isNodeSelected && (<><line x1={node.x} y1={node.y} x2={node.handleIn.x} y2={node.handleIn.y} stroke="#93c5fd" strokeWidth={1} /><line x1={node.x} y1={node.y} x2={node.handleOut.x} y2={node.handleOut.y} stroke="#93c5fd" strokeWidth={1} /><circle cx={node.handleIn.x} cy={node.handleIn.y} r={6/viewTransform.k} fill="#93c5fd" stroke="black" strokeWidth={1} onMouseDown={(e) => { e.stopPropagation(); setSelectedNodeId([{pathId: p.id, index: i}]); setDragType('handleIn'); setIsDragging(true); }} className="cursor-pointer" /><circle cx={node.handleOut.x} cy={node.handleOut.y} r={6/viewTransform.k} fill="#93c5fd" stroke="black" strokeWidth={1} onMouseDown={(e) => { e.stopPropagation(); setSelectedNodeId([{pathId: p.id, index: i}]); setDragType('handleOut'); setIsDragging(true); }} className="cursor-pointer" /></>)}<rect x={node.x - (6/viewTransform.k)} y={node.y - (6/viewTransform.k)} width={12/viewTransform.k} height={12/viewTransform.k} fill={isNodeSelected ? '#3b82f6' : (activePathId === p.id && i === 0 ? '#ef4444' : 'white')} stroke="black" strokeWidth={1} onDoubleClick={(e) => {
                                        if (tool === 'pen' && isLastCreated) {
                                            e.stopPropagation();
                                            setPaths(prev => prev.map(path => {
                                                if (path.id === activePathId) {
                                                    const newNodes = [...path.nodes];
                                                    newNodes[i] = { ...newNodes[i], handleOut: { x: newNodes[i].x, y: newNodes[i].y } };
                                                    return { ...path, nodes: newNodes };
                                                }
                                                return path;
                                            }));
                                        }
                                    }} onMouseDown={(e) => { 
                                        e.stopPropagation(); 
                                        if (tool === 'pen' && activePathId === p.id && i === 0) { 
                                            closePath(); 
                                        } else if (tool === 'select') { 
                                            if (isShiftDown) { 
                                                if (selectedNodeId.find(n => n.pathId === p.id && n.index === i)) setSelectedNodeId(prev => prev.filter(n => !(n.pathId === p.id && n.index === i))); 
                                                else setSelectedNodeId(prev => [...prev, { pathId: p.id, index: i }]); 
                                            } else { 
                                                setSelectedNodeId([{ pathId: p.id, index: i }]); 
                                                setSelectedPathIds([p.id]); 
                                            } 
                                            setDragType('node'); 
                                            setIsDragging(true); 
                                        } 
                                    }} className="cursor-pointer" /></g>);
                                });
                            })}

                            {dragType === 'box' && selectionBox && (<rect x={Math.min(selectionBox.startX, selectionBox.currentX)} y={Math.min(selectionBox.startY, selectionBox.currentY)} width={Math.abs(selectionBox.currentX - selectionBox.startX)} height={Math.abs(selectionBox.currentY - selectionBox.startY)} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth={1 / viewTransform.k} strokeDasharray={`${5/viewTransform.k} ${5/viewTransform.k}`} />)}
                        </g>
                    </svg>
                    {(selectedPathIds.length > 0 || activePathId) && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl animate-fade-in z-30 overflow-x-auto max-w-[90vw] custom-scrollbar">
                        <button onClick={() => handleLayerOrder('down')} className="text-zinc-400 hover:text-white" title="Enviar para Trás (Ctrl+Seta Baixo)"><ArrowDownToLine size={16} /></button>
                        <button onClick={() => handleLayerOrder('up')} className="text-zinc-400 hover:text-white" title="Trazer para Frente (Ctrl+Seta Cima)"><ArrowUpToLine size={16} /></button>
                        {selectedPathIds.length > 1 && (
                          <>
                            <div className="w-px h-4 bg-zinc-700"></div>
                            <button onClick={() => handleBooleanOp('union')} className="flex items-center gap-2 text-[10px] font-bold text-purple-400 hover:text-purple-300 whitespace-nowrap" title="Unir formas"><Combine size={14} /> Soldar</button>
                            <button onClick={() => handleBooleanOp('hole')} className="flex items-center gap-2 text-[10px] font-bold text-orange-400 hover:text-orange-300 whitespace-nowrap" title="O de cima vira buraco no de baixo"><Scissors size={14} /> Criar Buraco</button>
                          </>
                        )}
                        <div className="w-px h-4 bg-zinc-700"></div>
                        {activePathId && (selectedPathIds.includes(activePathId) || activePathId) && (
                          <button onClick={closePath} className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 whitespace-nowrap"><CornerUpRight size={14} /> Fechar</button>
                        )}
                        <button onClick={() => { const nPaths = paths.filter(p => !selectedPathIds.includes(p.id)); setPaths(nPaths); recordHistory(nPaths); setSelectedPathIds([]); setSelectedNodeId([]); setActivePathId(null); }} className="flex items-center gap-2 text-[10px] font-bold text-red-400 whitespace-nowrap"><Trash2 size={14} /></button>
                      </div>
                    )}
                </div>
            </div>
        </div>
        <div className="h-48 bg-[#121215] border-t border-zinc-800 flex flex-col shrink-0">
            <div className="flex border-b border-zinc-800">
                <button onClick={() => setActiveTab('lowercase')} className={`flex-1 py-3 text-xs font-bold uppercase transition ${activeTab === 'lowercase' ? 'bg-zinc-800 text-white border-b-2 border-primary' : 'text-zinc-500 hover:text-zinc-300'}`}>a-z</button>
                <button onClick={() => setActiveTab('uppercase')} className={`flex-1 py-3 text-xs font-bold uppercase transition ${activeTab === 'uppercase' ? 'bg-zinc-800 text-white border-b-2 border-primary' : 'text-zinc-500 hover:text-zinc-300'}`}><CaseSensitive size={14} className="inline mr-1"/> A-Z</button>
                <button onClick={() => setActiveTab('numbers')} className={`flex-1 py-3 text-xs font-bold uppercase transition ${activeTab === 'numbers' ? 'bg-zinc-800 text-white border-b-2 border-primary' : 'text-zinc-500 hover:text-zinc-300'}`}><Hash size={14} className="inline mr-1"/> 0-9</button>
                <button onClick={() => setActiveTab('accents')} className={`flex-1 py-3 text-xs font-bold uppercase transition ${activeTab === 'accents' ? 'bg-zinc-800 text-white border-b-2 border-primary' : 'text-zinc-500 hover:text-zinc-300'}`}><Languages size={14} className="inline mr-1"/> Á-Ç</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                    {CHAR_SETS[activeTab].map(char => {
                        const hD = !!glyphs[char]; const iA = activeChar === char;
                        return (<button key={char} onClick={() => setActiveChar(char)} className={`aspect-square rounded-lg border flex items-center justify-center relative group transition-all ${iA ? 'bg-primary text-white border-primary shadow-lg scale-110 z-10' : hD ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400'}`}><span className="text-lg font-bold">{char}</span>{hD && (<div className="absolute inset-0 p-1 opacity-50 pointer-events-none"><img src={glyphs[char].previewUrl} className="w-full h-full object-contain invert" /></div>)}</button>);
                    })}
                </div>
            </div>
        </div>
    </div>
  );
}
