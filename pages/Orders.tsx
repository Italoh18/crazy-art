
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Calendar, Filter, Eye, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Order } from '../types';

export default function Orders() {
  const { orders } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  // Estados dos Filtros
  // Recupera filtro inicial via location state (vindo do gráfico DRE)
  const initialFilter = location.state?.filter || 'all';
  const initialMonth = location.state?.month || '';

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'paid' | 'overdue'>(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(initialMonth ? `${initialMonth.split('/')[1]}-${initialMonth.split('/')[0]}` : '');

  const isOverdue = (order: Order) => {
    if (!order.due_date || order.status !== 'open') return false;
    return new Date(order.due_date) < new Date();
  };

  const filteredOrders = orders.filter(order => {
    // 1. Filtro de Status
    if (statusFilter === 'overdue') {
        if (!isOverdue(order)) return false;
    } else if (statusFilter !== 'all') {
        if (statusFilter === 'open' && isOverdue(order)) return false; // Aberto puro, sem atraso
        if (order.status !== statusFilter) return false;
    }

    // 2. Filtro de Data (Mês/Ano)
    if (dateFilter) {
        const orderDate = new Date(order.order_date);
        const [year, month] = dateFilter.split('-');
        if (orderDate.getFullYear() !== parseInt(year) || (orderDate.getMonth() + 1) !== parseInt(month)) {
            return false;
        }
    }

    // 3. Filtro de Texto (Nome do cliente ou Descrição)
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        const clientName = order.client_name ? order.client_name.toLowerCase() : '';
        const desc = order.description ? order.description.toLowerCase() : '';
        const number = order.formattedOrderNumber || String(order.order_number);
        
        return clientName.includes(lowerSearch) || desc.includes(lowerSearch) || number.includes(lowerSearch);
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white tracking-tight">Pedidos</h1>
           <p className="text-zinc-400 text-sm mt-1">Gerencie todos os pedidos do sistema.</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-surface border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
            <input 
                type="text" 
                placeholder="Buscar por cliente, descrição ou número..." 
                className="w-full bg-black/40 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary outline-none transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
         </div>

         <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <div className="relative">
                 <Calendar className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                 <input 
                    type="month" 
                    className="bg-black/40 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary outline-none transition"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                 />
             </div>
             
             <select 
                className="bg-black/40 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-primary outline-none transition cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
             >
                <option value="all">Todos</option>
                <option value="open">Em Aberto</option>
                <option value="paid">Pagos</option>
                <option value="overdue">Atrasados</option>
             </select>
             
             {(dateFilter || statusFilter !== 'all' || searchTerm) && (
                 <button 
                    onClick={() => { setDateFilter(''); setStatusFilter('all'); setSearchTerm(''); }}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-bold transition whitespace-nowrap"
                 >
                    Limpar
                 </button>
             )}
         </div>
      </div>

      {/* Tabela */}
      <div className="bg-surface border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-300 uppercase text-xs font-bold tracking-wider">
                      <tr>
                          <th className="px-6 py-4">Pedido</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4">Data</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Valor</th>
                          <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                      {filteredOrders.length === 0 ? (
                          <tr>
                              <td colSpan={6} className="px-6 py-12 text-center">
                                  <Filter size={40} className="mx-auto mb-3 text-zinc-700" />
                                  <p className="text-zinc-500">Nenhum pedido encontrado com os filtros atuais.</p>
                              </td>
                          </tr>
                      ) : (
                          filteredOrders.map(order => {
                              const overdue = isOverdue(order);
                              return (
                                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                                      <td className="px-6 py-4 font-mono text-white">
                                          #{order.formattedOrderNumber || order.order_number}
                                      </td>
                                      <td className="px-6 py-4 font-medium text-white">
                                          {order.client_name || 'Cliente Removido'}
                                          <div className="text-xs text-zinc-500 truncate max-w-[200px] font-normal">{order.description}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          {new Date(order.order_date).toLocaleDateString()}
                                      </td>
                                      <td className="px-6 py-4">
                                          {order.status === 'paid' ? (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                  <CheckCircle size={12} /> Pago
                                              </span>
                                          ) : overdue ? (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                                  <AlertTriangle size={12} /> Atrasado
                                              </span>
                                          ) : (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                  <Clock size={12} /> Aberto
                                              </span>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 text-right font-mono text-white font-bold">
                                          R$ {order.total.toFixed(2)}
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <button 
                                            onClick={() => navigate(`/customers/${order.client_id}`)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                                            title="Ver Detalhes"
                                          >
                                              <Eye size={18} />
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
