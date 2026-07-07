
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Notification as AppNotification } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribed' | 'blocked' | 'loading'>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { role } = useAuth();

  const checkPushSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    try {
      const permission = Notification.permission;
      if (permission === 'denied') {
        setPushStatus('blocked');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setPushStatus('subscribed');
      } else {
        setPushStatus('idle');
      }
    } catch (e) {
      console.error('Erro ao verificar push:', e);
    }
  };

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

  // Poll de notificações e visibilidade
  useEffect(() => {
    fetchNotifications();
    
    // Busca ao focar na janela ou mudar visibilidade
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    window.addEventListener('focus', fetchNotifications);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(fetchNotifications, 10000); // Reduzido para 10 segundos
    
    return () => {
      window.removeEventListener('focus', fetchNotifications);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

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

  const subscribeToPush = async () => {
    try {
      setPushStatus('loading');
      console.log('[Push] Iniciando processo de inscrição...');

      // 1. Pedir permissão
      const permission = await Notification.requestPermission();
      console.log('[Push] Permissão:', permission);
      if (permission !== 'granted') {
          setPushStatus(permission === 'denied' ? 'blocked' : 'idle');
          alert('Você precisa permitir notificações para receber alertas no celular.');
          return;
      }

      // 2. Buscar Chave VAPID do Backend (Garante que a chave correta seja usada)
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const keyRes = await fetch('/api/notifications?vapidKey=true', {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!keyRes.ok) {
        throw new Error(`Servidor retornou erro ${keyRes.status} ao buscar chave.`);
      }

      const { publicKey: vapidPublicKey } = await keyRes.json();
      
      console.log('[Push] Chave VAPID recebida do servidor:', vapidPublicKey ? 'OK (presente)' : 'ERRO (vazia)');

      if (!vapidPublicKey) {
          throw new Error('Chave VAPID não encontrada no servidor. Verifique as variáveis de ambiente na aba Settings do AI Studio e na Cloudflare.');
      }

      console.log('[Push] Chave VAPID obtida com sucesso');

      // 3. Preparar Service Worker
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        throw new Error('Service Worker não encontrado. Tente recarregar a página.');
      }
      
      // Garante que o SW esteja pronto
      await navigator.serviceWorker.ready;
      
      // Converte base64 para Uint8Array
      const padding = '='.repeat((4 - vapidPublicKey.length % 4) % 4);
      const base64 = (vapidPublicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
      }

      // 4. Se inscrever no PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray
      });

      console.log('[Push] Inscrição criada no navegador');

      // 5. Salvar no Banco de Dados
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription })
      });

      if (res.ok) {
        setPushStatus('subscribed');
        alert('Notificações ativadas com sucesso!');
      } else {
        const errorData = await res.json() as any;
        throw new Error(errorData.error || 'Falha ao salvar assinatura no servidor');
      }
    } catch (e) {
      console.error('[Push] Erro crítico:', e);
      setPushStatus('idle');
      alert(`Erro ao ativar notificações: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

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
        const titleLower = notif.title.toLowerCase();
        const messageLower = notif.message.toLowerCase();
        if (
            notif.reference_id?.startsWith('approval_') || 
            notif.reference_id?.startsWith('completed_') || 
            titleLower.includes('aprova') || 
            messageLower.includes('aprova') || 
            titleLower.includes('aguardando') || 
            messageLower.includes('aguardando') ||
            titleLower.includes('conclui') ||
            messageLower.includes('conclui')
        ) {
            navigate('/my-orders');
        } else {
            navigate('/minha-area');
        }
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
            if(!isOpen) {
                fetchNotifications();
                checkPushSubscription();
            }
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
                {('serviceWorker' in navigator && 'PushManager' in window) && (
                    <div className="p-3 bg-white/5 border-b border-zinc-800 flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                               <Bell size={14} />
                           </div>
                           <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-white uppercase tracking-wider">Alertas no Celular</span>
                               <span className="text-[9px] text-zinc-500">Receba avisos de novos pedidos</span>
                           </div>
                        </div>
                        <button 
                            onClick={pushStatus === 'idle' ? subscribeToPush : undefined}
                            disabled={pushStatus !== 'idle'}
                            className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                                pushStatus === 'subscribed' 
                                ? 'bg-emerald-500/20 text-emerald-500 cursor-default uppercase' 
                                : pushStatus === 'blocked'
                                ? 'bg-red-500/20 text-red-500 cursor-not-allowed opacity-50 uppercase'
                                : pushStatus === 'loading'
                                ? 'bg-zinc-500/20 text-zinc-500 cursor-wait animate-pulse uppercase'
                                : 'bg-primary/20 hover:bg-primary text-primary hover:text-white uppercase'
                            }`}
                        >
                            {pushStatus === 'subscribed' ? 'Ativado' : pushStatus === 'blocked' ? 'Bloqueado' : pushStatus === 'loading' ? 'Aguarde...' : 'Ativar'}
                        </button>
                    </div>
                )}

                {role === 'admin' && pushStatus === 'subscribed' && (
                    <div className="p-3 bg-zinc-900/50 border-b border-zinc-800">
                        <button 
                            onClick={async () => {
                                try {
                                    const token = localStorage.getItem('auth_token');
                                    const res = await fetch('/api/notifications?testPush=true', {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    const data = await res.json() as any;
                                    if(res.ok) alert('Teste processado! ' + (data.details || 'Verifique sua aba de notificações no celular.'));
                                    else alert('Falha ao enviar teste: ' + (data.error || 'Erro desconhecido'));
                                } catch (e) { alert('Erro na requisição de teste'); }
                            }}
                            className="w-full py-1 text-[9px] font-bold text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded transition-all uppercase"
                        >
                            Testar Notificação
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
