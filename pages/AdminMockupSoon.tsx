import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Save, Image as ImageIcon, Sparkles, Layers, Check, Plus, Trash2, X, Settings2 } from 'lucide-react';
import { ImageUploadInput } from '../components/ImageUploadInput';

export default function AdminMockupSoon() {
  const { 
    mockupBaseUrl, 
    updateMockupBase, 
    mockupBaseX,
    mockupBaseY,
    mockupBaseWidth,
    updateMockupBasePosition,
    mockupBackgroundUrl,
    updateMockupBackground,
    mockupCollars, 
    updateMockupCollars,
    mockupCuffs,
    updateMockupCuffs,
    mockupParts,
    updateMockupParts
  } = useData();
  
  const [baseUrl, setBaseUrl] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [baseX, setBaseX] = useState(50);
  const [baseY, setBaseY] = useState(50);
  const [baseWidth, setBaseWidth] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // States for SVG parts mapping / naming
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false);
  const [tempPartsList, setTempPartsList] = useState<any[]>([]);
  const [svgContent, setSvgContent] = useState<string>('');
  const [svgLoadError, setSvgLoadError] = useState<string>('');
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  const [selectedPartName, setSelectedPartName] = useState<string>('');

  useEffect(() => {
    if (isPartsModalOpen && baseUrl) {
      setSvgLoadError('');
      const fetchUrl = baseUrl.startsWith('data:') 
        ? baseUrl 
        : `/api/proxy-image?url=${encodeURIComponent(baseUrl)}`;
      fetch(fetchUrl)
        .then(res => {
          if (!res.ok) throw new Error('Não foi possível carregar o arquivo SVG.');
          return res.text();
        })
        .then(text => {
          if (!text.includes('<svg')) {
            throw new Error('O arquivo carregado não parece ser um SVG válido.');
          }
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'image/svg+xml');
          const svgEl = doc.querySelector('svg');
          if (svgEl) {
            const interactiveTags = ['path', 'polygon', 'rect', 'circle', 'ellipse', 'g'];
            interactiveTags.forEach(tag => {
              const elements = doc.querySelectorAll(tag);
              elements.forEach((el, i) => {
                el.setAttribute('data-svg-index', `${tag}-${i}`);
                el.setAttribute('class', 'interactive-svg-part transition-all duration-200');
              });
            });
            const serializer = new XMLSerializer();
            setSvgContent(serializer.serializeToString(svgEl));
          } else {
            setSvgContent(text);
          }
        })
        .catch(err => {
          console.error(err);
          setSvgLoadError(err.message || 'Erro ao carregar o SVG.');
        });
    }
  }, [isPartsModalOpen, baseUrl]);

  const handleBaseUrlUploadComplete = (url: string) => {
    setBaseUrl(url);
    const isSvg = url.toLowerCase().includes('.svg') || url.startsWith('data:image/svg+xml');
    if (isSvg) {
      setTempPartsList(Array.isArray(mockupParts) ? mockupParts : []);
      setIsPartsModalOpen(true);
    }
  };

  const handleSavePartName = () => {
    if (!selectedSelector) return;
    const name = selectedPartName.trim();
    
    let updated = [...tempPartsList];
    if (name === '') {
      updated = updated.filter(p => p.selector !== selectedSelector);
    } else {
      const existingIndex = updated.findIndex(p => p.selector === selectedSelector);
      if (existingIndex !== -1) {
        updated[existingIndex] = { ...updated[existingIndex], name };
      } else {
        updated.push({
          id: Date.now().toString(),
          selector: selectedSelector,
          name
        });
      }
    }
    
    setTempPartsList(updated);
    setSelectedSelector(null);
    setSelectedPartName('');
  };

  const handleSaveParts = async () => {
    await updateMockupParts(tempPartsList);
    setIsPartsModalOpen(false);
  };

  // States for Golas management
  const [newCollarName, setNewCollarName] = useState('');
  const [newCollarUrl, setNewCollarUrl] = useState('');

  // States for Punhos (Cuffs) management
  const [newCuffName, setNewCuffName] = useState('');
  const [newCuffUrl, setNewCuffUrl] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'collar' | 'cuff'>('collar');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [tempItemUrl, setTempItemUrl] = useState('');
  const [tempItemName, setTempItemName] = useState('');
  const [tempPreviewSelector, setTempPreviewSelector] = useState('');
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

  useEffect(() => {
    if (mockupBaseX !== undefined) setBaseX(mockupBaseX);
  }, [mockupBaseX]);

  useEffect(() => {
    if (mockupBaseY !== undefined) setBaseY(mockupBaseY);
  }, [mockupBaseY]);

  useEffect(() => {
    if (mockupBaseWidth !== undefined) setBaseWidth(mockupBaseWidth);
  }, [mockupBaseWidth]);

  useEffect(() => {
    if (mockupBackgroundUrl) setBackgroundUrl(mockupBackgroundUrl);
  }, [mockupBackgroundUrl]);

  // Safe list references
  const collarsList = Array.isArray(mockupCollars) ? mockupCollars : [];
  const cuffsList = Array.isArray(mockupCuffs) ? mockupCuffs : [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await Promise.all([
      updateMockupBase(baseUrl.trim()),
      updateMockupBackground(backgroundUrl.trim()),
      updateMockupBasePosition(baseX, baseY, baseWidth)
    ]);
    setIsSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  // Drag and drop event listeners for alignment modal
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
    setTempItemUrl(url);
    setTempItemName(name);
    setTempPosition({ x: 50, y: 25, width: 25 });
    setEditingItem(null);
    setModalType('collar');
    setIsModalOpen(true);
  };

  const handleCuffUploadComplete = (url: string) => {
    setNewCuffUrl(url);
    let name = newCuffName.trim();
    if (!name) {
      name = `Punho ${cuffsList.length + 1}`;
      setNewCuffName(name);
    }
    
    // Auto open position modal of the newly uploaded SVG
    setTempItemUrl(url);
    setTempItemName(name);
    setTempPosition({ x: 50, y: 55, width: 25 });
    setEditingItem(null);
    setModalType('cuff');
    setIsModalOpen(true);
  };

  const openPositionModal = (item: any | null, type: 'collar' | 'cuff') => {
    setModalType(type);
    if (item) {
      setEditingItem(item);
      setTempItemUrl(item.svgUrl);
      setTempItemName(item.name);
      setTempPosition({ x: item.x, y: item.y, width: item.width });
      setTempPreviewSelector(item.previewSelector || '');
    } else {
      if (type === 'collar') {
        if (!newCollarName.trim() || !newCollarUrl) return;
        setEditingItem(null);
        setTempItemUrl(newCollarUrl);
        setTempItemName(newCollarName.trim());
        setTempPosition({ x: 50, y: 25, width: 25 });
        setTempPreviewSelector('');
      } else {
        if (!newCuffName.trim() || !newCuffUrl) return;
        setEditingItem(null);
        setTempItemUrl(newCuffUrl);
        setTempItemName(newCuffName.trim());
        setTempPosition({ x: 50, y: 55, width: 15 });
        setTempPreviewSelector('');
      }
    }
    setIsModalOpen(true);
  };

  const handleSaveItemPosition = async () => {
    if (modalType === 'collar') {
      let updatedList = [...collarsList];
      
      if (editingItem) {
        updatedList = updatedList.map(c => c.id === editingItem.id ? {
          ...c,
          name: tempItemName.trim() || c.name,
          svgUrl: tempItemUrl,
          x: tempPosition.x,
          y: tempPosition.y,
          width: tempPosition.width,
          previewSelector: tempPreviewSelector.trim()
        } : c);
      } else {
        const newCollarObj = {
          id: Date.now().toString(),
          name: tempItemName.trim() || `Gola ${collarsList.length + 1}`,
          svgUrl: tempItemUrl,
          x: tempPosition.x,
          y: tempPosition.y,
          width: tempPosition.width,
          previewSelector: tempPreviewSelector.trim()
        };
        updatedList.push(newCollarObj);
        
        // Reset input fields
        setNewCollarName('');
        setNewCollarUrl('');
      }

      await updateMockupCollars(updatedList);
    } else {
      let updatedList = [...cuffsList];
      
      if (editingItem) {
        updatedList = updatedList.map(c => c.id === editingItem.id ? {
          ...c,
          name: tempItemName.trim() || c.name,
          svgUrl: tempItemUrl,
          x: tempPosition.x,
          y: tempPosition.y,
          width: tempPosition.width
        } : c);
      } else {
        const newCuffObj = {
          id: Date.now().toString(),
          name: tempItemName.trim() || `Punho ${cuffsList.length + 1}`,
          svgUrl: tempItemUrl,
          x: tempPosition.x,
          y: tempPosition.y,
          width: tempPosition.width
        };
        updatedList.push(newCuffObj);
        
        // Reset input fields
        setNewCuffName('');
        setNewCuffUrl('');
      }

      await updateMockupCuffs(updatedList);
    }

    setIsModalOpen(false);
  };

  const handleDeleteCollar = async (id: string) => {
    if (confirm("Deseja realmente excluir este modelo de gola?")) {
      const updated = collarsList.filter(c => c.id !== id);
      await updateMockupCollars(updated);
    }
  };

  const handleDeleteCuff = async (id: string) => {
    if (confirm("Deseja realmente excluir este modelo de punho?")) {
      const updated = cuffsList.filter(c => c.id !== id);
      await updateMockupCuffs(updated);
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
        {/* Card: Fundo do Layout */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ImageIcon size={20} className="text-primary" /> Fundo do Layout (PNG)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <ImageUploadInput 
                label="Imagem de Fundo do Layout (PNG até 5MB)"
                value={backgroundUrl}
                onChange={setBackgroundUrl}
                placeholder="https://..."
                category="mockups"
                accept=".png"
                maxSizeMB={5}
              />
              <p className="text-[10px] text-zinc-500">Este arquivo de imagem (PNG) será usado como plano de fundo na ferramenta. Máximo de 5MB.</p>
            </div>
            {backgroundUrl && (
              <div className="p-4 rounded-xl border border-white/5 bg-black/20 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 block">Visualização do Fundo</span>
                <div className="flex items-center justify-center p-2 bg-zinc-950 rounded-lg border border-zinc-800/50">
                  <img 
                    src={backgroundUrl} 
                    alt="Background Preview" 
                    className="max-h-24 object-contain rounded"
                    onError={(e) => e.currentTarget.style.display = 'none'} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

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
                onChange={handleBaseUrlUploadComplete}
                placeholder="https://..."
                category="mockups"
              />
              <p className="text-[10px] text-zinc-500">Este arquivo será a base da ferramenta "Monte seu Layout". Use um arquivo (SVG ou PNG) que já mostre os dois lados da camisa.</p>

              {baseUrl && (baseUrl.toLowerCase().includes('.svg') || baseUrl.startsWith('data:image/svg+xml')) && (
                <button
                  type="button"
                  onClick={() => {
                    setTempPartsList(Array.isArray(mockupParts) ? mockupParts : []);
                    setIsPartsModalOpen(true);
                  }}
                  className="w-full bg-zinc-950 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-bold py-3 px-3 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Settings2 size={13} className="text-primary" /> Mapear Partes do SVG ({Array.isArray(mockupParts) ? mockupParts.length : 0} registradas)
                </button>
              )}

              {baseUrl && (
                <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-4">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">Dimensão e Posição da Camisa</span>
                  
                  <div className="space-y-3 font-mono text-zinc-400">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-500 font-bold uppercase text-[10px]">Largura / Escala</span>
                        <span className="text-white text-[11px] font-bold">{baseWidth}%</span>
                      </div>
                      <input 
                        type="range"
                        min="10"
                        max="200"
                        step="1"
                        className="w-full accent-primary bg-black/40 h-1.5 rounded-lg appearance-none cursor-pointer"
                        value={baseWidth}
                        onChange={e => setBaseWidth(Number(e.target.value))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-zinc-500 font-bold uppercase text-[10px]">Posição X</span>
                          <span className="text-white text-[11px] font-bold">{baseX}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          className="w-full accent-primary bg-black/40 h-1.5 rounded-lg appearance-none cursor-pointer"
                          value={baseX}
                          onChange={e => setBaseX(Number(e.target.value))}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-zinc-500 font-bold uppercase text-[10px]">Posição Y</span>
                          <span className="text-white text-[11px] font-bold">{baseY}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          className="w-full accent-primary bg-black/40 h-1.5 rounded-lg appearance-none cursor-pointer"
                          value={baseY}
                          onChange={e => setBaseY(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setBaseWidth(100);
                          setBaseX(50);
                          setBaseY(50);
                        }}
                        className="text-[9px] hover:text-white text-zinc-500 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1 rounded transition"
                      >
                        Resetar Padrão
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
              <div className="mt-6 p-4 rounded-xl border border-white/5 bg-black/20 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 block">Pré-visualização do Enquadramento (Workspace)</span>
                <div className="aspect-square w-full max-w-[190px] mx-auto bg-zinc-950 border border-zinc-850 rounded-xl relative overflow-hidden flex items-center justify-center">
                  <img 
                    src={baseUrl} 
                    style={{
                      position: 'absolute',
                      width: `${baseWidth}%`,
                      left: `${baseX}%`,
                      top: `${baseY}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="object-contain max-h-full transition-all duration-75"
                    onError={(e) => e.currentTarget.style.display = 'none'} 
                  />
                  {/* Subtle axes crosshair for calibration guidance */}
                  <div className="absolute inset-0 border border-dashed border-zinc-850/20 pointer-events-none"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-800/40 pointer-events-none"></div>
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-zinc-805/40 pointer-events-none"></div>
                </div>
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
                onClick={() => openPositionModal(null, 'collar')}
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
                  
                  <div className="space-y-1 text-[10px] text-zinc-550 font-mono">
                    <div>Posição: X: {collar.x}%, Y: {collar.y}%</div>
                    <div>Largura: {collar.width}%</div>
                    {collar.previewSelector && (
                      <div className="text-[10px] text-cyan-400 font-bold mt-1">
                        Ícone SVG: <span className="bg-cyan-950/40 text-cyan-300 px-1 py-0.5 rounded border border-cyan-800/30 font-mono text-[9px]">{collar.previewSelector}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openPositionModal(collar, 'collar')}
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

        {/* --- Punhos Custom Section --- */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers size={20} className="text-primary" /> Modelos de Punhos (SVG)
              </h2>
              <p className="text-zinc-500 text-xs mt-1">Gerencie os recortes de punho adicionais que serão posicionados sobre o mockup base.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Form for adding cuff */}
            <div className="bg-zinc-950 border border-zinc-855/60 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">Adicionar Novo Punho</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Nome do Punho</label>
                    <input 
                      type="text"
                      placeholder="Ex: Punho Elástico, Punho Dobrado..."
                      className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                      value={newCuffName}
                      onChange={e => setNewCuffName(e.target.value)}
                    />
                  </div>
                  <div>
                    <ImageUploadInput 
                      label="Arquivo SVG do Punho"
                      value={newCuffUrl}
                      onChange={handleCuffUploadComplete}
                      placeholder="https://..."
                      category="mockups"
                      accept=".svg"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!newCuffName.trim() || !newCuffUrl}
                onClick={() => openPositionModal(null, 'cuff')}
                className="w-full bg-primary hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-primary text-white text-xs font-bold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Posicionar & Adicionar Punho
              </button>
            </div>

            {/* List cuffs */}
            {cuffsList.map((cuff) => (
              <div key={cuff.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between relative">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
                    <h4 className="font-bold text-white text-sm truncate pr-8">{cuff.name}</h4>
                    <button
                      type="button"
                      onClick={() => handleDeleteCuff(cuff.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-500 rounded hover:bg-zinc-900 transition absolute top-4 right-4"
                      title="Excluir Punho"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="aspect-square bg-black/50 border border-zinc-800/40 rounded-lg p-2 flex items-center justify-center relative overflow-hidden h-32 w-full mx-auto mb-3">
                    {baseUrl && (
                      <img src={baseUrl} className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none" />
                    )}
                    <img 
                      src={cuff.svgUrl} 
                      style={{
                        position: 'absolute',
                        left: `${cuff.x}%`,
                        top: `${cuff.y}%`,
                        width: `${cuff.width}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="object-contain max-h-full pointer-events-none"
                    />
                  </div>
                  
                  <div className="space-y-1 text-[10px] text-zinc-500 font-mono">
                    <div>Posição: X: {cuff.x}%, Y: {cuff.y}%</div>
                    <div>Largura: {cuff.width}%</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openPositionModal(cuff, 'cuff')}
                  className="w-full mt-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Settings2 size={13} /> Ajustar Posição
                </button>
              </div>
            ))}

            {cuffsList.length === 0 && (
              <div className="border border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[180px] h-full col-span-1 md:col-span-1 lg:col-span-2">
                <Layers size={36} className="text-zinc-700 mb-2" />
                <p className="text-zinc-500 text-xs font-medium">Nenhum punho customizado adicionado ainda.</p>
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
                  <Settings2 size={18} className="text-primary" /> Posicionar {modalType === 'collar' ? 'Gola' : 'Punho'}: {tempItemName}
                </h3>
                <p className="text-zinc-500 text-[10px] mt-0.5">Arraste o item para posicionar e puxe a borda azul para redimensionar.</p>
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

                  {/* Overlaid Item */}
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
                    <img src={tempItemUrl} className="w-full h-full object-contain pointer-events-none" />
                    
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

              {/* Collar Icon Preview Selector */}
              {modalType === 'collar' && (
                <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/60 space-y-2">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase block">
                    Seletor do Elemento SVG para Ícone (Opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition font-mono"
                    placeholder="Ex: #gola-interna, .g-icone, path"
                    value={tempPreviewSelector}
                    onChange={(e) => setTempPreviewSelector(e.target.value)}
                  />
                  <p className="text-[9px] text-zinc-500 leading-normal">
                    Se definido, apenas o elemento coincidente no SVG será renderizado como ícone na paleta de seleção do mockup 2D (substituindo a visualização padrão de imagem).
                  </p>
                </div>
              )}
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
                onClick={handleSaveItemPosition}
                className="px-6 py-2 bg-primary hover:bg-amber-600 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5"
              >
                <Check size={14} /> Confirmar Posição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mapear Partes do SVG */}
      {isPartsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-955 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings2 size={18} className="text-primary" /> Mapear Partes do SVG
                </h3>
                <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mt-0.5">Defina e nomeie áreas interativas para a fabricação</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPartsModalOpen(false)}
                className="p-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto max-h-[60vh]">
              {/* Left Column: SVG Rendering */}
              <div className="md:col-span-2 space-y-4">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">Clique nas partes do SVG para nomeá-las</span>
                
                {svgLoadError ? (
                  <div className="p-8 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center text-xs">
                    {svgLoadError}
                  </div>
                ) : svgContent ? (
                  <div className="relative">
                    {/* Dynamic Stylings */}
                    <style dangerouslySetInnerHTML={{ __html: `
                      .interactive-svg-part {
                        cursor: pointer !important;
                        transition: all 0.2s ease-in-out;
                      }
                      .interactive-svg-part:hover {
                        fill: rgba(245, 158, 11, 0.45) !important;
                        stroke: #f59e0b !important;
                        stroke-width: 2.5px !important;
                      }
                      ${tempPartsList.map(part => `
                        [data-svg-index="${part.selector}"] {
                          fill: rgba(59, 130, 246, 0.3) !important;
                          stroke: #3b82f6 !important;
                          stroke-width: 2px !important;
                        }
                      `).join('\n')}
                      ${selectedSelector ? `
                        [data-svg-index="${selectedSelector}"] {
                          fill: rgba(245, 158, 11, 0.5) !important;
                          stroke: #f59e0b !important;
                          stroke-width: 3px !important;
                        }
                      ` : ''}
                    `}} />
                    
                    <div 
                      id="interactive-svg-container"
                      dangerouslySetInnerHTML={{ __html: svgContent }} 
                      onClick={(e) => {
                        const target = e.target as SVGElement;
                        if (!target) return;
                        
                        let current: SVGElement | null = target;
                        let dataIndex: string | null = null;
                        
                        while (current && current !== (e.currentTarget as any)) {
                          dataIndex = current.getAttribute('data-svg-index');
                          if (dataIndex) {
                            break;
                          }
                          current = current.parentElement as any;
                        }
                        
                        if (dataIndex) {
                          setSelectedSelector(dataIndex);
                          const existing = tempPartsList.find(p => p.selector === dataIndex);
                          if (existing) {
                            setSelectedPartName(existing.name);
                          } else {
                            setSelectedPartName('');
                          }
                        }
                      }}
                      className="w-full min-h-[350px] flex items-center justify-center bg-zinc-950/50 rounded-2xl border border-zinc-800/80 p-4 transition-all duration-300 [&>svg]:max-w-full [&>svg]:max-h-[380px] [&>svg]:w-auto [&>svg]:h-auto [&_path]:stroke-zinc-700/50 [&_polygon]:stroke-zinc-700/50"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 bg-zinc-950/40 rounded-2xl border border-zinc-850">
                    <div className="w-10 h-10 border-2 border-t-primary border-zinc-850 rounded-full animate-spin mb-3"></div>
                    <p className="text-xs text-zinc-500">Processando e indexando arquivo vetorial SVG...</p>
                  </div>
                )}
                
                {selectedSelector && (
                  <div className="bg-zinc-950/80 p-5 rounded-2xl border border-zinc-800/80 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                      <span>Selector: <b className="text-zinc-400">{selectedSelector}</b></span>
                      <button 
                        type="button"
                        onClick={() => { setSelectedSelector(null); setSelectedPartName(''); }}
                        className="text-zinc-500 hover:text-white transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">Nome do Componente/Parte</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Ex: Manga Direita, Frente, Costas, Gola..."
                          className="flex-1 bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                          value={selectedPartName}
                          onChange={e => setSelectedPartName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSavePartName();
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSavePartName}
                          className="bg-primary hover:bg-amber-600 px-4 py-2 rounded-lg font-bold text-xs text-white transition flex items-center gap-1 shadow-lg shadow-primary/15"
                        >
                          <Check size={14} /> Salvar Parte
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Active Mapped Parts List */}
              <div className="space-y-4 flex flex-col justify-between h-full bg-zinc-950/50 border border-zinc-850 p-5 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1 tracking-tight">Partes Mapeadas</h4>
                  <p className="text-[10px] text-zinc-500 leading-normal mb-4">Veja e exclua áreas mapeadas do seu vetor de mockup.</p>
                  
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {tempPartsList.map(part => (
                      <div key={part.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/60 group hover:border-zinc-700 transition duration-150">
                        <div>
                          <p className="text-xs font-bold text-zinc-100">{part.name}</p>
                          <p className="text-[9px] text-zinc-500 font-mono tracking-wider mt-0.5">{part.selector}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSelector(part.selector);
                              setSelectedPartName(part.name);
                            }}
                            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition"
                            title="Editar parte"
                          >
                            <Settings2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTempPartsList(prev => prev.filter(p => p.id !== part.id));
                              if (selectedSelector === part.selector) {
                                setSelectedSelector(null);
                                setSelectedPartName('');
                              }
                            }}
                            className="p-1.5 hover:bg-zinc-800/60 text-zinc-500 hover:text-red-500 rounded-lg transition"
                            title="Excluir parte"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {tempPartsList.length === 0 && (
                      <div className="text-center py-10 opacity-70">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-2 text-zinc-500">
                          <Settings2 size={14} />
                        </div>
                        <p className="text-[10px] text-zinc-500 italic px-4">Nenhuma parte mapeada. Clique diretamente em uma área da camiseta ao lado para começar.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-zinc-950 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => setIsPartsModalOpen(false)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleSaveParts}
                className="px-6 py-2 bg-primary hover:bg-amber-600 rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-primary/10"
              >
                <Check size={14} /> Salvar Configurações de Partes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
