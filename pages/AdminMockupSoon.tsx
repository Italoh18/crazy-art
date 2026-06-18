import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Save, Image as ImageIcon, Sparkles, Layers, Check } from 'lucide-react';
import { ImageUploadInput } from '../components/ImageUploadInput';

export default function AdminMockupSoon() {
  const { mockupBaseUrl, updateMockupBase } = useData();
  const [baseUrl, setBaseUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (mockupBaseUrl) setBaseUrl(mockupBaseUrl);
  }, [mockupBaseUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateMockupBase(baseUrl.trim());
    setIsSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 select-none">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-zinc-800 rounded-xl text-white">
          <Layers size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mockup 2D</h1>
          <p className="text-zinc-400 text-sm mt-1">Gerenciamento de Mockups e Modelos Base.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card: Mockup Base */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ImageIcon size={20} className="text-primary" /> Mockup Base (SVG/Camisa)
            </h2>
            
            <div className="space-y-6">
              <ImageUploadInput 
                label="Imagem do Mockup (Frente e Verso Juntos)"
                value={baseUrl}
                onChange={setBaseUrl}
                placeholder="https://..."
                category="mockups"
              />
              <p className="text-[10px] text-zinc-500">Este arquivo será a base da ferramenta "Monte seu Layout". Use um arquivo (SVG ou PNG) que já mostre os dois lados da camisa.</p>
            </div>
          </div>

          {/* Informações Úteis / Detalhes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-[#a855f7]" /> Informações da Ferramenta
              </h2>
              <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                <p>
                  O Mockup Base serve como base de colagem sob a qual os patrocinadores, logos e outros elementos gráficos são posicionados pelos usuários.
                </p>
                <p>
                  Para um melhor resultado, utilize imagens com fundo transparente (PNG) ou vetoriais (SVG) que contenham ambas as visualizações (frente e verso) lado a lado em uma proporção uniforme (1:1).
                </p>
              </div>
            </div>

            {baseUrl && (
              <div className="mt-6 p-4 rounded-xl border border-white/5 bg-black/20 flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Preview Ativo</span>
                <img 
                  src={baseUrl} 
                  alt="Url Preview" 
                  className="w-12 h-12 object-contain rounded border border-white/10"
                  onError={(e) => e.currentTarget.style.display = 'none'} 
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="hidden md:block">
            <p className="text-zinc-500 text-xs">Certifique-se de salvar após as alterações para atualizar o Workspace do Mockup 2D.</p>
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
    </div>
  );
}
