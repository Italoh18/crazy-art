
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Package, Wrench, Link as LinkIcon, Image as ImageIcon, DollarSign, Search } from 'lucide-react';
import { Product, ItemType } from '../types';

export default function Products() {
  const { products, addProduct, deleteProduct } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ItemType>('product');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({ 
    name: '', 
    price: '', 
    costPrice: '',
    description: '', 
    imageUrl: '' 
  });

  // Filter list based on active tab and search term
  const filteredItems = products.filter(p => {
    const itemType = p.type || 'product';
    const matchesTab = itemType === activeTab;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    addProduct({
      name: formData.name,
      price: parseFloat(formData.price),
      costPrice: formData.costPrice ? parseFloat(formData.costPrice) : 0,
      description: formData.description,
      type: activeTab,
      imageUrl: formData.imageUrl
    });
    setFormData({ name: '', price: '', costPrice: '', description: '', imageUrl: '' });
    setIsModalOpen(false);
  };

  const openModalWithTab = (type: ItemType) => {
      setActiveTab(type);
      setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Gerenciar Catálogo</h1>
        
        <div className="bg-zinc-900 p-1 rounded-full flex items-center border border-zinc-800 shadow-sm">
            <button
                onClick={() => setActiveTab('product')}
                className={`px-6 py-2 rounded-full text-xs font-bold tracking-widest transition-all duration-300 flex items-center gap-2 ${
                    activeTab === 'product' 
                    ? 'bg-white text-black shadow-md' 
                    : 'text-zinc-500 hover:text-white'
                }`}
            >
                <Package size={14} />
                PRODUTOS
            </button>
            <button
                onClick={() => setActiveTab('service')}
                className={`px-6 py-2 rounded-full text-xs font-bold tracking-widest transition-all duration-300 flex items-center gap-2 ${
                    activeTab === 'service' 
                    ? 'bg-white text-black shadow-md' 
                    : 'text-zinc-500 hover:text-white'
                }`}
            >
                <Wrench size={14} />
                SERVIÇOS
            </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-red-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-orange-500/20 transition"
        >
          <Plus size={20} />
          <span>Novo {activeTab === 'product' ? 'Produto' : 'Serviço'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
          <input
            type="text"
            placeholder={`Buscar por nome de ${activeTab === 'product' ? 'produto' : 'serviço'}...`}
            className="w-full bg-surface border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm placeholder-zinc-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-3.5 text-zinc-500" size={20} />
      </div>

      <div className="bg-surface border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-300">
              <tr>
                <th className="px-6 py-4 font-semibold w-24">Imagem</th>
                <th className="px-6 py-4 font-semibold">Nome</th>
                <th className="px-6 py-4 font-semibold">Descrição</th>
                <th className="px-6 py-4 font-semibold">Custo</th>
                <th className="px-6 py-4 font-semibold">Venda</th>
                <th className="px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-600">
                    <div className="flex flex-col items-center">
                      {activeTab === 'product' ? <Package size={48} className="mb-2 opacity-20" /> : <Wrench size={48} className="mb-2 opacity-20" />}
                      <p>Nenhum {activeTab === 'product' ? 'produto' : 'serviço'} encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/50 transition">
                    <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center border border-zinc-700">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon size={20} className="text-zinc-600" />
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                    <td className="px-6 py-4 max-w-xs truncate">{item.description || '-'}</td>
                    <td className="px-6 py-4 text-zinc-500">
                        {item.costPrice ? `R$ ${Number(item.costPrice).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-primary font-medium">R$ {Number(item.price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteProduct(item.id)}
                        className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition"
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

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-surface border border-zinc-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white capitalize">Novo {activeTab === 'product' ? 'Produto' : 'Serviço'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">
                <Plus size={24} className="transform rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Preço Venda (R$)</label>
                    <input
                    type="text"
                    required
                    className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    value={formData.price}
                    placeholder="0.00"
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Custo (Opcional)</label>
                    <input
                    type="text"
                    className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none"
                    value={formData.costPrice}
                    onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0.00"
                    />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">URL da Imagem</label>
                <div className="relative">
                    <input
                    type="text"
                    placeholder="https://..."
                    className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none pl-10"
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    />
                    <LinkIcon className="absolute left-3 top-2.5 text-zinc-600" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Descrição (Opcional)</label>
                <textarea
                  className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-amber-600 transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
