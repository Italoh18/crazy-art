
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertTriangle, Edit, Check, Mail, Code, Image as ImageIcon, Info } from 'lucide-react';

const availableTemplates = [
  { 
    id: 'newOrderClient', 
    name: 'Novo Pedido (Cliente)', 
    description: 'Enviado ao cliente quando um pedido é criado.',
    variables: ['{customerName}', '{orderNumber}', '{total}']
  },
  { 
    id: 'newOrderAdmin', 
    name: 'Novo Pedido (Admin)', 
    description: 'Notificação para você quando entra um pedido da loja.',
    variables: ['{customerName}', '{orderNumber}', '{total}']
  },
  { 
    id: 'paymentConfirmedAdmin', 
    name: 'Pagamento Confirmado (Admin)', 
    description: 'Aviso quando um pagamento é processado com sucesso.',
    variables: ['{customerName}', '{orderNumber}']
  },
  { 
    id: 'overdueClient', 
    name: 'Atraso (Cliente)', 
    description: 'Cobrança enviada ao cliente quando vence o prazo.',
    variables: ['{customerName}', '{orderNumber}', '{dueDate}']
  },
  { 
    id: 'overdueAdmin', 
    name: 'Alerta de Atraso (Admin)', 
    description: 'Aviso interno sobre inadimplência.',
    variables: ['{customerName}', '{orderNumber}', '{dueDate}']
  },
];

export default function EmailTemplates() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState({ subject: '', htmlBody: '', logoUrl: '' });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const fetchTemplate = async (type: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/templates?type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.subject) {
        setFormData({ 
            subject: data.subject, 
            htmlBody: data.html_body || '', 
            logoUrl: data.logo_url || '' 
        });
      } else {
        // Limpa para permitir criação
        setFormData({ subject: '', htmlBody: '', logoUrl: '' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: string) => {
    setSelectedType(type);
    fetchTemplate(type);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: selectedType,
            ...formData
        })
      });

      if (res.ok) {
        setNotification({ msg: 'Template salvo com sucesso!', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (e) {
      setNotification({ msg: 'Erro ao salvar template.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!selectedType || !confirm("Deseja apagar este template personalizado e voltar ao padrão do sistema?")) return;
    
    setLoading(true);
    try {
        const token = localStorage.getItem('auth_token');
        await fetch(`/api/templates?type=${selectedType}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setFormData({ subject: '', htmlBody: '', logoUrl: '' });
        setNotification({ msg: 'Restaurado para o padrão.', type: 'success' });
    } catch (e) {
        setNotification({ msg: 'Erro ao resetar.', type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  const currentTemplateInfo = availableTemplates.find(t => t.id === selectedType);

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
        <Mail className="text-primary" /> Templates de E-mail
      </h1>
      <p className="text-zinc-400 text-sm">Personalize as mensagens automáticas enviadas pelo sistema.</p>

      {notification && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in ${
              notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
              {notification.type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
              <span className="font-bold text-sm">{notification.msg}</span>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista Lateral */}
        <div className="space-y-3">
            {availableTemplates.map(t => (
                <button
                    key={t.id}
                    onClick={() => handleEdit(t.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center group ${
                        selectedType === t.id 
                        ? 'bg-primary/10 border-primary text-white' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                >
                    <div>
                        <span className="font-bold block text-sm">{t.name}</span>
                        <span className="text-[10px] opacity-70">{t.description}</span>
                    </div>
                    {selectedType === t.id && <Edit size={16} className="text-primary" />}
                </button>
            ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
            {selectedType && currentTemplateInfo ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative animate-fade-in">
                    <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">{currentTemplateInfo.name}</h2>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {currentTemplateInfo.variables.map(v => (
                                    <span key={v} className="text-[10px] font-mono bg-black/50 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20" title="Clique para copiar">
                                        {v}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <button 
                            onClick={handleReset}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-lg transition"
                            title="Voltar ao template original do sistema"
                        >
                            <RefreshCw size={12} /> Resetar Padrão
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Assunto do E-mail</label>
                            <input 
                                required
                                value={formData.subject}
                                onChange={e => setFormData({...formData, subject: e.target.value})}
                                className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition"
                                placeholder="Ex: Olá {customerName}, seu pedido chegou!"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1 flex items-center gap-2">
                                <ImageIcon size={12} /> URL da Logo (Opcional)
                            </label>
                            <input 
                                value={formData.logoUrl}
                                onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                                className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition text-sm"
                                placeholder="https://seu-site.com/logo.png"
                            />
                            <p className="text-[10px] text-zinc-600 mt-1 ml-1">A logo será inserida automaticamente no topo do e-mail.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1 flex items-center gap-2">
                                <Code size={12} /> Corpo do E-mail (HTML)
                            </label>
                            <textarea 
                                required
                                rows={12}
                                value={formData.htmlBody}
                                onChange={e => setFormData({...formData, htmlBody: e.target.value})}
                                className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-primary outline-none transition resize-y"
                                placeholder="<div>Olá, <strong>{customerName}</strong>...</div>"
                            />
                            <div className="flex items-center gap-2 mt-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-300 text-xs">
                                <Info size={14} />
                                <span>Dica: Use HTML simples. As variáveis acima serão substituídas automaticamente.</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-800 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="bg-primary hover:bg-amber-600 text-white font-bold px-8 py-3 rounded-xl transition shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                Salvar Template
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl min-h-[400px]">
                    <Mail size={48} className="opacity-20 mb-4" />
                    <p>Selecione um tipo de notificação ao lado para editar.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
