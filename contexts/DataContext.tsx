
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, Product, Order, OrderStatus, CarouselImage, TrustedCompany } from '../types';
import { api } from '../src/services/api';

interface DataContextType {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  carouselImages: CarouselImage[];
  trustedCompanies: TrustedCompany[];
  isLoading: boolean;
  addCustomer: (customer: any) => Promise<void>;
  updateCustomer: (id: string, data: any) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addProduct: (product: any) => Promise<any>;
  updateProduct: (id: string, data: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder: (order: any) => Promise<any>;
  updateOrder: (id: string, data: any) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  addCarouselImage: (url: string) => Promise<void>;
  deleteCarouselImage: (id: string) => Promise<void>;
  addTrustedCompany: (name: string, imageUrl: string) => Promise<void>;
  deleteTrustedCompany: (id: string) => Promise<void>;
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
  const [trustedCompanies, setTrustedCompanies] = useState<TrustedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // loadData now accepts a silent flag to prevent UI blocking
  const loadData = async (silent = false) => {
    const token = localStorage.getItem('auth_token');
    
    if (!silent) setIsLoading(true);

    try {
      const [clientsRes, productsRes, ordersRes, carouselRes, trustedRes] = await Promise.allSettled([
        token ? api.getClients() : Promise.resolve([]),
        token ? api.getProducts() : Promise.resolve([]),
        token ? api.getOrders() : Promise.resolve([]),
        api.getCarousel(),
        api.getTrustedCompanies()
      ]);

      if (clientsRes.status === 'fulfilled') {
        const data = clientsRes.value;
        const customersList = Array.isArray(data) ? data : (data?.data || []);
        setCustomers(customersList.map(normalizeCustomer));
      }

      if (productsRes.status === 'fulfilled') {
        const data = productsRes.value;
        setProducts(Array.isArray(data) ? data : (data?.data || []));
      }

      if (ordersRes.status === 'fulfilled') {
        const data = ordersRes.value;
        setOrders(Array.isArray(data) ? data : (data?.data || []));
      }

      if (carouselRes.status === 'fulfilled') {
        setCarouselImages(carouselRes.value || []);
      }

      if (trustedRes.status === 'fulfilled') {
        setTrustedCompanies(trustedRes.value || []);
      }

    } catch (e) {
      console.error("Erro no carregamento de dados:", e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addCustomer = async (data: any) => {
    try {
      await api.createClient(data);
      await loadData(true);
    } catch (e: any) { alert(e.message); }
  };

  const updateCustomer = async (id: string, data: any) => {
    try {
      await api.updateClient(id, data);
      await loadData(true);
    } catch (e: any) { alert(e.message); }
  };

  const deleteCustomer = async (id: string) => {
    try {
      if (confirm("Deseja realmente excluir este cliente? Esta ação não pode ser desfeita.")) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        await api.deleteClient(id);
        // await loadData(true); // Removido para evitar race condition
      }
    } catch (e: any) { 
      await loadData(true); 
      alert(e.message); 
    }
  };

  const addProduct = async (data: any) => {
    try {
      const res = await api.createProduct(data);
      await loadData(true);
      return res;
    } catch (e: any) { 
      alert(e.message); 
      throw e;
    }
  };

  const updateProduct = async (id: string, data: any) => {
    try {
      await api.updateProduct(id, data);
      await loadData(true);
    } catch (e: any) { 
      alert(e.message); 
      throw e;
    }
  };

  const deleteProduct = async (id: string) => {
    if (!id) {
        console.error("ID inválido para exclusão");
        return;
    }

    // Backup state for rollback
    const previousProducts = [...products];

    // Optimistic Update: Remove immediately from UI
    setProducts(prev => prev.filter(p => p.id !== id));
    
    try {
      // Execute Delete on API
      await api.deleteProduct(id);
      
      // NÃO recarregamos os dados aqui. 
      // O D1 tem consistência eventual, então se lermos agora, o item ainda pode estar lá.
      // Como já removemos da UI via setProducts, confiamos nisso.
    } catch (e: any) { 
      // Revert Optimistic Update
      setProducts(previousProducts);
      console.error("Failed to delete product:", e);
      throw e; 
    }
  };

  const addOrder = async (data: any) => {
    try {
      const res = await api.createOrder(data);
      await loadData(true);
      return res;
    } catch (e: any) { 
      alert(e.message); 
      throw e;
    }
  };

  const updateOrder = async (id: string, data: any) => {
    try {
      await api.updateOrder(id, data);
      await loadData(true);
    } catch (e: any) { alert(e.message); }
  };

  const deleteOrder = async (id: string) => {
    try {
      if (confirm("Deseja realmente excluir este pedido? Esta ação não pode ser desfeita.")) {
        setOrders(prev => prev.filter(o => o.id !== id));
        await api.deleteOrder(id);
        // await loadData(true); // Removido para evitar race condition
      }
    } catch (e: any) {
      await loadData(true);
      alert(e.message);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      await api.updateOrder(id, { status });
      await loadData(true);
    } catch (e: any) { alert(e.message); }
  };

  const addCarouselImage = async (url: string) => {
    try {
      await api.addCarouselImage(url);
      await loadData(true);
    } catch (e: any) { alert(e.message); }
  };

  const deleteCarouselImage = async (id: string) => {
    try {
      if (confirm("Deseja remover esta imagem do carrossel?")) {
        setCarouselImages(prev => prev.filter(img => img.id !== id));
        await api.deleteCarouselImage(id);
        // await loadData(true); // Removido para evitar race condition
      }
    } catch (e: any) { 
      await loadData(true);
      alert(e.message); 
    }
  };

  const addTrustedCompany = async (name: string, imageUrl: string) => {
    try {
      await api.addTrustedCompany({ name, imageUrl });
      await loadData(true);
    } catch (e: any) { alert(e.message); }
  };

  const deleteTrustedCompany = async (id: string) => {
    try {
      if (confirm("Deseja remover esta empresa?")) {
        setTrustedCompanies(prev => prev.filter(c => c.id !== id));
        await api.deleteTrustedCompany(id);
      }
    } catch (e: any) {
      await loadData(true);
      alert(e.message);
    }
  };

  return (
    <DataContext.Provider value={{ 
      customers, products, orders, carouselImages, trustedCompanies, isLoading, 
      addCustomer, updateCustomer, deleteCustomer,
      addProduct, updateProduct, deleteProduct, 
      addOrder, updateOrder, deleteOrder, updateOrderStatus,
      addCarouselImage, deleteCarouselImage,
      addTrustedCompany, deleteTrustedCompany
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
