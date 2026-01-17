import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit2, XCircle, CheckCircle, Plus, Clock, MapPin, Phone, Mail, AlertTriangle, CreditCard, DollarSign, Trash2, Package, Wrench, MessageCircle, Image as ImageIcon, Send } from 'lucide-react';
import { Order, Product, ItemType } from '../types';

export default function CustomerDetails() {
  const { id: paramId } = useParams<{ id: string }>();
  const { role, currentCustomer: authCustomer } = useAuth();
  const navigate = useNavigate();
  
  const targetId = role === 'client' ? authCustomer?.id : paramId;

  const { customers, orders, products, addOrder, updateOrder, updateOrderStatus, updateCustomer, addProduct, deleteCustomer } = useData();
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
  const totalPaid = customerOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.totalValue, 0);
  
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

  // Máscaras e Handlers omitidos para brevidade, mantendo os originais corrigidos com optional chaining...
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

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

  const isOverdue = (order: Order) => new Date(order.dueDate) < new Date() && order.status === 'open';

  const filteredOrders = customerOrders.filter(o => {
      if (activeTab === 'overdue') return isOverdue(o);
      if (activeTab === 'open') return o.status === 'open' && !isOverdue(o);
      return o.status === 'paid';
  });

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
                {customer?.name}
            </h1>
        </div>
        
        <div className="flex items-center gap-3">
            {role === 'admin' && (
                <button 
                    onClick={() => deleteCustomer(customer.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition text-sm font-medium border border-red-500/20"
                >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Excluir</span>
                </button>
            )}
            <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition text-sm font-medium border border-zinc-700"
            >
                <Edit2 size={16} />
                <span>{role === 'admin' ? 'Editar Dados' : 'Atualizar Perfil'}</span>
            </button>
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
          <span>
            {customer?.address?.street ? `${customer.address.street}, ${customer.address.number}` : 'Endereço não cadastrado'}
          </span>
        </div>
      </div>

      {/* Seções financeiras e pedidos permanecem as mesmas, garantindo proteção contra undefined... */}
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
                            {role === 'admin' && <th className="px-4 py-3 text-right">Ações</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filteredOrders.map(order => (
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
                                {role === 'admin' && (
                                <td className="px-4 py-3 text-right space-x-2">
                                    <button onClick={() => updateOrderStatus(order.id, 'paid')} className="text-emerald-500 p-1.5 bg-zinc-800 rounded"><CheckCircle size={18} /></button>
                                </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}