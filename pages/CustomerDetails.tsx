
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Phone, Mail, MapPin, DollarSign, Calendar, 
  CheckCircle, AlertTriangle, Trash2, Edit, Plus, X, 
  Wallet, Loader2, ArrowLeft, Cloud, Clock, CreditCard,
  Filter, Layers, Package, Wrench, Search, Minus, ListChecks, Check, Eye, MoreHorizontal, Share2, Copy
} from 'lucide-react';
import { api } from '../src/services/api';
import { SizeListItem } from '../types';

export default function CustomerDetails() {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
      customers, orders, products, 
      updateCustomer, deleteCustomer, deleteOrder, 
      addOrder, addProduct, updateOrder, updateOrderStatus, isLoading 
  } = useData();
  const { role, currentCustomer } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'open' | 'overdue' | 'paid' | 'all'>('open');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // State para posição do modal flutuante
  const [floatingY, setFloatingY] = useState<number>(0);

  // States para Modal de Novo/Editar Pedido
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);

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

  // State para Visualização de Detalhes do Pedido
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);

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
  let rawCustomer = role === 'client' 
      ? currentCustomer 
      : customers.find(c => c.id === activeId);

  // Normalização de Segurança para evitar crash se o objeto vier 'flat' do DB
  const customer = rawCustomer ? {
      ...rawCustomer,
      creditLimit: Number(rawCustomer.creditLimit || 0),
      address: rawCustomer.address || {
          street: (rawCustomer as any).street || '',
          number: (rawCustomer as any).number || '',
          zipCode: (rawCustomer as any).zipCode || ''
      }
  } : null;

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
    .filter(o => o.client_id === customer.id)
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

  // Lista completa de pedidos pagáveis (abertos + atrasados) para o botão "Pagar Tudo"
  const allPayableOrders = [..._openOrders, ..._overdueOrders];
  // FIX: Garantir que o total seja número para evitar crash no reduce/toFixed
  const totalPayableValue = allPayableOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);

  // Lógica de Seleção em Massa
  const currentTabPayableOrders = useMemo(() => 
      displayedOrders.filter(o => o.status === 'open'),
  [displayedOrders]);

  const isAllSelected = currentTabPayableOrders.length > 0 && currentTabPayableOrders.every(o => selectedOrderIds.includes(o.id));

  const handleSelectAll = (e: React.MouseEvent) => {
      if (e) setFloatingY(e.clientY);
      
      if (isAllSelected) {
          const idsToDeselect = currentTabPayableOrders.map(o => { return o.id; });
          setSelectedOrderIds(prev => prev.filter(id => !idsToDeselect.includes(id)));
      } else {
          const idsToSelect = currentTabPayableOrders.map(o => { return o.id; });
          setSelectedOrderIds(prev => Array.from(new Set([...prev, ...idsToSelect])));
      }
  };

  // FIX: Conversão explícita para Number em todos os reduces
  const totalPaid = _paidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalOpen = _openOrders.reduce((acc, o) => acc + Number(o.total || 0), 0) + _overdueOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalOverdueValue = _overdueOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);

  const creditLimit = customer.creditLimit || 50;
  const availableCredit = creditLimit - totalOpen;
  const usedPercentage = Math.min(100, (totalOpen / creditLimit) * 100);
  
  const selectedTotal = useMemo(() => {
    return allCustomerOrders
      .filter(o => selectedOrderIds.includes(o.id))
      .reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  }, [allCustomerOrders, selectedOrderIds]);

  const toggleSelectOrder = (orderId: string, e: React.MouseEvent) => {
    setFloatingY(e.clientY);

    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handlePayment = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
        const targetOrders = allCustomerOrders.filter(o => orderIds.includes(o.id));
        const amountToPay = targetOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);

        const title = orderIds.length === 1 
            ? `Pedido #${targetOrders[0]?.formattedOrderNumber} - Crazy Art`
            : `Faturas (${orderIds.length}) - Crazy Art`;
        
        const res = await api.createPayment({
            orderId: orderIds.join(','),
            title,
            amount: amountToPay,
            payerEmail: customer.email,
            payerName: customer.name
        });

        if (res && res.init_point) {
            // ABRIR EM NOVA ABA
            window.open(res.init_point, '_blank');
        } else {
            alert('Erro ao gerar link de pagamento.');
        }
    } catch (e: any) {
        alert('Erro: ' + e.message);
    } finally {
        setIsBatchProcessing(false);
    }
  };

  // Handler para Pagamento Manual (Admin Only)
  const handleManualPayment = async (orderId: string) => {
      if (confirm("Confirmar recebimento manual deste pedido?")) {
          await updateOrderStatus(orderId, 'paid');
          if (viewingOrder?.id === orderId) setViewingOrder(null);
      }
  };

  // Handler específico para o botão "Pagar Tudo"
  const handlePayAll = async () => {
      if (allPayableOrders.length === 0) return;
      setIsBatchProcessing(true);
      try {
          const ids = allPayableOrders.map(o => o.id);
          const title = `Pagamento Total (${ids.length} itens) - ${customer.name}`;
          
          const res = await api.createPayment({
              orderId: ids.join(','),
              title,
              amount: totalPayableValue,
              payerEmail: customer.email,
              payerName: customer.name
          });

          if (res && res.init_point) {
              // ABRIR EM NOVA ABA
              window.open(res.init_point, '_blank');
          } else {
              alert('Erro ao gerar link.');
          }
      } catch (e: any) {
          alert('Erro: ' + e.message);
      } finally {
          setIsBatchProcessing(false);
      }
  };

  const handleCreatePublicListLink = () => {
      // Limpa o telefone para garantir apenas números
      const phone = customer.phone.replace(/\D/g, '');
      const baseUrl = window.location.origin + window.location.pathname;
      // Garante que a URL base termine antes do hash se estiver usando HashRouter
      const rootUrl = baseUrl.split('#')[0]; 
      const link = `${rootUrl}#/public-list?phone=${phone}`;
      
      navigator.clipboard.writeText(link);
      alert("Link da lista copiado para a área de transferência! Envie para quem precisar preencher.");
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

  const handleDeleteOrder = async (orderId: string) => {
      if (confirm('Excluir este pedido permanentemente?')) {
          await deleteOrder(orderId);
          if (viewingOrder?.id === orderId) setViewingOrder(null);
      }
  };

  // --- LÓGICA NOVO/EDITAR PEDIDO ---
  const handleOpenNewOrder = () => {
      setEditingOrderId(null);
      setNewOrderData({
          description: '',
          orderDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setOrderItems([]);
      setItemSearch('');
      setIsNewOrderModalOpen(true);
  };

  const handleEditOrder = async (order: any) => {
      setViewingOrder(null);
      setIsLoadingOrderDetails(true);
      setEditingOrderId(order.id);
      setIsNewOrderModalOpen(true);

      try {
          const fullOrder = await api.getOrder(order.id);
          
          setNewOrderData({
              description: fullOrder.description || '',
              orderDate: fullOrder.order_date ? fullOrder.order_date.split('T')[0] : '',
              dueDate: fullOrder.due_date ? fullOrder.due_date.split('T')[0] : ''
          });
          
          if (fullOrder.items) {
              const mappedItems = fullOrder.items.map((i: any) => ({
                  productId: i.catalog_id || 'manual',
                  productName: i.name,
                  quantity: i.quantity,
                  unitPrice: i.unit_price,
                  total: i.total
              }));
              setOrderItems(mappedItems);
          } else {
              setOrderItems([]);
          }

      } catch (e) {
          console.error(e);
          alert('Erro ao carregar detalhes do pedido.');
          setIsNewOrderModalOpen(false);
          setEditingOrderId(null);
      } finally {
          setIsLoadingOrderDetails(false);
      }
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

  const updateItemQuantity = (index: number, newQty: string) => {
      // Permite string vazia para apagar e digitar
      if (newQty === '') {
          setOrderItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: '' as any, total: 0 } : item));
          return;
      }
      
      const parsedQty = parseInt(newQty);
      if (isNaN(parsedQty) || parsedQty < 1) return;
      
      setOrderItems(prev => prev.map((item, i) => {
          if (i === index) {
              return { ...item, quantity: parsedQty, total: parsedQty * item.unitPrice };
          }
          return item;
      }));
  };

  const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  // Calcula total com segurança para quantidades vazias
  const orderTotal = orderItems.reduce((acc, item) => acc + (typeof item.quantity === 'number' ? item.total : 0), 0);

  const handleFinalizeOrder = async () => {
      if (orderItems.length === 0 && !newOrderData.description) {
          alert('Adicione itens ou uma descrição para o pedido.');
          return;
      }

      // Validação de quantidade vazia
      if (orderItems.some(i => typeof i.quantity !== 'number' || i.quantity < 1)) {
          alert("Corrija as quantidades vazias ou inválidas.");
          return;
      }

      if (_overdueOrders.length > 0) {
          if (role === 'admin') {
              const confirmOverdue = window.confirm(
                  `ATENÇÃO: Este cliente possui ${_overdueOrders.length} pedido(s) em atraso.\n\n` +
                  `Deseja ignorar o bloqueio e prosseguir com a criação deste novo pedido?`
              );
              if (!confirmOverdue) return;
          } else {
              alert('BLOQUEADO: O cliente possui pagamentos em atraso. Regularize a situação antes de criar novos pedidos.');
              return;
          }
      }

      let projectedDebt = totalOpen;

      if (editingOrderId) {
          const currentEditingOrder = orders.find(o => o.id === editingOrderId);
          if (currentEditingOrder && currentEditingOrder.status === 'open') {
              projectedDebt -= (currentEditingOrder.total || 0);
          }
      }

      projectedDebt += orderTotal;

      if (projectedDebt > creditLimit) {
          if (role === 'admin') {
              const confirmLimit = window.confirm(
                  `LIMITE EXCEDIDO: O limite do cliente é R$ ${creditLimit.toFixed(2)}, mas a nova dívida projetada será R$ ${projectedDebt.toFixed(2)}.\n\n` +
                  `Deseja ignorar o limite de crédito e prosseguir?`
              );
              if (!confirmLimit) return;
          } else {
              alert(
                  `LIMITE EXCEDIDO: O pedido não pode ser realizado.\n\n` +
                  `Limite de Crédito: R$ ${creditLimit.toFixed(2)}\n` +
                  `Dívida Atual: R$ ${totalOpen.toFixed(2)}\n` +
                  `Novo Total Projetado: R$ ${projectedDebt.toFixed(2)}`
              );
              return;
          }
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

      if (editingOrderId) {
          await updateOrder(editingOrderId, payload);
      } else {
          await addOrder(payload);
      }
      
      setIsNewOrderModalOpen(false);
      setEditingOrderId(null);
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

  const renderStatusBadge = (status: string, isLate: boolean) => {
      if (status === 'paid') {
          return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">
                  Pago
              </span>
          );
      }
      if (isLate) {
          return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wide">
                  Atrasado
              </span>
          );
      }
      return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">
                  Aberto
          </span>
      );
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
                
                {totalPayableValue > 0 && (
                    <button 
                        onClick={handlePayAll}
                        disabled={isBatchProcessing}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <ListChecks size={18} />}
                        <span>Pagar Tudo (R$ {totalPayableValue.toFixed(2)})</span>
                    </button>
                )}

                {/* BOTÃO NOVA LISTA PÚBLICA */}
                <button 
                    onClick={handleCreatePublicListLink}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"
                    title="Copiar link de lista preenchível para enviar a terceiros"
                >
                    <Share2 size={18} /> Criar Lista Compartilhável
                </button>

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

        {/* ... Resto do código existente (Status Cards, Info Section, Orders Table, Modals) ... */}
        {/* Status Cards Row - FIX: Garantir que valores numéricos não crashem o .toFixed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500">
                        <Clock size={20} />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Em Aberto</span>
                </div>
                <div className="relative z-10">
                    <span className="text-zinc-500 text-lg font-medium mr-1">R$</span>
                    <span className="text-4xl font-black text-white tracking-tight">{Number(totalOpen).toFixed(2)}</span>
                </div>
            </div>

            <div className={`bg-[#0c0c0e] border p-6 rounded-2xl relative overflow-hidden group transition-colors ${totalOverdueValue > 0 ? 'border-red-500/30' : 'border-white/5'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg border ${totalOverdueValue > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50'}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Vencido</span>
                </div>
                <div className="relative z-10">
                    <span className="text-zinc-600 text-lg font-medium mr-1">R$</span>
                    <span className={`text-4xl font-black tracking-tight ${totalOverdueValue > 0 ? 'text-zinc-300' : 'text-zinc-700'}`}>{Number(totalOverdueValue).toFixed(2)}</span>
                </div>
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500">
                        <CheckCircle size={20} />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Pago</span>
                </div>
                <div className="relative z-10">
                    <span className="text-zinc-500 text-lg font-medium mr-1">R$</span>
                    <span className={`text-4xl font-black tracking-tight ${totalPaid > 0 ? 'text-emerald-400' : 'text-zinc-700'}`}>{Number(totalPaid).toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Info & Credit Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

            <div className="lg:col-span-2 bg-gradient-to-br from-[#121215] to-[#09090b] border border-white/5 rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[280px]">
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
                        <p className="text-3xl font-bold text-emerald-500 font-mono">R$ {Number(availableCredit).toFixed(2)}</p>
                    </div>
                </div>

                <div className="relative z-10 mt-auto">
                    <div className="flex justify-between text-xs text-zinc-400 mb-3 font-mono tracking-wide">
                        <span>Utilizado: R$ {Number(totalOpen).toFixed(2)}</span>
                        <span>Total: R$ {Number(creditLimit).toFixed(2)}</span>
                    </div>
                    
                    <div className="w-full h-5 bg-zinc-900/50 rounded-full overflow-hidden border border-white/5 relative">
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

        <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-xl mt-4">
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
                            <th className="px-4 md:px-6 py-4 w-10">
                                {currentTabPayableOrders.length > 0 && (
                                    <input 
                                        type="checkbox" 
                                        checked={isAllSelected}
                                        onChange={() => {}}
                                        onClick={handleSelectAll}
                                        className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer accent-primary"
                                        title="Selecionar todos os pedidos pagáveis desta lista"
                                    />
                                )}
                            </th>
                            <th className="px-4 md:px-6 py-4">Pedido / Info</th>
                            <th className="px-6 py-4 hidden md:table-cell">Data</th>
                            <th className="px-6 py-4 hidden md:table-cell">Vencimento</th>
                            <th className="px-6 py-4 hidden md:table-cell">Status</th>
                            <th className="px-4 md:px-6 py-4 text-right">Valor / Venc.</th>
                            <th className="px-4 md:px-6 py-4 text-center">Ações</th>
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
                                        <td className="px-4 md:px-6 py-4">
                                            {order.status === 'open' && (
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => {}}
                                                    onClick={(e) => toggleSelectOrder(order.id, e)}
                                                    className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer accent-primary"
                                                />
                                            )}
                                        </td>
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="font-mono text-zinc-300 font-bold">
                                                #{order.formattedOrderNumber || order.order_number}
                                            </div>
                                            
                                            <div className="md:hidden mt-1.5">
                                                {renderStatusBadge(order.status, isLate)}
                                            </div>

                                            <div className="text-xs text-zinc-600 max-w-[200px] truncate font-sans mt-1">
                                                {order.description || "Sem descrição"}
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4 hidden md:table-cell">{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td className={`px-6 py-4 hidden md:table-cell ${isLate ? 'text-red-400 font-bold' : ''}`}>{new Date(order.due_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            {renderStatusBadge(order.status, isLate)}
                                        </td>

                                        <td className="px-4 md:px-6 py-4 text-right">
                                            <div className="font-mono font-bold text-white text-sm md:text-base">
                                                R$ {Number(order.total || 0).toFixed(2)}
                                            </div>
                                            <div className={`md:hidden text-[10px] mt-1 font-medium ${isLate ? 'text-red-400' : 'text-zinc-500'}`}>
                                                Vence: {new Date(order.due_date).toLocaleDateString().slice(0,5)}
                                            </div>
                                        </td>

                                        <td className="px-4 md:px-6 py-4 text-center">
                                            <div className="flex items-center justify-end md:justify-center gap-2">
                                                {order.status === 'open' ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handlePayment([order.id])}
                                                            disabled={isBatchProcessing}
                                                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg transition font-bold inline-flex items-center gap-1 shadow-lg shadow-emerald-600/20"
                                                            title="Pagar agora"
                                                        >
                                                            <DollarSign size={12} /> <span className="hidden md:inline">Pagar</span>
                                                        </button>
                                                        {role === 'admin' && (
                                                            <button 
                                                                onClick={() => handleManualPayment(order.id)}
                                                                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1.5 rounded-lg transition font-bold inline-flex items-center gap-1 border border-zinc-700 hover:border-zinc-600"
                                                                title="Confirmar Pagamento Manual"
                                                            >
                                                                <Check size={12} />
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="hidden md:inline text-xs text-zinc-700 italic">Concluído</span>
                                                )}
                                                
                                                <button 
                                                    onClick={() => setViewingOrder(order)}
                                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition border border-transparent hover:border-zinc-700"
                                                    title="Ver Detalhes"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                {role === 'admin' && (
                                                    <button 
                                                        onClick={() => handleDeleteOrder(order.id)}
                                                        className="hidden md:block p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition ml-1"
                                                        title="Excluir Pedido"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {viewingOrder && (
            <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] animate-scale-in">
                    
                    <div className="p-6 border-b border-white/5 flex justify-between items-start bg-[#0c0c0e] rounded-t-2xl">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Package size={20} className="text-primary" /> 
                                Pedido #{viewingOrder.formattedOrderNumber || viewingOrder.order_number}
                            </h2>
                            <p className="text-zinc-500 text-xs mt-1">{viewingOrder.description || "Sem descrição adicional"}</p>
                        </div>
                        <button onClick={() => setViewingOrder(null)} className="text-zinc-500 hover:text-white hover:rotate-90 transition-transform"><X size={24} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Data do Pedido</span>
                                <span className="text-white font-mono text-sm">{new Date(viewingOrder.order_date).toLocaleDateString()}</span>
                            </div>
                            <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Vencimento</span>
                                <span className={`font-mono text-sm ${new Date(viewingOrder.due_date) < new Date() && viewingOrder.status === 'open' ? 'text-red-400 font-bold' : 'text-white'}`}>
                                    {new Date(viewingOrder.due_date).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {viewingOrder.size_list && (
                            <div>
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ListChecks size={14} /> Lista de Produção
                                </h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {(typeof viewingOrder.size_list === 'string' ? JSON.parse(viewingOrder.size_list) : viewingOrder.size_list).map((item: SizeListItem, idx: number) => (
                                        <div key={idx} className="bg-zinc-900/30 p-2 rounded border border-white/5 flex justify-between items-center text-xs">
                                            <span className="text-zinc-300 font-bold">{item.size} <span className="text-zinc-500 font-normal">({item.category})</span></span>
                                            {item.isSimple ? (
                                                <span className="text-white bg-zinc-700 px-2 py-0.5 rounded font-mono">x{item.quantity}</span>
                                            ) : (
                                                <span className="text-primary font-bold uppercase">{item.name || '-'} <span className="text-white font-mono">{item.number ? `#${item.number}` : ''}</span></span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ListChecks size={14} /> Resumo Financeiro
                            </h3>
                            <div className="space-y-2">
                                <div className="bg-zinc-900/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                    <span className="text-zinc-300 text-sm">Valor Total</span>
                                    <span className="text-white font-mono font-bold text-sm">R$ {Number(viewingOrder.total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-white/5">
                            <span className="text-sm text-zinc-400">Status Atual</span>
                            {renderStatusBadge(viewingOrder.status, new Date(viewingOrder.due_date) < new Date())}
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-[#0c0c0e] rounded-b-2xl">
                        {role === 'admin' ? (
                            <div className="flex flex-col gap-3">
                                {viewingOrder.status === 'open' && (
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleManualPayment(viewingOrder.id)}
                                            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 border border-zinc-700"
                                        >
                                            <Check size={16} /> Marcar Pago
                                        </button>
                                        <button 
                                            onClick={() => handleEditOrder(viewingOrder)}
                                            className="flex-1 py-3 bg-primary hover:bg-amber-600 text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
                                        >
                                            <Edit size={16} /> Editar
                                        </button>
                                    </div>
                                )}
                                <button 
                                    onClick={() => handleDeleteOrder(viewingOrder.id)}
                                    className="w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Excluir Pedido
                                </button>
                            </div>
                        ) : (
                            viewingOrder.status === 'open' && (
                                <button 
                                    onClick={() => handlePayment([viewingOrder.id])}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-500/20 text-sm flex items-center justify-center gap-2"
                                >
                                    <DollarSign size={16} /> Realizar Pagamento
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Novo Pedido / Editar Pedido (incluindo o que já existia) */}
        {isNewOrderModalOpen && (
            <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/60 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col animate-scale-in">
                    
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e] rounded-t-2xl shrink-0">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                {editingOrderId ? <Edit size={18} /> : <Plus size={18} />}
                            </div> 
                            {editingOrderId ? 'Editar Pedido' : 'Novo Pedido'}
                        </h2>
                        <button onClick={() => setIsNewOrderModalOpen(false)} className="text-zinc-500 hover:text-white hover:rotate-90 transition-transform"><X size={24} /></button>
                    </div>

                    {isLoadingOrderDetails ? (
                        <div className="p-12 flex justify-center items-center">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : (
                        <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Descrição do Pedido</label>
                                <input 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder-zinc-700" 
                                    placeholder="Ex: Cartões de visita e Banner"
                                    value={newOrderData.description}
                                    onChange={(e) => setNewOrderData({...newOrderData, description: e.target.value})}
                                />
                            </div>

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
                                
                                {/* ... (Criação de Itens / Quick Create) ... */}
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

                                <div className="mt-6 space-y-2">
                                    {orderItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-white/5 group hover:border-white/10 transition">
                                            <span className="text-sm text-zinc-300 font-medium truncate flex-1">{item.productName}</span>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center bg-black/40 rounded-lg p-1">
                                                    <button onClick={() => updateItemQuantity(idx, String(Number(item.quantity || 0) - 1))} className="p-1 hover:text-white text-zinc-500"><Minus size={12} /></button>
                                                    <input 
                                                        type="number"
                                                        className="w-10 bg-transparent text-center text-xs font-bold text-white outline-none appearance-none"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItemQuantity(idx, e.target.value)}
                                                    />
                                                    <button onClick={() => updateItemQuantity(idx, String(Number(item.quantity || 0) + 1))} className="p-1 hover:text-white text-zinc-500"><Plus size={12} /></button>
                                                </div>
                                                <span className="text-sm font-mono text-emerald-400 w-20 text-right">R$ {Number(item.total).toFixed(2)}</span>
                                                <button onClick={() => handleRemoveItem(idx)} className="text-zinc-600 hover:text-red-500 transition"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-6 border-t border-white/5 bg-[#0c0c0e] flex justify-between items-center rounded-b-2xl shrink-0">
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Total Geral</p>
                            <h2 className="text-3xl font-black text-white">R$ {Number(orderTotal).toFixed(2)}</h2>
                        </div>
                        <button 
                            onClick={handleFinalizeOrder}
                            className="bg-gradient-to-r from-primary to-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition"
                        >
                            {editingOrderId ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR PEDIDO'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isEditModalOpen && (
             <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/80 backdrop-blur-md p-4 animate-fade-in-up overflow-y-auto">
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
