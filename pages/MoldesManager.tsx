
import React, { useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Scissors, 
  ChevronRight, ArrowLeft, Upload, Loader2, X, Save
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUploadInput } from '../components/ImageUploadInput';
import { Molde } from '../types';

export default function MoldesManager() {
  const { moldes, addMolde, updateMolde, deleteMolde } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMolde, setEditingMolde] = useState<Molde | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    category: 'comum',
    subcategory: 'redonda',
    image_url: '',
    measurements: {} as Record<string, any>
  });

  const categories = [
    { id: 'comum', name: 'Comum', sub: ['redonda', 'V', 'polo'] },
    { id: 'blk-fem', name: 'Blk Fem', sub: ['redonda', 'V', 'polo'] },
    { id: 'raglan', name: 'Raglan', sub: ['redonda', 'V', 'polo'] },
    { id: 'moleton', name: 'Moleton' },
    { id: 'short', name: 'Short' },
    { id: 'calça', name: 'Calça' },
    { id: 'avental', name: 'Avental' },
    { id: 'mascara', name: 'Mascara' }
  ];

  const fullGrade = ['t2', 't4', 't6', 't8', 't10', 't12', 't14', 't16', 'P', 'M', 'G', 'GG', 'XG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'];
  const blkFemGrade = ['P', 'M', 'G', 'GG', 'XG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'];

  const currentGrade = formData.category === 'blk-fem' ? blkFemGrade : fullGrade;

  const handleOpenForm = (molde?: Molde) => {
    if (molde) {
      setEditingMolde(molde);
      setFormData({
        category: molde.category,
        subcategory: molde.subcategory || '',
        image_url: molde.image_url || '',
        measurements: molde.measurements || {}
      });
    } else {
      setEditingMolde(null);
      setFormData({
        category: 'comum',
        subcategory: 'redonda',
        image_url: '',
        measurements: {}
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (editingMolde) {
        await updateMolde(editingMolde.id, formData);
      } else {
        await addMolde(formData);
      }
      setShowForm(false);
    } catch (err) {
      console.error('Erro ao salvar molde:', err);
      alert('Erro ao salvar molde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este molde?')) {
      try {
        await deleteMolde(id);
      } catch (err) {
        console.error('Erro ao excluir molde:', err);
        alert('Erro ao excluir molde');
      }
    }
  };

  const updateMeasurement = (size: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [size]: {
          ...(prev.measurements[size] || {}),
          [field]: value
        }
      }
    }));
  };

  const filteredMoldes = moldes.filter(m => 
    m.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
            <Scissors className="text-primary" /> Gerenciar Moldes
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Configuração de grades e medidas Crazy Art</p>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20"
        >
          <Plus size={18} /> Novo Molde
        </button>
      </header>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 flex items-center gap-4">
        <Search className="text-zinc-500" size={20} />
        <input 
          type="text"
          placeholder="BUSCAR POR CATEGORIA OU SUB-CATEGORIA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-white w-full uppercase font-bold tracking-widest placeholder:text-zinc-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMoldes.map(molde => (
          <div key={molde.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-primary/50 transition-all shadow-lg hover:shadow-primary/5">
            <div className="aspect-[4/3] bg-black relative overflow-hidden flex items-center justify-center p-4">
              {molde.image_url ? (
                <img src={molde.image_url} alt="Molde" className="max-w-full max-h-full object-contain" />
              ) : (
                <Scissors size={48} className="text-zinc-800" />
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => handleOpenForm(molde)}
                  className="p-2 bg-black/60 text-white rounded-xl hover:bg-primary hover:text-black transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(molde.id)}
                  className="p-2 bg-black/60 text-white rounded-xl hover:bg-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
                  {molde.category}
                </span>
                {molde.subcategory && (
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded">
                    {molde.subcategory}
                  </span>
                )}
              </div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                {Object.keys(molde.measurements || {}).length} Tamanhos configurados
              </p>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[90vh]"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                  {editingMolde ? 'Editar Molde' : 'Novo Molde'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoria</label>
                        <select 
                          value={formData.category}
                          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value, subcategory: categories.find(c => c.id === e.target.value)?.sub?.[0] || '' }))}
                          className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-4 text-sm text-white outline-none focus:border-primary transition"
                        >
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sub-categoria</label>
                        <select 
                          value={formData.subcategory}
                          onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                          className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-4 text-sm text-white outline-none focus:border-primary transition disabled:opacity-50"
                          disabled={!categories.find(c => c.id === formData.category)?.sub}
                        >
                          {!categories.find(c => c.id === formData.category)?.sub && <option value="">Sem sub-categoria</option>}
                          {categories.find(c => c.id === formData.category)?.sub?.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Imagem de Referência</label>
                      <ImageUploadInput 
                        value={formData.image_url}
                        onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                        label="Clique para subir a imagem do molde"
                        category="outros"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Grade de Medidas (cm)</label>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                      {currentGrade.map(size => (
                        <div key={size} className="bg-black/20 border border-zinc-800 p-6 rounded-3xl space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <span className="text-xl font-black italic text-primary">{size}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8px] text-zinc-600 font-black uppercase">Altura</label>
                              <input 
                                type="text" 
                                value={formData.measurements[size]?.height || ''}
                                onChange={(e) => updateMeasurement(size, 'height', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-[10px] text-white outline-none focus:border-primary"
                                placeholder="00"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-zinc-600 font-black uppercase">Largura</label>
                              <input 
                                type="text" 
                                value={formData.measurements[size]?.width || ''}
                                onChange={(e) => updateMeasurement(size, 'width', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-[10px] text-white outline-none focus:border-primary"
                                placeholder="00"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-zinc-600 font-black uppercase">Manga</label>
                              <input 
                                type="text" 
                                value={formData.measurements[size]?.sleeve || ''}
                                onChange={(e) => updateMeasurement(size, 'sleeve', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-[10px] text-white outline-none focus:border-primary"
                                placeholder="00"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-zinc-600 font-black uppercase">Ombro</label>
                              <input 
                                type="text" 
                                value={formData.measurements[size]?.shoulder || ''}
                                onChange={(e) => updateMeasurement(size, 'shoulder', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-[10px] text-white outline-none focus:border-primary"
                                placeholder="00"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-zinc-600 font-black uppercase">Gola</label>
                              <input 
                                type="text" 
                                value={formData.measurements[size]?.collar || ''}
                                onChange={(e) => updateMeasurement(size, 'collar', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-[10px] text-white outline-none focus:border-primary"
                                placeholder="00"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-zinc-800 bg-black/20 flex gap-4">
                <button 
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-zinc-700 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Salvar Molde
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
