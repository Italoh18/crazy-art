
import opentype from 'opentype.js';
import * as martinez from 'martinez-polygon-clipping';
import { GlyphMap, Stroke, Point } from '../types';

// Configurações da fonte
const UNITS_PER_EM = 1000;
const ASCENDER = 800;
const DESCENDER = -200;
const CANVAS_SIZE = 500;
const STROKE_WIDTH_CANVAS = 15;

const FONT_SCALE = UNITS_PER_EM / CANVAS_SIZE;

// Transforma coordenadas do Canvas (Y para baixo) para Fonte (Y para cima)
const transformCoordinate = (val: number, isY: boolean): number => {
  if (isY) {
    const baselineY = CANVAS_SIZE * 0.8;
    return (baselineY - val) * FONT_SCALE;
  }
  return val * FONT_SCALE;
};

// --- Funções Geométricas Auxiliares ---

const add = (p1: Point, p2: Point): Point => ({ x: p1.x + p2.x, y: p1.y + p2.y });
const sub = (p1: Point, p2: Point): Point => ({ x: p1.x - p2.x, y: p1.y - p2.y });
const mul = (p: Point, s: number): Point => ({ x: p.x * s, y: p.y * s });
const normalize = (p: Point): Point => {
  const len = Math.sqrt(p.x * p.x + p.y * p.y);
  return len === 0 ? { x: 0, y: 0 } : { x: p.x / len, y: p.y / len };
};
const perp = (p: Point): Point => ({ x: -p.y, y: p.x });

/**
 * Expande uma linha (stroke) em um polígono fechado (outline points).
 * Retorna Array de Points no sistema de coordenadas do CANVAS.
 */
const getStrokeOutline = (points: Point[], width: number, isClosed: boolean): Point[] => {
  if (points.length < 2) return [];

  const halfWidth = width / 2;
  const leftSide: Point[] = [];
  const rightSide: Point[] = [];

  for (let i = 0; i < points.length; i++) {
    let normal: Point = { x: 0, y: 0 };
    
    // Vetor anterior
    if (i > 0) {
      const vPrev = normalize(sub(points[i], points[i-1]));
      normal = add(normal, perp(vPrev));
    }
    
    // Vetor seguinte
    if (i < points.length - 1) {
      const vNext = normalize(sub(points[i+1], points[i]));
      normal = add(normal, perp(vNext));
    } else if (isClosed && i === points.length - 1) {
       // Fechamento suave
       const vNext = normalize(sub(points[1], points[0])); 
       normal = add(normal, perp(vNext));
    }

    normal = normalize(normal);
    if (normal.x === 0 && normal.y === 0) normal = {x: 1, y: 0}; // Fallback

    const p = points[i];
    leftSide.push(add(p, mul(normal, halfWidth)));
    rightSide.push(sub(p, mul(normal, halfWidth)));
  }

  // Montar polígono fechado (sentido anti-horário no canvas visual)
  const polygon = [...leftSide];
  for (let i = rightSide.length - 1; i >= 0; i--) {
    polygon.push(rightSide[i]);
  }
  
  // Fechar o loop explicitamente
  if (polygon.length > 0) {
      const first = polygon[0];
      const last = polygon[polygon.length - 1];
      if (first.x !== last.x || first.y !== last.y) {
          polygon.push(first);
      }
  }

  return polygon;
};

const getBezierPoints = (p0: Point, p1: Point, p2: Point): Point[] => {
  const segments = 20;
  const points: Point[] = [];
  for(let i=0; i<=segments; i++) {
    const t = i / segments;
    const invT = 1 - t;
    const x = (invT * invT * p0.x) + (2 * invT * t * p1.x) + (t * t * p2.x);
    const y = (invT * invT * p0.y) + (2 * invT * t * p1.y) + (t * t * p2.y);
    points.push({x, y});
  }
  return points;
};

/**
 * Converte um Stroke do app em um Formato GeoJSON Polygon para a biblioteca Martinez.
 * Formato: [[[x,y], [x,y], ...]] (Array de Aneis, onde o primeiro é o externo)
 */
const strokeToGeoJsonPolygon = (stroke: Stroke): number[][][] | null => {
    let points: Point[] = [];

    // 1. Obter os pontos brutos ou expandidos
    if (stroke.filled) {
        // Se é uma forma preenchida, usamos os pontos diretos
        if (stroke.type === 'bezier' && stroke.points.length === 3) {
            // Bezier preenchido (raro na UI atual, mas suportado)
            points = getBezierPoints(stroke.points[0], stroke.points[1], stroke.points[2]);
            points.push(points[0]); 
        } else {
            points = [...stroke.points];
            if (points.length > 0) {
                const first = points[0];
                const last = points[points.length -1];
                if (first.x !== last.x || first.y !== last.y) {
                    points.push(first);
                }
            }
        }
    } else {
        // Se é um traço (outline), precisamos expandir para criar espessura
        // USA A ESPESSURA DEFINIDA NO STROKE OU O PADRÃO
        const strokeWidth = stroke.width || STROKE_WIDTH_CANVAS;

        let basePathPoints = stroke.points;
        if (stroke.type === 'bezier' && stroke.points.length === 3) {
            basePathPoints = getBezierPoints(stroke.points[0], stroke.points[1], stroke.points[2]);
        }
        points = getStrokeOutline(basePathPoints, strokeWidth, !!stroke.isClosed);
    }

    if (points.length < 3) return null;

    // Converter para array de coordenadas [x, y]
    const coords = points.map(p => [p.x, p.y]);
    
    // GeoJSON Polygon structure: [ [ [x,y]... ] ]
    return [coords];
};

