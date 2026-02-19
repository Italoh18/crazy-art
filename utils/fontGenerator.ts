import opentype from 'opentype.js';
import { GlyphMap, Stroke, Point } from '../types';

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
 * Também realiza a transformação de coordenadas (Flip Y e Offset X)
 */
const parseSvgPathToOpenType = (d: string, targetPath: opentype.Path, offsetX: number) => {
    if (!d) return;
    
    // Expressão regular para capturar comandos e números
    const commands = d.match(/([a-zA-Z])|([-+]?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?)/g);
    if (!commands) return;

    let i = 0;
    let currentX = 0;
    let currentY = 0;
    // Ponto de início do sub-caminho para fechar (Z)
    let startX = 0;
    let startY = 0;

    // Função para transformar coordenadas:
    // 1. Aplica o Offset X (para alinhar à esquerda)
    // 2. Inverte o Y (Canvas é Y-down, Fonte é Y-up)
    // 3. Ajusta a Baseline (800 é a baseline aproximada no grid 1000x1000, invertendo fica correto)
    const tx = (x: number) => Math.round(x - offsetX);
    const ty = (y: number) => Math.round(800 - y); // 800 é o Ascender, inverte o eixo Y

    while (i < commands.length) {
        const cmd = commands[i];
        if (!isNaN(parseFloat(cmd))) { i++; continue; }

        const nextNum = () => parseFloat(commands[++i]);

        switch (cmd) {
            case 'M': // Move To
                currentX = nextNum();
                currentY = nextNum();
                startX = currentX;
                startY = currentY;
                targetPath.moveTo(tx(currentX), ty(currentY));
                break;
            case 'L': // Line To
                currentX = nextNum();
                currentY = nextNum();
                targetPath.lineTo(tx(currentX), ty(currentY));
                break;
            case 'Q': // Quadratic Bezier
                const cx = nextNum();
                const cy = nextNum();
                currentX = nextNum();
                currentY = nextNum();
                targetPath.quadraticCurveTo(tx(cx), ty(cy), tx(currentX), ty(currentY));
                break;
            case 'C': // Cubic Bezier
                const x1 = nextNum();
                const y1 = nextNum();
                const x2 = nextNum();
                const y2 = nextNum();
                currentX = nextNum();
                currentY = nextNum();
                targetPath.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(currentX), ty(currentY));
                break;
            case 'Z': // Close Path
            case 'z':
                targetPath.close();
                currentX = startX;
                currentY = startY;
                break;
        }
        i++;
    }
};

/**
 * Desenha os strokes em um Canvas HTML5 para criar a forma sólida.
 */
const renderStrokesToCanvas = (strokes: Stroke[]): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = RENDER_SIZE;
    canvas.height = RENDER_SIZE;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return canvas;

    // Fundo transparente
    ctx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);

    // Escala do editor (500px) para o render (1000px)
    const scale = RENDER_SIZE / CANVAS_SIZE;
    ctx.scale(scale, scale);

    strokes.forEach(stroke => {
        ctx.beginPath();
        
        // Define o modo de composição: 
        // destination-out = Borracha (Buraco)
        // source-over = Pincel (Sólido)
        ctx.globalCompositeOperation = stroke.isHole ? 'destination-out' : 'source-over';
        ctx.fillStyle = 'white'; // Tinta BRANCA
        ctx.strokeStyle = 'white'; // Tinta BRANCA
        ctx.lineWidth = stroke.width || 15;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.points.length > 0) {
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            
            if (stroke.type === 'bezier' && stroke.points.length === 3) {
                ctx.quadraticCurveTo(stroke.points[1].x, stroke.points[1].y, stroke.points[2].x, stroke.points[2].y);
            } else {
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
            }
        }

        if (stroke.isClosed) ctx.closePath();
        
        if (stroke.filled) {
            ctx.fill();
        } else {
            ctx.stroke();
        }
    });

    return canvas;
};

/**
 * Gera Preview Base64 (Utilizado na Grid da Interface)
 */
export const generatePreviewFromStrokes = (strokes: Stroke[], width: number, height: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Escala para o tamanho do preview
    const scaleX = width / 500;
    const scaleY = height / 500;
    
    ctx.clearRect(0, 0, width, height);
    ctx.scale(scaleX, scaleY);

    strokes.forEach(stroke => {
        // Se for buraco, usa destination-out para "furar" o que já foi desenhado
        ctx.globalCompositeOperation = stroke.isHole ? 'destination-out' : 'source-over';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = stroke.width || 15;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        if (stroke.points.length > 0) {
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            if (stroke.type === 'bezier' && stroke.points.length === 3) {
                 ctx.quadraticCurveTo(stroke.points[1].x, stroke.points[1].y, stroke.points[2].x, stroke.points[2].y);
            } else {
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
            }
        }
        if (stroke.isClosed) ctx.closePath();
        if (stroke.filled) ctx.fill(); else ctx.stroke();
    });

    return canvas.toDataURL('image/png');
};

/**
 * Converte um Path do OpenType.js de volta para Strokes (para importação)
 */
