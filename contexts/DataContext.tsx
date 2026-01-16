import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, Product, Order, OrderStatus } from '../types';

interface DataContextType {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  addOrder: (order: Omit<Order, 'id' | 'orderNumber'>) => Order;
  updateOrder: (id: string, data: Partial<Order>) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  deleteProduct: (id: string) => void;
  deleteCustomer: (id: string) => void; 
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('gestorbiz_customers');
    if (saved) return JSON.parse(saved);
    return [{
        id: 'italo-uuid-seed',
        name: 'Italo Henrique da Silva Medeiros',
        phone: '(16) 99195-4647',
        email: 'johnmedeirosh18@gmail.com',
        cpf: '062.353.737-08',
        address: { street: 'Av. Antônio Vanzella', number: '1020', zipCode: '14165-440' },
        creditLimit: 500.00,
        createdAt: new Date().toISOString()
    }];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('gestorbiz_products');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'seed-layout-camisa',
        name: 'Layout Camisa',
        price: 13.00,
        costPrice: 1.00,
        type: 'service',
        description: 'Desenvolvimento de layout para estampa.'
      },
      {
        id: 'seed-cartao-visitas',
        name: 'Cartão de Visitas 500 un 4x1',
        price: 80.00,
        costPrice: 35.00,
        type: 'product',
        description: '500 unidades, verniz total frente.'
      }
    ];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('gestorbiz_orders');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('gestorbiz_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('gestorbiz_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('gestorbiz_orders', JSON.stringify(orders));
  }, [orders]);

  const addCustomer = (data: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      creditLimit: data.creditLimit || 50.00
    };
    setCustomers((prev) => [...prev, newCustomer]);
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setCustomers((prev) => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const addProduct = (data: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...data, id: crypto.randomUUID() };
    setProducts((prev) => [...prev, newProduct]);
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const addOrder = (data: Omit<Order, 'id' | 'orderNumber'>) => {
    const maxOrderNumber = orders.reduce((max, order) => {
        const num = order.orderNumber || 0;
        return num > max ? num : max;
    }, 0);

    const newOrder: Order = {
        ...data,
        id: crypto.randomUUID(),
        orderNumber: maxOrderNumber + 1,
    };
    
    setOrders((prev) => [...prev, newOrder]);
    return newOrder;
  };

  const updateOrder = (id: string, data: Partial<Order>) => {
    setOrders((prev) => prev.map(o => o.id === id ? { ...o, ...data } : o));
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  return (
    <DataContext.Provider
      value={{
        customers,
        products,
        orders,
        addCustomer,
        updateCustomer,
        addProduct,
        addOrder,
        updateOrder,
        updateOrderStatus,
        deleteProduct,
        deleteCustomer
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};