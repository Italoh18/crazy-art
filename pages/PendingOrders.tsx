
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  CheckCircle, Clock, AlertTriangle, Eye, Edit, 
  Trash2, Search, Filter, Layers, Package, User, 
  ArrowRight, X, ListChecks, Download, Check, ShoppingBag, Truck, Box
} from 'lucide-react';
import { Order, SizeListItem, ProductionStatus } from '../types';

export default function PendingOrders() {
  const { orders, updateOrder, deleteOrder } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  /**
   * REGRAS PARA FILA DE PRODUÇÃO:
   * 1. Pedido não cancelado.
   * 2. ORIGEM: Loja (source === 'shop').
   * 3. Agora gerenciamos o PRODUCTION_STATUS.
   */
  const pendingOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'cancelled') return false;
      return o.source === 'shop';
    }).sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
  }, [orders]);

  const filtered = pendingOrders.filter(o => 
    (o.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.formattedOrderNumber || '').includes(searchTerm)
  );

  const handleUpdateProductionStatus = async (orderId: string, newStatus: ProductionStatus) => {
      await updateOrder(orderId, { production_status: newStatus });
      // Se for entregue, talvez queira marcar como 'is_confirmed = 1' também para lógica legado
      if (newStatus === 'delivered') {
          await updateOrder(orderId, { is_confirmed: 1, production_status: 'delivered' });
      } else {
          // Se voltar status, garante que is_confirmed é 0
          await updateOrder(orderId, { is_confirmed: 0, production_status: newStatus });
      }
      if (viewingOrder?.id === orderId) {
          setViewingOrder(prev => prev ? ({...prev, production_status: newStatus}) : null);
      }
  };

  const getStatusColor = (status: ProductionStatus) => {
      switch(status) {
          case 'placed': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
          case 'production': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
          case 'shipping': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
          case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
          default: return 'bg-zinc-800';
      }
  };

  const getStatusLabel = (status: ProductionStatus) => {
      switch(status) {
          case 'placed': return 'Aguardando';
          case 'production': return 'Em Produção';
          case 'shipping': return 'Enviando';
          case 'delivered': return 'Entregue';
          default: return status;
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight font-heading">Fila de Produção</h1>
           <p className="text-zinc-400 text-sm mt-1">Gerencie o fluxo de produção dos pedidos da loja.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-primary font-black text-2xl">{pendingOrders.length}</span>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-tight">Pedidos da<br/>Loja</span>
        </div>
      </div>

      <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou nº do pedido..." 
            className="w-full bg-[#121215] border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-primary outline-none transition shadow-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                  <ShoppingBag size={64} className="mx-auto text-zinc-800 mb-4 opacity-20" />
                  <p className="text-zinc-600 font-medium">Nenhum pedido da loja na fila no momento.</p>
              </div>
          ) : (
              filtered.map(order => (
                  <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-primary/30 transition-all group relative overflow-hidden shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 group-hover:border-primary/50 transition shadow-inner">
                             <ShoppingBag size={24} className="text-primary" />
                          </div>
                          <div className="text-right">
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${getStatusColor(order.production_status || 'placed')}`}>
                                  {getStatusLabel(order.production_status || 'placed')}
                              </span>
                              <p className="text-white font-mono font-bold mt-2">#{order.formattedOrderNumber}</p>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div>
                              <h3 className="text-lg font-bold text-white truncate">{order.client_name}</h3>
                              <p className="text-zinc-500 text-xs line-clamp-1">{order.description}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                             {order.size_list && (
                                 <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-blue-500/20 flex items-center gap-1">
                                     <ListChecks size={12} /> POSSUI LISTA
                                 </span>
                             )}
                             <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${order.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                 {order.status === 'paid' ? 'PAGO' : 'AGUARD. PGTO'}
                             </span>
                          </div>

                          <div className="pt-4 border-t border-zinc-800 flex gap-2">
                              <button onClick={() => setViewingOrder(order)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2">
                                  <Eye size={14} /> GERENCIAR
                              </button>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Modal Detalhes e Controle de Status */}
      {viewingOrder && (
          <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-start justify-center pt-12 md:pt-24 p-4 animate-fade-in overflow-y-auto">
              <div className="bg-[#121215] border border-zinc-800 w-full max-w-2xl max-h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary"><Package size={20} /></div>
                        <h3 className="text-xl font-bold text-white">Controle #{viewingOrder.formattedOrderNumber}</h3>
                      </div>
                      <button onClick={() => setViewingOrder(null)} className="p-2 text-zinc-500 hover:text-white transition"><X size={24} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                      
                      {/* Controle de Status */}
                      <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Atualizar Status de Produção</h4>
                          <div className="grid grid-cols-4 gap-2">
                              {[
                                  { id: 'placed', label: 'Realizado', icon: Clock },
                                  { id: 'production', label: 'Produção', icon: Layers },
                                  { id: 'shipping', label: 'Envio', icon: Truck },
                                  { id: 'delivered', label: 'Entregue', icon: CheckCircle }
                              ].map((status) => (
                                  <button
                                    key={status.id}
                                    onClick={() => handleUpdateProductionStatus(viewingOrder.id, status.id as ProductionStatus)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                        viewingOrder.production_status === status.id 
                                        ? 'bg-primary text-white border-primary shadow-lg scale-105' 
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                    }`}
                                  >
                                      <status.icon size={20} className="mb-2" />
                                      <span className="text-[10px] font-bold uppercase">{status.label}</span>
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-2 ml-1">Observações</span>
                              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-zinc-300 text-sm leading-relaxed italic min-h-[80px]">
                                  "{viewingOrder.description || 'Sem observações.'}"
                              </div>
                          </div>
                          <div>
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-2 ml-1">Cliente</span>
                              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 text-white font-bold flex items-center gap-3">
                                  <User size={18} className="text-primary" />
                                  {viewingOrder.client_name}
                              </div>
                          </div>
                      </div>

                      {viewingOrder.size_list && (
                          <div>
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-4 ml-1">Lista de Produção</span>
                              <div className="overflow-x-auto border border-zinc-800 rounded-2xl">
                                  <table className="w-full text-left text-xs text-zinc-400">
                                      <thead className="bg-zinc-950 border-b border-zinc-800">
                                          <tr>
                                              <th className="p-3 uppercase">Categoria</th>
                                              <th className="p-3 uppercase">Tam</th>
                                              <th className="p-3 uppercase text-center">Nº</th>
                                              <th className="p-3 uppercase">Nome</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-800/50">
                                          {(typeof viewingOrder.size_list === 'string' ? JSON.parse(viewingOrder.size_list) : viewingOrder.size_list).map((item: SizeListItem) => (
                                              <tr key={item.id} className="hover:bg-white/[0.02]">
                                                  <td className="p-3">{item.category}</td>
                                                  <td className="p-3 font-bold text-white">{item.size}</td>
                                                  <td className="p-3 text-center">{item.isSimple ? '-' : item.number}</td>
                                                  <td className="p-3 font-bold uppercase text-primary">{item.isSimple ? 'Qtd: ' + item.quantity : item.name}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-6 bg-zinc-950 border-t border-zinc-800 flex gap-4">
                      <button onClick={() => window.print()} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                          <Download size={18} /> IMPRIMIR
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
