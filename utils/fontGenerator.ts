
import opentype from 'opentype.js';
import { GlyphMap, Stroke, Point, NodeType } from '../types';

// Declaração do ImageTracer global (injetado via index.html)
declare const ImageTracer: any;

// Configurações da fonte
const UNITS_PER_EM = 1000;
const ASCENDER = 800;
const DESCENDER = -200;

// Configuração de Alta Resolução para o Canvas de Processamento
const RENDER_SIZE = 1000; 
const CANVAS_SIZE = 500; // Tamanho visual do editor

// --- Funções Auxiliares de SVG e Geometria ---

// Calcula a área assinada de um polígono para determinar orientação (Horário/Anti-horário)
// Adaptado para funcionar com curvas (aproximação pelos nodes)
const getPolygonSignedArea = (points: Point[]): number => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += (points[j].x - points[i].x) * (points[j].y + points[i].y);
  }
  return area / 2;
};

/**
 * Analisa uma string de Path SVG (d) e a converte em comandos para o OpenType.js
 */
const parseSvgPathToOpenType = (d: string, targetPath: opentype.Path, offsetX: number) => {
    if (!d) return;
    
    const commands = d.match(/([a-zA-Z])|([-+]?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?)/g);
    if (!commands) return;

    let i = 0;
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;

    const tx = (x: number) => Math.round(x - offsetX);
    const ty = (y: number) => Math.round(800 - y); // Flip Y para fonte

    while (i < commands.length) {
        const cmd = commands[i];
        if (!isNaN(parseFloat(cmd))) { i++; continue; }

        const nextNum = () => parseFloat(commands[++i]);

        switch (cmd) {
            case 'M': 
                currentX = nextNum(); currentY = nextNum();
                startX = currentX; startY = currentY;
                targetPath.moveTo(tx(currentX), ty(currentY));
                break;
            case 'L': 
                currentX = nextNum(); currentY = nextNum();
                targetPath.lineTo(tx(currentX), ty(currentY));
                break;
            case 'Q': 
                const cx = nextNum(); const cy = nextNum();
                currentX = nextNum(); currentY = nextNum();
                targetPath.quadraticCurveTo(tx(cx), ty(cy), tx(currentX), ty(currentY));
                break;
            case 'C': 
                const x1 = nextNum(); const y1 = nextNum();
                const x2 = nextNum(); const y2 = nextNum();
                currentX = nextNum(); currentY = nextNum();
                targetPath.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(currentX), ty(currentY));
                break;
            case 'Z': 
            case 'z':
                targetPath.close();
                currentX = startX; currentY = startY;
                break;
        }
        i++;
    }
};

/**
 * Desenha os strokes (agora Paths) em um Canvas HTML5.
 * Suporta curvas Bezier completas.
 */
