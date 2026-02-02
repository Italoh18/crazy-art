
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  address?: {
    street: string;
    number: string;
    zipCode: string;
  };
  cloudLink?: string; // Novo campo para a nuvem de arquivos
  creditLimit?: number;
  created_at: string;
}

export type ItemType = 'product' | 'service';

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  description?: string;
  type: ItemType;
  imageUrl?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  cost_price?: number; // Adicionado para garantir tipagem no calculo
}

export type OrderStatus = 'open' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  order_number: number;
  client_id: string;
  description: string;
  total: number;
  total_cost?: number; // Novo campo para calculo de liquido
  order_date: string;
  due_date: string;
  status: OrderStatus;
  created_at?: string;
  paid_at?: string;
  formattedOrderNumber?: string;
  client_name?: string; // Opcional para listagens com join visual
}

export interface DREData {
  month: string;
  grossRevenue: number;
  accountsReceivable: number;
  cancelledAmount: number;
}

export interface CarouselImage {
  id: string;
  url: string;
  created_at: string;
}

export interface Notification {
  id: string;
  target_role: 'admin' | 'client';
  user_id?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  is_read: number; // 0 ou 1
  created_at: string;
  reference_id?: string;
}

export interface TrustedCompany {
  id: string;
  name?: string;
  image_url: string;
  created_at: string;
}

export interface DriveFile {
  id: string;
  name: string;
  folder: string;
  url: string;
  type: string;
  size?: string;
  created_at: string;
}

// --- Font Finder Types ---

export interface FontAnalysis {
  fontName: string;
  category: string; // e.g., Serif, Sans-Serif, Script
  visualStyle: string; // e.g., "Bold geometric with high x-height"
  matchConfidence: 'Alta' | 'Média' | 'Baixa';
  description: string;
  similarFonts: string[]; // Lista de fontes parecidas
  detectedText?: string; // Texto extraído da imagem para preview
  source?: 'Local' | 'Web'; // Origem da identificação
}

export interface HistoryItem extends FontAnalysis {
  id: string;
  timestamp: number;
  thumbnailUrl: string; // Base64 or URL of the cropped image (ou placeholder para uploads)
  isUploaded?: boolean; // Flag para identificar se foi upload manual
  fileContent?: string; // Base64 do arquivo da fonte (.ttf, .otf)
  fileName?: string; // Nome original do arquivo
}

export interface ImageUploadProps {
  onImageSelected: (base64: string) => void;
  isLoading: boolean;
}

export interface FontResultProps {
  analysis: FontAnalysis | null;
  currentImage: string | null;
  onSave: () => void;
  isSaved: boolean;
  // Propriedade opcional para permitir download se for um item do histórico com arquivo
  downloadData?: {
    fileName: string;
    fileContent: string;
  };
}

export interface HistoryListProps {
  history: HistoryItem[];
  onDelete: (id: string) => void;
  onSelect: (item: HistoryItem) => void;
  onUpdate: (id: string, newName: string) => void;
  onUploadFonts: (files: FileList) => void; // Nova prop para upload
}

// --- Font Creator Types ---

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  type: 'freehand' | 'shape' | 'bezier';
  isClosed?: boolean; // Indica se o path deve ser fechado (para formas)
  filled?: boolean; // Indica se a forma deve ser preenchida (Paint Bucket)
  width?: number; // Espessura do traço
}

export interface GlyphData {
  char: string;
  strokes: Stroke[];
  previewUrl?: string; // Base64 image for fast rendering in grid
}

export type GlyphMap = Record<string, GlyphData>;