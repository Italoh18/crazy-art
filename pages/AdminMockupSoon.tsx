import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Save, Image as ImageIcon, Sparkles, Layers, Check, Plus, Trash2, X, Settings2 } from 'lucide-react';
import { ImageUploadInput } from '../components/ImageUploadInput';

export default function AdminMockupSoon() {
  const { mockupBaseUrl, updateMockupBase, mockupCollars, updateMockupCollars } = useData();
  const [baseUrl, setBaseUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // States for Golas management
  const [newCollarName, setNewCollarName] = useState('');
  const [newCollarUrl, setNewCollarUrl] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollar, setEditingCollar] = useState<any | null>(null);
  const [tempCollarUrl, setTempCollarUrl] = useState('');
  const [tempCollarName, setTempCollarName] = useState('');
  const [tempPosition, setTempPosition] = useState({ x: 50, y: 30, width: 25 });

  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | null;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    if (mockupBaseUrl) setBaseUrl(mockupBaseUrl);
  }, [mockupBaseUrl]);

  // Safe collars list reference
  const collarsList = Array.isArray(mockupCollars) ? mockupCollars : [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateMockupBase(baseUrl.trim());
    setIsSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  // Drag and drop event listeners
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      if (dragState.type === 'move') {
        const newX = Math.max(0, Math.min(100, dragState.startPosX + deltaXPercent));
        const newY = Math.max(0, Math.min(100, dragState.startPosY + deltaYPercent));
        setTempPosition(prev => ({ 
          ...prev, 
          x: Number(newX.toFixed(1)), 
          y: Number(newY.toFixed(1)) 
        }));
      } else if (dragState.type === 'resize') {
        const newWidth = Math.max(5, Math.min(100, dragState.startWidth + deltaXPercent * 2));
        setTempPosition(prev => ({ 
          ...prev, 
          width: Number(newWidth.toFixed(1)) 
        }));
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: tempPosition.x,
      startPosY: tempPosition.y,
      startWidth: tempPosition.width,
    });
  };

  const handleCollarUploadComplete = (url: string) => {
    setNewCollarUrl(url);
    let name = newCollarName.trim();
    if (!name) {
      name = `Gola ${collarsList.length + 1}`;
      setNewCollarName(name);
    }
    
    // Auto open position modal of the newly uploaded SVG
    setTempCollarUrl(url);
    setTempCollarName(name);
    setTempPosition({ x: 50, y: 25, width: 25 });
    setEditingCollar(null);
    setIsModalOpen(true);
  };

  const openPositionModal = (collar: any | null) => {
    if (collar) {
      setEditingCollar(collar);
      setTempCollarUrl(collar.svgUrl);
      setTempCollarName(collar.name);
      setTempPosition({ x: collar.x, y: collar.y, width: collar.width });
    } else {
      if (!newCollarName.trim() || !newCollarUrl) return;
      setEditingCollar(null);
      setTempCollarUrl(newCollarUrl);
      setTempCollarName(newCollarName.trim());
      setTempPosition({ x: 50, y: 25, width: 25 });
    }
    setIsModalOpen(true);
  };

  const handleSaveCollarPosition = async () => {
    let updatedList = [...collarsList];
    
    if (editingCollar) {
      updatedList = updatedList.map(c => c.id === editingCollar.id ? {
        ...c,
        name: tempCollarName.trim() || c.name,
        svgUrl: tempCollarUrl,
        x: tempPosition.x,
        y: tempPosition.y,
        width: tempPosition.width
      } : c);
    } else {
      const newCollarObj = {
        id: Date.now().toString(),
        name: tempCollarName.trim() || `Gola ${collarsList.length + 1}`,
        svgUrl: tempCollarUrl,
        x: tempPosition.x,
        y: tempPosition.y,
        width: tempPosition.width
      };
      updatedList.push(newCollarObj);
      
      // Reset input fields
      setNewCollarName('');
      setNewCollarUrl('');
    }

    await updateMockupCollars(updatedList);
    setIsModalOpen(false);
  };

  const handleDeleteCollar = async (id: string) => {
    if (confirm("Deseja realmente excluir este modelo de gola?")) {
      const updated = collarsList.filter(c => c.id !== id);
      await updateMockupCollars(updated);
    }
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

        {/* --- Golas Custom Section --- */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers size={20} className="text-primary" /> Modelos de Golas (SVG)
              </h2>
              <p className="text-zinc-500 text-xs mt-1">Gerencie os recortes de gola adicionais que serão posicionados sobre o mockup base.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Form for adding collar */}
            <div className="bg-zinc-950 border border-zinc-855/60 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">Adicionar Nova Gola</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Nome da Gola</label>
                    <input 
                      type="text"
                      placeholder="Ex: Gola V, Gola Polo..."
                      className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                      value={newCollarName}
                      onChange={e => setNewCollarName(e.target.value)}
                    />
                  </div>
                  <div>
                    <ImageUploadInput 
                      label="Arquivo SVG da Gola"
                      value={newCollarUrl}
                      onChange={handleCollarUploadComplete}
                      placeholder="https://..."
                      category="mockups"
                      accept=".svg"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!newCollarName.trim() || !newCollarUrl}
                onClick={() => openPositionModal(null)}
                className="w-full bg-primary hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-primary text-white text-xs font-bold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Posicionar & Adicionar Gola
              </button>
            </div>

            {/* List collars */}
            {collarsList.map((collar) => (
              <div key={collar.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between relative">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
                    <h4 className="font-bold text-white text-sm truncate pr-8">{collar.name}</h4>
                    <button
                      type="button"
                      onClick={() => handleDeleteCollar(collar.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-500 rounded hover:bg-zinc-900 transition absolute top-4 right-4"
                      title="Excluir Gola"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="aspect-square bg-black/50 border border-zinc-800/40 rounded-lg p-2 flex items-center justify-center relative overflow-hidden h-32 w-full mx-auto mb-3">
                    {baseUrl && (
                      <img src={baseUrl} className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none" />
                    )}
                    <img 
                      src={collar.svgUrl} 
                      style={{
                        position: 'absolute',
                        left: `${collar.x}%`,
                        top: `${collar.y}%`,
                        width: `${collar.width}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="object-contain max-h-full pointer-events-none"
                    />
                  </div>
                  
                  <div className="space-y-1 text-[10px] text-zinc-500 font-mono">
                    <div>Posição: X: {collar.x}%, Y: {collar.y}%</div>
                    <div>Largura: {collar.width}%</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openPositionModal(collar)}
                  className="w-full mt-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Settings2 size={13} /> Ajustar Posição
                </button>
              </div>
            ))}

            {collarsList.length === 0 && (
              <div className="border border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[180px] h-full col-span-1 md:col-span-1 lg:col-span-2">
                <Layers size={36} className="text-zinc-700 mb-2" />
                <p className="text-zinc-500 text-xs font-medium">Nenhuma gola customizada adicionada ainda.</p>
                <p className="text-zinc-650 text-[10px] mt-1 max-w-[240px]">Preencha o nome e faça upload do SVG ao lado para começar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Save bar */}
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

      {/* --- Positioning Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings2 size={18} className="text-primary" /> Posicionar Gola: {tempCollarName}
                </h3>
                <p className="text-zinc-500 text-[10px] mt-0.5">Arraste a gola para posicionar e puxe a borda azul para redimensionar.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Interactive preview */}
              <div className="space-y-2">
                <div 
                  ref={containerRef}
                  className="relative w-full max-w-[280px] aspect-square bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden mx-auto select-none"
                >
                  {baseUrl ? (
                    <img src={baseUrl} className="w-full h-full object-contain pointer-events-none opacity-80" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                      Defina um Mockup Base primeiro
                    </div>
                  )}

                  {/* Overlaid Collar */}
                  <div 
                    style={{
                      position: 'absolute',
                      left: `${tempPosition.x}%`,
                      top: `${tempPosition.y}%`,
                      width: `${tempPosition.width}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute border border-dashed border-primary cursor-move flex items-center justify-center group"
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                  >
                    <img src={tempCollarUrl} className="w-full h-full object-contain pointer-events-none" />
                    
                    {/* Visual drag indicators */}
                    <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 pointer-events-none transition"></div>
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] border-t border-dashed border-primary/20 pointer-events-none"></div>
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] border-l border-dashed border-primary/20 pointer-events-none"></div>

                    {/* Resize handle */}
                    <div 
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-primary hover:bg-amber-500 rounded-full border border-zinc-950 cursor-se-resize shadow-md flex items-center justify-center active:scale-125 transition"
                      onMouseDown={(e) => handleMouseDown(e, 'resize')}
                    />
                  </div>
                </div>
              </div>

              {/* Number/Grid sliders */}
              <div className="grid grid-cols-3 gap-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/60 font-mono text-zinc-400">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Posição X</label>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      step="0.5"
                      className="w-full bg-black/40 border border-zinc-800 rounded px-2 py-1 text-xs text-white text-center"
                      value={tempPosition.x}
                      onChange={e => setTempPosition(prev => ({ ...prev, x: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                    />
                    <span className="text-[10px] text-zinc-650">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Posição Y</label>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      step="0.5"
                      className="w-full bg-black/40 border border-zinc-800 rounded px-2 py-1 text-xs text-white text-center"
                      value={tempPosition.y}
                      onChange={e => setTempPosition(prev => ({ ...prev, y: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                    />
                    <span className="text-[10px] text-zinc-650">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Largura</label>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      step="0.5"
                      className="w-full bg-black/40 border border-zinc-800 rounded px-2 py-1 text-xs text-white text-center"
                      value={tempPosition.width}
                      onChange={e => setTempPosition(prev => ({ ...prev, width: Math.max(1, Math.min(100, Number(e.target.value) || 0)) }))}
                    />
                    <span className="text-[10px] text-zinc-650">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-zinc-950 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCollarPosition}
                className="px-6 py-2 bg-primary hover:bg-amber-600 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5"
              >
                <Check size={14} /> Confirmar Posição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
