
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Phone, Mail, MapPin, DollarSign, Calendar, 
  CheckCircle, AlertTriangle, Trash2, Edit, Plus, X, 
  Wallet, Loader2, ArrowLeft, Cloud, Clock, CreditCard,
  Filter, Layers, Package, Wrench, Search, Minus, ListChecks, Check, Eye, MoreHorizontal,
  Coins, Lock, RotateCcw, CloudDownload, Sparkles, ChevronRight, Upload, MessageCircle,
  Crown, Ticket, Tag, Percent, Copy, Printer, Download, ToggleLeft, ToggleRight, RefreshCw,
  Palette, Image
} from 'lucide-react';
import { api } from '../src/services/api';
import { SizeListItem, Order } from '../types';
import { ProductionPath } from '../components/ProductionPath';
import { MontagemMoldeDetailsSection } from '../components/MontagemMoldeDetailsSection';

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

export default function CustomerDetails() {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
      customers, orders, products, 
      updateCustomer, deleteCustomer, deleteOrder, 
      addOrder, addProduct, updateOrder, updateOrderStatus, isLoading 
  } = useData();
  const { role, currentCustomer, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'open' | 'overdue' | 'paid'>('open');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // States para Pagamento Parcial
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{ids: string[], total: number, title: string} | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'total' | 'partial'>('total');

  // State para posição do modal flutuante
  const [floatingY, setFloatingY] = useState<number>(0);

  // States para Modal de Novo/Editar Pedido
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);

  const [newOrderData, setNewOrderData] = useState({
      description: '',
      orderDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      discount: 0
  });
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // State para Criação Rápida de Item
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<'product' | 'service'>('product');
  const [quickItemData, setQuickItemData] = useState({ name: '', price: '' });

  // State para Visualização de Detalhes do Pedido
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);

  // State para Modal de Política de Fidelidade
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  // --- New Order Generator Modal States ---
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedServiceInModal, setSelectedServiceInModal] = useState<'montagem_molde' | null>(null);
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedLayoutId, setSelectedLayoutId] = useState('');

  const handleProceedToMontagemMolde = () => {
    let layoutUrl = '';
    const selectedArt = savedArts.find(art => String(art.id) === String(selectedLayoutId));
    if (selectedArt) {
      layoutUrl = selectedArt.preview_url || selectedArt.local_bg_url || '';
      if (!layoutUrl && selectedArt.images) {
        try {
          const imgs = JSON.parse(selectedArt.images);
          if (imgs && imgs.length > 0) {
            layoutUrl = imgs[0].url;
          }
        } catch (e) {}
      }
    }

    let listItems: any[] = [];
    const selectedListObj = publicLists.find(l => String(l.id) === String(selectedListId));
    if (selectedListObj && selectedListObj.items) {
      try {
        listItems = typeof selectedListObj.items === 'string' ? JSON.parse(selectedListObj.items) : selectedListObj.items;
      } catch (e) {
        console.error("Erro ao ler itens de lista:", e);
      }
    }

    setShowNewOrderModal(false);
    setSelectedServiceInModal(null);
    setSelectedListId('');
    setSelectedLayoutId('');

    navigate('/montagem-molde', { state: { layoutUrl, listItems } });
  };

  // Verification & Security States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'request' | 'verify' | 'update'>('request');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);

  const activeId = role === 'client' ? currentCustomer?.id : paramId;

  // Fix: Added filteredProducts useMemo which was missing and causing errors
  const filteredProducts = useMemo(() => {
      if (!itemSearch) return [];
      return products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 10);
  }, [products, itemSearch]);

  // --- Security Handlers ---
  const handleOpenPasswordModal = () => {
      setVerificationStep('request');
      setVerificationCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSecurityError('');
      setIsPasswordModalOpen(true);
  };

  const handleOpenEmailModal = () => {
      setVerificationStep('request');
      setVerificationCode('');
      setNewEmail('');
      setSecurityError('');
      setIsEmailModalOpen(true);
  };

  const handleSendCode = async (type: 'password' | 'email') => {
      setIsLoadingSecurity(true);
      setSecurityError('');
      try {
          const emailToSend = type === 'email' ? newEmail : customer?.email;
          if (!emailToSend) throw new Error("Email inválido.");
          
          await api.sendVerificationCode(customer!.id, emailToSend, type);
          setVerificationStep('verify');
      } catch (e: any) {
          setSecurityError(e.message || "Erro ao enviar código.");
      } finally {
          setIsLoadingSecurity(false);
      }
  };

  const handleVerifyCode = async (type: 'password' | 'email') => {
      setIsLoadingSecurity(true);
      setSecurityError('');
      try {
          const emailToVerify = type === 'email' ? newEmail : customer!.email;
          await api.verifyCode(customer!.id, emailToVerify, verificationCode, type);
          setVerificationStep('update');
      } catch (e: any) {
          setSecurityError(e.message || "Código inválido.");
      } finally {
          setIsLoadingSecurity(false);
      }
  };

  const handleUpdatePassword = async () => {
      if (newPassword !== confirmNewPassword) {
          setSecurityError("As senhas não coincidem.");
          return;
      }
      setIsLoadingSecurity(true);
      try {
          await api.updatePassword(customer!.id, newPassword);
          setIsPasswordModalOpen(false);
          alert("Senha atualizada com sucesso!");
      } catch (e: any) {
          setSecurityError(e.message || "Erro ao atualizar senha.");
      } finally {
          setIsLoadingSecurity(false);
      }
  };

  const handleUpdateEmail = async () => {
      setIsLoadingSecurity(true);
      try {
          await api.updateEmail(customer!.id, newEmail);
          setIsEmailModalOpen(false);
          alert("Email updated successfully! Please login again if necessary.");
          window.location.reload();
      } catch (e: any) {
          setSecurityError(e.message || "Erro ao atualizar email.");
      } finally {
          setIsLoadingSecurity(false);
      }
  };

  const [clientCoupons, setClientCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  const [purchasedArts, setPurchasedArts] = useState<any[]>([]);
  const [isLoadingPurchasedArts, setIsLoadingPurchasedArts] = useState(false);
  const [copiedArtId, setCopiedArtId] = useState<string | null>(null);

  // --- Public List States & Helpers ---
  const [publicList, setPublicList] = useState<any | null>(null);
  const [publicLists, setPublicLists] = useState<any[]>([]);
  const [newListName, setNewListName] = useState('');
  const [isLoadingPublicList, setIsLoadingPublicList] = useState(false);
  const [isEditingPublicList, setIsEditingPublicList] = useState(false);
  const [editedPublicListItems, setEditedPublicListItems] = useState<SizeListItem[]>([]);
  const [originalSnapshotPublicListItems, setOriginalSnapshotPublicListItems] = useState<SizeListItem[]>([]);
  const [isSavingPublicList, setIsSavingPublicList] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExpandedPublicList, setIsExpandedPublicList] = useState(false);
  const [isListSimpleMode, setIsListSimpleMode] = useState(false);
  const [isRenamingList, setIsRenamingList] = useState(false);
  const [newListNameInputValue, setNewListNameInputValue] = useState("");

  const listSizes: Record<string, string[]> = {
    unisex: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'],
    feminina: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1'],
    infantil: ['RN', '2', '4', '6', '8', '10', '12', '14', '16']
  };

  const loadPublicLists = async () => {
    if (!activeId) return;
    setIsLoadingPublicList(true);
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const url = role === 'admin' 
        ? `/api/public-lists?client_id=${activeId}&all=true`
        : `/api/public-lists?my_list=true&all=true`;

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        const lists = Array.isArray(data) ? data : [];
        setPublicLists(lists);
        
        // Se houver uma lista ativa sendo editada/visualizada, atualizá-la
        if (publicList) {
          const updated = lists.find((l: any) => l.id === publicList.id);
          if (updated) {
            setPublicList(updated);
            const parsed = typeof updated.items === 'string' ? JSON.parse(updated.items) : updated.items;
            setEditedPublicListItems(parsed);
            setOriginalSnapshotPublicListItems(JSON.parse(JSON.stringify(parsed)));
          }
        }
      }
    } catch (e) {
      console.error('Erro ao buscar listas públicas:', e);
    } finally {
      setIsLoadingPublicList(false);
    }
  };

  const loadPublicList = loadPublicLists;

  const handleSaveListName = async () => {
    if (!publicList?.id || !newListNameInputValue.trim()) return;
    setIsSavingPublicList(true);
    try {
      const res = await fetch(`/api/public-lists?id=${encodeURIComponent(publicList.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newListNameInputValue.trim(),
          items: editedPublicListItems,
          is_locked: publicList.is_locked
        })
      });

      if (res.ok) {
        setPublicList({ ...publicList, title: newListNameInputValue.trim() });
        await loadPublicLists();
        setIsRenamingList(false);
        alert('Nome da lista atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar o nome da lista.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao se conectar ao servidor.');
    } finally {
      setIsSavingPublicList(false);
    }
  };

  const handleCreatePublicList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) {
      alert("Por favor, digite o nome da lista.");
      return;
    }
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const url = role === 'admin' 
        ? `/api/public-lists?client_id=${activeId}`
        : `/api/public-lists`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title: newListName })
      });

      if (res.ok) {
        setNewListName('');
        await loadPublicLists();
        alert('Lista criada com sucesso!');
      } else {
        alert('Erro ao criar lista.');
      }
    } catch (e) {
      console.error('Erro ao criar lista pública:', e);
      alert('Erro ao conectar ao servidor.');
    }
  };

  const handleDeletePublicList = async (listIdToDelete: string) => {
    if (!confirm("Tem certeza que deseja excluir esta lista? Todos os dados contidos nela serão deletados definitivamente.")) return;
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/public-lists?id=${listIdToDelete}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        await loadPublicLists();
        if (publicList?.id === listIdToDelete) {
          setPublicList(null);
          setEditedPublicListItems([]);
          setOriginalSnapshotPublicListItems([]);
          setIsEditingPublicList(false);
        }
        alert('Lista de produção excluída com sucesso.');
      } else {
        alert('Erro ao excluir lista.');
      }
    } catch (e) {
      console.error('Erro ao excluir lista pública:', e);
      alert('Erro ao conectar ao servidor.');
    }
  };

  const handleSavePublicListFromProfile = async () => {
    if (!publicList?.id) return;
    setIsSavingPublicList(true);
    try {
      // 1. Fetch latest list items from DB
      const getRes = await fetch(`/api/public-lists?id=${encodeURIComponent(publicList.id)}`);
      if (getRes.ok) {
        const data = await getRes.json();
        const dbItems: SizeListItem[] = data.items 
          ? (typeof data.items === 'string' ? JSON.parse(data.items) : data.items) 
          : [];

        // 2. Perform safe merge using local edits, current server items, and snapshot baseline
        const snapshotIds = new Set(originalSnapshotPublicListItems.map((item) => item.id));
        const localIds = new Set(editedPublicListItems.map((item) => item.id));
        const localMap = new Map(editedPublicListItems.map((item) => [item.id, item]));

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
        for (const localItem of editedPublicListItems) {
          if (!dbIds.has(localItem.id) && !snapshotIds.has(localItem.id)) {
            // Brand new item added locally -> keep it!
            mergedList.push(localItem);
          }
        }

        // 2.3 Sort the merged list as requested
        const sortedMergedList = sortSizeListItems(mergedList);

        // 3. Save merged list using PUT
        const res = await fetch(`/api/public-lists?id=${encodeURIComponent(publicList.id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: publicList.title || 'Lista Pública de Pedido',
            items: sortedMergedList,
            is_locked: publicList.is_locked
          })
        });

        if (res.ok) {
          setEditedPublicListItems(sortedMergedList);
          setOriginalSnapshotPublicListItems(JSON.parse(JSON.stringify(sortedMergedList)));
          alert('Lista pública atualizada com sucesso!');
          setIsEditingPublicList(false);
          loadPublicList();
        } else {
          alert('Erro ao salvar as alterações da lista.');
        }
      } else {
        alert('Erro ao sincronizar dados da lista antes de salvar.');
      }
    } catch (error) {
      alert('Erro de conexão ao salvar a lista.');
    } finally {
      setIsSavingPublicList(false);
    }
  };

  const handleToggleLockList = async () => {
    if (!publicList?.id) return;
    setIsSavingPublicList(true);
    try {
      const newLockedStatus = publicList.is_locked === 1 ? 0 : 1;
      const res = await fetch(`/api/public-lists?id=${encodeURIComponent(publicList.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: publicList.title || 'Lista Pública de Pedido',
          items: editedPublicListItems,
          is_locked: newLockedStatus
        })
      });

      if (res.ok) {
        setPublicList({ ...publicList, is_locked: newLockedStatus });
        alert(newLockedStatus ? 'Lista travada para produção!' : 'Lista destravada com sucesso!');
        loadPublicList();
      } else {
        alert('Erro ao alterar o status de travamento da lista.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao alterar status da lista.');
    } finally {
      setIsSavingPublicList(false);
    }
  };

  const addPublicListRow = () => {
    const defaultCategory = 'unisex';
    const newItem: SizeListItem = {
      id: crypto.randomUUID(),
      category: defaultCategory,
      size: listSizes[defaultCategory][2], // 'M'
      number: '',
      name: '',
      shortSize: listSizes[defaultCategory][2],
      shortNumber: '',
      quantity: 1,
      isSimple: isListSimpleMode
    };
    setEditedPublicListItems((prev) => [...prev, newItem]);
  };

  const removePublicListRow = (rowId: string) => {
    setEditedPublicListItems((prev) => prev.filter((item) => item.id !== rowId));
  };

  const updatePublicListRow = (rowId: string, field: keyof SizeListItem, value: any) => {
    setEditedPublicListItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          const updated = { ...item, [field]: value };
          if (field === 'category') {
            updated.size = listSizes[value][0];
            updated.shortSize = listSizes[value][0];
          }
          return updated;
        }
        return item;
      })
    );
  };

  const toggleListSimpleMode = () => {
    const newSimple = !isListSimpleMode;
    setIsListSimpleMode(newSimple);
    setEditedPublicListItems((prev) =>
      prev.map((item) => ({
        ...item,
        isSimple: newSimple
      }))
    );
  };

  const handleDownloadPublicListPDF = async () => {
    if (!publicList) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const itemsToRender = typeof publicList.items === 'string' ? JSON.parse(publicList.items) : publicList.items;
      
      doc.setFontSize(22);
      doc.setTextColor(190, 155, 60);
      doc.text("CRAZY ART", 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text("Relatório de Lista Pública de Produção", 105, 28, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Cliente: ${customer?.name || 'Cliente'}`, 15, 40);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 15, 45);
      doc.text(`Título da Lista: ${publicList.title}`, 15, 50);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 53, 195, 53);
      
      let y = 62;
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.text("Tipo Grade", 15, y);
      doc.text("Tam", 45, y);
      doc.text("Qtd", 65, y);
      doc.text("Nº Camisa", 90, y);
      doc.text("Nome na Camisa", 125, y);
      
      doc.line(15, y + 3, 195, y + 3);
      y += 10;
      
      doc.setFont("Helvetica", "normal");
      if (!itemsToRender || itemsToRender.length === 0) {
        doc.text("Nenhum item preenchido nesta lista.", 15, y);
      } else {
        itemsToRender.forEach((item: any) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
            doc.setFont("Helvetica", "bold");
            doc.text("Tipo Grade", 15, y);
            doc.text("Tam", 45, y);
            doc.text("Qtd", 65, y);
            doc.text("Nº Camisa", 90, y);
            doc.text("Nome na Camisa", 125, y);
            doc.line(15, y + 3, 195, y + 3);
            y += 10;
            doc.setFont("Helvetica", "normal");
          }
          
          doc.text(String(item.category || 'unisex').toUpperCase(), 15, y);
          doc.text(String(item.size || ''), 45, y);
          
          const qty = item.isSimple ? String(item.quantity || 1) : "1";
          doc.text(qty, 65, y);
          
          const num = item.isSimple ? "-" : String(item.number || '');
          doc.text(num, 90, y);
          
          const name = item.isSimple ? "-" : String(item.name || '').toUpperCase();
          doc.text(name, 125, y);
          
          y += 8;
        });
      }
      
      const totalPecas = itemsToRender ? itemsToRender.reduce((sum: number, item: any) => sum + (item.isSimple ? Number(item.quantity || 1) : 1), 0) : 0;
      y += 5;
      doc.line(15, y, 195, y);
      y += 8;
      doc.setFont("Helvetica", "bold");
      doc.text(`Total de Peças Final: ${totalPecas}`, 15, y);
      
      doc.save(`lista_publica_${customer?.name || 'cliente'}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF.");
    }
  };

  const handlePrintPublicList = () => {
    if (!publicList) return;
    const itemsToPrint = typeof publicList.items === 'string' ? JSON.parse(publicList.items) : publicList.items;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor, ative os popups para imprimir.");
      return;
    }
    
    const itemsHtml = itemsToPrint && itemsToPrint.length > 0 
      ? itemsToPrint.map((item: any) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; text-transform: uppercase;">${item.category || 'unisex'}</td>
          <td style="padding: 10px; font-weight: bold;">${item.size || ''}</td>
          <td style="padding: 10px;">${item.isSimple ? (item.quantity || 1) : 1}</td>
          <td style="padding: 10px; font-family: monospace;">${item.isSimple ? '-' : (item.number || '')}</td>
          <td style="padding: 10px; text-transform: uppercase;">${item.isSimple ? '-' : (item.name || '')}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #777;">Nenhum item preenchido</td></tr>';

    const totalPecas = itemsToPrint ? itemsToPrint.reduce((sum: number, item: any) => sum + (item.isSimple ? Number(item.quantity || 1) : 1), 0) : 0;

    printWindow.document.write(`
      <html>
        <head>
          <title>Crazy Art - Lista Pública de Produção</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 40px; color: #333; }
            h1 { text-align: center; color: #be9b3c; margin-bottom: 5px; }
            h3 { text-align: center; color: #666; font-weight: normal; margin-top: 0; margin-bottom: 30px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .info-table td { padding: 5px 0; font-size: 14px; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .items-table th { background-color: #f7f7f7; text-align: left; padding: 12px 10px; font-size: 13px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
            .items-table td { font-size: 13px; }
            .total-section { margin-top: 30px; font-size: 16px; font-weight: bold; border-top: 2px solid #ddd; padding-top: 15px; }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>CRAZY ART</h1>
          <h3>Lista de Produção</h3>
          
          <table class="info-table">
            <tr>
              <td><strong>Cliente:</strong> ${customer?.name || 'Cliente'}</td>
              <td style="text-align: right;"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</td>
            </tr>
            <tr>
              <td><strong>Título da Lista:</strong> ${publicList.title}</td>
              <td style="text-align: right;"><strong>Status:</strong> Ativa</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th>Tipo Grade</th>
                <th>Tam</th>
                <th>Qtd</th>
                <th>Nº Camisa</th>
                <th>Nome na Camisa</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            Total de Peças: ${totalPecas}
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  const loadClientCoupons = async () => {
    if (!activeId) return;
    setIsLoadingCoupons(true);
    try {
      const url = `/api/client-coupons?_t=${Date.now()}${role === 'admin' ? `&clientId=${activeId}` : ''}`;
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setClientCoupons(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  const loadPurchasedArts = async () => {
    if (!activeId) return;
    setIsLoadingPurchasedArts(true);
    try {
      const url = `/api/purchased-arts?_t=${Date.now()}${role === 'admin' ? `&clientId=${activeId}` : ''}`;
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPurchasedArts(data);
      }
    } catch (e) {
      console.error("Error loading purchased arts:", e);
    } finally {
      setIsLoadingPurchasedArts(false);
    }
  };

  const [savedArts, setSavedArts] = useState<any[]>([]);
  const [isLoadingSavedArts, setIsLoadingSavedArts] = useState(false);

  const loadSavedArts = async () => {
    setIsLoadingSavedArts(true);
    try {
      const data = await api.getSavedArts(activeId);
      setSavedArts(data);
    } catch (e) {
      console.error("Error loading saved arts:", e);
    } finally {
      setIsLoadingSavedArts(false);
    }
  };

  const handleDeleteSavedArt = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta arte salva?")) return;
    try {
      await api.deleteSavedArt(id, activeId);
      loadSavedArts();
    } catch (e: any) {
      alert("Erro ao excluir arte: " + e.message);
    }
  };

  useEffect(() => {
    if (activeId) {
      loadClientCoupons();
      loadPublicList();
      loadPurchasedArts();
      loadSavedArts();
    }
  }, [activeId]);

  const handleClaimCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !activeId) return;
    setIsClaiming(true);
    setClaimError('');
    setClaimSuccess('');
    try {
      const url = `/api/client-coupons${role === 'admin' ? `?clientId=${activeId}` : ''}`;
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ code: newCouponCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar cupom.');
      }
      setClaimSuccess('Cupom adicionado com sucesso!');
      setNewCouponCode('');
      loadClientCoupons();
    } catch (err: any) {
      setClaimError(err.message || 'Erro ao adicionar cupom.');
    } finally {
      setIsClaiming(false);
    }
  };

  useEffect(() => {
    if (role === 'admin' && !paramId) {
       navigate('/customers');
    }
  }, [role, paramId, navigate]);

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center text-zinc-500">
              <Loader2 className="animate-spin mr-2" /> Carregando...
          </div>
      );
  }

  let rawCustomer = role === 'client' 
      ? currentCustomer 
      : customers.find(c => c.id === activeId);

  const customer = rawCustomer ? {
      ...rawCustomer,
      creditLimit: Number(rawCustomer.creditLimit || 0),
      isSubscriber: !!rawCustomer.isSubscriber,
      address: rawCustomer.address || {
          street: (rawCustomer as any).street || '',
          number: (rawCustomer as any).number || '',
          zipCode: (rawCustomer as any).zipCode || ''
      }
  } : null;

  if (!customer) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center text-zinc-500">
              <User size={48} className="mb-4 opacity-20" />
              <p>Cliente não encontrado.</p>
              <button onClick={() => navigate('/')} className="mt-4 text-primary hover:underline">Voltar</button>
          </div>
      );
  }

  const cloudUrl = customer?.cloudLink || (customer as any)?.cloud_link;

  const allCustomerOrders = orders
    .filter(o => o.client_id === customer?.id)
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

  const today = new Date();
  today.setHours(0,0,0,0);

  const _openOrders = allCustomerOrders.filter(o => {
      if (!['open', 'production', 'revision'].includes(o.status)) return false;
      const due = new Date(o.due_date);
      return due >= today;
  });

  const _overdueOrders = allCustomerOrders.filter(o => {
      if (!['open', 'production', 'revision'].includes(o.status)) return false;
      const due = new Date(o.due_date);
      return due < today;
  });

  // Lógica de Bloqueio da Nuvem
  const isCloudLocked = role === 'client' && _overdueOrders.length > 0;

  const _paidOrders = allCustomerOrders.filter(o => 
    (o.status === 'paid' || !!o.paid_at) && o.status !== 'cancelled'
  );

  const displayedOrders = useMemo(() => {
      switch(activeTab) {
          case 'open': return _openOrders;
          case 'overdue': return _overdueOrders;
          case 'paid': return _paidOrders;
          default: return _openOrders;
      }
  }, [activeTab, _openOrders, _overdueOrders, _paidOrders]);

  const allPayableOrders = [..._openOrders, ..._overdueOrders];
  const totalPayableValue = allPayableOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);

  const currentTabPayableOrders = useMemo(() => 
      displayedOrders.filter(o => o.status === 'open'),
  [displayedOrders]);

  const isAllSelected = currentTabPayableOrders.length > 0 && currentTabPayableOrders.every(o => selectedOrderIds.includes(o.id));

  const handleSelectAll = (e: React.MouseEvent) => {
      if (e) setFloatingY(e.clientY);
      
      if (isAllSelected) {
          const idsToDeselect = currentTabPayableOrders.map(o => { return o.id; });
          setSelectedOrderIds(prev => prev.filter(id => !idsToDeselect.includes(id)));
      } else {
          const idsToSelect = currentTabPayableOrders.map(o => { return o.id; });
          setSelectedOrderIds(prev => Array.from(new Set([...prev, ...idsToSelect])));
      }
  };

  const totalPaid = _paidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalOpen = _openOrders.reduce((acc, o) => acc + Number(o.total || 0), 0) + _overdueOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalOverdueValue = _overdueOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);

  const creditLimit = customer?.creditLimit || 0;
  const availableCredit = creditLimit - totalOpen;
  const usedPercentage = Math.min(100, (totalOpen / creditLimit) * 100);
  
  const selectedTotal = useMemo(() => {
    return allCustomerOrders
      .filter(o => selectedOrderIds.includes(o.id))
      .reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  }, [allCustomerOrders, selectedOrderIds]);

  const toggleSelectOrder = (orderId: string, e: React.MouseEvent) => {
    setFloatingY(e.clientY);

    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // --- LOGICA DE PAGAMENTO REVISADA (TOTAL OU PARCIAL) ---

  const initiatePaymentFlow = (orderIds: string[]) => {
      const targetOrders = allCustomerOrders.filter(o => orderIds.includes(o.id));
      const amountToPay = targetOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
      const title = orderIds.length === 1 
          ? `Pedido #${targetOrders[0]?.formattedOrderNumber} - Crazy Art`
          : `Faturas (${orderIds.length}) - Crazy Art`;

      const isSingleOrder = orderIds.length === 1;
      const isEligibleForPartial = isSingleOrder && amountToPay > 50 && role === 'client';

      if (isEligibleForPartial) {
          setPendingPaymentData({ ids: orderIds, total: amountToPay, title });
          setCustomAmount((amountToPay / 2).toFixed(2));
          setPaymentType('total');
          setIsValueModalOpen(true);
      } else {
          executePayment(orderIds, amountToPay, title);
      }
  };

  const executePayment = async (orderIds: string[], amount: number, title: string) => {
    if (orderIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
        const res = await api.createPayment({
            orderId: orderIds.join(','),
            title: amount < (pendingPaymentData?.total || 0) ? `[PARCIAL] ${title}` : title,
            amount: amount,
            payerEmail: customer?.email,
            payerName: customer?.name,
        });

        if (res && res.init_point) {
            window.open(res.init_point, '_blank');
            setIsValueModalOpen(false);
        } else {
            alert('Erro ao gerar link de pagamento.');
        }
    } catch (e: any) {
        alert('Erro: ' + e.message);
    } finally {
        setIsBatchProcessing(false);
    }
  };

  const handleConfirmValueModal = () => {
      if (!pendingPaymentData) return;
      const finalAmount = paymentType === 'total' 
          ? pendingPaymentData.total 
          : parseFloat(customAmount.replace(',', '.'));

      if (isNaN(finalAmount) || finalAmount <= 0) {
          alert('Por favor, insira um valor válido.');
          return;
      }

      executePayment(pendingPaymentData.ids, finalAmount, pendingPaymentData.title);
  };

  const handleWhatsAppOverdue = () => {
    if (!customer || _overdueOrders.length === 0) return;

    const firstName = customer.name.split(' ')[0];
    let message = "```";
    message += `Olá, ${firstName},\nnotamos que existem pendencias vencidas em seu cadastro.\n`;
    
    _overdueOrders.forEach(order => {
        message += `Pedido #${order.formattedOrderNumber || order.order_number} valor = R$ ${Number(order.total || 0).toFixed(2)}\n`;
    });

    message += `\nPara regularizar so acessar seu cadastro no site crazyart.com.br e ir até a area de meus pedidos.\nQualquer duvida so perguntar a nossa assistente virtual.\nObrigado pela compreensão.`;
    message += "```";

    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phoneNumber}?text=${encodedMessage}`, '_blank');
  };

  const handleNoLimitWhatsApp = () => {
    if (!customer) return;

    const firstName = customer.name.split(' ')[0];
    const payableOrders = allCustomerOrders.filter(o => ['open', 'production', 'revision'].includes(o.status));

    let message = "```";
    message += `Olá, ${firstName},\ncredito insuficiente para registro de novo pedido, favor conferir na aba de meus pedidos em seu cadastro.\n\npedidos encontrados:\n`;
    
    payableOrders.forEach((order, index) => {
        message += `pedido${index + 1}:\nnome= "${order.description || 'Sem descrição'}" / valor="R$ ${Number(order.total || 0).toFixed(2)}" / data criação= "${new Date(order.order_date).toLocaleDateString()}" / data vencimento= "${new Date(order.due_date).toLocaleDateString()}"\n`;
    });

    message += "```";

    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = (customer.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/55${phoneNumber}?text=${encodedMessage}`, '_blank');
  };

  const handleManualPayment = async (orderId: string) => {
      if (confirm("Confirmar recebimento manual deste pedido?")) {
          await updateOrder(orderId, { 
              status: 'paid', 
              payment_method: 'admin', 
              paid_at: new Date().toISOString() 
          });
          if (viewingOrder?.id === orderId) setViewingOrder(null);
      }
  };

  const handleFinishOrder = async (orderId: string) => {
      if (confirm("Deseja marcar este pedido como FINALIZADO?")) {
          await updateOrder(orderId, { 
              status: 'finished', 
              finished_by_admin: 1, 
              finished_at: new Date().toISOString() 
          });
          if (viewingOrder?.id === orderId) setViewingOrder(null);
      }
  };

  const handleReopenOrder = async (orderId: string) => {
      if (confirm("ATENÇÃO: Deseja reabrir este pedido? Ele voltará para a lista de 'Abertos' e sairá do financeiro de pagos.")) {
          await updateOrderStatus(orderId, 'open');
          if (viewingOrder?.id === orderId) setViewingOrder(null);
      }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
          ...formData,
          credit_limit: formData.creditLimit,
          is_subscriber: formData.isSubscriber ? 1 : 0
      };
      const res = await updateCustomer(customer!.id, payload);
      
      if (res && res.client) {
          const returnedLimit = res.client.creditLimit !== undefined ? res.client.creditLimit : res.client.credit_limit;
          const sentLimit = payload.credit_limit;
          
          if (returnedLimit !== undefined && Math.abs(Number(returnedLimit) - Number(sentLimit)) > 0.01) {
               alert(`Atenção: O limite de crédito pode não ter sido salvo corretamente.\nEnviado: ${sentLimit}\nRetornado: ${returnedLimit}\n\nPor favor, verifique se você tem permissão de administrador.`);
          }
      }
      
      setIsEditModalOpen(false);
  };
  
  const openEditModal = () => {
      setFormData({
          name: customer?.name,
          email: customer?.email,
          phone: customer?.phone,
          cpf: customer?.cpf,
          address: { ...customer?.address },
          creditLimit: customer?.creditLimit,
          cloudLink: cloudUrl,
          isSubscriber: customer?.isSubscriber,
          subscriptionExpiresAt: customer?.subscriptionExpiresAt ? customer.subscriptionExpiresAt.split('T')[0] : '',
          password: ''
      });
      setIsEditModalOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
      if (confirm('Excluir este pedido permanentemente?')) {
          await deleteOrder(orderId);
          if (viewingOrder?.id === orderId) setViewingOrder(null);
      }
  };

  const handleConfirmDeleteAccount = async () => {
      if (!customer) return;
      try {
          await deleteCustomer(customer.id);
          alert('Cadastro excluído com sucesso.');
          if (role === 'client') {
              logout();
              navigate('/');
          } else {
              navigate('/customers');
          }
      } catch (err: any) {
          alert('Erro ao excluir cadastro: ' + err.message);
      }
  };

  const handleOpenNewOrder = () => {
      setEditingOrderId(null);
      setNewOrderData({
          description: '',
          orderDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          discount: 0
      });
      setOrderItems([]);
      setItemSearch('');
      setIsNewOrderModalOpen(true);
  };

  // Carrega detalhes completos do pedido quando clica em visualizar
  const fetchAndSetViewingOrder = async (order: any) => {
      setViewingOrder(order);
      try {
          // Busca detalhes completos, incluindo itens com links de download
          const fullOrder = await api.getOrder(order.id);
          setViewingOrder(fullOrder);
      } catch (e) {
          console.error("Erro ao carregar detalhes do pedido", e);
      }
  };

  const handleEditOrder = async (order: any) => {
      setViewingOrder(null);
      setIsLoadingOrderDetails(true);
      setEditingOrderId(order.id);
      setIsNewOrderModalOpen(true);

      try {
          const fullOrder = await api.getOrder(order.id);
          setNewOrderData({
              description: fullOrder.description || '',
              orderDate: fullOrder.order_date ? fullOrder.order_date.split('T')[0] : '',
              dueDate: fullOrder.due_date ? fullOrder.due_date.split('T')[0] : '',
              discount: fullOrder.discount || 0
          });
          if (fullOrder.items) {
              const mappedItems = fullOrder.items.map((i: any) => ({
                  productId: i.catalog_id || 'manual',
                  productName: i.name,
                  quantity: i.quantity,
                  unitPrice: i.unit_price,
                  total: i.total
              }));
              setOrderItems(mappedItems);
          }
      } catch (e) {
          setIsNewOrderModalOpen(false);
      } finally {
          setIsLoadingOrderDetails(false);
      }
  };

  const handleAddItem = (product: any) => {
      setOrderItems(prev => {
          const existing = prev.find(i => i.productId === product.id);
          if (existing) {
              return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice } : i);
          }
          return [...prev, {
              productId: product.id,
              productName: product.name,
              quantity: 1,
              unitPrice: product.price,
              total: product.price,
              type: product.type // Guarda o tipo para salvar corretamente
          }];
      });
      setItemSearch('');
      setShowSearchResults(false);
  };

  const handleRemoveItem = (index: number) => {
      setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, newQty: string) => {
      if (newQty === '') {
          setOrderItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: '' as any, total: 0 } : item));
          return;
      }
      const parsedQty = parseInt(newQty);
      if (isNaN(parsedQty) || parsedQty < 1) return;
      setOrderItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: parsedQty, total: parsedQty * item.unitPrice } : item));
  };

  const orderSubtotal = orderItems.reduce((acc, item) => acc + (typeof item.quantity === 'number' ? item.total : 0), 0);
  const orderTotal = Math.max(0, orderSubtotal - (Number(newOrderData.discount) || 0));

  const handleFinalizeOrder = async () => {
      if (orderItems.length === 0 && !newOrderData.description) return;
      const payload = {
          client_id: customer.id,
          description: newOrderData.description || `Pedido com ${orderItems.length} itens`,
          order_date: newOrderData.orderDate,
          due_date: newOrderData.dueDate,
          items: orderItems,
          discount: Number(newOrderData.discount || 0),
          status: 'open'
      };
      if (editingOrderId) await updateOrder(editingOrderId, payload);
      else await addOrder(payload);
      setIsNewOrderModalOpen(false);
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickItemData.name || !quickItemData.price) return;
      const newItem = await addProduct({
          name: quickItemData.name,
          price: parseFloat(quickItemData.price.replace(',', '.')),
          type: quickCreateType,
          description: 'Criado via pedido rápido'
      });
      handleAddItem({ id: newItem.id, name: newItem.name, price: newItem.price, type: newItem.type });
      setIsQuickCreateOpen(false);
      setQuickItemData({ name: '', price: '' });
  };

  const renderStatusBadge = (status: string, isLate: boolean) => {
      if (status === 'paid') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">Pago</span>;
      if (status === 'finished') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">Finalizado</span>;
      if (isLate) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wide">Atrasado</span>;
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">Aberto</span>;
  };

  const renderClientView = () => {
    const hasOverdue = _overdueOrders.length > 0;

    return (
      <div 
        className="max-w-6xl mx-auto pb-24 animate-fade-in-up"
        onAnimationEnd={(e) => {
          (e.currentTarget as HTMLElement).classList.remove('animate-fade-in-up');
        }}
      >
        <div className="flex items-center gap-4 mb-8">
            <Link to="/" className="p-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight font-heading">Minha Área</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna Esquerda: Dados Cadastrais e Artes Adquiridas */}
            <div className="space-y-8">
                <div className="bg-[#121215] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User className="text-primary" size={24} />
                        Dados Cadastrais
                    </h2>
                    <button onClick={openEditModal} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition" title="Editar Dados">
                        <Edit size={18} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome Completo</label>
                        <div className="flex items-center gap-3">
                            <p className="text-white font-medium text-lg">{customer?.name}</p>
                            {customer?.isSubscriber && (
                                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-purple-900/40">
                                    <Crown size={12} /> ASSINANTE
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">CPF / CNPJ</label>
                        <div className="flex items-center gap-2">
                            <p className="text-zinc-300 font-mono text-lg">{customer?.cpf}</p>
                            <Lock size={14} className="text-zinc-600" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Telefone</label>
                        <p className="text-zinc-300 font-mono text-lg">{customer?.phone}</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email</label>
                        <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                            <p className="text-zinc-300 truncate">{customer?.email || 'Não cadastrado'}</p>
                            <button onClick={handleOpenEmailModal} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition font-bold">
                                Trocar Email
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Senha</label>
                        <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                            <p className="text-zinc-500 font-mono">••••••••</p>
                            <button onClick={handleOpenPasswordModal} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition font-bold">
                                Trocar Senha
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Endereço</label>
                        <p className="text-zinc-300 leading-relaxed">
                            {customer?.address?.street ? `${customer.address.street}, ${customer.address.number} - ${customer.address.zipCode}` : 'Endereço não cadastrado'}
                        </p>
                    </div>

                    {cloudUrl && (
                        <div className="pt-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Acesso de Arquivos</label>
                            <div className="flex items-center gap-3 bg-[#18181b] p-3 rounded-2xl border border-white/5">
                                {isCloudLocked ? (
                                    <button 
                                        onClick={() => alert("O acesso à nuvem está bloqueado temporariamente devido a pendências financeiras. Por favor, regularize seus pedidos atrasados para liberar o acesso.")}
                                        className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center font-black text-lg transition-all shadow-lg shadow-red-600/20 shrink-0"
                                        title="Acessar Nuvem (Bloqueado por Pendências)"
                                    >
                                        M
                                    </button>
                                ) : (
                                    <a 
                                        href={cloudUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center font-black text-lg transition-all shadow-lg shadow-red-600/20 shrink-0"
                                        title="Acessar Nuvem"
                                    >
                                        M
                                    </a>
                                )}
                                <span className="text-sm font-bold text-zinc-300">minha nuvem de arquivos</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Artes Adquiridas Section */}
                <div id="acquired-arts-sec" className="bg-[#121215] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Palette className="text-[#a855f7]" size={24} />
                            Artes Adquiridas
                        </h2>
                    </div>

                    {isLoadingPurchasedArts ? (
                        <div className="flex items-center justify-center py-10 text-zinc-500">
                            <Loader2 size={24} className="animate-spin mr-2" />
                            Carregando suas artes...
                        </div>
                    ) : purchasedArts.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 space-y-4">
                            <Image size={40} className="mx-auto opacity-20 text-zinc-400" />
                            <p className="text-sm">Você ainda não adquiriu nenhuma arte da Quitanda.</p>
                            <Link to="/quitanda_de_art" className="inline-block text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl px-4 py-2 transition mt-2">
                                Visitar a Quitanda de Artes
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {purchasedArts.map((art) => {
                                const purchaseDate = art.purchased_at 
                                    ? new Date(art.purchased_at).toLocaleDateString('pt-BR') 
                                    : '---';

                                return (
                                    <div key={art.art_id || art.art_name} className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-800 transition">
                                        <div className="space-y-1">
                                            <p className="text-white font-medium truncate text-sm" title={art.art_name}>{art.art_name}</p>
                                            <p className="text-xs text-zinc-500">Comprado em: {purchaseDate}</p>
                                        </div>
                                        {art.download_link ? (
                                            <div className="flex gap-2 mt-3 w-full">
                                                <a 
                                                    href={art.download_link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="flex-1 text-center text-xs font-bold bg-[#7c3aed] text-white rounded-lg py-2 transition hover:bg-[#6d28d9] flex items-center justify-center gap-1"
                                                >
                                                    <Download size={14} /> Baixar Arte
                                                </a>
                                                <button
                                                    onClick={() => {
                                                        const id = art.art_id || art.art_name;
                                                        navigator.clipboard.writeText(art.download_link);
                                                        setCopiedArtId(id);
                                                        setTimeout(() => setCopiedArtId(null), 2500);
                                                    }}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border border-white/5 ${
                                                        copiedArtId === (art.art_id || art.art_name)
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300'
                                                    }`}
                                                    title="Copiar Link"
                                                >
                                                    <Copy size={14} />
                                                    {copiedArtId === (art.art_id || art.art_name) && <span className="text-[10px]">Copiado</span>}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="mt-3 w-full text-center text-xs text-zinc-500 border border-white/5 rounded-lg py-2">
                                                Aguardando link
                                             </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Coluna Direita: Ações e Status */}
            <div className="space-y-6">
                {/* Botão Gerar Novo Pedido */}
                <button
                    onClick={() => {
                        setShowNewOrderModal(true);
                        setSelectedServiceInModal(null);
                        setSelectedListId('');
                        setSelectedLayoutId('');
                    }}
                    className="w-full py-4 px-6 bg-gradient-to-r from-[#a855f7] to-[#8b5cf6] hover:from-[#9333ea] hover:to-[#7c3aed] text-white rounded-3xl font-extrabold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg shadow-[#a855f7]/10 hover:shadow-[#a855f7]/20 group hover:scale-[1.01]"
                >
                    <Sparkles size={14} className="animate-pulse text-amber-300" />
                    <span>Gerar Novo Pedido</span>
                </button>

                {/* Meus Layouts */}
                <div className="bg-[#121215] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col gap-4">
                    {/* Section Header */}
                    <div className="flex justify-between items-center bg-black/15 p-2.5 -mx-6 -mt-6 border-b border-white/5 px-6">
                        <div className="flex items-center gap-2">
                            <Palette className="text-[#a855f7]" size={20} />
                            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Meus Layouts</h3>
                            {!isLoadingSavedArts && savedArts.length > 0 && (
                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full md:inline-block">
                                    {savedArts.length}
                                </span>
                            )}
                        </div>
                        <Link 
                            to="/layout-builder" 
                            className="text-[10px] bg-[#a855f7]/10 hover:bg-[#a855f7]/25 border border-[#a855f7]/20 text-[#a855f7] px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1 shadow-lg shadow-[#a855f7]/5"
                        >
                            <Plus size={11} />
                            <span>Nova Arte</span>
                        </Link>
                    </div>

                    {isLoadingSavedArts ? (
                        <div className="flex items-center justify-center py-8 text-zinc-500 text-xs">
                            <Loader2 size={18} className="animate-spin mr-2" />
                            Buscando seus layouts...
                        </div>
                    ) : savedArts.length === 0 ? (
                        <div className="text-center py-6 text-zinc-505 space-y-2">
                            <Palette size={26} className="mx-auto opacity-20 text-[#a855f7]" />
                            <p className="text-xs text-zinc-500">Nenhum layout de Mockup 2D salvo ainda.</p>
                            <Link to="/layout-builder" className="inline-block text-[11px] font-bold bg-[#a855f7]/10 hover:bg-[#a855f7]/25 border border-[#a855f7]/20 text-[#a855f7] rounded-lg px-3 py-1.5 transition mt-2">
                                Começar a Criar
                            </Link>
                        </div>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-850">
                            {savedArts.map((art) => {
                                const dateStr = art.created_at 
                                    ? new Date(art.created_at).toLocaleDateString('pt-BR')
                                    : '---';

                                let bgColor = '#18181b';
                                try {
                                    if (art.part_colors) {
                                        const colors = JSON.parse(art.part_colors);
                                        const firstColor = Object.values(colors).find(c => typeof c === 'string' && c.startsWith('#'));
                                        if (firstColor) bgColor = firstColor as string;
                                    }
                                } catch(e) {}

                                const bgUrl = art.local_bg_url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop';

                                let overlayUrl = '';
                                try {
                                    if (art.images) {
                                        const imgs = JSON.parse(art.images);
                                        if (imgs && imgs.length > 0) {
                                            overlayUrl = imgs[0].url;
                                        }
                                    }
                                } catch(e) {}

                                return (
                                    <div key={art.id} className="w-[180px] shrink-0 bg-[#121215]/50 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-zinc-800 transition text-center">
                                        {/* Thumbnail Miniature Preview - Square Container matching Collar preview size */}
                                        <div 
                                            className="w-20 h-20 bg-zinc-950/70 border border-white/10 rounded-xl relative overflow-hidden flex items-center justify-center shrink-0"
                                        >
                                            {art.preview_url ? (
                                                <img 
                                                    src={art.preview_url} 
                                                    alt="Preview da Arte" 
                                                    className="absolute inset-0 w-full h-full object-contain p-1 animate-fade-in" 
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center relative w-full h-full" style={{ backgroundColor: bgColor }}>
                                                    <img 
                                                        src={bgUrl} 
                                                        alt="base" 
                                                        className="absolute inset-0 w-full h-full object-contain opacity-75 mix-blend-multiply p-1" 
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    {overlayUrl && (
                                                        <img 
                                                            src={overlayUrl} 
                                                            alt="logo" 
                                                            className="absolute max-w-[70%] max-h-[70%] object-contain z-10 filter drop-shadow-md" 
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0 w-full">
                                            <p className="text-white font-semibold truncate text-[12px] px-1" title={art.name}>{art.name}</p>
                                            <p className="text-[10px] text-zinc-500">Salvo: {dateStr}</p>
                                        </div>

                                        {/* Actions below preview & info */}
                                        <div className="flex gap-2 w-full mt-auto">
                                            <Link 
                                                to={`/layout-builder?saved_id=${art.id}`}
                                                className="flex-1 text-center text-[11px] font-bold bg-[#a855f7] text-white rounded-lg py-2 transition hover:bg-[#9333ea] flex items-center justify-center gap-1"
                                            >
                                                <Eye size={12} />
                                                <span>Visualizar Arte</span>
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSavedArt(art.id)}
                                                className="p-2 rounded-lg bg-zinc-950 border border-white/5 hover:bg-red-950/45 hover:text-red-400 text-zinc-400 hover:border-red-500/20 transition flex items-center justify-center"
                                                title="Excluir"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Botão Lista Pública */}
                <div className="w-full space-y-4">
                  <button 
                      onClick={() => setIsExpandedPublicList(!isExpandedPublicList)}
                      className={`w-full h-32 bg-[#121215] hover:bg-[#18181b] border ${isExpandedPublicList ? 'border-emerald-500/30' : 'border-white/5'} hover:border-white/10 rounded-3xl flex items-center justify-between px-8 transition-all group hover:scale-[1.01]`}
                  >
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                              <ListChecks size={32} />
                          </div>
                          <div className="text-left">
                              <h3 className="text-xl font-bold text-white">Lista Pública</h3>
                              <p className="text-zinc-500 text-sm">
                                {publicList ? `${editedPublicListItems.reduce((acc, item) => acc + (item.isSimple ? (item.quantity || 1) : 1), 0)} itens integrados` : "Envie sua lista para impressão"}
                              </p>
                          </div>
                      </div>
                      <ChevronRight className={`text-zinc-600 group-hover:text-white transition-all ${isExpandedPublicList ? 'rotate-90' : ''}`} size={24} />
                  </button>

                  {isExpandedPublicList && (
                    <div className="w-full bg-[#121215]/80 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
                      {isLoadingPublicList ? (
                        <div className="py-10 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="animate-spin text-primary" size={24} />
                          <span className="text-xs uppercase tracking-wider text-zinc-500">Buscando informações da lista...</span>
                        </div>
                      ) : (
                        <>
                          {/* Se nenhuma lista estiver ativa, mostrar Gerenciador de Listas */}
                          {!publicList ? (
                            <div className="space-y-6">
                              {/* Form de Criação */}
                              <form onSubmit={handleCreatePublicList} className="space-y-3">
                                <h4 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">Criar Nova Lista Pública</h4>
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="Digite o nome da lista (ex: Uniformes Time A, Escola Primária...)" 
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    className="flex-1 bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-primary focus:outline-none font-bold"
                                  />
                                  <button 
                                    type="submit"
                                    className="px-6 bg-primary text-black hover:bg-amber-400 font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition whitespace-nowrap"
                                  >
                                    <Plus size={14} />
                                    Criar Lista
                                  </button>
                                </div>
                              </form>

                              {/* Listagem das Listas */}
                              <div className="space-y-3">
                                <h4 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">Suas Listas Criadas</h4>
                                {publicLists.length === 0 ? (
                                  <div className="py-10 text-center bg-zinc-950 border border-white/5 rounded-2xl text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                                    Nenhuma lista criada ainda. Digite um nome acima para começar!
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {publicLists.map((list) => {
                                      const itemsCount = typeof list.items === 'string' ? JSON.parse(list.items).length : (list.items?.length || 0);
                                      return (
                                        <div key={list.id} className="p-4 bg-zinc-950 border border-white/5 hover:border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
                                          <div>
                                            <h5 className="text-sm font-bold text-white font-mono uppercase tracking-wide">{list.title}</h5>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                                              {itemsCount} integrantes cadastrados
                                            </p>
                                          </div>
                                          <div className="flex gap-2 self-end sm:self-auto">
                                            <button 
                                              onClick={() => {
                                                setPublicList(list);
                                                const parsed = typeof list.items === 'string' ? JSON.parse(list.items) : list.items;
                                                setEditedPublicListItems(parsed || []);
                                                 setOriginalSnapshotPublicListItems(parsed ? JSON.parse(JSON.stringify(parsed)) : []);
                                                setIsEditingPublicList(false);
                                              }}
                                              className="px-4 py-2 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                                            >
                                              <Eye size={12} /> Ver / Editar
                                            </button>
                                            <button 
                                              onClick={() => handleDeletePublicList(list.id)}
                                              className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition"
                                              title="Excluir Lista"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Painel de Exibição / Edição de Lista Específica Selecionada */
                            <div className="space-y-6">
                              <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-2xl border border-white/5">
                                <button 
                                  onClick={() => setPublicList(null)}
                                  className="px-3 py-1.5 bg-zinc-90 w-auto bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition shrink-0"
                                >
                                  <ArrowLeft size={12} /> Voltar para Minhas Listas
                                </button>
                                
                                {isRenamingList ? (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <input
                                      type="text"
                                      value={newListNameInputValue}
                                      onChange={(e) => setNewListNameInputValue(e.target.value)}
                                      className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:border-primary focus:outline-none font-bold w-28 sm:w-44"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSaveListName}
                                      disabled={isSavingPublicList}
                                      className="p-1 px-2.5 bg-emerald-500 text-black hover:bg-emerald-400 font-extrabold rounded-lg text-[10px] uppercase transition whitespace-nowrap"
                                    >
                                      Salvar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIsRenamingList(false)}
                                      className="p-1 px-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[10px] uppercase transition whitespace-nowrap"
                                    >
                                      Sair
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[10px] font-black text-primary uppercase font-mono tracking-widest bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 truncate" title={publicList.title}>
                                      {publicList.title}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setNewListNameInputValue(publicList.title);
                                        setIsRenamingList(true);
                                      }}
                                      type="button"
                                      className="p-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-white/5 rounded-lg transition shrink-0"
                                      title="Alterar Nome da Lista"
                                    >
                                      <Edit size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Compartilhamento */}
                              <div className="space-y-2">
                                <h4 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">Link de Compartilhamento</h4>
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    readOnly 
                                    value={`${window.location.origin}/lista-publica/${publicList.id}`} 
                                    className="flex-1 bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-zinc-300 font-mono focus:outline-none"
                                  />
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${window.location.origin}/lista-publica/${publicList.id}`);
                                      setCopiedLink(true);
                                      setTimeout(() => setCopiedLink(false), 2000);
                                    }}
                                    className="px-4 bg-primary text-black hover:bg-amber-400 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition whitespace-nowrap"
                                  >
                                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                                    {copiedLink ? "Copiado" : "Copiar"}
                                  </button>
                                </div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                                  Compartilhe este link com quem irá preencher as camisas/tamanhos desta lista pública.
                                </p>
                              </div>

                              {/* Travar Lista */}
                              <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <h4 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400 font-mono flex items-center gap-1.5">
                                    <Lock size={12} className={publicList.is_locked === 1 ? "text-red-400" : "text-zinc-500"} /> Status da Lista (Produção)
                                  </h4>
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                                    {publicList.is_locked === 1 ? 'Esta lista está TRAVADA para novos integrantes.' : 'Esta lista está ABERTA para novos integrantes.'}
                                  </p>
                                </div>
                                <button 
                                  onClick={handleToggleLockList}
                                  disabled={isSavingPublicList}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition flex items-center gap-2 whitespace-nowrap self-start sm:self-auto ${
                                    publicList.is_locked === 1 
                                      ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' 
                                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {publicList.is_locked === 1 ? <ToggleRight size={18} className="text-red-400" /> : <ToggleLeft size={18} className="text-emerald-400" />}
                                  {publicList.is_locked === 1 ? 'Lista Travada' : 'Travar Lista'}
                                </button>
                              </div>

                              {/* Lista e Controles */}
                              {!isEditingPublicList ? (
                                <div className="space-y-4">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div>
                                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400 font-mono">{publicList.title} - Itens Atuais</h4>
                                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                                        Total de Integrantes: <span className="text-white font-bold">{editedPublicListItems.reduce((acc, item) => acc + (item.isSimple ? (item.quantity || 1) : 1), 0)}</span>
                                      </p>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                      <button 
                                        onClick={() => {
                                          setEditedPublicListItems(publicList?.items ? (typeof publicList.items === 'string' ? JSON.parse(publicList.items) : publicList.items) : []);
                                           const parsedPublicInit = publicList?.items ? (typeof publicList.items === 'string' ? JSON.parse(publicList.items) : publicList.items) : [];
                                           setOriginalSnapshotPublicListItems(JSON.parse(JSON.stringify(parsedPublicInit)));
                                          setIsEditingPublicList(true);
                                        }}
                                        className="flex-1 sm:flex-initial px-4 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                                      >
                                        <Edit size={12} /> Ver / Editar
                                      </button>
                                      <button 
                                        onClick={handlePrintPublicList}
                                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 rounded-xl text-xs flex items-center justify-center transition"
                                        title="Imprimir"
                                      >
                                        <Printer size={14} />
                                      </button>
                                      <button 
                                        onClick={handleDownloadPublicListPDF}
                                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 hover:text-white text-zinc-300 rounded-xl text-xs flex items-center justify-center transition"
                                        title="Baixar em PDF"
                                      >
                                        <Download size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {editedPublicListItems.length === 0 ? (
                                    <div className="py-8 text-center bg-zinc-950 border border-white/5 rounded-2xl text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                                      Lista vazia. Clique em "Ver / Editar" para adicionar integrantes a esta lista.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-zinc-950 max-h-60 custom-scrollbar">
                                      <table className="w-full text-left border-collapse">
                                        <thead>
                                          <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest text-zinc-500 font-bold bg-zinc-900/60 font-mono">
                                            <th className="p-3">Categoria</th>
                                            <th className="p-3">Tamanho</th>
                                            <th className="p-3">Qtd</th>
                                            <th className="p-3">Nº Camisa</th>
                                            <th className="p-3">Nome Camisa</th>
                                            <th className="p-3">Short / Calção</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-xs text-zinc-300 font-mono">
                                          {editedPublicListItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-white/[0.02] transition">
                                              <td className="p-3 uppercase">{item.category}</td>
                                              <td className="p-3 font-semibold text-white">{item.size}</td>
                                              <td className="p-3">{item.isSimple ? (item.quantity || 1) : 1}</td>
                                              <td className="p-3">{item.isSimple ? "-" : (item.number || "-")}</td>
                                              <td className="p-3 uppercase">{item.isSimple ? "-" : (item.name || "-")}</td>
                                              <td className="p-3">
                                                {item.isConjunto ? (
                                                  <span className="text-primary font-bold">
                                                    {item.shortSize || 'M'}{item.isSimple ? '' : ` (${item.shortNumber || item.number || '00'})`}
                                                  </span>
                                                ) : '-'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* Painel de Edição Completa da Lista Pública */
                                <div className="space-y-4 bg-zinc-950 p-4 md:p-6 rounded-2xl border border-white/5">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div>
                                      <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Edição da Lista Pública</h4>
                                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">Permissão Exclusiva de Criador</p>
                                    </div>
                                    <button 
                                      onClick={toggleListSimpleMode} 
                                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition ${isListSimpleMode ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-white/5 text-zinc-400'}`}
                                    >
                                      <span>Grade Sem Nomes</span>
                                      {isListSimpleMode ? <ToggleRight size={16} className="text-primary" /> : <ToggleLeft size={16} />}
                                    </button>
                                  </div>

                                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                                    {editedPublicListItems.map((item) => (
                                      <div key={item.id} className="space-y-2 p-3 bg-[#121215] border border-white/10 rounded-xl">
                                        <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Integrante</span>
                                          <div className="flex gap-2">
                                            <button 
                                              onClick={() => updatePublicListRow(item.id, 'isConjunto', !item.isConjunto)}
                                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all flex items-center gap-1 ${item.isConjunto ? 'bg-primary text-black' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                              {item.isConjunto ? 'Com Short (Sim)' : 'Adicionar Short?'}
                                            </button>
                                            <button 
                                              onClick={() => removePublicListRow(item.id)} 
                                              className="text-zinc-500 hover:text-red-500 transition"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                          <div className={item.isConjunto && !item.isSimple ? "sm:col-span-2" : "sm:col-span-3"}>
                                            <select 
                                              value={item.category} 
                                              onChange={(e) => updatePublicListRow(item.id, 'category', e.target.value as any)} 
                                              className="w-full bg-[#121215] border border-white/10 rounded-lg text-xs text-white p-1.5 outline-none font-bold"
                                            >
                                              <option value="unisex">Unisex</option>
                                              <option value="feminina">Feminina</option>
                                              <option value="infantil">Infantil</option>
                                            </select>
                                          </div>
                                          <div className="sm:col-span-2">
                                            <select 
                                              value={item.size} 
                                              onChange={(e) => updatePublicListRow(item.id, 'size', e.target.value)} 
                                              className="w-full bg-[#121215] border border-white/10 rounded-lg text-xs text-white p-1.5 outline-none font-bold align-middle"
                                            >
                                              {listSizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                          </div>

                                          {item.isSimple ? (
                                            <div className={item.isConjunto ? "sm:col-span-4" : "sm:col-span-7"}>
                                              <input 
                                                type="number" 
                                                min="1" 
                                                value={item.quantity || 1} 
                                                onChange={(e) => updatePublicListRow(item.id, 'quantity', parseInt(e.target.value) || 1)} 
                                                className="w-full bg-[#121215] border border-white/10 rounded-lg p-1.5 text-xs text-white text-center font-bold font-mono" 
                                              />
                                            </div>
                                          ) : (
                                            <>
                                              <div className={item.isConjunto ? "sm:col-span-1" : "sm:col-span-2"}>
                                                <input 
                                                  type="text" 
                                                  placeholder="Nº"
                                                  value={item.number || ''} 
                                                  onChange={(e) => {
                                                    updatePublicListRow(item.id, 'number', e.target.value);
                                                    if (item.isConjunto) {
                                                      updatePublicListRow(item.id, 'shortNumber', e.target.value);
                                                    }
                                                  }} 
                                                  className="w-full bg-[#121215] border border-white/10 rounded-lg p-1.5 text-xs text-white font-bold text-center placeholder:text-zinc-700 px-1" 
                                                />
                                              </div>
                                              <div className={item.isConjunto ? "sm:col-span-3" : "sm:col-span-5"}>
                                                <input 
                                                  type="text" 
                                                  placeholder="Nome"
                                                  value={item.name || ''} 
                                                  onChange={(e) => updatePublicListRow(item.id, 'name', e.target.value)} 
                                                  className="w-full bg-[#121215] border border-white/10 rounded-lg p-1.5 text-xs text-white uppercase font-bold placeholder:text-zinc-700" 
                                                />
                                              </div>
                                            </>
                                          )}

                                          {item.isConjunto && (
                                            <>
                                              <div className={item.isSimple ? "sm:col-span-3" : "sm:col-span-2"}>
                                                <select 
                                                  value={item.shortSize || listSizes[item.category][2]} 
                                                  onChange={(e) => updatePublicListRow(item.id, 'shortSize', e.target.value)} 
                                                  className="w-full bg-[#121215] border border-primary/30 rounded-lg text-xs text-white p-1.5 outline-none font-bold"
                                                >
                                                  {listSizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                              </div>
                                              {!item.isSimple && (
                                                <div className="sm:col-span-2">
                                                  <input 
                                                    type="text" 
                                                    placeholder="Nº Sh"
                                                    value={item.shortNumber || item.number || ''} 
                                                    onChange={(e) => updatePublicListRow(item.id, 'shortNumber', e.target.value)} 
                                                    className="w-full bg-[#121215] border border-primary/30 rounded-lg p-1.5 text-xs text-white text-center font-bold" 
                                                  />
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))}

                                    <button 
                                      onClick={addPublicListRow} 
                                      className="w-full py-2.5 border border-dashed border-white/10 hover:border-primary text-zinc-500 hover:text-primary rounded-xl text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-1.5 transition"
                                    >
                                      <Plus size={12} /> Adicionar Integrante
                                    </button>
                                  </div>

                                  <div className="pt-4 border-t border-white/5 flex gap-2">
                                    <button 
                                      onClick={() => setIsEditingPublicList(false)}
                                      className="flex-1 py-2 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-xl text-xs font-bold uppercase tracking-wider transition"
                                    >
                                      Cancelar
                                    </button>
                                    <button 
                                      onClick={handleSavePublicListFromProfile}
                                      disabled={isSavingPublicList}
                                      className="flex-1 py-2 bg-primary text-black hover:bg-amber-400 font-extrabold rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                      {isSavingPublicList ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                      {isSavingPublicList ? "Salvando..." : "Salvar Alterações"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Financeiro */}
                <div className={`w-full p-6 rounded-3xl border flex items-start gap-4 ${hasOverdue ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                    <div className={`p-3 rounded-full mt-0.5 ${hasOverdue ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {hasOverdue ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                    </div>
                    <div className="flex-1">
                        <h3 className={`text-lg font-bold ${hasOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
                            {hasOverdue ? 'Faturas em Aberto' : 'Você está em dia!'}
                        </h3>
                        <p className={`text-sm ${hasOverdue ? 'text-red-400/70' : 'text-emerald-400/70'}`}>
                            {hasOverdue 
                                ? 'Existem pendências financeiras em sua conta.' 
                                : 'Parabéns, não constam pendências financeiras.'}
                        </p>
                        <div className="mt-3">
                            <Link 
                                id="btn-my-orders" 
                                to="/my-orders" 
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    hasOverdue 
                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30' 
                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30'
                                }`}
                            >
                                <Package size={14} />
                                {hasOverdue ? 'Ver Meus Pedidos e Pendências' : 'Meus Pedidos'}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Seção Meus Cupons */}
                <div className="w-full bg-[#121215] border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#ff8100]/10 text-primary rounded-xl">
                            <Ticket size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Meus Cupons</h3>
                            <p className="text-zinc-500 text-xs">Cupons fidelidade e ofertas personalizadas</p>
                        </div>
                    </div>

                    {/* Resgatar Cupom */}
                    <form onSubmit={handleClaimCoupon} className="space-y-2 pt-2 border-t border-white/5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block">Adicionar Código à Lista</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="DIGITE O CÓDIGO DO CUPOM"
                                className="flex-1 bg-black/50 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:border-primary outline-none transition uppercase tracking-wider placeholder:text-zinc-700"
                                value={newCouponCode}
                                onChange={(e) => setNewCouponCode(e.target.value)}
                            />
                            <button 
                                type="submit" 
                                disabled={isClaiming || !newCouponCode.trim()}
                                className="bg-primary hover:bg-amber-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1"
                            >
                                {isClaiming ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Adicionar
                            </button>
                        </div>
                        {claimError && <p className="text-red-500 text-[10px] uppercase font-bold tracking-widest mt-1">{claimError}</p>}
                        {claimSuccess && <p className="text-emerald-500 text-[10px] uppercase font-bold tracking-widest mt-1">{claimSuccess}</p>}
                    </form>

                    {/* Lista de Cupons */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block">Meus Cupons Salvos</label>
                        {isLoadingCoupons ? (
                            <div className="flex items-center justify-center py-4 text-zinc-500 gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-xs">Carregando seus cupons...</span>
                            </div>
                        ) : clientCoupons.length === 0 ? (
                            <div className="text-center py-6 bg-black/25 rounded-2xl border border-dashed border-zinc-800/80">
                                <Tag size={18} className="text-zinc-700 mx-auto mb-1.5 opacity-40" />
                                <p className="text-xs text-zinc-500">Nenhum cupom ativo na sua conta.</p>
                            </div>
                        ) : (
                            <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                {clientCoupons.map((c) => {
                                    const nowMs = Date.now();
                                    const expiresMs = new Date(c.expires_at).getTime();
                                    const isExpired = expiresMs <= nowMs;
                                    const isUsed = c.is_used === 1;
                                    const isInactive = isExpired || isUsed;

                                    return (
                                        <div 
                                            key={c.id} 
                                            className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                                                isInactive 
                                                    ? 'bg-zinc-950/20 border-zinc-900/60 opacity-60' 
                                                    : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/80'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${isInactive ? 'bg-zinc-950 text-zinc-600' : 'bg-[#ff8100]/10 text-primary'}`}>
                                                    <Percent size={14} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-mono font-bold text-xs uppercase ${isInactive ? 'text-zinc-500 line-through' : 'text-white'}`}>{c.code}</span>
                                                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold ${
                                                            isUsed 
                                                                ? 'bg-red-500/10 text-red-100 border border-red-500/20' 
                                                                : isExpired 
                                                                    ? 'bg-zinc-800 text-zinc-500' 
                                                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        }`}>
                                                            {isUsed ? 'Usado' : isExpired ? 'Expirou' : `${c.percentage}% OFF`}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                                                        <Clock size={10} /> Validade: {new Date(c.expires_at).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {role === 'client' && (
                    <button 
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="w-full h-14 bg-red-900/10 hover:bg-red-900/30 border border-red-500/20 hover:border-red-500/50 text-red-500 rounded-3xl flex items-center justify-center gap-2 font-bold transition-all mt-4"
                    >
                        <Trash2 size={20} /> Excluir Cadastro
                    </button>
                )}
            </div>
        </div>

        {isDeleteModalOpen && (
            <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative animate-scale-in">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e]">
                        <h2 className="text-lg font-bold text-red-500 flex items-center gap-2"><Trash2 size={18} /> Excluir Cadastro</h2>
                        <button onClick={() => setIsDeleteModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-6">
                        {allPayableOrders.length > 0 ? (
                            <div className="text-center space-y-4">
                                <AlertTriangle size={48} className="text-amber-500 mx-auto" />
                                <h3 className="text-xl font-bold text-white">Existem pendências!</h3>
                                <p className="text-zinc-400 text-sm">Para excluir seu cadastro, quite suas contas em aberto primeiro.</p>
                                <p className="text-white font-bold text-lg border border-white/10 py-3 rounded-xl bg-white/5">
                                    Total em aberto: R$ {allPayableOrders.reduce((acc, o) => acc + Number(o.total || 0), 0).toFixed(2).replace('.', ',')}
                                </p>
                                <button 
                                    onClick={() => {
                                        const amountToPay = allPayableOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
                                        executePayment(allPayableOrders.map(o => o.id), amountToPay, 'Quitação para Exclusão de Cadastro');
                                    }}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                                >
                                    <DollarSign size={18} /> Pagar tudo
                                </button>
                            </div>
                        ) : (
                            <div className="text-center space-y-4">
                                <Trash2 size={48} className="text-red-500 mx-auto" />
                                <h3 className="text-xl font-bold text-white">Tem certeza?</h3>
                                <p className="text-zinc-400 text-sm">Esta ação é irreversível. Todos os seus dados, histórico e configurações serão permanentemente removidos.</p>
                                <button 
                                    onClick={handleConfirmDeleteAccount}
                                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} /> Sim, Excluir Cadastro
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Troca de Senha */}
        {isPasswordModalOpen && (
            <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative animate-scale-in">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e]">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Lock size={18} className="text-primary" /> Trocar Senha</h2>
                        <button onClick={() => setIsPasswordModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-6">
                        {verificationStep === 'request' && (
                            <div className="text-center space-y-4">
                                <p className="text-zinc-400 text-sm">Para sua segurança, enviaremos um código de verificação para seu email cadastrado: <span className="text-white font-bold">{customer?.email}</span></p>
                                <button onClick={() => handleSendCode('password')} disabled={isLoadingSecurity} className="w-full py-3 bg-primary hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                                    {isLoadingSecurity ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
                                    Enviar Código
                                </button>
                            </div>
                        )}

                        {verificationStep === 'verify' && (
                            <div className="space-y-4">
                                <p className="text-zinc-400 text-sm text-center">Digite o código de 4 dígitos enviado para seu email.</p>
                                <input 
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    placeholder="0000"
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white text-center font-mono text-xl tracking-[0.5em] focus:border-primary outline-none transition"
                                    maxLength={4}
                                />
                                <button onClick={() => handleVerifyCode('password')} disabled={isLoadingSecurity} className="w-full py-3 bg-primary hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                                    {isLoadingSecurity ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                    Verificar Código
                                </button>
                            </div>
                        )}

                        {verificationStep === 'update' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nova Senha</label>
                                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" placeholder="******" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Confirmar Nova Senha</label>
                                    <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" placeholder="******" />
                                </div>
                                <button onClick={handleUpdatePassword} disabled={isLoadingSecurity} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                                    {isLoadingSecurity ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                    Salvar Nova Senha
                                </button>
                            </div>
                        )}

                        {securityError && <div className="text-red-500 text-center text-xs font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">{securityError}</div>}
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Troca de Email */}
        {isEmailModalOpen && (
            <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative animate-scale-in">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e]">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Mail size={18} className="text-primary" /> Trocar Email</h2>
                        <button onClick={() => setIsEmailModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-6">
                        {verificationStep === 'request' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Novo Email</label>
                                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" placeholder="novo@email.com" />
                                </div>
                                <button onClick={() => handleSendCode('email')} disabled={isLoadingSecurity || !newEmail} className="w-full py-3 bg-primary hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                                    {isLoadingSecurity ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
                                    Enviar Código de Verificação
                                </button>
                                <p className="text-zinc-500 text-xs text-center">Enviaremos um código para o <strong>novo email</strong> informado.</p>
                            </div>
                        )}

                        {verificationStep === 'verify' && (
                            <div className="space-y-4">
                                <p className="text-zinc-400 text-sm text-center">Digite o código enviado para <span className="text-white font-bold">{newEmail}</span></p>
                                <input 
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    placeholder="0000"
                                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white text-center font-mono text-xl tracking-[0.5em] focus:border-primary outline-none transition"
                                    maxLength={4}
                                />
                                <button onClick={() => handleVerifyCode('email')} disabled={isLoadingSecurity} className="w-full py-3 bg-primary hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                                    {isLoadingSecurity ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                    Verificar e Atualizar
                                </button>
                            </div>
                        )}

                        {/* No step 'update' needed for email, verification confirms update */}

                        {securityError && <div className="text-red-500 text-center text-xs font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">{securityError}</div>}
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Gerar Novo Pedido */}
        {showNewOrderModal && (
            <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-[#121215] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl relative animate-scale-in">
                    {/* Modal Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e] rounded-t-3xl">
                        <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={16} className="text-[#a855f7]" />
                            <span>Gerar Novo Pedido</span>
                        </h2>
                        <button 
                            onClick={() => {
                                setShowNewOrderModal(false);
                                setSelectedServiceInModal(null);
                                setSelectedListId('');
                                setSelectedLayoutId('');
                            }} 
                            className="text-zinc-500 hover:text-white transition"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 space-y-6">
                        {!selectedServiceInModal ? (
                            <div className="space-y-4">
                                <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Selecione o serviço para prosseguir:</p>
                                <button
                                    type="button"
                                    onClick={() => setSelectedServiceInModal('montagem_molde')}
                                    className="w-full p-4 bg-zinc-950 border border-white/5 rounded-2xl hover:border-[#a855f7]/40 text-left flex items-center justify-between transition group hover:bg-[#18181b]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-[#a855f7]/10 text-[#a855f7] rounded-xl group-hover:bg-[#a855f7] group-hover:text-black transition-colors">
                                            <Wrench size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Montagem de Molde</h4>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">Criar pedido utilizando suas artes ou listas salvas</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-all translate-x-0 group-hover:translate-x-1" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                    <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                                        <Wrench size={14} className="text-[#a855f7]" />
                                        <span>Montagem de Molde</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectedServiceInModal(null)} 
                                        className="text-[10px] text-zinc-500 hover:text-[#a855f7] font-semibold transition uppercase tracking-wider"
                                    >
                                        Alterar Serviço
                                    </button>
                                </div>

                                {/* Duas caixas: Lists e Layouts */}
                                <div className="space-y-4">
                                    {/* Adicionar lista existente */}
                                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-3">
                                        <label className="text-[11px] uppercase font-bold tracking-widest text-zinc-400 block">
                                            Adicionar lista existente
                                        </label>
                                        {publicLists.length === 0 ? (
                                            <p className="text-zinc-600 text-xs">Ainda não possui nenhuma lista de tamanho/grades salva no seu perfil...</p>
                                        ) : (
                                            <select
                                                value={selectedListId}
                                                onChange={(e) => setSelectedListId(e.target.value)}
                                                className="w-full bg-[#121215] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#a855f7] focus:outline-none font-bold cursor-pointer"
                                            >
                                                <option value="">-- Selecione uma lista criada (opcional) --</option>
                                                {publicLists.map((l) => (
                                                    <option key={l.id} value={l.id}>{l.title}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Adicionar layout existente */}
                                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-3">
                                        <label className="text-[11px] uppercase font-bold tracking-widest text-zinc-400 block">
                                            Adicionar layout existente
                                        </label>
                                        {savedArts.length === 0 ? (
                                            <p className="text-zinc-600 text-xs">Ainda não possui nenhuma arte/layout 2D salva no seu perfil...</p>
                                        ) : (
                                            <select
                                                value={selectedLayoutId}
                                                onChange={(e) => setSelectedLayoutId(e.target.value)}
                                                className="w-full bg-[#121215] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#a855f7] focus:outline-none font-bold cursor-pointer"
                                            >
                                                <option value="">-- Selecione uma arte criada (opcional) --</option>
                                                {savedArts.map((art) => (
                                                    <option key={art.id} value={art.id}>{art.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Botão Prosseguir */}
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={handleProceedToMontagemMolde}
                                        className="w-full py-3.5 bg-gradient-to-r from-[#a855f7] to-[#8b5cf6] hover:from-[#9333ea] hover:to-[#7c3aed] text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg transition-all"
                                    >
                                        Prosseguir para Montagem
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Edição (Reaproveitado) */}
        {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e]">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit size={20} className="text-primary" /> Editar Dados</h2>
                        <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nome Completo</label>
                                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Telefone</label>
                                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">CPF / CNPJ (Somente Leitura)</label>
                                <input value={formData.cpf} disabled className="w-full bg-black/20 border border-zinc-800/50 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Endereço</label>
                                <div className="grid grid-cols-3 gap-4">
                                    <input placeholder="Rua" value={formData.address?.street} onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})} className="col-span-2 w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" />
                                    <input placeholder="Número" value={formData.address?.number} onChange={e => setFormData({...formData, address: {...formData.address, number: e.target.value}})} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" />
                                    <input placeholder="CEP" value={formData.address?.zipCode} onChange={e => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})} className="col-span-3 w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 text-zinc-400 hover:text-white font-bold transition">Cancelar</button>
                            <button type="submit" className="px-6 py-3 bg-primary hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg transition active:scale-95">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    );
  };

  if (role === 'client') {
    return renderClientView();
  }

  return (
    <div 
      className="space-y-8 pb-24 relative animate-fade-in-up"
      onAnimationEnd={(e) => {
        (e.currentTarget as HTMLElement).classList.remove('animate-fade-in-up');
      }}
    >
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div className="flex items-center gap-4">
                <Link to={role === 'admin' ? "/customers" : "/"} className="p-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight font-heading leading-none">{customer.name}</h1>
                        {customer.isSubscriber && (
                            <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={10} /> Assinante
                            </span>
                        )}
                    </div>
                    <div className="mt-2">
                        <span className="bg-white/5 border border-white/5 px-2 py-1 rounded text-[10px] text-zinc-500 font-mono uppercase tracking-widest">ID: {customer.id.slice(0, 8)}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
                {selectedOrderIds.length > 0 ? (
                    <button 
                        onClick={() => initiatePaymentFlow(selectedOrderIds)}
                        disabled={isBatchProcessing}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <ListChecks size={18} />}
                        <span>Pagar Selecionados (R$ {selectedTotal.toFixed(2)})</span>
                    </button>
                ) : (
                    totalPayableValue > 0 && (
                        <button 
                            onClick={() => initiatePaymentFlow(allPayableOrders.map(o => o.id))}
                            disabled={isBatchProcessing}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <ListChecks size={18} />}
                            <span>Pagar Tudo (R$ {totalPayableValue.toFixed(2)})</span>
                        </button>
                    )
                )}

                {cloudUrl && (
                    isCloudLocked ? (
                        <button 
                            onClick={() => alert("O acesso à nuvem está bloqueado temporariamente devido a pendências financeiras. Por favor, regularize seus pedidos atrasados para liberar o acesso.")}
                            className="px-5 py-2.5 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-red-900/10 cursor-not-allowed opacity-90"
                        >
                            <Lock size={18} /> Nuvem
                        </button>
                    ) : (
                        <a href={cloudUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-[#1e1b4b] hover:bg-[#2e2a5b] border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-900/20">
                            <Cloud size={18} /> Nuvem
                        </a>
                    )
                )}

                {role === 'admin' && (
                    <>
                        <button onClick={handleOpenNewOrder} className="px-5 py-2.5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95"><Plus size={18} /> Novo Pedido</button>
                        <button onClick={openEditModal} className="px-5 py-2.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold"><Edit size={16} /> Editar</button>
                    </>
                )}
            </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500"><Clock size={20} /></div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Em Aberto</span>
                </div>
                <div>
                    <span className="text-zinc-500 text-lg font-medium mr-1">R$</span>
                    <span className="text-4xl font-black text-white tracking-tight">{Number(totalOpen).toFixed(2)}</span>
                </div>
            </div>

            <div className={`bg-[#0c0c0e] border p-6 rounded-2xl relative overflow-hidden group transition-colors ${totalOverdueValue > 0 ? 'border-red-500/30' : 'border-white/5'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg border ${totalOverdueValue > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50'}`}><AlertTriangle size={20} /></div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Vencido</span>
                </div>
                <div>
                    <span className="text-zinc-600 text-lg font-medium mr-1">R$</span>
                    <span className={`text-4xl font-black tracking-tight ${totalOverdueValue > 0 ? 'text-zinc-300' : 'text-zinc-700'}`}>{Number(totalOverdueValue).toFixed(2)}</span>
                </div>
                {role === 'admin' && totalOverdueValue > 0 && (
                    <button 
                        onClick={handleWhatsAppOverdue}
                        className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition"
                    >
                        <MessageCircle size={14} /> COBRAR VIA WHATSAPP
                    </button>
                )}
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500"><CheckCircle size={20} /></div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Pago</span>
                </div>
                <div>
                    <span className="text-zinc-500 text-lg font-medium mr-1">R$</span>
                    <span className={`text-4xl font-black tracking-tight ${totalPaid > 0 ? 'text-emerald-400' : 'text-zinc-700'}`}>{Number(totalPaid).toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* Info & Credit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-1">Informações de Contato</h3>
                <div className="bg-[#121215] border border-white/5 p-4 rounded-xl flex items-center gap-4 group hover:border-white/10 transition-colors">
                    <div className="bg-zinc-900 p-2.5 rounded-lg text-zinc-400 group-hover:text-white transition-colors"><Phone size={18} /></div>
                    <span className="text-zinc-300 font-mono text-sm">{customer.phone}</span>
                </div>
                <div className="bg-[#121215] border border-white/5 p-4 rounded-xl flex items-center gap-4 group hover:border-white/10 transition-colors">
                    <div className="bg-zinc-900 p-2.5 rounded-lg text-zinc-400 group-hover:text-white transition-colors"><Mail size={18} /></div>
                    <span className="text-zinc-300 font-mono text-sm truncate">{customer.email || 'Sem email'}</span>
                </div>
                <div className="bg-[#121215] border border-white/5 p-4 rounded-xl flex items-start gap-4 group hover:border-white/10 transition-colors">
                    <div className="bg-zinc-900 p-2.5 rounded-lg text-zinc-400 group-hover:text-white transition-colors"><MapPin size={18} /></div>
                    <span className="text-zinc-300 text-sm leading-relaxed">{customer.address?.street ? `${customer.address.street}, ${customer.address.number}` : 'Endereço não cadastrado'}</span>
                </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-[#121215] to-[#09090b] border border-white/5 rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                <div className="absolute right-0 top-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="text-primary" size={24} /><h2 className="text-xl font-bold text-white">Crédito Fidelidade</h2>
                        </div>
                        <p className="text-zinc-500 text-sm mb-4">Status da conta</p>
                        <button 
                            onClick={() => setIsPolicyModalOpen(true)}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 group"
                        >
                            <AlertTriangle size={14} className="group-hover:text-primary transition-colors" />
                            POLÍTICA DE FIDELIDADE
                        </button>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Disponível</p>
                        <p className="text-3xl font-bold text-emerald-500 font-mono">R$ {Number(availableCredit).toFixed(2)}</p>
                        {role === 'admin' && (
                            <button 
                                onClick={handleNoLimitWhatsApp}
                                className="mt-3 px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest flex items-center gap-2 group"
                            >
                                <MessageCircle size={14} className="group-hover:animate-bounce" />
                                SEM LIMITE
                            </button>
                        )}
                    </div>
                </div>
                <div className="relative z-10 mt-auto">
                    <div className="flex justify-between text-xs text-zinc-400 mb-3 font-mono tracking-wide"><span>Utilizado: R$ {Number(totalOpen).toFixed(2)}</span><span>Total: R$ {Number(creditLimit).toFixed(2)}</span></div>
                    <div className="w-full h-5 bg-zinc-900/50 rounded-full overflow-hidden border border-white/5 relative">
                        <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]"></div>
                        <div className="h-full bg-primary relative transition-all duration-1000 ease-out" style={{ width: `${usedPercentage}%` }}><div className="absolute top-0 right-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_white]"></div></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Tabs and Table */}
        <div className="bg-[#121215] border border-white/5 rounded-2xl overflow-hidden shadow-xl mt-4">
            <div className="flex flex-col sm:flex-row border-b border-white/5 bg-[#0c0c0e]">
                <button onClick={() => setActiveTab('open')} className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'open' ? 'text-primary bg-primary/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}>Abertos{_openOrders.length > 0 && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">{_openOrders.length}</span>}{activeTab === 'open' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary shadow-[0_-2px_10px_rgba(245,158,11,0.5)]"></div>}</button>
                <button onClick={() => setActiveTab('overdue')} className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'overdue' ? 'text-red-500 bg-red-500/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}>Atrasados{_overdueOrders.length > 0 && <span className="ml-2 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full">{_overdueOrders.length}</span>}{activeTab === 'overdue' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_-2px_10px_rgba(239,68,68,0.5)]"></div>}</button>
                <button onClick={() => setActiveTab('paid')} className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'paid' ? 'text-emerald-500 bg-emerald-500/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}>Pagos{_paidOrders.length > 0 && <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full">{_paidOrders.length}</span>}{activeTab === 'paid' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-500 shadow-[0_-2px_10px_rgba(16,185,129,0.5)]"></div>}</button>
            </div>

            <div className="overflow-x-auto pb-24">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="bg-white/[0.02] text-zinc-500 font-bold uppercase text-[10px] tracking-wider border-b border-white/5">
                        <tr>
                            <th className="px-4 md:px-6 py-4 w-10">{currentTabPayableOrders.length > 0 && <input type="checkbox" checked={isAllSelected} onChange={() => {}} onClick={handleSelectAll} className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer accent-primary" title="Selecionar todos os pedidos pagáveis desta lista" />}</th>
                            <th className="px-4 md:px-6 py-4">Pedido / Info</th>
                            <th className="px-6 py-4 hidden md:table-cell">Data</th>
                            <th className="px-6 py-4 hidden md:table-cell">Vencimento</th>
                            <th className="px-6 py-4 hidden md:table-cell">Status</th>
                            <th className="px-4 md:px-6 py-4 text-right">Valor / Venc..</th>
                            <th className="px-4 md:px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {displayedOrders.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-16 text-zinc-600"><div className="flex flex-col items-center gap-2"><Layers size={32} className="opacity-20" /><p>Nenhum pedido nesta categoria.</p></div></td></tr>
                        ) : (
                            displayedOrders.map(order => {
                                const isLate = order.status === 'open' && new Date(order.due_date) < new Date();
                                const isSelected = selectedOrderIds.includes(order.id);
                                return (
                                    <tr key={order.id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                                        <td className="px-4 md:px-6 py-4">{order.status === 'open' && <input type="checkbox" checked={isSelected} onChange={() => {}} onClick={(e) => toggleSelectOrder(order.id, e)} className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer accent-primary" />}</td>
                                        <td className="px-4 md:px-6 py-4">
                                            <div className="font-mono text-zinc-300 font-bold">#{order.formattedOrderNumber || order.order_number}</div>
                                            <div className="md:hidden mt-1.5">
                                                {renderStatusBadge(order.status, isLate)}
                                                {role === 'admin' && order.status === 'paid' && order.paid_at && (
                                                    <span className="text-[9px] text-zinc-500 ml-2 font-mono">
                                                       {new Date(order.paid_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-zinc-600 max-w-[200px] truncate font-sans mt-1">{order.description || "Sem descrição"}</div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td className={`px-6 py-4 hidden md:table-cell ${isLate ? 'text-red-400 font-bold' : ''}`}>{new Date(order.due_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            {renderStatusBadge(order.status, isLate)}
                                            {role === 'admin' && order.status === 'paid' && order.paid_at && (
                                                <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                                                    Pg: {new Date(order.paid_at).toLocaleDateString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 md:px-6 py-4 text-right"><div className="font-mono font-bold text-white text-sm md:text-base">R$ {Number(order.total || 0).toFixed(2)}</div><div className={`md:hidden text-[10px] mt-1 font-medium ${isLate ? 'text-red-400' : 'text-zinc-500'}`}>Vence: {new Date(order.due_date).toLocaleDateString().slice(0,5)}</div></td>
                                        <td className="px-4 md:px-6 py-4 text-center">
                                            <div className="flex items-center justify-end md:justify-center gap-2">
                                                {order.status === 'open' ? (
                                                    <button onClick={() => initiatePaymentFlow([order.id])} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg transition font-bold inline-flex items-center gap-1 shadow-lg shadow-emerald-600/20" title="Pagar agora"><DollarSign size={12} /> <span className="hidden md:inline">Pagar</span></button>
                                                ) : <span className="hidden md:inline text-xs text-zinc-700 italic">Concluído</span>}
                                                <button onClick={() => fetchAndSetViewingOrder(order)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition border border-transparent hover:border-zinc-700" title="Ver Detalhes"><Eye size={16} /></button>
                                                {role === 'admin' && <button onClick={() => handleDeleteOrder(order.id)} className="hidden md:block p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition ml-1" title="Excluir Pedido"><Trash2 size={16} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL FLUTUANTE DE PAGAMENTO (RESTAURADO) */}
        {selectedOrderIds.length > 0 && !isBatchProcessing && (
            <div 
                className="absolute z-30 transition-all duration-300 animate-fade-in"
                style={{ 
                    top: Math.min(Math.max(floatingY - 150, 0), 1000) + 'px', 
                    right: '10px'
                }}
            >
                <div className="bg-[#121215] border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col gap-3 backdrop-blur-md w-48">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-1">
                        {selectedOrderIds.length} Selecionados
                    </div>
                    <div className="text-xl font-bold text-white font-mono mb-1">
                        R$ {selectedTotal.toFixed(2)}
                    </div>
                    <button 
                        onClick={() => initiatePaymentFlow(selectedOrderIds)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition"
                    >
                        <DollarSign size={14} /> PAGAR AGORA
                    </button>
                </div>
            </div>
        )}

        {/* MODAL SELEÇÃO DE VALOR (TOTAL VS PARCIAL) */}
        {isValueModalOpen && pendingPaymentData && (
             <div className="fixed inset-0 z-[120] flex justify-center items-start pt-12 md:pt-24 bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                <div className="bg-[#121215] border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-scale-in">
                    <div className="p-6 border-b border-zinc-800 bg-[#0c0c0e] text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <Coins size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Escolha o Valor</h2>
                        <p className="text-zinc-500 text-xs mt-1">O total do pedido é R$ {pendingPaymentData.total.toFixed(2)}</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setPaymentType('total')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentType === 'total' ? 'border-primary bg-primary/10 text-white' : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700'}`}
                            >
                                <span className="text-xs font-bold uppercase tracking-widest mb-1">Total</span>
                                <span className="text-sm font-mono">100%</span>
                            </button>
                            <button 
                                onClick={() => setPaymentType('partial')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentType === 'partial' ? 'border-primary bg-primary/10 text-white' : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700'}`}
                            >
                                <span className="text-xs font-bold uppercase tracking-widest mb-1">Entrada</span>
                                <span className="text-sm font-mono">Parte</span>
                            </button>
                        </div>

                        {paymentType === 'partial' && (
                            <div className="animate-fade-in space-y-2">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Quanto deseja pagar agora?</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                                    <input 
                                        type="text"
                                        className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white font-mono focus:border-primary outline-none text-lg"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[9px] text-zinc-600 italic">O saldo restante poderá ser pago posteriormente.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-zinc-950 flex gap-3">
                        <button onClick={() => setIsValueModalOpen(false)} className="flex-1 py-3 text-zinc-500 font-bold text-sm">Cancelar</button>
                        <button 
                            onClick={handleConfirmValueModal}
                            disabled={isBatchProcessing}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                            CONTINUAR
                        </button>
                    </div>
                </div>
             </div>
        )}

        {/* Order Details View */}
        {viewingOrder && (
            <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] animate-scale-in">
                    
                    <div className="p-6 border-b border-white/5 flex justify-between items-start bg-[#0c0c0e] rounded-t-2xl">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Package size={20} className="text-primary" /> Pedido #{viewingOrder.formattedOrderNumber || viewingOrder.order_number}</h2>
                            <p className="text-zinc-500 text-xs mt-1 max-h-12 overflow-hidden text-ellipsis line-clamp-3">
                                {viewingOrder.source === 'montagem_molde' ? 'Montagem de Molde' : (viewingOrder.description || "Sem descrição adicional")}
                            </p>
                        </div>
                        <button onClick={() => setViewingOrder(null)} className="text-zinc-500 hover:text-white hover:rotate-90 transition-transform"><X size={24} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5"><span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Data do Pedido</span><span className="text-white font-mono text-sm">{new Date(viewingOrder.order_date).toLocaleDateString()}</span></div>
                            <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5"><span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Vencimento</span><span className={`font-mono text-sm ${new Date(viewingOrder.due_date) < new Date() && viewingOrder.status === 'open' ? 'text-red-400 font-bold' : 'text-white'}`}>{new Date(viewingOrder.due_date).toLocaleDateString()}</span></div>
                        </div>
                        {viewingOrder.size_list && (
                            <div><h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ListChecks size={14} /> Lista de Produção</h3><div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">{(typeof viewingOrder.size_list === 'string' ? JSON.parse(viewingOrder.size_list) : viewingOrder.size_list).map((item: SizeListItem, idx: number) => (<div key={idx} className="bg-zinc-900/30 p-2 rounded border border-white/5 flex justify-between items-center text-xs"><span className="text-zinc-300 font-bold">{item.size} <span className="text-zinc-500 font-normal">({item.category})</span></span>{item.isSimple ? <span className="text-white bg-zinc-700 px-2 py-0.5 rounded font-mono">x{item.quantity}</span> : <span className="text-primary font-bold uppercase">{item.name || '-'} <span className="text-white font-mono">{item.number ? `#${item.number}` : ''}</span></span>}</div>))}</div></div>
                        )}
                        
                        {/* LISTA DE ITENS COM DOWNLOAD SE APLICÁVEL */}
                        {viewingOrder.items && viewingOrder.items.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Layers size={14} /> Itens do Pedido</h3>
                                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                    {viewingOrder.items.map((item: any, idx: number) => (
                                        <div key={idx} className="bg-zinc-900/30 p-3 rounded-xl border border-white/5 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-zinc-300 font-bold truncate flex-1">{item.name} (x{item.quantity})</span>
                                                {/* Botão de Download para Artes Pagas */}
                                                {item.type === 'art' && viewingOrder.status === 'paid' && item.downloadLink ? (
                                                    <a 
                                                        href={item.downloadLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="ml-2 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-1 font-bold text-[10px] transition"
                                                    >
                                                        <CloudDownload size={12} /> Baixar
                                                    </a>
                                                ) : (
                                                    <span className="text-white font-mono ml-2">R$ {Number(item.total).toFixed(2)}</span>
                                                )}
                                            </div>

                                            {/* Production Details for this item */}
                                            {(item.size_list || item.layout_option || item.mold_option || item.art_link || item.art_extras_desc || item.wants_digital_grid === 1) && (
                                                <div className="pl-4 border-l-2 border-primary/30 space-y-1.5 mt-2">
                                                    {item.wants_digital_grid === 1 && (
                                                        <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                            <Layers size={10} /> Grade Digital Solicitada
                                                        </div>
                                                    )}
                                                    
                                                    {item.size_list && (
                                                        <div className="space-y-1">
                                                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Lista de Produção:</p>
                                                            {(typeof item.size_list === 'string' ? JSON.parse(item.size_list) : item.size_list).map((li: any, lidx: number) => (
                                                                <div key={lidx} className="text-[10px] text-zinc-400 flex justify-between">
                                                                    <span>{li.size} ({li.category}) {li.name ? `- ${li.name}` : ''} {li.number ? `#${li.number}` : ''}</span>
                                                                    {li.quantity > 1 && <span className="text-zinc-500">x{li.quantity}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.layout_option && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${item.layout_option === 'sim' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>Layout: {item.layout_option === 'sim' ? 'OK' : 'Precisa'}</span>}
                                                        {item.mold_option && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${item.mold_option === 'sim' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>Molde: {item.mold_option === 'sim' ? 'OK' : 'Precisa'}</span>}
                                                    </div>
                                                    
                                                    {item.art_extras_desc && <p className="text-[10px] text-zinc-400 italic">"{item.art_extras_desc}"</p>}
                                                    
                                                    {item.art_link && (
                                                        <a href={item.art_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                                                            <Upload size={10} /> Ver Arquivos
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ListChecks size={14} /> Resumo Financeiro</h3>
                            <div className="space-y-2">
                                <div className="bg-zinc-900/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                    <span className="text-zinc-300 text-sm">Subtotal</span>
                                    <span className="text-white font-mono text-sm">R$ {Number((viewingOrder.total || 0) + (viewingOrder.discount || 0)).toFixed(2)}</span>
                                </div>
                                {viewingOrder.discount > 0 && (
                                    <div className="bg-zinc-900/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                        <span className="text-zinc-300 text-sm">Desconto</span>
                                        <span className="text-red-400 font-mono text-sm">- R$ {Number(viewingOrder.discount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 flex justify-between items-center">
                                    <span className="text-primary font-bold text-sm">Valor Final</span>
                                    <span className="text-primary font-mono font-bold text-sm">R$ {Number(viewingOrder.total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-white/5"><span className="text-sm text-zinc-400">Status Atual</span>{renderStatusBadge(viewingOrder.status, new Date(viewingOrder.due_date) < new Date())}</div>
                        
                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock size={14} /> Progresso da Produção
                            </h3>
                            <ProductionPath 
                                order={viewingOrder}
                            />
                        </div>
                        
                        {viewingOrder.source === 'montagem_molde' && (
                            <MontagemMoldeDetailsSection order={viewingOrder} />
                        )}
                    </div>

                    <div className="p-6 border-t border-white/5 bg-[#0c0c0e] rounded-b-2xl">
                        {role === 'admin' ? (
                            <div className="flex flex-col gap-3">
                                {viewingOrder.status === 'open' && (
                                    <div className="flex gap-3">
                                        <button onClick={() => handleManualPayment(viewingOrder.id)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 border border-zinc-700"><Check size={16} /> Marcar Pago</button>
                                        <button onClick={() => handleEditOrder(viewingOrder)} className="flex-1 py-3 bg-primary hover:bg-amber-600 text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"><Edit size={16} /> Editar</button>
                                    </div>
                                )}
                                
                                {viewingOrder.status === 'paid' && (
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleFinishOrder(viewingOrder.id)} 
                                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 border border-blue-500/20"
                                        >
                                            <CheckCircle size={16} /> Finalizar
                                        </button>
                                        <button 
                                            onClick={() => handleReopenOrder(viewingOrder.id)} 
                                            className="flex-1 py-3 bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 border border-amber-600/20"
                                        >
                                            <RotateCcw size={16} /> Reabrir
                                        </button>
                                    </div>
                                )}

                                {viewingOrder.status === 'finished' && (
                                    <button 
                                        onClick={() => handleReopenOrder(viewingOrder.id)} 
                                        className="w-full py-3 bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 border border-amber-600/20"
                                    >
                                        <RotateCcw size={16} /> Reabrir (Voltar para Aberto)
                                    </button>
                                )}

                                <button onClick={() => handleDeleteOrder(viewingOrder.id)} className="w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"><Trash2 size={16} /> Excluir Pedido</button>
                            </div>
                        ) : (
                            viewingOrder.status === 'open' && (
                                <button onClick={() => initiatePaymentFlow([viewingOrder.id])} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-900/20 text-sm flex items-center justify-center gap-2"><DollarSign size={16} /> Realizar Pagamento</button>
                            )
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* New Order Modal */}
        {isNewOrderModalOpen && (
            <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/60 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col animate-scale-in">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e] rounded-t-2xl shrink-0"><h2 className="text-xl font-bold text-white flex items-center gap-2"><div className="bg-primary/20 p-2 rounded-lg text-primary">{editingOrderId ? <Edit size={18} /> : <Plus size={18} />}</div> {editingOrderId ? 'Editar Pedido' : 'Novo Pedido'}</h2><button onClick={() => setIsNewOrderModalOpen(false)} className="text-zinc-500 hover:text-white hover:rotate-90 transition-transform"><X size={24} /></button></div>
                    {isLoadingOrderDetails ? (
                        <div className="p-12 flex justify-center items-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
                    ) : (
                        <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Descrição do Pedido</label><input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition placeholder-zinc-700" placeholder="Ex: Cartões de visita e Banner" value={newOrderData.description} onChange={(e) => setNewOrderData({...newOrderData, description: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Data do Pedido</label><input type="date" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" value={newOrderData.orderDate} onChange={(e) => setNewOrderData({...newOrderData, orderDate: e.target.value})} /></div>
                                <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Vencimento</label><input type="date" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" value={newOrderData.dueDate} onChange={(e) => setNewOrderData({...newOrderData, dueDate: e.target.value})} /></div>
                            </div>
                            <div className="border-t border-white/5 pt-4"><h3 className="font-bold text-primary flex items-center gap-2 mb-3 uppercase text-xs tracking-wider"><Package size={14} /> Itens do Pedido</h3>
                                {isQuickCreateOpen ? (
                                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-primary/30 animate-fade-in relative"><button onClick={() => setIsQuickCreateOpen(false)} className="absolute top-2 right-2 text-zinc-500 hover:text-white"><X size={16} /></button><h4 className="text-sm font-bold text-white mb-3">Criar Novo {quickCreateType === 'product' ? 'Produto' : 'Serviço'}</h4><div className="flex gap-3 items-end"><div className="flex-1"><input autoFocus placeholder="Nome do Item" className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none" value={quickItemData.name} onChange={e => setQuickItemData({...quickItemData, name: e.target.value})} /></div><div className="w-24"><input placeholder="R$ 0.00" className="w-full bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none" value={quickItemData.price} onChange={e => setQuickItemData({...quickItemData, price: e.target.value})} /></div><button onClick={handleQuickCreate} className="bg-primary hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition">Adicionar</button></div></div>
                                ) : (
                                    <div className="relative">
                                        <div className="relative"><input placeholder="Buscar item do catálogo..." className="w-full bg-black/40 border border-primary/30 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition placeholder-zinc-600" value={itemSearch} onChange={(e) => { setItemSearch(e.target.value); setShowSearchResults(true); }} /><Search className="absolute left-3 top-3.5 text-zinc-500" size={18} /></div>
                                        {showSearchResults && itemSearch && (
                                            <div className="absolute top-full left-0 w-full bg-[#18181b] border border-zinc-800 rounded-xl mt-1 shadow-xl z-20 max-h-48 overflow-y-auto">{filteredProducts.length > 0 ? filteredProducts.map(p => (<div key={p.id} onClick={() => handleAddItem(p)} className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-zinc-800/50 last:border-0 flex justify-between items-center group"><span className="text-zinc-300 group-hover:text-white transition">{p.name}</span><span className="text-primary font-mono text-xs">R$ {p.price.toFixed(2)}</span></div>)) : <div className="p-4 text-center text-zinc-500 text-xs">Nenhum item encontrado.</div>}</div>
                                        )}
                                        <div className="grid grid-cols-2 gap-4 mt-3"><button onClick={() => { setQuickCreateType('product'); setIsQuickCreateOpen(true); }} className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 py-3 rounded-xl transition group"><Package size={16} className="text-zinc-500 group-hover:text-white" /><span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase">Criar Produto</span></button><button onClick={() => { setQuickCreateType('service'); setIsQuickCreateOpen(true); }} className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 py-3 rounded-xl transition group"><Wrench size={16} className="text-zinc-500 group-hover:text-white" /><span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase">Criar Serviço</span></button></div>
                                    </div>
                                )}
                                 <div className="mt-6 space-y-2">{orderItems.map((item, idx) => (<div key={idx} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-white/5 group hover:border-white/10 transition"><span className="text-sm text-zinc-300 font-medium truncate flex-1">{item.productName}</span><div className="flex items-center gap-4"><div className="flex items-center bg-black/40 rounded-lg p-1"><button onClick={() => updateItemQuantity(idx, String(Number(item.quantity || 0) - 1))} className="p-1 hover:text-white text-zinc-500"><Minus size={12} /></button><input type="number" className="w-10 bg-transparent text-center text-xs font-bold text-white outline-none appearance-none" value={item.quantity} onChange={(e) => updateItemQuantity(idx, e.target.value)} /><button onClick={() => updateItemQuantity(idx, String(Number(item.quantity || 0) + 1))} className="p-1 hover:text-white text-zinc-500"><Plus size={12} /></button></div><span className="text-sm font-mono text-emerald-400 w-20 text-right">R$ {Number(item.total).toFixed(2)}</span><button onClick={() => handleRemoveItem(idx)} className="text-zinc-600 hover:text-red-500 transition"><Trash2 size={16} /></button></div></div>))}</div>
                            </div>
                            
                            {/* Campo de Desconto */}
                            <div className="pt-4 border-t border-white/5">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Desconto no Total (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                                    <input 
                                        type="number" 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition font-mono" 
                                        placeholder="0.00" 
                                        value={newOrderData.discount || ''} 
                                        onChange={(e) => setNewOrderData({...newOrderData, discount: parseFloat(e.target.value) || 0})} 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="p-6 border-t border-white/5 bg-[#0c0c0e] flex justify-between items-center rounded-b-2xl shrink-0">
                        <div>
                            {Number(newOrderData.discount) > 0 && (
                                <p className="text-[10px] text-zinc-500 line-through mb-0.5">Subtotal: R$ {orderSubtotal.toFixed(2)}</p>
                            )}
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Total Geral</p>
                            <h2 className="text-3xl font-black text-white">R$ {Number(orderTotal).toFixed(2)}</h2>
                        </div>
                        <button onClick={handleFinalizeOrder} className="bg-gradient-to-r from-primary to-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition">{editingOrderId ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR PEDIDO'}</button>
                    </div>
                </div>
            </div>
        )}

        {isEditModalOpen && (
             <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/80 backdrop-blur-md p-4 animate-fade-in-up overflow-y-auto">
                <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e] rounded-t-2xl"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit size={20} className="text-primary" /> Editar Cliente</h2><button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white hover:rotate-90 transition-transform"><X size={24} /></button></div>
                    <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Nome Completo</label>
                            <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Telefone</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">CPF / CNPJ</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.cpf || ''} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Email</label>
                                <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Limite (R$)</label>
                                <input type="number" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition font-mono" value={formData.creditLimit || ''} onChange={e => setFormData({...formData, creditLimit: parseFloat(e.target.value)})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Endereço</label>
                            <div className="grid grid-cols-3 gap-4">
                                <input placeholder="Rua" value={formData.address?.street || ''} onChange={e => setFormData({...formData, address: {...formData.address, street: e.target.value}})} className="col-span-2 w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" />
                                <input placeholder="Número" value={formData.address?.number || ''} onChange={e => setFormData({...formData, address: {...formData.address, number: e.target.value}})} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" />
                                <input placeholder="CEP" value={formData.address?.zipCode || ''} onChange={e => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})} className="col-span-3 w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Link Nuvem (Opcional)</label>
                            <div className="relative"><input className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" value={formData.cloudLink || ''} onChange={e => setFormData({...formData, cloudLink: e.target.value})} placeholder="https://..." /><Cloud className="absolute left-3 top-3.5 text-zinc-600" size={18} /></div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Alterar Senha (Opcional)</label>
                            <div className="relative">
                                <input 
                                    type="password"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" 
                                    value={formData.password || ''} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    placeholder="Deixe em branco para manter a atual" 
                                />
                                <Lock className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                            </div>
                        </div>
                        
                        {/* Toggle de Assinatura */}
                        <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${formData.isSubscriber ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-bold text-white">Assinante Quitanda</span>
                                        <span className="text-[10px] text-zinc-400 block">Permite baixar artes sem custo adicional.</span>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={!!formData.isSubscriber} onChange={(e) => setFormData({...formData, isSubscriber: e.target.checked})} />
                                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            {formData.isSubscriber && (
                                <div className="animate-fade-in pt-2 border-t border-purple-500/10">
                                    <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5 ml-1">Data de Expiração</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-2 text-white focus:border-purple-500 outline-none transition text-sm" 
                                        value={formData.subscriptionExpiresAt || ''} 
                                        onChange={e => setFormData({...formData, subscriptionExpiresAt: e.target.value})} 
                                    />
                                </div>
                            )}
                        </div>

                        <div className="pt-6 flex justify-end gap-3 border-t border-white/5 mt-2">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition font-medium">Cancelar</button>
                            <button type="submit" className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-lg shadow-primary/20">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
             </div>
        )}

        {/* MODAL POLÍTICA DE FIDELIDADE */}
        {isPolicyModalOpen && (
            <div className="fixed inset-0 z-[200] flex justify-center items-start pt-12 md:pt-24 bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                <div className="bg-[#121215] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col animate-scale-in">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e] rounded-t-3xl sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <CreditCard size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Termos de Crédito – CrazyArt</h2>
                        </div>
                        <button onClick={() => setIsPolicyModalOpen(false)} className="p-2 bg-zinc-900 rounded-xl text-zinc-500 hover:text-white hover:rotate-90 transition-all border border-white/5"><X size={24} /></button>
                    </div>

                    <div className="p-8 space-y-8 text-zinc-300 leading-relaxed overflow-y-auto custom-scrollbar">
                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                1. Sobre o Crédito
                            </h3>
                            <p className="pl-4">O crédito da plataforma CrazyArt é um benefício exclusivo para pedidos de artes digitais. Ele funciona como um limite adicional que pode ser usado em novos pedidos dentro do site.</p>
                            <p className="pl-4 text-amber-500/80 font-medium italic">Os créditos não se aplicam a produtos físicos e não podem ser convertidos em dinheiro.</p>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                2. Quando o Crédito Começa
                            </h3>
                            <p className="pl-4">O sistema de crédito é ativado após o pagamento do primeiro pedido realizado pelo cliente.</p>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                3. Como Ganhar Crédito (Bônus)
                            </h3>
                            <div className="pl-4 space-y-3">
                                <p>Clientes que pagam seus pedidos em dia ou antecipadamente são recompensados.</p>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span><strong className="text-emerald-400">Condição:</strong> pagamento realizado até a data de vencimento</span>
                                    </li>
                                    <li className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span><strong className="text-emerald-400">Benefício:</strong> aumento de 50% do valor pago no limite de crédito</span>
                                    </li>
                                </ul>
                                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 mt-4">
                                    <p className="text-sm font-bold text-white mb-1 uppercase tracking-widest opacity-50">Exemplo:</p>
                                    <p>Se um pedido de <span className="font-mono text-emerald-400">R$ 250,00</span> for pago em dia, o cliente recebe <span className="font-mono text-emerald-400">R$ 125,00</span> de crédito adicional.</p>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                4. Perda de Crédito (Penalidade)
                            </h3>
                            <p className="pl-4">O atraso no pagamento impacta negativamente o limite de crédito.</p>
                            <ul className="pl-4 space-y-2">
                                <li className="flex items-start gap-2 bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                                    <X className="text-red-500 shrink-0 mt-1" size={14} />
                                    <span><strong className="text-red-400">Condição:</strong> pedido pago após a data de vencimento</span>
                                </li>
                                <li className="flex items-start gap-2 bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                                    <X className="text-red-500 shrink-0 mt-1" size={14} />
                                    <span><strong className="text-red-400">Penalidade:</strong> redução de 50% do valor do pedido no limite de crédito atual</span>
                                </li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                5. Bloqueio Automático
                            </h3>
                            <div className="pl-4 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl flex items-start gap-4">
                                <AlertTriangle className="text-red-500 shrink-0" size={24} />
                                <p className="text-sm">Se o cliente possuir qualquer pedido com mais de <span className="font-bold text-white underline">1 dia de atraso</span>, todo o seu limite de crédito é temporariamente zerado e o acesso à nuvem de arquivos é bloqueado até a regularização.</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                6. Inatividade da Conta
                            </h3>
                            <p className="pl-4">Clientes que ficarem mais de <span className="font-bold text-white">30 dias</span> sem realizar novos pedidos terão seu limite de crédito zerado automaticamente por inatividade.</p>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                7. Novos Pedidos e Limite
                            </h3>
                            <p className="pl-4">O sistema só permitirá a gravação de novos pedidos se o cliente possuir limite de crédito disponível e <span className="font-bold text-white">zero faturas atrasadas</span>.</p>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                8. Pedidos em Reunião/Abertos
                            </h3>
                            <ul className="pl-4 space-y-2">
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                    <p>Pedidos com status <span className="text-amber-400 font-bold">"Aberto"</span> ou <span className="text-blue-400 font-bold">"Em Produção"</span> consomem o limite de crédito.</p>
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                    <p>O limite é liberado proporcionalmente conforme os pagamentos são realizados.</p>
                                </li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                                9. Casos Especiais
                            </h3>
                            <div className="pl-4 bg-zinc-900 border border-white/5 p-4 rounded-xl">
                                <p className="text-sm italic text-zinc-400 block mb-2">Exceções e revisões de limite:</p>
                                <p>Qualquer situação não prevista nestes termos ou solicitações de aumento de limite manual devem ser tratadas diretamente com o suporte administrativo da CrazyArt.</p>
                            </div>
                        </section>
                    </div>

                    <div className="p-8 border-t border-white/5 bg-[#0c0c0e] rounded-b-3xl shrink-0">
                        <button 
                            onClick={() => setIsPolicyModalOpen(false)}
                            className="w-full py-4 bg-primary hover:bg-amber-600 text-white rounded-2xl font-black transition shadow-lg shadow-primary/20 active:scale-95 uppercase tracking-widest"
                        >
                            CONCORDO E ENTENDI
                        </button>
                    </div>
                </div>
            </div>
        )}
        {isSavingPublicList && (
          <div id="saving-public-list-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
            <div className="bg-zinc-950/90 border border-white/5 p-8 rounded-3xl flex flex-col items-center space-y-4 max-w-sm text-center shadow-2xl animate-fade-in">
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
