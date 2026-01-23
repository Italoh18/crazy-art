
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { Notification } from '../types';

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
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

  // Poll de notificações a cada 30 segundos
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in origin-top-right">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur">
                <h3 className="text-sm font-bold text-white tracking-wide">Notificações</h3>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <button 
                            onClick={(e) => markAsRead('all', e)}
                            className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded transition"
                        >
                            <Check size={12} /> Marcar todas
                        </button>
                    )}
                    <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="py-12 text-center text-zinc-600 flex flex-col items-center">
                        <Bell size={32} className="opacity-20 mb-2" />
                        <p className="text-xs">Nenhuma notificação.</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div 
                            key={notif.id} 
                            className={`p-4 border-b border-zinc-800/50 hover:bg-white/5 transition-colors relative group ${notif.is_read === 0 ? 'bg-primary/5' : ''}`}
                            onClick={() => notif.is_read === 0 && markAsRead(notif.id)}
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
