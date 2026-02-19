
import opentype from 'opentype.js';
import { union, diff } from 'martinez-polygon-clipping';
import { GlyphMap, Stroke, Point } from '../types';

// Configurações da fonte
const UNITS_PER_EM = 1000;
const ASCENDER = 800;
const DESCENDER = -200;
const CANVAS_SIZE = 500;

// Escala para converter coordenadas do Canvas (500px) para unidades da Fonte (1000upm)
const FONT_SCALE = UNITS_PER_EM / CANVAS_SIZE;

// --- Funções Geométricas Auxiliares ---

// Calcula a área assinada de um polígono. 
// > 0: Sentido Horário (Clockwise) - assumindo Y para cima
// < 0: Sentido Anti-Horário (Counter-Clockwise)
const getPolygonSignedArea = (points: Point[]): number => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += (points[j].x - points[i].x) * (points[j].y + points[i].y);
  }
  return area / 2;
};

// Transforma ponto do Canvas (Y+ down) para Fonte (Y+ up) e escala
const transformPoint = (p: Point): Point => {
  const baselineY = CANVAS_SIZE * 0.8; // Linha de base no canvas
  return {
    x: p.x * FONT_SCALE,
    y: (baselineY - p.y) * FONT_SCALE // Inverte Y para formato de fonte e ajusta escala
  };
};

const getBezierPoints = (p0: Point, p1: Point, p2: Point): Point[] => {
  const segments = 10; 
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
 * Gera o contorno (outline) de um stroke.
 * Retorna os pontos já transformados para o sistema de coordenadas da fonte.
 */
const getStrokePathPoints = (stroke: Stroke): Point[] => {
  let rawPoints: Point[] = [];

  // 1. Obter pontos brutos do stroke
  if (stroke.type === 'bezier' && stroke.points.length === 3) {
    rawPoints = getBezierPoints(stroke.points[0], stroke.points[1], stroke.points[2]);
  } else {
    rawPoints = stroke.points;
  }

  if (rawPoints.length < 2) return [];

  // 2. Se for "filled" (forma fechada desenhada com ferramenta de forma), usamos os pontos diretos.
  // Se for "freehand" (linha ou brush), precisamos criar a espessura (outline) para virar um polígono.
  let outlinePoints: Point[] = [];

  if (stroke.filled && stroke.type === 'shape') {
    outlinePoints = rawPoints.map(transformPoint);
  } else {
    // Expandir linha para polígono (simples)
    const width = (stroke.width || 15) * FONT_SCALE; 
    const halfWidth = width / 2;
    
    // Transformar para coord fonte primeiro
    const path = rawPoints.map(transformPoint);
    
    const leftSide: Point[] = [];
    const rightSide: Point[] = [];

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i+1];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len === 0) continue;

        const nx = -dy / len * halfWidth;
        const ny = dx / len * halfWidth;

        leftSide.push({ x: p1.x + nx, y: p1.y + ny });
        rightSide.push({ x: p1.x - nx, y: p1.y - ny });
        
        if (i === path.length - 2) {
            leftSide.push({ x: p2.x + nx, y: p2.y + ny });
            rightSide.push({ x: p2.x - nx, y: p2.y - ny });
        }
    }
    
    outlinePoints = [...leftSide, ...rightSide.reverse()];
  }

  // Fechar polígono
  if (outlinePoints.length > 0) {
      const first = outlinePoints[0];
      const last = outlinePoints[outlinePoints.length - 1];
      if (first.x !== last.x || first.y !== last.y) {
          outlinePoints.push(first);
      }
  }

  return outlinePoints;
};

// Gera Preview Base64 (Mantém lógica visual do Canvas)
export const generatePreviewFromStrokes = (strokes: Stroke[], width: number, height: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, width, height);
    
    strokes.forEach(stroke => {
        if (stroke.points.length === 0) return;
        
        ctx.globalCompositeOperation = stroke.isHole ? 'destination-out' : 'source-over';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
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
    });

    return canvas.toDataURL('image/png');
};

/**
 * Converte um Path do OpenType.js em Strokes compatíveis com o editor.
 */
