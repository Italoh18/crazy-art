
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, Product, Order, OrderStatus, CarouselImage, TrustedCompany, DriveFile, Coupon } from '../types';
import { api } from '../src/services/api';

interface DataContextType {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  carouselImages: CarouselImage[];
  trustedCompanies: TrustedCompany[];
  driveFiles: DriveFile[];
  coupons: Coupon[];
  faviconUrl: string | null; // Novo State
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
  loadDriveFiles: (folder?: string) => Promise<void>;
  addDriveFile: (file: any) => Promise<void>;
  deleteDriveFile: (id: string) => Promise<void>;
  addCoupon: (data: any) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  validateCoupon: (code: string) => Promise<Coupon | null>;
  loadCoupons: () => Promise<void>;
  updateFavicon: (url: string) => Promise<void>; // Nova função
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
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // loadData now accepts a silent flag to prevent UI blocking
  const loadData = async (silent = false) => {
    const token = localStorage.getItem('auth_token');
    
    if (!silent) setIsLoading(true);

    try {
      const promises = [
        token ? api.getClients() : Promise.resolve([]),
        token ? api.getProducts() : Promise.resolve([]),
        token ? api.getOrders() : Promise.resolve([]),
        api.getCarousel(),
        api.getTrustedCompanies(),
        api.getSettings() // Carrega Configurações
      ];

      // Carrega cupons apenas se for admin
      const role = localStorage.getItem('user_role');
      if (token && role === 'admin') {
          promises.push(api.getCoupons());
      } else {
          promises.push(Promise.resolve([]));
      }

      const results = await Promise.allSettled(promises);

      if (results[0].status === 'fulfilled') {
        const data = results[0].value;
        const customersList = Array.isArray(data) ? data : (data?.data || []);
        setCustomers(customersList.map(normalizeCustomer));
      }

      if (results[1].status === 'fulfilled') {
        const data = results[1].value;
        setProducts(Array.isArray(data) ? data : (data?.data || []));
      }

      if (results[2].status === 'fulfilled') {
        const data = results[2].value;
        setOrders(Array.isArray(data) ? data : (data?.data || []));
      }

      if (results[3].status === 'fulfilled') {
        setCarouselImages(results[3].value || []);
      }

      if (results[4].status === 'fulfilled') {
        setTrustedCompanies(results[4].value || []);
      }

      if (results[5].status === 'fulfilled') {
        const settings = results[5].value || {};
        if (settings.favicon_url) setFaviconUrl(settings.favicon_url);
      }

      if (results[6] && results[6].status === 'fulfilled') {
        setCoupons(results[6].value || []);
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
    if (!id) return;
    const previousProducts = [...products];
    setProducts(prev => prev.filter(p => p.id !== id));
    try {
      await api.deleteProduct(id);
    } catch (e: any) { 
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

  const loadDriveFiles = async (folder?: string) => {
    try {
        const files = await api.getDriveFiles(folder);
        setDriveFiles(files || []);
    } catch (e) {
        console.error("Erro ao carregar arquivos do drive:", e);
    }
  };

  const addDriveFile = async (data: any) => {
    try {
        await api.addDriveFile(data);
        await loadDriveFiles(data.folder);
    } catch (e: any) { alert(e.message); }
  };

  const deleteDriveFile = async (id: string) => {
    try {
        if (confirm("Deseja excluir este arquivo permanentemente?")) {
            setDriveFiles(prev => prev.filter(f => f.id !== id));
            await api.deleteDriveFile(id);
        }
    } catch (e: any) {
        alert(e.message);
        await loadDriveFiles(); 
    }
  };

  // --- CUPONS ---
  const loadCoupons = async () => {
      try {
          const res = await api.getCoupons();
          setCoupons(res || []);
      } catch (e) { console.error(e); }
  };

  const addCoupon = async (data: any) => {
      try {
          await api.addCoupon(data);
          await loadCoupons();
      } catch (e: any) { alert(e.message); }
  };

  const deleteCoupon = async (id: string) => {
      if (confirm("Excluir este cupom permanentemente?")) {
          try {
              setCoupons(prev => prev.filter(c => c.id !== id));
              await api.deleteCoupon(id);
          } catch (e: any) { 
              alert(e.message);
              loadCoupons();
          }
      }
  };

  const validateCoupon = async (code: string) => {
      try {
          return await api.validateCoupon(code);
      } catch (e: any) {
          alert(e.message);
          return null;
      }
  };

  // --- SETTINGS (FAVICON) ---
  const updateFavicon = async (url: string) => {
      try {
          await api.updateSetting('favicon_url', url);
          setFaviconUrl(url);
      } catch (e: any) {
          alert(e.message);
      }
  };

  return (
    <DataContext.Provider value={{ 
      customers, products, orders, carouselImages, trustedCompanies, driveFiles, coupons, faviconUrl, isLoading, 
      addCustomer, updateCustomer, deleteCustomer,
      addProduct, updateProduct, deleteProduct, 
      addOrder, updateOrder, deleteOrder, updateOrderStatus,
      addCarouselImage, deleteCarouselImage,
      addTrustedCompany, deleteTrustedCompany,
      loadDriveFiles, addDriveFile, deleteDriveFile,
      addCoupon, deleteCoupon, validateCoupon, loadCoupons,
      updateFavicon
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
