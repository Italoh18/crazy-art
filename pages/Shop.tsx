
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingBag, Wrench, Search, ShoppingCart, 
  CheckCircle, AlertOctagon, Send, X, Trash2, Minus, 
  Plus as PlusIcon, CreditCard, Loader2, MessageCircle, 
  Lock, UserPlus, ChevronRight, ListChecks, Upload, 
  Info, AlertTriangle, Wallet, Check, Film, FileText, Layers, Hash, ToggleLeft, ToggleRight,
  Coins, Ticket, Palette, CloudDownload, Filter, ArrowUpRight, Zap, Image as ImageIcon, Sparkles, Tag, Crown
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
    'Todos', 'Carnaval', 'Colegio', 'Futebol', 'E-sport', 'Anime', 'Patterns', 'Icons', 'Emojis', 'Animais'
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

  // Verifica se é assinante
  const isSubscriber = currentCustomer?.isSubscriber;

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

  // Derivar as 10 últimas artes adicionadas
  const latestArts = useMemo(() => {
      return products
          .filter(p => p.type === 'art')
          .sort((a, b) => {
              const dateA = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
              const dateB = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
              return dateB - dateA;
          })
          .slice(0, 10);
  }, [products]);

  const filteredItems = products.filter(item => {
     const itemType = item.type || 'product';
     let matches = itemType === activeTab && item.name.toLowerCase().includes(searchTerm.toLowerCase());
     if (activeTab === 'art') {
         if (matches && selectedColor && item.primaryColor !== selectedColor) matches = false;
         if (quitandaTab === 'bordados') {
             if (item.subcategory !== 'Bordados') matches = false;
         } else if (quitandaTab === 'logos') {
             if (item.subcategory !== 'Logos') matches = false;
         } else {
             if (item.subcategory === 'Logos' || item.subcategory === 'Bordados') matches = false;
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

  const addToCartFromList = (product: Product) => {
    setCart(prev => [...prev, {
        product: product,
        quantity: 1,
        description: '',
        tempId: crypto.randomUUID()
    }]);
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

  const getProductPriceForQuantity = (product: Product, quantity: number) => {
      if (!product.priceVariations || product.priceVariations.length === 0) return product.price;
      const sortedVariations = [...product.priceVariations].sort((a, b) => b.minQuantity - a.minQuantity);
      const match = sortedVariations.find(v => quantity >= v.minQuantity);
      return match ? match.price : product.price;
  };

  const calculateFinalOrder = () => {
      const itemsPayload: any[] = [];
      let totalValue = 0;
      const totalListItems = calculateTotalItemsInList();

      cart.forEach(item => {
          let qty = item.quantity;
          const nameLower = item.product.name.toLowerCase();
          if (sizeList.length > 0 && !wantsDigitalGrid) {
              if (nameLower.includes('camisa')) qty = totalListItems;
              else if (nameLower.includes('replica') || nameLower.includes('réplica')) qty = totalListItems;
          }
          let unitPrice = getProductPriceForQuantity(item.product, qty);
          if (sizeList.length > 0 && !wantsDigitalGrid && (nameLower.includes('replica') || nameLower.includes('réplica'))) {
              unitPrice = 2.00;
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
        
        // FIX: Redireciona na MESMA ABA para evitar confirmação precoce
        // As back_urls do Mercado Pago cuidarão de trazer o usuário de volta para 'success' ou 'my-area'
        if (res?.init_point) { 
            window.location.href = res.init_point; 
        }
    } catch (e: any) {
        setNotification({ message: 'Erro ao gerar pagamento: ' + e.message, type: 'error' });
    } finally { 
        // Não resetamos setIsProcessing para evitar que o botão fique habilitado durante o redirect
    }
  };

  const handleSubscriptionPayment = async () => {
    if (role !== 'client' || !currentCustomer) {
        setNotification({ message: 'Por favor, faça login para assinar.', type: 'error' });
        return;
    }
    setIsProcessing(true);
    try {
        const res = await api.createPayment({
            orderId: currentCustomer.id,
            title: 'Assinatura Crazy Art - Downloads Ilimitados',
            amount: 20.00,
            payerEmail: currentCustomer.email,
            payerName: currentCustomer.name,
 
        });
        if (res?.init_point) {
            window.location.href = res.init_point;
        }
    } catch (e: any) {
        setNotification({ message: 'Erro ao gerar pagamento: ' + e.message, type: 'error' });
        setIsProcessing(false);
    }
  };

  const canAddToAccount = useMemo(() => {
    if (!currentCustomer || !lastCreatedOrder) return false;
    const { items } = calculateFinalOrder();
    const allServices = items.every(i => i.type === 'service');
    const openOrdersTotal = orders.filter(o => o.client_id === currentCustomer.id && o.status === 'open').reduce((a, o) => a + Number(o.total || 0), 0);
    return allServices && (currentCustomer.creditLimit || 0) >= (openOrdersTotal + calculateDiscountedTotal());
  }, [currentCustomer, lastCreatedOrder, orders, appliedCoupon]);

  const getHeaderTitle = () => {
      if (step === 'list') return activeTab === 'art' ? 'Quitanda de Artes' : 'Loja Crazy Art';
      if (step === 'detail') return 'Detalhes do Item';
      if (step === 'questionnaire') return 'Revisar Pedido';
      if (step === 'checkout') return 'Pagamento';
      return 'Loja';
  };

  const renderStepList = () => (
    <div className="animate-fade-in relative pb-24">
        {activeTab === 'art' ? (
            <div className="flex flex-col items-center mb-10 space-y-4">
                <div className="flex justify-end w-full items-center mb-2">
                    <button onClick={() => setActiveTab('product')} className="text-[10px] text-zinc-400 hover:text-white uppercase tracking-widest flex items-center gap-1 transition group bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
                        Ir para Loja Geral <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>

                {!isSubscriber && (
                    <button 
                        onClick={handleSubscriptionPayment}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-[1px] rounded-2xl group hover:scale-[1.02] transition-all duration-500 shadow-xl shadow-purple-500/20 active:scale-95 mb-4"
                    >
                        <div className="bg-zinc-950 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 group-hover:bg-zinc-900 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl text-white shadow-lg">
                                    <Crown size={24} />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-white font-black text-lg uppercase tracking-tighter leading-none">Assinatura Crazy Art</h4>
                                    <p className="text-zinc-400 text-[10px] uppercase tracking-widest mt-1">Downloads grátis ilimitados das artes da quitanda</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="block text-zinc-500 text-[10px] uppercase font-bold">Apenas</span>
                                    <span className="text-2xl font-black text-white">R$ 20<span className="text-sm font-normal text-zinc-500">/mês</span></span>
                                </div>
                                <div className="bg-white text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all flex items-center gap-2">
                                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />} Assinar Agora
                                </div>
                            </div>
                        </div>
                    </button>
                )}

                {latestArts.length > 0 && (
                    <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-4">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2 px-1"><Sparkles size={12} className="text-primary" /> Últimas Artes Adicionadas</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x px-1">
                            {latestArts.map(art => (
                                <button key={art.id} onClick={() => openProduct(art)} className="flex-shrink-0 w-20 group relative snap-start focus:outline-none"><div className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-800 group-hover:border-primary/50 transition relative bg-zinc-950">{art.imageUrl ? <img src={art.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={art.name} /> : <Palette className="w-full h-full p-6 text-zinc-700" />}<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"><PlusIcon size={16} className="text-white" /></div></div><p className="text-[9px] text-zinc-400 mt-1 truncate w-full text-center group-hover:text-white transition">{art.name}</p></button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-full max-w-md border border-zinc-800 shadow-xl overflow-x-auto mb-2"><button onClick={() => { setQuitandaTab('estampas'); setSelectedColor(null); setSearchTerm(''); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'estampas' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>ESTAMPAS</button><button onClick={() => { setQuitandaTab('logos'); setSelectedColor(null); setSearchTerm(''); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'logos' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>LOGOS</button><button onClick={() => { setQuitandaTab('bordados'); setSelectedColor(null); setSearchTerm(''); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'bordados' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>BORDADOS</button></div>
                {quitandaTab === 'estampas' && (
                    <div className="w-full overflow-x-auto pb-2"><div className="flex gap-2 min-w-max px-1">{artCategories.map(cat => (<button key={cat} onClick={() => setActiveArtCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap border ${activeArtCategory === cat ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'}`}>{cat}</button>))}</div></div>
                )}
                <div className="w-full grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4"><div className="relative"><input type="text" placeholder={`Buscar em ${quitandaTab}...`} className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 outline-none transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search className="absolute left-3 top-3.5 text-zinc-600" size={20} /></div><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center gap-2 overflow-x-auto custom-scrollbar"><div className="text-[10px] text-zinc-500 font-bold uppercase px-2">Cores</div><button onClick={() => setSelectedColor(null)} className={`flex items-center justify-center w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white transition shrink-0 ${!selectedColor ? 'ring-2 ring-white bg-zinc-700 text-white' : ''}`} title="Todas as Cores"><span className="block w-4 h-[1px] bg-current rotate-45 absolute"></span><span className="block w-4 h-[1px] bg-current -rotate-45 absolute"></span></button>{ART_COLOR_FILTERS.map(color => (<button key={color.name} onClick={() => setSelectedColor(selectedColor === color.hex ? null : color.hex)} className={`w-8 h-8 rounded-full border-2 transition shrink-0 hover:scale-110 ${selectedColor === color.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-zinc-500'}`} style={{ backgroundColor: color.hex }} title={color.name} />))}</div></div><div className="w-full p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl flex items-center gap-3"><CloudDownload className="text-purple-400 shrink-0" /><p className="text-xs text-purple-200">As artes da <strong>Quitanda</strong> são arquivos digitais para download imediato após pagamento.</p></div>
            </div>
        ) : (
            <div className="flex flex-col items-center mb-10 space-y-6">
                <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-full max-w-md border border-zinc-800 shadow-xl overflow-x-auto"><button onClick={() => setActiveTab('product')} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${activeTab === 'product' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>PRODUTOS</button><button onClick={() => setActiveTab('service')} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${activeTab === 'service' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>SERVIÇOS</button><button onClick={() => { setActiveTab('art'); setQuitandaTab('estampas'); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap flex items-center justify-center gap-1 ${activeTab === 'art' ? 'bg-purple-500 text-white shadow-sm' : 'text-zinc-500 hover:text-purple-400'}`}><Palette size={12} /> QUITANDA</button></div>
                <div className="w-full max-w-md relative"><input type="text" placeholder="Buscar na loja..." className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-primary outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search className="absolute left-3 top-3.5 text-zinc-600" size={20} /></div>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{filteredItems.map((item) => {
            // Verifica se deve exibir "Assinatura" ou preço
            const isArt = item.type === 'art';
            const showFree = isSubscriber && isArt;
            
            return (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-primary/50 transition group h-full flex flex-col relative">
                <div onClick={() => openProduct(item)} className="cursor-pointer flex-1 flex flex-col">
                    <div className="h-56 bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : item.type === 'art' ? <Palette size={64} className="text-purple-500/50" /> : <ShoppingBag size={64} className="text-zinc-700" />}
                        <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase backdrop-blur-md ${showFree ? 'bg-gradient-to-r from-purple-600 to-pink-600' : item.type === 'art' ? 'bg-purple-600/80' : 'bg-black/60'}`}>
                            {showFree ? <span className="flex items-center gap-1"><Crown size={12} /> ASSINATURA</span> : `R$ ${item.price.toFixed(2)}`}
                        </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col"><h3 className="font-bold text-white text-lg leading-tight">{item.name}</h3><p className="text-zinc-500 text-xs mt-2 line-clamp-2 flex-1">{item.description || 'Clique para ver detalhes'}</p>{item.priceVariations && item.priceVariations.length > 0 && (<div className="mt-2 text-[10px] text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/20 inline-block w-fit"><Tag size={10} className="inline mr-1" /> Preços especiais p/ atacado</div>)}{item.type === 'art' && (<div className="mt-3 flex flex-wrap gap-2"><div className="flex items-center gap-1 text-[10px] text-purple-400 font-bold uppercase tracking-wider"><CloudDownload size={12} /> Digital</div>{item.subcategory && (<span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">{item.subcategory}</span>)}</div>)}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); addToCartFromList(item); }} className="absolute top-3 right-3 bg-black/50 p-3 rounded-full text-white hover:bg-primary transition opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                    <ShoppingCart size={18} />
                </button>
            </div>
            )
        })}</div>
        {filteredItems.length === 0 && <div className="text-center py-20 opacity-50"><p>Nenhum item encontrado.</p>{activeTab === 'art' && <p className="text-xs mt-2">Tente outra aba ou categoria.</p>}</div>}
         
    </div>
  );

  const renderStepDetail = () => {
    const dynamicPrice = viewingProduct ? getProductPriceForQuantity(viewingProduct, Number(currentOrderQty) || 1) : 0;
    const hasDiscount = viewingProduct && dynamicPrice < viewingProduct.price;
    const isArt = (viewingProduct?.type as string) === 'art';
    const showFreeDownload = isSubscriber && isArt && viewingProduct?.downloadLink;

    return (
    <div className="animate-fade-in max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10"><div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center relative">{viewingProduct?.imageUrl ? <img src={viewingProduct.imageUrl} className="w-full h-full object-cover" /> : (viewingProduct?.type as string) === 'art' ? <Palette size={120} className="text-purple-500/20" /> : <ShoppingBag size={120} className="text-zinc-800" />}{(viewingProduct?.type as string) === 'art' && (<div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1"><CloudDownload size={12} /> Digital</div>)}</div><div className="flex flex-col justify-center space-y-8"><div><span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${viewingProduct?.type === 'art' ? 'bg-purple-500/10 text-purple-400' : 'bg-primary/10 text-primary'}`}>{viewingProduct?.type === 'art' ? 'Arte Digital' : viewingProduct?.type === 'service' ? 'Serviço' : 'Produto'}</span><h2 className="text-4xl font-bold text-white mt-4">{viewingProduct?.name}</h2><div className="flex items-baseline gap-2 mt-2"><p className="text-3xl font-black text-emerald-400">{showFreeDownload ? 'GRÁTIS (Assinante)' : `R$ ${dynamicPrice.toFixed(2)}`}</p>{hasDiscount && !showFreeDownload && <p className="text-sm text-zinc-500 line-through">R$ {viewingProduct?.price.toFixed(2)}</p>}</div>{hasDiscount && !showFreeDownload && <p className="text-xs text-emerald-500 font-bold mt-1">Preço especial de atacado aplicado!</p>}{viewingProduct?.type === 'art' && viewingProduct?.subcategory && (<p className="text-zinc-500 text-sm mt-1">Categoria: {viewingProduct.subcategory}</p>)}</div>{viewingProduct?.priceVariations && viewingProduct.priceVariations.length > 0 && (<div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800"><h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Tabela de Preços (Atacado)</h4><div className="flex flex-wrap gap-2"><div className={`px-3 py-2 rounded-lg border text-xs text-center ${Number(currentOrderQty) < Math.min(...viewingProduct.priceVariations.map(v=>v.minQuantity)) ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><span className="block font-bold">1 un</span>R$ {viewingProduct.price.toFixed(2)}</div>{viewingProduct.priceVariations.sort((a,b) => a.minQuantity - b.minQuantity).map((v, i) => (<div key={i} className={`px-3 py-2 rounded-lg border text-xs text-center ${Number(currentOrderQty) >= v.minQuantity && (i === viewingProduct!.priceVariations!.length - 1 || Number(currentOrderQty) < viewingProduct!.priceVariations![i+1].minQuantity) ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><span className="block font-bold">+{v.minQuantity} un</span>R$ {v.price.toFixed(2)}</div>))}</div></div>)}<div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800"><h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Descrição</h4><p className="text-zinc-300 leading-relaxed mb-4">{viewingProduct?.description || 'Nenhum detalhe adicional.'}</p>{viewingProduct?.type === 'art' && (<div className="bg-purple-900/10 p-3 rounded-lg border border-purple-500/20 mb-4 text-xs text-purple-300">Este é um produto digital. Você receberá o link para download automaticamente após a confirmação do pagamento.</div>)}<div className="flex items-center gap-4"><div className="flex items-center gap-2 bg-black rounded-xl p-2 border border-zinc-800"><button onClick={() => setCurrentOrderQty(Math.max(1, Number(currentOrderQty) - 1))} className="p-2 text-zinc-500"><Minus size={16} /></button><input type="number" value={currentOrderQty} onChange={(e) => setCurrentOrderQty(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-12 bg-transparent text-white text-center font-bold outline-none" /><button onClick={() => setCurrentOrderQty(Number(currentOrderQty) + 1)} className="p-2 text-zinc-500"><PlusIcon size={16} /></button></div><input type="text" placeholder="Obs. (Cor, Tamanho...)" className="flex-1 bg-black rounded-xl px-4 py-3 border border-zinc-800 text-white outline-none text-sm" value={currentOrderDesc} onChange={(e) => setCurrentOrderDesc(e.target.value)} /></div></div>
    
    <div className="grid grid-cols-2 gap-4">
        {showFreeDownload ? (
            <a 
                href={viewingProduct?.downloadLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="col-span-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-5 rounded-2xl font-bold text-lg hover:scale-105 transition shadow-lg flex items-center justify-center gap-3 animate-pulse"
            >
                <CloudDownload size={24} /> BAIXAR AGORA (ASSINANTE)
            </a>
        ) : (
            <>
                <button onClick={addToCart} className="bg-zinc-800 hover:bg-zinc-700 text-white py-5 rounded-2xl font-bold text-sm hover:scale-105 transition shadow-lg flex items-center justify-center gap-3"><ShoppingCart size={20} /> ADICIONAR</button>
                <button onClick={buyNow} className="bg-crazy-gradient text-white py-5 rounded-2xl font-bold text-sm hover:scale-105 transition shadow-xl active:scale-95 flex items-center justify-center gap-3"><Zap size={20} /> COMPRAR AGORA</button>
            </>
        )}
    </div></div></div>
    );
  };

  const renderStepQuestionnaire = () => {
      const calc = calculateFinalOrder();
      const hasPhysicalItems = calc.items.some(i => i.type === 'product');
      const isArtOnlyOrder = cart.length > 0 && cart.every(i => (i.product.type as any) === 'art');
      return (
        <div className="animate-fade-in max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl relative space-y-8"><h2 className="text-2xl font-bold text-white flex items-center gap-3"><ListChecks className="text-primary" /> Revisar Pedido</h2><div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800">{calc.items.filter(i => i.productId !== 'service-layout' && i.productId !== 'service-mold' && i.productId !== 'service-grid-digital').map((item, idx) => (<div key={idx} className="p-4 flex justify-between items-center group"><div><p className="text-white font-bold text-sm">{item.productName} <span className="text-primary">x{item.quantity}</span></p>{(item.type as any) === 'art' && <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Download Digital</span>}</div><div className="flex items-center gap-4"><div className="text-right"><span className="text-emerald-400 font-mono text-sm block">R$ {item.total.toFixed(2)}</span>{item.quantity > 1 && <span className="text-[10px] text-zinc-600 block">R$ {item.unitPrice.toFixed(2)}/un</span>}</div><button onClick={() => removeFromCart(cart[idx]?.tempId)} className="text-zinc-600 hover:text-red-500 transition"><Trash2 size={16} /></button></div></div>))}</div>{isArtOnlyOrder ? (<div className="flex items-center justify-between p-6 bg-purple-900/10 rounded-2xl border border-purple-500/20 transition"><div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${wantsDigitalGrid ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}><Layers size={24} /></div><div><h4 className="font-bold text-white">Gostaria que montasse a grade digital?</h4><p className="text-xs text-zinc-500">Serviço de montagem com custo adicional por item.</p></div></div><button onClick={() => { setWantsDigitalGrid(!wantsDigitalGrid); if (!wantsDigitalGrid && sizeList.length === 0) addListRow(); }} className={`w-14 h-8 rounded-full transition relative flex items-center px-1 ${wantsDigitalGrid ? 'bg-purple-600' : 'bg-zinc-800'}`}><div className={`w-6 h-6 bg-white rounded-full transition ${wantsDigitalGrid ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div>) : (hasPhysicalItems && (<div className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 transition"><div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${hasSizeList ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-500'}`}><Film size={24} /></div><div><h4 className="font-bold text-white">Lista de Produção?</h4><p className="text-xs text-zinc-500">Nomes, números e tamanhos.</p></div></div><button onClick={() => { setHasSizeList(!hasSizeList); if (!hasSizeList && sizeList.length === 0) addListRow(); }} className={`w-14 h-8 rounded-full transition relative flex items-center px-1 ${hasSizeList ? 'bg-primary' : 'bg-zinc-800'}`}><div className={`w-6 h-6 bg-white rounded-full transition ${hasSizeList ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div>))}{(hasSizeList || wantsDigitalGrid) && (<div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 animate-fade-in"><div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2"><span className="text-xs font-bold text-zinc-500 uppercase">Detalhes da Lista ({calculateTotalItemsInList()})</span><button onClick={toggleGlobalSimpleMode} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition ${isGlobalSimple ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}><span>Lista sem nomes</span>{isGlobalSimple ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button></div>{sizeList.map((item, idx) => (<div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 items-end"><div className="sm:col-span-2"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Tipo</label><select value={item.category} onChange={(e) => updateListRow(item.id, 'category', e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white p-1.5 outline-none"><option value="unisex">Unisex</option><option value="feminina">Feminina</option><option value="infantil">Infantil</option></select></div><div className="sm:col-span-2"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Tam</label><select value={item.size} onChange={(e) => updateListRow(item.id, 'size', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white p-1.5 outline-none">{sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}</select></div>{item.isSimple ? (<div className="sm:col-span-4"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Qtd</label><input type="number" min="1" value={item.quantity || 1} onChange={(e) => updateListRow(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-xs text-white font-mono text-center" /></div>) : (<><div className="sm:col-span-1"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Nº</label><input type="text" value={item.number} onChange={(e) => updateListRow(item.id, 'number', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-xs text-white font-mono text-center" /></div><div className="sm:col-span-3"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Nome</label><input type="text" value={item.name} onChange={(e) => updateListRow(item.id, 'name', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-xs text-white uppercase" /></div></>)}<div className="sm:col-span-2"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Short</label><select value={item.shortSize} onChange={(e) => updateListRow(item.id, 'shortSize', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white p-1.5 outline-none"><option value="">-</option>{sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="sm:col-span-1"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">S.Nº</label><input type="text" value={item.shortNumber} onChange={(e) => updateListRow(item.id, 'shortNumber', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-xs text-white font-mono text-center" /></div><div className="sm:col-span-1 flex items-end pb-0.5"><button onClick={() => removeListRow(item.id)} className="w-full p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition flex items-center justify-center"><Trash2 size={14} /></button></div></div>))} <button onClick={addListRow} className="w-full mt-4 py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-primary transition flex items-center justify-center gap-2 font-bold uppercase text-[10px]"><PlusIcon size={14} /> Adicionar Integrante</button></div>)}{!isArtOnlyOrder && (<div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800"><p className="text-xs font-bold text-zinc-500 uppercase mb-3">Tem Layout?</p><div className="flex gap-2"><button onClick={() => setLayoutOption('sim')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${layoutOption === 'sim' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Sim</button><button onClick={() => setLayoutOption('precisa')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${layoutOption === 'precisa' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Precisa Montar</button></div></div>{hasPhysicalItems && (<div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800"><p className="text-xs font-bold text-zinc-500 uppercase mb-3">Tem Molde?</p><div className="flex gap-2"><button onClick={() => setMoldOption('sim')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${moldOption === 'sim' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Sim</button><button onClick={() => setMoldOption('precisa')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${moldOption === 'precisa' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Precisa Montar</button></div></div>)}</div></div>)}{(layoutOption === 'sim' || moldOption === 'sim' || isArtOnlyOrder) && (<div className="animate-fade-in space-y-4 pt-4 border-t border-zinc-800"><div><label className="block text-xs font-bold text-zinc-400 uppercase mb-1 ml-1">Gostaria de inserir a própria logo ou logos extras?</label><p className="text-[10px] text-zinc-500 mb-2 ml-1">Especifique posicionamento e tamanhos e deixe o link dos arquivos abaixo.</p><textarea className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary transition min-h-[80px]" placeholder="Ex: Logo no peito esquerdo 10cm..." value={artExtrasDesc} onChange={(e) => setArtExtrasDesc(e.target.value)} /></div><div><label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Link dos Arquivos</label><div className="relative"><input type="text" placeholder="Cole o link aqui..." className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-primary transition" value={artLink} onChange={(e) => setArtLink(e.target.value)} /><Upload className="absolute left-3 top-3.5 text-zinc-600" size={16} /></div></div></div>)}<div className="border-t border-zinc-800 pt-6 mt-6"><button onClick={() => setStep('list')} className="w-full mb-6 py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-primary transition flex items-center justify-center gap-3 font-bold uppercase text-xs"><PlusIcon size={18} /> Adicionar mais item</button><div className="flex justify-between items-end mb-6"><span className="text-zinc-500 text-sm font-bold uppercase">Total Estimado</span><span className="text-3xl font-black text-white">R$ {calc.total.toFixed(2)}</span></div><button onClick={handleCreateOrder} disabled={isProcessing} className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-amber-600 transition shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">{isProcessing ? <Loader2 className="animate-spin" /> : <ChevronRight />} PROSSEGUIR PARA PAGAMENTO</button></div></div>
      );
  };

  const renderStepCheckout = () => {
    const total = lastCreatedOrder?.total || 0;
    const discountedTotal = calculateDiscountedTotal();
    
    return (
        <div className="animate-fade-in max-w-xl mx-auto space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-zinc-800 bg-zinc-950">
                    <h2 className="text-2xl font-bold text-white mb-2">Resumo do Pedido</h2>
                    <p className="text-zinc-500 text-sm">Pedido gerado: <span className="text-white font-mono">#{lastCreatedOrder?.order_number}</span></p>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        {lastCreatedOrder?.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-zinc-400">{item.productName || item.name} (x{item.quantity})</span>
                                <span className="text-white font-mono">R$ {item.total.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="h-px bg-zinc-800"></div>
                    
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Ticket className="absolute left-3 top-3.5 text-zinc-500" size={16} />
                            <input 
                                type="text"
                                placeholder="Cupom de Desconto"
                                className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none text-sm uppercase font-mono"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                disabled={!!appliedCoupon}
                            />
                        </div>
                        {appliedCoupon ? (
                            <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 px-4 rounded-xl transition">
                                <X size={18} />
                            </button>
                        ) : (
                            <button onClick={handleApplyCoupon} disabled={!couponCode || isValidatingCoupon} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-xl font-bold text-xs transition disabled:opacity-50">
                                {isValidatingCoupon ? <Loader2 className="animate-spin" size={16} /> : 'APLICAR'}
                            </button>
                        )}
                    </div>
                    
                    {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                    {appliedCoupon && <p className="text-xs text-emerald-500 flex items-center gap-1"><Check size={12} /> Cupom aplicado! {appliedCoupon.percentage}% OFF em itens elegíveis.</p>}

                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-white">Valor Total</span>
                        <div className="text-right">
                            {appliedCoupon && (
                                <span className="block text-sm text-zinc-500 line-through">R$ {total.toFixed(2)}</span>
                            )}
                            <span className="text-2xl font-black text-white font-mono">R$ {discountedTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="pt-6 space-y-4">
                        <div className={canAddToAccount ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
                            {canAddToAccount && (
                                <button onClick={() => setStep('success')} className="w-full bg-zinc-100 text-black py-4 rounded-2xl font-bold hover:bg-white transition flex items-center justify-center gap-3 shadow-xl uppercase tracking-wider text-xs sm:text-sm"><Wallet size={18} /> Adicionar à Conta</button>
                            )}
                            <button 
                                onClick={handlePayMercadoPago} 
                                disabled={isProcessing} 
                                className={`w-full bg-blue-600 text-white rounded-2xl font-black transition flex items-center justify-center gap-3 shadow-xl active:scale-95 ${canAddToAccount ? 'py-4 text-xs sm:text-sm' : 'py-5 text-lg'}`}
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard size={canAddToAccount ? 18 : 24} />} 
                                {isProcessing ? 'REDIRECIONANDO...' : 'PAGAR AGORA'}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest leading-relaxed">{canAddToAccount ? "Você possui limite disponível. Escolha pagar agora ou faturar na sua conta." : "É necessário o pagamento para confirmação do pedido."}</p>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const renderStepSuccess = () => (
    <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-8 ring-8 ring-emerald-500/5"><Check size={48} strokeWidth={3} /></div>
        <h2 className="text-4xl font-bold text-white mb-4 font-heading">Pedido Confirmado!</h2>
        <p className="text-zinc-400 mb-10 leading-relaxed">Seu pedido <strong>#{lastCreatedOrder?.order_number}</strong> foi recebido e já está em nossa fila de processamento.</p>
        <div className="grid grid-cols-1 w-full gap-4">
            <button onClick={() => navigate('/my-area')} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-zinc-200 transition">Ver Meus Pedidos</button>
            <button onClick={() => window.open(`https://wa.me/5516994142665?text=Olá, acabei de fazer o pedido #${lastCreatedOrder?.order_number}`, '_blank')} className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2"><MessageCircle size={20} /> Enviar no WhatsApp</button>
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
        <div className="flex items-center gap-4">
        {role === 'client' && currentCustomer && <div className="hidden sm:flex bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-xs text-zinc-400">Logado como <span className="text-white font-bold">{currentCustomer.name.split(' ')[0]}</span></span></div>}
        {cart.length > 0 && (
            <button onClick={() => setStep('questionnaire')} className="relative bg-zinc-900 p-3 rounded-full border border-zinc-800 text-white hover:border-primary transition">
                <ShoppingCart size={20} />
                <div className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-950">{cart.length}</div>
            </button>
        )}
        </div>
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
