import React, { useState, useEffect, useMemo } from 'react';
import { 
  ListChecks, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  Loader2, 
  User, 
  Eye, 
  Copy, 
  ExternalLink, 
  Search, 
  ArrowLeft, 
  Users, 
  Lock, 
  Unlock,
  Sparkles,
  ClipboardList,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface SizeListItem {
  id: string;
  category: 'unisex' | 'feminina' | 'infantil';
  size: string;
  name?: string;
  number?: string;
  isSimple?: boolean;
  quantity?: number;
  isConjunto?: boolean;
  shortSize?: string;
  shortNumber?: string;
}

interface PublicListRecord {
  id: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  title: string;
  items: string | SizeListItem[];
  created_at: string;
  updated_at: string;
  is_locked: number;
}

const listSizes: Record<string, string[]> = {
  unisex: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'EG'],
  feminina: ['PP (Baby)', 'P (Baby)', 'M (Baby)', 'G (Baby)', 'GG (Baby)'],
  infantil: ['RN', '2', '4', '6', '8', '10', '12', '14', '16']
};

export default function AdminPublicList() {
  const { customers, loadData } = useData();
  const { role } = useAuth();

  // Mode: 'create' | 'view_all'
  const [viewMode, setViewMode] = useState<'create' | 'view_all'>('create');

  // Client Selection State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // Form State
  const [listTitle, setListTitle] = useState('Lista Pública de Pedido');
  const [isListSimpleMode, setIsListSimpleMode] = useState(false);
  const [items, setItems] = useState<SizeListItem[]>([
    { id: crypto.randomUUID(), category: 'unisex', size: 'M', name: '', number: '', isSimple: false, isConjunto: false, shortSize: 'M', shortNumber: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessData, setSavedSuccessData] = useState<{ id: string; clientName: string; title: string } | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);

  // View All Lists State
  const [allLists, setAllLists] = useState<PublicListRecord[]>([]);
  const [isLoadingAllLists, setIsLoadingAllLists] = useState(false);
  const [listsSearchQuery, setListsSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Fetch all lists from backend
  const fetchAllLists = async () => {
    setIsLoadingAllLists(true);
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const res = await fetch('/api/public-lists?admin_all=true', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAllLists(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao buscar listas públicas de usuários:', e);
    } finally {
      setIsLoadingAllLists(false);
    }
  };

  useEffect(() => {
    fetchAllLists();
  }, []);

  // Filtered clients for the dropdown selector
  const filteredCustomers = useMemo(() => {
    if (!clientSearch.trim()) return customers;
    const q = clientSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.cpf && c.cpf.includes(q))
    );
  }, [customers, clientSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedClientId) || null;
  }, [customers, selectedClientId]);

  // Row operations
  const addRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category: 'unisex',
        size: 'M',
        name: '',
        number: '',
        isSimple: isListSimpleMode,
        quantity: 1,
        isConjunto: false,
        shortSize: 'M',
        shortNumber: ''
      }
    ]);
  };

  const addMultipleRows = (count: number) => {
    const newRows: SizeListItem[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: crypto.randomUUID(),
        category: 'unisex',
        size: 'M',
        name: '',
        number: '',
        isSimple: isListSimpleMode,
        quantity: 1,
        isConjunto: false,
        shortSize: 'M',
        shortNumber: ''
      });
    }
    setItems(prev => [...prev, ...newRows]);
  };

  const removeRow = (id: string) => {
    if (items.length <= 1) {
      // Clear instead of removing last row
      setItems([{
        id: crypto.randomUUID(),
        category: 'unisex',
        size: 'M',
        name: '',
        number: '',
        isSimple: isListSimpleMode,
        quantity: 1,
        isConjunto: false,
        shortSize: 'M',
        shortNumber: ''
      }]);
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateRow = (id: string, field: keyof SizeListItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'category') {
          updated.size = listSizes[value as string][0] || 'M';
          if (updated.isConjunto) {
            updated.shortSize = listSizes[value as string][0] || 'M';
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const toggleSimpleMode = () => {
    const nextMode = !isListSimpleMode;
    setIsListSimpleMode(nextMode);
    setItems(prev => prev.map(item => ({
      ...item,
      isSimple: nextMode,
      quantity: item.quantity || 1
    })));
  };

  // Save List
  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      alert('Por favor, selecione em qual perfil de cliente a lista deve ser salva.');
      return;
    }

    if (!listTitle.trim()) {
      alert('Por favor, defina um nome/título para a lista.');
      return;
    }

    setIsSaving(true);
    setSavedSuccessData(null);

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';

      if (editingListId) {
        // Updating existing list
        const res = await fetch(`/api/public-lists?id=${encodeURIComponent(editingListId)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            title: listTitle.trim(),
            items: items
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Erro ao atualizar lista.');
        }

        setSavedSuccessData({
          id: editingListId,
          clientName: selectedCustomer?.name || 'Cliente',
          title: listTitle.trim()
        });
      } else {
        // Creating new list assigned to chosen client
        const res = await fetch('/api/public-lists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            clientId: selectedClientId,
            title: listTitle.trim(),
            items: items
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Erro ao criar lista.');
        }

        const data = await res.json();
        setSavedSuccessData({
          id: data.id,
          clientName: selectedCustomer?.name || 'Cliente',
          title: listTitle.trim()
        });
      }

      await fetchAllLists();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Falha ao salvar lista pública.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditExistingList = (list: PublicListRecord) => {
    setEditingListId(list.id);
    setSelectedClientId(list.client_id);
    setListTitle(list.title);
    
    let parsedItems: SizeListItem[] = [];
    try {
      parsedItems = typeof list.items === 'string' ? JSON.parse(list.items) : list.items;
      if (!Array.isArray(parsedItems)) parsedItems = [];
    } catch (e) {
      parsedItems = [];
    }

    if (parsedItems.length === 0) {
      parsedItems = [{ id: crypto.randomUUID(), category: 'unisex', size: 'M', name: '', number: '', isSimple: false, isConjunto: false, shortSize: 'M', shortNumber: '' }];
    }

    setItems(parsedItems);
    setIsListSimpleMode(parsedItems.some(item => item.isSimple));
    setViewMode('create');
    setSavedSuccessData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    setEditingListId(null);
    setListTitle('Lista Pública de Pedido');
    setIsListSimpleMode(false);
    setSavedSuccessData(null);
    setItems([
      { id: crypto.randomUUID(), category: 'unisex', size: 'M', name: '', number: '', isSimple: false, isConjunto: false, shortSize: 'M', shortNumber: '' }
    ]);
  };

  const copyShareLink = (listId: string) => {
    const shareUrl = `${window.location.origin}/lista-publica/${listId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopyFeedback(listId);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Deseja realmente excluir permanentemente esta lista pública?')) return;
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/public-lists?id=${encodeURIComponent(listId)}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        fetchAllLists();
        if (editingListId === listId) {
          handleResetForm();
        }
      } else {
        alert('Erro ao excluir lista.');
      }
    } catch (e) {
      console.error(e);
      alert('Falha na comunicação com o servidor.');
    }
  };

  // Filtered lists for the "view all" view
  const filteredAllLists = useMemo(() => {
    if (!listsSearchQuery.trim()) return allLists;
    const q = listsSearchQuery.toLowerCase();
    return allLists.filter(l => 
      l.title.toLowerCase().includes(q) ||
      (l.client_name && l.client_name.toLowerCase().includes(q)) ||
      (l.id && l.id.toLowerCase().includes(q))
    );
  }, [allLists, listsSearchQuery]);

  return (
    <div className="space-y-8 animate-fade-in pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#121215] border border-white/5 p-6 md:p-8 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl">
            <ListChecks size={28} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-heading">
                {editingListId ? 'Editar Lista Pública' : 'Cadastro Rápido de Lista Pública'}
              </h1>
              <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline">
                Painel Admin
              </span>
            </div>
            <p className="text-zinc-400 text-xs md:text-sm mt-1">
              Cadastre listas de integrantes diretamente associadas à conta de um cliente cadastrado.
            </p>
          </div>
        </div>

        {/* View Toggle Button */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {viewMode === 'create' ? (
            <button
              onClick={() => setViewMode('view_all')}
              className="w-full md:w-auto px-5 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-emerald-500/40 text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 group"
            >
              <FolderOpen size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Ver Listas Criadas ({allLists.length})</span>
            </button>
          ) : (
            <button
              onClick={() => setViewMode('create')}
              className="w-full md:w-auto px-5 py-3 bg-primary hover:bg-amber-400 text-black font-extrabold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <Plus size={16} />
              <span>Nova Lista / Formulário</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW ALL LISTS SCREEN */}
      {viewMode === 'view_all' ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121215] border border-white/5 p-4 md:p-6 rounded-2xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome da lista, cliente ou ID..."
                value={listsSearchQuery}
                onChange={(e) => setListsSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={fetchAllLists}
              disabled={isLoadingAllLists}
              className="px-4 py-3 bg-zinc-900 hover:bg-zinc-850 border border-white/10 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-2 transition"
              title="Atualizar listagem"
            >
              <RefreshCw size={14} className={isLoadingAllLists ? 'animate-spin text-primary' : ''} />
              <span>Atualizar</span>
            </button>
          </div>

          {isLoadingAllLists ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Carregando listas cadastradas...</p>
            </div>
          ) : filteredAllLists.length === 0 ? (
            <div className="py-20 text-center bg-[#121215] border border-white/5 rounded-3xl p-8 space-y-3">
              <ClipboardList size={40} className="mx-auto text-zinc-600" />
              <h3 className="text-lg font-bold text-white">Nenhuma lista encontrada</h3>
              <p className="text-zinc-500 text-xs max-w-md mx-auto">
                {listsSearchQuery ? 'Nenhum resultado corresponde à sua pesquisa.' : 'Ainda não existem listas públicas cadastradas no sistema.'}
              </p>
              <button
                onClick={() => setViewMode('create')}
                className="mt-4 px-6 py-2.5 bg-primary text-black font-extrabold rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-2"
              >
                <Plus size={14} /> Cadastrar Primeira Lista
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAllLists.map(list => {
                let parsedItems: any[] = [];
                try {
                  parsedItems = typeof list.items === 'string' ? JSON.parse(list.items) : (list.items || []);
                  if (!Array.isArray(parsedItems)) parsedItems = [];
                } catch (e) {
                  parsedItems = [];
                }

                const totalItemsCount = parsedItems.reduce((acc, item) => acc + (item.isSimple ? (item.quantity || 1) : 1), 0);

                return (
                  <div 
                    key={list.id} 
                    className="bg-[#121215] border border-white/5 hover:border-white/15 rounded-2xl p-6 space-y-4 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                            {list.title || 'Lista Pública de Pedido'}
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ID: {list.id.slice(0, 8)}...
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${list.is_locked ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {list.is_locked ? 'Fechada' : 'Aberta'}
                        </span>
                      </div>

                      {/* Associated Customer Profile */}
                      <div className="p-3 bg-zinc-950 border border-white/5 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            <User size={14} />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-zinc-200 truncate">
                              {list.client_name || 'Cliente Vinculado'}
                            </p>
                            <p className="text-[10px] text-zinc-500 truncate">
                              {list.client_email || list.client_phone || `ID: ${list.client_id.slice(0, 8)}`}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono font-bold text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded-lg shrink-0">
                          {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
                        </span>
                      </div>

                      <div className="text-[10px] text-zinc-500 flex justify-between px-1">
                        <span>Criada em: {new Date(list.created_at).toLocaleDateString('pt-BR')}</span>
                        <span>Atualizada: {new Date(list.updated_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                      <button
                        onClick={() => copyShareLink(list.id)}
                        className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/10 text-zinc-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                        title="Copiar link público para compartilhar com o cliente ou amigos"
                      >
                        {copyFeedback === list.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copyFeedback === list.id ? 'Copiado!' : 'Copiar Link'}</span>
                      </button>

                      <a
                        href={`/lista-publica/${list.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/10 text-zinc-300 hover:text-white rounded-xl transition"
                        title="Abrir página pública da lista"
                      >
                        <ExternalLink size={16} />
                      </a>

                      <button
                        onClick={() => handleEditExistingList(list)}
                        className="py-2 px-3 bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/30 rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                        title="Carregar esta lista no editor"
                      >
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="p-2 bg-zinc-900 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl transition"
                        title="Excluir lista"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* CREATE / EDIT FORM SCREEN */
        <form onSubmit={handleSaveList} className="space-y-8">
          {/* Success Banner */}
          {savedSuccessData && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-3xl p-6 md:p-8 space-y-4 animate-scale-in shadow-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl shrink-0">
                  <Check size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">
                    Lista salva com sucesso no perfil de {savedSuccessData.clientName}!
                  </h3>
                  <p className="text-zinc-400 text-xs mt-1">
                    A lista <strong>"{savedSuccessData.title}"</strong> agora aparece automaticamente na área do cliente (aba Lista Pública) e pode ser acessada por link público.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => copyShareLink(savedSuccessData.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg"
                    >
                      {copyFeedback === savedSuccessData.id ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copyFeedback === savedSuccessData.id ? 'Link Copiado!' : 'Copiar Link Público'}</span>
                    </button>

                    <a
                      href={`/lista-publica/${savedSuccessData.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-2 transition"
                    >
                      <ExternalLink size={14} />
                      <span>Visualizar Página Pública</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-bold transition ml-auto"
                    >
                      Cadastrar Outra Lista
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Customer Profile Selector */}
          <div className="bg-[#121215] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Selecionar Perfil do Cliente</h3>
                <p className="text-zinc-500 text-xs">
                  Escolha em qual conta de cliente esta lista ficará salva e vinculada.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Select with search */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Perfil de Destino <span className="text-red-400">*</span>
                </label>
                
                <div className="relative">
                  <div 
                    onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                    className="w-full bg-zinc-950 border border-white/10 hover:border-white/20 rounded-2xl p-3.5 text-xs text-white cursor-pointer flex items-center justify-between transition"
                  >
                    {selectedCustomer ? (
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                          <User size={14} />
                        </div>
                        <div className="truncate">
                          <span className="font-bold block truncate">{selectedCustomer.name}</span>
                          <span className="text-[10px] text-zinc-500 block truncate">
                            {selectedCustomer.email || selectedCustomer.phone || `CPF: ${selectedCustomer.cpf || 'Não informado'}`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-500 font-medium">Clique para escolher o cliente...</span>
                    )}
                    <span className="text-zinc-600 text-xs ml-2">▼</span>
                  </div>

                  {/* Dropdown Menu */}
                  {isClientDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in">
                      <div className="p-3 border-b border-white/5 bg-zinc-950">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Buscar cliente por nome, e-mail ou CPF..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-4 text-center text-xs text-zinc-500">
                            Nenhum cliente encontrado.
                          </div>
                        ) : (
                          filteredCustomers.map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedClientId(c.id);
                                setIsClientDropdownOpen(false);
                                setClientSearch('');
                              }}
                              className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between text-xs ${
                                selectedClientId === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-white/5 text-zinc-300'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <p className="font-bold truncate">{c.name}</p>
                                <p className="text-[10px] text-zinc-500 truncate">{c.email || c.phone || 'Sem e-mail'}</p>
                              </div>
                              {selectedClientId === c.id && <Check size={14} className="text-primary shrink-0" />}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title of the list */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Nome da Lista <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Uniformes Time A, Interclasses 2026, Turma B..."
                  value={listTitle}
                  onChange={(e) => setListTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 focus:border-primary rounded-2xl p-3.5 text-xs text-white font-bold focus:outline-none"
                  required
                />
                <p className="text-[10px] text-zinc-600">Este título será exibido na barra superior da lista e no link público.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Items Table Form (Identical to user profile) */}
          <div className="bg-[#121215] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Integrantes e Tamanhos</h3>
                  <p className="text-zinc-500 text-xs">
                    Preencha os integrantes, tamanhos de camisa, números e shorts opcionais.
                  </p>
                </div>
              </div>

              {/* Simple Mode Toggle */}
              <button
                type="button"
                onClick={toggleSimpleMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase transition ${
                  isListSimpleMode ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <span>Grade Sem Nomes</span>
                {isListSimpleMode ? <ToggleRight size={18} className="text-primary" /> : <ToggleLeft size={18} />}
              </button>
            </div>

            {/* Rows Container */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {items.map((item, index) => (
                <div key={item.id} className="space-y-2 p-4 bg-zinc-950/80 border border-white/10 rounded-2xl relative group">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        Item #{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateRow(item.id, 'isConjunto', !item.isConjunto)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 ${
                          item.isConjunto ? 'bg-primary text-black shadow-sm' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {item.isConjunto ? 'Com Short (Sim)' : 'Adicionar Short?'}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeRow(item.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded-lg transition"
                        title="Remover linha"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Form fields grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pt-1">
                    {/* Category */}
                    <div className={item.isConjunto && !item.isSimple ? "sm:col-span-2" : "sm:col-span-3"}>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Categoria</label>
                      <select
                        value={item.category}
                        onChange={(e) => updateRow(item.id, 'category', e.target.value as any)}
                        className="w-full bg-[#121215] border border-white/10 rounded-xl text-xs text-white p-2.5 outline-none font-bold focus:border-primary"
                      >
                        <option value="unisex">Unisex</option>
                        <option value="feminina">Feminina</option>
                        <option value="infantil">Infantil</option>
                      </select>
                    </div>

                    {/* Size */}
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Tamanho</label>
                      <select
                        value={item.size}
                        onChange={(e) => updateRow(item.id, 'size', e.target.value)}
                        className="w-full bg-[#121215] border border-white/10 rounded-xl text-xs text-white p-2.5 outline-none font-bold focus:border-primary"
                      >
                        {listSizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Simple mode quantity OR Detailed mode (number + name) */}
                    {item.isSimple ? (
                      <div className={item.isConjunto ? "sm:col-span-4" : "sm:col-span-7"}>
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Quantidade</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => updateRow(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full bg-[#121215] border border-white/10 rounded-xl p-2.5 text-xs text-white text-center font-bold font-mono focus:border-primary focus:outline-none"
                        />
                      </div>
                    ) : (
                      <>
                        <div className={item.isConjunto ? "sm:col-span-1" : "sm:col-span-2"}>
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Nº</label>
                          <input
                            type="text"
                            placeholder="Ex: 10"
                            value={item.number || ''}
                            onChange={(e) => {
                              updateRow(item.id, 'number', e.target.value);
                              if (item.isConjunto && !item.shortNumber) {
                                updateRow(item.id, 'shortNumber', e.target.value);
                              }
                            }}
                            className="w-full bg-[#121215] border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold text-center placeholder:text-zinc-700 focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className={item.isConjunto ? "sm:col-span-3" : "sm:col-span-5"}>
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Nome no Uniforme</label>
                          <input
                            type="text"
                            placeholder="Nome do integrante"
                            value={item.name || ''}
                            onChange={(e) => updateRow(item.id, 'name', e.target.value)}
                            className="w-full bg-[#121215] border border-white/10 rounded-xl p-2.5 text-xs text-white uppercase font-bold placeholder:text-zinc-700 focus:border-primary focus:outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Short details (if conjunto) */}
                    {item.isConjunto && (
                      <>
                        <div className={item.isSimple ? "sm:col-span-3" : "sm:col-span-2"}>
                          <label className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-1">Tam. Short</label>
                          <select
                            value={item.shortSize || listSizes[item.category][1]}
                            onChange={(e) => updateRow(item.id, 'shortSize', e.target.value)}
                            className="w-full bg-[#121215] border border-primary/40 rounded-xl text-xs text-white p-2.5 outline-none font-bold focus:border-primary"
                          >
                            {listSizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        {!item.isSimple && (
                          <div className="sm:col-span-2">
                            <label className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-1">Nº Short</label>
                            <input
                              type="text"
                              placeholder="Nº Sh"
                              value={item.shortNumber || item.number || ''}
                              onChange={(e) => updateRow(item.id, 'shortNumber', e.target.value)}
                              className="w-full bg-[#121215] border border-primary/40 rounded-xl p-2.5 text-xs text-white text-center font-bold focus:border-primary focus:outline-none"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={addRow}
                className="py-3 px-5 border border-dashed border-white/20 hover:border-primary text-zinc-300 hover:text-primary rounded-xl text-xs uppercase font-extrabold tracking-wider flex items-center justify-center gap-2 transition"
              >
                <Plus size={14} /> Adicionar 1 Linha
              </button>

              <button
                type="button"
                onClick={() => addMultipleRows(5)}
                className="py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase transition"
              >
                + 5 Linhas
              </button>

              <button
                type="button"
                onClick={() => addMultipleRows(10)}
                className="py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase transition"
              >
                + 10 Linhas
              </button>

              <div className="ml-auto text-xs font-mono font-bold text-zinc-400">
                Total: <span className="text-white font-black">{items.reduce((acc, item) => acc + (item.isSimple ? (item.quantity || 1) : 1), 0)}</span> integrantes
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="bg-[#121215] border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Sparkles size={16} className="text-primary" />
              <span>A lista será armazenada no mesmo banco de dados da área do cliente.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {editingListId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition"
                >
                  Cancelar Edição
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-amber-400 text-black font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{isSaving ? 'Salvando...' : (editingListId ? 'Atualizar Lista no Perfil' : 'Salvar Lista no Perfil do Cliente')}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
