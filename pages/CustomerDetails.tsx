
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit2, CheckCircle, Plus, MapPin, Phone, Mail, CreditCard, Trash2, ShoppingCart, X, Search, Package, Wrench, FileEdit, Minus, Plus as PlusIcon, AlertTriangle, Wallet, TrendingUp, Calendar, Clock, DollarSign, Loader2, CheckSquare, Square } from 'lucide-react';
import { Order, Product, ItemType, OrderItem } from '../types';
import { api } from '../src/services/api';

export default function CustomerDetails() {
  const { id: paramId } = useParams<{ id: string }>();
  const { role, currentCustomer: authCustomer } = useAuth();
  
  const targetId = role === 'client' ? authCustomer?.id : paramId;

  const { customers, orders, products, addOrder, updateOrderStatus, updateCustomer, deleteCustomer, addProduct, updateOrder, deleteOrder } = useData();
  const [activeTab, setActiveTab] = useState<'open' | 'paid' | 'overdue'>('open');
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQuickRegOpen, setIsQuickRegOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  // Estados para Seleção Múltipla
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [showItemResults, setShowItemResults] = useState(false);
  const [searchQuantities, setSearchQuantities] = useState<Record<string, number>>({});
  
  const [quickRegData, setQuickRegData] = useState({ name: '', price: '', type: 'product' as ItemType });

  const getToday = () => new Date().toISOString().split('T')[0];
  const getDateIn15Days = () => {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
  };

  const [orderForm, setOrderForm] = useState({
    description: '',
    order_date: getToday(),
    due_date: getDateIn15Days(),
    status: 'open' as any
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [editForm, setEditForm] = useState({
    name: '', phone: '', email: '', cpf: '',
    street: '', number: '', zipCode: '', creditLimit: ''
  });

  const customer = customers.find(c => c.id === targetId);
  const customerOrders = orders.filter(o => o.client_id === targetId);

  useEffect(() => {
    if (customer && isEditModalOpen) {
      setEditForm({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        cpf: customer.cpf || '',
        street: customer.address?.street || '',
        number: customer.address?.number || '',
        zipCode: customer.address?.zipCode || '',
        creditLimit: (customer.creditLimit || 0).toString()
      });
    }
  }, [customer, isEditModalOpen]);

  // Limpa seleção ao trocar de aba
  useEffect(() => {
    setSelectedOrderIds([]);
  }, [activeTab]);

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleAddItem = (product: Product) => {
    const qty = searchQuantities[product.id] || 1;
    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitPrice: product.price,
      total: product.price * qty
    };
    setOrderItems([...orderItems, newItem]);
    setItemSearchTerm('');
    setShowItemResults(false);
    setSearchQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const updateSearchQty = (id: string, delta: number) => {
    setSearchQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const openQuickReg = (type: ItemType) => {
      setQuickRegData({ name: itemSearchTerm, price: '', type });
      setIsQuickRegOpen(true);
      setShowItemResults(false);
  };

  const handleQuickRegisterSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await addProduct({
              name: quickRegData.name,
              price: parseFloat(quickRegData.price.replace(',', '.')) || 0,
              type: quickRegData.type,
              description: `Cadastrado via pedido`
          });
          if (res && res.id) handleAddItem(res);
          setIsQuickRegOpen(false);
      } catch (err) { alert("Verifique os valores."); }
  };

  const handleCreateOrUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
    if (!customer?.id || total <= 0) {
        alert("Erro: Verifique o cliente e os itens do pedido.");
        return;
    }
    if (total > availableCredit && role === 'client' && !editingOrder) {
        alert(`Limite insuficiente! Seu saldo disponível é R$ ${availableCredit.toFixed(2)}`);
        return;
    }
    const payload = {
      client_id: customer.id,
      description: orderForm.description,
      order_date: orderForm.order_date,
      due_date: orderForm.due_date,
      total: total,
      status: orderForm.status,
      items: orderItems
    };
    try {
        if (editingOrder) await updateOrder(editingOrder.id, payload);
        else await addOrder(payload);
        closeOrderModal();
    } catch (err) { console.error("Erro ao salvar pedido:", err); }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    try {
      await updateCustomer(customer.id, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        address: { street: editForm.street, number: editForm.number, zipCode: editForm.zipCode },
        creditLimit: parseFloat(editForm.creditLimit) || customer.creditLimit
      });
      setIsEditModalOpen(false);
    } catch (err: any) { alert("Erro ao atualizar cliente: " + err.message); }
  };

  const openOrderEdit = async (order: Order) => {
      try {
          const res = await fetch(`/api/orders?id=${order.id}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, 'Cache-Control': 'no-cache' }
          });
          const detailedOrder = await res.json();
          setEditingOrder(detailedOrder);
          setOrderForm({
              description: detailedOrder.description || '',
              order_date: detailedOrder.order_date,
              due_date: detailedOrder.due_date,
              status: detailedOrder.status
          });
          const mappedItems = (detailedOrder.items || []).map((i: any) => ({
              productId: i.catalog_id || i.item_id || i.productId,
              productName: i.name || i.description || i.productName,
              quantity: i.quantity,
              unitPrice: i.price || i.unit_price || i.unitPrice,
              total: i.subtotal || i.total
          }));
          setOrderItems(mappedItems);
          setIsOrderModalOpen(true);
      } catch (e) { alert("Erro ao carregar detalhes do pedido."); }
  };

  const closeOrderModal = () => {
      setIsOrderModalOpen(false);
      setEditingOrder(null);
      setOrderItems([]);
      setOrderForm({ description: '', order_date: getToday(), due_date: getDateIn15Days(), status: 'open' });
  };

  const isOverdue = (order: Order) => {
      if (!order.due_date || order.status !== 'open') return false;
      return new Date(order.due_date) < new Date();
  };

  // Pagamento Individual ou em Lote
  const handlePayment = async (orderIds: string[]) => {
    if (!customer || orderIds.length === 0) return;
    
    const isBatch = orderIds.length > 1;
    if (isBatch) setIsBatchProcessing(true);
    else setPayingOrderId(orderIds[0]);
    
    try {
        const selectedOrders = customerOrders.filter(o => orderIds.includes(o.id));
        const totalAmount = selectedOrders.reduce((sum, o) => sum + o.total, 0);
        
        let title = '';
        if (isBatch) {
            title = `Pagamento Lote (${selectedOrders.length} pedidos) - Crazy Art`;
        } else {
            const o = selectedOrders[0];
            title = `Pedido #${o.formattedOrderNumber || o.order_number} - Crazy Art`;
        }

        const res = await api.createPayment({
            orderId: orderIds.join(','), 
            title: title,
            amount: totalAmount,
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
        setPayingOrderId(null);
    }
  };

  const totalOpen = customerOrders.filter(o => o.status === 'open').reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOverdue = customerOrders.filter(o => o.status === 'open' && isOverdue(o)).reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPaid = customerOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + (o.total || 0), 0);

  const creditLimit = customer?.creditLimit || 50;
  const availableCredit = creditLimit - totalOpen;
  const creditPercentage = Math.min(100, (totalOpen / creditLimit) * 100);

  const filteredOrders = customerOrders.filter(o => {
      if (activeTab === 'overdue') return isOverdue(o);
      if (activeTab === 'open') return o.status === 'open' && !isOverdue(o);
      return o.status === 'paid';
  });

  const selectedTotal = customerOrders
    .filter(o => selectedOrderIds.includes(o.id))
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-8 pb-20 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 animate-fade-in-up">
        <div className="flex items-center space-x-4">
            {role === 'admin' && (
                <Link to="/customers" className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition hover:scale-105">
                    <ArrowLeft size={20} />
                </Link>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white font-heading">{customer?.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-mono tracking-wider uppercase">ID: {customer?.id.slice(0, 8)}</span>
              </div>
            </div>
        </div>
        <div className="flex items-center gap-3">
            {role === 'admin' && (
                <button 
                  onClick={() => setIsOrderModalOpen(true)} 
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 hover:scale-105 transition-all text-sm font-bold tracking-wide"
                >
                    <Plus size={18} /> Novo Pedido
                </button>
            )}
            <button 
              onClick={() => setIsEditModalOpen(true)} 
              className="px-5 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800 hover:text-white transition-all text-sm font-bold flex items-center gap-2 hover:border-zinc-700"
            >
                <Edit2 size={16} /> {role === 'admin' ? 'Editar' : 'Perfil'}
            </button>
            {role === 'admin' && (
                <button 
                  onClick={() => deleteCustomer(customer?.id || '')} 
                  className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                >
                    <Trash2 size={18} />
                </button>
            )}
        </div>
      </div>

      {/* DASHBOARD FINANCEIRO HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border border-white/10 p-6 rounded-2xl relative overflow-hidden group shadow-xl">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock size={20} /></div>
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]">Em Aberto</p>
                </div>
                <div className="flex items-baseline gap-1">
                    <p className={`text-4xl font-black font-heading tracking-tight ${totalOpen > 0 ? 'text-white' : 'text-zinc-600'}`}>
                        <span className="text-lg align-top text-zinc-500 mr-1 font-sans font-medium">R$</span>
                        {totalOpen.toFixed(2)}
                    </p>
                </div>
              </div>
          </div>

          <div className={`bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border p-6 rounded-2xl relative overflow-hidden group shadow-xl transition-all duration-500 ${totalOverdue > 0 ? 'border-red-500/30 shadow-red-900/10' : 'border-white/10'}`}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                   <div className={`p-2 rounded-lg border ${totalOverdue > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}><AlertTriangle size={20} /></div>
                   <p className={`text-xs font-bold uppercase tracking-[0.2em] ${totalOverdue > 0 ? 'text-red-400' : 'text-zinc-400'}`}>Vencido</p>
                </div>
                <div className="flex items-baseline gap-1">
                    <p className={`text-4xl font-black font-heading tracking-tight ${totalOverdue > 0 ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'text-zinc-600'}`}>
                        <span className="text-lg align-top text-zinc-500 mr-1 font-sans font-medium">R$</span>
                        {totalOverdue.toFixed(2)}
                    </p>
                </div>
              </div>
          </div>

           <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border border-white/10 p-6 rounded-2xl relative overflow-hidden group shadow-xl">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle size={20} /></div>
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]">Total Pago</p>
                </div>
                <div className="flex items-baseline gap-1">
                    <p className="text-4xl font-black font-heading tracking-tight text-emerald-400">
                        <span className="text-lg align-top text-zinc-500 mr-1 font-sans font-medium">R$</span>
                        {totalPaid.toFixed(2)}
                    </p>
                </div>
              </div>
          </div>
      </div>

      {/* ÁREA DE INFORMAÇÕES DO CLIENTE E LIMITE DE CRÉDITO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
         {/* Info Card */}
         <div className="glass-panel rounded-2xl p-6 relative group">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Informações de Contato</h3>
            <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="bg-zinc-900 p-2 rounded-lg text-zinc-400"><Phone size={18} /></div>
                    <span className="text-zinc-200 font-mono text-sm">{customer?.phone}</span>
                </div>
                <div className="flex items-center space-x-4 p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="bg-zinc-900 p-2 rounded-lg text-zinc-400"><Mail size={18} /></div>
                    <span className="text-zinc-200 font-mono text-sm truncate">{customer?.email}</span>
                </div>
                <div className="flex items-start space-x-4 p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                    <div className="bg-zinc-900 p-2 rounded-lg text-zinc-400"><MapPin size={18} /></div>
                    <span className="text-zinc-200 text-sm">{customer?.address?.street ? `${customer.address.street}, ${customer.address.number}` : 'Sem endereço'}</span>
                </div>
            </div>
         </div>

         {/* Credit Card (Barra de Progresso) */}
         <div className="lg:col-span-2 glass-panel rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between group">
             <div className="absolute right-0 top-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
             
             <div className="relative z-10 flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-white font-bold flex items-center gap-2 text-xl font-heading"><CreditCard size={24} className="text-primary" /> Limite de Crédito</h3>
                    <p className="text-sm text-zinc-400 mt-1">Status da conta</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Disponível</p>
                    <p className="text-2xl font-bold text-emerald-400">R$ {availableCredit.toFixed(2)}</p>
                 </div>
             </div>

             <div className="relative z-10">
                <div className="flex justify-between text-xs text-zinc-400 mb-2 font-mono">
                    <span>Utilizado: R$ {totalOpen.toFixed(2)}</span>
                    <span>Total: R$ {creditLimit.toFixed(2)}</span>
                </div>
                <div className="w-full h-4 bg-zinc-900 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                    <div className="absolute inset-0 w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]"></div>
                    
                    <div 
                        className={`h-full transition-all duration-1000 ease-out shadow-lg relative ${creditPercentage > 90 ? 'bg-gradient-to-r from-red-600 to-red-500' : 'bg-gradient-to-r from-primary to-amber-500'}`} 
                        style={{ width: `${creditPercentage}%` }}
                    >
                        <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_white]"></div>
                    </div>
                </div>
             </div>
         </div>
      </div>

      {/* TABELA DE PEDIDOS COM ROLAGEM E SELEÇÃO */}
      <div className="glass-panel rounded-2xl overflow-hidden min-h-[400px] border border-white/5 animate-fade-in-up shadow-2xl relative">
        <div className="flex border-b border-white/5 bg-black/20">
          {['open', 'overdue', 'paid'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-4 text-sm font-bold tracking-widest uppercase transition-all relative ${activeTab === tab ? 'text-white bg-white/5' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}>
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary"></div>}
                {tab === 'open' ? 'Abertos' : tab === 'overdue' ? 'Atrasados' : 'Histórico'}
              </button>
          ))}
        </div>

        <div className="p-0 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-zinc-400 min-w-[700px]">
                <thead className="bg-zinc-900/50 text-zinc-500 border-b border-white/5 uppercase text-xs font-bold tracking-wider">
                    <tr>
                        <th className="px-4 py-4 w-10">
                            {activeTab !== 'paid' && (
                                <button onClick={toggleSelectAll} className="p-1 hover:text-white transition">
                                    {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0 ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                                </button>
                            )}
                        </th>
                        <th className="px-6 py-4 font-mono">ID</th>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Descrição</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredOrders.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-20 text-center text-zinc-600">
                                <Package size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Nenhum pedido encontrado.</p>
                            </td>
                        </tr>
                    ) : (
                        filteredOrders.map((order, idx) => (
                            <tr key={order.id} className={`hover:bg-white/[0.02] transition-colors group animate-fade-in ${selectedOrderIds.includes(order.id) ? 'bg-primary/5' : ''}`}>
                                <td className="px-4 py-4">
                                    {activeTab !== 'paid' && (
                                        <button onClick={() => toggleSelectOrder(order.id)} className="p-1 hover:text-white transition">
                                            {selectedOrderIds.includes(order.id) ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                                        </button>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-primary font-bold font-mono bg-primary/10 px-2 py-1 rounded border border-primary/20">#{order.formattedOrderNumber || order.order_number}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-zinc-600" />
                                        {order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 max-w-xs truncate text-zinc-300">{order.description || 'Sem descrição'}</td>
                                <td className="px-6 py-4 font-bold text-white font-mono">R$ {Number(order.total || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        {role === 'client' && order.status === 'open' && (
                                            <button onClick={() => handlePayment([order.id])} disabled={payingOrderId === order.id} className="text-white p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition shadow-lg disabled:opacity-50">
                                                {payingOrderId === order.id ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                                            </button>
                                        )}
                                        {role === 'admin' && (
                                            <>
                                                <button onClick={() => openOrderEdit(order)} className="text-zinc-400 p-2 hover:bg-white/10 rounded-lg hover:text-white transition"><FileEdit size={16} /></button>
                                                <button onClick={() => deleteOrder(order.id)} className="text-zinc-400 p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition"><Trash2 size={16} /></button>
                                                {order.status === 'open' && <button onClick={() => updateOrderStatus(order.id, 'paid')} className="text-emerald-500 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition hover:scale-110 shadow-lg"><CheckCircle size={16} /></button>}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* POP UP CENTRALIZADO DE PAGAMENTO EM LOTE */}
        {selectedOrderIds.length > 1 && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-zinc-900 border border-primary/50 shadow-2xl shadow-primary/20 p-8 rounded-3xl flex flex-col items-center text-center gap-6 max-w-sm w-full animate-scale-in">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <CreditCard size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Pagamento em Lote</h3>
                        <p className="text-zinc-400 text-sm">{selectedOrderIds.length} faturas selecionadas</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1">Total a Pagar</span>
                        <span className="text-3xl font-black text-white">R$ {selectedTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col w-full gap-3">
                        <button 
                            onClick={() => handlePayment(selectedOrderIds)} 
                            disabled={isBatchProcessing}
                            className="w-full bg-crazy-gradient text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition disabled:opacity-50"
                        >
                            {isBatchProcessing ? <Loader2 size={18} className="animate-spin" /> : <DollarSign size={18} />}
                            Confirmar e Pagar
                        </button>
                        <button 
                            onClick={() => setSelectedOrderIds([])}
                            className="w-full py-3 text-zinc-500 hover:text-white transition text-sm font-medium"
                        >
                            Cancelar Seleção
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Modais de Edição e Pedido */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-scale-in">
            <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                <div className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-[#121215]/95 backdrop-blur z-20">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3 font-heading">
                        <div className="bg-primary/20 p-2 rounded-lg text-primary"><ShoppingCart size={20} /></div>
                        {editingOrder ? `Editar Pedido #${editingOrder.formattedOrderNumber || editingOrder.order_number}` : 'Novo Pedido'}
                    </h2>
                    <button onClick={closeOrderModal} className="text-zinc-500 hover:text-white transition-transform hover:rotate-90 p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleCreateOrUpdateOrder} className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full">
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Descrição do Pedido</label>
                            <textarea 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition resize-none placeholder-zinc-700" 
                                rows={2} 
                                value={orderForm.description} 
                                onChange={e => setOrderForm({...orderForm, description: e.target.value})} 
                                placeholder="Ex: Cartões de visita e Banner"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Data do Pedido</label>
                            <input type="date" value={orderForm.order_date} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" onChange={e => setOrderForm({...orderForm, order_date: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Vencimento</label>
                            <input type="date" value={orderForm.due_date} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" onChange={e => setOrderForm({...orderForm, due_date: e.target.value})} />
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Package size={16} className="text-primary" /> Itens do Pedido
                            </h3>
                        </div>
                        <div className="relative mb-6 group">
                            <input type="text" placeholder="Buscar produto ou serviço..." className="relative w-full bg-black/60 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition" value={itemSearchTerm} onFocus={() => setShowItemResults(true)} onChange={e => setItemSearchTerm(e.target.value)} />
                            <Search className="absolute left-4 top-4.5 text-zinc-500" size={20} />
                            {showItemResults && itemSearchTerm.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-[#18181b] border border-white/10 rounded-xl z-50 max-h-60 overflow-y-auto shadow-2xl">
                                    {products.filter(p => p.name.toLowerCase().includes(itemSearchTerm.toLowerCase())).map(p => (
                                        <div key={p.id} className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 flex items-center justify-between gap-4 transition-colors">
                                            <div className="flex-1"><p className="text-white font-bold text-sm">{p.name}</p><p className="text-xs text-primary font-mono mt-0.5">R$ {p.price.toFixed(2)}</p></div>
                                            <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-lg border border-white/5">
                                                <button type="button" onClick={() => updateSearchQty(p.id, -1)} className="p-1 text-zinc-500 hover:text-white transition"><Minus size={14} /></button>
                                                <span className="w-8 text-center text-xs font-bold text-white font-mono">{searchQuantities[p.id] || 1}</span>
                                                <button type="button" onClick={() => updateSearchQty(p.id, 1)} className="p-1 text-zinc-500 hover:text-white transition"><PlusIcon size={14} /></button>
                                            </div>
                                            <button type="button" onClick={() => handleAddItem(p)} className="bg-primary text-white p-2.5 rounded-lg hover:bg-amber-600 transition"><Plus size={16} /></button>
                                        </div>
                                    ))}
                                    {role === 'admin' && (
                                        <div className="p-3 bg-black/50 border-t border-white/10 flex gap-2">
                                            <button type="button" onClick={() => openQuickReg('product')} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-xs text-zinc-300 rounded-lg flex items-center justify-center gap-2 transition"><Package size={14} /> Criar Produto</button>
                                            <button type="button" onClick={() => openQuickReg('service')} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-xs text-zinc-300 rounded-lg flex items-center justify-center gap-2 transition"><Wrench size={14} /> Criar Serviço</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {orderItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5 hover:border-white/10 transition group">
                                    <div className="flex-1"><p className="text-white font-bold text-sm">{item.productName}</p><p className="text-xs text-zinc-500 mt-1 font-mono">{item.quantity}x <span className="text-zinc-400">R$ {Number(item.unitPrice).toFixed(2)}</span></p></div>
                                    <div className="flex items-center gap-6"><span className="text-white font-bold text-sm font-mono">R$ {Number(item.total).toFixed(2)}</span><button type="button" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} className="text-zinc-600 p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-zinc-900 to-black p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-center mt-6 shadow-xl relative overflow-hidden">
                        <div className="relative z-10 mb-4 sm:mb-0 text-center sm:text-left">
                            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-1">Total Geral</p>
                            <p className="text-4xl font-black text-white font-heading tracking-tight">R$ {orderItems.reduce((sum, i) => sum + Number(i.total || 0), 0).toFixed(2)}</p>
                        </div>
                        <button type="submit" className="relative z-10 bg-crazy-gradient text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-all text-sm uppercase tracking-wider w-full sm:w-auto">{editingOrder ? 'Salvar Alterações' : 'Finalizar Pedido'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Modal de Cadastro Rápido de Item */}
      {isQuickRegOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                      <h3 className="text-md font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                          <Plus size={16} className="text-primary" /> 
                          Novo {quickRegData.type === 'product' ? 'Produto' : 'Serviço'}
                      </h3>
                      <button onClick={() => setIsQuickRegOpen(false)} className="text-zinc-500 hover:text-white"><X size={18}/></button>
                  </div>
                  <form onSubmit={handleQuickRegisterSubmit} className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Nome</label>
                        <input type="text" required autoFocus className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" value={quickRegData.name} onChange={e => setQuickRegData({...quickRegData, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Preço (R$)</label>
                        <input type="text" required placeholder="0.00" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition font-mono" value={quickRegData.price} onChange={e => setQuickRegData({...quickRegData, price: e.target.value})} />
                      </div>
                      <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition shadow-lg">Salvar e Adicionar</button>
                  </form>
              </div>
          </div>
      )}

      {/* Modal de Edição de Dados do Cliente */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-scale-in">
            <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-[#121215]/95 backdrop-blur z-20">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 font-heading">
                        <Edit2 className="text-primary" size={20} /> 
                        Editar Dados
                    </h2>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white transition-transform hover:rotate-90"><X size={20} /></button>
                </div>
                <form onSubmit={handleUpdateCustomer} className="p-8 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="col-span-full">
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nome</label>
                            <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Telefone</label>
                            <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Email</label>
                            <input type="email" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Rua</label>
                            <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" value={editForm.street} onChange={e => setEditForm({...editForm, street: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Número</label>
                            <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" value={editForm.number} onChange={e => setEditForm({...editForm, number: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">CEP</label>
                            <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" value={editForm.zipCode} onChange={e => setEditForm({...editForm, zipCode: e.target.value})} />
                        </div>
                        {role === 'admin' && (
                            <div className="col-span-full">
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Limite de Crédito</label>
                                <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition" value={editForm.creditLimit} onChange={e => setEditForm({...editForm, creditLimit: e.target.value})} />
                            </div>
                        )}
                    </div>
                    <div className="pt-6 flex justify-end gap-3 border-t border-white/10 mt-4">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition font-medium">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-600 transition shadow-lg shadow-primary/20">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
