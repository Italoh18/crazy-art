import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit2, XCircle, CheckCircle, Plus, Clock, MapPin, Phone, Mail, AlertTriangle, CreditCard, DollarSign, Trash2, Package, Wrench, MessageCircle, Image as ImageIcon, Send } from 'lucide-react';
import { Order, Product, ItemType } from '../types';

export default function CustomerDetails() {
  const { id: paramId } = useParams<{ id: string }>();
  const { role, currentCustomer: authCustomer } = useAuth();
  const targetId = role === 'client' ? authCustomer?.id : paramId;

  const { customers, orders, products, addOrder, updateOrder, updateOrderStatus, updateCustomer, addProduct } = useData();
  const [activeTab, setActiveTab] = useState<'open' | 'paid' | 'overdue'>('open');
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);

  const getToday = () => new Date().toISOString().split('T')[0];
  const getDateIn15Days = () => {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
  };

  const [orderForm, setOrderForm] = useState({
    description: '',
    requestDate: getToday(),
    dueDate: getDateIn15Days()
  });

  const [orderItems, setOrderItems] = useState<Array<{ product: Product, quantity: number }>>([]);
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentItemQty, setCurrentItemQty] = useState(1);

  const [quickProductForm, setQuickProductForm] = useState({ name: '', price: '', type: 'product' as ItemType });
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', cpf: '', street: '', number: '', zipCode: '', creditLimit: '' });

  const customer = customers.find(c => c.id === targetId);
  const customerOrders = orders.filter(o => o.customerId === targetId);

  useEffect(() => {
    if (customer && isEditModalOpen) {
      setEditForm({
        name: customer.name, phone: customer.phone, email: customer.email, cpf: customer.cpf,
        street: customer.address.street, number: customer.address.number, zipCode: customer.address.zipCode,
        creditLimit: customer.creditLimit.toString()
      });
    }
  }, [customer, isEditModalOpen]);

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    updateCustomer(customer.id, {
      name: editForm.name, phone: editForm.phone, email: editForm.email, cpf: editForm.cpf,
      address: { street: editForm.street, number: editForm.number, zipCode: editForm.zipCode },
      creditLimit: role === 'admin' ? (parseFloat(editForm.creditLimit) || 0) : customer.creditLimit
    });
    setIsEditModalOpen(false);
  };

  const handleAddItem = () => {
    const product = products.find(p => p.id === currentItemId);
    if (product && currentItemQty > 0) {
      setOrderItems([...orderItems, { product, quantity: currentItemQty }]);
      setCurrentItemId('');
      setCurrentItemQty(1);
    }
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenEditOrder = (order: Order) => {
      setEditingOrderId(order.id);
      setOrderForm({ description: order.description, requestDate: order.requestDate.split('T')[0], dueDate: order.dueDate.split('T')[0] });
      setOrderItems(order.items.map(item => ({
          product: products.find(p => p.id === item.productId) || { id: item.productId, name: item.productName, price: item.unitPrice, type: 'product' } as Product,
          quantity: item.quantity
      })));
      setIsOrderModalOpen(true);
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return;
    const total = orderItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    const orderData = {
      description: orderForm.description, requestDate: orderForm.requestDate, dueDate: orderForm.dueDate, totalValue: total,
      items: orderItems.map(item => ({ productId: item.product.id, productName: item.product.name, quantity: item.quantity, unitPrice: item.product.price, total: item.product.price * item.quantity }))
    };
    if (editingOrderId) updateOrder(editingOrderId, orderData);
    else addOrder({ customerId: customer!.id, status: 'open', ...orderData });
    setIsOrderModalOpen(false);
    setEditingOrderId(null);
  };

  const isOverdue = (order: Order) => new Date(order.dueDate) < new Date() && order.status === 'open';
  const filteredOrders = customerOrders.filter(o => {
      if (activeTab === 'overdue') return isOverdue(o);
      if (activeTab === 'open') return o.status === 'open' && !isOverdue(o);
      return o.status === 'paid';
  });

  if (!customer) return <div className="text-center p-12 text-zinc-500">Cliente não encontrado.</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
            {role === 'admin' && <Link to="/customers" className="p-2 hover:bg-zinc-800 text-zinc-400 rounded-full"><ArrowLeft size={20} /></Link>}
            <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
        </div>
        <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm border border-zinc-700"><Edit2 size={16} /><span>Editar</span></button>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center space-x-3 text-zinc-400"><Phone size={20} className="text-primary" /><span>{customer.phone}</span></div>
        <div className="flex items-center space-x-3 text-zinc-400"><Mail size={20} className="text-primary" /><span className="truncate">{customer.email}</span></div>
        <div className="col-span-1 md:col-span-2 flex items-start space-x-3 text-zinc-400"><MapPin size={20} className="mt-1 text-primary" /><span>{customer.address.street}, {customer.address.number}, CEP: {customer.address.zipCode}</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-6 rounded-xl border border-red-900/30 flex justify-between items-center">
          <div><p className="text-sm font-medium text-red-500">Em Aberto</p><p className="text-2xl font-bold text-red-500">R$ {customerOrders.filter(o => o.status === 'open').reduce((s,o) => s+o.totalValue, 0).toFixed(2)}</p></div>
          <Clock className="text-red-900/50" size={32} />
        </div>
        <div className="bg-zinc-900 p-6 rounded-xl border border-emerald-900/30 flex justify-between items-center">
          <div><p className="text-sm font-medium text-emerald-500">Total Pago</p><p className="text-2xl font-bold text-emerald-500">R$ {customerOrders.filter(o => o.status === 'paid').reduce((s,o) => s+o.totalValue, 0).toFixed(2)}</p></div>
          <CheckCircle className="text-emerald-900/50" size={32} />
        </div>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl overflow-hidden min-h-[400px]">
        <div className="flex border-b border-zinc-800">
          <button onClick={() => setActiveTab('open')} className={`flex-1 py-4 text-center font-medium ${activeTab === 'open' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/5' : 'text-zinc-500'}`}>Em Aberto</button>
          <button onClick={() => setActiveTab('overdue')} className={`flex-1 py-4 text-center font-medium ${activeTab === 'overdue' ? 'text-red-500 border-b-2 border-red-500 bg-red-500/5' : 'text-zinc-500'}`}>Em Atraso</button>
          <button onClick={() => setActiveTab('paid')} className={`flex-1 py-4 text-center font-medium ${activeTab === 'paid' ? 'text-emerald-500 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-zinc-500'}`}>Pagos</button>
        </div>
        <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-300">
                    <tr>
                        <th className="px-4 py-3">Nº Pedido / Produto</th>
                        <th className="px-4 py-3">Vencimento</th>
                        <th className="px-4 py-3">Valor</th>
                        {role === 'admin' && <th className="px-4 py-3 text-right">Ações</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {filteredOrders.length === 0 ? <tr><td colSpan={4} className="text-center py-8">Nenhum pedido.</td></tr> : (
                        filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-zinc-800/50">
                                <td className="px-4 py-3"><div className="font-bold text-primary">#{String(order.orderNumber).padStart(5, '0')}</div><div className="text-xs">{order.description}</div></td>
                                <td className="px-4 py-3"><span className={isOverdue(order) ? 'text-red-500 font-bold' : ''}>{new Date(order.dueDate).toLocaleDateString()}</span></td>
                                <td className="px-4 py-3 text-white">R$ {order.totalValue.toFixed(2)}</td>
                                {role === 'admin' && (
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        {order.status === 'open' && (
                                            <>
                                                <button onClick={() => handleOpenEditOrder(order)} className="p-1.5 bg-zinc-800 rounded text-zinc-400 hover:text-white"><Edit2 size={16} /></button>
                                                <button onClick={() => updateOrderStatus(order.id, 'paid')} className="p-1.5 bg-zinc-800 rounded text-emerald-500"><DollarSign size={16} /></button>
                                            </>
                                        )}
                                        <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="p-1.5 bg-zinc-800 rounded text-red-500"><XCircle size={16} /></button>
                                    </div>
                                </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {isOrderModalOpen && role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-surface border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-surface">
              <h2 className="text-xl font-bold text-white">{editingOrderId ? 'Editar Pedido' : 'Novo Pedido'}</h2>
              <button onClick={() => setIsOrderModalOpen(false)}><Plus size={24} className="transform rotate-45 text-zinc-500" /></button>
            </div>
            <form onSubmit={handleSaveOrder} className="p-6 space-y-4">
              <input type="text" placeholder="Descrição" className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none" value={orderForm.description} onChange={e => setOrderForm({...orderForm, description: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                  <input type="date" className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none" value={orderForm.requestDate} onChange={e => setOrderForm({...orderForm, requestDate: e.target.value})} />
                  <input type="date" className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none" value={orderForm.dueDate} onChange={e => setOrderForm({...orderForm, dueDate: e.target.value})} />
              </div>
              <div className="border-t border-zinc-800 pt-4">
                 <div className="flex gap-2 mb-4">
                    <select className="flex-1 bg-black border border-zinc-700 rounded-lg px-2 text-white outline-none" value={currentItemId} onChange={e => setCurrentItemId(e.target.value)}>
                        <option value="">Adicionar item...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (R$ {p.price})</option>)}
                    </select>
                    <input type="number" className="w-20 bg-black border border-zinc-700 rounded-lg px-2 text-white outline-none" value={currentItemQty} onChange={e => setCurrentItemQty(parseInt(e.target.value))} />
                    <button type="button" onClick={handleAddItem} className="bg-primary text-white p-2 rounded-lg"><Plus size={20} /></button>
                 </div>
                 <div className="space-y-2">
                    {orderItems.map((item, i) => (
                        <div key={i} className="flex justify-between bg-zinc-800 p-2 rounded text-sm">
                            <span className="text-white">{item.product.name} ({item.quantity}x)</span>
                            <div className="flex items-center gap-4">
                                <span className="text-zinc-400">R$ {(item.quantity * item.product.price).toFixed(2)}</span>
                                <button type="button" onClick={() => handleRemoveItem(i)} className="text-red-500"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                 </div>
              </div>
              <div className="pt-4 flex justify-between items-center border-t border-zinc-800">
                <div className="text-xl font-bold text-primary">Total: R$ {orderItems.reduce((acc, i) => acc + (i.product.price * i.quantity), 0).toFixed(2)}</div>
                <div className="flex gap-3">
                    <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-4 py-2 text-zinc-400">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg">Salvar Pedido</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}