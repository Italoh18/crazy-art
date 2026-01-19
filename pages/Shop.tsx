
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Wrench, Search, Star, LogIn, ShoppingCart, CheckCircle, AlertOctagon, Send, Image as ImageIcon, X, Trash2, Minus, Plus as PlusIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, Order } from '../types';

export default function Shop() {
  const [activeTab, setActiveTab] = useState<'product' | 'service'>('product');
  const { products, addOrder, orders, deleteProduct } = useData();
  const { role, currentCustomer } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // State for quantities per item
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Success Modal State
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [lastItemType, setLastItemType] = useState<'product' | 'service'>('product');

  const filteredItems = products.filter(item => {
     const itemType = item.type || 'product';
     const matchesTab = itemType === activeTab;
     const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
     return matchesTab && matchesSearch;
  });

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleOrder = async (item: Product) => {
      if (role !== 'client' || !currentCustomer) {
          setNotification({ message: 'Faça login para adicionar itens ao seu pedido.', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
          return;
      }

      const qty = quantities[item.id] || 1;
      const itemTotalPrice = item.price * qty;

      // Calculate Credit Status
      const customerOrders = orders.filter(o => o.client_id === currentCustomer.id && o.status === 'open');
      const usedCredit = customerOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const limit = currentCustomer.creditLimit || 50;
      
      if (usedCredit + itemTotalPrice > limit) {
          setNotification({ 
              message: `Limite de crédito excedido! Disponível: R$ ${(limit - usedCredit).toFixed(2)}`, 
              type: 'error' 
          });
          setTimeout(() => setNotification(null), 5000);
          return;
      }

      // Create an open order
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const newItem = await addOrder({
          client_id: currentCustomer.id,
          description: `Pedido via Loja: ${qty}x ${item.name}`,
          items: [{
              productId: item.id,
              productName: item.name,
              quantity: qty,
              unitPrice: item.price,
              total: itemTotalPrice
          }],
          total: itemTotalPrice,
          status: 'open',
          order_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
      });

      setLastOrder(newItem);
      setLastItemType(item.type || 'product');
      setSuccessModalOpen(true);
      
      // Reset quantity for this item
      setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!id) {
          alert("Este item não possui um ID válido.");
          return;
      }
      
      // Manual confirmation since context no longer handles it
      if (!window.confirm("Deseja realmente excluir este item da loja?")) {
        return;
      }

      try {
          await deleteProduct(id);
          setNotification({ message: 'Item removido com sucesso.', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
      } catch (err: any) {
          setNotification({ message: 'Erro ao excluir item: ' + err.message, type: 'error' });
          setTimeout(() => setNotification(null), 3000);
      }
  };

  const handleWhatsAppRedirect = () => {
    if (!lastOrder || !currentCustomer) return;
    const phoneNumber = '5516994142665';
    const message = lastItemType === 'service' 
      ? `pedido nº ${lastOrder.order_number} , ${lastOrder.description || 'Sem descrição'}, de ${currentCustomer.name}`
      : `arte para pedido nº ${lastOrder.order_number} , ${lastOrder.description || 'Sem descrição'}, de ${currentCustomer.name}`;

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setSuccessModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-text p-6 pb-20 relative">
      
      {notification && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in ${
              notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
              {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertOctagon size={20} />}
              <span className="font-bold text-sm">{notification.message}</span>
          </div>
      )}

      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex items-center space-x-3">
             <div className="bg-primary/10 p-2 rounded-lg">
                <ShoppingBag className="text-primary" size={24} />
             </div>
             <h1 className="text-3xl font-bold text-white tracking-tight">Loja Crazy Art</h1>
          </div>
        </div>
        
        {role === 'client' && currentCustomer && (
             <div className="bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-zinc-400">Logado como <span className="text-white font-bold">{currentCustomer.name.split(' ')[0]}</span></span>
             </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-10 space-y-6">
            <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-80 border border-zinc-800 shadow-xl relative">
                <button
                    onClick={() => setActiveTab('product')}
                    className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-widest transition-all duration-300 z-10 flex items-center justify-center gap-2 ${
                        activeTab === 'product' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <ShoppingBag size={14} /> PRODUTOS
                </button>
                <button
                    onClick={() => setActiveTab('service')}
                    className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-widest transition-all duration-300 z-10 flex items-center justify-center gap-2 ${
                        activeTab === 'service' ? 'bg-white text-black shadow-md' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <Wrench size={14} /> SERVIÇOS
                </button>
            </div>

            <div className="w-full max-w-md relative">
                <input
                  type="text"
                  placeholder={`Buscar ${activeTab === 'product' ? 'produtos' : 'serviços'}...`}
                  className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder-zinc-600"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-3.5 text-zinc-600" size={20} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
                <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition group flex flex-col shadow-lg relative">
                    <div className="h-48 bg-zinc-800 relative overflow-hidden">
                        {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition duration-700 group-hover:scale-110" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                                {activeTab === 'product' ? <ShoppingBag size={48} /> : <Wrench size={48} />}
                            </div>
                        )}
                        <div className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white border border-white/10 uppercase">
                            {activeTab === 'product' ? 'Produto' : 'Serviço'}
                        </div>
                        {role === 'admin' && (
                            <button 
                                onClick={(e) => handleDelete(e, item.id)}
                                className="absolute top-3 left-3 z-30 bg-red-600/80 hover:bg-red-600 backdrop-blur-md p-2 rounded-lg text-white border border-white/10 transition"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg text-white line-clamp-1 mb-1">{item.name}</h3>
                        <p className="text-zinc-400 text-xs mb-4 line-clamp-2 flex-1">{item.description || 'Sem descrição.'}</p>
                        
                        <div className="flex flex-col gap-4 mt-auto pt-4 border-t border-zinc-800">
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-black text-white">R$ {item.price.toFixed(2)}</span>
                                <div className="flex items-center bg-black/40 rounded-lg border border-zinc-800 p-1">
                                    <button 
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="p-1 hover:text-white text-zinc-500 transition"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold text-white">
                                        {quantities[item.id] || 1}
                                    </span>
                                    <button 
                                        onClick={() => updateQuantity(item.id, 1)}
                                        className="p-1 hover:text-white text-zinc-500 transition"
                                    >
                                        <PlusIcon size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleOrder(item)}
                                className="w-full bg-crazy-gradient text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2"
                            >
                                <ShoppingCart size={18} />
                                Adicionar ao Pedido
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {filteredItems.length === 0 && (
            <div className="text-center py-20 text-zinc-500">
                <Search className="mx-auto mb-4 opacity-20" size={64} />
                <p>Nenhum item encontrado.</p>
            </div>
        )}

        {successModalOpen && lastOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl relative p-6 text-center">
                    <button onClick={() => setSuccessModalOpen(false)} className="absolute top-3 right-3 text-zinc-500 hover:text-white"><X size={20} /></button>
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500"><CheckCircle size={32} /></div>
                    <h2 className="text-xl font-bold text-white mb-2">Pedido Realizado!</h2>
                    <p className="text-zinc-400 text-sm mb-6">Pedido <strong>#{lastOrder.formattedOrderNumber || lastOrder.order_number}</strong> criado.</p>
                    <button onClick={handleWhatsAppRedirect} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                        <Send size={18} /> Enviar via WhatsApp
                    </button>
                    <button onClick={() => setSuccessModalOpen(false)} className="mt-3 text-sm text-zinc-500 hover:text-white transition">Fechar</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
