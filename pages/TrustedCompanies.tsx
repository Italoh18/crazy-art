
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Link as LinkIcon, Building } from 'lucide-react';

export default function TrustedCompanies() {
  const { trustedCompanies, addTrustedCompany, deleteTrustedCompany } = useData();
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    addTrustedCompany(newName || 'Empresa Parceira', newUrl.trim());
    setNewUrl('');
    setNewName('');
  };

  const headerFont = { fontFamily: '"Times New Roman", Times, serif' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white" style={headerFont}>Empresas que Confiam</h1>
      <p className="text-zinc-400 text-sm">Adicione logotipos de empresas parceiras para exibir na página inicial.</p>

      <div className="bg-surface border border-zinc-800 p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-4">Adicionar Nova Empresa</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="relative flex-1 w-full">
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">Nome da Empresa</label>
            <div className="relative">
                <input
                type="text"
                placeholder="Ex: Google"
                className="w-full bg-black/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary outline-none transition"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                />
                <Building className="absolute left-3 top-3 text-zinc-500" size={18} />
            </div>
          </div>
          
          <div className="relative flex-[2] w-full">
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 ml-1">URL do Logotipo</label>
            <div className="relative">
                <input
                type="text"
                placeholder="Cole o link da imagem (http://...)"
                className="w-full bg-black/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary outline-none transition"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                />
                <LinkIcon className="absolute left-3 top-3 text-zinc-500" size={18} />
            </div>
          </div>

          <button 
            type="submit"
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-amber-600 transition flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>Adicionar</span>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {trustedCompanies.map((company) => (
          <div key={company.id} className="bg-surface border border-zinc-800 rounded-xl overflow-hidden group relative flex flex-col">
            <div className="aspect-square bg-white p-4 flex items-center justify-center relative">
                <img src={company.image_url} alt={company.name} className="max-w-full max-h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button 
                        onClick={() => deleteTrustedCompany(company.id)}
                        className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 shadow-xl transform scale-0 group-hover:scale-100 transition-transform duration-300"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
            <div className="p-3 bg-zinc-900 border-t border-zinc-800">
                <p className="text-sm font-bold text-white truncate">{company.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{company.image_url}</p>
            </div>
          </div>
        ))}
        
        {trustedCompanies.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-xl">
            <Building size={48} className="mx-auto text-zinc-800 mb-4" />
            <p className="text-muted">Nenhuma empresa adicionada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
