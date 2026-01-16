export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  address: {
    street: string;
    number: string;
    zipCode: string;
  };
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
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
  orderNumber: number; // Added sequential order number
  customerId: string;
  description: string;
  items: OrderItem[];
  totalValue: number;
  requestDate: string; // ISO Date
  dueDate: string; // ISO Date
  status: OrderStatus;
}

export interface DREData {
  month: string;
  grossRevenue: number; // Receita Bruta (Paid orders)
  accountsReceivable: number; // Contas a Receber (Open orders)
  cancelledAmount: number; // Pedidos cancelados
}