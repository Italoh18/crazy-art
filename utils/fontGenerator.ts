import opentype from 'opentype.js';
import { GlyphMap, VectorPath, VectorNode } from '../types';

// Configurações da Fonte (Units Per Em padrão do OpenType)
const UNITS_PER_EM = 1000;
const ASCENDER = 800;
const DESCENDER = -200;

// O Editor trabalha com coordenadas de tela (Y cresce para baixo).
// A Fonte trabalha com coordenadas cartesianas (Y cresce para cima).
// Precisamos de uma altura de referência para o flip.
const EDITOR_HEIGHT = 1000; 

/**
 * Converte um VectorPath do nosso editor para um opentype.Path
 */
const convertVectorPathToOpenType = (vPath: VectorPath): opentype.Path => {
    const path = new opentype.Path();
    if (vPath.nodes.length < 2) return path;

    const nodes = vPath.nodes;
    
    // Função para inverter Y
    const ty = (y: number) => EDITOR_HEIGHT - y;

    // Move to first point
    path.moveTo(nodes[0].x, ty(nodes[0].y));

    for (let i = 1; i < nodes.length; i++) {
        const curr = nodes[i];
        const prev = nodes[i - 1];

        // Se ambos os handles são colineares com o ponto (mesma posição), é uma linha reta
        const isLine = 
            (prev.handleOut.x === prev.x && prev.handleOut.y === prev.y) &&
            (curr.handleIn.x === curr.x && curr.handleIn.y === curr.y);

        if (isLine) {
            path.lineTo(curr.x, ty(curr.y));
        } else {
            path.curveTo(
                prev.handleOut.x, ty(prev.handleOut.y),
                curr.handleIn.x, ty(curr.handleIn.y),
                curr.x, ty(curr.y)
            );
        }
    }

    if (vPath.isClosed) {
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        
        // Verifica se precisa de curva para fechar
        const isClosingLine = 
            (last.handleOut.x === last.x && last.handleOut.y === last.y) &&
            (first.handleIn.x === first.x && first.handleIn.y === first.y);

        if (!isClosingLine) {
             path.curveTo(
                last.handleOut.x, ty(last.handleOut.y),
                first.handleIn.x, ty(first.handleIn.y),
                first.x, ty(first.y)
            );
        }
        path.close();
    }

    return path;
};

/**
 * GERA O ARQUIVO TTF
 * Agora usa os dados vetoriais diretamente, sem ImageTracer.
 */
