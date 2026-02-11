
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Save, Image as ImageIcon, Link as LinkIcon, Fingerprint, Check } from 'lucide-react';

export default function Identity() {
  const { faviconUrl, updateFavicon } = useData();
  const [url, setUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (faviconUrl) setUrl(faviconUrl);
  }, [faviconUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsSaving(true);
    await updateFavicon(url.trim());
    setIsSaving(false);
    
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-800 rounded-xl text-white">
              <Fingerprint size={24} />
          </div>
          <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Identidade</h1>
              <p className="text-zinc-400 text-sm mt-1">Configurações visuais do navegador.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cartão de Edição */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <ImageIcon size={20} className="text-primary" /> Ícone da Aba (Favicon)
              </h2>
              
              <form onSubmit={handleSave} className="space-y-6">
                  <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">URL do Ícone (PNG/ICO)</label>
                      <div className="relative">
                          <input 
                              type="text" 
                              value={url}
                              onChange={(e) => setUrl(e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition"
                          />
                          <LinkIcon className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-2 ml-1">Cole o link da imagem. Isso alterará o ícone ao lado do título da aba no navegador.</p>
                  </div>

                  <button 
                      type="submit" 
                      disabled={isSaving}
                      className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                          success 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-primary text-white hover:bg-amber-600'
                      }`}
                  >
                      {success ? (
                          <>
                              <Check size={18} /> Salvo com Sucesso!
                          </>
                      ) : (
                          <>
                              <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                          </>
                      )}
                  </button>
              </form>
          </div>

          {/* Cartão de Preview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/50 to-transparent pointer-events-none"></div>
              
              <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-8 relative z-10">Pré-visualização</h3>
              
              <div className="flex flex-col gap-4 items-center">
                  <div className="relative z-10 p-4 bg-zinc-800 rounded-t-lg border border-zinc-700 w-64 flex items-center gap-3 shadow-lg">
                      {url ? (
                          <img 
                            src={url} 
                            alt="Favicon Preview" 
                            className="w-4 h-4 object-contain"
                            onError={(e) => e.currentTarget.style.display = 'none'} 
                          />
                      ) : (
                          <div className="w-4 h-4 bg-zinc-600 rounded-sm"></div>
                      )}
                      <span className="text-xs text-zinc-300 font-medium">Crazy Art | Studio...</span>
                      <div className="ml-auto text-zinc-500 text-[10px]">✕</div>
                  </div>
                  <div className="w-64 h-24 bg-white rounded-b-lg opacity-10"></div>
              </div>
              
              <div className="mt-8 text-center relative z-10">
                  <p className="text-zinc-500 text-[10px]">Exemplo de como aparecerá no navegador</p>
              </div>
          </div>
      </div>
    </div>
  );
}
