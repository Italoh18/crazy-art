
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, Product, Order, OrderStatus, CarouselImage } from '../types';
import { api } from '../src/services/api';

interface DataContextType {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  carouselImages: CarouselImage[];
  isLoading: boolean;
  addCustomer: (customer: any) => Promise<void>;
  updateCustomer: (id: string, data: any) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addProduct: (product: any) => Promise<any>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder: (order: any) => Promise<any>;
  updateOrder: (id: string, data: any) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  addCarouselImage: (url: string) => Promise<void>;
  deleteCarouselImage: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const normalizeCustomer = (c: any): Customer => {
  if (!c) return c;
  return {
    ...c,
    address: {
      street: c.street || '',
      number: c.number || '',
      zipCode: c.zipCode || ''
    },
    creditLimit: typeof c.creditLimit === 'number' ? c.creditLimit : 0
  };
};

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    const token = localStorage.getItem('auth_token');
    
    try {
      const [clientsRes, productsRes, ordersRes, carouselRes] = await Promise.allSettled([
        token ? api.getClients() : Promise.resolve([]),
        token ? api.getProducts() : Promise.resolve([]), // Agora busca do /api/catalog
        token ? api.getOrders() : Promise.resolve([]),
        api.getCarousel()
      ]);

      if (clientsRes.status === 'fulfilled') {
        const data = clientsRes.value;
        const customersList = Array.isArray(data) ? data : (data?.data || []);
        setCustomers(customersList.map(normalizeCustomer));
      }

      if (productsRes.status === 'fulfilled') {
        const data = productsRes.value;
        // Agora o catálogo unificado retorna tanto produtos quanto serviços
        setProducts(Array.isArray(data) ? data : (data?.data || []));
      }

      if (ordersRes.status === 'fulfilled') {
        const data = ordersRes.value;
        setOrders(Array.isArray(data) ? data : (data?.data || []));
      }

      if (carouselRes.status === 'fulfilled') {
        setCarouselImages(carouselRes.value || []);
      }

    } catch (e) {
      console.error("Erro no carregamento de dados:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addCustomer = async (data: any) => {
    try {
      await api.createClient(data);
      await loadData();
    } catch (e: any) { alert(e.message); }
  };

  const updateCustomer = async (id: string, data: any) => {
    try {
      await api.updateClient(id, data);
      await loadData();
    } catch (e: any) { alert(e.message); }
  };

  const deleteCustomer = async (id: string) => {
    try {
      if (confirm("Excluir cliente?")) {
        await api.deleteClient(id);
        await loadData();
      }
    } catch (e: any) { alert(e.message); }
  };

  const addProduct = async (data: any) => {
    try {
      // Agora o createProduct chama /api/catalog e aceita data.type
      const res = await api.createProduct(data);
      await loadData();
      return res;
    } catch (e: any) { 
      alert(e.message); 
      throw e;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      await loadData();
    } catch (e: any) { alert(e.message); }
  };

  const addOrder = async (data: any) => {
    try {
      const res = await api.createOrder(data);
      await loadData();
      return res;
    } catch (e: any) { 
      alert(e.message); 
      throw e;
    }
  };

  const updateOrder = async (id: string, data: any) => {
    try {
      await api.updateOrder(id, data);
      await loadData();
    } catch (e: any) { alert(e.message); }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      await api.updateOrder(id, { status });
      await loadData();
    } catch (e: any) { alert(e.message); }
  };

  const addCarouselImage = async (url: string) => {
    try {
      await api.addCarouselImage(url);
      await loadData();
    } catch (e: any) { alert(e.message); }
  };

  const deleteCarouselImage = async (id: string) => {
    try {
      await api.deleteCarouselImage(id);
      await loadData();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <DataContext.Provider value={{ 
      customers, products, orders, carouselImages, isLoading, 
      addCustomer, updateCustomer, deleteCustomer,
      addProduct, deleteProduct, addOrder, updateOrder, updateOrderStatus,
      addCarouselImage, deleteCarouselImage
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