export const generateTTF = async (fontName: string, glyphs: GlyphMap, globalSpacing: number = 0): Promise<ArrayBuffer> => {
  // 1. Criar o glyph .notdef (obrigatório)
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

  // 2. Processar glifos do usuário
  for (const key in glyphs) {
      const data = glyphs[key];
      if (!data.paths || data.paths.length === 0) continue;

      const finalPath = new opentype.Path();

      // Combina todos os caminhos do editor em um único caminho OpenType
      data.paths.forEach(p => {
          const otPath = convertVectorPathToOpenType(p);
          // Adiciona os comandos ao path final
          otPath.commands.forEach(cmd => finalPath.commands.push(cmd));
      });

      // Calcular Metrics Automaticamente se não definidos
      const bbox = finalPath.getBoundingBox();
      const width = bbox.x2; // Onde termina o desenho
      const advanceWidth = Math.max(200, width + globalSpacing + 50); // Margem direita segura

      const glyph = new opentype.Glyph({
        name: data.char,
        unicode: data.char.charCodeAt(0),
        advanceWidth: data.advanceWidth || advanceWidth,
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

/**
 * Importação: Converte comandos OpenType para VectorNodes do Editor
 * Adicionado: Lógica de centralização horizontal automática.
 */
export const convertOpenTypePathToStrokes = (path: opentype.Path, width: number, height: number): VectorPath[] => {
    const paths: VectorPath[] = [];
    let currentNodes: VectorNode[] = [];
    
    // Função para inverter Y (Fonte Y=0 baseline -> Editor Y=800 baseline)
    const ty = (y: number) => 800 - y;

    // Primeiro passo: Encontrar Bounding Box para centralização
    let minX = Infinity, maxX = -Infinity;
    path.commands.forEach(cmd => {
        if ('x' in cmd) {
            minX = Math.min(minX, cmd.x);
            maxX = Math.max(maxX, cmd.x);
        }
    });

    // Se não encontrou pontos, retorna vazio
    if (minX === Infinity) return [];

    // Calcular offset de centralização horizontal (Alvo: 500)
    const glyphWidth = maxX - minX;
    const horizontalOffset = 500 - (minX + glyphWidth / 2);

    path.commands.forEach(cmd => {
        switch (cmd.type) {
            case 'M': // Move To (Novo Path)
                if (currentNodes.length > 0) {
                    paths.push({
                        id: crypto.randomUUID(),
                        nodes: [...currentNodes],
                        isClosed: false,
                        fill: 'black',
                        isHole: false
                    });
                    currentNodes = [];
                }
                currentNodes.push({
                    x: cmd.x + horizontalOffset,
                    y: ty(cmd.y),
                    handleIn: { x: cmd.x + horizontalOffset, y: ty(cmd.y) },
                    handleOut: { x: cmd.x + horizontalOffset, y: ty(cmd.y) },
                    type: 'cusp'
                });
                break;
                
            case 'L': // Line To
                currentNodes.push({
                    x: cmd.x + horizontalOffset,
                    y: ty(cmd.y),
                    handleIn: { x: cmd.x + horizontalOffset, y: ty(cmd.y) },
                    handleOut: { x: cmd.x + horizontalOffset, y: ty(cmd.y) },
                    type: 'cusp'
                });
                break;
                
            case 'Q': // Quadratic (Converte para Cubic)
                {
                    const prev = currentNodes[currentNodes.length - 1];
                    const cx = cmd.x + horizontalOffset;
                    const cy = ty(cmd.y);
                    const c1x = cmd.x1 + horizontalOffset;
                    const c1y = ty(cmd.y1);

                    const cp1x = prev.x + (2/3) * (c1x - prev.x);
                    const cp1y = prev.y + (2/3) * (c1y - prev.y);
                    const cp2x = cx + (2/3) * (c1x - cx);
                    const cp2y = cy + (2/3) * (c1y - cy);

                    prev.handleOut = { x: cp1x, y: cp1y };
                    prev.type = 'smooth';

                    currentNodes.push({
                        x: cx,
                        y: cy,
                        handleIn: { x: cp2x, y: cp2y },
                        handleOut: { x: cx, y: cy },
                        type: 'smooth'
                    });
                }
                break;
                
            case 'C': // Cubic Bezier
                {
                    const prev = currentNodes[currentNodes.length - 1];
                    prev.handleOut = { x: cmd.x1 + horizontalOffset, y: ty(cmd.y1) };
                    prev.type = 'smooth';

                    currentNodes.push({
                        x: cmd.x + horizontalOffset,
                        y: ty(cmd.y),
                        handleIn: { x: cmd.x2 + horizontalOffset, y: ty(cmd.y2) },
                        handleOut: { x: cmd.x + horizontalOffset, y: ty(cmd.y) },
                        type: 'smooth'
                    });
                }
                break;
                
            case 'Z': // Close
                if (currentNodes.length > 0) {
                    const first = currentNodes[0];
                    const last = currentNodes[currentNodes.length - 1];
                    const isSamePos = Math.abs(first.x - last.x) < 0.1 && Math.abs(first.y - last.y) < 0.1;
                    
                    if (isSamePos) {
                        first.handleIn = last.handleIn;
                        currentNodes.pop();
                    }
                    
                    paths.push({
                        id: crypto.randomUUID(),
                        nodes: [...currentNodes],
                        isClosed: true,
                        fill: 'black',
                        isHole: false
                    });
                    currentNodes = [];
                }
                break;
        }
    });
    
    if (currentNodes.length > 0) {
        paths.push({
            id: crypto.randomUUID(),
            nodes: [...currentNodes],
            isClosed: false,
            fill: 'black',
            isHole: false
        });
    }

    return paths;
};

/**
 * Gera preview SVG string para a grid
 */
export const generatePreviewFromStrokes = (paths: VectorPath[], width: number, height: number): string => {
    const scale = width / 1000; 
    
    const svgPaths = paths.map(p => {
        if (p.nodes.length === 0) return '';
        let d = `M ${p.nodes[0].x * scale} ${p.nodes[0].y * scale}`;
        for(let i=1; i<p.nodes.length; i++) {
            const curr = p.nodes[i];
            const prev = p.nodes[i-1];
            
            if (prev.handleOut.x === prev.x && curr.handleIn.x === curr.x && prev.handleOut.y === prev.y && curr.handleIn.y === curr.y) {
                d += ` L ${curr.x * scale} ${curr.y * scale}`;
            } else {
                d += ` C ${prev.handleOut.x * scale} ${prev.handleOut.y * scale}, ${curr.handleIn.x * scale} ${curr.handleIn.y * scale}, ${curr.x * scale} ${curr.y * scale}`;
            }
        }
        if (p.isClosed) d += " Z";
        return `<path d="${d}" fill="${p.isHole ? 'black' : 'white'}" fill-rule="evenodd" />`;
    }).join('');

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="transparent"/>
        <g fill-rule="evenodd">${svgPaths}</g>
    </svg>`;
    
    return "data:image/svg+xml;base64," + btoa(svg);
};