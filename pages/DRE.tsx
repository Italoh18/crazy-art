
import React from 'react';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function DRE() {
  const { orders } = useData();
  const navigate = useNavigate();

  // Helper para agrupar e calcular métricas
  const getDataByMonth = () => {
    const data: Record<string, any> = {};

    orders.forEach(order => {
      // Ignora cancelados
      if (order.status === 'cancelled' || !order.order_date) return;
      
      const date = new Date(order.order_date);
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

      if (!data[sortKey]) {
        data[sortKey] = { 
            sortKey,
            name: monthKey, 
            
            // Métricas para o Gráfico
            revenue: 0, // Pago (Recebido)
            receivable: 0, // Aberto (No prazo)
            overdue: 0, // Aberto (Atrasado)
            
            // Métricas para a Tabela
            salesGross: 0, // Total de Pedidos Fechados (Independente se pagou)
            salesCost: 0, // Custo total dos pedidos
            
            receivedGross: 0, // Total Recebido (Apenas pagos)
            receivedCost: 0, // Custo dos pagos
        };
      }

      const val = Number(order.total || 0);
      const cost = Number(order.total_cost || 0);

      // 1. Cálculo de Vendas (Pedidos Fechados/Registrados)
      data[sortKey].salesGross += val;
      data[sortKey].salesCost += cost;

      // 2. Cálculo de Recebimento (Fluxo de Caixa) & Gráfico
      if (order.status === 'paid') {
        data[sortKey].revenue += val;
        
        data[sortKey].receivedGross += val;
        data[sortKey].receivedCost += cost;

      } else if (order.status === 'open') {
        const isLate = order.due_date && new Date(order.due_date) < new Date();
        if (isLate) {
            data[sortKey].overdue += val;
        } else {
            data[sortKey].receivable += val;
        }
      }
    });

    return Object.keys(data).sort().map(key => data[key]);
  };

  const chartData = getDataByMonth();

  // Summary Totals
  const totalRevenue = orders.filter(o => o.status === 'paid').reduce((acc, c) => acc + Number(c.total || 0), 0);
  const totalReceivable = orders.filter(o => o.status === 'open').reduce((acc, c) => acc + Number(c.total || 0), 0);

  const handleBarClick = (data: any, index: number, type: 'revenue' | 'receivable' | 'overdue') => {
      if (!data || !data.name) return;
      let statusFilter = 'all';
      if (type === 'revenue') statusFilter = 'paid';
      if (type === 'receivable') statusFilter = 'open'; // Aberto no prazo
      if (type === 'overdue') statusFilter = 'overdue';

      navigate('/orders', { 
          state: { 
              filter: statusFilter,
              month: data.name 
          } 
      });
  };

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-white">Demonstrativo do Resultado (DRE)</h1>

      {/* Cards Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-zinc-400 font-medium">Receita Bruta (Realizado)</p>
          <p className="text-3xl font-bold text-white mt-2">R$ {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-zinc-400 font-medium">Contas a Receber (Projetado)</p>
          <p className="text-3xl font-bold text-white mt-2">R$ {totalReceivable.toFixed(2)}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm border-l-4 border-l-indigo-500">
          <p className="text-zinc-400 font-medium">Volume Total de Vendas</p>
          <p className="text-3xl font-bold text-white mt-2">R$ {(totalRevenue + totalReceivable).toFixed(2)}</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm h-96">
        <h2 className="text-lg font-semibold text-white mb-6">Análise Mensal de Vendas</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            className="cursor-pointer"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey="name" stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
            />
            <Legend />
            
            <Bar dataKey="revenue" name="Recebido (Pago)" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} onClick={(data, index) => handleBarClick(data, index, 'revenue')} />
            {/* Stack para abertos: Amarelo para no prazo, Vermelho para atrasado */}
            <Bar dataKey="receivable" name="A Receber" stackId="b" fill="#F59E0B" radius={[0, 0, 0, 0]} onClick={(data, index) => handleBarClick(data, index, 'receivable')} />
            <Bar dataKey="overdue" name="Atrasado" stackId="b" fill="#EF4444" radius={[4, 4, 0, 0]} onClick={(data, index) => handleBarClick(data, index, 'overdue')} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Nova Tabela Detalhada */}
      <div className="bg-surface border border-zinc-800 rounded-xl overflow-hidden shadow-lg mt-8">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
             <h3 className="font-bold text-white">Detalhamento Financeiro</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-300 uppercase text-xs font-bold tracking-wider">
                      <tr>
                          <th className="px-6 py-4">Mês</th>
                          <th className="px-6 py-4">60% Recebido</th>
                          <th className="px-6 py-4">Valor Pedidos Fechado</th>
                          <th className="px-6 py-4">Valor Recebido</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                      {chartData.length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-8 text-center">Sem dados financeiros.</td></tr>
                      ) : (
                          chartData.slice().reverse().map((item, idx) => {
                              const sixtyPercent = item.receivedGross * 0.6;
                              
                              // Sales = Vendas Totais do Mês
                              const salesNet = item.salesGross - item.salesCost;
                              
                              // Received = Recebimento Real
                              const receivedNet = item.receivedGross - item.receivedCost;

                              return (
                                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                      <td className="px-6 py-4 font-bold text-white">{item.name}</td>
                                      <td className="px-6 py-4 font-mono text-blue-400 font-bold">
                                          R$ {sixtyPercent.toFixed(2)}
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                              <span className="text-zinc-200 font-medium">R$ {item.salesGross.toFixed(2)} <span className="text-[10px] text-zinc-500 ml-1">Total</span></span>
                                              <span className="text-emerald-500 font-mono text-xs">R$ {salesNet.toFixed(2)} <span className="opacity-70">Liq (s/ Custo)</span></span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                              <span className="text-zinc-200 font-medium">R$ {item.receivedGross.toFixed(2)} <span className="text-[10px] text-zinc-500 ml-1">Total</span></span>
                                              <span className="text-emerald-500 font-mono text-xs">R$ {receivedNet.toFixed(2)} <span className="opacity-70">Liq (s/ Custo)</span></span>
                                          </div>
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
