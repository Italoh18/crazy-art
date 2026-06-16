
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Search, ShoppingCart, 
  CheckCircle, AlertOctagon, Send, X, Trash2, Minus, 
  Plus as PlusIcon, CreditCard, Loader2, MessageCircle, MessageSquare, 
  Lock, UserPlus, ChevronRight, ListChecks, Upload, 
  Info, AlertTriangle, Wallet, Check, Film, FileText, Layers, Hash, ToggleLeft, ToggleRight,
  Coins, Ticket, Palette, CloudDownload, Filter, ArrowUpRight, Zap, Image as ImageIcon, Sparkles, Tag, Crown, Scissors, ShoppingBag, Wrench
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Product, Order, SizeListItem, Coupon, ItemType } from '../types';
import { api } from '../src/services/api';
import { ImageUploadInput } from '../components/ImageUploadInput';

type ShopStep = 'list' | 'detail' | 'questionnaire' | 'checkout' | 'success';

interface CartItem {
    product: Product;
    quantity: number;
    description?: string;
    tempId: string;
    sizeList?: any[];
    layoutOption?: 'sim' | 'precisa' | null;
    moldOption?: 'sim' | 'precisa' | null;
    artLink?: string;
    artExtrasDesc?: string;
    wantsDigitalGrid?: boolean;
    wantsMoldAlteration?: boolean;
}