const renderStrokesToCanvas = (strokes: Stroke[]): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = RENDER_SIZE;
    canvas.height = RENDER_SIZE;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return canvas;

    ctx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
    
    // Fundo transparente
    // Escala do editor para render
    const scale = RENDER_SIZE / CANVAS_SIZE;
    ctx.scale(scale, scale);

    strokes.forEach(stroke => {
        ctx.beginPath();
        
        ctx.globalCompositeOperation = stroke.isHole ? 'destination-out' : 'source-over';
        ctx.fillStyle = 'white'; 
        ctx.strokeStyle = 'white'; 
        
        // Se for stroke com width definido (simulação de pincel antigo ou contorno)
        // Para a nova engine, 'filled' define se é um shape fechado.
        
        if (stroke.points.length > 0) {
            const pts = stroke.points;
            ctx.moveTo(pts[0].x, pts[0].y);
            
            for (let i = 1; i < pts.length; i++) {
                const p = pts[i];
                const prev = pts[i-1];
                
                // Se tiver handles, usa Bezier Cúbico
                if (prev.handleOut && p.handleIn && (prev.handleOut.x !== 0 || prev.handleOut.y !== 0 || p.handleIn.x !== 0 || p.handleIn.y !== 0)) {
                    ctx.bezierCurveTo(
                        prev.x + prev.handleOut.x, prev.y + prev.handleOut.y,
                        p.x + p.handleIn.x, p.y + p.handleIn.y,
                        p.x, p.y
                    );
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }
            
            if (stroke.isClosed) {
                const first = pts[0];
                const last = pts[pts.length - 1];
                if (last.handleOut && first.handleIn) {
                     ctx.bezierCurveTo(
                        last.x + last.handleOut.x, last.y + last.handleOut.y,
                        first.x + first.handleIn.x, first.y + first.handleIn.y,
                        first.x, first.y
                    );
                }
                ctx.closePath();
            }
        }

        if (stroke.filled) {
            ctx.fill();
        } else {
            ctx.lineWidth = stroke.width || 15;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    });

    return canvas;
};

export const generatePreviewFromStrokes = (strokes: Stroke[], width: number, height: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const scaleX = width / 500;
    const scaleY = height / 500;
    
    ctx.clearRect(0, 0, width, height);
    ctx.scale(scaleX, scaleY);

    strokes.forEach(stroke => {
        ctx.beginPath();
        ctx.globalCompositeOperation = stroke.isHole ? 'destination-out' : 'source-over';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        
        if (stroke.points.length > 0) {
            const pts = stroke.points;
            ctx.moveTo(pts[0].x, pts[0].y);
            
            for (let i = 1; i < pts.length; i++) {
                const p = pts[i];
                const prev = pts[i-1];
                if (prev.handleOut && p.handleIn && (prev.handleOut.x !== 0 || prev.handleOut.y !== 0 || p.handleIn.x !== 0 || p.handleIn.y !== 0)) {
                    ctx.bezierCurveTo(
                        prev.x + prev.handleOut.x, prev.y + prev.handleOut.y,
                        p.x + p.handleIn.x, p.y + p.handleIn.y,
                        p.x, p.y
                    );
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }
            if (stroke.isClosed) {
                 const first = pts[0];
                 const last = pts[pts.length - 1];
                 if (last.handleOut && first.handleIn) {
                     ctx.bezierCurveTo(
                        last.x + last.handleOut.x, last.y + last.handleOut.y,
                        first.x + first.handleIn.x, first.y + first.handleIn.y,
                        first.x, first.y
                    );
                 }
                 ctx.closePath();
            }
        }
        
        if (stroke.filled) ctx.fill(); else {
            ctx.lineWidth = stroke.width || 15;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
    });

    return canvas.toDataURL('image/png');
};

/**
 * Converte um Path do OpenType.js de volta para Strokes (Nodes com Handles)
 */
export const convertOpenTypePathToStrokes = (path: opentype.Path, canvasW: number, canvasH: number): Stroke[] => {
    const rawStrokes: any[] = [];
    let currentPoints: Point[] = [];

    // Helper para converter coordenada OpenType (Y-Up) para Canvas (Y-Down)
    // Precisamos saber a bounding box primeiro? Ou assumimos unidades padrão?
    // Vamos converter comandos raw primeiro, depois normalizar.
    
    let lastX = 0, lastY = 0;

    path.commands.forEach(cmd => {
        switch (cmd.type) {
            case 'M': 
                if (currentPoints.length > 0) {
                    rawStrokes.push({ points: [...currentPoints] });
                    currentPoints = [];
                }
                currentPoints.push({ x: cmd.x, y: cmd.y, handleIn: {x:0,y:0}, handleOut: {x:0,y:0}, type: 'cusp' });
                lastX = cmd.x; lastY = cmd.y;
                break;
            case 'L': 
                currentPoints.push({ x: cmd.x, y: cmd.y, handleIn: {x:0,y:0}, handleOut: {x:0,y:0}, type: 'cusp' });
                lastX = cmd.x; lastY = cmd.y;
                break;
            case 'Q':
                // Quadratic to Cubic approx
                // CP1 = P0 + 2/3 (QP1 - P0)
                // CP2 = P2 + 2/3 (QP1 - P2)
                const qp1x = cmd.x1, qp1y = cmd.y1;
                const qp2x = cmd.x, qp2y = cmd.y;
                
                const prev = currentPoints[currentPoints.length - 1];
                const cp1x = prev.x + (2/3) * (qp1x - prev.x);
                const cp1y = prev.y + (2/3) * (qp1y - prev.y);
                const cp2x = qp2x + (2/3) * (qp1x - qp2x);
                const cp2y = qp2y + (2/3) * (qp1y - qp2y);
                
                // Update prev handleOut
                prev.handleOut = { x: cp1x - prev.x, y: cp1y - prev.y };
                prev.type = 'smooth'; // Assume smooth

                // Add new point with handleIn
                currentPoints.push({ 
                    x: qp2x, y: qp2y, 
                    handleIn: { x: cp2x - qp2x, y: cp2y - qp2y }, 
                    handleOut: { x: 0, y: 0 },
                    type: 'smooth' 
                });
                lastX = qp2x; lastY = qp2y;
                break;
            case 'C':
                const prevC = currentPoints[currentPoints.length - 1];
                prevC.handleOut = { x: cmd.x1 - prevC.x, y: cmd.y1 - prevC.y };
                prevC.type = 'smooth';

                currentPoints.push({
                    x: cmd.x, y: cmd.y,
                    handleIn: { x: cmd.x2 - cmd.x, y: cmd.y2 - cmd.y },
                    handleOut: { x: 0, y: 0 },
                    type: 'smooth'
                });
                lastX = cmd.x; lastY = cmd.y;
                break;
            case 'Z':
                // Fecha o path. O último ponto se conecta ao primeiro.
                // Se tiver handle, precisa ajustar o primeiro ponto também.
                if (currentPoints.length > 0) {
                    const first = currentPoints[0];
                    const last = currentPoints[currentPoints.length - 1];
                    // Se eles forem iguais (comum em fonts), merge. Se não, desenha linha.
                    if (Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01) {
                        // Merge handles
                        first.handleIn = last.handleIn;
                        // Remove last
                        currentPoints.pop();
                    }
                    rawStrokes.push({ points: [...currentPoints], closed: true });
                    currentPoints = [];
                }
                break;
        }
    });
    if (currentPoints.length > 0) rawStrokes.push({ points: [...currentPoints], closed: false });

    if (rawStrokes.length === 0) return [];

    // --- NORMALIZAÇÃO (Y-Up -> Y-Down e Fit to Canvas) ---
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rawStrokes.forEach(s => s.points.forEach((p: Point) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }));

    const glyphW = maxX - minX;
    const glyphH = maxY - minY;
    
    if (glyphW === 0 || glyphH === 0) return [];

    const padding = 60;
    const availableW = canvasW - (padding * 2);
    const availableH = canvasH - (padding * 2);

    const scale = Math.min(availableW / glyphW, availableH / glyphH);
    const offsetX = (canvasW - (glyphW * scale)) / 2;
    const offsetY = (canvasH - (glyphH * scale)) / 2;

    const processedStrokes = rawStrokes.map(s => {
        const newPoints = s.points.map((p: Point) => ({
            x: (p.x - minX) * scale + offsetX,
            // Y-down fix: (p.y - minY) * scale.
            // Note: OpenType coords usually Y-Up. 
            // If the input path comes from a font, minY is likely negative (descender).
            // Canvas origin top-left.
            // Standardizing: (p.y - minY) aligns to top. To align correctly, we map:
            // maxY (top of letter in font coords) -> minY in canvas? No.
            // Font: maxY is top. Canvas: 0 is top.
            // y = (maxY - p.y) * scale + offsetY is correct for flip.
            // But if convertOpenTypePathToStrokes is reading raw commands where Y is already flipped or standard?
            // Let's assume standard font coords (Y Up).
            // Then (maxY - p.y) flips it to Y Down.
            y: (maxY - p.y) * scale + offsetY,
            
            // Handles must be flipped too (Y component)
            handleIn: { x: (p.handleIn?.x || 0) * scale, y: -(p.handleIn?.y || 0) * scale },
            handleOut: { x: (p.handleOut?.x || 0) * scale, y: -(p.handleOut?.y || 0) * scale },
            type: p.type
        }));
        
        // Recalculate area for winding order (holes)
        const area = getPolygonSignedArea(newPoints);
        return { 
            points: newPoints, 
            type: 'path' as const, 
            filled: true, 
            isClosed: s.closed !== false, 
            width: 1, 
            area 
        };
    });

    // Detect Holes
    let maxAbsArea = 0;
    let solidSign = 0;
    processedStrokes.forEach(s => {
        if (Math.abs(s.area) > maxAbsArea) {
            maxAbsArea = Math.abs(s.area);
            solidSign = Math.sign(s.area);
        }
    });

    return processedStrokes.map(s => ({
        ...s,
        isHole: Math.sign(s.area) !== solidSign && Math.abs(s.area) < maxAbsArea
    }));
};

/**
 * GERA O ARQUIVO TTF
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

  for (const key in glyphs) {
      const data = glyphs[key];
      if (data.strokes.length === 0) continue;

      // Rasterizar e Vetorizar com ImageTracer para garantir união correta
      // Isso resolve boolean operations complexas (união de retângulos, etc)
      // ao custo de perder a precisão exata do Bezier original, 
      // mas garante um output sólido.
      // Se quiséssemos manter os beziers exatos, teríamos que implementar boolean ops vetoriais.
      // Dado o prompt "Refactor to use fill-based closed paths", o usuário provavelmente quer desenhar formas
      // e ter elas exportadas como um glifo limpo.
      // ImageTracer approach is robust for "Paint" style creation.
      
      const canvas = renderStrokesToCanvas(data.strokes);
      const imgData = canvas.getContext('2d')?.getImageData(0, 0, RENDER_SIZE, RENDER_SIZE);
      
      if (!imgData) continue;

      const traceOptions = {
          ltres: 0.1, qtres: 0.1, pathomit: 8, colorsampling: 0,
          numberofcolors: 2, mincolorratio: 0, colorquantcycles: 0,
          strokewidth: 0, viewbox: true, desc: false
      };

      const svgString = ImageTracer.imagedataToSVG(imgData, traceOptions);
      
      // Regex atualizada para pegar paths brancos (fill="rgb(255,255,255)" ou similar)
      const pathRegex = /<path[^>]*d="([^"]+)"[^>]*fill="(rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|#ffffff|#FFF|white)"/gi;
      const pathDataList = [];
      let match;
      while ((match = pathRegex.exec(svgString)) !== null) {
          pathDataList.push(match[1]);
      }

      if (pathDataList.length === 0) continue;

      // Bounding Box para ajuste
      const tempPath = new opentype.Path();
      pathDataList.forEach(d => parseSvgPathToOpenType(d, tempPath, 0));
      
      const bbox = tempPath.getBoundingBox();
      const minX = bbox.x1;
      const maxX = bbox.x2;
      
      const leftBearing = 20;
      const shiftX = minX - leftBearing; 

      const finalPath = new opentype.Path();
      pathDataList.forEach(d => parseSvgPathToOpenType(d, finalPath, shiftX));

      const width = maxX - minX;
      const advanceWidth = Math.ceil(width + leftBearing + (spacing * 5));

      const glyph = new opentype.Glyph({
        name: data.char,
        unicode: data.char.charCodeAt(0),
        advanceWidth: Math.max(200, advanceWidth),
        path: finalPath
      });

      fontGlyphs.push(glyph);
  }

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