// --- NOVAS FUNÇÕES PARA IMPORTAÇÃO E DETECÇÃO DE BURACOS ---

// Verifica se um ponto está dentro de um polígono (Ray Casting)
const isPointInPolygon = (point: Point, vs: Point[]) => {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].x, yi = vs[i].y;
        const xj = vs[j].x, yj = vs[j].y;
        
        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// Verifica se um Stroke (polígono) está totalmente contido dentro de outro
const isStrokeContained = (inner: Stroke, outer: Stroke): boolean => {
    // Verifica apenas o primeiro ponto para simplificar (funciona bem para fontes)
    if (inner.points.length === 0 || outer.points.length === 0) return false;
    return isPointInPolygon(inner.points[0], outer.points);
};

// Converte comandos de OpenType Path para Strokes (com detecção de buracos)
export const convertOpenTypePathToStrokes = (path: opentype.Path, canvasW: number, canvasH: number): Stroke[] => {
    const strokes: Stroke[] = [];
    let currentPoints: Point[] = [];
    
    const bbox = path.getBoundingBox();
    const glyphW = bbox.x2 - bbox.x1;
    const glyphH = bbox.y2 - bbox.y1;
    
    // Centraliza no Canvas (Scale & Translate)
    const padding = 100;
    const availableW = canvasW - padding;
    const availableH = canvasH - padding;
    const scale = Math.min(availableW / glyphW, availableH / glyphH);
    
    const offsetX = (canvasW - glyphW * scale) / 2 - bbox.x1 * scale;
    const offsetY = (canvasH - glyphH * scale) / 2 - bbox.y1 * scale;

    // 1. Extrair todos os contornos (sub-paths)
    path.commands.forEach((cmd: any) => {
        if (cmd.type === 'M') {
            if (currentPoints.length > 0) {
                strokes.push({ points: currentPoints, type: 'shape', filled: true, isClosed: true, width: 15 });
                currentPoints = [];
            }
            // Coordenadas OpenType (Y cresce pra baixo em getPath ou precisa inverter dependendo da fonte)
            // Aqui assumimos que o path já está em coordenadas visuais
            currentPoints.push({ x: cmd.x * scale + offsetX, y: cmd.y * scale + offsetY });
        } else if (cmd.type === 'L') {
            currentPoints.push({ x: cmd.x * scale + offsetX, y: cmd.y * scale + offsetY });
        } else if (cmd.type === 'Q') {
            const last = currentPoints[currentPoints.length - 1];
            if (last) {
                for (let t = 0.1; t <= 1; t += 0.1) {
                    const x = (1-t)**2 * last.x + 2*(1-t)*t*(cmd.x1 * scale + offsetX) + t**2*(cmd.x * scale + offsetX);
                    const y = (1-t)**2 * last.y + 2*(1-t)*t*(cmd.y1 * scale + offsetY) + t**2*(cmd.y * scale + offsetY);
                    currentPoints.push({ x, y });
                }
            }
        } else if (cmd.type === 'C') {
            const last = currentPoints[currentPoints.length - 1];
            if (last) {
                for (let t = 0.1; t <= 1; t += 0.1) {
                    const x = (1-t)**3 * last.x + 3*(1-t)**2*t*(cmd.x1 * scale + offsetX) + 3*(1-t)*t**2*(cmd.x2 * scale + offsetX) + t**3*(cmd.x * scale + offsetX);
                    const y = (1-t)**3 * last.y + 3*(1-t)**2*t*(cmd.y1 * scale + offsetY) + 3*(1-t)*t**2*(cmd.y2 * scale + offsetY) + t**3*(cmd.y * scale + offsetY);
                    currentPoints.push({ x, y });
                }
            }
        } else if (cmd.type === 'Z') {
            // Fecha explicitamente se necessário
            if (currentPoints.length > 0) {
                const first = currentPoints[0];
                const last = currentPoints[currentPoints.length - 1];
                if (first.x !== last.x || first.y !== last.y) {
                    currentPoints.push({ x: first.x, y: first.y });
                }
            }
        }
    });

    if (currentPoints.length > 0) {
        strokes.push({ points: currentPoints, type: 'shape', filled: true, isClosed: true, width: 15 });
    }

    // 2. Detectar Buracos (Holes)
    // Ordena por área (bounding box size) para garantir que verificamos menores dentro de maiores
    // Simplificação: Ordena pelo minX do primeiro ponto (instável) ou melhor, não ordena, verifica N x N
    
    // Algoritmo: Se um stroke está totalmente contido em outro, e não está contido em um buraco desse outro...
    // Simplificado: Contar quantos polígonos contém este stroke. Se ímpar -> Buraco. (Regra Even-Odd)
    // Se estiver contido em 1 -> Buraco. Em 2 -> Sólido.
    
    const processedStrokes = strokes.map((s, index) => {
        let containmentCount = 0;
        strokes.forEach((other, otherIndex) => {
            if (index !== otherIndex) {
                if (isStrokeContained(s, other)) {
                    containmentCount++;
                }
            }
        });
        
        // Se está dentro de um número ímpar de formas, é um buraco (para fontes simples)
        // Nível 0 (fora) -> Solido
        // Nível 1 (dentro de 0) -> Buraco
        // Nível 2 (dentro de 1) -> Solido
        const isHole = containmentCount % 2 !== 0;
        return { ...s, isHole };
    });

    return processedStrokes;
};

