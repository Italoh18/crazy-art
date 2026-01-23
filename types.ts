
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
