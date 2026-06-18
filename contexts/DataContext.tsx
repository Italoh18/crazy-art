
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, Product, Order, OrderStatus, ProductionStep, CarouselImage, TrustedCompany, Coupon, Molde } from '../types';
import { api } from '../src/services/api';

interface DataContextType {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  carouselImages: CarouselImage[];
  trustedCompanies: TrustedCompany[];
  coupons: Coupon[];
  moldes: Molde[];
  faviconUrl: string | null;
  mockupBaseUrl: string | null;
  mockupBaseX: number;
  mockupBaseY: number;
  mockupBaseWidth: number;
  updateMockupBasePosition: (x: number, y: number, width: number) => Promise<void>;
  mockupBackgroundUrl: string | null;
  mockupCollars: any[];
  updateMockupCollars: (collars: any[]) => Promise<void>;
  mockupCuffs: any[];
  updateMockupCuffs: (cuffs: any[]) => Promise<void>;
  mockupParts: any[];
  updateMockupParts: (parts: any[]) => Promise<void>;
  isLoading: boolean;
  addCustomer: (customer: any) => Promise<void>;
  updateCustomer: (id: string, data: any) => Promise<any>;
  deleteCustomer: (id: string) => Promise<void>;
  addProduct: (product: any) => Promise<any>;
  updateProduct: (id: string, data: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder: (order: any) => Promise<any>;
  updateOrder: (id: string, data: any) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateProductionStep: (id: string, step: ProductionStep) => Promise<void>;
  addCarouselImage: (url: string) => Promise<void>;
  deleteCarouselImage: (id: string) => Promise<void>;
  addTrustedCompany: (name: string, imageUrl: string) => Promise<void>;
  deleteTrustedCompany: (id: string) => Promise<void>;
  addCoupon: (data: any) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  validateCoupon: (code: string) => Promise<Coupon | null>;
  loadCoupons: () => Promise<void>;
  addMolde: (data: any) => Promise<void>;
  updateMolde: (id: string, data: any) => Promise<void>;
  deleteMolde: (id: string) => Promise<void>;
  loadData: (silent?: boolean) => Promise<void>;
  updateFavicon: (url: string) => Promise<void>;
  updateMockupBase: (url: string) => Promise<void>;
  updateMockupBackground: (url: string) => Promise<void>;
  loadDriveFiles: (folder?: string) => Promise<void>;
  driveFiles: any[];
  addDriveFile: (data: any) => Promise<void>;
  deleteDriveFile: (id: string) => Promise<void>;
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
    creditLimit: c.creditLimit !== undefined ? Number(c.creditLimit) : (c.credit_limit !== undefined ? Number(c.credit_limit) : 0),
    isSubscriber: c.isSubscriber === 1 || c.isSubscriber === true || c.is_subscriber === 1 || c.is_subscriber === true
  };
};

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [trustedCompanies, setTrustedCompanies] = useState<TrustedCompany[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [moldes, setMoldes] = useState<Molde[]>([]);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [mockupBaseUrl, setMockupBaseUrl] = useState<string | null>(null);
  const [mockupBaseX, setMockupBaseX] = useState<number>(50);
  const [mockupBaseY, setMockupBaseY] = useState<number>(50);
  const [mockupBaseWidth, setMockupBaseWidth] = useState<number>(100);
  const [mockupBackgroundUrl, setMockupBackgroundUrl] = useState<string | null>(null);
  const [mockupCollars, setMockupCollars] = useState<any[]>([]);
  const [mockupCuffs, setMockupCuffs] = useState<any[]>([]);
  const [mockupParts, setMockupParts] = useState<any[]>([]);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isLoadingRef = React.useRef(false);
  const cacheRef = React.useRef<Record<string, number>>({});

  const loadData = async (silent = false, entities?: ('customers' | 'products' | 'orders' | 'carousel' | 'trusted' | 'settings' | 'coupons' | 'moldes')[]) => {
    const token = localStorage.getItem('auth_token');
    
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) return;
    
    // Throttle silent loads (debounce)
    const now = Date.now();
    if (silent && cacheRef.current['all'] && (now - cacheRef.current['all'] < 5000)) {
      return;
    }

    if (!silent) setIsLoading(true);
    isLoadingRef.current = true;

    try {
      const shouldLoad = (e: string) => !entities || entities.includes(e as any);

      const promises = [
        (shouldLoad('customers') && token) ? api.getClients() : Promise.resolve(null),
        shouldLoad('products') ? api.getProducts() : Promise.resolve(null),
        (shouldLoad('orders') && token) ? api.getOrders() : Promise.resolve(null),
        shouldLoad('carousel') ? api.getCarousel().catch(() => []) : Promise.resolve(null),
        shouldLoad('trusted') ? api.getTrustedCompanies().catch(() => []) : Promise.resolve(null),
        shouldLoad('settings') ? api.getSettings().catch(() => ({})) : Promise.resolve(null),
        (shouldLoad('coupons') && token && localStorage.getItem('user_role') === 'admin') ? api.getCoupons().catch(() => []) : Promise.resolve(null),
        shouldLoad('moldes') ? api.getMoldes().catch(() => []) : Promise.resolve(null)
      ];

      const results = await Promise.allSettled(promises);

      // Tratamento robusto para Clientes
      if (results[0].status === 'fulfilled' && results[0].value !== null) {
        const data = results[0].value;
        const list = Array.isArray(data) ? data : (data?.data || []);
        setCustomers(list.map(normalizeCustomer));
        cacheRef.current['customers'] = Date.now();
      }

      // Tratamento robusto para Produtos/Catálogo
      if (results[1].status === 'fulfilled' && results[1].value !== null) {
        const data = results[1].value;
        setProducts(Array.isArray(data) ? data : (data?.data || []));
        cacheRef.current['products'] = Date.now();
      }

      // Tratamento robusto para Pedidos
      if (results[2].status === 'fulfilled' && results[2].value !== null) {
        const data = results[2].value;
        setOrders(Array.isArray(data) ? data : (data?.data || []));
        cacheRef.current['orders'] = Date.now();
      }

      if (results[3].status === 'fulfilled' && results[3].value !== null) setCarouselImages(results[3].value || []);
      if (results[4].status === 'fulfilled' && results[4].value !== null) setTrustedCompanies(results[4].value || []);
      if (results[5].status === 'fulfilled' && results[5].value !== null) {
        const settings = results[5].value || {};
        if (settings.favicon_url) setFaviconUrl(settings.favicon_url);
        if (settings.mockup_base_url) setMockupBaseUrl(settings.mockup_base_url);
        if (settings.mockup_base_x) setMockupBaseX(Number(settings.mockup_base_x));
        if (settings.mockup_base_y) setMockupBaseY(Number(settings.mockup_base_y));
        if (settings.mockup_base_width) setMockupBaseWidth(Number(settings.mockup_base_width));
        if (settings.mockup_background_url) setMockupBackgroundUrl(settings.mockup_background_url);
        if (settings.mockup_collars) {
          try {
            setMockupCollars(JSON.parse(settings.mockup_collars));
          } catch (_) {
            setMockupCollars([]);
          }
        }
        if (settings.mockup_cuffs) {
          try {
            setMockupCuffs(JSON.parse(settings.mockup_cuffs));
          } catch (_) {
            setMockupCuffs([]);
          }
        }
        if (settings.mockup_parts) {
          try {
            setMockupParts(JSON.parse(settings.mockup_parts));
          } catch (_) {
            setMockupParts([]);
          }
        }
      }
      if (results[6].status === 'fulfilled' && results[6].value !== null) setCoupons(results[6].value || []);
      if (results[7].status === 'fulfilled' && results[7].value !== null) {
          const data = results[7].value || [];
          setMoldes(data.map((m: any) => ({
              ...m,
              measurements: typeof m.measurements === 'string' ? JSON.parse(m.measurements) : m.measurements
          })));
      }

      if (!entities) cacheRef.current['all'] = Date.now();

    } catch (e) {
      console.error("Erro crítico no carregamento de dados:", e);
    } finally {
      isLoadingRef.current = false;
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addCustomer = async (data: any) => {
    try {
      const res = await api.createClient(data);
      if (res && res.id) {
          const newCustomer = normalizeCustomer({
              ...data,
              id: res.id
          });
          setCustomers(prev => [...prev, newCustomer]);
          await loadData(true, ['customers']);
      } else {
          await loadData(true, ['customers']);
      }
    } catch (e: any) { alert(e.message); }
  };

  const updateCustomer = async (id: string, data: any) => {
    try {
      const res = await api.updateClient(id, data);
      if (res && res.id) {
          const updated = normalizeCustomer(res);
          setCustomers(prev => prev.map(c => c.id === id ? updated : c));
      } else {
          await loadData(true, ['customers']);
      }
      return res;
    } catch (e: any) { alert(e.message); }
  };

  const deleteCustomer = async (id: string) => {
    try {
      if (confirm("Deseja realmente excluir este cliente? Esta ação não pode ser desfeita.")) {
        const previous = [...customers];
        setCustomers(prev => prev.filter(c => c.id !== id));
        try {
            await api.deleteClient(id);
        } catch (err) {
            setCustomers(previous);
            throw err;
        }
      }
    } catch (e: any) { 
      alert(e.message); 
    }
  };

  const addProduct = async (data: any) => {
    try {
      const res = await api.createProduct(data);
      if (res && res.id) {
          const newProduct = {
              ...data,
              id: res.id,
              active: true
          };
          setProducts(prev => [...prev, newProduct]);
          await loadData(true, ['products']);
      } else {
          await loadData(true, ['products']);
      }
      return res;
    } catch (e: any) { 
      alert(e.message); 
      throw e;
    }
  };

  const updateProduct = async (id: string, data: any) => {
    try {
      const res = await api.updateProduct(id, data);
      if (res && res.id) {
          setProducts(prev => prev.map(p => p.id === id ? res : p));
      } else {
          await loadData(true, ['products']);
      }
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
      if (res && res.id) {
          const newOrder = {
              ...data,
              id: res.id,
              order_number: res.order_number || 0,
              formattedOrderNumber: res.formattedOrderNumber || String(res.order_number || 0).padStart(5, '0'),
              total: res.total || 0,
              created_at: new Date().toISOString(),
              order_date: data.order_date || data.orderDate || new Date().toISOString().split('T')[0],
              due_date: data.due_date || data.dueDate || '',
              status: data.status || 'open',
              production_step: data.production_step || 'production',
              client_name: data.client_name || ''
          };
          setOrders(prev => [newOrder, ...prev]);
          await loadData(true, ['orders']);
      } else {
          await loadData(true, ['orders']);
      }
      return res;
    } catch (e: any) { 
      alert(e.message); 
      throw e;
    }
  };

  const updateOrder = async (id: string, data: any) => {
    try {
      const res = await api.updateOrder(id, data);
      if (res && res.id) {
          setOrders(prev => prev.map(o => o.id === id ? res : o));
      } else {
          await loadData(true, ['orders']);
      }
    } catch (e: any) { alert(e.message); }
  };

  const deleteOrder = async (id: string) => {
    try {
      if (confirm("Deseja realmente excluir este pedido? Esta ação não pode ser desfeita.")) {
        const previous = [...orders];
        setOrders(prev => prev.filter(o => o.id !== id));
        try {
            await api.deleteOrder(id);
        } catch (err) {
            setOrders(previous);
            throw err;
        }
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const res = await api.updateOrder(id, { status });
      if (res && res.id) {
          setOrders(prev => prev.map(o => o.id === id ? res : o));
      } else {
          await loadData(true, ['orders']);
      }
    } catch (e: any) { alert(e.message); }
  };

  const updateProductionStep = async (id: string, step: ProductionStep) => {
    try {
      const res = await api.updateProductionStep(id, step);
      if (res && res.id) {
          setOrders(prev => prev.map(o => o.id === id ? res : o));
      } else {
          await loadData(true, ['orders']);
      }
    } catch (e: any) { alert(e.message); }
  };

  const addCarouselImage = async (url: string) => {
    try {
      const res = await api.addCarouselImage(url);
      if (res && res.id) {
          setCarouselImages(prev => [...prev, res]);
      } else {
          await loadData(true, ['carousel']);
      }
    } catch (e: any) { alert(e.message); }
  };

  const deleteCarouselImage = async (id: string) => {
    try {
      if (confirm("Deseja remover esta imagem do carrossel?")) {
        const previous = [...carouselImages];
        setCarouselImages(prev => prev.filter(img => img.id !== id));
        try {
            await api.deleteCarouselImage(id);
        } catch (err) {
            setCarouselImages(previous);
            throw err;
        }
      }
    } catch (e: any) { 
      alert(e.message); 
    }
  };

  const addTrustedCompany = async (name: string, imageUrl: string) => {
    try {
      const res = await api.addTrustedCompany({ name, imageUrl });
      if (res && res.id) {
          setTrustedCompanies(prev => [...prev, res]);
      } else {
          await loadData(true, ['trusted']);
      }
    } catch (e: any) { alert(e.message); }
  };

  const deleteTrustedCompany = async (id: string) => {
    try {
      if (confirm("Deseja remover esta empresa?")) {
        const previous = [...trustedCompanies];
        setTrustedCompanies(prev => prev.filter(c => c.id !== id));
        try {
            await api.deleteTrustedCompany(id);
        } catch (err) {
            setTrustedCompanies(previous);
            throw err;
        }
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const loadCoupons = async () => {
      // Use the optimized loadData which already handles locks and throttling
      await loadData(true, ['coupons']);
  };

  const addCoupon = async (data: any) => {
      try {
          const res = await api.addCoupon(data);
          if (res && res.id && res.code) {
              setCoupons(prev => [res, ...prev]);
          } else {
              await loadCoupons();
          }
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

  const updateFavicon = async (url: string) => {
      try {
          await api.updateSetting('favicon_url', url);
          setFaviconUrl(url);
      } catch (e: any) {
          alert(e.message);
      }
  };

  // Efeito para atualizar manifest e favicon dinamicamente baseado nas configurações de Identidade
  useEffect(() => {
    if (!faviconUrl) return;

    // 1. Atualizar Favicon da Aba
    const faviconLink = document.getElementById('favicon-link') as HTMLLinkElement;
    if (faviconLink) faviconLink.href = faviconUrl;

    // 2. Atualizar Apple Touch Icon
    const appleIcon = document.getElementById('apple-touch-icon') as HTMLLinkElement;
    if (appleIcon) appleIcon.href = faviconUrl;

    // 3. Gerar e Atualizar Manifest dinâmico
    const manifest = {
      name: "Crazy Art",
      short_name: "Crazy Art",
      description: "Comunicação Visual & Design para Estamparia",
      start_url: "/",
      display: "standalone",
      background_color: "#09090b",
      theme_color: "#09090b",
      icons: [
        {
          src: faviconUrl,
          sizes: "192x192 512x512",
          type: "image/png", // O navegador costuma ser flexível aqui, mas PNG é o mais comum
          purpose: "any maskable"
        }
      ]
    };

    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(blob);
    
    const manifestLink = document.getElementById('manifest-link') as HTMLLinkElement;
    if (manifestLink) {
      const oldUrl = manifestLink.href;
      manifestLink.href = manifestURL;
      
      // Cleanup do URL antigo se for um blob
      if (oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
    }

    return () => {
      if (manifestURL.startsWith('blob:')) {
        URL.revokeObjectURL(manifestURL);
      }
    };
  }, [faviconUrl]);

  const updateMockupBase = async (url: string) => {
      try {
          await api.updateSetting('mockup_base_url', url);
          setMockupBaseUrl(url);
      } catch (e: any) {
          alert(e.message);
      }
  };

  const updateMockupBasePosition = async (x: number, y: number, width: number) => {
      try {
          await Promise.all([
              api.updateSetting('mockup_base_x', String(x)),
              api.updateSetting('mockup_base_y', String(y)),
              api.updateSetting('mockup_base_width', String(width))
          ]);
          setMockupBaseX(x);
          setMockupBaseY(y);
          setMockupBaseWidth(width);
      } catch (e: any) {
          alert(e.message);
      }
  };

  const updateMockupBackground = async (url: string) => {
      try {
          await api.updateSetting('mockup_background_url', url);
          setMockupBackgroundUrl(url);
      } catch (e: any) {
          alert(e.message);
      }
  };

  const updateMockupCollars = async (collars: any[]) => {
      try {
          await api.updateSetting('mockup_collars', JSON.stringify(collars));
          setMockupCollars(collars);
      } catch (e: any) {
          alert(e.message);
      }
  };

  const updateMockupCuffs = async (cuffs: any[]) => {
      try {
          await api.updateSetting('mockup_cuffs', JSON.stringify(cuffs));
          setMockupCuffs(cuffs);
      } catch (e: any) {
          alert(e.message);
      }
  };

  const updateMockupParts = async (parts: any[]) => {
      try {
          await api.updateSetting('mockup_parts', JSON.stringify(parts));
          setMockupParts(parts);
      } catch (e: any) {
          alert(e.message);
      }
  };

  const loadDriveFiles = async (folder?: string) => {
      // Throttle drive file loading
      const cacheKey = `drive_${folder || 'root'}`;
      const now = Date.now();
      if (cacheRef.current[cacheKey] && (now - cacheRef.current[cacheKey] < 5000)) {
          return;
      }

      try {
          const res = await api.getDriveFiles(folder);
          setDriveFiles(res || []);
          cacheRef.current[cacheKey] = Date.now();
      } catch (e) { console.error(e); }
  };

  const addDriveFile = async (data: any) => {
    try {
      const res = await api.addDriveFile(data);
      if (res && res.id) {
          setDriveFiles(prev => [res, ...prev]);
      } else {
          loadDriveFiles();
      }
    } catch (e: any) { alert(e.message); }
  };

  const deleteDriveFile = async (id: string) => {
      if (confirm("Excluir este arquivo?")) {
          try {
              setDriveFiles(prev => prev.filter(f => f.id !== id));
              await api.deleteDriveFile(id);
          } catch (e: any) { alert(e.message); }
      }
  };

  const addMolde = async (data: any) => {
    try {
      await api.addMolde(data);
      await loadData(true, ['moldes']);
    } catch (e: any) { alert(e.message); }
  };

  const updateMolde = async (id: string, data: any) => {
    try {
      await api.updateMolde(id, data);
      await loadData(true, ['moldes']);
    } catch (e: any) { alert(e.message); }
  };

  const deleteMolde = async (id: string) => {
    if (confirm("Deseja realmente excluir este molde?")) {
      try {
        await api.deleteMolde(id);
        await loadData(true, ['moldes']);
      } catch (e: any) { alert(e.message); }
    }
  };

  return (
    <DataContext.Provider value={{ 
      customers, products, orders, carouselImages, trustedCompanies, coupons, moldes, faviconUrl, 
      mockupBaseUrl, mockupBaseX, mockupBaseY, mockupBaseWidth, updateMockupBasePosition,
      mockupBackgroundUrl, mockupCollars, updateMockupCollars, mockupCuffs, updateMockupCuffs, mockupParts, updateMockupParts, isLoading,  
      addCustomer, updateCustomer, deleteCustomer,
      addProduct, updateProduct, deleteProduct, 
      addOrder, updateOrder, deleteOrder, updateOrderStatus, updateProductionStep,
      addCarouselImage, deleteCarouselImage,
      addTrustedCompany, deleteTrustedCompany,
      addCoupon, deleteCoupon, validateCoupon, loadCoupons,
      addMolde, updateMolde, deleteMolde,
      updateFavicon, updateMockupBase, updateMockupBackground, loadData,
      driveFiles, loadDriveFiles, addDriveFile, deleteDriveFile
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
