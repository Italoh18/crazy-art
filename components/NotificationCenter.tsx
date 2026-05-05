
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, CheckCircle, AlertTriangle, XCircle, X, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Notification as AppNotification } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { role } = useAuth();

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error("Falha ao buscar notificações", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Sincroniza o Badge do App (no ícone) com notificações não lidas
  useEffect(() => {
    const unreadCount = notifications.filter(n => n.is_read === 0).length;
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount).catch((e: any) => console.error('Badge error:', e));
      } else {
        (navigator as any).clearAppBadge().catch((e: any) => console.error('Badge error:', e));
      }
    }
  }, [notifications]);

  // Poll de notificações a cada 30 segundos
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    
    // Verificar suporte a Push
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      checkSubscription();
    }
    
    return () => clearInterval(interval);
  }, []);

  const checkSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsPushSupported(false);
        return;
      }
      
      const sw = await navigator.serviceWorker.ready;
      if (!sw) {
        setIsPushSupported(false);
        return;
      }

      const sub = await sw.pushManager.getSubscription();
      setIsSubscribed(!!sub);
      setIsPushSupported(true);
    } catch (e) {
      console.error("Erro ao verificar inscrição", e);
      setIsPushSupported(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    try {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (e) {
      console.error("Erro na conversão Base64 para Uint8Array:", e);
      throw new Error("Chave de segurança inválida.");
    }
  };

  const subscribeUser = async () => {
    try {
      // 1. Verificar suporte básico
      if (!('Notification' in window)) {
        alert("Este navegador não suporta notificações.");
        return;
      }

      // 2. Solicitar permissão
      const permission = await window.Notification.requestPermission();
      
      if (permission === 'denied') {
        alert("As notificações foram bloqueadas. Você precisa permitir o acesso clicando no ícone de cadeado ao lado da URL do site.");
        return;
      }

      if (permission !== 'granted') return;

      // 3. Garantir Service Worker pronto
      const registration = await navigator.serviceWorker.ready;
      if (!registration.pushManager) {
        alert("Seu navegador suporta notificações, mas o gerenciador de push não está disponível. Tente reiniciar o navegador.");
        return;
      }
      
      // 4. Buscar chave VAPID
      const response = await fetch('/api/push');
      if (!response.ok) throw new Error("Falha ao obter chave do servidor");
      const { publicKey } = await response.json();

      if (!publicKey) throw new Error("Chave pública não configurada.");

      // 5. Subscrever
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // 6. Sincronizar com o servidor
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const saveResponse = await fetch('/api/push', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ subscription })
      });

      if (!saveResponse.ok) throw new Error("Erro ao salvar inscrição no banco de dados.");

      setIsSubscribed(true);
      alert("Notificações ativadas com sucesso!");
    } catch (e: any) {
      console.error("Erro ao ativar push:", e);
      
      // Ajuste para dispositivos móveis (especialmente iOS)
      if (e.message?.includes('Registration failed')) {
        alert("Erro de registro. Se estiver no iPhone, você DEVE 'Adicionar à Tela de Início' antes de ativar as notificações.");
      } else {
        alert("Falha ao ativar: " + (e.message || "Verifique sua conexão HTTPS."));
      }
    }
  };

  const unsubscribeUser = async () => {
    try {
      const sw = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        
        // Remove from server
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
      }
      setIsSubscribed(false);
    } catch (e) {
      console.error("Falha ao cancelar inscrição", e);
    }
  };

  const togglePush = () => {
    if (isSubscribed) {
      unsubscribeUser();
    } else {
      subscribeUser();
    }
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/notifications?id=${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Atualiza localmente
      if (id === 'all') {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      } else {
        setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, is_read: 1 }) : n));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    // 1. Marca como lida
    if (notif.is_read === 0) {
        markAsRead(notif.id);
    }

    // 2. Fecha o menu
    setIsOpen(false);

    // 3. Navegação Inteligente baseada no conteúdo ou tipo
    if (role === 'client') {
        // Clientes sempre vão para sua área de detalhes
        navigate('/minha-area');
    } else if (role === 'admin') {
        // Lógica para Admin
        const titleLower = notif.title.toLowerCase();
        const messageLower = notif.message.toLowerCase();

        if (notif.reference_id?.startsWith('overdue_') || titleLower.includes('atraso') || notif.type === 'warning') {
            // Vai para pedidos filtrado por atrasados
            navigate('/orders', { state: { filter: 'overdue' } });
        } else if (titleLower.includes('pagamento') || notif.type === 'success') {
            // Vai para pedidos filtrado por pagos
            navigate('/orders', { state: { filter: 'paid' } });
        } else if (titleLower.includes('pedido') || messageLower.includes('pedido')) {
            // Vai para lista geral de pedidos
            navigate('/orders');
        } else {
            // Default
            navigate('/');
        }
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const getIcon = (type: string) => {
    switch (type) {
        case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
        case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
        case 'error': return <XCircle size={16} className="text-red-500" />;
        default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => {
            setIsOpen(!isOpen);
            if(!isOpen) fetchNotifications(); // Refresh on open
        }}
        className="relative p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all hover:scale-105"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-zinc-900"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-scale-in origin-top-right">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur">
                <h3 className="text-sm font-bold text-white tracking-wide">Notificações</h3>
                <div className="flex gap-2">
                    {notifications.length > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); markAsRead('all'); }}
                            disabled={unreadCount === 0}
                            className={`text-[10px] flex items-center gap-1 px-2 py-1.5 rounded transition font-bold uppercase tracking-wider ${
                                unreadCount > 0 
                                ? 'text-zinc-300 hover:text-white bg-white/10 hover:bg-white/20' 
                                : 'text-zinc-600 bg-white/5 cursor-not-allowed'
                            }`}
                        >
                            <Check size={12} /> Marcar todas
                        </button>
                    )}
                    <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {isPushSupported && !isSubscribed && (
                    <div className="p-4 bg-primary/10 border-b border-primary/20 animate-pulse-slow">
                        <div className="flex items-start gap-3">
                             <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                <ShieldCheck size={20} />
                             </div>
                             <div className="flex-1">
                                <p className="text-xs font-black text-white uppercase tracking-tight">Ativar Notificações?</p>
                                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                                    Receba alertas em tempo real sobre seus pedidos e novidades diretamente no celular.
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <button 
                                        onClick={subscribeUser}
                                        className="bg-primary text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                        Sim, Ativar
                                    </button>
                                    <button 
                                        onClick={() => setIsPushSupported(false)}
                                        className="text-zinc-500 hover:text-white px-2 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors"
                                    >
                                        Agora não
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {isPushSupported && isSubscribed && (
                    <div className="px-4 py-2 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                             <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest">Push Ativado</span>
                         </div>
                         <button 
                            onClick={unsubscribeUser}
                            className="text-[9px] text-zinc-600 hover:text-zinc-400 font-bold uppercase tracking-widest transition-colors"
                         >
                            Desativar
                         </button>
                    </div>
                )}

                {notifications.length === 0 ? (
                    <div className="py-12 text-center text-zinc-600 flex flex-col items-center">
                        <Bell size={32} className="opacity-20 mb-2" />
                        <p className="text-xs">Nenhuma notificação.</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div 
                            key={notif.id} 
                            className={`p-4 border-b border-zinc-800/50 hover:bg-white/5 transition-colors relative group cursor-pointer ${notif.is_read === 0 ? 'bg-primary/5' : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                        >
                            <div className="flex gap-3">
                                <div className={`mt-1 flex-shrink-0 ${notif.is_read === 0 ? 'opacity-100' : 'opacity-50'}`}>
                                    {getIcon(notif.type)}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-sm ${notif.is_read === 0 ? 'text-white font-bold' : 'text-zinc-400 font-medium'}`}>{notif.title}</h4>
                                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{notif.message}</p>
                                    <span className="text-[10px] text-zinc-600 mt-2 block font-mono">
                                        {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString().slice(0,5)}
                                    </span>
                                </div>
                                {notif.is_read === 0 && (
                                    <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-primary rounded-full"></div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
};
