
import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { 
    ArrowLeft, CheckCircle, TrendingUp, Calendar, 
    Download, FileText, Filter, Search, ChevronDown 
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, Legend 
} from 'recharts';

export default function Statement() {
    const { orders, isLoading } = useData();
    const { role, currentCustomer } = useAuth();

    if (role !== 'client' || !currentCustomer) {
        return <Navigate to="/" replace />;
    }

    const customerOrders = useMemo(() => {
        return orders.filter(o => o.client_id === currentCustomer.id);
    }, [orders, currentCustomer.id]);

    const paidOrders = useMemo(() => {
        return customerOrders
            .filter(o => o.status === 'paid')
            .sort((a, b) => new Date(b.paid_at || b.created_at || '').getTime() - new Date(a.paid_at || a.created_at || '').getTime());
    }, [customerOrders]);

    const totalPaid = useMemo(() => {
        return paidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    }, [paidOrders]);

    // Process data for the chart
    const chartData = useMemo(() => {
        const data: Record<string, { name: string, requested: number, paid: number }> = {};
        
        // Helper to get month key (e.g., "2023-10")
        const getMonthKey = (dateStr: string) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        };

        // Helper to get display name (e.g., "Out/23")
        const getDisplayName = (dateStr: string) => {
             if (!dateStr) return '';
             const date = new Date(dateStr);
             return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        };

        // Process Requested (Created)
        customerOrders.forEach(order => {
            const key = getMonthKey(order.created_at || order.order_date);
            if (key) {
                if (!data[key]) {
                    data[key] = { 
                        name: getDisplayName(order.created_at || order.order_date), 
                        requested: 0, 
                        paid: 0 
                    };
                }
                data[key].requested += Number(order.total || 0);
            }
        });

        // Process Paid
        paidOrders.forEach(order => {
            const key = getMonthKey(order.paid_at || order.order_date); // Use paid_at if available, fallback to order_date
             if (key) {
                if (!data[key]) {
                    data[key] = { 
                        name: getDisplayName(order.paid_at || order.order_date), 
                        requested: 0, 
                        paid: 0 
                    };
                }
                data[key].paid += Number(order.total || 0);
            }
        });

        // Convert to array and sort by date
        return Object.keys(data).sort().map(key => data[key]);
    }, [customerOrders, paidOrders]);

    return (
        <div className="max-w-7xl mx-auto pb-24 animate-fade-in-up space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/" className="p-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight font-heading">Extrato Financeiro</h1>
                    <p className="text-zinc-500 text-sm">Acompanhe seu histórico de pagamentos e evolução</p>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-[#121215] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-primary" size={24} />
                        Evolução Mensal
                    </h2>
                    <div className="bg-zinc-900/50 px-4 py-2 rounded-lg border border-white/5">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest mr-2">Total Pago</span>
                        <span className="text-emerald-400 font-bold font-mono">R$ {totalPaid.toFixed(2)}</span>
                    </div>
                </div>
                
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRequested" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#71717a" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <YAxis 
                                stroke="#71717a" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(value) => `R$${value}`}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                                labelStyle={{ color: '#a1a1aa', marginBottom: '8px' }}
                            />
                            <Legend />
                            <Area 
                                type="monotone" 
                                dataKey="requested" 
                                name="Serviços Solicitados" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorRequested)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="paid" 
                                name="Valor Pago" 
                                stroke="#10b981" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorPaid)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Paid Orders List */}
            <div className="bg-[#121215] border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-[#0c0c0e] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CheckCircle className="text-emerald-500" size={24} />
                        Histórico de Pagamentos
                    </h2>
                    <span className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-bold border border-emerald-500/20">
                        {paidOrders.length} pagamentos
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-white/[0.02] text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Pedido</th>
                                <th className="px-6 py-4">Data Pagamento</th>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4 text-center">Comprovante</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {paidOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 text-zinc-600">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText size={32} className="opacity-20" />
                                            <p>Nenhum pagamento registrado.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paidOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-white font-bold">#{order.formattedOrderNumber || order.order_number}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.paid_at ? new Date(order.paid_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate">
                                            {order.description}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                                            R$ {Number(order.total).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition" title="Baixar Comprovante">
                                                <Download size={16} />
                                            </button>
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
