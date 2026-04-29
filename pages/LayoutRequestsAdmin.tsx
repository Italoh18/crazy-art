
import React, { useState, useEffect } from 'react';
import { 
  Layers, Search, Filter, Calendar, User, MessageCircle, 
  ExternalLink, CheckCircle2, Clock, XCircle, MoreVertical,
  ChevronRight, Download, Image as ImageIcon, Wallet, 
  CreditCard, Loader2, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutRequest {
  id: string;
  client_id: string;
  client_name: string;
  description: string;
  example_url: string;
  logo_url: string;
  value: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
}

export default function LayoutRequestsAdmin() {
  const [requests, setRequests] = useState<LayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'open' | 'completed'>('all');
  const [selectedRequest, setSelectedRequest] = useState<LayoutRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/layout-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error('Erro ao buscar solicitações:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
      // Implementar se necessário gerenciamento de status
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.order_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'open': return 'text-primary bg-primary/10 border-primary/20';
      case 'draft': return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
            <Layers className="text-primary" /> Layouts Solicitados
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Gerencie briefings personalizados</p>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex gap-1">
                {(['all', 'draft', 'open', 'completed'] as const).map(f => (
                    <button 
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${statusFilter === f ? 'bg-primary text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        {f === 'all' ? 'Todos' : f === 'draft' ? 'Rascunho' : f === 'open' ? 'Abertos' : 'Feitos'}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-2 flex flex-col md:flex-row gap-2">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Buscar por cliente ou descrição..."
            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-primary outline-none transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-3.5 text-zinc-600" size={18} />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-40 text-center space-y-4">
            <Layers className="mx-auto text-zinc-800" size={64} />
            <p className="text-zinc-500 font-bold uppercase text-xs">Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((req) => (
             <div 
                key={req.id} 
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition group cursor-pointer"
                onClick={() => setSelectedRequest(req)}
             >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-white/5 flex items-center justify-center shrink-0">
                           <User size={24} className="text-zinc-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-black text-white text-lg uppercase tracking-tighter">{req.client_name}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getStatusColor(req.order_status)}`}>
                                    {req.order_status}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(req.created_at).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1">
                                    {req.payment_method === 'credit' ? <Wallet size={12} className="text-primary" /> : <CreditCard size={12} className="text-zinc-400" />}
                                    {req.payment_method === 'credit' ? 'Crédito Fidelidade' : 'Pagamento Online'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-between gap-4">
                        <span className="text-2xl font-black text-white">R$ {req.value.toFixed(2)}</span>
                        <div className="flex gap-2">
                             {req.example_url && <div className="w-10 h-10 rounded-lg bg-black border border-zinc-800 overflow-hidden"><img src={req.example_url} className="w-full h-full object-cover" /></div>}
                             {req.logo_url && <div className="w-10 h-10 rounded-lg bg-black border border-zinc-800 overflow-hidden"><img src={req.logo_url} className="w-full h-full object-cover" /></div>}
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-800">
                    <p className="text-zinc-400 text-sm italic line-clamp-2">"{req.description}"</p>
                </div>
             </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 custom-scrollbar"
                >
                    <div className="p-8 md:p-12 space-y-10">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Detalhes do Layout</h2>
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest italic">{selectedRequest.id}</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="p-2 bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-8 py-8 border-y border-zinc-800">
                            <div>
                                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Cliente</p>
                                <p className="text-white font-bold">{selectedRequest.client_name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Valor</p>
                                <p className="text-primary font-black text-xl">R$ {selectedRequest.value.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Briefing Digitado</p>
                            <div className="bg-black/40 border border-zinc-800 p-6 rounded-2xl text-zinc-300 text-sm italic leading-relaxed whitespace-pre-wrap">
                                "{selectedRequest.description}"
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest text-center">Referência Enviada</p>
                                <div className="aspect-square bg-black border border-zinc-800 rounded-2xl overflow-hidden relative group">
                                    {selectedRequest.example_url ? (
                                        <>
                                            <img src={selectedRequest.example_url} className="w-full h-full object-cover" />
                                            <a href={selectedRequest.example_url} target="_blank" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 text-white">
                                                <ExternalLink size={24} />
                                                <span className="text-[10px] font-bold uppercase">Ver Original</span>
                                            </a>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-800">Nenhum</div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest text-center">Logo do Cliente</p>
                                <div className="aspect-square bg-black border border-zinc-800 rounded-2xl overflow-hidden relative group">
                                    {selectedRequest.logo_url ? (
                                        <>
                                            <img src={selectedRequest.logo_url} className="w-full h-full object-cover" />
                                            <a href={selectedRequest.logo_url} target="_blank" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 text-white">
                                                <ExternalLink size={24} />
                                                <span className="text-[10px] font-bold uppercase">Ver Original</span>
                                            </a>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-800">Nenhum</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button className="flex-1 py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition group flex items-center justify-center gap-2">
                                <MessageCircle size={18} /> Chamar no WhatsApp
                            </button>
                            <button 
                                onClick={() => setSelectedRequest(null)}
                                className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] shadow-xl shadow-primary/20 transition flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={18} /> Marcar como Feito
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
