
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Phone, Mail, MapPin, DollarSign, Calendar, 
  CheckCircle, AlertTriangle, Trash2, Edit, Plus, X, 
  Wallet, Loader2, ArrowLeft, Cloud, Clock, CreditCard
} from 'lucide-react';
import { api } from '../src/services/api';

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, orders, updateCustomer, deleteCustomer, deleteOrder, isLoading } = useData();
  const { role, currentCustomer } = useAuth();
  
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Proteção de rota
  useEffect(() => {
    if (role === 'client' && currentCustomer && id && currentCustomer.id !== id) {
       navigate('/my-area');
    }
  }, [role, currentCustomer, id, navigate]);

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center text-zinc-500">
              <Loader2 className="animate-spin mr-2" /> Carregando...
          </div>
      );
  }

  const customer = customers.find(c => c.id === id);

  if (!customer) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center text-zinc-500">
              <User size={48} className="mb-4 opacity-20" />
              <p>Cliente não encontrado.</p>
              <button onClick={() => navigate('/')} className="mt-4 text-primary hover:underline">Voltar</button>
          </div>
      );
  }

  const customerOrders = orders
    .filter(o => o.client_id === id)
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  // Cálculos Financeiros
  const totalPaid = customerOrders.filter(o => o.status === 'paid').reduce((acc, o) => acc + (o.total || 0), 0);
  const openOrders = customerOrders.filter(o => o.status === 'open');
  
  const totalOpen = openOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  
  const overdueOrders = openOrders.filter(o => {
      if (!o.due_date) return false;
      return new Date(o.due_date) < new Date();
  });
  const totalOverdue = overdueOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  // Crédito
  const creditLimit = customer.creditLimit || 50;
  const availableCredit = creditLimit - totalOpen;
  const usedPercentage = Math.min(100, (totalOpen / creditLimit) * 100);
  
  const selectedTotal = useMemo(() => {
    return customerOrders
      .filter(o => selectedOrderIds.includes(o.id))
      .reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [customerOrders, selectedOrderIds]);

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
            ? `Pedido #${customerOrders.find(o => o.id === orderIds[0])?.formattedOrderNumber} - Crazy Art`
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
          cloudLink: customer.cloudLink
      });
      setIsEditModalOpen(true);
  };

  const confirmDelete = async () => {
      if (confirm("Excluir este cliente?")) {
          await deleteCustomer(customer.id);
          navigate('/customers');
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
            
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                {/* Botão Nuvem de Arquivos (Estilo Novo) */}
                {customer.cloudLink && (
                    <a 
                        href={customer.cloudLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex-1 xl:flex-none px-6 py-3 bg-[#1e1b4b] hover:bg-[#2e2a5b] border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-900/20"
                    >
                        <Cloud size={18} /> Nuvem de Arquivos
                    </a>
                )}

                {role === 'admin' && (
                    <>
                        <button className="flex-1 xl:flex-none px-6 py-3 bg-gradient-to-r from-primary to-orange-600 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95">
                            <Plus size={18} /> Novo Pedido
                        </button>
                        <button onClick={openEditModal} className="px-6 py-3 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold">
                            <Edit size={16} /> Editar
                        </button>
                        <button onClick={confirmDelete} className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-xl transition">
                            <Trash2 size={18} />
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
            <div className={`bg-[#0c0c0e] border p-6 rounded-2xl relative overflow-hidden group transition-colors ${totalOverdue > 0 ? 'border-red-500/30' : 'border-white/5'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg border ${totalOverdue > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50'}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Vencido</span>
                </div>
                <div className="relative z-10">
                    <span className="text-zinc-600 text-lg font-medium mr-1">R$</span>
                    <span className={`text-4xl font-black tracking-tight ${totalOverdue > 0 ? 'text-zinc-300' : 'text-zinc-700'}`}>{totalOverdue.toFixed(2)}</span>
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

        {/* Orders List */}
        <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-xl mt-4">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e]">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                    Histórico de Pedidos
                </h2>
                <div className="text-xs text-zinc-500 font-mono">
                    {customerOrders.length} registros
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-white/[0.02] text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 w-10"></th>
                            <th className="px-6 py-4">Pedido</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Vencimento</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Valor</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {customerOrders.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-12 text-zinc-600">Nenhum pedido registrado.</td></tr>
                        ) : (
                            customerOrders.map(order => {
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

        {/* POP UP PAGAMENTO */}
        {selectedOrderIds.length > 1 && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-zinc-900 border border-primary/50 shadow-2xl shadow-primary/20 p-3 rounded-xl flex flex-col items-center text-center gap-2 max-w-[280px] w-full relative animate-scale-in">
                    <button 
                        onClick={() => setSelectedOrderIds([])}
                        className="absolute top-1.5 right-1.5 text-zinc-500 hover:text-white transition p-1 hover:bg-white/10 rounded-full"
                    >
                        <X size={16} />
                    </button>
                    
                    <div className="bg-primary/20 p-2 rounded-full text-primary mt-1">
                        <Wallet size={18} />
                    </div>
                    
                    <div>
                        <h3 className="text-sm font-bold text-white leading-tight">Pagamento Lote</h3>
                        <p className="text-zinc-400 text-[10px] mt-0.5">
                            <span className="text-white font-bold">{selectedOrderIds.length}</span> itens
                        </p>
                    </div>

                    <div className="bg-black/30 w-full p-2 rounded-lg border border-white/5 my-1">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Total</p>
                        <p className="text-lg font-black text-emerald-400 font-mono">R$ {selectedTotal.toFixed(2)}</p>
                    </div>

                    <button 
                        onClick={() => handlePayment(selectedOrderIds)}
                        disabled={isBatchProcessing}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isBatchProcessing ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                        {isBatchProcessing ? 'Gerando...' : 'Gerar Link'}
                    </button>
                </div>
            </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
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