export const convertOpenTypePathToStrokes = (path: opentype.Path, canvasW: number, canvasH: number): Stroke[] => {
    const strokes: Stroke[] = [];
    let currentPoints: Point[] = [];

    path.commands.forEach(cmd => {
        switch (cmd.type) {
            case 'M': 
                if (currentPoints.length > 0) {
                    strokes.push({ points: currentPoints, type: 'shape', filled: true, isClosed: true, width: 1 });
                    currentPoints = [];
                }
                currentPoints.push({ x: cmd.x, y: cmd.y });
                break;
            case 'L': 
                currentPoints.push({ x: cmd.x, y: cmd.y });
                break;
            case 'Q': 
                if (currentPoints.length > 0) {
                    const p0 = currentPoints[currentPoints.length - 1];
                    for (let t = 0.1; t <= 1; t += 0.1) {
                        const invT = 1 - t;
                        const x = (invT * invT * p0.x) + (2 * invT * t * cmd.x1) + (t * t * cmd.x);
                        const y = (invT * invT * p0.y) + (2 * invT * t * cmd.y1) + (t * t * cmd.y);
                        currentPoints.push({ x, y });
                    }
                }
                break;
            case 'C': 
                if (currentPoints.length > 0) {
                    const p0 = currentPoints[currentPoints.length - 1];
                    for (let t = 0.1; t <= 1; t += 0.1) {
                        const invT = 1 - t;
                        const x = Math.pow(invT, 3) * p0.x + 3 * Math.pow(invT, 2) * t * cmd.x1 + 3 * invT * Math.pow(t, 2) * cmd.x2 + Math.pow(t, 3) * cmd.x;
                        const y = Math.pow(invT, 3) * p0.y + 3 * Math.pow(invT, 2) * t * cmd.y1 + 3 * invT * Math.pow(t, 2) * cmd.y2 + Math.pow(t, 3) * cmd.y;
                        currentPoints.push({ x, y });
                    }
                }
                break;
            case 'Z': 
                if (currentPoints.length > 0) {
                    strokes.push({ points: currentPoints, type: 'shape', filled: true, isClosed: true, width: 1 });
                    currentPoints = [];
                }
                break;
        }
    });

    if (currentPoints.length > 0) {
        strokes.push({ points: currentPoints, type: 'shape', filled: true, isClosed: true, width: 1 });
    }

    if (strokes.length === 0) return [];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    strokes.forEach(s => s.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }));

    const glyphW = maxX - minX;
    const glyphH = maxY - minY;
    
    const padding = 60;
    const availableW = canvasW - (padding * 2);
    const availableH = canvasH - (padding * 2);

    const scale = Math.min(availableW / glyphW, availableH / glyphH);
    
    const offsetX = (canvasW - (glyphW * scale)) / 2;
    const offsetY = (canvasH - (glyphH * scale)) / 2; 

    const processedStrokes = strokes.map(s => {
        const newPoints = s.points.map(p => ({
            x: (p.x - minX) * scale + offsetX,
            y: (p.y - minY) * scale + offsetY 
        }));
        const screenArea = getPolygonSignedArea(newPoints);
        return { ...s, points: newPoints, rawArea: screenArea };
    });

    let maxAbsArea = 0;
    let mainSign = 0;
    processedStrokes.forEach(s => {
        const abs = Math.abs(s.rawArea);
        if (abs > maxAbsArea) {
            maxAbsArea = abs;
            mainSign = Math.sign(s.rawArea);
        }
    });

    return processedStrokes.map(s => ({
        points: s.points,
        type: 'shape',
        filled: true,
        isClosed: true,
        width: 1,
        isHole: Math.sign(s.rawArea) !== mainSign && Math.abs(s.rawArea) < maxAbsArea 
    }));
};

/**
 * GERA O ARQUIVO TTF
 * Realiza a união de traços e alinhamento à esquerda.
 */
