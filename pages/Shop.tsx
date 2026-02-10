
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingBag, Wrench, Search, ShoppingCart, 
  CheckCircle, AlertOctagon, Send, X, Trash2, Minus, 
  Plus as PlusIcon, CreditCard, Loader2, MessageCircle, 
  Lock, UserPlus, ChevronRight, ListChecks, Upload, 
  Info, AlertTriangle, Wallet, Check, Film, FileText, Layers, Hash, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, Order, SizeListItem } from '../types';
import { api } from '../src/services/api';

type ShopStep = 'list' | 'detail' | 'questionnaire' | 'checkout' | 'success';

interface CartItem {
    product: Product;
    quantity: number;
    description?: string;
    tempId: string;
}

export default function Shop() {
  const { products, addOrder, orders } = useData();
  const { role, currentCustomer } = useAuth();
  const navigate = useNavigate();

  // Estados de Fluxo
  const [step, setStep] = useState<ShopStep>('list');
  const [activeTab, setActiveTab] = useState<'product' | 'service'>('product');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Carrinho e Seleção Atual
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  
  // Detalhes do Produto Atual (Sendo adicionado)
  const [currentOrderDesc, setCurrentOrderDesc] = useState('');
  const [currentOrderQty, setCurrentOrderQty] = useState<number | string>(1);

  // Estados do Formulário Geral (Aplicados ao pedido como um todo)
  const [hasSizeList, setHasSizeList] = useState(false);
  const [sizeList, setSizeList] = useState<SizeListItem[]>([]);
  const [isGlobalSimple, setIsGlobalSimple] = useState(false); // Estado para controlar o modo da lista globalmente
  
  // Novas Opções de Produção
  const [layoutOption, setLayoutOption] = useState<'sim' | 'precisa' | null>(null);
  const [moldOption, setMoldOption] = useState<'sim' | 'precisa' | null>(null);
  const [artLink, setArtLink] = useState('');

  // Estados do Checkout
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- Helpers e Dados ---

  const filteredItems = products.filter(item => {
     const itemType = item.type || 'product';
     const matchesTab = itemType === activeTab;
     const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
     return matchesTab && matchesSearch;
  });

  const recommendations = useMemo(() => {
    if (!viewingProduct) return [];
    return products
      .filter(p => p.id !== viewingProduct.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  }, [viewingProduct, products]);

  const sizes = {
    unisex: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'],
    feminina: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1'],
    infantil: ['RN', '2', '4', '6', '8', '10', '12', '14', '16']
  };

  // --- Ações de Navegação e Carrinho ---

  const openProduct = (product: Product) => {
    setViewingProduct(product);
    setCurrentOrderQty(1);
    setCurrentOrderDesc('');
    setStep('detail');
    window.scrollTo(0, 0);
  };

  const addToCart = () => {
      if (!viewingProduct) return;
      const qty = Number(currentOrderQty) || 1; 
      
      const newItem: CartItem = {
          product: viewingProduct,
          quantity: qty,
          description: currentOrderDesc,
          tempId: crypto.randomUUID()
      };
      setCart(prev => [...prev, newItem]);
      setViewingProduct(null);
      setStep('list'); // Volta para a lista para continuar comprando (o user verá o float bar)
  };

  const removeFromCart = (tempId: string) => {
      setCart(prev => prev.filter(item => item.tempId !== tempId));
      if (cart.length <= 1 && step === 'questionnaire') { 
          // Se esvaziar o carrinho, volta pra loja
          setStep('list');
      }
  };

  const goBack = () => {
    if (step === 'detail') setStep('list');
    else if (step === 'questionnaire') {
        setStep('list');
    }
    else if (step === 'checkout') setStep('questionnaire');
    else navigate('/');
  };

  // --- Lógica da Lista de Tamanhos ---

  const toggleGlobalSimpleMode = () => {
      const newValue = !isGlobalSimple;
      setIsGlobalSimple(newValue);
      
      // Atualiza todos os itens existentes para o novo modo
      setSizeList(prev => prev.map(item => ({
          ...item,
          isSimple: newValue,
          quantity: newValue ? (item.quantity || 1) : 1,
          name: newValue ? '' : item.name, // Limpa nome se for para simples, ou mantém se voltar
          number: newValue ? '' : item.number
      })));
  };

  const addListRow = () => {
    const newItem: SizeListItem = {
      id: crypto.randomUUID(),
      category: 'unisex',
      size: 'M',
      number: '',
      name: '',
      shortSize: 'M',
      shortNumber: '',
      quantity: 1,
      isSimple: isGlobalSimple // Usa o estado global ao criar
    };
    setSizeList([...sizeList, newItem]);
  };

  const updateListRow = (id: string, field: keyof SizeListItem, value: any) => {
    setSizeList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeListRow = (id: string) => {
    setSizeList(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotalItemsInList = () => {
      return sizeList.reduce((acc, item) => acc + (item.quantity || 1), 0);
  };

  // --- Lógica de Cálculo de Preço (REGRA DE NEGÓCIO DA LISTA) ---

  const calculateFinalOrder = () => {
      const itemsPayload: any[] = [];
      let totalValue = 0;
      
      const totalListItems = calculateTotalItemsInList();

      // 1. Itens do Carrinho
      cart.forEach(item => {
          let unitPrice = item.product.price;
          let qty = item.quantity;
          const nameLower = item.product.name.toLowerCase();

          // LÓGICA ESPECÍFICA DE LISTA
          if (sizeList.length > 0) {
              // Regra 1: Camisas (PV ou Dry Fit) pegam a quantidade da lista
              if (nameLower.includes('camisa')) {
                  qty = totalListItems;
              }
              // Regra 2: Réplica de Molde vira R$ 2,00 por item da lista
              else if (nameLower.includes('replica') || nameLower.includes('réplica')) {
                  unitPrice = 2.00;
                  qty = totalListItems;
              }
          }

          const subtotal = unitPrice * qty;
          totalValue += subtotal;

          itemsPayload.push({
              productId: item.product.id,
              productName: item.product.name,
              quantity: qty,
              unitPrice: unitPrice,
              total: subtotal,
              type: item.product.type
          });
      });

      // 2. Serviços Adicionais (Layout/Molde) - PREÇOS FIXOS
      const findServicePrice = (namePart: string, defaultPrice: number) => {
          const service = products.find(p => p.name.toLowerCase().includes(namePart.toLowerCase()));
          return service ? service.price : defaultPrice;
      };

      if (layoutOption === 'precisa') {
          const price = findServicePrice('layout simples', 30.00); 
          totalValue += price;
          itemsPayload.push({
              productId: 'service-layout',
              productName: 'Serviço: Criação de Layout',
              quantity: 1,
              unitPrice: price,
              total: price,
              type: 'service'
          });
      }

      if (moldOption === 'precisa') {
          const price = findServicePrice('molde', 50.00); 
          totalValue += price;
          itemsPayload.push({
              productId: 'service-mold',
              productName: 'Serviço: Criação de Molde',
              quantity: 1,
              unitPrice: price,
              total: price,
              type: 'service'
          });
      }

      return { items: itemsPayload, total: totalValue };
  };

  const handleCreateOrder = async () => {
    if (role !== 'client' || !currentCustomer) {
        setNotification({ message: 'Faça login para continuar.', type: 'error' });
        return;
    }

    if (cart.length === 0) return;

    // Ordena a lista antes de salvar
    const orderMap = { unisex: 1, feminina: 2, infantil: 3 };
    const sortedList = [...sizeList].sort((a, b) => orderMap[a.category] - orderMap[b.category]);

    setIsProcessing(true);
    try {
        const { items, total } = calculateFinalOrder();
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        // Monta descrição combinada
        let fullDesc = cart.map(i => `${i.product.name} (x${i.quantity})` + (i.description ? `: ${i.description}` : '')).join('; ');
        if (artLink) fullDesc += `\nLink da Arte: ${artLink}`;
        if (layoutOption === 'precisa') fullDesc += `\n[Precisa de Layout]`;
        if (moldOption === 'precisa') fullDesc += `\n[Precisa de Molde]`;

        const orderData = {
            client_id: currentCustomer.id,
            description: fullDesc,
            items: items,
            total: total,
            size_list: sortedList.length > 0 ? JSON.stringify(sortedList) : null,
            status: 'open',
            source: 'shop',
            order_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
        };

        const res = await addOrder(orderData);
        setLastCreatedOrder(res);
        setStep('checkout');
    } catch (e: any) {
        setNotification({ message: 'Erro ao criar pedido: ' + e.message, type: 'error' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePayMercadoPago = async () => {
    if (!lastCreatedOrder) return;
    setIsProcessing(true);
    try {
        const res = await api.createPayment({
            orderId: lastCreatedOrder.id,
            title: `Pedido #${lastCreatedOrder.order_number} - Crazy Art`,
            amount: lastCreatedOrder.total,
            payerEmail: currentCustomer?.email,
            payerName: currentCustomer?.name
        });
        
        if (res?.init_point) {
            window.open(res.init_point, '_blank');
            setStep('success');
        }
    } catch (e: any) {
        alert(e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAddToAccount = async () => {
    if (!lastCreatedOrder) return;
    setStep('success');
  };

  const canAddToAccount = useMemo(() => {
    if (!currentCustomer || !lastCreatedOrder) return false;
    
    // Verifica se TODOS os itens são serviços
    const { items } = calculateFinalOrder(); // Recalcula para garantir
    const allServices = items.every(i => i.type === 'service');
    
    const openOrders = orders.filter(o => o.client_id === currentCustomer.id && o.status === 'open' && o.id !== lastCreatedOrder.id);
    const usedCredit = openOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    const hasCredit = (currentCustomer.creditLimit || 0) >= (usedCredit + lastCreatedOrder.total);

    return allServices && hasCredit;
  }, [currentCustomer, lastCreatedOrder, orders, cart, layoutOption, moldOption]); 

  // --- Renderizadores ---

  const renderStepList = () => (
    <div className="animate-fade-in relative pb-24">
        {/* Barra de Busca e Abas */}
        <div className="flex flex-col items-center mb-10 space-y-6">
            <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-80 border border-zinc-800 shadow-xl relative">
                <button onClick={() => setActiveTab('product')} className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'product' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>
                    <ShoppingBag size={14} /> PRODUTOS
                </button>
                <button onClick={() => setActiveTab('service')} className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'service' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>
                    <Wrench size={14} /> SERVIÇOS
                </button>
            </div>
            <div className="w-full max-w-md relative">
                <input type="text" placeholder={`Buscar na loja...`} className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-primary outline-none transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Search className="absolute left-3 top-3.5 text-zinc-600" size={20} />
            </div>
        </div>

        {/* Grid de Produtos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
                <div key={item.id} onClick={() => openProduct(item)} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all group cursor-pointer shadow-lg hover:-translate-y-1">
                    <div className="h-56 bg-zinc-800 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                            {item.type === 'product' ? <ShoppingBag size={48} /> : <Wrench size={48} />}
                        </div>
                        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition duration-700 group-hover:scale-110 relative z-10" onError={(e) => e.currentTarget.style.display = 'none'} />}
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/5 z-20">
                            R$ {item.price.toFixed(2)}
                        </div>
                    </div>
                    <div className="p-5">
                        <h3 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                        <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{item.description || 'Clique para ver detalhes'}</p>
                    </div>
                </div>
            ))}
        </div>

        {/* BARRA FLUTUANTE DE CARRINHO - Só aparece se tiver itens */}
        {cart.length > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-md animate-fade-in-up">
                <div className="bg-zinc-900/90 backdrop-blur-md border border-primary/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between ring-1 ring-white/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg">
                            {cart.length}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white text-sm font-bold">Itens no Carrinho</span>
                            <span className="text-zinc-400 text-xs">Total aprox: R$ {calculateFinalOrder().total.toFixed(2)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setStep('questionnaire')}
                        className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition shadow-lg flex items-center gap-2"
                    >
                        Ver Carrinho <ArrowLeft className="rotate-180" size={16} />
                    </button>
                </div>
            </div>
        )}
    </div>
  );

  const renderStepDetail = () => (
    <div className="animate-fade-in max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center shadow-2xl relative group">
                {viewingProduct?.imageUrl ? (
                    <img src={viewingProduct.imageUrl} className="w-full h-full object-cover" alt={viewingProduct.name} />
                ) : (
                    <ShoppingBag size={120} className="text-zinc-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            
            <div className="flex flex-col justify-center space-y-8">
                <div>
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-primary/20">{viewingProduct?.type === 'product' ? 'Produto' : 'Serviço'}</span>
                    <h2 className="text-4xl font-bold text-white mt-4 font-heading">{viewingProduct?.name}</h2>
                    <p className="text-3xl font-black text-emerald-400 mt-2">R$ {viewingProduct?.price.toFixed(2)}</p>
                </div>
                
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Descrição</h4>
                    <p className="text-zinc-300 leading-relaxed mb-4">{viewingProduct?.description || 'Nenhuma descrição adicional disponível para este item.'}</p>
                    
                    {/* Campos de Quantidade e Observação do Item */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2 bg-black rounded-xl p-2 border border-zinc-800">
                            <button onClick={() => setCurrentOrderQty(Math.max(1, Number(currentOrderQty) - 1))} className="p-2 text-zinc-500 hover:text-white transition"><Minus size={16} /></button>
                            <input 
                                type="number" 
                                value={currentOrderQty} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCurrentOrderQty(val === '' ? '' : parseInt(val));
                                }}
                                className="w-12 bg-transparent text-white text-center font-bold outline-none appearance-none"
                            />
                            <button onClick={() => setCurrentOrderQty(Number(currentOrderQty) + 1)} className="p-2 text-zinc-500 hover:text-white transition"><PlusIcon size={16} /></button>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Obs. (Cor, Tamanho...)" 
                            className="flex-1 bg-black rounded-xl px-4 py-3 border border-zinc-800 text-white focus:border-primary outline-none text-sm"
                            value={currentOrderDesc}
                            onChange={(e) => setCurrentOrderDesc(e.target.value)}
                        />
                    </div>
                </div>

                <button onClick={addToCart} className="w-full bg-crazy-gradient text-white py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95">
                    <ShoppingCart size={24} /> ADICIONAR AO CARRINHO
                </button>
            </div>
        </div>
    </div>
  );

  const renderStepQuestionnaire = () => {
      // Calcular prévia do total usando a lógica atualizada
      const calc = calculateFinalOrder();
      
      return (
        <div className="animate-fade-in max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl relative">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <ListChecks className="text-primary" /> Revisar Pedido
            </h2>
            
            <div className="space-y-8">
                
                {/* 1. Lista de Itens no Carrinho (Com Preview da Lógica da Lista) */}
                <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
                    <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Itens Selecionados</span>
                    </div>
                    <div className="divide-y divide-zinc-800">
                        {calc.items.filter(i => i.productId !== 'service-layout' && i.productId !== 'service-mold').map((item, idx) => (
                            <div key={idx} className="p-4 flex justify-between items-center group">
                                <div>
                                    <p className="text-white font-bold text-sm">{item.productName} <span className="text-primary">x{item.quantity}</span></p>
                                    {/* Feedback visual se a quantidade foi alterada pela lista */}
                                    {sizeList.length > 0 && item.productName.toLowerCase().includes('camisa') && (
                                        <p className="text-[10px] text-zinc-500 italic mt-0.5">Qtd atualizada pela lista de nomes ({calculateTotalItemsInList()})</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-emerald-400 font-mono text-sm">R$ {item.total.toFixed(2)}</span>
                                    {/* Botão de remover busca pelo item original no carrinho */}
                                    <button onClick={() => removeFromCart(cart[idx]?.tempId)} className="text-zinc-600 hover:text-red-500 transition"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Toggle Lista de Produção */}
                <div className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 group hover:border-zinc-700 transition">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl transition ${hasSizeList ? 'bg-primary text-white shadow-glow' : 'bg-zinc-800 text-zinc-500'}`}>
                            <Film size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white">Lista de Produção?</h4>
                            <p className="text-xs text-zinc-500">Nomes, números e tamanhos.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => { 
                            setHasSizeList(!hasSizeList); 
                            // Se estiver ativando, cria uma linha inicial se vazia
                            if (!hasSizeList && sizeList.length === 0) {
                                addListRow();
                            }
                        }}
                        className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 ${hasSizeList ? 'bg-primary' : 'bg-zinc-800'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-lg ${hasSizeList ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                {/* 2.1 Editor de Lista Embutido */}
                {hasSizeList && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 animate-fade-in relative shadow-inner">
                        {/* Global Mode Toggle Header */}
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <ListChecks size={14} /> Detalhes da Lista ({calculateTotalItemsInList()})
                            </span>
                            <button 
                                onClick={toggleGlobalSimpleMode}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border text-[10px] font-bold uppercase tracking-wider ${isGlobalSimple ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}
                            >
                                <span>Lista sem nomes (Apenas Quantidade)</span>
                                {isGlobalSimple ? <ToggleRight size={18} className="text-primary" /> : <ToggleLeft size={18} />}
                            </button>
                        </div>

                        {/* List Rows */}
                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {sizeList.length === 0 && (
                                <p className="text-center text-zinc-600 text-xs py-4">Nenhum item na lista. Adicione abaixo.</p>
                            )}
                            
                            {sizeList.map((item, idx) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 items-end">
                                    {/* Categoria */}
                                    <div className="col-span-4 sm:col-span-2">
                                        <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Tipo</label>
                                        <select 
                                            value={item.category} 
                                            onChange={(e) => updateListRow(item.id, 'category', e.target.value as any)}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-1 py-1.5 text-xs text-white outline-none focus:border-primary"
                                        >
                                            <option value="unisex">Uni</option>
                                            <option value="feminina">Fem</option>
                                            <option value="infantil">Inf</option>
                                        </select>
                                    </div>
                                    
                                    {/* Tamanho */}
                                    <div className="col-span-4 sm:col-span-2">
                                        <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Tam</label>
                                        <select 
                                            value={item.size} 
                                            onChange={(e) => updateListRow(item.id, 'size', e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-1 py-1.5 text-xs text-white outline-none focus:border-primary"
                                        >
                                            {sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    
                                    {/* Campos Dinâmicos (Simples vs Completo) */}
                                    {item.isSimple ? (
                                        <div className="col-span-2 sm:col-span-4">
                                            <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Qtd</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={item.quantity || 1} 
                                                onChange={(e) => updateListRow(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-1 py-1.5 text-xs text-white outline-none focus:border-primary font-mono text-center" 
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="col-span-4 sm:col-span-1">
                                                <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Nº</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="00" 
                                                    value={item.number} 
                                                    onChange={(e) => updateListRow(item.id, 'number', e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-1 py-1.5 text-xs text-white outline-none focus:border-primary text-center font-mono" 
                                                />
                                            </div>
                                            <div className="col-span-12 sm:col-span-3">
                                                <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Nome</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="NOME" 
                                                    value={item.name} 
                                                    onChange={(e) => updateListRow(item.id, 'name', e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-2 pr-2 py-1.5 text-xs text-white outline-none focus:border-primary uppercase" 
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Shorts Opcionais */}
                                    <div className="col-span-5 sm:col-span-2">
                                        <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Short</label>
                                        <select 
                                            value={item.shortSize} 
                                            onChange={(e) => updateListRow(item.id, 'shortSize', e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-1 py-1.5 text-xs text-white outline-none focus:border-primary"
                                        >
                                            <option value="">-</option>
                                            {sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="col-span-5 sm:col-span-1">
                                        <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">S.Nº</label>
                                        <input 
                                            type="text" 
                                            placeholder="00" 
                                            value={item.shortNumber} 
                                            onChange={(e) => updateListRow(item.id, 'shortNumber', e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-1 py-1.5 text-xs text-white outline-none focus:border-primary text-center font-mono" 
                                        />
                                    </div>

                                    {/* Delete Button */}
                                    <div className="col-span-2 sm:col-span-1 flex items-end h-full pb-0.5">
                                        <button onClick={() => removeListRow(item.id)} className="w-full p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition flex items-center justify-center"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={addListRow} className="w-full mt-4 py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-primary hover:border-primary/50 transition flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-[10px]">
                            <PlusIcon size={14} /> Adicionar Integrante
                        </button>
                    </div>
                )}

                {/* 3. Opções de Produção */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Layout Option */}
                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Seu pedido tem Layout?</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setLayoutOption('sim')} 
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${layoutOption === 'sim' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                                >Sim</button>
                                <button 
                                    onClick={() => setLayoutOption('precisa')} 
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${layoutOption === 'precisa' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                                >Precisa Montar</button>
                            </div>
                        </div>

                        {/* Mold Option */}
                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Seu pedido tem Molde?</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setMoldOption('sim')} 
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${moldOption === 'sim' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                                >Sim</button>
                                <button 
                                    onClick={() => setMoldOption('precisa')} 
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${moldOption === 'precisa' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                                >Precisa Montar</button>
                            </div>
                        </div>
                    </div>

                    {(layoutOption === 'sim' || moldOption === 'sim') && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Link dos Arquivos (Drive/Nuvem)</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Cole o link aqui..." 
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition"
                                    value={artLink}
                                    onChange={(e) => setArtLink(e.target.value)}
                                />
                                <Upload className="absolute left-3 top-3.5 text-zinc-600" size={16} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-zinc-800 pt-6 mt-6">
                    <button onClick={() => setStep('list')} className="w-full mb-6 py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-primary hover:border-primary/50 transition flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs">
                        <PlusIcon size={18} /> Adicionar mais produto/serviço
                    </button>

                    <div className="flex justify-between items-end mb-6">
                        <span className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Total Estimado</span>
                        <span className="text-3xl font-black text-white">R$ {calc.total.toFixed(2)}</span>
                    </div>

                    <button 
                        onClick={handleCreateOrder}
                        disabled={isProcessing}
                        className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-amber-600 transition shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <ChevronRight />} 
                        PROSSEGUIR PARA PAGAMENTO
                    </button>
                </div>
            </div>
        </div>
      );
  };

  const renderStepCheckout = () => {
    return (
        <div className="animate-fade-in max-w-xl mx-auto">
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
                    
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-white">Total a Pagar</span>
                        <span className="text-2xl font-black text-emerald-400 font-mono">R$ {lastCreatedOrder?.total.toFixed(2)}</span>
                    </div>

                    <div className="pt-6 space-y-4">
                        <div className={canAddToAccount ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
                            {canAddToAccount && (
                                <button 
                                    onClick={handleAddToAccount}
                                    className="w-full bg-zinc-100 text-black py-4 rounded-2xl font-bold hover:bg-white transition flex items-center justify-center gap-3 shadow-xl active:scale-95 text-xs sm:text-sm uppercase tracking-wider"
                                >
                                    <Wallet size={18} /> Adicionar à Conta
                                </button>
                            )}
                            
                            <button 
                                onClick={handlePayMercadoPago}
                                disabled={isProcessing}
                                className={`w-full bg-blue-600 text-white rounded-2xl font-black transition flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 active:scale-95 ${canAddToAccount ? 'py-4 text-xs sm:text-sm' : 'py-5 text-lg'}`}
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard size={canAddToAccount ? 18 : 24} />} 
                                {canAddToAccount ? "PAGAR AGORA" : "PAGAR COM PIX / CARTÃO"}
                            </button>
                        </div>
                        
                        <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest leading-relaxed">
                            {canAddToAccount 
                                ? "Você possui limite disponível para este serviço. Você pode escolher pagar agora via PIX/Cartão ou faturar para o fechamento da sua conta." 
                                : "Para este pedido (produto ou falta de crédito), é necessário o pagamento imediato para confirmação."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const renderStepSuccess = () => (
    <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-8 ring-8 ring-emerald-500/5">
            <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-4xl font-bold text-white mb-4 font-heading">Pedido Confirmado!</h2>
        <p className="text-zinc-400 mb-10 leading-relaxed">
            Seu pedido <strong>#{lastCreatedOrder?.order_number}</strong> foi recebido e já está em nossa fila de processamento.
        </p>
        <div className="grid grid-cols-1 w-full gap-4">
            <button onClick={() => navigate('/my-area')} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-zinc-200 transition">Ver Meus Pedidos</button>
            <button onClick={() => window.open(`https://wa.me/5516994142665?text=Olá, acabei de fazer o pedido #${lastCreatedOrder?.order_number}`, '_blank')} className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                <MessageCircle size={20} /> Enviar no WhatsApp
            </button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-text p-6 pb-32 relative">
      
      {/* HEADER DINÂMICO */}
      <div className="max-w-7xl mx-auto mb-12 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={goBack} className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-full transition hover:scale-110 active:scale-95">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center space-x-3">
             <div className="bg-primary/10 p-2 rounded-lg">
                <ShoppingBag className="text-primary" size={24} />
             </div>
             <h1 className="text-3xl font-bold text-white tracking-tight font-heading">
                {step === 'list' ? 'Loja Crazy Art' : step === 'detail' ? 'Produto' : step === 'questionnaire' ? 'Detalhar Pedido' : 'Finalizar Pedido'}
             </h1>
          </div>
        </div>
        
        {role === 'client' && currentCustomer && (
             <div className="hidden sm:flex bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-zinc-400">Logado como <span className="text-white font-bold">{currentCustomer.name.split(' ')[0]}</span></span>
             </div>
        )}
      </div>

      {/* CONTEÚDO BASEADO NO STEP */}
      <div className="max-w-7xl mx-auto">
          {role === 'guest' ? (
              <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-3xl max-w-lg text-center relative overflow-hidden shadow-2xl">
                      <div className="relative z-10 flex flex-col items-center">
                          <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 ring-4 ring-zinc-900 shadow-xl">
                              <Lock className="text-primary" size={40} />
                          </div>
                          <p className="text-zinc-300 mb-8 leading-relaxed text-lg font-medium">Faça login para acessar nossa loja exclusiva e realizar seus pedidos.</p>
                          <Link to="/?action=login" className="bg-crazy-gradient text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition shadow-lg w-full flex items-center justify-center gap-3"><UserPlus size={20} /> Acessar ou Cadastrar</Link>
                      </div>
                  </div>
              </div>
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
