
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  CheckCircle, Clock, AlertTriangle, Eye, Edit, 
  Trash2, Search, Filter, Layers, Package, User, 
  ArrowRight, X, ListChecks, Download, Check, ShoppingBag
} from 'lucide-react';
import { Order, SizeListItem } from '../types';

export default function PendingOrders() {
  const { orders, updateOrder, deleteOrder } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  /**
   * REGRAS PARA FILA DE PRODUÇÃO:
   * 1. Pedido não confirmado (is_confirmed !== 1).
   * 2. Pedido PAGO (se for produto) OU faturado em conta (se for serviço com crédito).
   * 3. CRITÉRIO DE EXIBIÇÃO SOLICITADO:
   *    - Pedidos gerados pelo cliente na LOJA (source === 'shop').
   *    - OU Pedidos de clientes que NÃO TEM CRÉDITO (client_credit_limit === 0).
   *    - Adicionalmente: Pedidos com lista (size_list) entram pois exigem produção.
   */
  const pendingOrders = useMemo(() => {
    return orders.filter(o => {
      // Pedido já finalizado? Fora.
      if (o.is_confirmed === 1) return false;

      // Pedido cancelado? Fora.
      if (o.status === 'cancelled') return false;

      const isFromShop = o.source === 'shop';
      const isNoCreditClient = (o.client_credit_limit || 0) === 0;
      const hasSizeList = !!o.size_list;

      // Se atende aos critérios de "Produção Automática"
      const isProductionTarget = isFromShop || isNoCreditClient || hasSizeList;

      // Só aparece se estiver pago ou se for um serviço que foi "faturado" (status open)
      const isEffectivelyActive = o.status === 'paid' || (o.status === 'open' && !isNoCreditClient);

      return isProductionTarget && isEffectivelyActive;
    }).sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
  }, [orders]);

  const filtered = pendingOrders.filter(o => 
    (o.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.formattedOrderNumber || '').includes(searchTerm)
  );

  const handleConfirm = async (orderId: string) => {
    if (confirm("Marcar pedido como concluído e remover da fila de pendentes?")) {
        await updateOrder(orderId, { is_confirmed: 1 });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight font-heading">Fila de Produção</h1>
           <p className="text-zinc-400 text-sm mt-1">Pedidos da loja ou de clientes sem crédito aguardando execução.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl flex items-center gap-3">
            <span className="text-primary font-black text-2xl">{pendingOrders.length}</span>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-tight">Itens em<br/>Produção</span>
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
                  <Package size={64} className="mx-auto text-zinc-800 mb-4 opacity-20" />
                  <p className="text-zinc-600 font-medium">Fila vazia. Pedidos administrativos seguem o fluxo normal de faturamento.</p>
              </div>
          ) : (
              filtered.map(order => (
                  <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-primary/30 transition-all group relative overflow-hidden shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 group-hover:border-primary/50 transition shadow-inner">
                             {order.source === 'shop' ? <ShoppingBag size={24} className="text-primary" /> : <User size={24} className="text-zinc-400" />}
                          </div>
                          <div className="text-right">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                  {order.source === 'shop' ? 'Venda Loja' : 'Venda Manual'}
                              </span>
                              <p className="text-white font-mono font-bold">#{order.formattedOrderNumber}</p>
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
                                 {order.status === 'paid' ? 'PAGO' : 'EM CONTA'}
                             </span>
                          </div>

                          <div className="pt-4 border-t border-zinc-800 flex gap-2">
                              <button onClick={() => setViewingOrder(order)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2">
                                  <Eye size={14} /> VER DETALHES
                              </button>
                              <button onClick={() => handleConfirm(order.id)} className="w-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center justify-center shadow-lg shadow-emerald-900/20" title="Marcar como Concluído">
                                  <Check size={20} strokeWidth={3} />
                              </button>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Modal Detalhes do Pedido Pendente */}
      {viewingOrder && (
          <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-start justify-center pt-12 md:pt-24 p-4 animate-fade-in overflow-y-auto">
              <div className="bg-[#121215] border border-zinc-800 w-full max-w-2xl max-h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary"><Package size={20} /></div>
                        <h3 className="text-xl font-bold text-white">Pedido #{viewingOrder.formattedOrderNumber}</h3>
                      </div>
                      <button onClick={() => setViewingOrder(null)} className="p-2 text-zinc-500 hover:text-white transition"><X size={24} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-1">Cliente</span>
                              <p className="text-white font-bold">{viewingOrder.client_name}</p>
                          </div>
                          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-1">Origem</span>
                              <p className="text-white font-bold">{viewingOrder.source === 'shop' ? 'Loja Crazy Art' : 'Painel Adm'}</p>
                          </div>
                          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-1">Data</span>
                              <p className="text-white font-bold">{new Date(viewingOrder.order_date).toLocaleDateString()}</p>
                          </div>
                      </div>

                      <div>
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-2 ml-1">Observações / Descrição</span>
                          <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 text-zinc-300 text-sm leading-relaxed italic">
                              "{viewingOrder.description || 'Sem observações.'}"
                          </div>
                      </div>

                      {viewingOrder.size_list && (
                          <div>
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest block mb-4 ml-1">Lista de Produção (Tamanhos/Nomes)</span>
                              <div className="overflow-x-auto border border-zinc-800 rounded-2xl">
                                  <table className="w-full text-left text-xs text-zinc-400">
                                      <thead className="bg-zinc-950 border-b border-zinc-800">
                                          <tr>
                                              <th className="p-3 uppercase">Categoria</th>
                                              <th className="p-3 uppercase">Tam</th>
                                              <th className="p-3 uppercase text-center">Nº</th>
                                              <th className="p-3 uppercase">Nome na Camisa</th>
                                              <th className="p-3 uppercase">Short</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-800/50">
                                          {(typeof viewingOrder.size_list === 'string' ? JSON.parse(viewingOrder.size_list) : viewingOrder.size_list).map((item: SizeListItem) => (
                                              <tr key={item.id} className="hover:bg-white/[0.02]">
                                                  <td className="p-3"><span className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{item.category}</span></td>
                                                  <td className="p-3 font-bold text-white">{item.size}</td>
                                                  <td className="p-3 text-center font-mono">{item.isSimple ? '-' : (item.number || '-')}</td>
                                                  <td className="p-3 font-bold uppercase text-primary">
                                                      {item.isSimple ? (
                                                          <span className="text-zinc-400 italic">SEM NOME ({item.quantity} unidades)</span>
                                                      ) : (
                                                          item.name || 'SEM NOME'
                                                      )}
                                                  </td>
                                                  <td className="p-3 font-mono">{item.shortSize ? `${item.shortSize}${item.shortNumber ? ` (${item.shortNumber})` : ''}` : '-'}</td>
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
                      <button onClick={() => handleConfirm(viewingOrder.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-emerald-900/20">
                          MARCAR COMO PRONTO
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
