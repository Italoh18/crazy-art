
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit2, XCircle, CheckCircle, Plus, Clock, MapPin, Phone, Mail, AlertTriangle, CreditCard, DollarSign, Trash2, Package, Wrench, MessageCircle, Image as ImageIcon, Send, X, ShoppingCart } from 'lucide-react';
import { Order, Product, ItemType } from '../types';

export default function CustomerDetails() {
  const { id: paramId } = useParams<{ id: string }>();
  const { role, currentCustomer: authCustomer } = useAuth();
  const navigate = useNavigate();
  
  const targetId = role === 'client' ? authCustomer?.id : paramId;

  const { customers, orders, products, addOrder, updateOrder, updateOrderStatus, updateCustomer, deleteCustomer } = useData();
  const [activeTab, setActiveTab] = useState<'open' | 'paid' | 'overdue'>('open');
  
  // Modals State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Helper for Date Defaulting
  const getToday = () => new Date().toISOString().split('T')[0];
  const getDateIn15Days = () => {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
  };

  // Order Header Form
  const [orderForm, setOrderForm] = useState({
    description: '',
    requestDate: getToday(),
    dueDate: getDateIn15Days()
  });

  // Order Items Staging
  const [orderItems, setOrderItems] = useState<Array<{ productId: string, productName: string, quantity: number, unitPrice: number, total: number }>>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);

  // Edit Customer Form State
  const [editForm, setEditForm] = useState({
    name: '', phone: '', email: '', cpf: '',
    street: '', number: '', zipCode: '', creditLimit: ''
  });

  const customer = customers.find(c => c.id === targetId);
  const customerOrders = orders.filter(o => o.customerId === targetId);

  // Initialize edit form when customer data is available
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

  // Totals Calculation
  const totalOpen = customerOrders.filter(o => o.status === 'open').reduce((sum, o) => sum + o.totalValue, 0);
  const creditLimit = customer?.creditLimit || 50;
  const displayUsedCredit = totalOpen;
  const creditPercentage = Math.min(100, (displayUsedCredit / creditLimit) * 100);
  const availableCredit = creditLimit - displayUsedCredit;

  if (!customer) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
            <AlertTriangle size={48} className="mb-4 opacity-20" />
            <p>Dados do cliente não carregados ou não encontrados.</p>
            <Link to="/" className="mt-4 text-primary underline">Voltar para o início</Link>
        </div>
    );
  }

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomer(customer.id, {
      name: editForm.name,
      phone: editForm.phone,
      email: editForm.email,
      cpf: editForm.cpf,
      address: {
        street: editForm.street,
        number: editForm.number,
        zipCode: editForm.zipCode
      },
      creditLimit: role === 'admin' ? parseFloat(editForm.creditLimit) : customer.creditLimit
    });
    setIsEditModalOpen(false);
  };

  const handleAddItem = () => {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const newItem = {
      productId: product.id,
      productName: product.name,
      quantity: itemQty,
      unitPrice: product.price,
      total: product.price * itemQty
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedProductId('');
    setItemQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const openEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setOrderForm({
        description: order.description,
        requestDate: order.requestDate.split('T')[0],
        dueDate: order.dueDate.split('T')[0]
    });
    setOrderItems(order.items || []);
    setIsOrderModalOpen(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalValue = orderItems.reduce((sum, item) => sum + item.total, 0);

    if (totalValue > availableCredit && role === 'client' && !editingOrderId) {
        alert(`Limite insuficiente! Seu saldo disponível é R$ ${availableCredit.toFixed(2)}`);
        return;
    }

    if (orderItems.length === 0 && !orderForm.description) {
        alert("Adicione itens ou uma descrição ao pedido.");
        return;
    }

    const orderData = {
      customerId: customer.id,
      description: orderForm.description || `Pedido de ${orderItems.map(i => i.productName).join(', ')}`,
      items: orderItems,
      totalValue: totalValue,
      status: 'open' as const,
      requestDate: orderForm.requestDate,
      dueDate: orderForm.dueDate
    };

    if (editingOrderId) {
        await updateOrder(editingOrderId, orderData);
    } else {
        await addOrder(orderData);
    }

    setIsOrderModalOpen(false);
    setEditingOrderId(null);
    setOrderItems([]);
    setOrderForm({ description: '', requestDate: getToday(), dueDate: getDateIn15Days() });
  };

  const isOverdue = (order: Order) => new Date(order.dueDate) < new Date() && order.status === 'open';

  const filteredOrders = customerOrders.filter(o => {
      if (activeTab === 'overdue') return isOverdue(o);
      if (activeTab === 'open') return o.status === 'open' && !isOverdue(o);
      return o.status === 'paid';
  });

  const headerFont = { fontFamily: '"Times New Roman", Times, serif' };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-4">
            {role === 'admin' && (
                <Link to="/customers" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
                    <ArrowLeft size={20} />
                </Link>
            )}
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                {customer?.name}
            </h1>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={() => {
                    setEditingOrderId(null);
                    setOrderItems([]);
                    setOrderForm({ description: '', requestDate: getToday(), dueDate: getDateIn15Days() });
                    setIsOrderModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-red-600 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/20 transition text-sm font-medium whitespace-nowrap"
            >
                <Plus size={16} />
                <span>Novo Pedido</span>
            </button>

            <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition text-sm font-medium border border-zinc-700 whitespace-nowrap"
            >
                <Edit2 size={16} />
                <span>{role === 'admin' ? 'Editar' : 'Perfil'}</span>
            </button>
            
            {role === 'admin' && (
                <button 
                    onClick={() => deleteCustomer(customer.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition border border-red-500/20"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center space-x-3 text-zinc-400">
          <Phone size={20} className="text-primary" />
          <span>{customer?.phone || 'Sem telefone'}</span>
        </div>
        <div className="flex items-center space-x-3 text-zinc-400">
          <Mail size={20} className="text-primary" />
          <span className="truncate">{customer?.email || 'Sem email'}</span>
        </div>
        <div className="col-span-1 md:col-span-2 flex items-start space-x-3 text-zinc-400">
          <MapPin size={20} className="mt-1 flex-shrink-0 text-primary" />
          <span className="text-sm">
            {customer?.address?.street ? `${customer.address.street}, ${customer.address.number} - CEP: ${customer.address.zipCode}` : 'Endereço não cadastrado'}
          </span>
        </div>
      </div>

      {/* Credit Section */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex justify-between items-end mb-2">
              <div>
                  <h3 className="text-white font-bold flex items-center gap-2">
                      <CreditCard size={18} /> Limite de Crédito
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">
                      Disponível: <span className={availableCredit < 0 ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>R$ {availableCredit.toFixed(2)}</span>
                  </p>
              </div>
              <div className="text-right">
                  <span className="text-xs text-zinc-500">Usado: R$ {displayUsedCredit.toFixed(2)} / R$ {creditLimit.toFixed(2)}</span>
              </div>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${creditPercentage >= 100 ? 'bg-red-600' : creditPercentage > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                style={{ width: `${Math.min(creditPercentage, 100)}%` }}
              ></div>
          </div>
      </div>

      {/* Orders Tabs */}
      <div className="bg-surface border border-zinc-800 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        <div className="flex border-b border-zinc-800 overflow-x-auto">
          {['open', 'overdue', 'paid'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-4 px-4 text-center font-medium transition whitespace-nowrap capitalize ${
                  activeTab === tab 
                    ? 'text-primary border-b-2 border-primary bg-primary/5' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'open' ? 'Em Aberto' : tab === 'overdue' ? 'Em Atraso' : 'Histórico'}
              </button>
          ))}
        </div>

        <div className="p-4">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-300">
                        <tr>
                            <th className="px-4 py-3">Pedido</th>
                            <th className="px-4 py-3">Solicitação</th>
                            <th className="px-4 py-3">Vencimento</th>
                            <th className="px-4 py-3">Total</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-zinc-600 italic">Nenhum pedido nesta categoria.</td>
                            </tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-zinc-800/50 transition">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-lg text-primary">#{String(order.orderNumber || 0).padStart(5, '0')}</div>
                                        <div className="text-xs text-zinc-500 truncate max-w-[200px]">{order.description}</div>
                                    </td>
                                    <td className="px-4 py-3">{new Date(order.requestDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <span className={isOverdue(order) ? 'text-red-500 font-bold' : ''}>
                                            {new Date(order.dueDate).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-white">R$ {order.totalValue.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {order.status === 'open' && (
                                            <button onClick={() => openEditOrder(order)} className="text-zinc-400 p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 hover:text-white" title="Editar Pedido">
                                                <Edit2 size={18} />
                                            </button>
                                        )}
                                        {role === 'admin' && order.status === 'open' && (
                                            <button onClick={() => updateOrderStatus(order.id, 'paid')} className="text-emerald-500 p-1.5 bg-zinc-800 rounded hover:bg-emerald-500/10" title="Marcar como Pago">
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* NEW/EDIT ORDER MODAL */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-surface border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-surface z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShoppingCart className="text-primary" /> {editingOrderId ? 'Editar Pedido' : 'Novo Pedido'}
                    </h2>
                    <button onClick={() => setIsOrderModalOpen(false)} className="text-zinc-500 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Descrição Geral / Observações</label>
                            <textarea 
                                className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-2 text-white outline-none focus:border-primary"
                                placeholder="Descreva detalhes do que você precisa..."
                                rows={2}
                                value={orderForm.description}
                                onChange={e => setOrderForm({...orderForm, description: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Data do Pedido</label>
                            <input type="date" value={orderForm.requestDate} readOnly className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2 text-zinc-500 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Data de Vencimento/Entrega</label>
                            <input 
                                type="date" 
                                value={orderForm.dueDate} 
                                className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-2 text-white outline-none focus:border-primary" 
                                onChange={e => setOrderForm({...orderForm, dueDate: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Plus size={18} className="text-primary" /> Adicionar Itens do Catálogo</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <div className="sm:col-span-9">
                                    <select 
                                        className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-2 text-white outline-none focus:border-primary"
                                        value={selectedProductId}
                                        onChange={e => setSelectedProductId(e.target.value)}
                                    >
                                        <option value="">Selecione um Produto ou Serviço...</option>
                                        <optgroup label="PRODUTOS" className="bg-surface text-primary">
                                            {products.filter(p => p.type === 'product' || !p.type).map(p => (
                                                <option key={p.id} value={p.id} className="text-white">{p.name} - R$ {p.price.toFixed(2)}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="SERVIÇOS" className="bg-surface text-secondary">
                                            {products.filter(p => p.type === 'service').map(p => (
                                                <option key={p.id} value={p.id} className="text-white">{p.name} - R$ {p.price.toFixed(2)}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="sm:col-span-3">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        placeholder="Qtd"
                                        className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-2 text-white outline-none" 
                                        value={itemQty} 
                                        onChange={e => setItemQty(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={handleAddItem}
                                className="w-full flex items-center justify-center gap-2 bg-zinc-800 border border-zinc-700 text-white py-2 rounded-xl hover:bg-zinc-700 transition font-bold"
                            >
                                <Plus size={18} /> Incluir no Pedido
                            </button>
                        </div>
                    </div>

                    {orderItems.length > 0 && (
                        <div className="space-y-2">
                            {orderItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                    <div>
                                        <p className="text-white font-medium">{item.productName}</p>
                                        <p className="text-xs text-zinc-500">{item.quantity}x R$ {item.unitPrice.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-primary font-bold">R$ {item.total.toFixed(2)}</span>
                                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-full"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Valor Total do Pedido</p>
                            <p className="text-3xl font-bold text-white">R$ {orderItems.reduce((sum, i) => sum + i.total, 0).toFixed(2)}</p>
                        </div>
                        <button 
                            type="submit" 
                            className="w-full sm:w-auto bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-600 transition shadow-xl"
                        >
                            {editingOrderId ? 'Salvar Alterações' : 'Finalizar Pedido'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL (EXISTING) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-surface border border-zinc-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-surface z-10">
              <h2 className="text-xl font-bold text-white">{role === 'admin' ? 'Editar Cliente' : 'Meu Perfil'}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateCustomer} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Nome Completo</label>
                    <input name="name" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Telefone</label>
                    <input name="phone" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                    <input name="email" type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-primary" />
                </div>
                {role === 'admin' && (
                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Limite de Crédito (R$)</label>
                        <input name="creditLimit" type="number" step="0.01" value={editForm.creditLimit} onChange={e => setEditForm({...editForm, creditLimit: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-primary" />
                    </div>
                )}
                <div className="col-span-full border-t border-zinc-800 pt-4"><h3 className="font-bold text-zinc-400">Endereço</h3></div>
                <div className="col-span-full">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Rua/Logradouro</label>
                    <input name="street" value={editForm.street} onChange={e => setEditForm({...editForm, street: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Número</label>
                    <input name="number" value={editForm.number} onChange={e => setEditForm({...editForm, number: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-primary" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">CEP</label>
                    <input name="zipCode" value={editForm.zipCode} onChange={e => setEditForm({...editForm, zipCode: e.target.value})} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-2 text-white outline-none focus:border-primary" />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white transition">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-amber-600 transition">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