// Gera Preview Base64 de um conjunto de Strokes
export const generatePreviewFromStrokes = (strokes: Stroke[], width: number, height: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, width, height);
    
    // Desenha formas
    strokes.forEach(stroke => {
        if (stroke.points.length === 0) return;
        
        ctx.globalCompositeOperation = stroke.isHole ? 'destination-out' : 'source-over';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = stroke.width || 15;
        
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        if (stroke.isClosed) ctx.closePath();
        
        if (stroke.filled) ctx.fill(); else ctx.stroke();
    });

    return canvas.toDataURL('image/png');
};

export const generateTTF = async (fontName: string, glyphs: GlyphMap): Promise<ArrayBuffer> => {
  const notdefPath = new opentype.Path();
  notdefPath.moveTo(200, 0);
  notdefPath.lineTo(200, 700);
  notdefPath.lineTo(600, 700);
  notdefPath.lineTo(600, 0);
  notdefPath.close();
  
  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 800,
    path: notdefPath
  });

  const fontGlyphs = [notdefGlyph];

  Object.values(glyphs).forEach(data => {
    if (data.strokes.length === 0) return;

    // Geometria acumulada (MultiPolygon)
    let combinedGeometry: any = []; 
    // Buracos acumulados para subtração
    let holeGeometry: any = [];

    data.strokes.forEach(stroke => {
        const poly = strokeToGeoJsonPolygon(stroke);
        if (poly) {
            if (stroke.isHole) {
                // Adiciona à geometria de buracos
                if (holeGeometry.length === 0) holeGeometry = [poly];
                else {
                    try { holeGeometry = martinez.union(holeGeometry, [poly]); } 
                    catch (e) { holeGeometry.push(poly); }
                }
            } else {
                // Adiciona à geometria sólida
                if (combinedGeometry.length === 0) combinedGeometry = [poly]; 
                else {
                    try { combinedGeometry = martinez.union(combinedGeometry, [poly]); } 
                    catch (e) { console.error("Erro na união:", e); combinedGeometry.push(poly); }
                }
            }
        }
    });

    // Subtrair buracos da geometria sólida
    if (holeGeometry.length > 0 && combinedGeometry.length > 0) {
        try {
            combinedGeometry = martinez.diff(combinedGeometry, holeGeometry);
        } catch (e) {
            console.error("Erro ao criar buracos na exportação:", e);
        }
    }

    // Converter geometria unificada de volta para OpenType Path
    const finalPath = new opentype.Path();

    if (Array.isArray(combinedGeometry)) {
        combinedGeometry.forEach((polygon: any) => {
            if (Array.isArray(polygon)) {
                polygon.forEach((ring: any) => {
                    if (Array.isArray(ring) && ring.length > 0) {
                        const start = { x: ring[0][0], y: ring[0][1] };
                        const startT = { 
                            x: transformCoordinate(start.x, false), 
                            y: transformCoordinate(start.y, true) 
                        };
                        
                        finalPath.moveTo(startT.x, startT.y);

                        for (let i = 1; i < ring.length; i++) {
                            const p = { x: ring[i][0], y: ring[i][1] };
                            const ptT = {
                                x: transformCoordinate(p.x, false),
                                y: transformCoordinate(p.y, true)
                            };
                            finalPath.lineTo(ptT.x, ptT.y);
                        }
                        finalPath.close();
                    }
                });
            }
        });
    }
    
    const advanceWidth = UNITS_PER_EM * 0.6;

    const glyph = new opentype.Glyph({
      name: data.char,
      unicode: data.char.charCodeAt(0),
      advanceWidth: advanceWidth,
      path: finalPath
    });

    fontGlyphs.push(glyph);
  });

  const font = new opentype.Font({
    familyName: fontName || 'MyCustomFont',
    styleName: 'Regular',
    unitsPerEm: UNITS_PER_EM,
    ascender: ASCENDER,
    descender: DESCENDER,
    glyphs: fontGlyphs
  });

  return font.toArrayBuffer();
};
