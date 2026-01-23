
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
  cloudLink?: string; // Novo campo
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
}

export type OrderStatus = 'open' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  order_number: number;
  client_id: string;
  description: string;
  total: number;
  order_date: string;
  due_date: string;
  status: OrderStatus;
  created_at?: string;
  formattedOrderNumber?: string;
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
