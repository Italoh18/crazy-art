
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Lightbulb, ThumbsUp, Heart, Check, Trash2, Search, Filter, MessageSquare } from 'lucide-react';

interface Feedback {
  id: string;
  type: 'erro' | 'sugestao' | 'reclamacao' | 'agradecimento';
  content: string;
  user_name: string;
  created_at: string;
  is_read: number;
}

export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/feedbacks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setFeedbacks(Array.isArray(data) ? data : []);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleDelete = async (id: string) => {
      if(!confirm("Excluir este feedback?")) return;
      try {
          const token = localStorage.getItem('auth_token');
          await fetch(`/api/feedbacks?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          setFeedbacks(prev => prev.filter(f => f.id !== id));
      } catch (e) { alert("Erro ao excluir"); }
  };

  const handleMarkRead = async (id: string) => {
      try {
          const token = localStorage.getItem('auth_token');
          await fetch(`/api/feedbacks?id=${id}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
          setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_read: 1 } : f));
      } catch (e) { console.error(e); }
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'erro': return <AlertTriangle className="text-red-500" />;
          case 'sugestao': return <Lightbulb className="text-amber-500" />;
          case 'reclamacao': return <ThumbsUp className="text-blue-500 rotate-180" />;
          case 'agradecimento': return <Heart className="text-pink-500" />;
          default: return <MessageSquare className="text-zinc-500" />;
      }
  };

  const getLabel = (type: string) => {
      switch(type) {
          case 'erro': return 'Erro no Site';
          case 'sugestao': return 'Sugestão';
          case 'reclamacao': return 'Reclamação';
          case 'agradecimento': return 'Agradecimento';
          default: return type;
      }
  };

  const filtered = feedbacks.filter(f => {
      const matchesType = filter === 'all' || f.type === filter;
      const matchesSearch = f.content.toLowerCase().includes(searchTerm.toLowerCase()) || f.user_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-800 rounded-xl text-white">
                <MessageSquare size={24} />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Central de Feedbacks</h1>
                <p className="text-zinc-400 text-sm mt-1">Mensagens recebidas pelo Assistente Virtual.</p>
            </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou conteúdo..." 
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary outline-none transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
                <Filter size={18} className="text-zinc-500" />
                <select 
                    className="bg-black/40 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-primary outline-none transition cursor-pointer"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="all">Todos os Tipos</option>
                    <option value="erro">Erros</option>
                    <option value="sugestao">Sugestões</option>
                    <option value="reclamacao">Reclamações</option>
                    <option value="agradecimento">Agradecimentos</option>
                </select>
            </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 gap-4">
            {loading ? (
                <p className="text-zinc-500 text-center py-10">Carregando...</p>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-xl">
                    <MessageSquare size={48} className="mx-auto text-zinc-800 mb-4" />
                    <p className="text-zinc-500">Nenhum feedback encontrado.</p>
                </div>
            ) : (
                filtered.map(item => (
                    <div key={item.id} className={`bg-zinc-900 border ${item.is_read ? 'border-zinc-800' : 'border-primary/50'} p-6 rounded-2xl shadow-lg transition hover:bg-zinc-800/80`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-black/40 rounded-lg border border-zinc-700">
                                    {getIcon(item.type)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{getLabel(item.type)}</h3>
                                    <p className="text-zinc-500 text-xs">Por <span className="text-zinc-300 font-bold">{item.user_name}</span> • {new Date(item.created_at).toLocaleDateString()} às {new Date(item.created_at).toLocaleTimeString().slice(0,5)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!item.is_read && (
                                    <button onClick={() => handleMarkRead(item.id)} className="p-2 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-500 rounded-lg transition" title="Marcar como lido">
                                        <Check size={18} />
                                    </button>
                                )}
                                <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg transition" title="Excluir">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="bg-black/20 p-4 rounded-xl border border-zinc-800/50 text-zinc-300 text-sm leading-relaxed">
                            "{item.content}"
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
}