export const convertOpenTypePathToStrokes = (path: opentype.Path, canvasW: number, canvasH: number): Stroke[] => {
    const rawStrokes: any[] = [];
    let currentPoints: Point[] = [];

    // Lógica de importação: Converte os comandos em strokes do tipo "shape"
    path.commands.forEach(cmd => {
        switch (cmd.type) {
            case 'M': // Move To (Inicia novo sub-path)
                if (currentPoints.length > 0) {
                    // Salva o path anterior
                    rawStrokes.push({ points: [...currentPoints] });
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
                    // Garante que o último ponto conecta ao primeiro
                    const first = currentPoints[0];
                    const last = currentPoints[currentPoints.length-1];
                    if (first.x !== last.x || first.y !== last.y) {
                        currentPoints.push(first);
                    }
                    rawStrokes.push({ points: [...currentPoints] });
                    currentPoints = [];
                }
                break;
        }
    });

    if (currentPoints.length > 0) {
        rawStrokes.push({ points: [...currentPoints] });
    }

    if (rawStrokes.length === 0) return [];

    // --- NORMALIZAÇÃO E ESCALA ---
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

    // Processa os pontos e calcula a área para detecção de buracos
    const processedStrokes = rawStrokes.map(s => {
        const newPoints = s.points.map((p: Point) => ({
            x: (p.x - minX) * scale + offsetX,
            // Correção de Orientação: O opentype.js getPath já retorna coordenadas Y-down (sistema SVG).
            // Portanto, não devemos inverter (maxY - p.y), pois isso deixa de cabeça para baixo.
            // Apenas normalizamos com o minY.
            y: (p.y - minY) * scale + offsetY 
        }));
        
        const area = getPolygonSignedArea(newPoints);
        return { 
            points: newPoints, 
            type: 'shape' as const, 
            filled: true, 
            isClosed: true, 
            width: 1, 
            area 
        };
    });

    // Detecção de Buracos (Winding Rule simplificado)
    // 1. Encontra a maior área absoluta (o corpo principal da letra)
    let maxAbsArea = 0;
    let solidSign = 0;
    
    processedStrokes.forEach(s => {
        if (Math.abs(s.area) > maxAbsArea) {
            maxAbsArea = Math.abs(s.area);
            solidSign = Math.sign(s.area);
        }
    });

    // 2. Marca como buraco se o sinal da área for oposto ao do corpo principal
    return processedStrokes.map(s => ({
        ...s,
        // É buraco se tiver direção oposta E for menor que o corpo principal
        isHole: Math.sign(s.area) !== solidSign && Math.abs(s.area) < maxAbsArea
    }));
};

/**
 * GERA O ARQUIVO TTF
 * Usa Rasterização + ImageTracer para garantir formas sólidas e unificadas.
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

  // Processa cada glifo
  for (const key in glyphs) {
      const data = glyphs[key];
      if (data.strokes.length === 0) continue;

      // 1. Rasterizar: Transforma os traços em uma imagem
      const canvas = renderStrokesToCanvas(data.strokes);
      const imgData = canvas.getContext('2d')?.getImageData(0, 0, RENDER_SIZE, RENDER_SIZE);
      
      if (!imgData) continue;

      // 2. Vetorizar: Usa ImageTracer para criar um único contorno
      const traceOptions = {
          ltres: 0.1, // Tolerância linear baixa (mais detalhes)
          qtres: 0.1, // Tolerância quadrática baixa (curvas melhores)
          pathomit: 8, // Ignora ruídos muito pequenos
          colorsampling: 0, // Desativa amostragem
          numberofcolors: 2, // 2 Cores: Fundo e Frente
          mincolorratio: 0,
          colorquantcycles: 0,
          strokewidth: 0,
          viewbox: true,
          desc: false
      };

      // O ImageTracer retorna uma string SVG completa
      const svgString = ImageTracer.imagedataToSVG(imgData, traceOptions);
      
      // Extrair TODOS os paths BRANCOS (rgb(255,255,255))
      // O desenho é feito em branco sobre transparente/preto.
      const pathRegex = /<path[^>]*d="([^"]+)"[^>]*fill="rgb\(255,255,255\)"/g;
      const pathDataList = [];
      let match;
      while ((match = pathRegex.exec(svgString)) !== null) {
          pathDataList.push(match[1]);
      }

      if (pathDataList.length === 0) continue;

      // 3. Calcular Bounding Box GLOBAL (para Alinhamento)
      const tempPath = new opentype.Path();
      pathDataList.forEach(d => parseSvgPathToOpenType(d, tempPath, 0));
      
      const bbox = tempPath.getBoundingBox();
      const minX = bbox.x1;
      const maxX = bbox.x2;
      
      // Margem esquerda segura
      const leftBearing = 20;
      const shiftX = minX - leftBearing; // O quanto devemos deslocar para a esquerda

      // 4. Criar Path Final Ajustado (Combinando todos os paths encontrados)
      const finalPath = new opentype.Path();
      pathDataList.forEach(d => parseSvgPathToOpenType(d, finalPath, shiftX));

      // Calcular largura de avanço
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
