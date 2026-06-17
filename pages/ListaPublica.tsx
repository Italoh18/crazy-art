import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ListChecks, PlusIcon, Trash2, ToggleLeft, ToggleRight, 
  Loader2, CheckCircle2, Wallet, RefreshCw, FileText 
} from 'lucide-react';
import { SizeListItem } from '../types';

const sizes: Record<string, string[]> = {
  unisex: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'],
  feminina: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1'],
  infantil: ['RN', '2', '4', '6', '8', '10', '12', '14', '16']
};

const sortSizeListItems = (items: SizeListItem[]): SizeListItem[] => {
  const categoryOrder: Record<string, number> = {
    unisex: 1,
    infantil: 2,
    feminina: 3
  };

  const unisexSizesDesc = ['XG5', 'XG4', 'XG3', 'XG2', 'XG1', 'EG', 'GG', 'G', 'M', 'P', 'PP'];
  const infantilSizesDesc = ['16', '14', '12', '10', '8', '6', '4', '2', 'RN'];
  const femininaSizesDesc = ['XG5', 'XG4', 'XG3', 'XG2', 'XG1', 'EG', 'GG', 'G', 'M', 'P', 'PP'];

  const getSizeWeight = (category: string, size: string): number => {
    const s = (size || '').trim().toUpperCase();
    if (category === 'unisex') {
      const idx = unisexSizesDesc.indexOf(s);
      return idx !== -1 ? idx : 999;
    }
    if (category === 'infantil') {
      const idx = infantilSizesDesc.indexOf(s);
      return idx !== -1 ? idx : 999;
    }
    if (category === 'feminina') {
      const idx = femininaSizesDesc.indexOf(s);
      return idx !== -1 ? idx : 999;
    }
    return 999;
  };

  return [...items].sort((a, b) => {
    const catA = categoryOrder[a.category] || 999;
    const catB = categoryOrder[b.category] || 999;
    if (catA !== catB) {
      return catA - catB;
    }
    const weightA = getSizeWeight(a.category, a.size);
    const weightB = getSizeWeight(b.category, b.size);
    return weightA - weightB;
  });
};

