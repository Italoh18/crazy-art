
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Package, Wrench, Link as LinkIcon, Image as ImageIcon, Search, CheckCircle, AlertOctagon, AlertTriangle, Loader2, Edit, X, Palette, CloudDownload, Hash, TrendingDown, Layers } from 'lucide-react';
import { ItemType, Product, PriceVariation } from '../types';

const DEFAULT_SUBCATEGORIES = ['Carnaval', 'Colegio', 'Futebol', 'E-sport', 'Anime', 'Patterns', 'Icons', 'Emojis', 'Animais', 'Logos', 'Bordados'];

// Mesmas cores do Shop para manter consistência
const ART_COLORS = [
    { name: 'Preto', hex: '#000000' },
    { name: 'Branco', hex: '#FFFFFF' },
    { name: 'Cinza', hex: '#808080' },
    { name: 'Vermelho', hex: '#EF4444' },
    { name: 'Laranja', hex: '#F97316' },
    { name: 'Amarelo', hex: '#EAB308' },
    { name: 'Verde', hex: '#22C55E' },
    { name: 'Azul', hex: '#3B82F6' },
    { name: 'Roxo', hex: '#A855F7' },
    { name: 'Rosa', hex: '#EC4899' },
];

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
    imageUrl: '',
    downloadLink: '',
    subcategory: '',
    primaryColor: '#000000'
  });

  // State para variações de preço (Apenas Produtos)
  const [variations, setVariations] = useState<PriceVariation[]>([]);

  // Filter list based on active tab and search term
  const filteredItems = products.filter(p => {
    const itemType = p.type || 'product';
    const matchesTab = itemType === activeTab;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch && p.id;
  });

  const openNewModal = () => {
      setIsEditMode(false);
      setEditId(null);
      setFormData({ name: '', price: '', costPrice: '', description: '', imageUrl: '', downloadLink: '', subcategory: '', primaryColor: '#000000' });
      setVariations([]);
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
          imageUrl: item.imageUrl || '',
          downloadLink: item.downloadLink || '',
          subcategory: item.subcategory || '',
          primaryColor: item.primaryColor || '#000000'
      });
      setVariations(item.priceVariations || []);
      setIsModalOpen(true);
  };

  const handleAddVariation = () => {
      setVariations([...variations, { minQuantity: 10, price: 0 }]);
  };

  const handleRemoveVariation = (index: number) => {
      setVariations(variations.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, field: keyof PriceVariation, value: string) => {
      const newVars = [...variations];
      const val = parseFloat(value.replace(',', '.'));
      if (!isNaN(val)) {
          newVars[index][field] = val;
          setVariations(newVars);
      }
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
        imageUrl: formData.imageUrl,
        downloadLink: activeTab === 'art' ? formData.downloadLink : null,
        subcategory: activeTab === 'art' ? formData.subcategory : null,
        primaryColor: activeTab === 'art' ? formData.primaryColor : null,
        priceVariations: activeTab === 'product' ? variations : []
    };

    try {
      if (isEditMode && editId) {
          await updateProduct(editId, payload);
          setNotification({ message: 'Item atualizado com sucesso!', type: 'success' });
      } else {
          await addProduct(payload);
          setNotification({ message: 'Item adicionado com sucesso!', type: 'success' });
      }
      
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

  const getTabLabel = (type: ItemType) => {
      switch(type) {
          case 'product': return 'PRODUTOS';
          case 'service': return 'SERVIÇOS';
          case 'art': return 'ARTES';
      }
  };

  const getTabIcon = (type: ItemType) => {
      switch(type) {
          case 'product': return <Package size={14} />;
          case 'service': return <Wrench size={14} />;
          case 'art': return <Palette size={14} />;
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
            <p className="text-zinc-400 text-sm mt-1">Adicione ou edite produtos, serviços e artes digitais.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <div className="bg-zinc-900 p-1.5 rounded-xl flex items-center border border-zinc-800 shadow-sm flex-1 md:flex-none">
                {(['product', 'service', 'art'] as ItemType[]).map(type => (
                    <button
                        key={type}
                        onClick={() => setActiveTab(type)}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                            activeTab === type
                            ? 'bg-zinc-800 text-white shadow-md ring-1 ring-zinc-700' 
                            : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        {getTabIcon(type)}
                        {getTabLabel(type)}
                    </button>
                ))}
            </div>

            <button
            onClick={openNewModal}
            className="flex items-center justify-center space-x-2 bg-primary text-white w-12 h-12 md:w-auto md:h-auto md:px-5 md:py-3 rounded-xl hover:bg-amber-600 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 shrink-0"
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
            placeholder={`Buscar por nome...`}
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
                {activeTab === 'art' && (
                    <>
                        <th className="px-6 py-5">Categoria</th>
                        <th className="px-6 py-5">Cor</th>
                        <th className="px-6 py-5">Download</th>
                    </>
                )}
                {activeTab === 'product' && <th className="px-6 py-5">Atacado?</th>}
                <th className="px-6 py-5">Custo</th>
                <th className="px-6 py-5">Venda</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'art' ? 9 : activeTab === 'product' ? 7 : 6} className="px-6 py-16 text-center text-zinc-600">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center">
                          {activeTab === 'product' ? <Package size={40} className="opacity-20" /> : activeTab === 'service' ? <Wrench size={40} className="opacity-20" /> : <Palette size={40} className="opacity-20" />}
                      </div>
                      <p className="text-sm">Nenhum item encontrado nesta categoria.</p>
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
                                    onError={(e) => e.currentTarget.style.display = 'none'} 
                                />
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">{item.name}</td>
                    <td className="px-6 py-4 max-w-xs truncate opacity-70">{item.description || '-'}</td>
                    {activeTab === 'art' && (
                        <>
                            <td className="px-6 py-4 text-xs">{item.subcategory || '-'}</td>
                            <td className="px-6 py-4">
                                {item.primaryColor ? (
                                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: item.primaryColor }} title={item.primaryColor}></div>
                                ) : '-'}
                            </td>
                            <td className="px-6 py-4">
                                {item.downloadLink ? (
                                    <a href={item.downloadLink} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 text-xs font-bold" title={item.downloadLink}>
                                        <CloudDownload size={14} /> Link
                                    </a>
                                ) : <span className="text-zinc-600 text-xs">Sem link</span>}
                            </td>
                        </>
                    )}
                    {activeTab === 'product' && (
                        <td className="px-6 py-4">
                            {item.priceVariations && item.priceVariations.length > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/20">
                                    Sim ({item.priceVariations.length})
                                </span>
                            ) : <span className="text-zinc-600 text-[10px]">-</span>}
                        </td>
                    )}
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
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/90 backdrop-blur-sm p-4 animate-fade-in-up overflow-y-auto">
          <div className="bg-surface border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col relative">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-surface/95 backdrop-blur rounded-t-2xl shrink-0">
              <h2 className="text-xl font-bold text-white capitalize flex items-center gap-2">
                  {isEditMode ? <Edit className="text-primary" size={20} /> : getTabIcon(activeTab)}
                  {isEditMode ? 'Editar' : 'Novo'} {activeTab === 'product' ? 'Produto' : activeTab === 'service' ? 'Serviço' : 'Arte'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-transform hover:rotate-90">
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-8 custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Nome</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Item Exemplo"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Preço Base (1 un)</label>
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

                  {/* SEÇÃO DE VARIAÇÃO DE PREÇO (ATACADO) - APENAS PRODUTOS */}
                  {activeTab === 'product' && (
                      <div className="bg-zinc-900/50 p-4 rounded-xl border border-dashed border-zinc-700">
                          <div className="flex justify-between items-center mb-3">
                              <h4 className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1"><TrendingDown size={14} /> Preços de Atacado</h4>
                              <button type="button" onClick={handleAddVariation} className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded hover:bg-blue-500 hover:text-white transition flex items-center gap-1">
                                  <Plus size={12} /> Adicionar Faixa
                              </button>
                          </div>
                          
                          {variations.length === 0 ? (
                              <p className="text-[10px] text-zinc-500 italic text-center">Nenhuma variação. O preço base será usado sempre.</p>
                          ) : (
                              <div className="space-y-2">
                                  <div className="grid grid-cols-5 gap-2 text-[9px] font-bold text-zinc-600 uppercase text-center">
                                      <div className="col-span-2">A partir de (Qtd)</div>
                                      <div className="col-span-2">Novo Preço (R$)</div>
                                      <div className="col-span-1"></div>
                                  </div>
                                  {variations.map((v, index) => (
                                      <div key={index} className="grid grid-cols-5 gap-2 items-center">
                                          <div className="col-span-2">
                                              <input 
                                                  type="number" 
                                                  min="2"
                                                  value={v.minQuantity} 
                                                  onChange={(e) => updateVariation(index, 'minQuantity', e.target.value)}
                                                  className="w-full bg-black/40 border border-zinc-700 rounded-lg px-2 py-1.5 text-center text-white text-xs"
                                              />
                                          </div>
                                          <div className="col-span-2">
                                              <input 
                                                  type="number" 
                                                  step="0.01"
                                                  value={v.price} 
                                                  onChange={(e) => updateVariation(index, 'price', e.target.value)}
                                                  className="w-full bg-black/40 border border-zinc-700 rounded-lg px-2 py-1.5 text-center text-emerald-400 font-bold text-xs"
                                              />
                                          </div>
                                          <div className="col-span-1 flex justify-center">
                                              <button type="button" onClick={() => handleRemoveVariation(index)} className="text-zinc-600 hover:text-red-500 p-1">
                                                  <Trash2 size={14} />
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}
                  
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

                  {activeTab === 'art' && (
                      <div className="animate-fade-in space-y-4 p-4 bg-purple-900/10 rounded-xl border border-purple-500/20">
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Detalhes da Arte</h4>
                        
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Subcategoria (Pasta)</label>
                            <div className="relative">
                                <input
                                list="categories"
                                type="text"
                                placeholder="Selecione ou digite..."
                                className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-3 pr-4 py-3 text-white focus:border-purple-500 outline-none transition text-sm"
                                value={formData.subcategory}
                                onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                                />
                                <datalist id="categories">
                                    {DEFAULT_SUBCATEGORIES.map(cat => <option key={cat} value={cat} />)}
                                </datalist>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1">Cor Principal</label>
                            <div className="flex flex-wrap gap-2">
                                {ART_COLORS.map(c => (
                                    <button
                                        key={c.hex}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, primaryColor: c.hex })}
                                        className={`w-8 h-8 rounded-full border-2 transition hover:scale-110 ${formData.primaryColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-zinc-500'}`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.name}
                                    />
                                ))}
                                {/* Input Customizado Opcional (se quiser manter flexibilidade total) */}
                                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-zinc-700 hover:border-zinc-500 transition group" title="Outra cor">
                                    <input 
                                        type="color" 
                                        className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer p-0 border-0"
                                        value={formData.primaryColor}
                                        onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:bg-white/10">
                                        <Plus size={14} className="text-zinc-400" />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-1 text-xs font-mono text-zinc-500 ml-1">{formData.primaryColor}</div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Link para Download</label>
                            <div className="relative">
                                <input
                                type="text"
                                placeholder="Link do Drive/Dropbox..."
                                className="w-full bg-black/40 border border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
                                value={formData.downloadLink}
                                onChange={e => setFormData({ ...formData, downloadLink: e.target.value })}
                                />
                                <CloudDownload className="absolute left-3 top-3.5 text-emerald-500" size={16} />
                            </div>
                        </div>
                      </div>
                  )}

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
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/90 backdrop-blur-md p-4 animate-scale-in">
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
