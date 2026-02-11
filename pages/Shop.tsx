
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingBag, Wrench, Search, ShoppingCart, 
  CheckCircle, AlertOctagon, Send, X, Trash2, Minus, 
  Plus as PlusIcon, CreditCard, Loader2, MessageCircle, 
  Lock, UserPlus, ChevronRight, ListChecks, Upload, 
  Info, AlertTriangle, Wallet, Check, Film, FileText, Layers, Hash, ToggleLeft, ToggleRight,
  Coins, Ticket
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, Order, SizeListItem, Coupon } from '../types';
import { api } from '../src/services/api';

type ShopStep = 'list' | 'detail' | 'questionnaire' | 'checkout' | 'success';

interface CartItem {
    product: Product;
    quantity: number;
    description?: string;
    tempId: string;
}

export default function Shop() {
  const { products, addOrder, orders, validateCoupon } = useData();
  const { role, currentCustomer } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<ShopStep>('list');
  const [activeTab, setActiveTab] = useState<'product' | 'service'>('product');
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // States para Pagamento Parcial no Checkout
  const [payMode, setPayMode] = useState<'total' | 'partial'>('total');
  const [partialValue, setPartialValue] = useState<string>('');

  // States para Cupom
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const filteredItems = products.filter(item => {
     const itemType = item.type || 'product';
     return itemType === activeTab && item.name.toLowerCase().includes(searchTerm.toLowerCase());
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
          if (sizeList.length > 0) {
              if (nameLower.includes('camisa')) qty = totalListItems;
              else if (nameLower.includes('replica') || nameLower.includes('réplica')) { unitPrice = 2.00; qty = totalListItems; }
          }
          const subtotal = unitPrice * qty;
          totalValue += subtotal;
          itemsPayload.push({ productId: item.product.id, productName: item.product.name, quantity: qty, unitPrice: unitPrice, total: subtotal, type: item.product.type });
      });

      const findServicePrice = (n: string, d: number) => {
          const s = products.find(p => p.name.toLowerCase().includes(n.toLowerCase()));
          return s ? s.price : d;
      };

      if (layoutOption === 'precisa') {
          const p = findServicePrice('layout simples', 30); totalValue += p;
          itemsPayload.push({ productId: 'service-layout', productName: 'Serviço: Criação de Layout', quantity: 1, unitPrice: p, total: p, type: 'service' });
      }
      if (moldOption === 'precisa') {
          const p = findServicePrice('molde', 50); totalValue += p;
          itemsPayload.push({ productId: 'service-mold', productName: 'Serviço: Criação de Molde', quantity: 1, unitPrice: p, total: p, type: 'service' });
      }
      return { items: itemsPayload, total: totalValue };
  };

  // Cálculo do total com desconto aplicado
  const calculateDiscountedTotal = () => {
      if (!lastCreatedOrder) return 0;
      const originalTotal = lastCreatedOrder.total;
      
      if (!appliedCoupon) return originalTotal;

      let discountAmount = 0;
      
      // Itera sobre os itens do pedido gerado
      // Se o pedido original tiver itens, usamos eles para calcular o desconto correto por tipo
      const orderItems = lastCreatedOrder.items || [];
      
      // Se não tiver items populados no lastCreatedOrder (apenas referência), usamos o cálculo do carrinho
      // mas `lastCreatedOrder` retornado pela API deve ter o total. 
      // Para aplicar cupom corretamente por tipo, precisamos dos items.
      // Se a API não retorna items detalhados na resposta do createOrder, assumimos proporcional ou 'all'.
      
      // Abordagem Simplificada: Se o cupom for 'all', aplica no total. 
      // Se for específico, precisamos filtrar. Vamos assumir que 'items' está disponível na resposta ou recalculamos baseado no cart state.
      // Como o usuário já está no passo checkout, o 'cart' state ainda reflete o pedido.
      
      const { items } = calculateFinalOrder(); // Recalcula baseado no estado atual do carrinho

      items.forEach(item => {
          if (appliedCoupon.type === 'all' || item.type === appliedCoupon.type) {
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

      if (coupon) {
          setAppliedCoupon(coupon);
      } else {
          setCouponError('Cupom inválido ou expirado.');
      }
  };

  const handleCreateOrder = async () => {
    if (role !== 'client' || !currentCustomer) return;
    setIsProcessing(true);
    try {
        const { items, total } = calculateFinalOrder();
        const orderData = {
            client_id: currentCustomer.id,
            description: cart.map(i => `${i.product.name} (x${i.quantity})`).join('; ') + (artLink ? `\nArte: ${artLink}` : ''),
            items: items,
            total: total,
            size_list: sizeList.length > 0 ? JSON.stringify(sizeList) : null,
            status: 'open', source: 'shop',
            order_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
        };
        const res = await addOrder(orderData);
        setLastCreatedOrder({ ...res, items }); // Guarda itens localmente para cálculo do cupom
        setPartialValue((total / 2).toFixed(2));
        setStep('checkout');
    } finally { setIsProcessing(false); }
  };

  const handlePayMercadoPago = async () => {
    if (!lastCreatedOrder) return;
    setIsProcessing(true);
    try {
        const discountedTotal = calculateDiscountedTotal();
        const finalAmount = payMode === 'total' ? discountedTotal : parseFloat(partialValue.replace(',', '.'));
        
        let title = payMode === 'partial' ? `[ENTRADA] Pedido #${lastCreatedOrder.order_number}` : `Pedido #${lastCreatedOrder.order_number} - Crazy Art`;
        if (appliedCoupon) {
            title += ` (Cupom: ${appliedCoupon.code})`;
        }

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

  const renderStepList = () => (
    <div className="animate-fade-in relative pb-24">
        <div className="flex flex-col items-center mb-10 space-y-6">
            <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-80 border border-zinc-800 shadow-xl">
                <button onClick={() => setActiveTab('product')} className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-widest transition ${activeTab === 'product' ? 'bg-white text-black' : 'text-zinc-500'}`}>PRODUTOS</button>
                <button onClick={() => setActiveTab('service')} className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-widest transition ${activeTab === 'service' ? 'bg-white text-black' : 'text-zinc-500'}`}>SERVIÇOS</button>
            </div>
            <div className="w-full max-w-md relative">
                <input type="text" placeholder={`Buscar na loja...`} className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-primary outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Search className="absolute left-3 top-3.5 text-zinc-600" size={20} />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
                <div key={item.id} onClick={() => openProduct(item)} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-primary/50 transition cursor-pointer">
                    <div className="h-56 bg-zinc-800 flex items-center justify-center relative">
                        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase">R$ {item.price.toFixed(2)}</div>
                    </div>
                    <div className="p-5"><h3 className="font-bold text-white">{item.name}</h3><p className="text-zinc-500 text-xs mt-1 line-clamp-2">{item.description || 'Clique para ver detalhes'}</p></div>
                </div>
            ))}
        </div>
        {cart.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md animate-fade-in-up">
                <div className="bg-zinc-900/90 backdrop-blur-md border border-primary/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">{cart.length}</div><div className="flex flex-col"><span className="text-white text-sm font-bold">Itens no Carrinho</span><span className="text-zinc-400 text-xs">R$ {calculateFinalOrder().total.toFixed(2)}</span></div></div>
                    <button onClick={() => setStep('questionnaire')} className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm">Ver Carrinho</button>
                </div>
            </div>
        )}
    </div>
  );

  const renderStepDetail = () => (
    <div className="animate-fade-in max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center">{viewingProduct?.imageUrl ? <img src={viewingProduct.imageUrl} className="w-full h-full object-cover" /> : <ShoppingBag size={120} className="text-zinc-800" />}</div>
        <div className="flex flex-col justify-center space-y-8">
            <div><span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase">{viewingProduct?.type === 'product' ? 'Produto' : 'Serviço'}</span><h2 className="text-4xl font-bold text-white mt-4">{viewingProduct?.name}</h2><p className="text-3xl font-black text-emerald-400 mt-2">R$ {viewingProduct?.price.toFixed(2)}</p></div>
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800"><h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Descrição</h4><p className="text-zinc-300 leading-relaxed mb-4">{viewingProduct?.description || 'Nenhum detalhe adicional.'}</p>
                <div className="flex items-center gap-4"><div className="flex items-center gap-2 bg-black rounded-xl p-2 border border-zinc-800"><button onClick={() => setCurrentOrderQty(Math.max(1, Number(currentOrderQty) - 1))} className="p-2 text-zinc-500"><Minus size={16} /></button><input type="number" value={currentOrderQty} onChange={(e) => setCurrentOrderQty(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-12 bg-transparent text-white text-center font-bold outline-none" /><button onClick={() => setCurrentOrderQty(Number(currentOrderQty) + 1)} className="p-2 text-zinc-500"><PlusIcon size={16} /></button></div><input type="text" placeholder="Obs. (Cor, Tamanho...)" className="flex-1 bg-black rounded-xl px-4 py-3 border border-zinc-800 text-white outline-none text-sm" value={currentOrderDesc} onChange={(e) => setCurrentOrderDesc(e.target.value)} /></div>
            </div>
            <button onClick={addToCart} className="w-full bg-crazy-gradient text-white py-5 rounded-2xl font-bold text-lg hover:scale-105 transition shadow-xl active:scale-95 flex items-center justify-center gap-3"><ShoppingCart size={24} /> ADICIONAR AO CARRINHO</button>
        </div>
    </div>
  );

  const renderStepQuestionnaire = () => {
      const calc = calculateFinalOrder();
      return (
        <div className="animate-fade-in max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl relative space-y-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3"><ListChecks className="text-primary" /> Revisar Pedido</h2>
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
                {calc.items.filter(i => i.productId !== 'service-layout' && i.productId !== 'service-mold').map((item, idx) => (
                    <div key={idx} className="p-4 flex justify-between items-center group"><div><p className="text-white font-bold text-sm">{item.productName} <span className="text-primary">x{item.quantity}</span></p></div><div className="flex items-center gap-4"><span className="text-emerald-400 font-mono text-sm">R$ {item.total.toFixed(2)}</span><button onClick={() => removeFromCart(cart[idx]?.tempId)} className="text-zinc-600 hover:text-red-500 transition"><Trash2 size={16} /></button></div></div>
                ))}
            </div>
            <div className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 transition"><div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${hasSizeList ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-500'}`}><Film size={24} /></div><div><h4 className="font-bold text-white">Lista de Produção?</h4><p className="text-xs text-zinc-500">Nomes, números e tamanhos.</p></div></div><button onClick={() => { setHasSizeList(!hasSizeList); if (!hasSizeList && sizeList.length === 0) addListRow(); }} className={`w-14 h-8 rounded-full transition relative flex items-center px-1 ${hasSizeList ? 'bg-primary' : 'bg-zinc-800'}`}><div className={`w-6 h-6 bg-white rounded-full transition ${hasSizeList ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div>
            {hasSizeList && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2"><span className="text-xs font-bold text-zinc-500 uppercase">Detalhes da Lista ({calculateTotalItemsInList()})</span><button onClick={toggleGlobalSimpleMode} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition ${isGlobalSimple ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}><span>Lista sem nomes</span>{isGlobalSimple ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button></div>
                    {sizeList.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 items-end">
                            <div className="sm:col-span-2"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Tipo</label><select value={item.category} onChange={(e) => updateListRow(item.id, 'category', e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white p-1.5 outline-none"><option value="unisex">Unisex</option><option value="feminina">Feminina</option><option value="infantil">Infantil</option></select></div>
                            <div className="sm:col-span-2"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Tam</label><select value={item.size} onChange={(e) => updateListRow(item.id, 'size', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white p-1.5 outline-none">{sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            {item.isSimple ? (<div className="sm:col-span-4"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Qtd</label><input type="number" min="1" value={item.quantity || 1} onChange={(e) => updateListRow(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-xs text-white font-mono text-center" /></div>) : (<><div className="sm:col-span-1"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Nº</label><input type="text" value={item.number} onChange={(e) => updateListRow(item.id, 'number', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-xs text-white font-mono text-center" /></div><div className="sm:col-span-3"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Nome</label><input type="text" value={item.name} onChange={(e) => updateListRow(item.id, 'name', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-xs text-white uppercase" /></div></>)}
                            <div className="sm:col-span-2"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Short</label><select value={item.shortSize} onChange={(e) => updateListRow(item.id, 'shortSize', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white p-1.5 outline-none"><option value="">-</option>{sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div className="sm:col-span-1"><label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">S.Nº</label><input type="text" value={item.shortNumber} onChange={(e) => updateListRow(item.id, 'shortNumber', e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-xs text-white font-mono text-center" /></div>
                            <div className="sm:col-span-1 flex items-end pb-0.5"><button onClick={() => removeListRow(item.id)} className="w-full p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition flex items-center justify-center"><Trash2 size={14} /></button></div>
                        </div>
                    ))}
                    <button onClick={addListRow} className="w-full mt-4 py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-primary transition flex items-center justify-center gap-2 font-bold uppercase text-[10px]"><PlusIcon size={14} /> Adicionar Integrante</button>
                </div>
            )}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800"><p className="text-xs font-bold text-zinc-500 uppercase mb-3">Tem Layout?</p><div className="flex gap-2"><button onClick={() => setLayoutOption('sim')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${layoutOption === 'sim' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Sim</button><button onClick={() => setLayoutOption('precisa')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${layoutOption === 'precisa' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Precisa Montar</button></div></div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800"><p className="text-xs font-bold text-zinc-500 uppercase mb-3">Tem Molde?</p><div className="flex gap-2"><button onClick={() => setMoldOption('sim')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${moldOption === 'sim' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Sim</button><button onClick={() => setMoldOption('precisa')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${moldOption === 'precisa' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>Precisa Montar</button></div></div>
                </div>
                {(layoutOption === 'sim' || moldOption === 'sim') && (
                    <div className="animate-fade-in"><label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Link dos Arquivos</label><div className="relative"><input type="text" placeholder="Cole o link aqui..." className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-primary transition" value={artLink} onChange={(e) => setArtLink(e.target.value)} /><Upload className="absolute left-3 top-3.5 text-zinc-600" size={16} /></div></div>
                )}
            </div>
            <div className="border-t border-zinc-800 pt-6 mt-6"><button onClick={() => setStep('list')} className="w-full mb-6 py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-primary transition flex items-center justify-center gap-3 font-bold uppercase text-xs"><PlusIcon size={18} /> Adicionar mais produto/serviço</button><div className="flex justify-between items-end mb-6"><span className="text-zinc-500 text-sm font-bold uppercase">Total Estimado</span><span className="text-3xl font-black text-white">R$ {calc.total.toFixed(2)}</span></div><button onClick={handleCreateOrder} disabled={isProcessing} className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-amber-600 transition shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">{isProcessing ? <Loader2 className="animate-spin" /> : <ChevronRight />} PROSSEGUIR PARA PAGAMENTO</button></div>
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
                    
                    {/* Área de Cupom */}
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

                    {/* OPÇÃO DE PAGAMENTO PARCIAL (CASO > 50) */}
                    {discountedTotal > 50 && (
                        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2"><Coins size={14} /> Opção de Pagamento</h3>
                                <div className="flex bg-zinc-900 p-1 rounded-lg">
                                    <button onClick={() => setPayMode('total')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition ${payMode === 'total' ? 'bg-primary text-white' : 'text-zinc-500'}`}>TOTAL</button>
                                    <button onClick={() => setPayMode('partial')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition ${payMode === 'partial' ? 'bg-primary text-white' : 'text-zinc-500'}`}>PARCIAL</button>
                                </div>
                            </div>
                            
                            {payMode === 'partial' ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] text-zinc-500 leading-tight">Como o pedido é superior a R$ 50, você pode pagar apenas uma entrada agora para confirmar a produção.</p>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                                        <input 
                                            type="text" 
                                            className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white font-mono focus:border-primary outline-none"
                                            value={partialValue}
                                            onChange={(e) => setPartialValue(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] text-zinc-500 italic">Pagamento integral para quitação imediata.</p>
                            )}
                        </div>
                    )}

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
                                {payMode === 'partial' ? `PAGAR ENTRADA` : `PAGAR AGORA`}
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
        <div className="flex items-center space-x-4"><button onClick={() => step === 'detail' ? setStep('list') : step === 'questionnaire' ? setStep('list') : step === 'checkout' ? setStep('questionnaire') : navigate('/')} className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-full transition hover:scale-110 active:scale-95"><ArrowLeft size={24} /></button><div className="flex items-center space-x-3"><div className="bg-primary/10 p-2 rounded-lg"><ShoppingBag className="text-primary" size={24} /></div><h1 className="text-3xl font-bold text-white tracking-tight font-heading">{step === 'list' ? 'Loja Crazy Art' : step === 'detail' ? 'Produto' : step === 'questionnaire' ? 'Detalhar Pedido' : 'Finalizar Pedido'}</h1></div></div>
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
