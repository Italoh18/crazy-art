
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingBag, Wrench, Search, ShoppingCart, 
  CheckCircle, AlertOctagon, Send, X, Trash2, Minus, 
  Plus as PlusIcon, CreditCard, Loader2, MessageCircle, 
  Lock, UserPlus, ChevronRight, ListChecks, Upload, 
  Info, AlertTriangle, Wallet, Check, Film, FileText, Layers, Hash, ToggleLeft, ToggleRight,
  Coins, Ticket, Palette, CloudDownload, Filter, ArrowUpRight, Zap, Image as ImageIcon
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, Order, SizeListItem, Coupon, ItemType } from '../types';
import { api } from '../src/services/api';

type ShopStep = 'list' | 'detail' | 'questionnaire' | 'checkout' | 'success';

interface CartItem {
    product: Product;
    quantity: number;
    description?: string;
    tempId: string;
}

// Categorias visíveis apenas na aba "Estampas"
const DEFAULT_ART_CATEGORIES = [
    'Todos', 'Carnaval', 'Futebol', 'E-sport', 'Anime', 'Patterns', 'Icons', 'Emojis', 'Animais'
];

// Cores padronizadas para o filtro (Setorização)
export const ART_COLOR_FILTERS = [
    { name: 'Preto', hex: '#000000' },
    { name: 'Branco', hex: '#FFFFFF' },
    { name: 'Cinza', hex: '#808080' },
    { name: 'Vermelho', hex: '#EF4444' },
    { name: 'Laranja', hex: '#F97316' },
    { name: 'Amarelo', hex: '#EAB308' },
    { name: 'Verde', hex: '#22C55E' },
    { name: 'Azul', hex: '#3B82F6' },
    { name: 'Roxo', hex: '#A855F7' },
    { name: 'Rosa', hex: '#EC4899' },
];

