
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
  cloudLink?: string; 
  creditLimit?: number;
  isSubscriber?: boolean; 
  subscriptionExpiresAt?: string;
  created_at: string;
}

export type ItemType = 'product' | 'service' | 'art';

export interface PriceVariation {
  minQuantity: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  description?: string;
  type: ItemType;
  imageUrl?: string;
  downloadLink?: string; 
  subcategory?: string; 
  primaryColor?: string; 
  priceVariations?: PriceVariation[]; 
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  cost_price?: number; 
  type?: ItemType;
  downloadLink?: string; 
}

export type OrderStatus = 'open' | 'paid' | 'production' | 'revision' | 'finished' | 'cancelled';

export interface SizeListItem {
  id: string;
  category: 'unisex' | 'feminina' | 'infantil';
  size: string;
  number: string;
  name: string;
  shortSize: string;
  shortNumber: string;
  quantity?: number; 
  isSimple?: boolean; 
}

export interface Order {
  id: string;
  order_number: number;
  client_id: string;
  description: string;
  total: number;
  total_cost?: number; 
  order_date: string;
  due_date: string;
  status: OrderStatus;
  created_at?: string;
  paid_at?: string;
  formattedOrderNumber?: string;
  client_name?: string;
  client_credit_limit?: number; 
  source?: 'shop' | 'admin'; 
  size_list?: SizeListItem[] | string; 
  is_confirmed?: number; 
  has_files?: number;
  items?: OrderItem[]; 
}

export interface Coupon {
  id: string;
  code: string;
  percentage: number;
  type: 'product' | 'service' | 'art' | 'all';
  created_at: string;
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
  is_read: number; 
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

export interface FontAnalysis {
  fontName: string;
  category: string; 
  visualStyle: string; 
  matchConfidence: 'Alta' | 'Média' | 'Baixa';
  description: string;
  similarFonts: string[]; 
  detectedText?: string; 
  source?: 'Local' | 'Web'; 
}

export interface HistoryItem extends FontAnalysis {
  id: string;
  timestamp: number;
  thumbnailUrl: string; 
  isUploaded?: boolean; 
  fileContent?: string; 
  fileName?: string; 
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
  onUploadFonts: (files: FileList) => void; 
}

// --- NEW VECTOR ENGINE TYPES (Professional Grade) ---

export type NodeType = 'cusp' | 'smooth' | 'symmetric';

export interface VectorNode {
  x: number;
  y: number;
  // Control handles are absolute coordinates
  handleIn: { x: number; y: number }; 
  handleOut: { x: number; y: number };
  type: NodeType;
  isSelected?: boolean;
}

export interface VectorPath {
  id: string;
  nodes: VectorNode[];
  isClosed: boolean;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  // "Boolean" visual operation: if true, this path cuts out from others (fill-rule: evenodd)
  isHole?: boolean; 
}

export interface GlyphData {
  char: string;
  paths: VectorPath[];
  advanceWidth: number;
  leftSideBearing?: number;
  previewUrl?: string; // Cache for grid display
}

export type GlyphMap = Record<string, GlyphData>;

// Legacy compatibility aliases (if needed during refactor transition)
export type Stroke = VectorPath; 
export type Point = VectorNode; 
