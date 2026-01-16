import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit2, XCircle, CheckCircle, Plus, Clock, MapPin, Phone, Mail, AlertTriangle, CreditCard, DollarSign, Trash2, Package, Wrench, MessageCircle, Image as ImageIcon, Send } from 'lucide-react';
import { Order, Product, ItemType } from '../types';

export default function CustomerDetails() {
  // If we are in "my-area" route, useParams won't have ID, so we rely on context
  const { id: paramId } = useParams<{ id: string }>();
  const { role, currentCustomer: authCustomer } = useAuth();
  
  const targetId = role === 'client' ? authCustomer?.id : paramId;

  const { customers, orders, products, addOrder, updateOrder, updateOrderStatus, updateCustomer, addProduct } = useData();
  const [activeTab, setActiveTab] = useState<'open' | 'paid' | 'overdue'>('open');
  
  // Modals State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);

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
  const [orderItems, setOrderItems] = useState<Array<{ product: Product, quantity: number }>>([]);
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentItemQty, setCurrentItemQty] = useState(1);

  // Quick Product Form
  const [quickProductForm, setQuickProductForm] = useState({
    name: '',
    price: '',
    type: 'product' as ItemType
  });

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
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        cpf: customer.cpf,
        street: customer.address.street,
        number: customer.address.number,
        zipCode: customer.address.zipCode,
        creditLimit: customer.creditLimit.toString()
      });
    }
  }, [customer, isEditModalOpen]);

  // Masks
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === 'cpf') value = maskCPF(value);
    if (name === 'phone') value = maskPhone(value);
    setEditForm({ ...editForm, [name]: value });
  };

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

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
      creditLimit: role === 'admin' ? (parseFloat(editForm.creditLimit) || 0) : customer.creditLimit
    });
    setIsEditModalOpen(false);
  };

  // Add Item to Staging List
  const handleAddItem = () => {
    if (currentItemId === 'CREATE_NEW') {
        setIsQuickProductModalOpen(true);
        setCurrentItemId('');
        return;
    }

    const product = products.find(p => p.id === currentItemId);
    if (product && currentItemQty > 0) {
      setOrderItems([...orderItems, { product, quantity: currentItemQty }]);
      setCurrentItemId('');
      setCurrentItemQty(1);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const handleProductSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value === 'CREATE_NEW') {
          setIsQuickProductModalOpen(true);
          // Reset select to empty to avoid showing "Create New" as selected
          setCurrentItemId(''); 
      } else {
          setCurrentItemId(value);
      }
  };

  const handleQuickProductSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!quickProductForm.name || !quickProductForm.price) return;

      const price = parseFloat(quickProductForm.price);
      
      addProduct({
          name: quickProductForm.name,
          price: price,
          type: quickProductForm.type,
          description: 'Cadastrado via Pedido Rápido'
      });

      setQuickProductForm({ name: '', price: '', type: 'product' });
      setIsQuickProductModalOpen(false);
  };

  // Prepare Edit Order Modal
  const handleOpenEditOrder = (order: Order) => {
      setEditingOrderId(order.id);
      setOrderForm({
          description: order.description,
          requestDate: order.requestDate.split('T')[0],
          dueDate: order.dueDate.split('T')[0]
      });
      
      // Reconstruct items
      const reconstructedItems = order.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
              return { product, quantity: item.quantity };
          }
          // Fallback if product deleted
          return {
              product: { id: item.productId, name: item.productName, price: item.unitPrice, type: 'product' } as Product,
              quantity: item.quantity
          };
      });
      
      setOrderItems(reconstructedItems);
      setIsOrderModalOpen(true);
  };

  const handleOpenNewOrder = () => {
      setEditingOrderId(null);
      setOrderForm({ description: '', requestDate: getToday(), dueDate: getDateIn15Days() });
      setOrderItems([]);
      setCurrentItemId('');
      setCurrentItemQty(1);
      setIsOrderModalOpen(true);
  };

  // Totals Calculation
  const totalOpen = customerOrders.filter(o => o.status === 'open').reduce((sum, o) => sum + o.totalValue, 0);
  const totalPaid = customerOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.totalValue, 0);
  
  const creditLimit = customer?.creditLimit || 50;
  // Calculate credit excluding the order currently being edited (if any)
  const editingOrderValue = editingOrderId ? (customerOrders.find(o => o.id === editingOrderId)?.totalValue || 0) : 0;
  const usedCredit = totalOpen - editingOrderValue; 
  const availableCredit = creditLimit - usedCredit;
  
  // Display total credit usage (including edited value placeholder logic)
  const displayUsedCredit = totalOpen;
  const creditPercentage = Math.min(100, (displayUsedCredit / creditLimit) * 100);

  // Current Order Staging Total
  const currentOrderTotal = orderItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  // WhatsApp Logic
  const handleWhatsAppShare = (order: Order, type: 'service' | 'art') => {
      if (!customer) return;
      
      const phoneNumber = '5516994142665';
      let message = '';

      if (type === 'service') {
          message = `pedido nº ${order.orderNumber} , ${order.description || 'Sem descrição'}, de ${customer.name}`;
      } else {
          message = `arte para pedido nº ${order.orderNumber} , ${order.description || 'Sem descrição'}, de ${customer.name}`;
      }

      const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  if (!customer) {
    return <div className="text-center p-12 text-zinc-500">Cliente não encontrado.</div>;
  }

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return;

    // Check Credit Limit
    if (usedCredit + currentOrderTotal > creditLimit) {
        if (!window.confirm(`ATENÇÃO: Este pedido excederá o limite de crédito do cliente (R$ ${creditLimit.toFixed(2)}). Deseja continuar mesmo assim?`)) {
            return;
        }
    }

    const orderData = {
      description: orderForm.description,
      requestDate: orderForm.requestDate,
      dueDate: orderForm.dueDate,
      totalValue: currentOrderTotal,
      items: orderItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        total: item.product.price * item.quantity
      }))
    };

    if (editingOrderId) {
        updateOrder(editingOrderId, orderData);
    } else {
        addOrder({
            customerId: customer.id,
            status: 'open',
            ...orderData
        });
    }
    
    setIsOrderModalOpen(false);
    // Reset Forms
    setOrderForm({ description: '', requestDate: getToday(), dueDate: getDateIn15Days() });
    setOrderItems([]);
    setCurrentItemId('');
    setCurrentItemQty(1);
    setEditingOrderId(null);
  };

  // Filter Orders
  const isOverdue = (order: Order) => new Date(order.dueDate) < new Date() && order.status === 'open';

  const filteredOrders = customerOrders.filter(o => {
      if (activeTab === 'overdue') return isOverdue(o);
      if (activeTab === 'open') return o.status === 'open' && !isOverdue(o);
      return o.status === 'paid';
  });

  // Helper to check item types in an order
  const hasService = (order: Order) => {
      // Check if any item in the order corresponds to a service product
      // We look up current product list, or we could store type in order item (not currently done)
      // We will look up by ID
      return order.items.some(item => {
          const p = products.find(prod => prod.id === item.productId);
          return p?.type === 'service';
      });
  };

  const hasProduct = (order: Order) => {
      return order.items.some(item => {
          const p = products.find(prod => prod.id === item.productId);
          return (p?.type === 'product' || !p?.type); // Default to product
      });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
            {role === 'admin' && (
                <Link to="/customers" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
                <ArrowLeft size={20} />
                </Link>
            )}
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                {customer.name}
            </h1>
        </div>
        
        {/* Edit Button */}
        <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition text-sm font-medium border border-zinc-700"
        >
            <Edit2 size={16} />
            <span>Editar Dados</span>
        </button>
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

      {/* Credit Limit Status Bar */}
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
        <div className="flex border-b border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('open')}
            className={`flex-1 py-4 px-4 text-center font-medium transition whitespace-nowrap ${
              activeTab === 'open' 
                ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/5' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Em Aberto
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`flex-1 py-4 px-4 text-center font-medium transition whitespace-nowrap ${
              activeTab === 'overdue' 
                ? 'text-red-500 border-b-2 border-red-500 bg-red-500/5' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Em Atraso
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`flex-1 py-4 px-4 text-center font-medium transition whitespace-nowrap ${
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
                                        <div className="text-xs text-zinc-600 italic mt-1">
                                            {order.description}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{new Date(order.requestDate).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <span className={`${
                                            isOverdue(order) ? 'text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded' : ''
                                        }`}>
                                            {new Date(order.dueDate).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-white">R$ {order.totalValue.toFixed(2)}</td>
                                    {role === 'admin' && (
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {/* Simplified Actions for Mobile */}
                                        <div className="flex justify-end items-center gap-2">
                                        
                                        {/* WhatsApp Actions */}
                                        {hasProduct(order) && (
                                            <button
                                                onClick={() => handleWhatsAppShare(order, 'art')}
                                                title="Enviar Arte (WhatsApp)"
                                                className="text-white hover:text-white p-1.5 bg-green-600/20 hover:bg-green-600 rounded transition"
                                            >
                                                <ImageIcon size={18} />
                                            </button>
                                        )}
                                        {hasService(order) && (
                                            <button
                                                onClick={() => handleWhatsAppShare(order, 'service')}
                                                title="Enviar Pedido (WhatsApp)"
                                                className="text-white hover:text-white p-1.5 bg-green-600/20 hover:bg-green-600 rounded transition"
                                            >
                                                <Send size={18} />
                                            </button>
                                        )}

                                        {order.status !== 'paid' && (
                                            <>
                                                {/* Edit Button */}
                                                <button 
                                                    onClick={() => handleOpenEditOrder(order)}
                                                    title="Editar Pedido"
                                                    className="text-zinc-400 hover:text-white p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 transition"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                
                                                <button 
                                                    onClick={() => updateOrderStatus(order.id, 'paid')}
                                                    title="Marcar como Pago"
                                                    className="text-emerald-500 hover:text-emerald-400 p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 transition"
                                                >
                                                    <DollarSign size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                                    title="Cancelar Pedido"
                                                    className="text-red-500 hover:text-red-400 p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 transition"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            </>
                                        )}
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
      </div>

      {/* Create Order Button - ONLY FOR ADMIN */}
      {role === 'admin' && (
      <div className="fixed bottom-6 right-6 lg:static lg:block lg:mt-6 lg:text-right">
        <button
            onClick={handleOpenNewOrder}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-500 to-red-600 text-white px-6 py-4 rounded-full shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition lg:w-full lg:rounded-xl"
        >
            <Plus size={24} />
            <span className="font-semibold text-lg">Novo Pedido para {customer.name.split(' ')[0]}</span>
        </button>
      </div>
      )}

       {/* Edit Customer Modal */}
       {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-surface border border-zinc-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-surface z-10">
              <h2 className="text-xl font-bold text-white">Editar Dados do Cliente</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white">
                <Plus size={24} className="transform rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateCustomer} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Nome Completo</label>
                    <input name="name" required value={editForm.name} onChange={handleEditInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Telefone</label>
                    <input name="phone" required placeholder="(99) 99999-9999" value={editForm.phone} onChange={handleEditInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">CPF</label>
                    <input name="cpf" required placeholder="000.000.000-00" value={editForm.cpf} onChange={handleEditInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                    <input name="email" type="email" value={editForm.email} onChange={handleEditInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                {role === 'admin' && (
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Limite de Crédito (R$)</label>
                    <input name="creditLimit" type="number" step="0.01" value={editForm.creditLimit} onChange={handleEditInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                    <p className="text-xs text-zinc-500 mt-1">Definido pelo administrador.</p>
                </div>
                )}
                <div className="col-span-1 md:col-span-2 border-t border-zinc-800 pt-4 mt-2">
                   <h3 className="font-semibold text-zinc-300 mb-4">Endereço</h3>
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Rua</label>
                    <input name="street" required value={editForm.street} onChange={handleEditInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Número</label>
                    <input name="number" required value={editForm.number} onChange={handleEditInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">CEP</label>
                    <input name="zipCode" required value={editForm.zipCode} onChange={handleEditInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-amber-600 transition">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* New/Edit Order Modal */}
       {isOrderModalOpen && role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-surface border border-zinc-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-surface z-10">
              <h2 className="text-xl font-bold text-white">
                  {editingOrderId ? 'Editar Pedido' : 'Novo Pedido'}
              </h2>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-zinc-500 hover:text-white">
                <Plus size={24} className="transform rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSaveOrder} className="p-6 space-y-4">
              
              {/* Customer Info Check */}
              <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 text-sm text-zinc-400 mb-4 flex justify-between items-center">
                <div>
                    Cliente: <span className="font-semibold text-white">{customer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <CreditCard size={14} className={availableCredit < 0 ? 'text-red-500' : 'text-emerald-500'} />
                    <span>Crédito: R$ {availableCredit.toFixed(2)}</span>
                </div>
              </div>

              {/* Order Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Descrição (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Compra mensal..."
                      className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      value={orderForm.description}
                      onChange={e => setOrderForm({...orderForm, description: e.target.value})}
                    />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Data Solicitação</label>
                      <input type="date" required className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                        value={orderForm.requestDate}
                        onChange={e => setOrderForm({...orderForm, requestDate: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Data Vencimento</label>
                      <input type="date" required className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                         value={orderForm.dueDate}
                         onChange={e => setOrderForm({...orderForm, dueDate: e.target.value})}
                      />
                  </div>
              </div>

              <div className="border-t border-zinc-800 pt-4 mt-2">
                 <h3 className="font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                     <Package size={18} /> Itens do Pedido
                 </h3>
                 
                 {/* Add Item Form */}
                 <div className="grid grid-cols-12 gap-3 mb-4 items-end bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <div className="col-span-7">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Produto / Serviço</label>
                        <select 
                            className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                            value={currentItemId}
                            onChange={handleProductSelectChange}
                        >
                            <option value="">Selecione...</option>
                            <option value="CREATE_NEW" className="text-primary font-bold">+ Cadastrar Novo Item...</option>
                            <optgroup label="Produtos">
                                {products.filter(p => p.type === 'product' || !p.type).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (R$ {p.price.toFixed(2)})</option>
                                ))}
                            </optgroup>
                            <optgroup label="Serviços">
                                {products.filter(p => p.type === 'service').map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (R$ {p.price.toFixed(2)})</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                    <div className="col-span-3">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Qtd.</label>
                        <input 
                            type="number" min="1"
                            className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                            value={currentItemQty}
                            onChange={e => setCurrentItemQty(parseInt(e.target.value) || 1)}
                        />
                    </div>
                    <div className="col-span-2">
                        <button 
                            type="button" 
                            onClick={handleAddItem}
                            className="w-full bg-primary hover:bg-amber-600 text-white rounded-lg py-2 flex items-center justify-center transition"
                            title="Adicionar Item"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                 </div>

                 {/* Items List */}
                 {orderItems.length > 0 ? (
                     <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {orderItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-zinc-800 p-2 rounded border border-zinc-700">
                                <div className="text-sm">
                                    <span className="font-medium text-white">{item.product.name}</span>
                                    <span className="text-zinc-500 text-xs ml-2">
                                        {item.quantity} x R$ {item.product.price.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-medium text-sm">
                                        R$ {(item.quantity * item.product.price).toFixed(2)}
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        className="text-red-500 hover:text-white transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                     </div>
                 ) : (
                     <div className="text-center py-4 text-zinc-600 text-sm italic">
                         Nenhum item adicionado ainda.
                     </div>
                 )}
                 
                 {/* Total Summary */}
                 <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                     <div>
                         <span className="text-zinc-400 text-sm">Total do Pedido:</span>
                         {usedCredit + currentOrderTotal > creditLimit && (
                             <div className="flex items-center gap-1 text-red-500 text-xs mt-1 animate-pulse">
                                 <AlertTriangle size={12} />
                                 <span>Excede limite!</span>
                             </div>
                         )}
                     </div>
                     <span className="text-2xl font-bold text-primary">R$ {currentOrderTotal.toFixed(2)}</span>
                 </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-zinc-800">
                <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition">Cancelar</button>
                <button 
                    type="submit" 
                    disabled={orderItems.length === 0} 
                    className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {editingOrderId ? 'Salvar Alterações' : 'Confirmar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Product Creation Modal */}
      {isQuickProductModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-surface border border-zinc-800 rounded-lg shadow-xl w-full max-w-sm">
                <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                    <h3 className="text-lg font-bold text-white">Cadastrar Rápido</h3>
                    <button onClick={() => setIsQuickProductModalOpen(false)} className="text-zinc-500 hover:text-white">
                        <XCircle size={20} />
                    </button>
                </div>
                <form onSubmit={handleQuickProductSubmit} className="p-4 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Tipo</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setQuickProductForm({...quickProductForm, type: 'product'})}
                                className={`flex-1 py-1.5 rounded text-xs font-bold border transition ${
                                    quickProductForm.type === 'product' 
                                    ? 'bg-primary text-white border-primary' 
                                    : 'bg-transparent text-zinc-500 border-zinc-700 hover:border-zinc-500'
                                }`}
                            >
                                Produto
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickProductForm({...quickProductForm, type: 'service'})}
                                className={`flex-1 py-1.5 rounded text-xs font-bold border transition ${
                                    quickProductForm.type === 'service' 
                                    ? 'bg-primary text-white border-primary' 
                                    : 'bg-transparent text-zinc-500 border-zinc-700 hover:border-zinc-500'
                                }`}
                            >
                                Serviço
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Nome</label>
                        <input 
                            autoFocus
                            required
                            className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                            value={quickProductForm.name}
                            onChange={e => setQuickProductForm({...quickProductForm, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Preço (R$)</label>
                        <input 
                            type="number"
                            step="0.01"
                            required
                            className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white outline-none"
                            value={quickProductForm.price}
                            onChange={e => setQuickProductForm({...quickProductForm, price: e.target.value})}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full mt-2 bg-zinc-100 text-black font-bold py-2 rounded-lg hover:bg-white transition"
                    >
                        Salvar e Usar
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}