export default function Shop() {
  const { products, addOrder, orders, validateCoupon } = useData();
  const { role, currentCustomer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<ShopStep>('list');
  const [activeTab, setActiveTab] = useState<ItemType>('product');
  const [searchTerm, setSearchTerm] = useState('');
  
  // States exclusivos da Quitanda
  const [quitandaTab, setQuitandaTab] = useState<'estampas' | 'logos' | 'bordados'>('estampas');
  const [activeArtCategory, setActiveArtCategory] = useState('Todos');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [wantsDigitalGrid, setWantsDigitalGrid] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [currentOrderDesc, setCurrentOrderDesc] = useState('');
  const [currentOrderQty, setCurrentOrderQty] = useState<number | string>(1);

  const [hasSizeList, setHasSizeList] = useState(false);
  const [sizeList, setSizeList] = useState<SizeListItem[]>([]);
  const [isGlobalSimple, setIsGlobalSimple] = useState(false);
  
  const [layoutOption, setLayoutOption] = useState<'sim' | 'precisa' | null>(null);
  const [moldOption, setMoldOption] = useState<'sim' | 'precisa' | null>(null);
  const [artLink, setArtLink] = useState('');
  const [artExtrasDesc, setArtExtrasDesc] = useState('');

  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // States para Cupom
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Inicializa a aba com base na URL
  useEffect(() => {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab === 'art') {
          setActiveTab('art');
      } else if (tab === 'service') {
          setActiveTab('service');
      } else {
          setActiveTab('product');
      }
  }, [location.search]);

  // Derivar categorias dinâmicas com base nos produtos existentes (apenas para Estampas)
  const artCategories = useMemo(() => {
      const existingCats = new Set(DEFAULT_ART_CATEGORIES);
      products.filter(p => 
          p.type === 'art' && 
          p.subcategory && 
          p.subcategory !== 'Logos' && 
          p.subcategory !== 'Bordados'
      ).forEach(p => {
          if (p.subcategory) existingCats.add(p.subcategory);
      });
      return Array.from(existingCats);
  }, [products]);

  const filteredItems = products.filter(item => {
     const itemType = item.type || 'product';
     
     // Filtro básico de tipo e busca
     let matches = itemType === activeTab && item.name.toLowerCase().includes(searchTerm.toLowerCase());
     
     // Filtros específicos da Quitanda
     if (activeTab === 'art') {
         // Filtro de Cor Global para todas as abas da Quitanda
         if (matches && selectedColor && item.primaryColor !== selectedColor) matches = false;

         if (quitandaTab === 'bordados') {
             // Mostra apenas itens marcados como 'Bordados'
             if (item.subcategory !== 'Bordados') matches = false;
         } else if (quitandaTab === 'logos') {
             // Mostra apenas itens marcados como 'Logos'
             if (item.subcategory !== 'Logos') matches = false;
         } else {
             // Aba ESTAMPAS: Exclui Logos e Bordados para não misturar
             if (item.subcategory === 'Logos' || item.subcategory === 'Bordados') matches = false;
             
             // Aplica filtros de categoria apenas aqui (Estampas)
             if (matches && activeArtCategory !== 'Todos' && item.subcategory !== activeArtCategory) matches = false;
         }
     }

     return matches;
  });

  const sizes = {
    unisex: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'],
    feminina: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1'],
    infantil: ['RN', '2', '4', '6', '8', '10', '12', '14', '16']
  };

  const openProduct = (product: Product) => {
    setViewingProduct(product);
    setCurrentOrderQty(1);
    setCurrentOrderDesc('');
    setStep('detail');
    window.scrollTo(0, 0);
  };

  const addToCart = () => {
      if (!viewingProduct) return;
      setCart(prev => [...prev, {
          product: viewingProduct,
          quantity: Number(currentOrderQty) || 1,
          description: currentOrderDesc,
          tempId: crypto.randomUUID()
      }]);
      setViewingProduct(null);
      setStep('list');
  };

  const buyNow = () => {
      if (!viewingProduct) return;
      setCart(prev => [...prev, {
          product: viewingProduct,
          quantity: Number(currentOrderQty) || 1,
          description: currentOrderDesc,
          tempId: crypto.randomUUID()
      }]);
      setViewingProduct(null);
      setStep('questionnaire');
  };

  const removeFromCart = (tempId: string) => {
      setCart(prev => prev.filter(item => item.tempId !== tempId));
      if (cart.length <= 1 && step === 'questionnaire') setStep('list');
  };

  const toggleGlobalSimpleMode = () => {
      const newValue = !isGlobalSimple;
      setIsGlobalSimple(newValue);
      setSizeList(prev => prev.map(item => ({
          ...item,
          isSimple: newValue,
          quantity: newValue ? (item.quantity || 1) : 1,
          name: newValue ? '' : item.name,
          number: newValue ? '' : item.number
      })));
  };

  const addListRow = () => {
    setSizeList([...sizeList, {
      id: crypto.randomUUID(), category: 'unisex', size: 'M', number: '', name: '', shortSize: 'M', shortNumber: '', quantity: 1, isSimple: isGlobalSimple
    }]);
  };

  const updateListRow = (id: string, field: keyof SizeListItem, value: any) => {
    setSizeList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeListRow = (id: string) => setSizeList(prev => prev.filter(item => item.id !== id));
  const calculateTotalItemsInList = () => sizeList.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const calculateFinalOrder = () => {
      const itemsPayload: any[] = [];
      let totalValue = 0;
      const totalListItems = calculateTotalItemsInList();

      cart.forEach(item => {
          let unitPrice = item.product.price;
          let qty = item.quantity;
          const nameLower = item.product.name.toLowerCase();
          
          if (sizeList.length > 0 && !wantsDigitalGrid) {
              if (nameLower.includes('camisa')) qty = totalListItems;
              else if (nameLower.includes('replica') || nameLower.includes('réplica')) { unitPrice = 2.00; qty = totalListItems; }
          }
          const subtotal = unitPrice * qty;
          totalValue += subtotal;
          
          itemsPayload.push({ 
              productId: item.product.id, 
              productName: item.product.name, 
              quantity: qty, 
              unitPrice: unitPrice, 
              total: subtotal, 
              type: item.product.type,
              downloadLink: item.product.downloadLink 
          });
      });

      const findServicePrice = (n: string, d: number) => {
          const s = products.find(p => p.name.toLowerCase().includes(n.toLowerCase()));
          return s ? s.price : d;
      };

      if (!wantsDigitalGrid) {
          if (layoutOption === 'precisa') {
              const p = findServicePrice('layout simples', 30); totalValue += p;
              itemsPayload.push({ productId: 'service-layout', productName: 'Serviço: Criação de Layout', quantity: 1, unitPrice: p, total: p, type: 'service' });
          }
          if (moldOption === 'precisa') {
              const p = findServicePrice('molde', 50); totalValue += p;
              itemsPayload.push({ productId: 'service-mold', productName: 'Serviço: Criação de Molde', quantity: 1, unitPrice: p, total: p, type: 'service' });
          }
      }

      if (wantsDigitalGrid && sizeList.length > 0) {
          const replicaService = products.find(p => p.name.toLowerCase().includes('replica') && p.name.toLowerCase().includes('molde')) 
                              || products.find(p => p.name.toLowerCase().includes('replica'));
          
          const replicaPrice = replicaService ? replicaService.price : 10.00;
          const gridCost = replicaPrice * totalListItems;
          
          totalValue += gridCost;
          itemsPayload.push({ 
              productId: replicaService ? replicaService.id : 'service-grid-digital', 
              productName: 'Serviço: Grade Digital (Réplica de Molde)', 
              quantity: totalListItems, 
              unitPrice: replicaPrice, 
              total: gridCost, 
              type: 'service' 
          });
      }

      return { items: itemsPayload, total: totalValue };
  };

  const calculateDiscountedTotal = () => {
      if (!lastCreatedOrder) return 0;
      const originalTotal = lastCreatedOrder.total;
      if (!appliedCoupon) return originalTotal;
      let discountAmount = 0;
      const { items } = calculateFinalOrder(); 
      items.forEach(item => {
          if (appliedCoupon.type === 'all' || (item.type as any) === appliedCoupon.type) {
              discountAmount += item.total * (appliedCoupon.percentage / 100);
          }
      });
      return Math.max(0, originalTotal - discountAmount);
  };

  const handleApplyCoupon = async () => {
      setCouponError('');
      setAppliedCoupon(null);
      if (!couponCode) return;
      setIsValidatingCoupon(true);
      const coupon = await validateCoupon(couponCode);
      setIsValidatingCoupon(false);
      if (coupon) setAppliedCoupon(coupon);
      else setCouponError('Cupom inválido ou expirado.');
  };

  const handleCreateOrder = async () => {
    if (role !== 'client' || !currentCustomer) return;
    setIsProcessing(true);
    try {
        const { items, total } = calculateFinalOrder();
        const orderData = {
            client_id: currentCustomer.id,
            description: cart.map(i => `${i.product.name} (x${i.quantity})`).join('; ') + 
                         (artExtrasDesc ? `\nDetalhes Logos: ${artExtrasDesc}` : '') +
                         (artLink ? `\nLink Arquivos: ${artLink}` : '') + 
                         (wantsDigitalGrid ? '\n[COM GRADE DIGITAL]' : ''),
            items: items,
            total: total,
            size_list: sizeList.length > 0 ? JSON.stringify(sizeList) : null,
            status: 'open', source: 'shop',
            order_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
        };
        const res = await addOrder(orderData);
        setLastCreatedOrder({ ...res, items }); 
        setStep('checkout');
    } finally { setIsProcessing(false); }
  };

  const handlePayMercadoPago = async () => {
    if (!lastCreatedOrder) return;
    setIsProcessing(true);
    try {
        const discountedTotal = calculateDiscountedTotal();
        const finalAmount = discountedTotal;
        let title = `Pedido #${lastCreatedOrder.order_number} - Crazy Art`;
        if (appliedCoupon) title += ` (Cupom: ${appliedCoupon.code})`;
        const res = await api.createPayment({
            orderId: lastCreatedOrder.id,
            title: title,
            amount: finalAmount,
            payerEmail: currentCustomer?.email,
            payerName: currentCustomer?.name
        });
        if (res?.init_point) { window.open(res.init_point, '_blank'); setStep('success'); }
    } finally { setIsProcessing(false); }
  };

  const canAddToAccount = useMemo(() => {
    if (!currentCustomer || !lastCreatedOrder) return false;
    const { items } = calculateFinalOrder();
    const allServices = items.every(i => i.type === 'service');
    const openOrdersTotal = orders.filter(o => o.client_id === currentCustomer.id && o.status === 'open').reduce((a, o) => a + Number(o.total || 0), 0);
    return allServices && (currentCustomer.creditLimit || 0) >= (openOrdersTotal + calculateDiscountedTotal());
  }, [currentCustomer, lastCreatedOrder, orders, appliedCoupon]);

  const getHeaderTitle = () => {
      if (step === 'list') {
          return activeTab === 'art' ? 'Quitanda de Artes' : 'Loja Crazy Art';
      }
      if (step === 'detail') return 'Detalhes do Item';
      if (step === 'questionnaire') return 'Revisar Pedido';
      if (step === 'checkout') return 'Pagamento';
      return 'Loja';
  };

  const renderStepList = () => (
    <div className="animate-fade-in relative pb-24">
        {/* Header/Nav Diferenciado para Quitanda */}
        {activeTab === 'art' ? (
            <div className="flex flex-col items-center mb-10 space-y-6">
                
                {/* Botão de Navegação para Loja Geral */}
                <div className="flex justify-end w-full items-center mb-2">
                    <button 
                        onClick={() => setActiveTab('product')}
                        className="text-[10px] text-zinc-400 hover:text-white uppercase tracking-widest flex items-center gap-1 transition group bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800"
                    >
                        Ir para Loja Geral <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>

                {/* Abas Internas da Quitanda: Estampas / Logos / Bordados */}
                <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-full max-w-md border border-zinc-800 shadow-xl overflow-x-auto mb-2">
                    <button 
                        onClick={() => { setQuitandaTab('estampas'); setSelectedColor(null); setSearchTerm(''); }} 
                        className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'estampas' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                        ESTAMPAS
                    </button>
                    <button 
                        onClick={() => { setQuitandaTab('logos'); setSelectedColor(null); setSearchTerm(''); }} 
                        className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'logos' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                        LOGOS
                    </button>
                    <button 
                        onClick={() => { setQuitandaTab('bordados'); setSelectedColor(null); setSearchTerm(''); }} 
                        className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'bordados' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                        BORDADOS
                    </button>
                </div>

                {/* Filtros de Categoria (Apenas para Estampas) */}
                {quitandaTab === 'estampas' && (
                    <div className="w-full overflow-x-auto pb-2">
                        <div className="flex gap-2 min-w-max px-1">
                            {artCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveArtCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap border ${
                                        activeArtCategory === cat 
                                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Busca e Filtro de Cor (Para todas as abas da Quitanda) */}
                <div className="w-full grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                    <div className="relative">
                        <input type="text" placeholder={`Buscar em ${quitandaTab}...`} className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 outline-none transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <Search className="absolute left-3 top-3.5 text-zinc-600" size={20} />
                    </div>
                    
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase px-2">Cores</div>
                        <button 
                            onClick={() => setSelectedColor(null)}
                            className={`flex items-center justify-center w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white transition shrink-0 ${!selectedColor ? 'ring-2 ring-white bg-zinc-700 text-white' : ''}`}
                            title="Todas as Cores"
                        >
                            <span className="block w-4 h-[1px] bg-current rotate-45 absolute"></span>
                            <span className="block w-4 h-[1px] bg-current -rotate-45 absolute"></span>
                        </button>
                        {ART_COLOR_FILTERS.map(color => (
                            <button
                                key={color.name}
                                onClick={() => setSelectedColor(selectedColor === color.hex ? null : color.hex)}
                                className={`w-8 h-8 rounded-full border-2 transition shrink-0 hover:scale-110 ${selectedColor === color.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-zinc-500'}`}
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>
                
                <div className="w-full p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl flex items-center gap-3">
                    <CloudDownload className="text-purple-400 shrink-0" />
                    <p className="text-xs text-purple-200">As artes da <strong>Quitanda</strong> são arquivos digitais para download imediato após pagamento.</p>
                </div>
            </div>
        ) : (
            // Header Padrão (Loja Geral)
            <div className="flex flex-col items-center mb-10 space-y-6">
                <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-full max-w-md border border-zinc-800 shadow-xl overflow-x-auto">
                    <button onClick={() => setActiveTab('product')} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${activeTab === 'product' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>PRODUTOS</button>
                    <button onClick={() => setActiveTab('service')} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${activeTab === 'service' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>SERVIÇOS</button>
                    <button onClick={() => { setActiveTab('art'); setQuitandaTab('estampas'); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'art' ? 'bg-purple-500 text-white shadow-sm' : 'text-zinc-500 hover:text-purple-400'}`}><Palette size={12} /> QUITANDA</button>
                </div>
                
                <div className="w-full max-w-md relative">
                    <input type="text" placeholder="Buscar na loja..." className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-primary outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <Search className="absolute left-3 top-3.5 text-zinc-600" size={20} />
                </div>
            </div>
        )}

        {/* Grid de Produtos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
                <div key={item.id} onClick={() => openProduct(item)} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-primary/50 transition cursor-pointer group h-full flex flex-col">
                    <div className="h-56 bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                        {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                            item.type === 'art' ? <Palette size={64} className="text-purple-500/50" /> : <ShoppingBag size={64} className="text-zinc-700" />
                        )}
                        <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase backdrop-blur-md ${item.type === 'art' ? 'bg-purple-600/80' : 'bg-black/60'}`}>
                            R$ {item.price.toFixed(2)}
                        </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-white text-lg leading-tight">{item.name}</h3>
                        <p className="text-zinc-500 text-xs mt-2 line-clamp-2 flex-1">{item.description || 'Clique para ver detalhes'}</p>
                        
                        {item.type === 'art' && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <div className="flex items-center gap-1 text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                                    <CloudDownload size={12} /> Digital
                                </div>
                                {item.subcategory && (
                                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">{item.subcategory}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
        
        {filteredItems.length === 0 && (
            <div className="text-center py-20 opacity-50">
                <p>Nenhum item encontrado.</p>
                {activeTab === 'art' && <p className="text-xs mt-2">Tente outra aba ou categoria.</p>}
            </div>
        )}

        {cart.length > 0 && (
            <div className="fixed top-24 right-4 z-40 w-auto animate-fade-in-up">
                <div className="bg-zinc-900/90 backdrop-blur-md border border-primary/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3"><div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">{cart.length}</div><div className="flex flex-col"><span className="text-white text-sm font-bold">Carrinho</span><span className="text-zinc-400 text-xs">R$ {calculateFinalOrder().total.toFixed(2)}</span></div></div>
                    <button onClick={() => setStep('questionnaire')} className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm">Ver</button>
                </div>
            </div>
        )}
    </div>
  );

  const renderStepDetail = () => (
    <div className="animate-fade-in max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center relative">
            {viewingProduct?.imageUrl ? <img src={viewingProduct.imageUrl} className="w-full h-full object-cover" /> : (viewingProduct?.type as string) === 'art' ? <Palette size={120} className="text-purple-500/20" /> : <ShoppingBag size={120} className="text-zinc-800" />}
            {(viewingProduct?.type as string) === 'art' && (
                <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                    <CloudDownload size={12} /> Digital
                </div>
            )}
        </div>
        <div className="flex flex-col justify-center space-y-8">
            <div>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${viewingProduct?.type === 'art' ? 'bg-purple-500/10 text-purple-400' : 'bg-primary/10 text-primary'}`}>
                    {viewingProduct?.type === 'art' ? 'Arte Digital' : viewingProduct?.type === 'service' ? 'Serviço' : 'Produto'}
                </span>
                <h2 className="text-4xl font-bold text-white mt-4">{viewingProduct?.name}</h2>
                <p className="text-3xl font-black text-emerald-400 mt-2">R$ {viewingProduct?.price.toFixed(2)}</p>
                {viewingProduct?.type === 'art' && viewingProduct?.subcategory && (
                    <p className="text-zinc-500 text-sm mt-1">Categoria: {viewingProduct.subcategory}</p>
                )}
            </div>
            
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Descrição</h4>
                <p className="text-zinc-300 leading-relaxed mb-4">{viewingProduct?.description || 'Nenhum detalhe adicional.'}</p>
                {viewingProduct?.type === 'art' && (
                    <div className="bg-purple-900/10 p-3 rounded-lg border border-purple-500/20 mb-4 text-xs text-purple-300">
                        Este é um produto digital. Você receberá o link para download automaticamente após a confirmação do pagamento.
                    </div>
                )}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-black rounded-xl p-2 border border-zinc-800">
                        <button onClick={() => setCurrentOrderQty(Math.max(1, Number(currentOrderQty) - 1))} className="p-2 text-zinc-500"><Minus size={16} /></button>
                        <input type="number" value={currentOrderQty} onChange={(e) => setCurrentOrderQty(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-12 bg-transparent text-white text-center font-bold outline-none" />
                        <button onClick={() => setCurrentOrderQty(Number(currentOrderQty) + 1)} className="p-2 text-zinc-500"><PlusIcon size={16} /></button>
                    </div>
                    <input type="text" placeholder="Obs. (Cor, Tamanho...)" className="flex-1 bg-black rounded-xl px-4 py-3 border border-zinc-800 text-white outline-none text-sm" value={currentOrderDesc} onChange={(e) => setCurrentOrderDesc(e.target.value)} />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <button onClick={addToCart} className="bg-zinc-800 hover:bg-zinc-700 text-white py-5 rounded-2xl font-bold text-sm hover:scale-105 transition shadow-lg flex items-center justify-center gap-3">
                    <ShoppingCart size={20} /> ADICIONAR
                </button>
                <button onClick={buyNow} className="bg-crazy-gradient text-white py-5 rounded-2xl font-bold text-sm hover:scale-105 transition shadow-xl active:scale-95 flex items-center justify-center gap-3">
                    <Zap size={20} /> COMPRAR AGORA
                </button>
            </div>
        </div>
    </div>
  );

  const renderStepQuestionnaire = () => (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Revisão do Carrinho</h2>
        {cart.length === 0 ? (
           <p className="text-zinc-500">Seu carrinho está vazio.</p>
        ) : (
           <div className="space-y-4">
             {cart.map((item) => (
                <div key={item.tempId} className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-zinc-800/50">
                   <div>
                      <h4 className="font-bold text-white">{item.product.name}</h4>
                      <p className="text-zinc-500 text-xs">{item.description || 'Sem observações'}</p>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-zinc-300">x{item.quantity}</span>
                      <span className="text-sm font-mono text-emerald-400 font-bold">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => removeFromCart(item.tempId)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
                   </div>
                </div>
             ))}
           </div>
        )}
      </div>

      {!wantsDigitalGrid && cart.some(i => i.product.type === 'product') && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
             <h3 className="font-bold text-white mb-4">Serviços Adicionais</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-sm text-zinc-300">Precisa de Criação de Layout?</span>
                   <div className="flex bg-black rounded-lg p-1">
                      <button onClick={() => setLayoutOption('sim')} className={`px-4 py-1.5 rounded text-xs font-bold transition ${layoutOption === 'sim' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Já tenho</button>
                      <button onClick={() => setLayoutOption('precisa')} className={`px-4 py-1.5 rounded text-xs font-bold transition ${layoutOption === 'precisa' ? 'bg-primary text-white' : 'text-zinc-500'}`}>Preciso (+R$30)</button>
                   </div>
                </div>
             </div>
          </div>
      )}

      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
         <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest">Total Estimado</p>
            <p className="text-3xl font-black text-white">R$ {calculateFinalOrder().total.toFixed(2)}</p>
         </div>
         <button 
            onClick={handleCreateOrder} 
            disabled={isProcessing || cart.length === 0}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
         >
            {isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle />}
            Finalizar Pedido
         </button>
      </div>
    </div>
  );

  const renderStepCheckout = () => (
    <div className="animate-fade-in max-w-lg mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 ring-1 ring-emerald-500/20">
                <ShoppingBag size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Pedido Criado!</h2>
            <p className="text-zinc-400 text-sm mb-8">Número: <span className="font-mono text-white font-bold">#{lastCreatedOrder?.formattedOrderNumber}</span></p>

            <div className="mb-8">
                <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                        <Ticket className="absolute left-3 top-3 text-zinc-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cupom de desconto" 
                            className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-primary outline-none transition uppercase"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        />
                    </div>
                    <button 
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCode}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                    >
                        {isValidatingCoupon ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                </div>
                {appliedCoupon && (
                    <div className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle size={12} /> Cupom {appliedCoupon.code} aplicado ({appliedCoupon.percentage}% OFF)
                    </div>
                )}
                {couponError && <div className="text-xs text-red-400 mt-1">{couponError}</div>}
            </div>

            <div className="bg-black/40 rounded-xl p-4 mb-8 border border-zinc-800">
                <div className="flex justify-between text-sm mb-2 text-zinc-400">
                    <span>Subtotal</span>
                    <span>R$ {lastCreatedOrder?.total.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                    <div className="flex justify-between text-sm mb-2 text-emerald-400">
                        <span>Desconto</span>
                        <span>- R$ {(lastCreatedOrder!.total - calculateDiscountedTotal()).toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-zinc-800 mt-2">
                    <span>Total a Pagar</span>
                    <span>R$ {calculateDiscountedTotal().toFixed(2)}</span>
                </div>
            </div>

            <div className="space-y-3">
                <button 
                    onClick={handlePayMercadoPago}
                    disabled={isProcessing}
                    className="w-full bg-[#009EE3] hover:bg-[#008ED0] text-white py-4 rounded-xl font-bold text-lg shadow-lg transition hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard />}
                    Pagar com Mercado Pago
                </button>
                
                {canAddToAccount && (
                    <button 
                        onClick={() => setStep('success')}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-bold text-sm transition border border-zinc-700 flex items-center justify-center gap-2"
                    >
                        <Wallet size={18} />
                        Faturar na Conta (Crédito Disponível)
                    </button>
                )}
            </div>
        </div>
    </div>
  );

  const renderStepSuccess = () => (
    <div className="animate-fade-in flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30 animate-bounce-in">
            <Check size={48} className="text-white" strokeWidth={3} />
        </div>
        <h2 className="text-4xl font-black text-white mb-4">Pedido Realizado!</h2>
        <p className="text-zinc-400 max-w-md mb-10 text-lg">
            Seu pedido foi registrado com sucesso. Você receberá atualizações por e-mail e pode acompanhar o status na sua área.
        </p>
        <div className="flex gap-4">
            <button onClick={() => navigate('/my-area')} className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-xl font-bold transition">
                Ir para Minha Área
            </button>
            <button onClick={() => { setCart([]); setStep('list'); window.scrollTo(0,0); }} className="bg-primary hover:bg-amber-600 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg shadow-primary/20">
                Continuar Comprando
            </button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-text p-6 pb-32 relative">
      <div className="max-w-7xl mx-auto mb-12 flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <button onClick={() => step === 'detail' ? setStep('list') : step === 'questionnaire' ? setStep('list') : step === 'checkout' ? setStep('questionnaire') : navigate('/')} className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-full transition hover:scale-110 active:scale-95">
                <ArrowLeft size={24} />
            </button>
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${activeTab === 'art' ? 'bg-purple-500/10' : 'bg-primary/10'}`}>
                    {activeTab === 'art' ? <Palette className="text-purple-500" size={24} /> : <ShoppingBag className="text-primary" size={24} />}
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight font-heading">{getHeaderTitle()}</h1>
            </div>
        </div>
        {role === 'client' && currentCustomer && <div className="hidden sm:flex bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-xs text-zinc-400">Logado como <span className="text-white font-bold">{currentCustomer.name.split(' ')[0]}</span></span></div>}
      </div>
      <div className="max-w-7xl mx-auto">
          {role === 'guest' ? (
              <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up"><div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-3xl max-w-lg text-center relative overflow-hidden shadow-2xl"><div className="relative z-10 flex flex-col items-center"><div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 ring-4 ring-zinc-900 shadow-xl"><Lock className="text-primary" size={40} /></div><p className="text-zinc-300 mb-8 leading-relaxed text-lg font-medium">Faça login para realizar seus pedidos.</p><Link to="/?action=login" className="bg-crazy-gradient text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition shadow-lg w-full flex items-center justify-center gap-3"><UserPlus size={20} /> Acessar ou Cadastrar</Link></div></div></div>
          ) : (
              <>
                  {step === 'list' && renderStepList()}
                  {step === 'detail' && renderStepDetail()}
                  {step === 'questionnaire' && renderStepQuestionnaire()}
                  {step === 'checkout' && renderStepCheckout()}
                  {step === 'success' && renderStepSuccess()}
              </>
          )}
      </div>
    </div>
  );
}
