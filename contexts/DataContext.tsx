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
      const [clientsRes, productsRes, ordersRes] = await Promise.all([
        api.getClients(),
        api.getProducts(),
        api.getOrders()
      ]);

      // Extrai os dados garantindo que sejam arrays
      const customersList = clientsRes && clientsRes.success ? clientsRes.data : (Array.isArray(clientsRes) ? clientsRes : []);
      const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || []);
      const ordersList = Array.isArray(ordersRes) ? ordersRes : (ordersRes.data || []);

      setCustomers(customersList);
      setProducts(productsList);
      setOrders(ordersList);
    } catch (e) {
      console.error("Erro crítico ao carregar dados do D1:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const addCustomer = async (data: any) => {
    try {
      const res = await api.createClient(data);
      if (res.success) {
        await loadData(); // Recarrega do banco para garantir sincronia
      }
    } catch (e: any) {
      alert(e.message || "Erro ao salvar cliente.");
    }
  };

  const updateCustomer = async (id: string, data: any) => {
    try {
      await api.updateClient(id, data);
      await loadData();
    } catch (e: any) {
      alert("Erro ao atualizar cliente: " + e.message);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      if (confirm("Deseja realmente excluir este cliente?")) {
        await api.deleteClient(id);
        await loadData();
      }
    } catch (e: any) {
      alert("Erro ao excluir cliente: " + e.message);
    }
  };

  const addProduct = async (data: any) => {
    try {
      await api.createProduct(data);
      await loadData();
    } catch (e: any) {
      alert("Erro ao salvar produto: " + e.message);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      await loadData();
    } catch (e: any) {
      alert("Erro ao excluir produto: " + e.message);
    }
  };

  const addOrder = async (data: any) => {
    try {
      const res = await api.createOrder(data);
      await loadData();
      return res;
    } catch (e: any) {
      alert("Erro ao criar pedido: " + e.message);
      return null;
    }
  };

  const updateOrder = async (id: string, data: any) => {
    try {
      await api.updateOrder(id, data);
      await loadData();
    } catch (e: any) {
      alert("Erro ao atualizar pedido: " + e.message);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      await api.updateOrder(id, { status });
      await loadData();
    } catch (e: any) {
      alert("Erro ao atualizar status: " + e.message);
    }
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