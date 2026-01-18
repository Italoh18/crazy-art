
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit2, CheckCircle, Plus, MapPin, Phone, Mail, CreditCard, Trash2, ShoppingCart, X, Search, Package, Wrench } from 'lucide-react';
import { Order, Product, ItemType, OrderItem } from '../types';

export default function CustomerDetails() {
  const { id: paramId } = useParams<{ id: string }>();
  const { role, currentCustomer: authCustomer } = useAuth();
  
  const targetId = role === 'client' ? authCustomer?.id : paramId;

  const { customers, orders, products, addOrder, updateOrderStatus, updateCustomer, deleteCustomer, addProduct } = useData();
  const [activeTab, setActiveTab] = useState<'open' | 'paid' | 'overdue'>('open');
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQuickRegOpen, setIsQuickRegOpen] = useState(false);

  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [showItemResults, setShowItemResults] = useState(false);

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
    due_date: getDateIn15Days()
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [itemQty, setItemQty] = useState(1);

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

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomer(customer?.id || '', {
      name: editForm.name,
      phone: editForm.phone,
      email: editForm.email,
      cpf: editForm.cpf,
      address: {
        street: editForm.street,
        number: editForm.number,
        zipCode: editForm.zipCode
      },
      creditLimit: role === 'admin' ? parseFloat(editForm.creditLimit) : customer?.creditLimit
    });
    setIsEditModalOpen(false);
  };

  const handleAddItem = (product: Product) => {
    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: itemQty,
      unitPrice: product.price,
      total: product.price * itemQty
    };
    setOrderItems([...orderItems, newItem]);
    setItemSearchTerm('');
    setShowItemResults(false);
    setItemQty(1);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);

    if (!customer?.id || total <= 0) {
        alert("Erro: Verifique o cliente e os itens do pedido.");
        return;
    }

    if (total > availableCredit && role === 'client') {
        alert(`Limite insuficiente! Seu saldo disponível é R$ ${availableCredit.toFixed(2)}`);
        return;
    }

    // Como não há coluna 'items', concatenamos os itens na descrição para não perder informação
    const itemsSummary = orderItems.map(i => `${i.quantity}x ${i.productName}`).join(', ');
    const finalDescription = `${orderForm.description}${orderForm.description ? ' | ' : ''}Itens: ${itemsSummary}`;

    const payload = {
      client_id: customer.id,
      description: finalDescription,
      order_date: orderForm.order_date,
      due_date: orderForm.due_date,
      total: total,
      status: "open"
    };

    try {
        await addOrder(payload);
        setIsOrderModalOpen(false);
        setOrderItems([]);
        setOrderForm({ description: '', order_date: getToday(), due_date: getDateIn15Days() });
    } catch (err) {
        console.error("Erro ao salvar pedido:", err);
    }
  };

  const openQuickReg = (type: ItemType) => {
      setQuickRegData({ name: itemSearchTerm, price: '', type });
      setIsQuickRegOpen(true);
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
          if (res) handleAddItem(res);
          setIsQuickRegOpen(false);
      } catch (err) { alert("Verifique os valores."); }
  };

  const totalOpen = customerOrders.filter(o => o.status === 'open').reduce((sum, o) => sum + (o.total || 0), 0);
  const creditLimit = customer?.creditLimit || 50;
  const availableCredit = creditLimit - totalOpen;
  const creditPercentage = Math.min(100, (totalOpen / creditLimit) * 100);

  const isOverdue = (order: Order) => new Date(order.due_date) < new Date() && order.status === 'open';

  const filteredOrders = customerOrders.filter(o => {
      if (activeTab === 'overdue') return isOverdue(o);
      if (activeTab === 'open') return o.status === 'open' && !isOverdue(o);
      return o.status === 'paid';
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-4">
            {role === 'admin' && (
                <Link to="/customers" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
                    <ArrowLeft size={20} />
                </Link>
            )}
            <h1 className="text-2xl font-bold text-white">{customer?.name}</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsOrderModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-red-600 text-white rounded-lg transition text-sm font-medium">
                <Plus size={16} /> Novo Pedido
            </button>
            <button onClick={() => setIsEditModalOpen(true)} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg transition text-sm font-medium">
                <Edit2 size={16} className="inline mr-2"/> {role === 'admin' ? 'Editar' : 'Perfil'}
            </button>
            {role === 'admin' && (
                <button onClick={() => deleteCustomer(customer?.id || '')} className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                    <Trash2 size={16} />
                </button>
            )}
        </div>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center space-x-3 text-zinc-400"><Phone size={18} /><span>{customer?.phone}</span></div>
        <div className="flex items-center space-x-3 text-zinc-400"><Mail size={18} /><span className="truncate">{customer?.email}</span></div>
        <div className="col-span-2 flex items-start space-x-3 text-zinc-400"><MapPin size={18} />
          <span className="text-sm">{customer?.address?.street ? `${customer.address.street}, ${customer.address.number}` : 'Sem endereço'}</span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex justify-between items-end mb-2">
              <div><h3 className="text-white font-bold flex items-center gap-2"><CreditCard size={18} /> Crédito</h3>
              <p className="text-sm text-zinc-500">Disponível: <span className="text-emerald-500 font-bold">R$ {availableCredit.toFixed(2)}</span></p></div>
              <span className="text-xs text-zinc-500">Usado: R$ {totalOpen.toFixed(2)} / R$ {creditLimit.toFixed(2)}</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${creditPercentage}%` }}></div>
          </div>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl overflow-hidden min-h-[300px]">
        <div className="flex border-b border-zinc-800">
          {['open', 'overdue', 'paid'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 capitalize ${activeTab === tab ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-zinc-500'}`}>
                {tab === 'open' ? 'Abertos' : tab === 'overdue' ? 'Atrasados' : 'Pagos'}
              </button>
          ))}
        </div>
        <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
                <thead className="text-zinc-300 border-b border-zinc-800">
                    <tr><th className="px-4 py-3">Nº Pedido</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Total</th><th className="px-4 py-3 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {filteredOrders.length === 0 ? (<tr><td colSpan={4} className="py-10 text-center">Nenhum pedido.</td></tr>) : (
                        filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-zinc-800/50">
                                <td className="px-4 py-3"><span className="text-primary font-bold">#{order.formattedOrderNumber || order.order_number}</span></td>
                                <td className="px-4 py-3">{new Date(order.order_date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 font-semibold text-white">R$ {(order.total || 0).toFixed(2)}</td>
                                <td className="px-4 py-3 text-right">
                                    {role === 'admin' && order.status === 'open' && (
                                        <button onClick={() => updateOrderStatus(order.id, 'paid')} className="text-emerald-500 p-1.5 bg-zinc-800 rounded hover:bg-emerald-500/10">
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

      {isOrderModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-surface border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-surface">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><ShoppingCart className="text-primary" /> Novo Pedido</h2>
                    <button onClick={() => setIsOrderModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                </div>
                <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Observações</label>
                            <textarea className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-2 text-white outline-none" rows={2} value={orderForm.description} onChange={e => setOrderForm({...orderForm, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Data</label>
                            <input type="date" value={orderForm.order_date} className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-2 text-white outline-none" onChange={e => setOrderForm({...orderForm, order_date: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Vencimento</label>
                            <input type="date" value={orderForm.due_date} className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-2 text-white outline-none" onChange={e => setOrderForm({...orderForm, due_date: e.target.value})} />
                        </div>
                    </div>
                    <div className="border-t border-zinc-800 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="relative flex-1">
                                <input type="text" placeholder="Buscar no catálogo..." className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-white" value={itemSearchTerm} onFocus={() => setShowItemResults(true)} onChange={e => setItemSearchTerm(e.target.value)} />
                                <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                                {showItemResults && itemSearchTerm.length > 0 && (
                                    <div className="absolute top-full left-0 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl z-50 max-h-40 overflow-y-auto">
                                        {products.filter(p => p.name.toLowerCase().includes(itemSearchTerm.toLowerCase())).map(p => (
                                            <button key={p.id} type="button" onClick={() => handleAddItem(p)} className="w-full text-left px-4 py-2 hover:bg-zinc-800 border-b border-zinc-800 last:border-0 flex justify-between">
                                                <span>{p.name}</span><span className="text-emerald-500">R$ {p.price.toFixed(2)}</span>
                                            </button>
                                        ))}
                                        {role === 'admin' && itemSearchTerm.length > 1 && (
                                            <div className="p-2 bg-black border-t border-zinc-800 flex gap-2">
                                                <button type="button" onClick={() => openQuickReg('product')} className="flex-1 text-[10px] bg-primary/10 text-primary p-1 rounded">+ Produto</button>
                                                <button type="button" onClick={() => openQuickReg('service')} className="flex-1 text-[10px] bg-secondary/10 text-secondary p-1 rounded">+ Serviço</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <input type="number" min="1" className="w-20 bg-black/50 border border-zinc-700 rounded-xl px-2 py-2 text-white" value={itemQty} onChange={e => setItemQty(parseInt(e.target.value) || 1)} />
                        </div>
                        {orderItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-zinc-900 p-3 rounded-xl mb-2 border border-zinc-800">
                                <div><p className="text-white font-medium">{item.productName}</p><p className="text-xs text-zinc-500">{item.quantity}x R$ {item.unitPrice.toFixed(2)}</p></div>
                                <div className="flex items-center gap-4"><span className="text-primary font-bold">R$ {item.total.toFixed(2)}</span>
                                <button type="button" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} className="text-red-500 p-1"><Trash2 size={16} /></button></div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex justify-between items-center">
                        <div><p className="text-zinc-500 text-xs uppercase font-bold">Total</p><p className="text-3xl font-bold text-white">R$ {orderItems.reduce((sum, i) => sum + i.total, 0).toFixed(2)}</p></div>
                        <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-600">Finalizar Pedido</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {isQuickRegOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white">Cadastro Rápido</h3>
                      <button onClick={() => setIsQuickRegOpen(false)}><X size={20}/></button>
                  </div>
                  <form onSubmit={handleQuickRegisterSubmit} className="p-6 space-y-4">
                      <input type="text" required autoFocus placeholder="Nome" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white" value={quickRegData.name} onChange={e => setQuickRegData({...quickRegData, name: e.target.value})} />
                      <input type="text" required placeholder="Preço (R$)" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white" value={quickRegData.price} onChange={e => setQuickRegData({...quickRegData, price: e.target.value})} />
                      <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl">Salvar e Adicionar</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
