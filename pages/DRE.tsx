
import React from 'react';
import { useData } from '../contexts/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DRE() {
  const { orders } = useData();

  // Helper to group orders by month
  const getDataByMonth = () => {
    const data: Record<string, { name: string; revenue: number; receivable: number; cancelled: number }> = {};

    orders.forEach(order => {
      if (!order.order_date) return;
      
      const date = new Date(order.order_date);
      const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;

      if (!data[monthKey]) {
        data[monthKey] = { name: monthKey, revenue: 0, receivable: 0, cancelled: 0 };
      }

      const val = Number(order.total || 0);

      if (order.status === 'paid') {
        data[monthKey].revenue += val;
      } else if (order.status === 'open') {
        data[monthKey].receivable += val;
      } else if (order.status === 'cancelled') {
        data[monthKey].cancelled += val;
      }
    });

    return Object.values(data);
  };

  const chartData = getDataByMonth();

  // Summary Totals
  const totalRevenue = orders.filter(o => o.status === 'paid').reduce((acc, c) => acc + Number(c.total || 0), 0);
  const totalReceivable = orders.filter(o => o.status === 'open').reduce((acc, c) => acc + Number(c.total || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Demonstrativo do Resultado (DRE)</h1>

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

      <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm h-96">
        <h2 className="text-lg font-semibold text-white mb-6">Análise Mensal de Vendas</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey="name" stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar dataKey="revenue" name="Receita (Pago)" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="receivable" name="A Receber (Aberto)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
