
import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { FileText, CheckCircle, Calendar, Download } from 'lucide-react';

export default function ClientExtract() {
  const { currentCustomer } = useAuth();
  const { orders } = useData();

  // Histórico: Pedidos Entregues E Pagos/Finalizados
  const historyOrders = useMemo(() => {
    if (!currentCustomer) return [];
    return orders.filter(o => 
        o.client_id === currentCustomer.id && 
        (o.production_status === 'delivered' || o.status === 'paid' || o.is_confirmed === 1) &&
        o.status !== 'cancelled'
    ).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [orders, currentCustomer]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/30">
            <FileText size={32} />
        </div>
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight font-heading">Extrato</h1>
            <p className="text-zinc-400 text-sm">Histórico de pedidos finalizados.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 uppercase text-xs font-bold tracking-wider">
                      <tr>
                          <th className="px-6 py-5">Pedido</th>
                          <th className="px-6 py-5">Data</th>
                          <th className="px-6 py-5">Descrição</th>
                          <th className="px-6 py-5 text-right">Valor</th>
                          <th className="px-6 py-5 text-center">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                      {historyOrders.length === 0 ? (
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">
                                  <p>Nenhum pedido no histórico.</p>
                              </td>
                          </tr>
                      ) : (
                          historyOrders.map(order => (
                              <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                                  <td className="px-6 py-4 font-mono text-white font-bold">
                                      #{order.formattedOrderNumber}
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                          <Calendar size={14} />
                                          {new Date(order.order_date).toLocaleDateString()}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 max-w-xs truncate text-zinc-300">
                                      {order.description}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                                      R$ {Number(order.total).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold uppercase">
                                          <CheckCircle size={12} /> Concluído
                                      </span>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
