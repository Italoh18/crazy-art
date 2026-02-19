
import opentype from 'opentype.js';
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
// > 0: Sentido Horário (Clockwise) - assumindo Y para cima (padrão cartesiano/fonte)
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
    y: (baselineY - p.y) * FONT_SCALE // Inverte Y
  };
};

const getBezierPoints = (p0: Point, p1: Point, p2: Point): Point[] => {
  const segments = 10; // Menos segmentos para exportação mais leve
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

  // 2. Se for "filled" (forma), usamos os pontos diretos.
  // Se for "freehand" (linha), precisamos criar a espessura (outline).
  let outlinePoints: Point[] = [];

  if (stroke.filled) {
    outlinePoints = rawPoints.map(transformPoint);
  } else {
    // Expandir linha para polígono (simples)
    const width = (stroke.width || 15) * FONT_SCALE; 
    const halfWidth = width / 2;
    
    // Transformar para coord fonte primeiro para calcular normais corretamente no espaço final
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
 * Realiza normalização para caber no canvas de 500x500.
 */
export const convertOpenTypePathToStrokes = (path: opentype.Path, canvasW: number, canvasH: number): Stroke[] => {
    const strokes: Stroke[] = [];
    let currentPoints: Point[] = [];

    // 1. Extrair pontos dos comandos
    path.commands.forEach(cmd => {
        switch (cmd.type) {
            case 'M': // Move To (Início de novo sub-path)
                if (currentPoints.length > 0) {
                    strokes.push({ points: currentPoints, type: 'shape', filled: true, isClosed: true, width: 1 });
                    currentPoints = [];
                }
                currentPoints.push({ x: cmd.x, y: cmd.y });
                break;
            case 'L': // Line To
                currentPoints.push({ x: cmd.x, y: cmd.y });
                break;
            case 'Q': // Quadratic Bezier
                if (currentPoints.length > 0) {
                    const p0 = currentPoints[currentPoints.length - 1];
                    // Discretizar curva
                    for (let t = 0.1; t <= 1; t += 0.1) {
                        const invT = 1 - t;
                        const x = (invT * invT * p0.x) + (2 * invT * t * cmd.x1) + (t * t * cmd.x);
                        const y = (invT * invT * p0.y) + (2 * invT * t * cmd.y1) + (t * t * cmd.y);
                        currentPoints.push({ x, y });
                    }
                }
                break;
            case 'C': // Cubic Bezier
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
            case 'Z': // Close Path
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

    // 2. Calcular Bounding Box Global
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    strokes.forEach(s => s.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }));

    // 3. Normalizar e Escalar para o Canvas (Invertendo Y pois fontes são Y-up e Canvas é Y-down)
    const glyphW = maxX - minX;
    const glyphH = maxY - minY;
    
    // Margem de segurança (padding)
    const padding = 60;
    const availableW = canvasW - (padding * 2);
    const availableH = canvasH - (padding * 2);

    const scale = Math.min(availableW / glyphW, availableH / glyphH);
    
    // Centralizar
    const offsetX = (canvasW - (glyphW * scale)) / 2;
    const offsetY = (canvasH - (glyphH * scale)) / 2; 

    // Opcional: Detectar buracos baseado na área
    // Em fontes, o contorno externo geralmente tem uma direção e o interno outra.
    // Opcionalmente, podemos tentar detectar pelo tamanho (buracos costumam ser menores e estar dentro)
    // Mas a lógica de área assinada é a mais correta se a fonte estiver bem construída.
    
    // Assumimos que o maior stroke é o corpo e os outros podem ser buracos se tiverem direção oposta?
    // Simplificação: Vamos apenas transformar as coordenadas. A correção de buracos será visual no canvas
    // se usarmos a regra even-odd, mas nosso editor usa "destination-out" para buracos.
    // Vamos tentar inferir buracos pela orientação (Winding Rule).
    
    const processedStrokes = strokes.map(s => {
        const area = getPolygonSignedArea(s.points);
        // Em fontes TTF, Outer é CW (area > 0 no Y-up?) e Inner é CCW.
        // Como estamos lidando com coordenadas raw da fonte (Y-up), vamos chutar que Area < 0 é buraco (ou vice versa).
        // Na dúvida, vamos inverter Y primeiro para o sistema de tela (Y-down).
        
        const newPoints = s.points.map(p => ({
            x: (p.x - minX) * scale + offsetX,
            y: canvasH - ((p.y - minY) * scale + offsetY) // Inverte Y para desenhar corretamente no canvas
        }));

        // Recalcula área no sistema de tela
        const screenArea = getPolygonSignedArea(newPoints);
        
        // Empiricamente: strokes com área "negativa" (ou oposta à maioria/maior) costumam ser buracos.
        // Vamos assumir que a maior forma é sólida. O que tiver sinal oposto é buraco.
        return { 
            ...s, 
            points: newPoints, 
            rawArea: screenArea 
        };
    });

    // Encontrar a área do maior stroke (provavelmente o corpo principal)
    let maxAbsArea = 0;
    let mainSign = 0;
    processedStrokes.forEach(s => {
        const abs = Math.abs(s.rawArea);
        if (abs > maxAbsArea) {
            maxAbsArea = abs;
            mainSign = Math.sign(s.rawArea);
        }
    });

    // Marcar como buraco se o sinal for oposto ao principal
    return processedStrokes.map(s => ({
        points: s.points,
        type: 'shape',
        filled: true,
        isClosed: true,
        width: 1,
        isHole: Math.sign(s.rawArea) !== mainSign && Math.abs(s.rawArea) < maxAbsArea // Garante que não inverte formas principais soltas
    }));
};

/**
 * GERA O ARQUIVO TTF
 * @param spacing - Espaçamento adicional (tracking) em unidades de fonte (default ~50)
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

  Object.values(glyphs).forEach(data => {
    if (data.strokes.length === 0) return;

    const finalPath = new opentype.Path();
    let minX = Infinity;
    let maxX = -Infinity;

    // Processar cada stroke
    data.strokes.forEach(stroke => {
        let points = getStrokePathPoints(stroke);
        if (points.length < 3) return;

        // Calcular Bounding Box para Advance Width
        points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
        });

        // Winding Rule Logic (Correção de Buracos)
        // Fontes TrueType usam "Non-Zero Winding Rule".
        const area = getPolygonSignedArea(points);
        
        // Se for BURACO (isHole), queremos direção oposta ao SÓLIDO.
        if (stroke.isHole) {
            // Buraco: Forçar direção 1
            if (area > 0) points.reverse(); // Garante "Negativo"
        } else {
            // Sólido: Forçar direção 2
            if (area < 0) points.reverse(); // Garante "Positivo"
        }

        // Adicionar ao path
        finalPath.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            finalPath.lineTo(points[i].x, points[i].y);
        }
        finalPath.close();
    });

    // Calcular largura dinâmica
    let advanceWidth = 600;
    if (minX !== Infinity && maxX !== -Infinity) {
        // Largura do desenho + Spacing configurado pelo usuário
        advanceWidth = (maxX - minX) + (spacing * 5); 
    }

    const glyph = new opentype.Glyph({
      name: data.char,
      unicode: data.char.charCodeAt(0),
      advanceWidth: Math.max(200, advanceWidth), // Mínimo de segurança
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
