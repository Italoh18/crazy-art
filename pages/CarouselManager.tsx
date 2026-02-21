
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

export default function CarouselManager() {
  const { carouselImages, addCarouselImage, deleteCarouselImage } = useData();
  const [newUrl, setNewUrl] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    addCarouselImage(newUrl.trim());
    setNewUrl('');
  };

  const headerFont = { fontFamily: '"Times New Roman", Times, serif' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white" style={headerFont}>Gerenciar Carrossel</h1>

      <div className="bg-surface border border-zinc-800 p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-4">Adicionar Nova Imagem</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cole o link da imagem (http://...)"
              className="w-full bg-black/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary outline-none transition"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <LinkIcon className="absolute left-3 top-3 text-zinc-500" size={18} />
            <p className="text-[10px] text-zinc-500 mt-1.5 ml-1">Tamanho recomendado: <span className="text-primary font-bold">1920x100 pixels</span> (ou proporção ultra-wide)</p>
          </div>
          <button 
            type="submit"
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-amber-600 transition flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span>Adicionar</span>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {carouselImages.map((img) => (
          <div key={img.id} className="bg-surface border border-zinc-800 rounded-xl overflow-hidden group">
            <div className="aspect-video bg-zinc-900 overflow-hidden relative">
                <img src={img.url} alt="Carousel item" className="w-full h-full object-cover transition group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button 
                        onClick={() => deleteCarouselImage(img.id)}
                        className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 shadow-xl"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
            <div className="p-3 bg-surface border-t border-zinc-800">
                <p className="text-xs text-muted truncate">{img.url}</p>
            </div>
          </div>
        ))}
        
        {carouselImages.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-xl">
            <ImageIcon size={48} className="mx-auto text-zinc-800 mb-4" />
            <p className="text-muted">Nenhuma imagem no carrossel.</p>
          </div>
        )}
      </div>
    </div>
  );
}
