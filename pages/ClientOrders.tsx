
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, DollarSign, CheckCircle, AlertTriangle, Loader2, ArrowLeft, Cloud, 
  ListChecks, Eye, Coins, Lock, Package, X, Check, CloudDownload, Sparkles, CreditCard
} from 'lucide-react';
import { api } from '../src/services/api';
import { SizeListItem } from '../types';

export default function ClientOrders() {
  const navigate = useNavigate();
  const { 
      customers, orders, updateOrderStatus, isLoading 
  } = useData();
  const { role, currentCustomer } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'open' | 'overdue' | 'paid' | 'all'>('open');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // States para Pagamento Parcial
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{ids: string[], total: number, title: string} | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'total' | 'partial'>('total');

  // State para posição do modal flutuante
  const [floatingY, setFloatingY] = useState<number>(0);

  // State para Visualização de Detalhes do Pedido
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);

  useEffect(() => {
    if (role !== 'client' || !currentCustomer) {
       navigate('/');
    }
  }, [role, currentCustomer, navigate]);

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center text-zinc-500">
              <Loader2 className="animate-spin mr-2" /> Carregando...
          </div>
      );
  }

  if (!currentCustomer) return null;

  const customer = {
      ...currentCustomer,
      creditLimit: Number(currentCustomer.creditLimit || 0),
      isSubscriber: !!currentCustomer.isSubscriber,
      address: currentCustomer.address || {
          street: (currentCustomer as any).street || '',
          number: (currentCustomer as any).number || '',
          zipCode: (currentCustomer as any).zipCode || ''
      }
  };

  const cloudUrl = customer.cloudLink || (customer as any).cloud_link;

  const allCustomerOrders = orders
    .filter(o => o.client_id === customer.id)
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  const today = new Date();
  today.setHours(0,0,0,0);

  const _openOrders = allCustomerOrders.filter(o => {
      if (!['open', 'production', 'revision'].includes(o.status)) return false;
      const due = new Date(o.due_date);
      return due >= today;
  });

  const _overdueOrders = allCustomerOrders.filter(o => {
      if (!['open', 'production', 'revision'].includes(o.status)) return false;
      const due = new Date(o.due_date);
      return due < today;
  });

  // Lógica de Bloqueio da Nuvem
  const isCloudLocked = _overdueOrders.length > 0;

  const displayedOrders = useMemo(() => {
      switch(activeTab) {
          case 'open': return _openOrders;
          case 'overdue': return _overdueOrders;
          default: return [..._openOrders, ..._overdueOrders];
      }
  }, [activeTab, _openOrders, _overdueOrders]);

  const allPayableOrders = [..._openOrders, ..._overdueOrders];
  const totalPayableValue = allPayableOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);

  const currentTabPayableOrders = useMemo(() => 
      displayedOrders.filter(o => ['open', 'production', 'revision'].includes(o.status)),
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

  // --- LOGICA DE PAGAMENTO REVISADA (TOTAL OU PARCIAL) ---

  const initiatePaymentFlow = (orderIds: string[]) => {
      const targetOrders = allCustomerOrders.filter(o => orderIds.includes(o.id));
      const amountToPay = targetOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
      const title = orderIds.length === 1 
          ? `Pedido #${targetOrders[0]?.formattedOrderNumber} - Crazy Art`
          : `Faturas (${orderIds.length}) - Crazy Art`;

      const isSingleOrder = orderIds.length === 1;
      const isEligibleForPartial = isSingleOrder && amountToPay > 50;

      if (isEligibleForPartial) {
          setPendingPaymentData({ ids: orderIds, total: amountToPay, title });
          setCustomAmount((amountToPay / 2).toFixed(2));
          setPaymentType('total');
          setIsValueModalOpen(true);
      } else {
          executePayment(orderIds, amountToPay, title);
      }
  };

  const executePayment = async (orderIds: string[], amount: number, title: string) => {
    if (orderIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
        const res = await api.createPayment({
            orderId: orderIds.join(','),
            title: amount < (pendingPaymentData?.total || 0) ? `[PARCIAL] ${title}` : title,
            amount: amount,
            payerEmail: customer.email,
            payerName: customer.name
        });

        if (res && res.init_point) {
            window.open(res.init_point, '_blank');
            setIsValueModalOpen(false);
        } else {
            alert('Erro ao gerar link de pagamento.');
        }
    } catch (e: any) {
        alert('Erro: ' + e.message);
    } finally {
        setIsBatchProcessing(false);
    }
  };

  const handleConfirmValueModal = () => {
      if (!pendingPaymentData) return;
      const finalAmount = paymentType === 'total' 
          ? pendingPaymentData.total 
          : parseFloat(customAmount.replace(',', '.'));

      if (isNaN(finalAmount) || finalAmount <= 0) {
          alert('Por favor, insira um valor válido.');
          return;
      }

      executePayment(pendingPaymentData.ids, finalAmount, pendingPaymentData.title);
  };

  // Carrega detalhes completos do pedido quando clica em visualizar
  const fetchAndSetViewingOrder = async (order: any) => {
      setViewingOrder(order);
      try {
          // Busca detalhes completos, incluindo itens com links de download
          const fullOrder = await api.getOrder(order.id);
          setViewingOrder(fullOrder);
      } catch (e) {
          console.error("Erro ao carregar detalhes do pedido", e);
      }
  };

  const renderStatusBadge = (status: string, isLate: boolean) => {
      switch(status) {
          case 'paid': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">Pago</span>;
          case 'production': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wide">Em Produção</span>;
          case 'revision': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">Em Alteração</span>;
          case 'finished': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 uppercase tracking-wide">Finalizado</span>;
          case 'cancelled': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wide">Cancelado</span>;
          default: 
              if (isLate) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wide">Atrasado</span>;
              return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">Aberto</span>;
      }
  };

  const OrderProgress = ({ status, items, paidAt }: { status: string, items?: any[], paidAt?: string | null }) => {
    const stages = [
        { id: 'open', label: 'Pedido Realizado' },
        { id: 'paid', label: 'Pago' },
        { id: 'production', label: 'Em Produção' },
        { id: 'revision', label: 'Em Alteração' },
        { id: 'finished', label: 'Finalizado' }
    ];

    const getStatusIndex = (s: string) => {
        if (s === 'cancelled') return -1;
        const idx = stages.findIndex(stage => stage.id === s);
        if (idx !== -1) return idx;
        // Mapeamento de segurança
        if (s === 'open') return 0;
        if (s === 'paid') return 1;
        if (s === 'production') return 2;
        if (s === 'revision') return 3;
        if (s === 'finished') return 4;
        return 0;
    };

    const currentIndex = getStatusIndex(status);

    return (
        <div className="w-full py-8 px-2">
            <div className="relative flex justify-between">
                {/* Linha de Fundo */}
                <div className="absolute top-4 left-0 w-full h-0.5 bg-zinc-800 z-0"></div>
                {/* Linha de Progresso */}
                <div 
                    className="absolute top-4 left-0 h-0.5 bg-primary z-0 transition-all duration-700 ease-in-out"
                    style={{ width: currentIndex >= 0 ? `${(currentIndex / (stages.length - 1)) * 100}%` : '0%' }}
                ></div>

                {stages.map((stage, idx) => {
                    const isActive = idx <= currentIndex;
                    const isPaidStage = stage.id === 'paid';
                    // Regra: Pago em vermelho se estiver ativo mas não houver data de pagamento (crédito)
                    const useRed = isPaidStage && isActive && !paidAt;

                    return (
                        <div key={stage.id} className="relative z-10 flex flex-col items-center">
                            <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                    isActive 
                                        ? (useRed ? 'bg-red-600 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'bg-primary border-primary shadow-[0_0_10px_rgba(245,158,11,0.4)]')
                                        : 'bg-zinc-900 border-zinc-800'
                                }`}
                            >
                                {isActive ? (
                                    <Check size={14} className="text-white" strokeWidth={3} />
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                                )}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-tighter mt-3 text-center max-w-[70px] leading-none ${
                                isActive ? (useRed ? 'text-red-400' : 'text-white') : 'text-zinc-600'
                            }`}>
                                {stage.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-8 pb-24 relative animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div className="flex items-center gap-4">
                <Link to="/" className="p-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight font-heading leading-none">Meus Pedidos</h1>
                        {customer.isSubscriber && (
                            <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={10} /> Assinante
                            </span>
                        )}
                    </div>
                    <div className="mt-2">
                        <span className="text-zinc-500 text-sm">Gerencie seus pedidos e pagamentos</span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
                {selectedOrderIds.length > 0 ? (
                    <button 
                        onClick={() => initiatePaymentFlow(selectedOrderIds)}
                        disabled={isBatchProcessing}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <ListChecks size={18} />}
                        <span>Pagar Selecionados (R$ {selectedTotal.toFixed(2)})</span>
                    </button>
                ) : (
                    totalPayableValue > 0 && (
                        <button 
                            onClick={() => initiatePaymentFlow(allPayableOrders.map(o => o.id))}
                            disabled={isBatchProcessing}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <ListChecks size={18} />}
                            <span>Pagar Tudo (R$ {totalPayableValue.toFixed(2)})</span>
                        </button>
                    )
                )}

                {cloudUrl && (
                    isCloudLocked ? (
                        <button 
                            onClick={() => alert("O acesso à nuvem está bloqueado temporariamente devido a pendências financeiras. Por favor, regularize seus pedidos atrasados para liberar o acesso.")}
                            className="px-5 py-2.5 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-red-900/10 cursor-not-allowed opacity-90"
                        >
                            <Lock size={18} /> Nuvem
                        </button>
                    ) : (
                        <a href={cloudUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-[#1e1b4b] hover:bg-[#2e2a5b] border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-900/20">
                            <Cloud size={18} /> Nuvem
                        </a>
                    )
                )}
            </div>
        </div>

        {/* Credit Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-3 bg-gradient-to-br from-[#121215] to-[#09090b] border border-white/5 rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                <div className="absolute right-0 top-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="text-primary" size={24} /><h2 className="text-xl font-bold text-white">Limite de Crédito</h2>
                        </div>
                        <p className="text-zinc-500 text-sm">Status da conta</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Disponível</p>
                        <p className="text-3xl font-bold text-emerald-500 font-mono">R$ {Number(availableCredit).toFixed(2)}</p>
                    </div>
                </div>
                <div className="relative z-10 mt-auto pt-6">
                    <div className="flex justify-between text-xs text-zinc-400 mb-3 font-mono tracking-wide"><span>Utilizado: R$ {Number(totalOpen).toFixed(2)}</span><span>Total: R$ {Number(creditLimit).toFixed(2)}</span></div>
                    <div className="w-full h-5 bg-zinc-900/50 rounded-full overflow-hidden border border-white/5 relative">
                        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]"></div>
                        <div className="h-full bg-primary relative transition-all duration-1000 ease-out" style={{ width: `${usedPercentage}%` }}><div className="absolute top-0 right-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_white]"></div></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500"><DollarSign size={20} /></div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Em Aberto</span>
                </div>
                <div>
                    <span className="text-zinc-500 text-lg font-medium mr-1">R$</span>
                    <span className="text-4xl font-black text-white tracking-tight">{Number(totalOpen).toFixed(2)}</span>
                </div>
            </div>

            <div className={`bg-[#0c0c0e] border p-6 rounded-2xl relative overflow-hidden group transition-colors ${totalOverdueValue > 0 ? 'border-red-500/30' : 'border-white/5'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg border ${totalOverdueValue > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50'}`}><AlertTriangle size={20} /></div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Vencido</span>
                </div>
                <div>
                    <span className="text-zinc-600 text-lg font-medium mr-1">R$</span>
                    <span className={`text-4xl font-black tracking-tight ${totalOverdueValue > 0 ? 'text-zinc-300' : 'text-zinc-700'}`}>{Number(totalOverdueValue).toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Tabs and Table */}
        <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-xl mt-4">
            <div className="flex flex-col sm:flex-row border-b border-white/5 bg-[#0c0c0e]">
                <button onClick={() => setActiveTab('open')} className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'open' ? 'text-primary bg-primary/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}>Abertos{_openOrders.length > 0 && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">{_openOrders.length}</span>}{activeTab === 'open' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary shadow-[0_-2px_10px_rgba(245,158,11,0.5)]"></div>}</button>
                <button onClick={() => setActiveTab('overdue')} className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'overdue' ? 'text-red-500 bg-red-500/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}>Atrasados{_overdueOrders.length > 0 && <span className="ml-2 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full">{_overdueOrders.length}</span>}{activeTab === 'overdue' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_-2px_10px_rgba(239,68,68,0.5)]"></div>}</button>
            </div>

            <div className="overflow-x-auto pb-24">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-white/[0.02] text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-white/5">
                        <tr>
                            <th className="px-4 md:px-6 py-4 w-10">{currentTabPayableOrders.length > 0 && <input type="checkbox" checked={isAllSelected} onChange={() => {}} onClick={handleSelectAll} className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer accent-primary" title="Selecionar todos os pedidos pagáveis desta lista" />}</th>
                            <th className="px-4 md:px-6 py-4">Pedido / Info</th>
                            <th className="px-6 py-4 hidden md:table-cell">Data</th>
                            <th className="px-6 py-4 hidden md:table-cell">Vencimento</th>
                            <th className="px-6 py-4 hidden md:table-cell">Status</th>
                            <th className="px-4 md:px-6 py-4 text-right">Valor / Venc..</th>
                            <th className="px-4 md:px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {displayedOrders.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-16 text-zinc-600"><div className="flex flex-col items-center gap-2"><ListChecks size={32} className="opacity-20" /><p>Nenhum pedido nesta categoria.</p></div></td></tr>
                        ) : (
                            displayedOrders.map(order => {
                                const isLate = order.status === 'open' && new Date(order.due_date) < new Date();
                                const isSelected = selectedOrderIds.includes(order.id);
                                return (
                                    <tr key={order.id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                                        <td className="px-4 md:px-6 py-8">{['open', 'production', 'revision'].includes(order.status) && <input type="checkbox" checked={isSelected} onChange={() => {}} onClick={(e) => toggleSelectOrder(order.id, e)} className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer accent-primary" />}</td>
                                        <td className="px-4 md:px-6 py-8">
                                            <div className="font-mono text-zinc-300 font-bold text-lg">#{order.formattedOrderNumber || order.order_number}</div>
                                            <div className="md:hidden mt-2">
                                                {renderStatusBadge(order.status, isLate)}
                                            </div>
                                            <div className="text-xs text-zinc-500 max-w-[250px] truncate font-sans mt-2">{order.description || "Sem descrição"}</div>
                                        </td>
                                        <td className="px-6 py-8 hidden md:table-cell font-medium">{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td className={`px-6 py-8 hidden md:table-cell font-medium ${isLate ? 'text-red-400 font-bold' : ''}`}>{new Date(order.due_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-8 hidden md:table-cell">
                                            {renderStatusBadge(order.status, isLate)}
                                        </td>
                                        <td className="px-4 md:px-6 py-8 text-right"><div className="font-mono font-black text-white text-base md:text-xl">R$ {Number(order.total || 0).toFixed(2)}</div><div className={`md:hidden text-[10px] mt-1 font-bold ${isLate ? 'text-red-400' : 'text-zinc-500'}`}>Vence: {new Date(order.due_date).toLocaleDateString().slice(0,5)}</div></td>
                                        <td className="px-4 md:px-6 py-8 text-center">
                                            <div className="flex items-center justify-end md:justify-center gap-3">
                                                {['open', 'production', 'revision'].includes(order.status) ? (
                                                    <button onClick={() => initiatePaymentFlow([order.id])} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition font-bold inline-flex items-center gap-2 shadow-lg shadow-emerald-600/20" title="Pagar agora"><DollarSign size={14} /> <span className="hidden md:inline">Pagar</span></button>
                                                ) : <span className="hidden md:inline text-xs text-zinc-600 font-bold uppercase tracking-widest italic">Concluído</span>}
                                                <button onClick={() => fetchAndSetViewingOrder(order)} className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition border border-white/5 hover:border-zinc-700" title="Ver Detalhes"><Eye size={20} /></button>
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

        {/* MODAL FLUTUANTE DE PAGAMENTO */}
        {selectedOrderIds.length > 0 && !isBatchProcessing && (
            <div 
                className="absolute z-30 transition-all duration-300 animate-fade-in"
                style={{ 
                    top: Math.min(Math.max(floatingY - 150, 0), 1000) + 'px', 
                    right: '10px'
                }}
            >
                <div className="bg-[#121215] border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col gap-3 backdrop-blur-md w-48">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-1">
                        {selectedOrderIds.length} Selecionados
                    </div>
                    <div className="text-xl font-bold text-white font-mono mb-1">
                        R$ {selectedTotal.toFixed(2)}
                    </div>
                    <button 
                        onClick={() => initiatePaymentFlow(selectedOrderIds)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition"
                    >
                        <DollarSign size={14} /> PAGAR AGORA
                    </button>
                </div>
            </div>
        )}

        {/* MODAL SELEÇÃO DE VALOR (TOTAL VS PARCIAL) */}
        {isValueModalOpen && pendingPaymentData && (
             <div className="fixed inset-0 z-[120] flex justify-center items-start pt-12 md:pt-24 bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                <div className="bg-[#121215] border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-scale-in">
                    <div className="p-6 border-b border-zinc-800 bg-[#0c0c0e] text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <Coins size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Escolha o Valor</h2>
                        <p className="text-zinc-500 text-xs mt-1">O total do pedido é R$ {pendingPaymentData.total.toFixed(2)}</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setPaymentType('total')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentType === 'total' ? 'border-primary bg-primary/10 text-white' : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700'}`}
                            >
                                <span className="text-xs font-bold uppercase tracking-widest mb-1">Total</span>
                                <span className="text-sm font-mono">100%</span>
                            </button>
                            <button 
                                onClick={() => setPaymentType('partial')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentType === 'partial' ? 'border-primary bg-primary/10 text-white' : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700'}`}
                            >
                                <span className="text-xs font-bold uppercase tracking-widest mb-1">Entrada</span>
                                <span className="text-sm font-mono">Parte</span>
                            </button>
                        </div>

                        {paymentType === 'partial' && (
                            <div className="animate-fade-in space-y-2">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Quanto deseja pagar agora?</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                                    <input 
                                        type="text"
                                        className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white font-mono focus:border-primary outline-none text-lg"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[9px] text-zinc-600 italic">O saldo restante poderá ser pago posteriormente.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-zinc-950 flex gap-3">
                        <button onClick={() => setIsValueModalOpen(false)} className="flex-1 py-3 text-zinc-500 font-bold text-sm">Cancelar</button>
                        <button 
                            onClick={handleConfirmValueModal}
                            disabled={isBatchProcessing}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                            CONTINUAR
                        </button>
                    </div>
                </div>
             </div>
        )}

        {/* Order Details View */}
        {viewingOrder && (
            <div className="fixed inset-0 z-[100] flex justify-center items-start pt-12 md:pt-24 bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                <div className="bg-[#121215] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] animate-scale-in overflow-hidden">
                    
                    <div className="p-8 border-b border-white/5 flex justify-between items-start bg-[#0c0c0e]">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Package size={24} className="text-primary" />
                                <h2 className="text-2xl font-black text-white tracking-tighter">PEDIDO #{viewingOrder.formattedOrderNumber || viewingOrder.order_number}</h2>
                            </div>
                            <p className="text-zinc-500 text-sm font-medium">{viewingOrder.description || "Sem descrição adicional"}</p>
                        </div>
                        <button onClick={() => setViewingOrder(null)} className="p-2 bg-zinc-900 rounded-xl text-zinc-500 hover:text-white hover:rotate-90 transition-all border border-white/5"><X size={24} /></button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                        {/* Stepper de Progresso */}
                        <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-4">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-2">Status do Pedido</h3>
                            <OrderProgress status={viewingOrder.status} items={viewingOrder.items} paidAt={viewingOrder.paid_at} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-1">Data do Pedido</span>
                                <span className="text-white font-mono text-lg font-bold">{new Date(viewingOrder.order_date).toLocaleDateString()}</span>
                            </div>
                            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-1">Vencimento</span>
                                <span className={`font-mono text-lg font-bold ${new Date(viewingOrder.due_date) < new Date() && viewingOrder.status === 'open' ? 'text-red-400' : 'text-white'}`}>{new Date(viewingOrder.due_date).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {viewingOrder.size_list && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 ml-1"><ListChecks size={16} className="text-primary" /> Lista de Produção</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(typeof viewingOrder.size_list === 'string' ? JSON.parse(viewingOrder.size_list) : viewingOrder.size_list).map((item: SizeListItem, idx: number) => (
                                        <div key={idx} className="bg-zinc-900/30 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:border-primary/30 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-zinc-300 font-black text-sm uppercase">{item.size} <span className="text-zinc-500 font-bold text-[10px]">({item.category})</span></span>
                                                {!item.isSimple && <span className="text-primary font-bold text-xs uppercase mt-0.5">{item.name || '-'}</span>}
                                            </div>
                                            <div className="text-right">
                                                {item.isSimple ? (
                                                    <span className="bg-zinc-800 text-white px-3 py-1 rounded-lg font-mono font-bold text-sm">x{item.quantity}</span>
                                                ) : (
                                                    <span className="text-white font-mono font-black text-lg">{item.number ? `#${item.number}` : ''}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* LISTA DE ITENS */}
                        {viewingOrder.items && viewingOrder.items.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 ml-1"><Package size={16} className="text-primary" /> Itens do Pedido</h3>
                                <div className="bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                                    {viewingOrder.items.map((item: any, idx: number) => (
                                        <div key={idx} className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-sm">{item.name} <span className="text-primary">x{item.quantity}</span></span>
                                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{item.type === 'art' ? 'Arte Digital' : item.type === 'service' ? 'Serviço' : 'Produto'}</span>
                                            </div>
                                            {item.type === 'art' && viewingOrder.status === 'paid' && item.downloadLink ? (
                                                <a 
                                                    href={item.downloadLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-2 font-black text-xs transition shadow-lg shadow-emerald-900/20"
                                                >
                                                    <CloudDownload size={14} /> BAIXAR
                                                </a>
                                            ) : (
                                                <span className="text-white font-mono font-bold">R$ {Number(item.total).toFixed(2)}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                            <div>
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-1">Total do Pedido</span>
                                <span className="text-4xl font-black text-white tracking-tighter">R$ {Number(viewingOrder.total || 0).toFixed(2)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-2">Status Atual</span>
                                {renderStatusBadge(viewingOrder.status, new Date(viewingOrder.due_date) < new Date())}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
