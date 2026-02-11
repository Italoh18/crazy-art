
import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Ticket, Percent, Tag, X } from 'lucide-react';

export default function Coupons() {
  const { coupons, loadCoupons, addCoupon, deleteCoupon } = useData();
  const [formData, setFormData] = useState({ code: '', percentage: '', type: 'all' });
  
  useEffect(() => {
      loadCoupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.percentage) return;

    await addCoupon({
        code: formData.code,
        percentage: parseFloat(formData.percentage),
        type: formData.type
    });
    
    setFormData({ code: '', percentage: '', type: 'all' });
  };

  const getTypeLabel = (type: string) => {
      switch(type) {
          case 'product': return 'Apenas Produtos';
          case 'service': return 'Apenas Serviços';
          case 'art': return 'Artes Prontas';
          case 'all': return 'Todos os Itens';
          default: return type;
      }
  };

  const getBadgeColor = (type: string) => {
      switch(type) {
          case 'product': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
          case 'service': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
          case 'art': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
          default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Ticket size={28} />
          </div>
          <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Gerenciar Cupons</h1>
              <p className="text-zinc-400 text-sm mt-1">Crie códigos de desconto para seus clientes.</p>
          </div>
      </div>

      <div className="bg-surface border border-zinc-800 p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={18} className="text-primary" /> Novo Cupom
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Código do Cupom</label>
            <div className="relative">
                <input
                type="text"
                placeholder="Ex: PROMO10"
                className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition uppercase font-mono tracking-wider"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
                <Tag className="absolute left-3 top-3.5 text-zinc-500" size={16} />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Desconto (%)</label>
            <div className="relative">
                <input
                type="number"
                placeholder="10"
                min="1"
                max="100"
                className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition font-mono"
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                />
                <Percent className="absolute left-3 top-3.5 text-zinc-500" size={16} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Aplicar em</label>
            <select
                className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition appearance-none cursor-pointer"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
                <option value="all">Toda a Loja</option>
                <option value="product">Apenas Produtos</option>
                <option value="service">Apenas Serviços</option>
                <option value="art">Artes Prontas</option>
            </select>
          </div>

          <button 
            type="submit"
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-600 transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            <span>Criar Cupom</span>
          </button>
        </form>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-300 uppercase text-xs font-bold tracking-wider">
                      <tr>
                          <th className="px-6 py-4">Código</th>
                          <th className="px-6 py-4">Desconto</th>
                          <th className="px-6 py-4">Válido Para</th>
                          <th className="px-6 py-4">Criado em</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                      {coupons.length === 0 ? (
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">
                                  <Ticket size={40} className="mx-auto mb-3 opacity-20" />
                                  <p>Nenhum cupom ativo.</p>
                              </td>
                          </tr>
                      ) : (
                          coupons.map((coupon) => (
                              <tr key={coupon.id} className="hover:bg-white/[0.02] transition-colors group">
                                  <td className="px-6 py-4 font-mono text-white font-bold tracking-wider text-lg">
                                      {coupon.code}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-white">
                                      {coupon.percentage}% OFF
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-block px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-wide ${getBadgeColor(coupon.type)}`}>
                                          {getTypeLabel(coupon.type)}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono">
                                      {new Date(coupon.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button 
                                          onClick={() => deleteCoupon(coupon.id)}
                                          className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                          title="Excluir Cupom"
                                      >
                                          <Trash2 size={18} />
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
