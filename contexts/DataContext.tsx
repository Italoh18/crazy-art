
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, Product, Order, OrderStatus } from '../types';
import { api } from '../src/services/api';

interface DataContextType {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  isLoading: boolean;
  addCustomer: (customer: any) => Promise<void>;
  updateCustomer: (id: string, data: any) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addProduct: (product: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder: (order: any) => Promise<any>;
  updateOrder: (id: string, data: any) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        setIsLoading(false);
        return;
    }
    try {
      const [clientsData, productsData, ordersData] = await Promise.all([
        api.getClients(),
        api.getProducts(),
        api.getOrders()
      ]);
      setCustomers(clientsData);
      setProducts(productsData);
      setOrders(ordersData);
    } catch (e) {
      console.error("Erro ao carregar dados do D1:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const addCustomer = async (data: any) => {
    await api.createClient(data);
    await loadData();
  };

  const updateCustomer = async (id: string, data: any) => {
    await api.updateClient(id, data);
    await loadData();
  };

  const deleteCustomer = async (id: string) => {
    await api.deleteClient(id);
    await loadData();
  };

  const addProduct = async (data: any) => {
    await api.createProduct(data);
    await loadData();
  };

  const deleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    await loadData();
  };

  const addOrder = async (data: any) => {
    const res = await api.createOrder(data);
    await loadData();
    return res;
  };

  const updateOrder = async (id: string, data: any) => {
    await api.updateOrder(id, data);
    await loadData();
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    await api.updateOrder(id, { status });
    await loadData();
  };

  return (
    <DataContext.Provider value={{ 
      customers, products, orders, isLoading, 
      addCustomer, updateCustomer, deleteCustomer,
      addProduct, deleteProduct, addOrder, updateOrder, updateOrderStatus
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
