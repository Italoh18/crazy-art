import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, Product, Order, OrderStatus } from '../types';

interface DataContextType {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  addOrder: (order: Omit<Order, 'id' | 'orderNumber'>) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  deleteProduct: (id: string) => void;
  deleteCustomer: (id: string) => void; 
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  // Initialize with some dummy data if empty, otherwise load from localStorage
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('gestorbiz_customers');
    return saved ? JSON.parse(saved) : [];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('gestorbiz_products');
    return saved ? JSON.parse(saved) : [];
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
    };
    setCustomers((prev) => [...prev, newCustomer]);
  };

  const addProduct = (data: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...data,
      id: crypto.randomUUID(),
    };
    setProducts((prev) => [...prev, newProduct]);
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const deleteCustomer = (id: string) => {
      setCustomers(prev => prev.filter(c => c.id !== id));
      // Optionally cascade delete orders
  };

  const addOrder = (data: Omit<Order, 'id' | 'orderNumber'>) => {
    setOrders((prev) => {
      // Find the highest existing order number
      const maxOrderNumber = prev.reduce((max, order) => {
        const num = order.orderNumber || 0;
        return num > max ? num : max;
      }, 0);

      const newOrder: Order = {
        ...data,
        id: crypto.randomUUID(),
        orderNumber: maxOrderNumber + 1, // Auto-increment
      };
      
      return [...prev, newOrder];
    });
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  return (
    <DataContext.Provider
      value={{
        customers,
        products,
        orders,
        addCustomer,
        addProduct,
        addOrder,
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
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};