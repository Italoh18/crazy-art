
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Scissors, Sparkles, MessageSquare, Image as ImageIcon, 
  Upload, HelpCircle, CheckCircle2, CreditCard, Wallet, 
  ArrowRight, Loader2, Info, ChevronRight, X, Phone, Plus, Trash2, FileText, Hourglass, Palette
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
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
  isConjunto?: boolean;
  shortSize?: string;
  shortNumber?: string;
}

export default function MontagemMolde() {
  const navigate = useNavigate();
  const { currentCustomer, role } = useAuth();
  const { orders, loadData } = useData();
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
  const [showMoldesModal, setShowMoldesModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('comum');
  const [activeSubcategory, setActiveSubcategory] = useState('redonda');
  const [activeSize, setActiveSize] = useState('G');

  const { moldes } = useData();

  const categories = [
    { id: 'comum', name: 'Comum', sub: ['redonda', 'V', 'polo'] },
    { id: 'blk-fem', name: 'Blk Fem', sub: ['redonda', 'V', 'polo'] },
    { id: 'raglan', name: 'Raglan', sub: ['redonda', 'V', 'polo'] },
    { id: 'moleton', name: 'Moleton' },
    { id: 'short', name: 'Short' },
    { id: 'calça', name: 'Calça' },
    { id: 'avental', name: 'Avental' },
    { id: 'mascara', name: 'Mascara' }
  ];

  const fullGrade = ['t2', 't4', 't6', 't8', 't10', 't12', 't14', 't16', 'P', 'M', 'G', 'GG', 'XG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'];
  const blkFemGrade = ['P', 'M', 'G', 'GG', 'XG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'];

  const currentGrade = activeCategory === 'blk-fem' ? blkFemGrade : fullGrade;

  const currentMolde = moldes.find(m => 
    m.category === activeCategory && 
    (categories.find(c => c.id === activeCategory)?.sub ? m.subcategory === activeSubcategory : true)
  );

  const measurements = currentMolde?.measurements?.[activeSize] || { height: '-', width: '-', sleeve: '-', shoulder: '-', collar: '-' };

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState<{ code: string, percentage: number } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  
  // Replicas State
  const [hasReplicas, setHasReplicas] = useState(false);
  const [replicas, setReplicas] = useState<RepliaItem[]>([{ id: crypto.randomUUID(), size: '', name: '', number: '', isConjunto: false, shortSize: '', shortNumber: '' }]);

  // Cálculo do Limite Disponível Real (Crédito - Pedidos Abertos)
  const availableCredit = React.useMemo(() => {
    if (!currentCustomer) return 0;
    const openOrdersTotal = orders
      .filter(o => o.client_id === currentCustomer.id && o.status === 'open')
      .reduce((a, o) => a + Number(o.total || 0), 0);
    return Math.max(0, (currentCustomer.creditLimit || 0) - openOrdersTotal);
  }, [currentCustomer, orders]);

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
    setReplicas([...replicas, { id: crypto.randomUUID(), size: '', name: '', number: '', isConjunto: false, shortSize: '', shortNumber: '' }]);
  };

  const handleRemoveReplica = (id: string) => {
    if (replicas.length > 1) {
      setReplicas(replicas.filter(r => r.id !== id));
    }
  };

  const updateReplica = (id: string, field: keyof RepliaItem, value: any) => {
    setReplicas(replicas.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        
        // Herança de número: quando o número da camisa muda, o do short segue se for conjunto
        if (field === 'number' && r.isConjunto) {
          updated.shortNumber = value;
        }
        
        // Quando ativa o conjunto, herda o número que já estiver na camisa
        if (field === 'isConjunto' && value === true) {
          updated.shortNumber = r.number;
        }
        
        return updated;
      }
      return r;
    }));
  };

  const calculateTotal = () => {
    const basePrice = mainService?.price || 0;
    const replicaPrice = replicaService?.price || 0;
    
    // Cada replica marcada como conjunto vale por 2 unidades
    const totalReplicaUnits = hasReplicas 
      ? replicas.reduce((acc, r) => acc + (r.isConjunto ? 2 : 1), 0) 
      : 0;

    return basePrice + (totalReplicaUnits * replicaPrice);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsValidatingCoupon(true);
    setCouponError('');
    
    try {
      const response = await fetch(`/api/coupons?code=${couponCode}`);
      if (!response.ok) {
        throw new Error('Cupom inválido ou expirado');
      }
      const data = await response.json();
      setCouponData(data);
      setCouponError('');
    } catch (err: any) {
      setCouponError(err.message);
      setCouponData(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const calculateFinalPrice = () => {
    const total = calculateTotal();
    if (!couponData) return total;
    return total * (1 - couponData.percentage / 100);
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
        const totalAmount = calculateFinalPrice();
        const totalReplicaUnits = hasReplicas 
          ? replicas.reduce((acc, r) => acc + (r.isConjunto ? 2 : 1), 0) 
          : 0;
        const totalQuantity = 1 + totalReplicaUnits;

        const response = await fetch('/api/layout-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                serviceId: mainService?.id,
                description: `MONTAGEM DE MOLDE:\n${description}\n\nREPLICAS (${replicas.length}):\n${replicas.map(r => `- ${r.size} | ${r.name} | ${r.number}${r.isConjunto ? ` | CONJUNTO: [Short: ${r.shortSize} Nº: ${r.shortNumber}]` : ''}`).join('\n')}`,
                logoUrl: layoutFileUrl, // Reutilizando campo logo_url para o arquivo de layout
                paymentMethod: method,
                value: totalAmount,
                discount: calculateTotal() - totalAmount,
                couponCode: couponData?.code,
                quantity: totalQuantity,
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

        await loadData(true);
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
              
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  se nao houver grade de moldepessoal atrelada ao cadastro usaremos nossa grade padrao
                </p>
                <button 
                  onClick={() => setShowMoldesModal(true)}
                  className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-primary font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
                >
                  <Info size={14} /> ver moldes crazy art
                </button>
              </div>
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
                        category="clientes"
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
                                        className="space-y-4 bg-black/40 p-5 rounded-2xl border border-zinc-800"
                                    >
                                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Item #{index + 1}</span>
                                                <button 
                                                    onClick={() => updateReplica(replica.id, 'isConjunto', !replica.isConjunto)}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2 ${replica.isConjunto ? 'bg-primary text-black' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${replica.isConjunto ? 'bg-black animate-pulse' : 'bg-zinc-700'}`}></div>
                                                    {replica.isConjunto ? 'É Conjunto (Sim)' : 'É Conjunto?'}
                                                </button>
                                            </div>
                                            {replicas.length > 1 && (
                                                <button onClick={() => handleRemoveReplica(replica.id)} className="text-zinc-600 hover:text-red-500 transition">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className={`grid grid-cols-1 ${replica.isConjunto ? 'md:grid-cols-5' : 'md:grid-cols-3'} gap-3`}>
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-zinc-600 font-black uppercase">Tam (Blusa)</p>
                                                <input 
                                                    type="text" value={replica.size} 
                                                    onChange={(e) => updateReplica(replica.id, 'size', e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none" 
                                                    placeholder="G"
                                                />
                                            </div>
                                            <div className="space-y-1 md:col-span-1">
                                                <p className="text-[9px] text-zinc-600 font-black uppercase">Nome / Texto</p>
                                                <input 
                                                    type="text" value={replica.name} 
                                                    onChange={(e) => updateReplica(replica.id, 'name', e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none" 
                                                    placeholder="Nome"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-zinc-600 font-black uppercase">Nº</p>
                                                <input 
                                                    type="text" value={replica.number} 
                                                    onChange={(e) => updateReplica(replica.id, 'number', e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none" 
                                                    placeholder="00"
                                                />
                                            </div>
                                            
                                            {replica.isConjunto && (
                                                <>
                                                    <div className="space-y-1 animate-fade-in">
                                                        <p className="text-[9px] text-primary font-black uppercase">Tam Short</p>
                                                        <input 
                                                            type="text" value={replica.shortSize} 
                                                            onChange={(e) => updateReplica(replica.id, 'shortSize', e.target.value)}
                                                            className="w-full bg-zinc-900 border border-primary/30 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none" 
                                                            placeholder="M"
                                                        />
                                                    </div>
                                                    <div className="space-y-1 animate-fade-in">
                                                        <p className="text-[9px] text-primary font-black uppercase">Nº Short</p>
                                                        <input 
                                                            type="text" value={replica.shortNumber} 
                                                            onChange={(e) => updateReplica(replica.id, 'shortNumber', e.target.value)}
                                                            className="w-full bg-zinc-900 border border-primary/30 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none" 
                                                            placeholder="00"
                                                        />
                                                    </div>
                                                </>
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
                                                {r.size} • {r.name} • {r.number} {r.isConjunto && <span className="text-primary ml-2"> (CONJUNTO: {r.shortSize} • {r.shortNumber})</span>}
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
                                     <div className="flex items-baseline gap-2">
                                        {couponData && (
                                            <span className="text-zinc-500 text-xs line-through">R$ {calculateTotal().toFixed(2)}</span>
                                        )}
                                        <p className="text-xl font-black text-white italic">R$ {calculateFinalPrice().toFixed(2)}</p>
                                     </div>
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

                  <div className="bg-zinc-800/50 p-8 space-y-8">
                    {/* Cupom de Desconto */}
                    <div className="bg-black/40 border border-zinc-800 p-6 rounded-2xl space-y-4">
                        <label className="text-zinc-600 text-[10px] font-black uppercase tracking-widest block">Cupom de Desconto</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="CÓDIGO"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition uppercase"
                                />
                                {couponData && (
                                    <div className="absolute right-3 top-3 text-emerald-500">
                                        <CheckCircle2 size={20} />
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={handleApplyCoupon}
                                disabled={isValidatingCoupon || !couponCode}
                                className="px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold text-xs uppercase hover:bg-zinc-700 transition disabled:opacity-50"
                            >
                                {isValidatingCoupon ? <Loader2 className="animate-spin" size={16} /> : 'Aplicar'}
                            </button>
                        </div>
                        {couponError && <p className="text-red-500 text-[10px] font-bold uppercase">{couponError}</p>}
                        {couponData && <p className="text-emerald-500 text-[10px] font-bold uppercase">Cupom aplicado: {couponData.percentage}% de desconto!</p>}
                    </div>

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
                                disabled={isSubmitting || !currentCustomer || availableCredit < calculateFinalPrice()}
                                onClick={() => handleSubmitRequest('credit')}
                                className="w-full py-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center gap-4 group transition-all hover:bg-zinc-800 hover:border-primary disabled:opacity-50 disabled:grayscale"
                            >
                                <div className="bg-zinc-800 p-3 rounded-xl group-hover:bg-primary group-hover:text-black transition">
                                    <Wallet size={20} className="text-primary group-hover:text-black" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-white font-black text-xs uppercase tracking-widest">Usar Crédito Fidelidade</span>
                                    <span className="text-[9px] text-zinc-500 font-bold uppercase">Limite disponível: R$ {availableCredit.toFixed(2)}</span>
                                </div>
                            </button>
                            {currentCustomer && availableCredit < calculateFinalPrice() && (
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

      <AnimatePresence>
        {showMoldesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoldesModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[700px]"
            >
              <button 
                onClick={() => setShowMoldesModal(false)}
                className="absolute top-6 right-6 z-10 p-2 bg-black/40 text-white rounded-full hover:bg-black transition"
              >
                <X size={20} />
              </button>

              {/* Sidebar - Categories */}
              <div className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col">
                <div className="p-8 border-b border-zinc-800">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Categorias</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        if (cat.sub) setActiveSubcategory(cat.sub[0]);
                        else setActiveSubcategory('');
                      }}
                      className={`w-full text-left px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeCategory === cat.id ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900">
                {/* Header Subcategories */}
                {categories.find(c => c.id === activeCategory)?.sub && (
                  <div className="p-4 bg-black/20 border-b border-zinc-800 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar">
                    {categories.find(c => c.id === activeCategory)?.sub?.map(sub => (
                      <button
                        key={sub}
                        onClick={() => setActiveSubcategory(sub)}
                        className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeSubcategory === sub ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/50'}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  {/* Image View */}
                  <div className="flex-1 p-8 flex items-center justify-center bg-black/20">
                    <div className="relative w-full h-full rounded-3xl border border-zinc-800/50 overflow-hidden bg-black flex items-center justify-center p-4">
                      {currentMolde?.image_url ? (
                        <img src={currentMolde.image_url} alt="Molde" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-zinc-800">
                          <Scissors size={64} />
                          <p className="text-xs font-black uppercase tracking-widest">Sem Imagem</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Measurements Scroll */}
                  <div className="w-full md:w-80 bg-black/40 border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col">
                    <div className="p-6 border-b border-zinc-800 bg-black/20">
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Grade de Medidas (cm)</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {currentGrade.map(size => (
                        <button
                          key={size}
                          onClick={() => setActiveSize(size)}
                          className={`w-full p-4 rounded-2xl border transition-all text-left group ${activeSize === size ? 'bg-zinc-800 border-primary' : 'bg-transparent border-zinc-800/50 hover:border-zinc-700'}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-lg font-black italic ${activeSize === size ? 'text-primary' : 'text-zinc-500'}`}>{size}</span>
                            {activeSize === size && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                          </div>
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div className="flex flex-col">
                              <span className="text-[8px] text-zinc-600 font-black uppercase">Altura</span>
                              <span className={`text-xs font-bold ${activeSize === size ? 'text-white' : 'text-zinc-400'}`}>
                                {currentMolde?.measurements?.[size]?.height || '-'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] text-zinc-600 font-black uppercase">Largura</span>
                              <span className={`text-xs font-bold ${activeSize === size ? 'text-white' : 'text-zinc-400'}`}>
                                {currentMolde?.measurements?.[size]?.width || '-'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] text-zinc-600 font-black uppercase">Manga</span>
                              <span className={`text-xs font-bold ${activeSize === size ? 'text-white' : 'text-zinc-400'}`}>
                                {currentMolde?.measurements?.[size]?.sleeve || '-'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] text-zinc-600 font-black uppercase">Ombro</span>
                              <span className={`text-xs font-bold ${activeSize === size ? 'text-white' : 'text-zinc-400'}`}>
                                {currentMolde?.measurements?.[size]?.shoulder || '-'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] text-zinc-600 font-black uppercase">Gola</span>
                              <span className={`text-xs font-bold ${activeSize === size ? 'text-white' : 'text-zinc-400'}`}>
                                {currentMolde?.measurements?.[size]?.collar || '-'}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