export default function ListaPublica() {
  const { id } = useParams<{ id: string }>();
  const [listTitle, setListTitle] = useState('Lista Pública');
  const [clientName, setClientName] = useState('');
  const [items, setItems] = useState<SizeListItem[]>([]);
  const [originalSnapshotItems, setOriginalSnapshotItems] = useState<SizeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGlobalSimple, setIsGlobalSimple] = useState(false);

  useEffect(() => {
    fetchList();
  }, [id]);

  const fetchList = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/public-lists?id=${encodeURIComponent(id)}`);
      if (response.ok) {
        const data = await response.json();
        setListTitle(data.title || 'Lista Pública de Pedido');
        setClientName(data.client_name || '');
        if (data.items) {
          const parsed = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
          setItems(parsed);
          setOriginalSnapshotItems(JSON.parse(JSON.stringify(parsed)));
          
          // Se houver algum item sem nome/número, inicia o isGlobalSimple de acordo
          if (parsed.length > 0) {
            const hasComplex = parsed.some((item: any) => !item.isSimple);
            setIsGlobalSimple(!hasComplex);
          }
        }
      } else {
        console.error('Erro ao buscar lista');
      }
    } catch (error) {
      console.error('Erro ao conectar ao servidor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // 1. Fetch latest items from the database behind the loading indicator
      const getResponse = await fetch(`/api/public-lists?id=${encodeURIComponent(id)}`);
      if (getResponse.ok) {
        const data = await getResponse.json();
        const dbItems: SizeListItem[] = data.items 
          ? (typeof data.items === 'string' ? JSON.parse(data.items) : data.items) 
          : [];
        
        // 2. Perform safe merge using local edits, current server items, and snapshot baseline
        const snapshotIds = new Set(originalSnapshotItems.map((item) => item.id));
        const localIds = new Set(items.map((item) => item.id));
        const localMap = new Map(items.map((item) => [item.id, item]));
        
        const mergedList: SizeListItem[] = [];
        
        // Process DB items
        for (const dbItem of dbItems) {
          if (localIds.has(dbItem.id)) {
            // Local user kept and possibly modified this item
            mergedList.push(localMap.get(dbItem.id)!);
          } else {
            if (snapshotIds.has(dbItem.id)) {
              // Existed when we loaded, but not in local edits -> local user explicitly deleted it
            } else {
              // Did not exist in our snapshot -> added by someone else while we were editing. Keep it!
              mergedList.push(dbItem);
            }
          }
        }
        
        // Process new local items
        const dbIds = new Set(dbItems.map((item) => item.id));
        for (const localItem of items) {
          if (!dbIds.has(localItem.id) && !snapshotIds.has(localItem.id)) {
            // Brand new item added locally -> keep it!
            mergedList.push(localItem);
          }
        }
        
        // 2.3 Sort the merged list as requested
        const sortedMergedList = sortSizeListItems(mergedList);
        
        // 3. Write merged list using PUT
        const putResponse = await fetch(`/api/public-lists?id=${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: listTitle,
            items: sortedMergedList
          })
        });

        if (putResponse.ok) {
          setItems(sortedMergedList);
          setOriginalSnapshotItems(JSON.parse(JSON.stringify(sortedMergedList)));
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 4000);
        } else {
          alert('Erro ao salvar as alterações da lista.');
        }
      } else {
        alert('Erro ao sincronizar dados da lista antes de salvar.');
      }
    } catch (error) {
      alert('Erro de conexão ao salvar a lista.');
    } finally {
      setIsSaving(false);
    }
  };

  const addListRow = () => {
    const defaultCategory = 'unisex';
    const newItem: SizeListItem = {
      id: crypto.randomUUID(),
      category: defaultCategory,
      size: sizes[defaultCategory][2], // 'M'
      number: '',
      name: '',
      shortSize: sizes[defaultCategory][2],
      shortNumber: '',
      quantity: 1,
      isSimple: isGlobalSimple
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeListRow = (rowId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== rowId));
  };

  const updateListRow = (rowId: string, field: keyof SizeListItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          const updated = { ...item, [field]: value };
          if (field === 'category') {
            updated.size = sizes[value][0]; // seleciona o primeiro tamanho padrão da nova categoria
            updated.shortSize = sizes[value][0];
          }
          return updated;
        }
        return item;
      })
    );
  };

  const toggleGlobalSimpleMode = () => {
    const newSimple = !isGlobalSimple;
    setIsGlobalSimple(newSimple);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        isSimple: newSimple
      }))
    );
  };

  const calculateTotalItems = () => {
    return items.reduce((acc, item) => {
      if (item.isSimple) {
        return acc + (Number(item.quantity) || 1);
      }
      return acc + 1;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        
        {/* Header */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex p-3 bg-primary/10 text-primary rounded-full ring-8 ring-primary/5 mb-2">
            <ListChecks size={40} className="stroke-2" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase font-mono">
            {listTitle}
          </h1>
          {clientName && (
            <p className="text-zinc-400 text-sm md:text-base font-medium">
              Esta lista foi criada por <span className="text-primary font-bold">{clientName}</span>. Preencha seus dados abaixo!
            </p>
          )}
          <div className="flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-wider text-zinc-500 pt-2">
            <span>Fácil, Rápido e Seguro</span>
            <span>•</span>
            <button onClick={fetchList} className="flex items-center gap-1 hover:text-white transition">
              <RefreshCw size={12} className={isLoading ? "animate-spin text-primary" : ""} /> Atualizar Lista
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6 relative">
          
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Carregando Lista...</p>
            </div>
          ) : (
            <>
              {/* Top Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <div>
                  <h4 className="font-extrabold text-white text-sm uppercase tracking-wider font-mono">Tabela de Grade</h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                    Total de Integrantes: <span className="text-white font-bold">{calculateTotalItems()}</span>
                  </p>
                </div>
                <button 
                  onClick={toggleGlobalSimpleMode} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase transition ${isGlobalSimple ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                >
                  <span>Preencher Sem Nomes</span>
                  {isGlobalSimple ? <ToggleRight size={20} className="text-primary" /> : <ToggleLeft size={20} />}
                </button>
              </div>

              {/* Items Grid */}
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 flex flex-col items-center justify-center gap-4">
                    <p className="text-sm uppercase font-bold tracking-wider">A lista ainda está vazia.</p>
                    <button 
                      onClick={addListRow} 
                      className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition flex items-center gap-2"
                    >
                      <PlusIcon size={14} /> Adicionar Primeiro Integrante
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {items.map((item, idx) => (
                        <div key={item.id} className="space-y-3 p-4 bg-zinc-950 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition">
                          
                          {/* Cabeçalho da Linha */}
                          <div className="flex justify-between items-center pb-2 border-b border-zinc-900 w-full">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Integrante #{idx + 1}</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => updateListRow(item.id, 'isConjunto', !item.isConjunto)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${item.isConjunto ? 'bg-primary text-black' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
                              >
                                {item.isConjunto ? 'Com Short (Sim)' : 'Adicionar Short?'}
                              </button>
                              <button 
                                onClick={() => removeListRow(item.id)} 
                                title="Remover integrante"
                                className="p-1 px-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Inputs da Grade */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            
                            {/* Tipo / Gênero */}
                            <div className={item.isConjunto && !item.isSimple ? "sm:col-span-2" : "sm:col-span-3"}>
                              <label className="block text-[8px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Tipo de Grade</label>
                              <select 
                                value={item.category} 
                                onChange={(e) => updateListRow(item.id, 'category', e.target.value as any)} 
                                className="w-full bg-[#121215] border border-zinc-800 focus:border-primary rounded-xl text-xs text-white p-2.5 outline-none font-bold"
                              >
                                <option value="unisex">Unisex (Geral)</option>
                                <option value="feminina">Feminina</option>
                                <option value="infantil">Infantil</option>
                              </select>
                            </div>

                            {/* Tamanho Camisa */}
                            <div className="sm:col-span-2">
                              <label className="block text-[8px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Tam (Camisa)</label>
                              <select 
                                value={item.size} 
                                onChange={(e) => updateListRow(item.id, 'size', e.target.value)} 
                                className="w-full bg-[#121215] border border-zinc-800 focus:border-primary rounded-xl text-xs text-white p-2.5 outline-none font-bold"
                              >
                                {sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>

                            {/* Condicional: isSimple */}
                            {item.isSimple ? (
                              <div className={item.isConjunto ? "sm:col-span-4" : "sm:col-span-7"}>
                                <label className="block text-[8px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Qtd Peças</label>
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={item.quantity || 1} 
                                  onChange={(e) => updateListRow(item.id, 'quantity', parseInt(e.target.value) || 1)} 
                                  className="w-full bg-[#121215] border border-zinc-800 focus:border-primary rounded-xl p-2.5 text-xs text-white font-mono font-bold text-center" 
                                />
                              </div>
                            ) : (
                              <>
                                {/* Número Camisa */}
                                <div className={item.isConjunto ? "sm:col-span-1" : "sm:col-span-2"}>
                                  <label className="block text-[8px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Nº Camisa</label>
                                  <input 
                                    type="text" 
                                    placeholder="00"
                                    value={item.number || ''} 
                                    onChange={(e) => {
                                      updateListRow(item.id, 'number', e.target.value);
                                      if (item.isConjunto) {
                                        updateListRow(item.id, 'shortNumber', e.target.value);
                                      }
                                    }} 
                                    className="w-full bg-[#121215] border border-zinc-800 focus:border-primary rounded-xl p-2.5 text-xs text-white font-mono font-bold text-center placeholder:text-zinc-700 px-1" 
                                  />
                                </div>
                                {/* Nome Camisa */}
                                <div className={item.isConjunto ? "sm:col-span-3" : "sm:col-span-5"}>
                                  <label className="block text-[8px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Nome na Camisa</label>
                                  <input 
                                    type="text" 
                                    placeholder="SILVA"
                                    value={item.name || ''} 
                                    onChange={(e) => updateListRow(item.id, 'name', e.target.value)} 
                                    className="w-full bg-[#121215] border border-zinc-800 focus:border-primary rounded-xl p-2.5 text-xs text-white uppercase font-bold placeholder:text-zinc-700" 
                                  />
                                </div>
                              </>
                            )}

                            {/* Se for conjunto, adicionar tamanho e número do short */}
                            {item.isConjunto && (
                              <>
                                {/* Tamanho Short */}
                                <div className={item.isSimple ? "sm:col-span-3" : "sm:col-span-2"}>
                                  <label className="block text-[8px] font-black text-primary uppercase mb-1 tracking-widest">Tam Short</label>
                                  <select 
                                    value={item.shortSize || sizes[item.category][2]} 
                                    onChange={(e) => updateListRow(item.id, 'shortSize', e.target.value)} 
                                    className="w-full bg-[#121215] border border-primary/20 focus:border-primary rounded-xl text-xs text-white p-2.5 outline-none font-bold align-middle"
                                  >
                                    {sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>

                                {/* Número Short (apenas se não for simples) */}
                                {!item.isSimple && (
                                  <div className="sm:col-span-2">
                                    <label className="block text-[8px] font-black text-primary uppercase mb-1 tracking-widest">Nº Short</label>
                                    <input 
                                      type="text" 
                                      placeholder="00"
                                      value={item.shortNumber || item.number || ''} 
                                      onChange={(e) => updateListRow(item.id, 'shortNumber', e.target.value)} 
                                      className="w-full bg-[#121215] border border-primary/20 focus:border-primary rounded-xl p-2.5 text-xs text-white font-mono font-bold text-center placeholder:text-zinc-700" 
                                    />
                                  </div>
                                )}
                              </>
                            )}

                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={addListRow} 
                      className="w-full py-4 border border-dashed border-zinc-800 hover:border-primary rounded-2xl text-zinc-500 hover:text-primary transition flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest"
                    >
                      <PlusIcon size={14} /> Adicionar Novo Integrante
                    </button>
                  </>
                )}
              </div>

              {/* Save Section */}
              <div className="pt-6 border-t border-zinc-800 flex flex-col items-center gap-4">
                
                {saveSuccess && (
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-emerald-400 text-sm font-bold uppercase tracking-wider animate-bounce">
                    <CheckCircle2 size={18} /> Alterações salvas com sucesso no banco de dados!
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving || items.length === 0}
                  className="w-full py-5 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-amber-400 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-xl flex items-center justify-center gap-3"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin text-black" size={20} />
                      SALVANDO ALTERAÇÕES...
                    </>
                  ) : (
                    <>
                      <Wallet size={20} />
                      SALVAR MINHA LISTA
                    </>
                  )}
                </button>
                <p className="text-[10px] text-zinc-500 text-center uppercase tracking-wider leading-relaxed">
                  Os administradores e o criador receberão suas atualizações em tempo real no dashboard.
                </p>
              </div>
            </>
          )}

        </div>

      </div>
      {isSaving && (
        <div id="saving-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in">
          <div className="bg-zinc-950/90 border border-white/5 p-8 rounded-3xl flex flex-col items-center space-y-4 max-w-sm text-center shadow-2xl">
            <Loader2 className="animate-spin text-primary stroke-[3]" size={48} />
            <h3 className="text-white text-lg font-bold font-mono uppercase tracking-widest text-primary">anotando tudo</h3>
            <p className="text-xs text-zinc-500 uppercase tracking-widest leading-relaxed">
              Sincronizando as alterações feitas por outros integrantes antes de salvar seu progresso.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
