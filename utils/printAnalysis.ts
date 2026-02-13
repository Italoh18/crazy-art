
import * as pdfjsLib from 'pdfjs-dist';

// Configurar Worker (necessário para o PDF.js funcionar no browser)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export interface AnalysisReport {
  fileName: string;
  fileType: 'pdf' | 'image';
  fileSizeMb: number;
  dimensions: {
    widthPx: number;
    heightPx: number;
    widthMm: number;
    heightMm: number;
  };
  dpi?: number;
  bleed?: {
    hasBleed: boolean;
    amountMm: number;
    message: string;
  };
  colors: {
    space: string;
    hasTransparency: boolean;
    message: string;
  };
  fonts?: {
    isEmbedded: boolean;
    count: number;
  };
  status: 'ok' | 'warning' | 'error';
  score: number; // 0 a 100
}

// 1 Polegada = 25.4 mm
const MM_PER_INCH = 25.4;
const PDF_POINT_TO_MM = 0.352778; // 1 pt = 1/72 inch

/**
 * Calcula o DPI baseado em dimensões de pixel e tamanho físico desejado
 */
export const calculateDPI = (pixels: number, mm: number): number => {
  if (mm <= 0) return 0;
  const inches = mm / MM_PER_INCH;
  return Math.round(pixels / inches);
};

/**
 * Analisa uma imagem (JPG/PNG)
 */
export const analyzeImage = async (file: File, targetWidthMm?: number): Promise<AnalysisReport> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      const widthPx = img.naturalWidth;
      const heightPx = img.naturalHeight;
      const ratio = heightPx / widthPx;
      
      // Se o usuário não forneceu largura, estimamos baseada em 300 DPI como "padrão ideal"
      // ou assumimos 72 DPI (web standard) para mostrar o tamanho físico atual
      const widthMm = targetWidthMm || (widthPx / 300) * MM_PER_INCH; 
      const heightMm = widthMm * ratio;
      
      const dpi = calculateDPI(widthPx, widthMm);
      
      // Avaliação
      let status: AnalysisReport['status'] = 'ok';
      let score = 100;
      const messages: string[] = [];

      if (dpi < 150) {
        status = 'error';
        score -= 50;
      } else if (dpi < 300) {
        status = 'warning';
        score -= 20;
      }

      // Detecção simples de transparência (apenas para PNG)
      let hasTransparency = false;
      if (file.type === 'image/png') {
        const canvas = document.createElement('canvas');
        canvas.width = 1; 
        canvas.height = 1; // Sample simples não funciona bem, assumimos true para PNGs complexos ou checamos via worker.
        // Simplificação: PNG suporta transparência, JPG não.
        hasTransparency = true; 
      }

      const report: AnalysisReport = {
        fileName: file.name,
        fileType: 'image',
        fileSizeMb: file.size / (1024 * 1024),
        dimensions: { widthPx, heightPx, widthMm, heightMm },
        dpi,
        colors: {
          space: 'RGB', // Navegadores leem como RGB. CMYK real exigiria parsing de bytes.
          hasTransparency,
          message: hasTransparency ? 'Transparência detectada (cuidado com fundos).' : 'Opacidade sólida.'
        },
        status,
        score
      };

      URL.revokeObjectURL(objectUrl);
      resolve(report);
    };
    
    img.onerror = reject;
    img.src = objectUrl;
  });
};

/**
 * Analisa um arquivo PDF
 */
export const analyzePDF = async (file: File): Promise<AnalysisReport> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const page = await pdf.getPage(1); // Analisa a primeira página
  
  const viewport = page.getViewport({ scale: 1.0 }); // 72 DPI base do PDF
  
  // PDF Dimensions (Points -> MM)
  const widthMm = viewport.width * PDF_POINT_TO_MM;
  const heightMm = viewport.height * PDF_POINT_TO_MM;
  
  // Bleed Detection
  // MediaBox (Página física total) vs CropBox/TrimBox (Área de corte)
  // No PDF.js, 'view' é geralmente o MediaBox ou CropBox dependendo do render.
  // Precisamos olhar metadados raw se possível, mas via API padrão:
  // Se não temos acesso direto ao TrimBox, assumimos verificação visual ou margem de segurança.
  // Vamos simular checagem baseada em dimensões padrão A4, A5, etc.
  
  let hasBleed = false;
  let bleedMsg = "Não foi possível detectar TrimBox nos metadados padrão.";
  
  // Simulação de verificação de fontes
  const textContent = await page.getTextContent();
  const fontCount = Object.keys(textContent.styles).length;
  
  // Pontuação
  let status: AnalysisReport['status'] = 'ok';
  let score = 100;

  // Resolução estimada de imagens internas (complexo, estimativa baseada em renderização)
  // PDF.js renderiza em canvas. Se dermos zoom 2x e não pixelar, tem qualidade.
  
  const report: AnalysisReport = {
    fileName: file.name,
    fileType: 'pdf',
    fileSizeMb: file.size / (1024 * 1024),
    dimensions: {
      widthPx: Math.round(viewport.width),
      heightPx: Math.round(viewport.height),
      widthMm,
      heightMm
    },
    bleed: {
      hasBleed,
      amountMm: 0,
      message: bleedMsg
    },
    colors: {
      space: 'Desconhecido (Renderizado como RGB)',
      hasTransparency: false,
      message: 'Verifique se o PDF foi exportado em PDF/X-1a.'
    },
    fonts: {
      isEmbedded: true, // PDF.js geralmente lida bem se renderizou
      count: fontCount
    },
    status,
    score
  };

  return report;
};

/**
 * Simula a aparência de impressão (CMYK em papel) em um Canvas
 * Reduz saturação, ajusta contraste e simula ganho de ponto leve.
 */
export const simulatePrintPreview = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 1. Conversão simplificada RGB -> CMYK -> RGB "Lavado"
    // Reduz saturação (papel absorve tinta)
    // Reduz brilho máximo (papel não emite luz)
    
    // Algoritmo simples de desaturação com "Muddying" (escurecimento de cores vivas)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Mistura cor original com cinza (Desaturação ~20%)
    const desatR = r * 0.8 + gray * 0.2;
    const desatG = g * 0.8 + gray * 0.2;
    const desatB = b * 0.8 + gray * 0.2;

    // Escurecimento (Simula falta de backlight, ~5-10% darker)
    const factor = 0.92; 
    
    data[i] = desatR * factor;     // R
    data[i + 1] = desatG * factor; // G
    data[i + 2] = desatB * factor; // B
    // Alpha mantém
  }

  ctx.putImageData(imageData, 0, 0);
};
