import React, { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit2, XCircle, CheckCircle, Plus, Calendar, DollarSign, Clock, MapPin, Phone, Mail } from 'lucide-react';
import { Order, OrderStatus } from '../types';

export default function CustomerDetails() {
  // If we are in "my-area" route, useParams won't have ID, so we rely on context
  const { id: paramId } = useParams<{ id: string }>();
  const { role, currentCustomer: authCustomer } = useAuth();
  
  const targetId = role === 'client' ? authCustomer?.id : paramId;

  const { customers, orders, products, addOrder, updateOrderStatus } = useData();
  const [activeTab, setActiveTab] = useState<'open' | 'paid'>('open');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Helper for Date Defaulting
  const getToday = () => new Date().toISOString().split('T')[0];
  const getDateIn15Days = () => {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
  };

  // Initial Order Form State
  const [orderForm, setOrderForm] = useState({
    description: '',
    productId: '',
    quantity: 1,
    requestDate: getToday(),
    dueDate: getDateIn15Days()
  });

  const customer = customers.find(c => c.id === targetId);
  const customerOrders = orders.filter(o => o.customerId === targetId);

  // Totals
  const totalOpen = customerOrders.filter(o => o.status === 'open').reduce((sum, o) => sum + o.totalValue, 0);
  const totalPaid = customerOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.totalValue, 0);

  // Selected Product for dynamic pricing
  const selectedProduct = products.find(p => p.id === orderForm.productId);
  const currentTotal = selectedProduct ? selectedProduct.price * orderForm.quantity : 0;

  if (!customer) {
    return <div className="text-center p-12 text-zinc-500">Cliente não encontrado.</div>;
  }

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    addOrder({
      customerId: customer.id,
      description: orderForm.description,
      requestDate: orderForm.requestDate,
      dueDate: orderForm.dueDate,
      status: 'open',
      totalValue: currentTotal,
      items: [{
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: orderForm.quantity,
        unitPrice: selectedProduct.price,
        total: currentTotal
      }]
    });
    setIsOrderModalOpen(false);
    // Reset form mostly, keep dates logic
    setOrderForm({ 
        description: '', 
        productId: '', 
        quantity: 1, 
        requestDate: getToday(),
        dueDate: getDateIn15Days() 
    });
  };

  const filteredOrders = customerOrders.filter(o => 
    activeTab === 'open' ? o.status === 'open' : o.status === 'paid'
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Info */}
      <div className="flex items-center space-x-4 mb-4">
        {role === 'admin' && (
            <Link to="/customers" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
            <ArrowLeft size={20} />
            </Link>
        )}
        <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center space-x-3 text-zinc-400">
          <Phone size={20} className="text-primary" />
          <span>{customer.phone}</span>
        </div>
        <div className="flex items-center space-x-3 text-zinc-400">
          <Mail size={20} className="text-primary" />
          <span className="truncate">{customer.email}</span>
        </div>
        <div className="col-span-1 md:col-span-2 flex items-start space-x-3 text-zinc-400">
          <MapPin size={20} className="mt-1 flex-shrink-0 text-primary" />
          <span>
            {customer.address.street}, {customer.address.number}, CEP: {customer.address.zipCode}
          </span>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 p-6 rounded-xl border border-red-900/30 flex justify-between items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-red-500 mb-1">Em Aberto</p>
            <p className="text-2xl font-bold text-red-500">R$ {totalOpen.toFixed(2)}</p>
          </div>
          <Clock className="text-red-900/50 relative z-10" size={32} />
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-xl border border-emerald-900/30 flex justify-between items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-emerald-500 mb-1">Total Pago</p>
            <p className="text-2xl font-bold text-emerald-500">R$ {totalPaid.toFixed(2)}</p>
          </div>
          <CheckCircle className="text-emerald-900/50 relative z-10" size={32} />
        </div>
      </div>

      {/* Orders Section */}
      <div className="bg-surface border border-zinc-800 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('open')}
            className={`flex-1 py-4 text-center font-medium transition ${
              activeTab === 'open' 
                ? 'text-red-500 border-b-2 border-red-500 bg-red-500/5' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Pedidos em Aberto
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`flex-1 py-4 text-center font-medium transition ${
              activeTab === 'paid' 
                ? 'text-emerald-500 border-b-2 border-emerald-500 bg-emerald-500/5' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Histórico de Pagos
          </button>
        </div>

        {/* Order List */}
        <div className="p-4">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-300">
                        <tr>
                            <th className="px-4 py-3">Nº Pedido / Produto</th>
                            <th className="px-4 py-3">Data Solicitação</th>
                            <th className="px-4 py-3">Vencimento</th>
                            <th className="px-4 py-3">Valor Total</th>
                            {role === 'admin' && <th className="px-4 py-3 text-right">Ações</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filteredOrders.length === 0 ? (
                             <tr><td colSpan={role === 'admin' ? 5 : 4} className="text-center py-8 text-zinc-600">Nenhum pedido nesta categoria.</td></tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-zinc-800/50 transition">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-lg text-primary">
                                            #{String(order.orderNumber || 0).padStart(5, '0')}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                                        </div>
                                         {/* Show description as subtext if needed, or remove completely if not desired. Leaving description as small text. */}
                                        <div className="text-xs text-zinc-600 italic mt-1">
                                            {order.description}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{new Date(order.requestDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <span className={`${
                                            new Date(order.dueDate) < new Date() && order.status === 'open' ? 'text-red-500 font-bold' : ''
                                        }`}>
                                            {new Date(order.dueDate).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-white">R$ {order.totalValue.toFixed(2)}</td>
                                    {role === 'admin' && (
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {order.status === 'open' && (
                                            <>
                                                <button 
                                                    onClick={() => updateOrderStatus(order.id, 'paid')}
                                                    title="Marcar como Pago"
                                                    className="text-emerald-500 hover:text-emerald-400 p-1"
                                                >
                                                    <DollarSign size={20} />
                                                </button>
                                                <button 
                                                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                                    title="Cancelar Pedido"
                                                    className="text-red-500 hover:text-red-400 p-1"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Create Order Button - ONLY FOR ADMIN */}
      {role === 'admin' && (
      <div className="fixed bottom-6 right-6 lg:static lg:block lg:mt-6 lg:text-right">
        <button
            onClick={() => setIsOrderModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-500 to-red-600 text-white px-6 py-4 rounded-full shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition lg:w-full lg:rounded-xl"
        >
            <Plus size={24} />
            <span className="font-semibold text-lg">Novo Pedido para {customer.name.split(' ')[0]}</span>
        </button>
      </div>
      )}

       {/* New Order Modal */}
       {isOrderModalOpen && role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-surface border border-zinc-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Novo Pedido</h2>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-zinc-500 hover:text-white">
                <Plus size={24} className="transform rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              
              <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 text-sm text-zinc-400 mb-4">
                Cliente: <span className="font-semibold text-white">{customer.name}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Descrição do Pedido (Interno)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra mensal..."
                  className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={orderForm.description}
                  onChange={e => setOrderForm({...orderForm, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Data Solicitação</label>
                      <input type="date" required className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                        value={orderForm.requestDate}
                        onChange={e => setOrderForm({...orderForm, requestDate: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Data Vencimento (+15 dias)</label>
                      <input type="date" required className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                         value={orderForm.dueDate}
                         onChange={e => setOrderForm({...orderForm, dueDate: e.target.value})}
                      />
                  </div>
              </div>

              <div className="border-t border-zinc-800 pt-4 mt-2">
                 <h3 className="font-semibold text-zinc-300 mb-3">Itens do Pedido</h3>
                 <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-8">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Produto</label>
                        <select 
                            required
                            className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                            value={orderForm.productId}
                            onChange={e => setOrderForm({...orderForm, productId: e.target.value})}
                        >
                            <option value="">Selecione...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (R$ {p.price})</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-4">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Qtd.</label>
                        <input 
                            type="number" min="1" required
                            className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                            value={orderForm.quantity}
                            onChange={e => setOrderForm({...orderForm, quantity: parseInt(e.target.value) || 1})}
                        />
                    </div>
                 </div>
                 
                 {selectedProduct && (
                     <div className="mt-4 flex justify-between items-center bg-primary/10 border border-primary/20 p-4 rounded-lg">
                        <span className="text-primary">Total do Item:</span>
                        <span className="text-xl font-bold text-primary">R$ {currentTotal.toFixed(2)}</span>
                     </div>
                 )}
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition">Cancelar</button>
                <button type="submit" disabled={!selectedProduct} className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-amber-600 transition disabled:opacity-50">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}