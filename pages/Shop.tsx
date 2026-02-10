
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingBag, Wrench, Search, ShoppingCart, 
  CheckCircle, AlertOctagon, Send, X, Trash2, Minus, 
  Plus as PlusIcon, CreditCard, Loader2, MessageCircle, 
  Lock, UserPlus, ChevronRight, ListChecks, Upload, 
  Info, AlertTriangle, Wallet, Check, Film
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, Order, SizeListItem } from '../types';
import { api } from '../src/services/api';

type ShopStep = 'list' | 'detail' | 'questionnaire' | 'checkout' | 'success';

export default function Shop() {
  const { products, addOrder, orders, deleteProduct } = useData();
  const { role, currentCustomer } = useAuth();
  const navigate = useNavigate();

  // Estados de Fluxo
  const [step, setStep] = useState<ShopStep>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'product' | 'service'>('product');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados do Formulário de Pedido
  const [orderDescription, setOrderDescription] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [hasSizeList, setHasSizeList] = useState(false);
  const [sizeList, setSizeList] = useState<SizeListItem[]>([]);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  
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
    if (!selectedProduct) return [];
    return products
      .filter(p => p.id !== selectedProduct.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  }, [selectedProduct, products]);

  const sizes = {
    unisex: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'],
    feminina: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1'],
    infantil: ['RN', '2', '4', '6', '8', '10', '12', '14', '16']
  };

  // --- Ações de Navegação ---

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setOrderQuantity(1);
    setOrderDescription('');
    setHasSizeList(false);
    setSizeList([]);
    setStep('detail');
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (step === 'detail') setStep('list');
    else if (step === 'questionnaire') setStep('detail');
    else if (step === 'checkout') setStep('questionnaire');
    else navigate('/');
  };

  // --- Lógica da Lista de Tamanhos ---

  const addListRow = () => {
    const newItem: SizeListItem = {
      id: crypto.randomUUID(),
      category: 'unisex',
      size: 'M',
      number: '',
      name: '',
      shortSize: 'M',
      shortNumber: ''
    };
    setSizeList([...sizeList, newItem]);
  };

  const updateListRow = (id: string, field: keyof SizeListItem, value: string) => {
    setSizeList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeListRow = (id: string) => {
    setSizeList(prev => prev.filter(item => item.id !== id));
  };

  const finalizeList = () => {
    // Ordenar a lista: Unisex -> Feminina -> Infantil
    const orderMap = { unisex: 1, feminina: 2, infantil: 3 };
    const sorted = [...sizeList].sort((a, b) => orderMap[a.category] - orderMap[b.category]);
    setSizeList(sorted);
    setOrderQuantity(sorted.length > 0 ? sorted.length : orderQuantity);
    setIsListModalOpen(false);
  };

  // --- Lógica de Checkout ---

  const handleCreateOrder = async () => {
    if (role !== 'client' || !currentCustomer || !selectedProduct) {
        setNotification({ message: 'Faça login para continuar.', type: 'error' });
        return;
    }

    setIsProcessing(true);
    try {
        const total = selectedProduct.price * orderQuantity;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const orderData = {
            client_id: currentCustomer.id,
            description: orderDescription || `Pedido: ${selectedProduct.name}`,
            items: [{
                productId: selectedProduct.id,
                productName: selectedProduct.name,
                quantity: orderQuantity,
                unitPrice: selectedProduct.price,
                total: total,
                type: selectedProduct.type
            }],
            total: total,
            size_list: sizeList.length > 0 ? JSON.stringify(sizeList) : null,
            status: 'open',
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
        if (res?.init_point) window.location.href = res.init_point;
    } catch (e: any) {
        alert(e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAddToAccount = async () => {
    if (!lastCreatedOrder) return;
    // O pedido já é criado como 'open', então apenas confirmamos o sucesso visualmente
    setStep('success');
  };

  // Verificação de Crédito e Tipo de Item para Step 4
  const canAddToAccount = useMemo(() => {
    if (!currentCustomer || !lastCreatedOrder) return false;
    const isService = selectedProduct?.type === 'service';
    
    // Crédito disponível
    const openOrders = orders.filter(o => o.client_id === currentCustomer.id && o.status === 'open' && o.id !== lastCreatedOrder.id);
    const usedCredit = openOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    const hasCredit = (currentCustomer.creditLimit || 0) >= (usedCredit + lastCreatedOrder.total);

    return isService && hasCredit;
  }, [currentCustomer, lastCreatedOrder, orders, selectedProduct]);

  // --- Renderizadores de Etapa ---

  const renderStepList = () => (
    <div className="animate-fade-in">
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
    </div>
  );

  const renderStepDetail = () => (
    <div className="animate-fade-in max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center shadow-2xl relative group">
                {selectedProduct?.imageUrl ? (
                    <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" alt={selectedProduct.name} />
                ) : (
                    <ShoppingBag size={120} className="text-zinc-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            
            <div className="flex flex-col justify-center space-y-8">
                <div>
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-primary/20">{selectedProduct?.type === 'product' ? 'Produto' : 'Serviço'}</span>
                    <h2 className="text-4xl font-bold text-white mt-4 font-heading">{selectedProduct?.name}</h2>
                    <p className="text-3xl font-black text-emerald-400 mt-2">R$ {selectedProduct?.price.toFixed(2)}</p>
                </div>
                
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Descrição</h4>
                    <p className="text-zinc-300 leading-relaxed">{selectedProduct?.description || 'Nenhuma descrição adicional disponível para este item.'}</p>
                </div>

                <button onClick={() => setStep('questionnaire')} className="w-full bg-crazy-gradient text-white py-5 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95">
                    <ShoppingCart size={24} /> FAZER PEDIDO
                </button>
            </div>
        </div>

        {/* Recomendações */}
        <div className="mt-24">
            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                <PlusIcon className="text-primary" /> Sugestões para você
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {recommendations.map(p => (
                    <div key={p.id} onClick={() => openProduct(p)} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl hover:border-zinc-600 transition cursor-pointer flex items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-800 rounded-xl overflow-hidden shrink-0">
                            {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />}
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-white font-bold text-sm truncate">{p.name}</h4>
                            <p className="text-primary font-mono text-xs">R$ {p.price.toFixed(2)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const renderStepQuestionnaire = () => (
    <div className="animate-fade-in max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <ListChecks className="text-primary" /> Questionário do Pedido
        </h2>
        
        <div className="space-y-8">
            <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 ml-1">Detalhes do Pedido</label>
                <textarea 
                    className="w-full bg-black/40 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none transition min-h-[120px]" 
                    placeholder="Descreva detalhes como cores, referências ou observações específicas..."
                    value={orderDescription}
                    onChange={(e) => setOrderDescription(e.target.value)}
                />
            </div>

            <div className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 group hover:border-zinc-700 transition">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition ${hasSizeList ? 'bg-primary text-white shadow-glow' : 'bg-zinc-800 text-zinc-500'}`}>
                        {/* Fix: Added missing 'Film' import from lucide-react above */}
                        <Film size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-white">O pedido terá lista?</h4>
                        <p className="text-xs text-zinc-500">Nomes, números e tamanhos específicos.</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setHasSizeList(!hasSizeList); if(!hasSizeList) setIsListModalOpen(true); }}
                    className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 ${hasSizeList ? 'bg-primary' : 'bg-zinc-800'}`}
                >
                    <div className={`w-6 h-6 bg-white rounded-full transition-transform shadow-lg ${hasSizeList ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
            </div>

            {hasSizeList && sizeList.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 text-emerald-400">
                        <CheckCircle size={20} />
                        <span className="text-sm font-bold">Lista configurada ({sizeList.length} itens)</span>
                    </div>
                    <button onClick={() => setIsListModalOpen(true)} className="text-xs font-bold text-zinc-400 hover:text-white underline">Editar lista</button>
                </div>
            )}

            {!hasSizeList && (
                <div className="flex items-center justify-between bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Quantidade</span>
                    <div className="flex items-center gap-6 bg-black rounded-xl p-2 border border-zinc-800">
                        <button onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))} className="p-2 text-zinc-500 hover:text-white transition"><Minus size={20} /></button>
                        <span className="text-xl font-bold text-white w-8 text-center">{orderQuantity}</span>
                        <button onClick={() => setOrderQuantity(orderQuantity + 1)} className="p-2 text-zinc-500 hover:text-white transition"><PlusIcon size={20} /></button>
                    </div>
                </div>
            )}

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
  );

  const renderStepCheckout = () => (
    <div className="animate-fade-in max-w-xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-zinc-800 bg-zinc-950">
                <h2 className="text-2xl font-bold text-white mb-2">Resumo do Pedido</h2>
                <p className="text-zinc-500 text-sm">Pedido gerado: <span className="text-white font-mono">#{lastCreatedOrder?.order_number}</span></p>
            </div>
            
            <div className="p-8 space-y-6">
                <div className="flex justify-between items-center text-zinc-400">
                    <span>{selectedProduct?.name} (x{orderQuantity})</span>
                    <span className="text-white font-mono">R$ {lastCreatedOrder?.total.toFixed(2)}</span>
                </div>
                
                <div className="h-px bg-zinc-800"></div>
                
                <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-white">Total a Pagar</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">R$ {lastCreatedOrder?.total.toFixed(2)}</span>
                </div>

                <div className="pt-6 space-y-4">
                    {canAddToAccount ? (
                        <button 
                            onClick={handleAddToAccount}
                            className="w-full bg-zinc-100 text-black py-5 rounded-2xl font-black text-lg hover:bg-white transition flex items-center justify-center gap-3 shadow-xl"
                        >
                            <Wallet size={24} /> ADICIONAR À MINHA CONTA
                        </button>
                    ) : (
                        <button 
                            onClick={handlePayMercadoPago}
                            disabled={isProcessing}
                            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-500 transition flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard size={24} />} 
                            PAGAR COM PIX / CARTÃO
                        </button>
                    )}
                    
                    <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest leading-relaxed">
                        {canAddToAccount 
                            ? "Você possui limite disponível para este serviço. O valor será cobrado no fechamento da sua conta." 
                            : "Para este pedido (produto ou falta de crédito), é necessário o pagamento imediato para confirmação."}
                    </p>
                </div>
            </div>
        </div>
    </div>
  );

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
                {step === 'list' ? 'Loja Crazy Art' : step === 'detail' ? 'Produto' : 'Finalizar Pedido'}
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

      {/* MODAL DE LISTA DE TAMANHOS */}
      {isListModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl max-h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-scale-in">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                      <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-3"><ListChecks className="text-primary" /> Lista de Pedido</h3>
                        <p className="text-xs text-zinc-500 mt-1">Preencha os dados de cada integrante da sua lista.</p>
                      </div>
                      <button onClick={() => setIsListModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition"><X size={24} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      <div className="space-y-4">
                          {sizeList.map((item, idx) => (
                              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-zinc-950 rounded-2xl border border-zinc-800 items-end animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                  <div className="md:col-span-2">
                                      <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-2">Categoria</label>
                                      <select 
                                        value={item.category} 
                                        onChange={(e) => updateListRow(item.id, 'category', e.target.value as any)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-primary"
                                      >
                                          <option value="unisex">Unisex</option>
                                          <option value="feminina">Feminina</option>
                                          <option value="infantil">Infantil</option>
                                      </select>
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-2">Tamanho</label>
                                      <select 
                                        value={item.size} 
                                        onChange={(e) => updateListRow(item.id, 'size', e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-primary"
                                      >
                                          {sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                  </div>
                                  <div className="md:col-span-1">
                                      <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-2">Nº</label>
                                      <input 
                                        type="text" 
                                        placeholder="00" 
                                        value={item.number} 
                                        onChange={(e) => updateListRow(item.id, 'number', e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-primary text-center font-mono" 
                                      />
                                  </div>
                                  <div className="md:col-span-3">
                                      <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-2">Nome na Camisa</label>
                                      <input 
                                        type="text" 
                                        placeholder="NOME" 
                                        value={item.name} 
                                        onChange={(e) => updateListRow(item.id, 'name', e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary uppercase" 
                                      />
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-2">Short (Tamanho)</label>
                                      <select 
                                        value={item.shortSize} 
                                        onChange={(e) => updateListRow(item.id, 'shortSize', e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-primary"
                                      >
                                          <option value="">Nenhum</option>
                                          {sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                  </div>
                                  <div className="md:col-span-1">
                                      <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-2">Short Nº</label>
                                      <input 
                                        type="text" 
                                        placeholder="00" 
                                        value={item.shortNumber} 
                                        onChange={(e) => updateListRow(item.id, 'shortNumber', e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-primary text-center font-mono" 
                                      />
                                  </div>
                                  <div className="md:col-span-1">
                                      <button onClick={() => removeListRow(item.id)} className="w-full p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition flex items-center justify-center"><Trash2 size={16} /></button>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <button onClick={addListRow} className="w-full mt-6 py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-primary hover:border-primary/50 transition flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs">
                          <PlusIcon size={18} /> Adicionar Integrante
                      </button>
                  </div>

                  <div className="p-6 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center">
                      <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{sizeList.length} itens na lista</span>
                      <button onClick={finalizeList} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3 rounded-xl font-bold transition shadow-lg shadow-emerald-900/20 active:scale-95">FINALIZAR LISTA</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
