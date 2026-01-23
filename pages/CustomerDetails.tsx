
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

  const totalSpent = customerOrders.filter(o => o.status === 'paid').reduce((acc, o) => acc + o.total, 0);
  const openDebt = customerOrders.filter(o => o.status === 'open').reduce((acc, o) => acc + o.total, 0);
  
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
                <Link to={role === 'admin' ? "/customers" : "/"} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 font-heading">
                        {customer.name}
                        {customer.cloudLink && (
                            <a href={customer.cloudLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition bg-blue-500/10 p-2 rounded-lg hover:bg-blue-500/20" title="Acessar Nuvem de Arquivos">
                                <Cloud size={20} />
                            </a>
                        )}
                    </h1>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-zinc-400">
                        <span className="flex items-center gap-1.5"><Phone size={14} className="text-primary" /> {customer.phone}</span>
                        <span className="flex items-center gap-1.5"><Mail size={14} className="text-primary" /> {customer.email || 'Sem email'}</span>
                        {customer.address?.street && (
                             <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary" /> {customer.address.street}, {customer.address.number}</span>
                        )}
                    </div>
                </div>
            </div>
            
            {role === 'admin' && (
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={openEditModal} className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg">
                        <Edit size={16} /> Editar
                    </button>
                    <button onClick={confirmDelete} className="px-4 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-xl transition flex items-center gap-2 text-sm font-bold shadow-lg">
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><DollarSign size={48} /></div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Gasto</p>
                <p className="text-3xl font-bold text-white mt-1 font-mono">R$ {totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-surface border border-zinc-800 p-6 rounded-2xl relative overflow-hidden border-l-4 border-l-amber-500 group hover:border-zinc-700 transition duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Clock size={48} /></div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Em Aberto</p>
                <p className="text-3xl font-bold text-amber-500 mt-1 font-mono">R$ {openDebt.toFixed(2)}</p>
            </div>
            <div className="bg-surface border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition duration-300">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><CreditCard size={48} /></div>
                 <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Limite de Crédito</p>
                 <div className="mt-1 flex flex-col">
                    <span className="text-3xl font-bold text-white font-mono">R$ {customer.creditLimit ? customer.creditLimit.toFixed(2) : '50.00'}</span>
                    <span className={`text-xs mt-1 font-bold ${openDebt > (customer.creditLimit || 50) ? 'text-red-500' : 'text-emerald-500'}`}>
                        Disponível: R$ {((customer.creditLimit || 50) - openDebt).toFixed(2)}
                    </span>
                 </div>
            </div>
        </div>

        {/* Orders List */}
        <div className="bg-surface border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock size={18} className="text-primary" />
                    Histórico de Pedidos
                </h2>
                <div className="text-xs text-zinc-500 font-mono">
                    {customerOrders.length} pedidos encontrados
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-900/50 text-zinc-300 font-bold uppercase text-xs tracking-wider">
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
                    <tbody className="divide-y divide-zinc-800/50">
                        {customerOrders.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-12 text-zinc-600">Nenhum pedido registrado para este cliente.</td></tr>
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
                                        <td className="px-6 py-4 font-mono text-white">
                                            #{order.formattedOrderNumber || order.order_number}
                                            <div className="text-xs text-zinc-500 max-w-[200px] truncate font-sans">{order.description}</div>
                                        </td>
                                        <td className="px-6 py-4">{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td className={`px-6 py-4 ${isLate ? 'text-red-400 font-bold' : ''}`}>{new Date(order.due_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            {order.status === 'paid' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                    <CheckCircle size={12} /> Pago
                                                </span>
                                            ) : isLate ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                                    <AlertTriangle size={12} /> Atrasado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    <Clock size={12} /> Aberto
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
                                                <span className="text-xs text-zinc-600 italic">Concluído</span>
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

        {/* POP UP PAGAMENTO - VERSÃO ULTRA COMPACTA */}
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
                <div className="bg-surface border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl relative">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Edit size={20} className="text-primary" /> Editar Cliente
                        </h2>
                        <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white hover:rotate-90 transition-transform"><X size={24} /></button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Nome Completo</label>
                            <input className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Telefone</label>
                                <input className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Limite (R$)</label>
                                <input type="number" className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition font-mono" value={formData.creditLimit || ''} onChange={e => setFormData({...formData, creditLimit: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Email</label>
                            <input className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Link Nuvem (Opcional)</label>
                            <div className="relative">
                                <input className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.cloudLink || ''} onChange={e => setFormData({...formData, cloudLink: e.target.value})} placeholder="https://..." />
                                <Cloud className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                            </div>
                        </div>
                        <div className="pt-6 flex justify-end gap-3 border-t border-zinc-800/50 mt-2">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition font-medium">Cancelar</button>
                            <button type="submit" className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-lg shadow-primary/20">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
             </div>
        )}
    </div>
  );
}
