
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Save, Image as ImageIcon, Link as LinkIcon, Fingerprint, Check } from 'lucide-react';
import { ImageUploadInput } from '../components/ImageUploadInput';

export default function Identity() {
  const { 
    faviconUrl, updateFavicon, 
    mockupFrontUrl, updateMockupFront, 
    mockupBackUrl, updateMockupBack 
  } = useData();
  const [url, setUrl] = useState('');
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (faviconUrl) setUrl(faviconUrl);
    if (mockupFrontUrl) setFrontUrl(mockupFrontUrl);
    if (mockupBackUrl) setBackUrl(mockupBackUrl);
  }, [faviconUrl, mockupFrontUrl, mockupBackUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSaving(true);
    if (url !== faviconUrl) await updateFavicon(url.trim());
    if (frontUrl !== mockupFrontUrl) await updateMockupFront(frontUrl.trim());
    if (backUrl !== mockupBackUrl) await updateMockupBack(backUrl.trim());
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

      <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Cartão de Edição */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <ImageIcon size={20} className="text-primary" /> Ícone da Aba (Favicon)
                  </h2>
                  
                  <div className="space-y-6">
                      <div>
                          <ImageUploadInput 
                            label="URL do Ícone (PNG/ICO)"
                            value={url}
                            onChange={setUrl}
                            placeholder="https://..."
                            category="outros"
                          />
                          <p className="text-[10px] text-zinc-600 mt-2 ml-1">Cole o link da imagem ou faça upload. Isso alterará o ícone ao lado do título da aba no navegador.</p>
                      </div>
                  </div>
              </div>

              {/* Camisa Mockup */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <ImageIcon size={20} className="text-primary" /> Camisas do Mockup (Frente/Costa)
                  </h2>
                  
                  <div className="space-y-6">
                      <ImageUploadInput 
                        label="Camisa Frente (PNG Transparente)"
                        value={frontUrl}
                        onChange={setFrontUrl}
                        placeholder="https://..."
                        category="mockups"
                      />
                      <ImageUploadInput 
                        label="Camisa Costas (PNG Transparente)"
                        value={backUrl}
                        onChange={setBackUrl}
                        placeholder="https://..."
                        category="mockups"
                      />
                      <p className="text-[10px] text-zinc-600">Essas imagens serão usadas como base na ferramenta "Monte seu Layout". Use arquivos PNG com fundo transparente.</p>
                  </div>
              </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
              <div className="hidden md:block">
                  <p className="text-zinc-500 text-xs">Certifique-se de salvar após as alterações.</p>
              </div>
              <button 
                  type="submit" 
                  disabled={isSaving}
                  className={`px-12 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
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
          </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                      <span className="text-xs text-zinc-300 font-medium">Crazy Art | Comunicação...</span>
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