// Categorias visíveis apenas na aba "Estampas"
const DEFAULT_ART_CATEGORIES = [
    'Todos', 'Carnaval', 'Colegio', 'Futebol', 'Volei', 'E-sport', 'Anime', 'Patterns', 'Icons', 'Emojis', 'Animais'
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
  const { products, addOrder, orders, validateCoupon, loadData } = useData();
  const { role, currentCustomer } = useAuth();
  const { cart, addToCart: addToCartGlobal, removeFromCart: removeFromCartGlobal, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<ShopStep>('list');
  const [activeTab, setActiveTab] = useState<ItemType | 'landing'>('landing');
  const [searchTerm, setSearchTerm] = useState('');
  
  // States exclusivos da Quitanda
  const [quitandaTab, setQuitandaTab] = useState<'estampas' | 'logos' | 'bordados' | 'diversos'>('estampas');
  const [activeArtCategory, setActiveArtCategory] = useState('Todos');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [wantsDigitalGrid, setWantsDigitalGrid] = useState(false);
  const [wantsMoldAlteration, setWantsMoldAlteration] = useState(false);
  const [isDigitalGridProcessing, setIsDigitalGridProcessing] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  
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

  // States para Comentarios (Reviews)
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadComments = async (productId: string) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/comments?product_id=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erro ao carregar comentários:", e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !viewingProduct) return;
    setSubmittingComment(true);
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: viewingProduct.id,
          productName: viewingProduct.name,
          comment: newCommentText.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.comment) {
          setComments(prev => [data.comment, ...prev]);
          setNewCommentText('');
        }
      } else {
        const err = await res.json() as any;
        alert(err.error || "Erro ao publicar comentário.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar comentário.");
    } finally {
      setSubmittingComment(false);
    }
  };

  useEffect(() => {
    if (viewingProduct && step === 'detail') {
      loadComments(viewingProduct.id);
    }
  }, [viewingProduct, step]);

  // States para Cupom
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // States para lista de cupons salvos do cliente
  const [clientCoupons, setClientCoupons] = useState<any[]>([]);
  const [showCouponList, setShowCouponList] = useState(false);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  const loadClientCoupons = async () => {
    if (role !== 'client' || !currentCustomer) return;
    setIsLoadingCoupons(true);
    try {
      const url = `/api/client-coupons?_t=${Date.now()}`;
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setClientCoupons(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  useEffect(() => {
    if (role === 'client' && currentCustomer) {
      loadClientCoupons();
    }
  }, [role, currentCustomer]);

  const isCouponEligibleForShop = (couponType: string) => {
    // Tipo 'all' e 'product' são sempre elegíveis na loja
    if (couponType === 'all' || couponType === 'product') {
      return { eligible: true };
    }
    // Tipo 'service' é elegível se houver algum serviço ou itens adicionais de modelagem/layout
    if (couponType === 'service') {
      const hasService = cart.some(item => {
        return !item.wantsDigitalGrid && (item.layoutOption === 'precisa' || item.moldOption === 'precisa' || item.wantsDigitalGrid);
      });
      return {
        eligible: hasService,
        message: 'Disponível apenas para Serviços contratados'
      };
    }
    // Tipo 'art' é elegível se houver algum item do tipo 'art' ou correspondente a matrizes/estampas
    if (couponType === 'art') {
      const hasArt = cart.some(item => {
        return item.product.type === 'art' || 
               (item.product.type as string) === 'stamp' || 
               (item.product as any).category?.toLowerCase() === 'estampas' ||
               (item.product.subcategory || '').toLowerCase().includes('estampas');
      });
      return {
        eligible: hasArt,
        message: 'Disponível apenas para Matrizes de Bordado / Artes Prontas'
      };
    }
    return { eligible: true };
  };

  // Verifica se é assinante
  const isSubscriber = currentCustomer?.isSubscriber;

  // Inicializa a aba com base na URL
  useEffect(() => {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      const action = params.get('action');

      if (tab === 'art' || location.pathname === '/quitanda_de_art') {
          setActiveTab('art');
      } else if (tab === 'service') {
          setActiveTab('service');
      } else if (tab === 'product') {
          setActiveTab('product');
      } else {
          setActiveTab('landing');
      }

      if (action === 'cart') {
          setStep('questionnaire');
      }
  }, [location.search, location.pathname]);

  // Derivar categorias dinâmicas com base nos produtos existentes (apenas para Estampas)
  const artCategories = useMemo(() => {
      const existingCats = new Set(DEFAULT_ART_CATEGORIES);
      products.filter(p => 
          p.type === 'art' && 
          p.subcategory && 
          !p.subcategory.includes('Logos') && 
          !p.subcategory.includes('Bordados') &&
          !p.subcategory.includes('Diversos')
      ).forEach(p => {
          if (p.subcategory) {
              p.subcategory.split(',').forEach(s => {
                  const trimmed = s.trim();
                  if (trimmed && trimmed !== 'Logos' && trimmed !== 'Bordados' && trimmed !== 'Diversos') {
                      existingCats.add(trimmed);
                  }
              });
          }
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
         
         const itemCategories = item.subcategory?.split(',').map(s => s.trim()) || [];
         
         if (quitandaTab === 'bordados') {
             if (!itemCategories.includes('Bordados')) matches = false;
         } else if (quitandaTab === 'logos') {
             if (!itemCategories.includes('Logos')) matches = false;
         } else if (quitandaTab === 'diversos') {
             if (!itemCategories.includes('Diversos')) matches = false;
         } else {
             // Aba Estampas (Geral)
             const isSpecial = itemCategories.some(c => ['Logos', 'Bordados', 'Diversos'].includes(c));
             const hasGeneral = itemCategories.some(c => !['Logos', 'Bordados', 'Diversos'].includes(c));
             
             if (isSpecial && !hasGeneral) matches = false;
             if (matches && activeArtCategory !== 'Todos' && !itemCategories.includes(activeArtCategory)) matches = false;
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
    
    // Reset questionnaire states for the new product being viewed
    setHasSizeList(false);
    setSizeList([]);
    setLayoutOption(null);
    setMoldOption(null);
    setArtLink('');
    setArtExtrasDesc('');
    setWantsDigitalGrid(false);
    setWantsMoldAlteration(false);
    setIsGlobalSimple(false);
    setShowFullDesc(false);
    
    setStep('detail');
    window.scrollTo(0, 0);
  };

  const handleAssembleDigitalGrid = async () => {
      if (!viewingProduct) return;
      
      const artUrl = viewingProduct.imageUrl || viewingProduct.downloadLink || '';

      if (isSubscriber) {
          navigate('/montagem-molde', { state: { layoutUrl: artUrl } });
          return;
      }

      if (role !== 'client' || !currentCustomer) {
          setNotification({ message: 'Por favor, faça login ou registre-se na sua conta de cliente para prosseguir com a compra da arte.', type: 'error' });
          return;
      }

      setIsDigitalGridProcessing(true);
      try {
          const itemsPayload = [{
              productId: viewingProduct.id,
              productName: viewingProduct.name,
              quantity: 1,
              unitPrice: viewingProduct.price,
              total: viewingProduct.price,
              type: viewingProduct.type || 'art'
          }];

          const orderData = {
              client_id: currentCustomer.id,
              description: `Compra de Arte p/ Montagem de Molde: ${viewingProduct.name}`,
              items: itemsPayload,
              total: viewingProduct.price,
              size_list: null,
              status: 'open',
              source: 'shop' as const,
              order_date: new Date().toISOString().split('T')[0],
              due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
          };

          const res = await addOrder(orderData);
          
          const customSuccessUrl = `/montagem-molde?layout_url=${encodeURIComponent(artUrl)}`;
          
          const payRes = await api.createPayment({
              orderId: res.id,
              title: `Compra de Arte: ${viewingProduct.name}`,
              amount: viewingProduct.price,
              payerEmail: currentCustomer.email,
              payerName: currentCustomer.name,
              successUrl: customSuccessUrl
          });

          if (payRes?.init_point) {
              window.location.href = payRes.init_point;
          } else {
              throw new Error('Falha ao gerar link Mercado Pago');
          }
      } catch (e: any) {
          setNotification({ message: 'Erro ao gerar pagamento da arte: ' + e.message, type: 'error' });
          setIsDigitalGridProcessing(false);
      }
  };

  const addToCart = () => {
      if (!viewingProduct) return;
      const extraData = {
          sizeList: hasSizeList ? sizeList : [],
          layoutOption,
          moldOption,
          artLink,
          artExtrasDesc,
          wantsDigitalGrid,
          wantsMoldAlteration
      };
      addToCartGlobal(viewingProduct, Number(currentOrderQty) || 1, currentOrderDesc, extraData);
      setViewingProduct(null);
      setStep('list');
  };

  const buyNow = () => {
      if (!viewingProduct) return;
      const extraData = {
          sizeList: hasSizeList ? sizeList : [],
          layoutOption,
          moldOption,
          artLink,
          artExtrasDesc,
          wantsDigitalGrid,
          wantsMoldAlteration
      };
      addToCartGlobal(viewingProduct, Number(currentOrderQty) || 1, currentOrderDesc, extraData);
      setViewingProduct(null);
      setStep('questionnaire');
  };

  const addToCartFromList = (product: Product) => {
    addToCartGlobal(product, 1, '');
  };

  const removeFromCart = (tempId: string) => {
      removeFromCartGlobal(tempId);
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

      cart.forEach(item => {
          const totalListItems = (item.sizeList || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
          let qty = item.quantity;
          const nameLower = item.product.name.toLowerCase();
          
          if (item.sizeList && item.sizeList.length > 0 && !item.wantsDigitalGrid) {
              if (nameLower.includes('camisa') || nameLower.includes('replica') || nameLower.includes('réplica')) {
                  qty = totalListItems;
              }
          }
          
          let unitPrice = getProductPriceForQuantity(item.product, qty);
          if (item.sizeList && item.sizeList.length > 0 && !item.wantsDigitalGrid && (nameLower.includes('replica') || nameLower.includes('réplica'))) {
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
              downloadLink: item.product.downloadLink,
              size_list: item.sizeList && item.sizeList.length > 0 ? JSON.stringify(item.sizeList) : null,
              layout_option: item.layoutOption,
              mold_option: item.moldOption,
              art_link: item.artLink,
              art_extras_desc: item.artExtrasDesc,
              wants_digital_grid: item.wantsDigitalGrid ? 1 : 0,
              wants_mold_alteration: item.wantsMoldAlteration ? 1 : 0
          });

          const findServicePrice = (n: string, d: number) => {
              const s = products.find(p => p.name.toLowerCase().includes(n.toLowerCase()));
              return s ? s.price : d;
          };

          if (!item.wantsDigitalGrid) {
              if (item.layoutOption === 'precisa') {
                  const p = findServicePrice('layout simples', 30); totalValue += p;
                  itemsPayload.push({ productId: 'service-layout', productName: `Serviço: Layout (${item.product.name})`, quantity: 1, unitPrice: p, total: p, type: 'service' });
              }
              if (item.moldOption === 'precisa') {
                  const p = findServicePrice('molde', 50); totalValue += p;
                  itemsPayload.push({ productId: 'service-mold', productName: `Serviço: Molde (${item.product.name})`, quantity: 1, unitPrice: p, total: p, type: 'service' });
              }
          }

          if (item.wantsDigitalGrid && item.sizeList && item.sizeList.length > 0) {
              const replicaService = products.find(p => p.name.toLowerCase().includes('replica') && p.name.toLowerCase().includes('molde')) 
                                  || products.find(p => p.name.toLowerCase().includes('replica'));
              const replicaPrice = replicaService ? replicaService.price : 10.00;
              const gridCost = replicaPrice * totalListItems;
              totalValue += gridCost;
              itemsPayload.push({ 
                  productId: replicaService ? replicaService.id : 'service-grid-digital', 
                  productName: `Serviço: Grade Digital (${item.product.name})`, 
                  quantity: totalListItems, 
                  unitPrice: replicaPrice, 
                  total: gridCost, 
                  type: 'service' 
              });
          }
      });

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
    if (role === 'guest') {
        setStep('checkout');
        return;
    }
    if (role !== 'client' || !currentCustomer) return;
    setIsProcessing(true);
    try {
        const { items, total } = calculateFinalOrder();
        const orderData = {
            client_id: currentCustomer.id,
            description: cart.map(i => {
                let desc = `${i.product.name} (x${i.quantity})`;
                if (i.artExtrasDesc) desc += ` [Obs: ${i.artExtrasDesc}]`;
                if (i.artLink) desc += ` [Link: ${i.artLink}]`;
                if (i.wantsDigitalGrid) desc += ` [GRADE DIGITAL]`;
                if (i.wantsMoldAlteration) desc += ` [ALTERAÇÃO DE MOLDE]`;
                return desc;
            }).join('; '),
            items: items,
            total: total,
            size_list: null, // Now stored per-item in order_items
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

  // Cálculo do Limite Disponível Real (Crédito - Pedidos Abertos)
  const availableCredit = useMemo(() => {
    if (!currentCustomer) return 0;
    const openOrdersTotal = orders
      .filter(o => o.client_id === currentCustomer.id && o.status === 'open')
      .reduce((a, o) => a + Number(o.total || 0), 0);
    return Math.max(0, (currentCustomer.creditLimit || 0) - openOrdersTotal);
  }, [currentCustomer, orders]);

  const canAddToAccount = useMemo(() => {
    if (!currentCustomer || !lastCreatedOrder) return false;
    const { items } = calculateFinalOrder();
    const allServices = items.every(i => i.type === 'service');
    return allServices && availableCredit >= calculateDiscountedTotal();
  }, [currentCustomer, lastCreatedOrder, availableCredit, appliedCoupon]);

  const getHeaderTitle = () => {
      if (step === 'list') return activeTab === 'art' ? 'Quitanda de Artes' : 'Loja Crazy Art';
      if (step === 'detail') return 'Detalhes do Item';
      if (step === 'questionnaire') return 'Revisar Pedido';
      if (step === 'checkout') return 'Pagamento';
      return 'Loja';
  };

  const renderStepList = () => (
    <div className="animate-fade-in relative pb-24">
        {activeTab === 'landing' ? (
            <div className="space-y-12 py-10">
                <div className="text-center space-y-4 max-w-2xl mx-auto px-4">
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">
                        Bem-vindo à <span className="text-primary">Loja</span>
                    </h2>
                    <p className="text-zinc-500 text-xs md:text-sm uppercase tracking-widest font-bold">
                        Selecione um departamento para começar sua jornada criativa
                    </p>
                </div>

                <div className="flex flex-col gap-8 px-4 max-w-6xl mx-auto">
                    {/* Quitanda - Botão Largo com efeito de borda */}
                    <button 
                        onClick={() => { setActiveTab('art'); setQuitandaTab('estampas'); }}
                        className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-[2px] rounded-[2.5rem] group hover:scale-[1.01] transition-all duration-700 shadow-2xl shadow-purple-500/20 active:scale-95 overflow-hidden"
                    >
                        <div className="bg-zinc-950 rounded-[2.4rem] px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-8 group-hover:bg-zinc-900 transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] -mr-32 -mt-32 group-hover:bg-purple-500/20 transition-all" />
                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
                                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-5 rounded-2xl text-white shadow-xl group-hover:scale-110 transition-all duration-500">
                                    <Palette size={40} />
                                </div>
                                <div>
                                    <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2 italic">Quitanda de Artes</h3>
                                    <p className="text-zinc-500 text-xs md:text-sm uppercase tracking-widest font-bold leading-relaxed">Milhares de estampas e vetores exclusivos para download imediato</p>
                                </div>
                            </div>
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all flex items-center gap-3">
                                    Explorar Quitanda <ChevronRight size={20} />
                                </div>
                            </div>
                        </div>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Layout Simples - Estilo Ferramentas com Diagonal */}
                        <button 
                            onClick={() => navigate('/layout-simples')}
                            className="group relative h-80 rounded-[2.5rem] border border-white/10 overflow-hidden bg-gradient-to-br from-amber-900/40 via-orange-900/20 to-black transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:border-amber-500/30"
                        >
                            <div className="absolute inset-0 bg-grid-pattern opacity-10 mix-blend-overlay pointer-events-none" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(245,158,11,0.15)_0%,transparent_60%)] group-hover:opacity-100 transition-opacity" />
                            
                            {/* Diagonal Division Effect */}
                            <div className="absolute top-0 right-0 w-1/2 h-full bg-black/40 overflow-hidden hidden md:block" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}>
                                 <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
                            </div>

                            <div className="relative h-full w-full p-8 flex flex-col justify-between z-20">
                                <div className="flex justify-between items-start">
                                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500 text-amber-300">
                                        <Layers size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className="w-4 h-4 rounded-full bg-amber-500 animate-pulse shadow-[0_0_20px_#f59e0b]" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-white leading-none uppercase tracking-tighter italic">
                                        Layout
                                        <span className="block text-xl font-medium opacity-80 text-amber-300">Simples</span>
                                    </h3>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest max-w-[150px]">Briefing rápido, entrega garantida</p>
                                </div>
                            </div>

                            {/* Product Image on Front */}
                            {products.find(p => p.name.toLowerCase().includes('layout simples'))?.imageUrl && (
                                <div className="absolute right-[-10%] bottom-[-5%] w-48 h-48 rotate-12 group-hover:rotate-6 group-hover:scale-110 transition-all duration-700 pointer-events-none z-30 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                    <img 
                                        src={products.find(p => p.name.toLowerCase().includes('layout simples'))?.imageUrl} 
                                        className="w-full h-full object-contain" 
                                    />
                                </div>
                            )}
                        </button>

                        {/* Montagem de Molde */}
                        <button 
                            onClick={() => navigate('/montagem-molde')}
                            className="group relative h-80 rounded-[2.5rem] border border-white/10 overflow-hidden bg-gradient-to-br from-blue-900/40 via-cyan-900/20 to-black transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:border-blue-500/30"
                        >
                            <div className="absolute inset-0 bg-grid-pattern opacity-10 mix-blend-overlay pointer-events-none" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15)_0%,transparent_60%)] group-hover:opacity-100 transition-opacity" />
                            
                            <div className="relative h-full w-full p-8 flex flex-col justify-between z-20">
                                <div className="flex justify-between items-start">
                                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500 text-blue-300">
                                        <Scissors size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse shadow-[0_0_20px_#3b82f6]" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-white leading-none uppercase tracking-tighter italic">
                                        Montagem
                                        <span className="block text-xl font-medium opacity-80 text-blue-300">de Molde</span>
                                    </h3>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest max-w-[150px]">Precisão técnica para produção</p>
                                </div>
                            </div>

                            {/* Product Image on Front */}
                            {products.find(p => p.name.toLowerCase().includes('montagem de molde'))?.imageUrl && (
                                <div className="absolute right-[-10%] bottom-[-5%] w-48 h-48 -rotate-12 group-hover:-rotate-6 group-hover:scale-110 transition-all duration-700 pointer-events-none z-30 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                    <img 
                                        src={products.find(p => p.name.toLowerCase().includes('montagem de molde'))?.imageUrl} 
                                        className="w-full h-full object-contain" 
                                    />
                                </div>
                            )}
                        </button>

                        {/* Matriz de Bordado */}
                        <button 
                            onClick={() => navigate('/matriz-bordado')}
                            className="group relative h-80 rounded-[2.5rem] border border-white/10 overflow-hidden bg-gradient-to-br from-purple-900/40 via-indigo-900/20 to-black transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:border-purple-500/30"
                        >
                            <div className="absolute inset-0 bg-grid-pattern opacity-10 mix-blend-overlay pointer-events-none" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_80%,rgba(168,85,247,0.15)_0%,transparent_60%)] group-hover:opacity-100 transition-opacity" />
                            
                            <div className="relative h-full w-full p-8 flex flex-col justify-between z-20">
                                <div className="flex justify-between items-start">
                                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500 text-purple-300">
                                        <Hash size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className="w-4 h-4 rounded-full bg-purple-500 animate-pulse shadow-[0_0_20px_#a855f7]" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-white leading-none uppercase tracking-tighter italic">
                                        Matriz
                                        <span className="block text-xl font-medium opacity-80 text-purple-300">de Bordado</span>
                                    </h3>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest max-w-[150px]">Digitalização de alta qualidade</p>
                                </div>
                            </div>

                            {/* Product Image on Front */}
                            {products.find(p => p.name.toLowerCase().includes('bordado'))?.imageUrl && (
                                <div className="absolute right-[-10%] bottom-[-5%] w-48 h-48 rotate-12 group-hover:rotate-6 group-hover:scale-110 transition-all duration-700 pointer-events-none z-30 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                    <img 
                                        src={products.find(p => p.name.toLowerCase().includes('bordado'))?.imageUrl} 
                                        className="w-full h-full object-contain" 
                                    />
                                </div>
                            )}
                        </button>

                        {/* Vetorização */}
                        <button 
                            onClick={() => navigate('/vetorizacao')}
                            className="group relative h-80 rounded-[2.5rem] border border-white/10 overflow-hidden bg-gradient-to-br from-emerald-900/40 via-teal-900/20 to-black transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:border-emerald-500/30"
                        >
                            <div className="absolute inset-0 bg-grid-pattern opacity-10 mix-blend-overlay pointer-events-none" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.15)_0%,transparent_60%)] group-hover:opacity-100 transition-opacity" />
                            
                            <div className="relative h-full w-full p-8 flex flex-col justify-between z-20">
                                <div className="flex justify-between items-start">
                                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500 text-emerald-300">
                                        <Palette size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_20px_#10b981]" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-white leading-none uppercase tracking-tighter italic">
                                        Vetorização
                                        <span className="block text-xl font-medium opacity-80 text-emerald-300">de Arte</span>
                                    </h3>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest max-w-[150px]">Conversão para vetor editável</p>
                                </div>
                            </div>

                            {/* Product Image on Front */}
                            {products.find(p => p.name.toLowerCase().includes('vetoriza'))?.imageUrl && (
                                <div className="absolute right-[-10%] bottom-[-5%] w-48 h-48 -rotate-12 group-hover:-rotate-6 group-hover:scale-110 transition-all duration-700 pointer-events-none z-30 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                    <img 
                                        src={products.find(p => p.name.toLowerCase().includes('vetoriza'))?.imageUrl} 
                                        className="w-full h-full object-contain" 
                                    />
                                </div>
                            )}
                        </button>
                    </div>

                    {role === 'admin' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <button 
                                onClick={() => setActiveTab('product')}
                                className="group relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 text-left hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] group-hover:bg-primary/10 transition-colors" />
                                <div className="flex items-center gap-6">
                                    <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                        <ShoppingBag size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Produtos</h3>
                                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Catálogo de Hardwares e Insumos</p>
                                    </div>
                                </div>
                            </button>

                            <button 
                                onClick={() => setActiveTab('service')}
                                className="group relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 text-left hover:border-blue-500/50 transition-all duration-500 hover:scale-[1.02] overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] group-hover:bg-blue-500/10 transition-colors" />
                                <div className="flex items-center gap-6">
                                    <div className="bg-blue-500/10 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                                        <Wrench size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Serviços</h3>
                                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Artes Sob Medida e Consultoria</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                                <Sparkles className="text-primary" size={32} />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Últimas Novidades</h4>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Confira o que acabou de chegar na Crazy Art</p>
                            </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto max-w-sm custom-scrollbar pb-2">
                             {latestArts.slice(0, 5).map(art => (
                                 <button key={art.id} onClick={() => openProduct(art)} className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex-shrink-0 overflow-hidden hover:border-primary transition">
                                     {art.imageUrl && <img src={art.imageUrl} className="w-full h-full object-cover" />}
                                 </button>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
        ) : activeTab === 'art' ? (
            <div className="flex flex-col items-center mb-10 space-y-4">
                {role === 'admin' && (
                    <button 
                        onClick={() => setActiveTab('product')} 
                        className="w-full bg-zinc-800 p-[1px] rounded-2xl group hover:scale-[1.02] transition-all duration-500 shadow-xl active:scale-95 mb-4"
                    >
                        <div className="bg-zinc-950 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 group-hover:bg-zinc-900 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-zinc-800 p-3 rounded-xl text-zinc-400 group-hover:text-white transition-colors">
                                    <ShoppingBag size={24} />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-white font-black text-lg uppercase tracking-tighter leading-none">Ir para Loja Geral</h4>
                                    <p className="text-zinc-400 text-[10px] uppercase tracking-widest mt-1">Voltar ao catálogo principal de produtos</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-white text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all flex items-center gap-2">
                                    Acessar Loja <ArrowUpRight size={16} />
                                </div>
                            </div>
                        </div>
                    </button>
                )}

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
                <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-full max-w-md border border-zinc-800 shadow-xl overflow-x-auto mb-2"><button onClick={() => { setQuitandaTab('estampas'); setSelectedColor(null); setSearchTerm(''); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'estampas' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>ESTAMPAS</button><button onClick={() => { setQuitandaTab('logos'); setSelectedColor(null); setSearchTerm(''); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'logos' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>LOGOS</button><button onClick={() => { setQuitandaTab('bordados'); setSelectedColor(null); setSearchTerm(''); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'bordados' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>BORDADOS</button><button onClick={() => { setQuitandaTab('diversos'); setSelectedColor(null); setSearchTerm(''); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${quitandaTab === 'diversos' ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>DIVERSOS</button></div>
                {quitandaTab === 'estampas' && (
                    <div className="w-full overflow-x-auto pb-2"><div className="flex gap-2 min-w-max px-1">{artCategories.map(cat => (<button key={cat} onClick={() => setActiveArtCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap border ${activeArtCategory === cat ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'}`}>{cat}</button>))}</div></div>
                )}
                <div className="w-full grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4"><div className="relative"><input type="text" placeholder={`Buscar em ${quitandaTab}...`} className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 outline-none transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search className="absolute left-3 top-3.5 text-zinc-600" size={20} /></div><div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center gap-2 overflow-x-auto custom-scrollbar"><div className="text-[10px] text-zinc-500 font-bold uppercase px-2">Cores</div><button onClick={() => setSelectedColor(null)} className={`flex items-center justify-center w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white transition shrink-0 ${!selectedColor ? 'ring-2 ring-white bg-zinc-700 text-white' : ''}`} title="Todas as Cores"><span className="block w-4 h-[1px] bg-current rotate-45 absolute"></span><span className="block w-4 h-[1px] bg-current -rotate-45 absolute"></span></button>{ART_COLOR_FILTERS.map(color => (<button key={color.name} onClick={() => setSelectedColor(selectedColor === color.hex ? null : color.hex)} className={`w-8 h-8 rounded-full border-2 transition shrink-0 hover:scale-110 ${selectedColor === color.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-zinc-500'}`} style={{ backgroundColor: color.hex }} title={color.name} />))}</div></div><div className="w-full p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl flex items-center gap-3"><CloudDownload className="text-purple-400 shrink-0" /><p className="text-xs text-purple-200">As artes da <strong>Quitanda</strong> são arquivos digitais para download imediato após pagamento.</p></div>
            </div>
        ) : (
            <div className="flex flex-col items-center mb-10 space-y-6">
                {role === 'admin' && (
                    <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-full max-w-md border border-zinc-800 shadow-xl overflow-x-auto">
                        <button onClick={() => setActiveTab('product')} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${activeTab === 'product' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>PRODUTOS</button>
                        <button onClick={() => setActiveTab('service')} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap ${activeTab === 'service' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>SERVIÇOS</button>
                        <button onClick={() => { setActiveTab('art'); setQuitandaTab('estampas'); }} className={`flex-1 px-4 py-2.5 rounded-full text-xs font-bold tracking-widest transition whitespace-nowrap flex items-center justify-center gap-1 text-zinc-500 hover:text-purple-400`}><Palette size={12} /> QUITANDA</button>
                    </div>
                )}
                <div className="w-full max-w-md relative"><input type="text" placeholder="Buscar na loja..." className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-primary outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search className="absolute left-3 top-3.5 text-zinc-600" size={20} /></div>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{filteredItems.map((item) => {
            // Verifica se deve exibir "Assinatura" ou preço
            const isArt = (item.type as string) === 'art';
            const showFree = isSubscriber && isArt;
            
            return (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-primary/50 transition group h-full flex flex-col relative">
                <div onClick={() => openProduct(item)} className="cursor-pointer flex-1 flex flex-col">
                    <div className={`${isArt ? 'aspect-square' : 'h-56'} bg-zinc-800 flex items-center justify-center relative overflow-hidden`}>
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : isArt ? <Palette size={64} className="text-purple-500/50" /> : <ShoppingBag size={64} className="text-zinc-700" />}
                        
                        <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase backdrop-blur-md ${showFree ? 'bg-gradient-to-r from-purple-600 to-pink-600' : isArt ? 'bg-purple-600/80' : 'bg-black/60'}`}>
                            {showFree ? <span className="flex items-center gap-1"><Crown size={12} /> ASSINATURA</span> : `R$ ${item.price.toFixed(2)}`}
                        </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-white text-lg leading-tight flex-1">{item.name}</h3>
                            {showFree && item.downloadLink ? (
                                <a 
                                    href={item.downloadLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-full text-white hover:scale-110 transition shadow-lg shrink-0 active:scale-95 flex items-center justify-center"
                                    title="Baixar Agora (Assinante)"
                                >
                                    <CloudDownload size={14} />
                                </a>
                            ) : (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); addToCartFromList(item); }} 
                                    className="bg-primary p-2 rounded-full text-white hover:bg-amber-600 transition shadow-lg shrink-0 active:scale-90"
                                    title="Adicionar ao Carrinho"
                                >
                                    <ShoppingCart size={14} />
                                </button>
                            )}
                        </div>
                        <p className="text-zinc-500 text-xs mt-2 line-clamp-2 flex-1">{item.description || 'Clique para ver detalhes'}</p>
{item.priceVariations && item.priceVariations.length > 0 && (<div className="mt-2 text-[10px] text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/20 inline-block w-fit"><Tag size={10} className="inline mr-1" /> Preços especiais p/ atacado</div>)}{isArt && (
    <div className="mt-3 flex flex-wrap gap-2">
        <div className="flex items-center gap-1 text-[10px] text-purple-400 font-bold uppercase tracking-wider">
            <CloudDownload size={12} /> Digital
        </div>
        {item.subcategory && item.subcategory.split(',').map(s => s.trim()).filter(Boolean).map((cat, i) => (
            <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                {cat}
            </span>
        ))}
    </div>
)}</div>
                </div>
            </div>
            )
        })}</div>
        {filteredItems.length === 0 && <div className="text-center py-20 opacity-50"><p>Nenhum item encontrado.</p>{activeTab === 'art' && <p className="text-xs mt-2">Tente outra aba ou categoria.</p>}</div>}
         
    </div>
  );

  const renderCommentsSection = () => {
    const isLoggedIn = role === 'admin' || role === 'client';

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-left space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          Comentários e Avaliações
        </h3>

        {/* Form para Adicionar Comentário */}
        {isLoggedIn ? (
          <form onSubmit={handleAddComment} className="space-y-3">
            <div>
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Escreva seu comentário..."
                rows={3}
                required
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white focus:border-primary outline-none transition resize-none placeholder-zinc-600"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingComment || !newCommentText.trim()}
                className="px-4 py-2 bg-primary text-white font-bold text-[10px] rounded-xl hover:bg-opacity-90 active:scale-95 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submittingComment ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    Comentar
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-center text-[10px] text-zinc-500">
            Você precisa estar <span className="font-bold text-zinc-400">logado</span> para deixar um comentário.
          </div>
        )}

        {/* Lista de Comentários */}
        <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
          {commentsLoading ? (
            <p className="text-[10px] text-zinc-500 py-2 text-center">Carregando comentários...</p>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-[10px] text-zinc-500 border border-dashed border-zinc-850 rounded-xl">
              Nenhum comentário publicado. Seja o primeiro!
            </div>
          ) : (
            comments.map((c: any) => (
              <div key={c.id} className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                      {c.user_name ? c.user_name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-[10px] font-bold text-white">{c.user_name || 'Usuário'}</span>
                  </div>
                  <span className="text-[8px] text-zinc-550">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-300 leading-relaxed pl-6">
                  "{c.comment}"
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderStepDetail = () => {
    const dynamicPrice = viewingProduct ? getProductPriceForQuantity(viewingProduct, Number(currentOrderQty) || 1) : 0;
    const hasDiscount = viewingProduct && dynamicPrice < viewingProduct.price;
    const isArt = (viewingProduct?.type as string) === 'art';
    const showFreeDownload = isSubscriber && isArt && viewingProduct?.downloadLink;

    return (
    <div className="animate-fade-in max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="flex flex-col space-y-6">
            <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center relative flex-shrink-0">
                {viewingProduct?.imageUrl ? <img src={viewingProduct.imageUrl} className="w-full h-full object-cover" /> : (viewingProduct?.type as string) === 'art' ? <Palette size={120} className="text-purple-500/20" /> : <ShoppingBag size={120} className="text-zinc-800" />}
                {(viewingProduct?.type as string) === 'art' && (
                    <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                        <CloudDownload size={12} /> Digital
                    </div>
                )}
            </div>
            {renderCommentsSection()}
        </div>
        <div className="flex flex-col justify-center space-y-8">
            <div>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${viewingProduct?.type === 'art' ? 'bg-purple-500/10 text-purple-400' : 'bg-primary/10 text-primary'}`}>
                    {viewingProduct?.type === 'art' ? 'Arte Digital' : viewingProduct?.type === 'service' ? 'Serviço' : 'Produto'}
                </span>
                <h2 className="text-4xl font-bold text-white mt-4">{viewingProduct?.name}</h2>
                <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-3xl font-black text-emerald-400">{showFreeDownload ? 'GRÁTIS (Assinante)' : `R$ ${dynamicPrice.toFixed(2)}`}</p>
                    {hasDiscount && !showFreeDownload && <p className="text-sm text-zinc-500 line-through">R$ {viewingProduct?.price.toFixed(2)}</p>}
                </div>
                {hasDiscount && !showFreeDownload && <p className="text-xs text-emerald-500 font-bold mt-1">Preço especial de atacado aplicado!</p>}
                {viewingProduct?.type === 'art' && viewingProduct?.subcategory && (
                    <div className="flex flex-wrap gap-2 mt-1 items-center">
                        <span className="text-zinc-500 text-sm">Categorias:</span>
                        {viewingProduct.subcategory.split(',').map(s => s.trim()).filter(Boolean).map((cat, i) => (
                            <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                                {cat}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {viewingProduct?.priceVariations && viewingProduct.priceVariations.length > 0 && (
                <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Tabela de Preços (Atacado)</h4>
                    <div className="flex flex-wrap gap-2">
                        <div className={`px-3 py-2 rounded-lg border text-xs text-center ${Number(currentOrderQty) < Math.min(...viewingProduct.priceVariations.map(v=>v.minQuantity)) ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                            <span className="block font-bold">1 un</span>R$ {viewingProduct.price.toFixed(2)}
                        </div>
                        {viewingProduct.priceVariations.sort((a,b) => a.minQuantity - b.minQuantity).map((v, i) => (
                            <div key={i} className={`px-3 py-2 rounded-lg border text-xs text-center ${Number(currentOrderQty) >= v.minQuantity && (i === viewingProduct!.priceVariations!.length - 1 || Number(currentOrderQty) < viewingProduct!.priceVariations![i+1].minQuantity) ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                                <span className="block font-bold">+{v.minQuantity} un</span>R$ {v.price.toFixed(2)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Descrição</h4>
                {(() => {
                    const desc = viewingProduct?.description || 'Nenhum detalhe adicional.';
                    const descLines = desc.split('\n');
                    const hasMoreThanFiveLines = descLines.length > 5;
                    const displayText = showFullDesc || !hasMoreThanFiveLines 
                        ? desc 
                        : descLines.slice(0, 5).join('\n');

                    return (
                        <div className="mb-4">
                            <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                                {displayText}
                                {!showFullDesc && hasMoreThanFiveLines && '...'}
                            </p>
                            {hasMoreThanFiveLines && (
                                <button
                                    type="button"
                                    onClick={() => setShowFullDesc(!showFullDesc)}
                                    className="text-purple-400 hover:text-purple-300 transition-all font-bold text-xs mt-2 flex items-center gap-1 focus:outline-none"
                                >
                                    {showFullDesc ? 'Mostrar menos' : 'Mostrar mais'}
                                </button>
                            )}
                        </div>
                    );
                })()}
                {viewingProduct?.type === 'art' && (
                    <div className="bg-purple-900/10 p-3 rounded-lg border border-purple-500/20 mb-4 text-xs text-purple-300">
                        Este é um produto digital. Você receberá o link para download automaticamente após a confirmação do pagamento.
                    </div>
                )}
                
                {/* Questionnaire integrated into Detail Step */}
                <div className="space-y-6 mt-6 pt-6 border-t border-zinc-800">
                    {isArt ? (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-purple-900/10 rounded-xl border border-purple-500/20 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-600 text-white">
                                        <Layers size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Montar grade digital?</h4>
                                        <p className="text-[10px] text-zinc-400">
                                            {isSubscriber 
                                                ? "Assinantes vão direto p/ a Montagem de Molde com esta arte anexada!" 
                                                : "Compre esta arte e seja redirecionado direto p/ a Montagem de Molde com ela."}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    disabled={isDigitalGridProcessing}
                                    onClick={handleAssembleDigitalGrid} 
                                    className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 disabled:opacity-50 whitespace-nowrap"
                                >
                                    {isDigitalGridProcessing ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Processando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Layers size={14} />
                                            <span>{isSubscriber ? "Ir p/ Montagem de Molde" : "Pagar e Montar Grade"}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* ALTERAÇÃO DE MOLDE Selector */}
                            <div className="flex items-center justify-between p-4 bg-purple-900/10 rounded-xl border border-purple-500/20">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${wantsMoldAlteration ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                        <Scissors size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">ALTERAÇÃO DE MOLDE</h4>
                                        <p className="text-[10px] text-zinc-500">alterar molde?</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setWantsMoldAlteration(!wantsMoldAlteration)} className={`w-12 h-7 rounded-full transition relative flex items-center px-1 ${wantsMoldAlteration ? 'bg-purple-600' : 'bg-zinc-800'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full transition ${wantsMoldAlteration ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </button>
                            </div>

                            {wantsMoldAlteration && (
                                <div className="animate-fade-in space-y-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 ml-1">O que precisa ser alterado?</label>
                                        <textarea
                                            className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-primary transition min-h-[60px]"
                                            placeholder="Descreva detalhadamente o que deseja alterar no molde..."
                                            value={artExtrasDesc}
                                            onChange={(e) => setArtExtrasDesc(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <ImageUploadInput
                                            label="Subir Arquivos de Referência (PNG, JPG, PDF - Máx 5MB)"
                                            placeholder="Fazer Upload do arquivo ou cole o link..."
                                            accept=".png,.jpg,.jpeg,.pdf"
                                            maxSizeMB={5}
                                            value={artLink}
                                            onChange={(url) => setArtLink(url)}
                                        />
                                        <p className="text-[9px] text-zinc-500 mt-1 ml-1">Permitidos arquivos PNG, JPG e PDF de até 5MB.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (viewingProduct?.type === 'product' && (
                        <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${hasSizeList ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                    <Film size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">Lista de Produção?</h4>
                                    <p className="text-[10px] text-zinc-500">Nomes, números e tamanhos.</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => { setHasSizeList(!hasSizeList); if (!hasSizeList && sizeList.length === 0) addListRow(); }} className={`w-12 h-7 rounded-full transition relative flex items-center px-1 ${hasSizeList ? 'bg-primary' : 'bg-zinc-800'}`}>
                                <div className={`w-5 h-5 bg-white rounded-full transition ${hasSizeList ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    ))}

                    {hasSizeList && (
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 animate-fade-in">
                            <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Lista de Produção ({calculateTotalItemsInList()})</span>
                                <button onClick={toggleGlobalSimpleMode} className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-[9px] font-bold uppercase transition ${isGlobalSimple ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}>
                                    <span>Sem nomes</span>
                                    {isGlobalSimple ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                </button>
                            </div>
                            {sizeList.map((item, idx) => (
                                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-800 items-end">
                                    <div className="sm:col-span-3">
                                        <label className="block text-[8px] font-bold text-zinc-600 uppercase mb-1">Tipo</label>
                                        <select value={item.category} onChange={(e) => updateListRow(item.id, 'category', e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-700 rounded-md text-[10px] text-white p-1 outline-none">
                                            <option value="unisex">Unisex</option>
                                            <option value="feminina">Feminina</option>
                                            <option value="infantil">Infantil</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[8px] font-bold text-zinc-600 uppercase mb-1">Tam</label>
                                        <select value={item.size} onChange={(e) => updateListRow(item.id, 'size', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-md text-[10px] text-white p-1 outline-none">
                                            {sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    {item.isSimple ? (
                                        <div className="sm:col-span-5">
                                            <label className="block text-[8px] font-bold text-zinc-600 uppercase mb-1">Qtd</label>
                                            <input type="number" min="1" value={item.quantity || 1} onChange={(e) => updateListRow(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-1 text-[10px] text-white font-mono text-center" />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="sm:col-span-2">
                                                <label className="block text-[8px] font-bold text-zinc-600 uppercase mb-1">Nº</label>
                                                <input type="text" value={item.number} onChange={(e) => updateListRow(item.id, 'number', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-1 text-[10px] text-white font-mono text-center" />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-[8px] font-bold text-zinc-600 uppercase mb-1">Nome</label>
                                                <input type="text" value={item.name} onChange={(e) => updateListRow(item.id, 'name', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-md p-1 text-[10px] text-white uppercase" />
                                            </div>
                                        </>
                                    )}
                                    <div className="sm:col-span-1 flex items-end">
                                        <button onClick={() => removeListRow(item.id)} className="w-full p-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition flex items-center justify-center">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addListRow} className="w-full mt-2 py-2 border border-dashed border-zinc-800 rounded-lg text-zinc-500 hover:text-primary transition flex items-center justify-center gap-2 font-bold uppercase text-[9px]">
                                <PlusIcon size={12} /> Adicionar Integrante
                            </button>
                        </div>
                    )}

                    {viewingProduct?.type !== 'art' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Tem Layout?</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setLayoutOption('sim')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition ${layoutOption === 'sim' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Sim</button>
                                    <button onClick={() => setLayoutOption('precisa')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition ${layoutOption === 'precisa' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Precisa</button>
                                </div>
                            </div>
                            {viewingProduct?.type === 'product' && (
                                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Tem Molde?</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setMoldOption('sim')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition ${moldOption === 'sim' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Sim</button>
                                        <button onClick={() => setMoldOption('precisa')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition ${moldOption === 'precisa' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Precisa</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(layoutOption === 'sim' || moldOption === 'sim') && (
                        <div className="animate-fade-in space-y-4 pt-4 border-t border-zinc-800">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 ml-1">Logos extras / Observações</label>
                                <textarea className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-primary transition min-h-[60px]" placeholder="Ex: Logo no peito esquerdo..." value={artExtrasDesc} onChange={(e) => setArtExtrasDesc(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 ml-1">Link dos Arquivos</label>
                                <div className="relative">
                                    <input type="text" placeholder="Cole o link aqui..." className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-white text-xs outline-none focus:border-primary transition" value={artLink} onChange={(e) => setArtLink(e.target.value)} />
                                    <Upload className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 mt-8">
                    <div className="flex items-center gap-2 bg-black rounded-xl p-2 border border-zinc-800">
                        <button onClick={() => setCurrentOrderQty(Math.max(1, Number(currentOrderQty) - 1))} className="p-2 text-zinc-500"><Minus size={16} /></button>
                        <input type="number" value={currentOrderQty} onChange={(e) => setCurrentOrderQty(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-12 bg-transparent text-white text-center font-bold outline-none" />
                        <button onClick={() => setCurrentOrderQty(Number(currentOrderQty) + 1)} className="p-2 text-zinc-500"><PlusIcon size={16} /></button>
                    </div>
                    <input type="text" placeholder="Obs. (Cor, Tamanho...)" className="flex-1 bg-black rounded-xl px-4 py-3 border border-zinc-800 text-white outline-none text-sm" value={currentOrderDesc} onChange={(e) => setCurrentOrderDesc(e.target.value)} />
                </div>
            </div>
            
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
            </div>
        </div>
    </div>
    );
  };

  const renderStepQuestionnaire = () => {
      const calc = calculateFinalOrder();
      return (
        <div className="animate-fade-in max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl relative space-y-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3"><ListChecks className="text-primary" /> Revisar Pedido</h2>
            
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
                {calc.items.map((item, idx) => (
                    <div key={idx} className="p-4 flex justify-between items-center group">
                        <div>
                            <p className="text-white font-bold text-sm">{item.productName} <span className="text-primary">x{item.quantity}</span></p>
                            {item.size_list && (
                                <p className="text-[10px] text-zinc-500 mt-1">Lista de produção vinculada</p>
                            )}
                            {item.type === 'art' && <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Download Digital</span>}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <span className="text-emerald-400 font-mono text-sm block">R$ {item.total.toFixed(2)}</span>
                                {item.quantity > 1 && <span className="text-[10px] text-zinc-600 block">R$ {item.unitPrice.toFixed(2)}/un</span>}
                            </div>
                            {item.productId && !item.productId.startsWith('service-') && (
                                <button onClick={() => removeFromCart(cart.find(c => c.product.id === item.productId)?.tempId || '')} className="text-zinc-600 hover:text-red-500 transition">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t border-zinc-800 pt-6 mt-6">
                <button onClick={() => setStep('list')} className="w-full mb-6 py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-primary transition flex items-center justify-center gap-3 font-bold uppercase text-xs">
                    <PlusIcon size={18} /> Adicionar mais item
                </button>
                <div className="flex justify-between items-end mb-6">
                    <span className="text-zinc-500 text-sm font-bold uppercase">Total Estimado</span>
                    <span className="text-3xl font-black text-white">R$ {calc.total.toFixed(2)}</span>
                </div>
                <button onClick={handleCreateOrder} disabled={isProcessing} className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-amber-600 transition shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">
                    {isProcessing ? <Loader2 className="animate-spin" /> : <ChevronRight />} PROSSEGUIR PARA PAGAMENTO
                </button>
            </div>
        </div>
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
                                onFocus={() => { if (role === 'client' && clientCoupons.length > 0) setShowCouponList(true); }}
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

                    {role === 'client' && clientCoupons.length > 0 && !appliedCoupon && (
                        <div className="space-y-2">
                            <button 
                                type="button"
                                onClick={() => setShowCouponList(!showCouponList)}
                                className="text-zinc-400 hover:text-white text-xs flex items-center gap-1.5 font-bold uppercase tracking-wider transition bg-zinc-900/40 hover:bg-zinc-900 px-3 py-1.5 rounded-xl border border-white/5 active:scale-95"
                            >
                                <Ticket size={13} className="text-[#ff8100]" />
                                {showCouponList ? 'Ocultar meus cupons' : 'Ver meus cupons salvos'} ({clientCoupons.length})
                            </button>
                            
                            {showCouponList && (
                                <div className="bg-black/60 border border-zinc-850 p-3 rounded-2xl space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin">
                                    {clientCoupons.map((c) => {
                                        const eligibility = isCouponEligibleForShop(c.type);
                                        const nowMs = Date.now();
                                        const expiresMs = new Date(c.expires_at).getTime();
                                        const isExpired = expiresMs <= nowMs;
                                        const isUsed = c.is_used === 1;
                                        
                                        const itemDisabled = !eligibility.eligible || isExpired || isUsed;

                                        return (
                                            <div 
                                                key={c.id}
                                                onClick={() => {
                                                    if (!itemDisabled) {
                                                        setCouponCode(c.code);
                                                        setShowCouponList(false);
                                                    }
                                                }}
                                                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                                                    itemDisabled 
                                                        ? 'bg-zinc-950/20 border-zinc-900/60 opacity-40 cursor-not-allowed' 
                                                        : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80 cursor-pointer active:scale-[0.98]'
                                                }`}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-xs text-white uppercase">{c.code}</span>
                                                        <span className="text-[10px] text-primary font-bold">{c.percentage}% OFF</span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                                        {isUsed ? 'Utilizado' : isExpired ? 'Expirado' : `Validade: ${new Date(c.expires_at).toLocaleDateString('pt-BR')}`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    {!eligibility.eligible ? (
                                                        <span className="text-[9px] text-[#ff8100] font-bold uppercase">{eligibility.message}</span>
                                                    ) : isUsed ? (
                                                        <span className="text-[9px] text-red-500 font-bold uppercase">Usado</span>
                                                    ) : isExpired ? (
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Expirado</span>
                                                    ) : (
                                                        <span className="text-[10px] text-emerald-400 font-bold uppercase">Inserir</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                    
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
                                <button onClick={() => { clearCart(); setStep('success'); }} className="w-full bg-zinc-100 text-black py-4 rounded-2xl font-bold hover:bg-white transition flex flex-col items-center justify-center shadow-xl uppercase tracking-wider text-xs sm:text-sm">
                                    <div className="flex items-center gap-2">
                                        <Wallet size={18} /> Adicionar à Conta
                                    </div>
                                    <span className="text-[9px] text-zinc-500 font-bold">Disponível: R$ {availableCredit.toFixed(2)}</span>
                                </button>
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
            <button onClick={() => navigate('/minha-area')} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-zinc-200 transition">Ver Meus Pedidos</button>
            <button onClick={() => window.open(`https://wa.me/5516994142665?text=Olá, acabei de fazer o pedido #${lastCreatedOrder?.order_number}`, '_blank')} className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2"><MessageCircle size={20} /> Enviar no WhatsApp</button>
        </div>
    </div>
  );

  const renderSchemaOrg = () => {
    try {
      const schemas: any[] = [];

      // 1. Se estiver visualizando detalhes de um item, adiciona o Schema de Produto único
      if (step === 'detail' && viewingProduct) {
        const isArtProduct = (viewingProduct.type as string) === 'art';
        schemas.push({
          "@context": "https://schema.org/",
          "@type": "Product",
          "@id": `https://crazyart.com.br/shop?item=${viewingProduct.id}`,
          "name": viewingProduct.name,
          "image": viewingProduct.imageUrl || "",
          "description": viewingProduct.description || (isArtProduct 
            ? `Arquivo digital de alta qualidade pronta para bordados ou estampas na Quitanda de Artes da Crazy Art.` 
            : `Produto de alta qualidade disponível na Crazy Art.`),
          "category": isArtProduct ? "Design/Craft/Digital Art" : "Apparel/Product",
          "brand": {
            "@type": "Brand",
            "name": "Crazy Art"
          },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "BRL",
            "price": viewingProduct.price.toFixed(2),
            "itemCondition": "https://schema.org/NewCondition",
            "availability": "https://schema.org/InStock"
          }
        });
      }

      // 2. Se estiver na aba Quitanda de Artes, indexa a lista de itens ativa como ItemList schema
      if (activeTab === 'art' && filteredItems && filteredItems.length > 0) {
        const listElements = filteredItems.map((item, index) => {
          const isArtProduct = (item.type as string) === 'art';
          return {
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "Product",
              "@id": `https://crazyart.com.br/shop?item=${item.id}`,
              "name": item.name,
              "image": item.imageUrl || "",
              "description": item.description || (isArtProduct 
                ? `Arquivo digital de alta qualidade pronta para bordados ou estampas na Quitanda de Artes.` 
                : `Produto de alta qualidade disponível na Crazy Art.`),
              "offers": {
                "@type": "Offer",
                "priceCurrency": "BRL",
                "price": item.price.toFixed(2),
                "availability": "https://schema.org/InStock"
              }
            }
          };
        });

        schemas.push({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Quitanda de Artes - Catálogo de Matrizes de Bordado e Estampas",
          "description": "Explorar o catálogo completo de arquivos digitais, matrizes de bordados e layouts prontos da Quitanda de Artes na Crazy Art.",
          "numberOfItems": filteredItems.length,
          "itemListElement": listElements
        });
      }

      return schemas.map((schema, idx) => (
        <script
          key={`jsonld-schema-${idx}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ));
    } catch (e) {
      console.error("Erro ao gerar JSON-LD:", e);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-text p-6 pb-32 relative">
      {renderSchemaOrg()}
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
          {step === 'list' && renderStepList()}
          {step === 'detail' && renderStepDetail()}
          {step === 'questionnaire' && renderStepQuestionnaire()}
          {(step === 'checkout' || step === 'success') && (
              role === 'guest' ? (
                  <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
                      <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-3xl max-w-lg text-center relative overflow-hidden shadow-2xl">
                          <div className="relative z-10 flex flex-col items-center">
                              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 ring-4 ring-zinc-900 shadow-xl">
                                  <Lock className="text-primary" size={40} />
                              </div>
                              <p className="text-zinc-300 mb-8 leading-relaxed text-lg font-medium">Faça login para realizar seus pedidos e prosseguir para o pagamento.</p>
                              <Link to="/?action=login" className="bg-crazy-gradient text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition shadow-lg w-full flex items-center justify-center gap-3">
                                  <UserPlus size={20} /> Acessar ou Cadastrar
                              </Link>
                          </div>
                      </div>
                  </div>
              ) : (
                  <>
                      {step === 'checkout' && renderStepCheckout()}
                      {step === 'success' && renderStepSuccess()}
                  </>
              )
          )}
      </div>
    </div>
  );
}
