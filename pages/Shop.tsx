import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Wrench, Search, Star, LogIn, ShoppingCart, CheckCircle, AlertOctagon, Send, Image as ImageIcon, X } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, Order } from '../types';

export default function Shop() {
  const [activeTab, setActiveTab] = useState<'product' | 'service'>('product');
  const { products, addOrder, orders } = useData();
  const { role, currentCustomer } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [lastItemType, setLastItemType] = useState<'product' | 'service'>('product');

  const filteredItems = products.filter(item => {
     const itemType = item.type || 'product';
     return itemType === activeTab && item.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleOrder = (item: Product) => {
      if (role !== 'client' || !currentCustomer) {
          setNotification({ message: 'Faça login para realizar pedidos.', type: 'error' });
          setTimeout(() => setNotification(null), 3000);
          return;
      }

      const customerOrders = orders.filter(o => o.customerId === currentCustomer.id && o.status === 'open');
      const usedCredit = customerOrders.reduce((acc, o) => acc + o.totalValue, 0);
      const limit = currentCustomer.creditLimit || 50;
      
      if (usedCredit + item.price > limit) {
          setNotification({ 
              message: `Limite excedido! Disponível: R$ ${(limit - usedCredit).toFixed(2)}`, 
              type: 'error' 
          });
          setTimeout(() => setNotification(null), 5000);
          return;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const newItem = addOrder({
          customerId: currentCustomer.id,
          description: `${item.name}`,
          items: [{
              productId: item.id,
              productName: item.name,
              quantity: 1,
              unitPrice: item.price,
              total: item.price
          }],
          totalValue: item.price,
          status: 'open',
          requestDate: new Date().toISOString(),
          dueDate: dueDate.toISOString(),
      });

      setLastOrder(newItem);
      setLastItemType(item.type || 'product');
      setSuccessModalOpen(true);
  };

  const handleWhatsAppRedirect = () => {
      if (!lastOrder || !currentCustomer) return;

      const phoneNumber = '5516994142665';
      let message = '';

      if (lastItemType === 'service') {
          message = `pedido nº ${lastOrder.orderNumber} , ${lastOrder.description}, de ${currentCustomer.name}`;
      } else {
          message = `arte para pedido nº ${lastOrder.orderNumber} , ${lastOrder.description}, de ${currentCustomer.name}`;
      }

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
             <div className="bg-primary/10 p-2 rounded-lg"><ShoppingBag className="text-primary" size={24} /></div>
             <h1 className="text-3xl font-bold text-white">Loja Crazy Art</h1>
          </div>
        </div>
        
        {role === 'client' && currentCustomer && (
             <div className="bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-zinc-400">Olá, <span className="text-white font-bold">{currentCustomer.name.split(' ')[0]}</span></span>
             </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-10 space-y-6">
            <div className="bg-zinc-900 p-1.5 rounded-full flex items-center w-80 border border-zinc-800 shadow-xl relative">
                <button onClick={() => setActiveTab('product')} className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === 'product' ? 'bg-white text-black' : 'text-zinc-500'}`}>PRODUTOS</button>
                <button onClick={() => setActiveTab('service')} className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === 'service' ? 'bg-white text-black' : 'text-zinc-500'}`}>SERVIÇOS</button>
            </div>
            <div className="w-full max-w-md relative">
                <input type="text" placeholder="Buscar..." className="w-full bg-black/50 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Search className="absolute left-3 top-3.5 text-zinc-600" size={20} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
                <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-primary/40 transition group flex flex-col">
                    <div className="h-48 bg-zinc-800 flex items-center justify-center text-zinc-700">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : (activeTab === 'product' ? <ShoppingBag size={48} /> : <Wrench size={48} />)}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg text-white mb-2">{item.name}</h3>
                        <p className="text-zinc-400 text-sm mb-4 line-clamp-2 flex-1">{item.description}</p>
                        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                            <span className="text-xl font-bold text-white">R$ {item.price.toFixed(2)}</span>
                            <button onClick={() => handleOrder(item)} className="bg-white text-black p-2.5 rounded-full hover:bg-primary hover:text-white transition"><ShoppingCart size={18} /></button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {successModalOpen && lastOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 text-center relative">
                    <button onClick={() => setSuccessModalOpen(false)} className="absolute top-3 right-3 text-zinc-500"><X size={20} /></button>
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500"><CheckCircle size={32} /></div>
                    <h2 className="text-xl font-bold text-white mb-2">Pedido Realizado!</h2>
                    <p className="text-zinc-400 text-sm mb-6">Pedido <strong>#{lastOrder.orderNumber}</strong> criado.</p>
                    <button onClick={handleWhatsAppRedirect} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                        {lastItemType === 'service' ? <Send size={18} /> : <ImageIcon size={18} />}
                        {lastItemType === 'service' ? 'Enviar Pedido via WhatsApp' : 'Enviar Arte via WhatsApp'}
                    </button>
                    <button onClick={() => setSuccessModalOpen(false)} className="mt-4 text-sm text-zinc-500">Voltar para a loja</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}