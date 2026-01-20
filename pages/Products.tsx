
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Package, Wrench, Link as LinkIcon, Image as ImageIcon, Search, CheckCircle, AlertOctagon, AlertTriangle, Loader2, Edit, X } from 'lucide-react';
import { ItemType, Product } from '../types';

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ItemType>('product');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // State de Edição
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    // Ensure we are not rendering invalid items without IDs
    return matchesTab && matchesSearch && p.id;
  });

  const openNewModal = () => {
      setIsEditMode(false);
      setEditId(null);
      setFormData({ name: '', price: '', costPrice: '', description: '', imageUrl: '' });
      setIsModalOpen(true);
  };

  const handleEdit = (item: Product) => {
      setIsEditMode(true);
      setEditId(item.id);
      setFormData({
          name: item.name,
          price: item.price.toString(),
          costPrice: item.costPrice ? item.costPrice.toString() : '',
          description: item.description || '',
          imageUrl: item.imageUrl || ''
      });
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    const payload = {
        name: formData.name,
        price: parseFloat(formData.price.replace(',', '.')),
        costPrice: formData.costPrice ? parseFloat(formData.costPrice.replace(',', '.')) : 0,
        description: formData.description,
        type: activeTab,
        imageUrl: formData.imageUrl
    };

    try {
      if (isEditMode && editId) {
          await updateProduct(editId, payload);
          setNotification({ message: 'Item atualizado com sucesso!', type: 'success' });
      } else {
          await addProduct(payload);
          setNotification({ message: `${activeTab === 'product' ? 'Produto' : 'Serviço'} adicionado com sucesso!`, type: 'success' });
      }
      
      setFormData({ name: '', price: '', costPrice: '', description: '', imageUrl: '' });
      setIsModalOpen(false);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ message: 'Erro: ' + err.message, type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const confirmDelete = (id: string) => {
    if (!id) return;
    setDeleteId(id);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deleteId);
      setNotification({ message: 'Item removido com sucesso!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      setDeleteId(null); 
    } catch (err: any) {
      setNotification({ message: 'Erro ao remover: ' + err.message, type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 relative">
      
      {notification && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in-up ${
              notification.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-500 text-white shadow-red-500/20'
          }`}>
              {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertOctagon size={20} />}
              <span className="font-bold text-sm">{notification.message}</span>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Gerenciar Catálogo</h1>
            <p className="text-zinc-400 text-sm mt-1">Adicione ou edite produtos e serviços.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="bg-zinc-900 p-1.5 rounded-xl flex items-center border border-zinc-800 shadow-sm flex-1 md:flex-none">
                <button
                    onClick={() => setActiveTab('product')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                        activeTab === 'product' 
                        ? 'bg-zinc-800 text-white shadow-md ring-1 ring-zinc-700' 
                        : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <Package size={14} />
                    PRODUTOS
                </button>
                <button
                    onClick={() => setActiveTab('service')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                        activeTab === 'service' 
                        ? 'bg-zinc-800 text-white shadow-md ring-1 ring-zinc-700' 
                        : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    <Wrench size={14} />
                    SERVIÇOS
                </button>
            </div>

            <button
            onClick={openNewModal}
            className="flex items-center justify-center space-x-2 bg-primary text-white w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-3 rounded-xl hover:bg-amber-600 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
            >
            <Plus size={20} />
            <span className="hidden md:inline font-bold text-sm">Novo Item</span>
            </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group">
          <div className="absolute -inset-0.5 bg-zinc-800 rounded-xl blur opacity-20 group-hover:opacity-100 transition duration-500"></div>
          <input
            type="text"
            placeholder={`Buscar por nome de ${activeTab === 'product' ? 'produto' : 'serviço'}...`}
            className="relative w-full bg-zinc-900 border border-zinc-800 text-white pl-12 pr-4 py-4 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none shadow-sm placeholder-zinc-500 transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-4 text-zinc-500 group-hover:text-primary transition-colors" size={20} />
      </div>

      <div className="bg-surface border border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-300 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="px-6 py-5 w-24">Imagem</th>
                <th className="px-6 py-5">Nome</th>
                <th className="px-6 py-5">Descrição</th>
                <th className="px-6 py-5">Custo</th>
                <th className="px-6 py-5">Venda</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-zinc-600">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center">
                          {activeTab === 'product' ? <Package size={40} className="opacity-20" /> : <Wrench size={40} className="opacity-20" />}
                      </div>
                      <p className="text-sm">Nenhum {activeTab === 'product' ? 'produto' : 'serviço'} encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-lg bg-zinc-900 overflow-hidden flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors shadow-sm relative">
                            {/* Fundo com Ícone (Fallback) */}
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                                <ImageIcon size={18} />
                            </div>
                            {/* Imagem Real (Cobre o ícone se carregar) */}
                            {item.imageUrl && (
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 relative z-10"
                                    onError={(e) => e.currentTarget.style.display = 'none'} // Esconde a imagem se quebrar, revelando o ícone
                                />
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">{item.name}</td>
                    <td className="px-6 py-4 max-w-xs truncate opacity-70">{item.description || '-'}</td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                        {item.costPrice ? `R$ ${Number(item.costPrice).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold font-mono">R$ {Number(item.price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => handleEdit(item)}
                            className="text-zinc-600 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-all hover:scale-110"
                            title="Editar Item"
                        >
                            <Edit size={18} />
                        </button>
                        <button
                            onClick={() => confirmDelete(item.id)}
                            className="text-zinc-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all hover:scale-110"
                            title="Remover Item"
                        >
                            <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-surface border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md relative">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-surface/95 backdrop-blur rounded-t-2xl">
              <h2 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                  {isEditMode ? <Edit className="text-primary" size={20} /> : (activeTab === 'product' ? <Package className="text-primary" size={20} /> : <Wrench className="text-primary" size={20} />)}
                  {isEditMode ? 'Editar' : 'Novo'} {activeTab === 'product' ? 'Produto' : 'Serviço'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-transform hover:rotate-90">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Nome</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cartão de Visita"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Preço Venda (R$)</label>
                    <input
                    type="text"
                    required
                    className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                    value={formData.price}
                    placeholder="0.00"
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Custo (Opcional)</label>
                    <input
                    type="text"
                    className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition"
                    value={formData.costPrice}
                    onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0.00"
                    />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">URL da Imagem</label>
                <div className="relative">
                    <input
                    type="text"
                    placeholder="https://..."
                    className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    />
                    <LinkIcon className="absolute left-3 top-3.5 text-zinc-600" size={16} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Descrição (Opcional)</label>
                <textarea
                  className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do item..."
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-zinc-800/50 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-lg shadow-primary/20"
                >
                  {isEditMode ? 'Salvar Alterações' : 'Criar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-scale-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
               <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Excluir Item?</h2>
            <p className="text-zinc-400 text-center text-sm mb-6">
              Esta ação removerá o item da visualização, mas manterá o histórico em pedidos existentes.
            </p>
            <div className="flex space-x-3">
               <button 
                  onClick={() => setDeleteId(null)} 
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition font-medium"
                  disabled={isDeleting}
               >
                 Cancelar
               </button>
               <button 
                  onClick={executeDelete} 
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isDeleting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Excluindo...
                    </>
                 ) : (
                    'Sim, Excluir'
                 )}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
