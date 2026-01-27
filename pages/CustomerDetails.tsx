
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Phone, Mail, MapPin, DollarSign, Calendar, 
  CheckCircle, AlertTriangle, Trash2, Edit, Plus, X, 
  Wallet, Loader2, ArrowLeft, Cloud, Clock, CreditCard,
  Filter, Layers, Package, Wrench, Search, Minus
} from 'lucide-react';
import { api } from '../src/services/api';

export default function CustomerDetails() {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, orders, products, updateCustomer, deleteCustomer, deleteOrder, addOrder, addProduct, isLoading } = useData();
  const { role, currentCustomer } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'open' | 'overdue' | 'paid' | 'all'>('open');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // States para Modal de Novo Pedido
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderData, setNewOrderData] = useState({
      description: '',
      orderDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // State para Criação Rápida de Item
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<'product' | 'service'>('product');
  const [quickItemData, setQuickItemData] = useState({ name: '', price: '' });

  // Determina qual ID usar: URL (Admin) ou Contexto (Cliente)
  const activeId = role === 'client' ? currentCustomer?.id : paramId;

  // Proteção de rota para Admin (se tentar acessar sem ID na URL)
  useEffect(() => {
    if (role === 'admin' && !paramId) {
       navigate('/customers');
    }
  }, [role, paramId, navigate]);

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center text-zinc-500">
              <Loader2 className="animate-spin mr-2" /> Carregando...
          </div>
      );
  }

  // Busca o objeto do cliente. 
  const customer = role === 'client' 
      ? currentCustomer 
      : customers.find(c => c.id === activeId);

  if (!customer) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center text-zinc-500">
              <User size={48} className="mb-4 opacity-20" />
              <p>Cliente não encontrado.</p>
              <button onClick={() => navigate('/')} className="mt-4 text-primary hover:underline">Voltar</button>
          </div>
      );
  }

  // Normaliza o link da nuvem
  const cloudUrl = customer.cloudLink || (customer as any).cloud_link;

  // Todos os pedidos do cliente ordenados
  const allCustomerOrders = orders
    .filter(o => o.client_id === activeId)
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  // --- LÓGICA DE CATEGORIZAÇÃO E FILTROS ---
  const today = new Date();
  today.setHours(0,0,0,0);

  const _openOrders = allCustomerOrders.filter(o => {
      if (o.status !== 'open') return false;
      const due = new Date(o.due_date);
      return due >= today;
  });

  const _overdueOrders = allCustomerOrders.filter(o => {
      if (o.status !== 'open') return false;
      const due = new Date(o.due_date);
      return due < today;
  });

  const _paidOrders = allCustomerOrders.filter(o => o.status === 'paid');

  const displayedOrders = useMemo(() => {
      switch(activeTab) {
          case 'open': return _openOrders;
          case 'overdue': return _overdueOrders;
          case 'paid': return _paidOrders;
          default: return allCustomerOrders;
      }
  }, [activeTab, allCustomerOrders, _openOrders, _overdueOrders, _paidOrders]);

  // Lógica de Seleção em Massa
  const currentTabPayableOrders = useMemo(() => 
      displayedOrders.filter(o => o.status === 'open'),
  [displayedOrders]);

  const isAllSelected = currentTabPayableOrders.length > 0 && currentTabPayableOrders.every(o => selectedOrderIds.includes(o.id));

  const handleSelectAll = () => {
      if (isAllSelected) {
          // Desmarcar todos da visualização atual
          const idsToDeselect = currentTabPayableOrders.map(o => o.id);
          setSelectedOrderIds(prev => prev.filter(id => !idsToDeselect.includes(id)));
      } else {
          // Marcar todos da visualização atual
          const idsToSelect = currentTabPayableOrders.map(o => o.id);
          setSelectedOrderIds(prev => Array.from(new Set([...prev, ...idsToSelect])));
      }
  };

  const totalPaid = _paidOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const totalOpen = _openOrders.reduce((acc, o) => acc + (o.total || 0), 0) + _overdueOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const totalOverdueValue = _overdueOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  const creditLimit = customer.creditLimit || 50;
  const availableCredit = creditLimit - totalOpen;
  const usedPercentage = Math.min(100, (totalOpen / creditLimit) * 100);
  
  const selectedTotal = useMemo(() => {
    return allCustomerOrders
      .filter(o => selectedOrderIds.includes(o.id))
      .reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [allCustomerOrders, selectedOrderIds]);

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handlePayment = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
        const title = orderIds.length === 1 
            ? `Pedido #${allCustomerOrders.find(o => o.id === orderIds[0])?.formattedOrderNumber} - Crazy Art`
            : `Faturas (${orderIds.length}) - Crazy Art`;
        
        const res = await api.createPayment({
            orderId: orderIds.join(','),
            title,
            amount: selectedTotal,
            payerEmail: customer.email,
            payerName: customer.name
        });

        if (res && res.init_point) {
            window.location.href = res.init_point;
        } else {
            alert('Erro ao gerar link de pagamento.');
        }
    } catch (e: any) {
        alert('Erro: ' + e.message);
    } finally {
        setIsBatchProcessing(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await updateCustomer(customer.id, formData);
      setIsEditModalOpen(false);
  };
  
  const openEditModal = () => {
      setFormData({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          cpf: customer.cpf,
          address: { ...customer.address },
          creditLimit: customer.creditLimit,
          cloudLink: cloudUrl
      });
      setIsEditModalOpen(true);
  };

  const confirmDelete = async () => {
      if (confirm("ATENÇÃO: Você tem certeza que deseja excluir este cliente?\n\nIsso apagará permanentemente todo o histórico de pedidos e dados financeiros.")) {
          await deleteCustomer(customer.id);
          navigate('/customers');
      }
  };

  // --- LÓGICA NOVO PEDIDO ---
  const handleOpenNewOrder = () => {
      setNewOrderData({
          description: '',
          orderDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setOrderItems([]);
      setItemSearch('');
      setIsNewOrderModalOpen(true);
  };

  const handleAddItem = (product: any) => {
      setOrderItems(prev => {
          const existing = prev.find(i => i.productId === product.id);
          if (existing) {
              return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice } : i);
          }
          return [...prev, {
              productId: product.id,
              productName: product.name,
              quantity: 1,
              unitPrice: product.price,
              total: product.price
          }];
      });
      setItemSearch('');
      setShowSearchResults(false);
  };

  const handleRemoveItem = (index: number) => {
      setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, newQty: number) => {
      if (newQty < 1) return;
      setOrderItems(prev => prev.map((item, i) => {
          if (i === index) {
              return { ...item, quantity: newQty, total: newQty * item.unitPrice };
          }
          return item;
      }));
  };

  const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const orderTotal = orderItems.reduce((acc, item) => acc + item.total, 0);

  const handleFinalizeOrder = async () => {
      if (orderItems.length === 0 && !newOrderData.description) {
          alert('Adicione itens ou uma descrição para o pedido.');
          return;
      }

      const payload = {
          client_id: customer.id,
          description: newOrderData.description || `Pedido com ${orderItems.length} itens`,
          order_date: newOrderData.orderDate,
          due_date: newOrderData.dueDate,
          items: orderItems,
          total: orderTotal,
          status: 'open'
      };

      await addOrder(payload);
      setIsNewOrderModalOpen(false);
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickItemData.name || !quickItemData.price) return;

      try {
          const newItem = await addProduct({
              name: quickItemData.name,
              price: parseFloat(quickItemData.price.replace(',', '.')),
              type: quickCreateType,
              description: 'Criado via pedido rápido'
          });
          
          // Adiciona imediatamente ao pedido
          handleAddItem({
              id: newItem.id,
              name: newItem.name,
              price: newItem.price
          });

          setIsQuickCreateOpen(false);
          setQuickItemData({ name: '', price: '' });
      } catch (err: any) {
          alert('Erro ao criar item: ' + err.message);
      }
  };

  return (
    <div className="space-y-8 pb-24 relative animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div className="flex items-center gap-4">
                <Link to={role === 'admin' ? "/customers" : "/"} className="p-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight font-heading leading-none">
                        {customer.name}
                    </h1>
                    <div className="mt-2">
                        <span className="bg-white/5 border border-white/5 px-2 py-1 rounded text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                            ID: {customer.id.slice(0, 8)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
                {/* Botão Nuvem de Arquivos */}
                {cloudUrl && (
                    <a 
                        href={cloudUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-5 py-2.5 bg-[#1e1b4b] hover:bg-[#2e2a5b] border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-900/20"
                    >
                        <Cloud size={18} /> Nuvem
                    </a>
                )}

                {role === 'admin' && (
                    <>
                        <button 
                            onClick={handleOpenNewOrder}
                            className="px-5 py-2.5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95"
                        >
                            <Plus size={18} /> Novo Pedido
                        </button>
                        <button onClick={openEditModal} className="px-5 py-2.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold">
                            <Edit size={16} /> Editar
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* Status Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card Em Aberto */}
            <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500">
                        <Clock size={20} />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Em Aberto</span>
                </div>
                <div className="relative z-10">
                    <span className="text-zinc-500 text-lg font-medium mr-1">R$</span>
                    <span className="text-4xl font-black text-white tracking-tight">{totalOpen.toFixed(2)}</span>
                </div>
            </div>

            {/* Card Vencido */}
            <div className={`bg-[#0c0c0e] border p-6 rounded-2xl relative overflow-hidden group transition-colors ${totalOverdueValue > 0 ? 'border-red-500/30' : 'border-white/5'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg border ${totalOverdueValue > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50'}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Vencido</span>
                </div>
                <div className="relative z-10">
                    <span className="text-zinc-600 text-lg font-medium mr-1">R$</span>
                    <span className={`text-4xl font-black tracking-tight ${totalOverdueValue > 0 ? 'text-zinc-300' : 'text-zinc-700'}`}>{totalOverdueValue.toFixed(2)}</span>
                </div>
            </div>

            {/* Card Total Pago */}
            <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500">
                        <CheckCircle size={20} />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Pago</span>
                </div>
                <div className="relative z-10">
                    <span className="text-zinc-500 text-lg font-medium mr-1">R$</span>
                    <span className={`text-4xl font-black tracking-tight ${totalPaid > 0 ? 'text-emerald-400' : 'text-zinc-700'}`}>{totalPaid.toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Info & Credit Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Contact Info */}
            <div className="lg:col-span-1 space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-1">Informações de Contato</h3>
                
                <div className="bg-[#121215] border border-white/5 p-4 rounded-xl flex items-center gap-4 group hover:border-white/10 transition-colors">
                    <div className="bg-zinc-900 p-2.5 rounded-lg text-zinc-400 group-hover:text-white transition-colors">
                        <Phone size={18} />
                    </div>
                    <span className="text-zinc-300 font-mono text-sm">{customer.phone}</span>
                </div>

                <div className="bg-[#121215] border border-white/5 p-4 rounded-xl flex items-center gap-4 group hover:border-white/10 transition-colors">
                    <div className="bg-zinc-900 p-2.5 rounded-lg text-zinc-400 group-hover:text-white transition-colors">
                        <Mail size={18} />
                    </div>
                    <span className="text-zinc-300 font-mono text-sm truncate">{customer.email || 'Sem email'}</span>
                </div>

                <div className="bg-[#121215] border border-white/5 p-4 rounded-xl flex items-start gap-4 group hover:border-white/10 transition-colors">
                    <div className="bg-zinc-900 p-2.5 rounded-lg text-zinc-400 group-hover:text-white transition-colors">
                        <MapPin size={18} />
                    </div>
                    <span className="text-zinc-300 text-sm leading-relaxed">
                        {customer.address?.street ? `${customer.address.street}, ${customer.address.number}` : 'Endereço não cadastrado'}
                    </span>
                </div>
            </div>

            {/* Right Column: Credit Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#121215] to-[#09090b] border border-white/5 rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                {/* Background Glow */}
                <div className="absolute right-0 top-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="text-primary" size={24} />
                            <h2 className="text-xl font-bold text-white">Limite de Crédito</h2>
                        </div>
                        <p className="text-zinc-500 text-sm">Status da conta</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Disponível</p>
                        <p className="text-3xl font-bold text-emerald-500 font-mono">R$ {availableCredit.toFixed(2)}</p>
                    </div>
                </div>

                <div className="relative z-10 mt-auto">
                    <div className="flex justify-between text-xs text-zinc-400 mb-3 font-mono tracking-wide">
                        <span>Utilizado: R$ {totalOpen.toFixed(2)}</span>
                        <span>Total: R$ {creditLimit.toFixed(2)}</span>
                    </div>
                    
                    <div className="w-full h-5 bg-zinc-900/50 rounded-full overflow-hidden border border-white/5 relative">
                        {/* Pattern background for bar */}
                        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]"></div>
                        
                        <div 
                            className="h-full bg-primary relative transition-all duration-1000 ease-out"
                            style={{ width: `${usedPercentage}%` }}
                        >
                            <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_white]"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Orders List Container */}
        <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-xl mt-4">
            
            {/* ABAS DE NAVEGAÇÃO */}
            <div className="flex flex-col sm:flex-row border-b border-white/5 bg-[#0c0c0e]">
                <button 
                    onClick={() => setActiveTab('open')}
                    className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'open' ? 'text-primary bg-primary/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
                >
                    Abertos
                    {_openOrders.length > 0 && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">{_openOrders.length}</span>}
                    {activeTab === 'open' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary shadow-[0_-2px_10px_rgba(245,158,11,0.5)]"></div>}
                </button>

                <button 
                    onClick={() => setActiveTab('overdue')}
                    className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'overdue' ? 'text-red-500 bg-red-500/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
                >
                    Atrasados
                    {_overdueOrders.length > 0 && <span className="ml-2 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full">{_overdueOrders.length}</span>}
                    {activeTab === 'overdue' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_-2px_10px_rgba(239,68,68,0.5)]"></div>}
                </button>

                <button 
                    onClick={() => setActiveTab('paid')}
                    className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'paid' ? 'text-emerald-500 bg-emerald-500/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
                >
                    Pagos
                    {_paidOrders.length > 0 && <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full">{_paidOrders.length}</span>}
                    {activeTab === 'paid' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-500 shadow-[0_-2px_10px_rgba(16,185,129,0.5)]"></div>}
                </button>

                <button 
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'all' ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
                >
                    Histórico
                    {activeTab === 'all' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-500"></div>}
                </button>
            </div>

            <div className="overflow-x-auto pb-24">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-white/[0.02] text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 w-10">
                                {currentTabPayableOrders.length > 0 && (
                                    <input 
                                        type="checkbox" 
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer accent-primary"
                                        title="Selecionar todos os pedidos pagáveis desta lista"
                                    />
                                )}
                            </th>
                            <th className="px-6 py-4">Pedido</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Vencimento</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Valor</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {displayedOrders.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-16 text-zinc-600">
                                <div className="flex flex-col items-center gap-2">
                                    <Layers size={32} className="opacity-20" />
                                    <p>Nenhum pedido nesta categoria.</p>
                                </div>
                            </td></tr>
                        ) : (
                            displayedOrders.map(order => {
                                const isLate = order.status === 'open' && new Date(order.due_date) < new Date();
                                const isSelected = selectedOrderIds.includes(order.id);
                                return (
                                    <tr key={order.id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                                        <td className="px-6 py-4">
                                            {order.status === 'open' && (
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectOrder(order.id)}
                                                    className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer accent-primary"
                                                />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-zinc-300">
                                            #{order.formattedOrderNumber || order.order_number}
                                            <div className="text-xs text-zinc-600 max-w-[200px] truncate font-sans">{order.description}</div>
                                        </td>
                                        <td className="px-6 py-4">{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td className={`px-6 py-4 ${isLate ? 'text-red-400 font-bold' : ''}`}>{new Date(order.due_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            {order.status === 'paid' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">
                                                    Pago
                                                </span>
                                            ) : isLate ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wide">
                                                    Atrasado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                                                    Aberto
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-white">R$ {order.total.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            {order.status === 'open' ? (
                                                <button 
                                                    onClick={() => handlePayment([order.id])}
                                                    disabled={isBatchProcessing}
                                                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition font-bold inline-flex items-center gap-1 shadow-lg shadow-emerald-600/20"
                                                >
                                                    <DollarSign size={12} /> Pagar
                                                </button>
                                            ) : (
                                                <span className="text-xs text-zinc-700 italic">Concluído</span>
                                            )}
                                            {role === 'admin' && (
                                                <button 
                                                    onClick={() => {
                                                        if(confirm('Excluir pedido?')) deleteOrder(order.id);
                                                    }}
                                                    className="ml-3 p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                                    title="Excluir Pedido"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Zona de Perigo (Admin Only) - Movida para o final */}
        {role === 'admin' && (
            <div className="mt-12 border-t border-white/5 pt-8 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                    <div className="space-y-1">
                        <h3 className="text-red-500 font-bold text-lg flex items-center gap-2">
                            <AlertTriangle size={20} /> Zona de Perigo
                        </h3>
                        <p className="text-zinc-400 text-sm max-w-xl">
                            A exclusão deste cliente removerá permanentemente todos os dados pessoais, histórico de pedidos e registros financeiros associados. Esta ação é irreversível.
                        </p>
                    </div>
                    <button 
                        onClick={confirmDelete} 
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-red-900/20 hover:scale-105 active:scale-95 whitespace-nowrap"
                    >
                        <Trash2 size={18} /> Excluir Cliente
                    </button>
                </div>
            </div>
        )}

        {/* BARRA DE AÇÃO FLUTUANTE (PAGAMENTO EM MASSA) - PÍLULA COMPACTA */}
        {selectedOrderIds.length > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-[#18181b]/95 backdrop-blur-md border border-white/10 shadow-2xl p-2 pl-4 rounded-full flex items-center gap-4 animate-fade-in-up w-auto max-w-[95%]">
                
                {/* Informações da Seleção */}
                <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide hidden sm:inline-block">Selecionados</span>
                        <p className="text-white font-bold text-sm leading-none flex items-center gap-1">
                            {selectedOrderIds.length} <span className="text-zinc-500 font-normal">itens</span>
                        </p>
                    </div>
                    
                    <div className="h-4 w-px bg-white/10"></div>
                    
                    <div>
                        <p className="text-emerald-400 font-mono font-bold text-sm leading-none">R$ {selectedTotal.toFixed(2)}</p>
                    </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setSelectedOrderIds([])}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition"
                        title="Cancelar Seleção"
                    >
                        <X size={16} />
                    </button>
                    <button 
                        onClick={() => handlePayment(selectedOrderIds)}
                        disabled={isBatchProcessing}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-full font-bold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                        {isBatchProcessing ? <Loader2 className="animate-spin" size={14} /> : <DollarSign size={14} />}
                        <span>Pagar</span>
                    </button>
                </div>
            </div>
        )}

        {/* MODAL NOVO PEDIDO - Reposicionado para cima (pt-12 md:pt-24) */}
        {isNewOrderModalOpen && (
            <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/60 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col animate-scale-in">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e] rounded-t-2xl shrink-0">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <div className="bg-primary/20 p-2 rounded-lg text-primary"><Plus size={18} /></div> Novo Pedido
                        </h2>
                        <button onClick={() => setIsNewOrderModalOpen(false)} className="text-zinc-500 hover:text-white hover:rotate-90 transition-transform"><X size={24} /></button>
                    </div>

                    <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {/* Descrição */}
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Descrição do Pedido</label>
                            <input 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder-zinc-700" 
                                placeholder="Ex: Cartões de visita e Banner"
                                value={newOrderData.description}
                                onChange={(e) => setNewOrderData({...newOrderData, description: e.target.value})}
                            />
                        </div>

                        {/* Datas */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Data do Pedido</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                                    value={newOrderData.orderDate}
                                    onChange={(e) => setNewOrderData({...newOrderData, orderDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Vencimento</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                                    value={newOrderData.dueDate}
                                    onChange={(e) => setNewOrderData({...newOrderData, dueDate: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-4">
                            <h3 className="font-bold text-primary flex items-center gap-2 mb-3 uppercase text-xs tracking-wider">
                                <Package size={14} /> Itens do Pedido
                            </h3>
                            
                            {/* Create/Search Area */}
                            {isQuickCreateOpen ? (
                                <div className="bg-zinc-900/50 p-4 rounded-xl border border-primary/30 animate-fade-in relative">
                                    <button 
                                        onClick={() => setIsQuickCreateOpen(false)} 
                                        className="absolute top-2 right-2 text-zinc-500 hover:text-white"
                                    ><X size={16} /></button>
                                    <h4 className="text-sm font-bold text-white mb-3">Criar Novo {quickCreateType === 'product' ? 'Produto' : 'Serviço'}</h4>
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <input 
                                                autoFocus
                                                placeholder="Nome do Item"
                                                className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                                                value={quickItemData.name}
                                                onChange={e => setQuickItemData({...quickItemData, name: e.target.value})}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <input 
                                                placeholder="R$ 0.00"
                                                className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                                                value={quickItemData.price}
                                                onChange={e => setQuickItemData({...quickItemData, price: e.target.value})}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleQuickCreate}
                                            className="bg-primary hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <input 
                                            placeholder="Buscar item do catálogo ou adicionar..."
                                            className="w-full bg-black/40 border border-primary/30 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder-zinc-600"
                                            value={itemSearch}
                                            onChange={(e) => {
                                                setItemSearch(e.target.value);
                                                setShowSearchResults(true);
                                            }}
                                        />
                                        <Search className="absolute left-3 top-3.5 text-zinc-500" size={18} />
                                    </div>

                                    {showSearchResults && itemSearch && (
                                        <div className="absolute top-full left-0 w-full bg-[#18181b] border border-zinc-800 rounded-xl mt-1 shadow-xl z-20 max-h-48 overflow-y-auto">
                                            {filteredProducts.length > 0 ? (
                                                filteredProducts.map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        onClick={() => handleAddItem(p)}
                                                        className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-zinc-800/50 last:border-0 flex justify-between items-center group"
                                                    >
                                                        <span className="text-zinc-300 group-hover:text-white transition">{p.name}</span>
                                                        <span className="text-primary font-mono text-xs">R$ {p.price.toFixed(2)}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-zinc-500 text-xs">Nenhum item encontrado. Use os botões abaixo para criar.</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Quick Buttons */}
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <button 
                                            onClick={() => { setQuickCreateType('product'); setIsQuickCreateOpen(true); }}
                                            className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 py-3 rounded-xl transition group"
                                        >
                                            <Package size={16} className="text-zinc-500 group-hover:text-white" />
                                            <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase">Criar Produto</span>
                                        </button>
                                        <button 
                                            onClick={() => { setQuickCreateType('service'); setIsQuickCreateOpen(true); }}
                                            className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 py-3 rounded-xl transition group"
                                        >
                                            <Wrench size={16} className="text-zinc-500 group-hover:text-white" />
                                            <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase">Criar Serviço</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Added Items List */}
                            <div className="mt-6 space-y-2">
                                {orderItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-white/5 group hover:border-white/10 transition">
                                        <span className="text-sm text-zinc-300 font-medium truncate flex-1">{item.productName}</span>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center bg-black/40 rounded-lg p-1">
                                                <button onClick={() => updateItemQuantity(idx, item.quantity - 1)} className="p-1 hover:text-white text-zinc-500"><Minus size={12} /></button>
                                                <span className="w-6 text-center text-xs font-bold text-white">{item.quantity}</span>
                                                <button onClick={() => updateItemQuantity(idx, item.quantity + 1)} className="p-1 hover:text-white text-zinc-500"><Plus size={12} /></button>
                                            </div>
                                            <span className="text-sm font-mono text-emerald-400 w-20 text-right">R$ {item.total.toFixed(2)}</span>
                                            <button onClick={() => handleRemoveItem(idx)} className="text-zinc-600 hover:text-red-500 transition"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 bg-[#0c0c0e] flex justify-between items-center rounded-b-2xl shrink-0">
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Total Geral</p>
                            <h2 className="text-3xl font-black text-white">R$ {orderTotal.toFixed(2)}</h2>
                        </div>
                        <button 
                            onClick={handleFinalizeOrder}
                            className="bg-gradient-to-r from-primary to-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition"
                        >
                            FINALIZAR PEDIDO
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Modal - Reposicionado para cima (pt-12 md:pt-24) */}
        {isEditModalOpen && (
             <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up overflow-y-auto">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e] rounded-t-2xl">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Edit size={20} className="text-primary" /> Editar Cliente
                        </h2>
                        <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white hover:rotate-90 transition-transform"><X size={24} /></button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Nome Completo</label>
                            <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Telefone</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Limite (R$)</label>
                                <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition font-mono" value={formData.creditLimit || ''} onChange={e => setFormData({...formData, creditLimit: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Email</label>
                            <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Link Nuvem (Opcional)</label>
                            <div className="relative">
                                <input className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.cloudLink || ''} onChange={e => setFormData({...formData, cloudLink: e.target.value})} placeholder="https://..." />
                                <Cloud className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                            </div>
                        </div>
                        <div className="pt-6 flex justify-end gap-3 border-t border-white/5 mt-2">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition font-medium">Cancelar</button>
                            <button type="submit" className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-lg shadow-primary/20">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
             </div>
        )}
    </div>
  );
}