export const generateTTF = async (fontName: string, glyphs: GlyphMap, spacing: number = 50): Promise<ArrayBuffer> => {
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

  // Helper para converter formato do fontGenerator para formato do martinez-polygon-clipping
  // Martinez espera MultiPolygon: [[[x,y], [x,y]...], [[hole]...]]
  const toGeoJSON = (points: Point[]): any => {
      const coords = points.map(p => [p.x, p.y]);
      // Fechar o loop se necessário
      if (coords.length > 0 && (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1])) {
          coords.push(coords[0]);
      }
      return [[coords]]; // Retorna como um Polígono com 1 anel externo
  };

  Object.values(glyphs).forEach(data => {
    if (data.strokes.length === 0) return;

    // --- 1. UNIFICAÇÃO (BOOLEAN OPERATIONS) ---
    // Acumula a forma final. Começa vazia.
    let mergedGeometry: any = [];

    // Separa traços sólidos de buracos
    // Para simplificar, processamos sequencialmente: Adiciona Sólido, Subtrai Buraco
    // Mas para funcionar bem, idealmente unimos todos os sólidos primeiro, depois subtraímos todos os buracos.
    // Ou processamos na ordem de camadas (como num canvas). Vamos processar em ordem.
    
    data.strokes.forEach(stroke => {
        const points = getStrokePathPoints(stroke);
        if (points.length < 3) return;
        
        const poly = toGeoJSON(points);
        
        if (mergedGeometry.length === 0) {
            if (!stroke.isHole) mergedGeometry = poly;
        } else {
            if (stroke.isHole) {
                // Se for buraco, subtrai da geometria atual
                mergedGeometry = diff(mergedGeometry, poly);
            } else {
                // Se for sólido, une com a geometria atual
                mergedGeometry = union(mergedGeometry, poly);
            }
        }
    });

    // --- 2. ALINHAMENTO À ESQUERDA (CORREÇÃO DE ORIGEM) ---
    // Encontrar o minX global da geometria fundida
    let globalMinX = Infinity;
    let globalMaxX = -Infinity;

    if (mergedGeometry && mergedGeometry.length > 0) {
        // mergedGeometry é um MultiPolygon: [Polygon, Polygon...]
        // Polygon é [Ring, Ring...]
        // Ring é [[x,y], [x,y]...]
        mergedGeometry.forEach((polygon: any) => {
            polygon.forEach((ring: any) => {
                ring.forEach((coord: number[]) => {
                    const x = coord[0];
                    if (x < globalMinX) globalMinX = x;
                    if (x > globalMaxX) globalMaxX = x;
                });
            });
        });
    }

    // Se não tiver geometria válida, pula
    if (globalMinX === Infinity) return;

    // Margem esquerda segura (Left Side Bearing)
    const leftBearing = 20; 
    const shiftX = -globalMinX + leftBearing;

    const finalPath = new opentype.Path();

    // --- 3. CONSTRUÇÃO DO PATH FINAL ---
    if (mergedGeometry && mergedGeometry.length > 0) {
        mergedGeometry.forEach((polygon: any) => {
            polygon.forEach((ring: any) => {
                // O primeiro anel é o contorno externo, subsequentes são buracos do polígono
                // A lib martinez já devolve na ordem correta.
                // Opentype path lida com buracos baseado na direção (Winding Rule).
                // Precisamos garantir a direção correta?
                // Martinez geralmente garante orientação correta para GeoJSON (CCW externo, CW interno).
                // Fontes TTF preferem CW externo. Vamos verificar a área e inverter se necessário.
                
                if (ring.length < 2) return;

                // Converter [x,y] arrays para Points
                const pts = ring.map((c: number[]) => ({ x: c[0] + shiftX, y: c[1] })); // Aplica o SHIFT aqui
                
                // Calcular área para saber direção
                const area = getPolygonSignedArea(pts);
                // Fontes TTF: Exterior deve ser Clockwise (Area > 0 no nosso sistema Y-up invertido? Depende da ref)
                // OpenType.js handles non-zero winding usually.
                // Mas para garantir: Vamos apenas desenhar. Se ficar vazado errado, invertemos.
                // Empiricamente: O sistema de coordenadas fonte (Y-up) pede CW para exterior.
                
                // Adiciona ao path
                finalPath.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    finalPath.lineTo(pts[i].x, pts[i].y);
                }
                finalPath.close();
            });
        });
    }

    // Calcular largura de avanço baseada na nova geometria deslocada
    const width = (globalMaxX - globalMinX);
    const advanceWidth = Math.ceil(width + leftBearing + (spacing * 5));

    const glyph = new opentype.Glyph({
      name: data.char,
      unicode: data.char.charCodeAt(0),
      advanceWidth: Math.max(200, advanceWidth),
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
