import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Clock, Eye, Briefcase, X } from 'lucide-react';

export default function DRE() {
  const { orders, customers } = useData();
  const navigate = useNavigate();

  const [salesTimeframe, setSalesTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [paymentsTimeframe, setPaymentsTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [subscribersTimeframe, setSubscribersTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [isSalesHistoryModalOpen, setIsSalesHistoryModalOpen] = useState(false);

  const formatCurrency = (val: number) => {
    return "R$ " + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderStatusBadge = (status: string, isLate: boolean) => {
      if (status === 'paid') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">Pago</span>;
      if (status === 'finished') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">Finalizado</span>;
      if (isLate) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wide">Atrasado</span>;
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">Aberto</span>;
  };

  // Helper para agrupar e calcular métricas do DRE
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
      const isPaid = order.status === 'paid' || !!order.paid_at;
      if (isPaid) {
        data[sortKey].revenue += val;
        
        data[sortKey].receivedGross += val;
        data[sortKey].receivedCost += cost;

      } else if (['open', 'production', 'revision'].includes(order.status)) {
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

  // 1. Gráfico de Vendas
  const salesChartData = useMemo(() => {
    const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.order_date);
    const dataMap: Record<string, { date: Date; label: string; value: number }> = {};

    activeOrders.forEach(o => {
      const date = new Date(o.order_date);
      let key = '';
      let label = '';
      
      if (salesTimeframe === 'daily') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        label = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (salesTimeframe === 'weekly') {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const sunday = new Date(d.setDate(diff));
        key = sunday.toISOString().split('T')[0];
        label = `Sem. ${String(sunday.getDate()).padStart(2, '0')}/${String(sunday.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      }

      if (!dataMap[key]) {
        dataMap[key] = {
          date,
          label,
          value: 0
        };
      }
      dataMap[key].value += Number(o.total || 0);
    });

    return Object.keys(dataMap)
      .sort()
      .map(k => dataMap[k]);
  }, [orders, salesTimeframe]);

  // 2. Gráfico de Pagamentos
  const paymentsChartData = useMemo(() => {
    const paidOrders = orders.filter(o => (o.status === 'paid' || !!o.paid_at) && o.status !== 'cancelled');
    const dataMap: Record<string, { date: Date; label: string; value: number }> = {};

    paidOrders.forEach(o => {
      const dateStr = o.paid_at || o.order_date;
      if (!dateStr) return;
      const date = new Date(dateStr);
      let key = '';
      let label = '';
      
      if (paymentsTimeframe === 'daily') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        label = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (paymentsTimeframe === 'weekly') {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const sunday = new Date(d.setDate(diff));
        key = sunday.toISOString().split('T')[0];
        label = `Sem. ${String(sunday.getDate()).padStart(2, '0')}/${String(sunday.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      }

      if (!dataMap[key]) {
        dataMap[key] = {
          date,
          label,
          value: 0
        };
      }
      dataMap[key].value += Number(o.total || 0);
    });

    return Object.keys(dataMap)
      .sort()
      .map(k => dataMap[k]);
  }, [orders, paymentsTimeframe]);

  // 3. Gráfico de Assinantes da Quitanda
  const subscribersChartData = useMemo(() => {
    const subscribers = (customers || []).filter(c => c.isSubscriber && c.created_at);
    const dataMap: Record<string, { date: Date; label: string; count: number }> = {};

    subscribers.forEach(c => {
      const date = new Date(c.created_at);
      let key = '';
      let label = '';
      
      if (subscribersTimeframe === 'daily') {
        key = date.toISOString().split('T')[0];
        label = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (subscribersTimeframe === 'weekly') {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const sunday = new Date(d.setDate(diff));
        key = sunday.toISOString().split('T')[0];
        label = `Sem. ${String(sunday.getDate()).padStart(2, '0')}/${String(sunday.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      }

      if (!dataMap[key]) {
        dataMap[key] = {
          date,
          label,
          count: 0
        };
      }
      dataMap[key].count += 1;
    });

    const sortedKeys = Object.keys(dataMap).sort();
    let cumulative = 0;
    return sortedKeys.map(k => {
      cumulative += dataMap[k].count;
      return {
        date: dataMap[k].date,
        label: dataMap[k].label,
        value: cumulative
      };
    });
  }, [customers, subscribersTimeframe]);

  // Summary Totals
  const totalRevenue = orders.filter(o => (o.status === 'paid' || !!o.paid_at) && o.status !== 'cancelled').reduce((acc, c) => acc + Number(c.total || 0), 0);
  const totalReceivable = orders.filter(o => ['open', 'production', 'revision'].includes(o.status) && !o.paid_at).reduce((acc, c) => acc + Number(c.total || 0), 0);

  // 1. Receita média mensal (Baseado em faturamento realizado/pagamentos, não pedidos fechados)
  const averageMonthlyRevenue = useMemo(() => {
    const paidOrders = orders.filter(o => (o.status === 'paid' || !!o.paid_at) && o.status !== 'cancelled');
    if (paidOrders.length === 0) return 0;

    const paidByMonth: Record<string, number> = {};
    paidOrders.forEach(o => {
      const dateStr = o.paid_at || o.order_date;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      paidByMonth[monthKey] = (paidByMonth[monthKey] || 0) + Number(o.total || 0);
    });

    const months = Object.keys(paidByMonth).length;
    return months > 0 ? (totalRevenue / months) : 0;
  }, [orders, totalRevenue]);

  // 2. Ticket médio do site (Faturamento total de ativos dividido pela quantidade de ativos)
  const ticketMedio = useMemo(() => {
    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    if (activeOrders.length === 0) return 0;
    const totalSales = activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    return totalSales / activeOrders.length;
  }, [orders]);

  // Último Pedido feito (não cancelado)
  const latestOrder = useMemo(() => {
    const active = orders.filter(o => o.status !== 'cancelled' && o.order_date);
    if (active.length === 0) return null;
    return [...active].sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())[0];
  }, [orders]);

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-white">Demonstrativo do Resultado (DRE)</h1>

      {/* Cards Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
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
        <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm border-l-4 border-l-pink-500">
          <p className="text-zinc-400 font-medium">Receita Média Mensal</p>
          <p className="text-3xl font-bold text-white mt-2">R$ {averageMonthlyRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-zinc-400 font-medium">Ticket Médio</p>
          <p className="text-3xl font-bold text-white mt-2">R$ {ticketMedio.toFixed(2)}</p>
        </div>
      </div>

      {/* 1. Gráfico de Vendas */}
      <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Análise de Vendas (Pedidos Registrados)</h2>
            <p className="text-xs text-zinc-500">Volume total faturado no período selecionado</p>
          </div>
          <div className="flex gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button 
              onClick={() => setSalesTimeframe('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${salesTimeframe === 'daily' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Diário
            </button>
            <button 
              onClick={() => setSalesTimeframe('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${salesTimeframe === 'weekly' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Semanal
            </button>
            <button 
              onClick={() => setSalesTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${salesTimeframe === 'monthly' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Mensal
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div style={{ width: `${Math.max(800, salesChartData.length * 55)}px` }} className="h-72 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), "Valor de Vendas"]}
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="value" name="Vendas (R$)" stroke="#c084fc" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Último Pedido & Botão de Histórico */}
        <div className="border-t border-zinc-800/80 pt-6">
          <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Último Pedido Registrado</h4>
          {latestOrder ? (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/80 gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">
                    Pedido #{latestOrder.order_number || latestOrder.id.slice(0, 8)}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Cliente: <span className="text-zinc-300 font-medium">{latestOrder.client_name || 'Desconhecido'}</span> &bull; 
                    Data: <span className="text-zinc-300">{new Date(latestOrder.order_date).toLocaleDateString('pt-BR')}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Valor Total</p>
                  <p className="text-emerald-400 font-bold font-mono text-sm">{formatCurrency(latestOrder.total)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {renderStatusBadge(latestOrder.status, latestOrder.due_date && new Date(latestOrder.due_date) < new Date() && latestOrder.status !== 'paid')}
                  <button 
                    onClick={() => setIsSalesHistoryModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-lg transition border border-zinc-700 shadow-md"
                  >
                    <Eye size={14} />
                    Ver Histórico Completo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Nenhum pedido ativo no momento.</p>
          )}
        </div>
      </div>

      {/* 2. Gráfico de Pagamentos */}
      <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Controle de Recebimentos (Pagamentos Confirmados)</h2>
            <p className="text-xs text-zinc-500">Total líquido efetivamente recebido em caixa</p>
          </div>
          <div className="flex gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button 
              onClick={() => setPaymentsTimeframe('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentsTimeframe === 'daily' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Diário
            </button>
            <button 
              onClick={() => setPaymentsTimeframe('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentsTimeframe === 'weekly' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Semanal
            </button>
            <button 
              onClick={() => setPaymentsTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${paymentsTimeframe === 'monthly' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Mensal
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div style={{ width: `${Math.max(800, paymentsChartData.length * 55)}px` }} className="h-72 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paymentsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), "Valor Recebido"]}
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="value" name="Recebido (R$)" stroke="#10B981" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Gráfico de Assinantes da Quitanda */}
      <div className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Evolução de Assinantes da Quitanda (Acumulado)</h2>
            <p className="text-xs text-zinc-500">Crescimento total acumulado de assinantes ativos</p>
          </div>
          <div className="flex gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button 
              onClick={() => setSubscribersTimeframe('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${subscribersTimeframe === 'daily' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Diário
            </button>
            <button 
              onClick={() => setSubscribersTimeframe('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${subscribersTimeframe === 'weekly' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Semanal
            </button>
            <button 
              onClick={() => setSubscribersTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${subscribersTimeframe === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
            >
              Mensal
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div style={{ width: `${Math.max(800, subscribersChartData.length * 55)}px` }} className="h-72 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subscribersChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  formatter={(value: any) => [Number(value).toLocaleString('pt-BR'), "Assinantes Ativos"]}
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="value" name="Total Assinantes" stroke="#3B82F6" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal Histórico Completo de Vendas */}
      {isSalesHistoryModalOpen && (
        <div className="fixed inset-0 z-[200] flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/60">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={20} className="text-purple-400" /> Histórico Completo de Vendas
              </h3>
              <button 
                onClick={() => setIsSalesHistoryModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="divide-y divide-zinc-800/60">
                {[...orders]
                  .sort((a, b) => new Date(b.order_date || 0).getTime() - new Date(a.order_date || 0).getTime())
                  .map((order, idx) => {
                    const isLate = order.due_date && new Date(order.due_date) < new Date() && order.status !== 'paid' && order.status !== 'cancelled';
                    return (
                      <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0 hover:bg-white/[0.01] px-2 rounded-lg transition">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono font-bold text-sm">
                              Pedido #{order.order_number || order.id.slice(0, 8)}
                            </span>
                            {renderStatusBadge(order.status, isLate)}
                          </div>
                          <p className="text-xs text-zinc-500">
                            Cliente: <span className="text-zinc-300 font-medium">{order.client_name || 'Desconhecido'}</span> &bull; 
                            Data: <span className="text-zinc-400">{order.order_date ? new Date(order.order_date).toLocaleDateString('pt-BR') : '-'}</span>
                          </p>
                        </div>
                        <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                          <span className="text-xs text-zinc-500 sm:hidden">Total:</span>
                          <span className="text-emerald-400 font-bold font-mono text-sm">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end">
              <button 
                onClick={() => setIsSalesHistoryModalOpen(false)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition text-sm font-semibold"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

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
