
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Scissors, Sparkles, MessageSquare, Image as ImageIcon, 
  Upload, HelpCircle, CheckCircle2, CreditCard, Wallet, 
  ArrowRight, Loader2, Info, ChevronRight, X, Phone, Plus, Trash2, FileText, Hourglass, Palette
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ImageUploadInput } from '../components/ImageUploadInput';
import { motion, AnimatePresence } from 'framer-motion';

interface CatalogService {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
}

interface RepliaItem {
  id: string;
  size: string;
  name: string;
  number: string;
}

export default function MontagemMolde() {
  const navigate = useNavigate();
  const { currentCustomer, role } = useAuth();
  const isAuthenticated = role !== 'guest';
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mainService, setMainService] = useState<CatalogService | null>(null);
  const [replicaService, setReplicaService] = useState<CatalogService | null>(null);
  
  // Form State
  const [step, setStep] = useState<'briefing' | 'summary' | 'completed'>('briefing');
  const [description, setDescription] = useState('');
  const [layoutFileUrl, setLayoutFileUrl] = useState('');
  const [showIncompleteError, setShowIncompleteError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'online' | null>(null);
  
  // Replicas State
  const [hasReplicas, setHasReplicas] = useState(false);
  const [replicas, setReplicas] = useState<RepliaItem[]>([{ id: crypto.randomUUID(), size: '', name: '', number: '' }]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/catalog?type=service');
      const data = await response.json();
      
      const main = data.find((s: any) => s.name.toLowerCase().includes('montagem de molde'));
      const replica = data.find((s: any) => s.name.toLowerCase().includes('replica de molde'));
      
      if (main) setMainService(main);
      if (replica) setReplicaService(replica);
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReplica = () => {
    setReplicas([...replicas, { id: crypto.randomUUID(), size: '', name: '', number: '' }]);
  };

  const handleRemoveReplica = (id: string) => {
    if (replicas.length > 1) {
      setReplicas(replicas.filter(r => r.id !== id));
    }
  };

  const updateReplica = (id: string, field: keyof RepliaItem, value: string) => {
    setReplicas(replicas.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const calculateTotal = () => {
    const basePrice = mainService?.price || 0;
    const replicaPrice = replicaService?.price || 0;
    const replicasCount = hasReplicas ? replicas.length : 0;
    
    // Simplificado: se tem replicas, cada uma custa o valor de replica, e o primeiro custa o base?
    // User: "cada linha adiciona o valor de uma unidade do item cadastrado no serviço replica de molde para impressão"
    // Geralmente o primeiro é o "Montagem", os outros são "Replicas".
    return basePrice + (replicasCount * replicaPrice);
  };

  const handleNextToSummary = () => {
    if (!description.trim()) {
      setShowIncompleteError(true);
      return;
    }
    setStep('summary');
    window.scrollTo(0, 0);
  };

  const handleSubmitRequest = async (method: 'credit' | 'online') => {
    if (!isAuthenticated) {
        alert('Você precisa estar logado para finalizar a solicitação.');
        return;
    }

    setIsSubmitting(true);
    setPaymentMethod(method);

    try {
        const total = calculateTotal();
        const response = await fetch('/api/layout-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                serviceId: mainService?.id,
                description: `MONTAGEM DE MOLDE:\n${description}\n\nREPLICAS (${replicas.length}):\n${replicas.map(r => `- ${r.size} | ${r.name} | ${r.number}`).join('\n')}`,
                logoUrl: layoutFileUrl, // Reutilizando campo logo_url para o arquivo de layout
                paymentMethod: method,
                value: total,
                type: 'montagem_molde'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao processar solicitação');
        }

        if (method === 'online' && data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
            return;
        }

        setStep('completed');
        window.scrollTo(0, 0);
    } catch (err: any) {
        alert(err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-primary animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-10">
        
        {step !== 'completed' && (
          <header className="flex items-center justify-between mb-12 animate-fade-in">
            <button onClick={() => navigate(-1)} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition">
              <ArrowLeft size={24} />
            </button>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center justify-center gap-2">
                <Scissors className="text-primary" /> Montagem de Molde
              </h1>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Personalização e Graduação de Moldes</p>
            </div>
          </header>
        )}

        {step === 'briefing' && (
          <div className="space-y-10 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="bg-primary/20 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4">
                        <Sparkles size={24} />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Qualidade Garantida</h3>
                    <p className="text-zinc-500 text-xs mt-2 leading-relaxed font-medium">Nossos especialistas garantem a precisão técnica necessária para sua produção.</p>
               </div>
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                    <div className="bg-primary/20 w-12 h-12 rounded-xl flex items-center justify-center text-primary mb-4">
                        <Loader2 size={24} />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">Agilidade no Processo</h3>
                    <p className="text-zinc-500 text-xs mt-2 leading-relaxed font-medium">Após o pagamento, sua montagem entra imediatamente na fila de produção especializada.</p>
               </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-8">
               <section className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">01</span>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Enviar Seu Layout</h2>
                    </div>
                    <Link to="/layout-simples" className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:bg-primary/10 px-4 py-2 rounded-xl transition">
                        Não tem layout? <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="space-y-4">
                     <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Aceita arquivos PDF, CDR, AI (Máx. 10MB)</p>
                     <ImageUploadInput 
                        value={layoutFileUrl}
                        onChange={(url) => setLayoutFileUrl(url)} 
                        label="Clique para subir seu arquivo base"
                        accept=".pdf,.cdr,.ai"
                     />
                  </div>
               </section>

               <section className="space-y-6">
                  <div className="flex items-center gap-2">
                     <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">02</span>
                     <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Informações Adicionais</h2>
                  </div>
                  <div className="space-y-4">
                     <textarea 
                        className={`w-full bg-black/40 border ${showIncompleteError && !description.trim() ? 'border-red-500 animate-shake' : 'border-zinc-800'} rounded-2xl p-6 text-sm text-white focus:border-primary outline-none transition min-h-[150px] placeholder:text-zinc-700 italic`}
                        placeholder="Descreva detalhes específicos da montagem, acabamentos ou observações técnicas..."
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); setShowIncompleteError(false); }}
                     />
                  </div>
               </section>

               <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">03</span>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Dados do Molde</h2>
                    </div>
                    <button 
                        onClick={() => setHasReplicas(!hasReplicas)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${hasReplicas ? 'bg-primary text-black' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                    >
                        {hasReplicas ? 'Remover Réplicas' : 'Preciso de Réplicas'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {hasReplicas ? (
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {replicas.map((replica, index) => (
                                    <motion.div 
                                        key={replica.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-black/40 p-4 rounded-2xl border border-zinc-800"
                                    >
                                        <div className="space-y-1">
                                            <p className="text-[9px] text-zinc-600 font-black uppercase">Tamanho</p>
                                            <input 
                                                type="text" value={replica.size} 
                                                onChange={(e) => updateReplica(replica.id, 'size', e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-primary outline-none" 
                                                placeholder="ex: G"
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <p className="text-[9px] text-zinc-600 font-black uppercase">Nome / Texto</p>
                                            <input 
                                                type="text" value={replica.name} 
                                                onChange={(e) => updateReplica(replica.id, 'name', e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-primary outline-none" 
                                                placeholder="Nome no Molde"
                                            />
                                        </div>
                                        <div className="space-y-1 flex gap-2">
                                            <div className="flex-1">
                                                <p className="text-[9px] text-zinc-600 font-black uppercase">Nº</p>
                                                <input 
                                                    type="text" value={replica.number} 
                                                    onChange={(e) => updateReplica(replica.id, 'number', e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-primary outline-none" 
                                                    placeholder="00"
                                                />
                                            </div>
                                            {replicas.length > 1 && (
                                                <button onClick={() => handleRemoveReplica(replica.id)} className="mt-5 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            <button 
                                onClick={handleAddReplica}
                                className="w-full py-3 border border-dashed border-zinc-800 rounded-2xl text-zinc-600 font-black text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> Adicionar Nova Réplica
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="space-y-2">
                                <p className="text-[10px] text-zinc-600 font-black uppercase">Tamanho</p>
                                <input className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none transition" placeholder="G" />
                             </div>
                             <div className="space-y-2 md:col-span-2">
                                <p className="text-[10px] text-zinc-600 font-black uppercase">Nome e Número</p>
                                <input className="w-full bg-black/40 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none transition" placeholder="SILVA • 10" />
                             </div>
                        </div>
                    )}
                  </div>
               </section>

               <div className="pt-6 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Total Estimado</p>
                        <p className="text-3xl font-black text-white italic">R$ {calculateTotal().toFixed(2)}</p>
                    </div>
                    <button 
                        onClick={handleNextToSummary}
                        className="w-full md:w-auto px-12 py-5 bg-primary text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        Continuar <ChevronRight size={18} />
                    </button>
               </div>
            </div>
          </div>
        )}

        {step === 'summary' && (
           <div className="animate-fade-in space-y-10">
              <header className="text-center space-y-4">
                  <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Revisão do Pedido</h2>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Confira os detalhes antes de pagar</p>
              </header>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-8 space-y-8">
                       <div className="flex flex-col md:flex-row gap-8">
                          <div className="w-full md:w-1/3 bg-black rounded-2xl overflow-hidden aspect-square flex items-center justify-center border border-zinc-800 relative group">
                             {layoutFileUrl ? (
                                <img src={layoutFileUrl} className="w-full h-full object-cover" />
                             ) : (
                                <div className="flex flex-col items-center gap-2 text-zinc-700">
                                   <FileText size={48} />
                                   <p className="text-[10px] uppercase font-black">Nenhum Arquivo</p>
                                </div>
                             )}
                          </div>
                          <div className="flex-1 space-y-6">
                             <div>
                                <h3 className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1">Briefing</h3>
                                <p className="text-white text-sm leading-relaxed italic">"{description}"</p>
                             </div>
                             {hasReplicas && (
                                 <div>
                                    <h3 className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">Réplicas Adicionais ({replicas.length})</h3>
                                    <div className="space-y-1">
                                        {replicas.map(r => (
                                            <div key={r.id} className="text-[10px] text-zinc-400 font-bold uppercase py-1 border-b border-zinc-800/50">
                                                {r.size} • {r.name} • {r.number}
                                            </div>
                                        ))}
                                    </div>
                                 </div>
                             )}
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-black/40 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                    <Wallet size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-600 font-black uppercase">Total a Pagar</p>
                                    <p className="text-xl font-black text-white italic">R$ {calculateTotal().toFixed(2)}</p>
                                </div>
                             </div>
                          </div>
                          <div className="bg-black/40 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-600 font-black uppercase">Entrega</p>
                                    <p className="text-white font-bold text-sm">Download Digital</p>
                                </div>
                             </div>
                          </div>
                       </div>
                  </div>

                  <div className="bg-zinc-800/50 p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pagamento Online */}
                        <div className="space-y-4">
                            <button 
                                disabled={isSubmitting}
                                onClick={() => handleSubmitRequest('online')}
                                className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                {isSubmitting && paymentMethod === 'online' ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                                Pagar Online (PIX/Cartão)
                            </button>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase text-center">Processado com segurança pelo Mercado Pago</p>
                        </div>

                        {/* Crédito Fidelidade */}
                        <div className="space-y-2">
                            <button 
                                disabled={isSubmitting || !currentCustomer || (currentCustomer.creditLimit || 0) < calculateTotal()}
                                onClick={() => handleSubmitRequest('credit')}
                                className="w-full py-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center gap-4 group transition-all hover:bg-zinc-800 hover:border-primary disabled:opacity-50 disabled:grayscale"
                            >
                                <div className="bg-zinc-800 p-3 rounded-xl group-hover:bg-primary group-hover:text-black transition">
                                    <Wallet size={20} className="text-primary group-hover:text-black" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-white font-black text-xs uppercase tracking-widest">Usar Crédito Fidelidade</span>
                                    <span className="text-[9px] text-zinc-500 font-bold uppercase">Limite disponível: R$ {currentCustomer?.creditLimit?.toFixed(2) || '0.00'}</span>
                                </div>
                            </button>
                            {currentCustomer && (currentCustomer.creditLimit || 0) < calculateTotal() && (
                                <p className="text-red-500 text-[10px] font-black uppercase text-center animate-pulse tracking-widest">Não há limite disponível</p>
                            )}
                        </div>
                      </div>
                  </div>
              </div>

              <button 
                onClick={() => setStep('briefing')}
                className="w-full py-4 text-zinc-600 font-black text-[10px] uppercase tracking-widest hover:text-white transition"
              >
                  Voltar e Editar Briefing
              </button>
           </div>
        )}

        {step === 'completed' && (
          <div className="animate-fade-in py-20 text-center space-y-10">
              <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary/20 blur-[60px] animate-pulse"></div>
                  <div className="relative w-32 h-32 bg-primary rounded-[2.5rem] flex items-center justify-center text-black mx-auto shadow-2xl">
                      <CheckCircle2 size={64} />
                  </div>
              </div>

              <div className="space-y-4">
                  <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">Solicitação Criada!</h2>
                  <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
                      Sua solicitação de montagem de molde foi recebida com sucesso. Reservamos seu crédito fidelidade e nosso time técnico já foi notificado.
                  </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md mx-auto space-y-6">
                   <div className="flex items-center justify-between text-left">
                        <div>
                            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Estimativa de Início</p>
                            <p className="text-white font-bold">Hoje • Em fila</p>
                        </div>
                        <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500">
                            <Hourglass size={24} />
                        </div>
                   </div>
                   <div className="flex items-center justify-between text-left">
                        <div>
                            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Dúvidas?</p>
                            <p className="text-white font-bold">Consulte o Admin</p>
                        </div>
                        <button className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition group">
                            <Phone size={24} />
                        </button>
                   </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
                  <button 
                    onClick={() => navigate('/minha-area')}
                    className="flex-1 py-5 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition"
                  >
                      Ir para Minha Área
                  </button>
                  <button 
                    onClick={() => navigate('/')}
                    className="flex-1 py-5 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition"
                  >
                      Voltar para Home
                  </button>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}
