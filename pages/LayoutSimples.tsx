
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Layers, Sparkles, MessageSquare, Image as ImageIcon, 
  Upload, HelpCircle, CheckCircle2, CreditCard, Wallet, 
  ArrowRight, Loader2, Info, ChevronRight, X, Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

type LayoutStep = 'briefing' | 'summary' | 'completed';

export default function LayoutSimples() {
  const navigate = useNavigate();
  const { currentCustomer, role } = useAuth();
  const { orders, loadData } = useData();
  const isAuthenticated = role !== 'guest';
  
  const [step, setStep] = useState<LayoutStep>('briefing');
  const [service, setService] = useState<CatalogService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Briefing State
  const [description, setDescription] = useState('');
  const [exampleUrl, setExampleUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  const [showIncompleteError, setShowIncompleteError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'online' | null>(null);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState<{ code: string, percentage: number } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Cálculo do Limite Disponível Real (Crédito - Pedidos Abertos)
  const availableCredit = React.useMemo(() => {
    if (!currentCustomer) return 0;
    const openOrdersTotal = orders
      .filter(o => o.client_id === currentCustomer.id && o.status === 'open')
      .reduce((a, o) => a + Number(o.total || 0), 0);
    return Math.max(0, (currentCustomer.creditLimit || 0) - openOrdersTotal);
  }, [currentCustomer, orders]);

  useEffect(() => {
    fetchService();
  }, []);

  const fetchService = async () => {
    try {
      const response = await fetch('/api/catalog?type=service');
      const data = await response.json();
      const layoutService = data.find((s: any) => s.name.toLowerCase().includes('layout simples'));
      
      if (layoutService) {
        setService(layoutService);
      }
    } catch (err) {
      console.error('Erro ao buscar serviço:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextToSummary = () => {
    if (!description.trim()) {
      setShowIncompleteError(true);
      return;
    }
    setStep('summary');
    window.scrollTo(0, 0);
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
    const basePrice = service?.price || 0;
    if (!couponData) return basePrice;
    return basePrice * (1 - couponData.percentage / 100);
  };

  const handleSubmitRequest = async (method: 'credit' | 'online') => {
    if (!isAuthenticated) {
        alert('Você precisa estar logado para finalizar a solicitação.');
        return;
    }

    const finalPrice = calculateFinalPrice();
    setIsSubmitting(true);
    setPaymentMethod(method);

    try {
        const response = await fetch('/api/layout-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                serviceId: service?.id,
                description,
                exampleUrl,
                logoUrl,
                paymentMethod: method,
                value: finalPrice,
                discount: (service?.price || 0) - finalPrice,
                couponCode: couponData?.code
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao processar solicitação');
        }

        if (method === 'online' && data.checkoutUrl) {
            window.open(data.checkoutUrl, '_blank');
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="p-4 bg-zinc-900 rounded-full text-zinc-500">
           <Layers size={48} />
        </div>
        <h2 className="text-2xl font-black text-white uppercase italic">Serviço não encontrado</h2>
        <p className="text-zinc-500 max-w-xs">O serviço "Layout Simples" não está cadastrado no catálogo.</p>
        <button onClick={() => navigate('/shop')} className="px-6 py-3 bg-primary text-white rounded-xl font-bold uppercase text-xs">Voltar à Loja</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 max-w-4xl mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => step === 'briefing' ? navigate('/shop') : setStep('briefing')}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Layout Simples</h1>
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Seu briefing direto ao ponto</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'briefing' && (
          <motion.div 
            key="briefing"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Service Banner */}
            <div className="relative h-48 rounded-3xl overflow-hidden group">
               <img src={service.imageUrl} className="w-full h-full object-cover brightness-50" alt={service.name} />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">{service.name}</h2>
                  <p className="text-primary font-black text-xl">R$ {service.price.toFixed(2)}</p>
               </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="relative group">
                    <button className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center gap-2 text-zinc-600 cursor-not-allowed grayscale">
                        <div className="bg-zinc-800 p-3 rounded-xl">
                            <Sparkles size={24} />
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest">Montar Arte</span>
                        <span className="text-[10px] font-bold text-zinc-500">(EM BREVE)</span>
                    </button>
                    <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-zinc-600 uppercase font-bold whitespace-nowrap">Para quem quer mais agilidade</p>
               </div>
               
               <button 
                  onClick={() => document.getElementById('briefing-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full bg-primary/10 border border-primary/20 p-6 rounded-2xl flex flex-col items-center gap-2 text-primary hover:bg-primary/20 transition-all duration-300"
               >
                    <div className="bg-primary p-3 rounded-xl text-white">
                        <MessageSquare size={24} />
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest">Solicitar Arte</span>
                    <span className="text-[10px] font-bold text-primary/70">Briefing Personalizado</span>
               </button>
            </div>

            {/* Briefing Form */}
            <div id="briefing-form" className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-8 mt-10">
               <div>
                  <div className="flex items-center gap-2 mb-4">
                     <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">01</span>
                     <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Fala o que você precisa</h3>
                  </div>
                  <textarea 
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        if (showIncompleteError) setShowIncompleteError(false);
                    }}
                    placeholder="Ex: Gostaria de uma arte para camiseta de formatura, curso Direito, com os nomes nas costas..."
                    className={`w-full bg-black/60 border ${showIncompleteError && !description ? 'border-red-500' : 'border-zinc-800'} rounded-2xl p-6 text-white text-sm outline-none focus:border-primary transition h-40 resize-none`}
                  />
                  {showIncompleteError && !description && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase tracking-widest animate-pulse">Por favor, descreva o que você precisa</p>}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">02</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Tem um exemplo?</h3>
                    </div>
                    <ImageUploadInput 
                        value={exampleUrl}
                        onChange={setExampleUrl}
                        label="Upload de Referência (PNG, JPG, WEBP)"
                        placeholder="Link da imagem ou upload"
                        category="clientes"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">03</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Envie sua logo</h3>
                        <div className="group relative">
                            <div className="p-1.5 bg-zinc-800 rounded-full text-zinc-500 cursor-help">
                                <HelpCircle size={14} />
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <p className="text-[10px] text-zinc-400 font-bold leading-relaxed uppercase tracking-tight">Criação de logo é um serviço diferente ao layout e não está incluso na criação do layout.</p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-950" />
                            </div>
                        </div>
                    </div>
                    <ImageUploadInput 
                        value={logoUrl}
                        onChange={setLogoUrl}
                        label="Upload da sua Logo (Opcional)"
                        placeholder="Link da logo ou upload"
                        category="clientes"
                    />
                  </div>
               </div>

               <button 
                  onClick={handleNextToSummary}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
               >
                  Finalizar Solicitação <ArrowRight size={20} />
               </button>
            </div>
          </motion.div>
        )}

        {step === 'summary' && (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
             <div className="bg-zinc-950 border border-zinc-800 rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10" />
                
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8 flex items-center gap-4">
                   Resumo do Pedido <CheckCircle2 className="text-primary" />
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div>
                         <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block mb-2">Serviço</label>
                         <p className="text-xl font-black text-white uppercase">{service.name}</p>
                      </div>
                      
                      <div>
                         <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block mb-2">O que você precisa</label>
                         <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-zinc-300 text-sm italic leading-relaxed">
                            {description}
                         </div>
                      </div>

                      <div className="pt-8 border-t border-zinc-900">
                         <div className="flex justify-between items-center bg-zinc-900/80 p-6 rounded-2xl border border-primary/20">
                            <span className="text-zinc-500 font-black text-xs uppercase">Valor do Serviço</span>
                            <div className="text-right">
                                {couponData && (
                                    <span className="block text-[10px] text-zinc-500 font-bold line-through">R$ {service.price.toFixed(2)}</span>
                                )}
                                <span className="text-3xl font-black text-primary">R$ {calculateFinalPrice().toFixed(2)}</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl space-y-4">
                        <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block">Cupom de Desconto</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="CÓDIGO"
                                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition uppercase"
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

                      <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block">Arquivos Enviados</label>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <p className="text-[10px] text-zinc-500 font-bold uppercase text-center">Exemplo</p>
                             <div className="aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                                {exampleUrl ? <img src={exampleUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700 italic text-[10px]">Não enviado</div>}
                             </div>
                         </div>
                         <div className="space-y-2">
                             <p className="text-[10px] text-zinc-500 font-bold uppercase text-center">Sua Logo</p>
                             <div className="aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                                {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700 italic text-[10px]">Não enviado</div>}
                             </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-12 space-y-6">
                   <div className="flex flex-col gap-4">
                      {/* Crédito Fidelidade */}
                      <div className="space-y-2">
                        <button 
                            disabled={isSubmitting || !currentCustomer || availableCredit < calculateFinalPrice()}
                            onClick={() => handleSubmitRequest('credit')}
                            className="w-full py-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center gap-4 group transition-all hover:bg-zinc-800 hover:border-primary disabled:opacity-50 disabled:grayscale"
                        >
                            <Wallet className="text-primary" size={24} />
                            <div className="text-left">
                                <span className="block text-white font-black text-xs uppercase tracking-widest">Adicionar ao Crédito Fidelidade</span>
                                <span className="text-[9px] text-zinc-500 font-bold uppercase">Limite disponível: R$ {availableCredit.toFixed(2)}</span>
                            </div>
                        </button>
                        {currentCustomer && availableCredit < calculateFinalPrice() && (
                            <p className="text-red-500 text-[10px] font-black uppercase text-center animate-pulse tracking-widest">Não há limite disponível</p>
                        )}
                      </div>

                      <button 
                        disabled={isSubmitting}
                        onClick={() => handleSubmitRequest('online')}
                        className="w-full py-5 bg-primary text-white rounded-2xl flex items-center justify-center gap-4 transition-transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20"
                      >
                         {isSubmitting && paymentMethod === 'online' ? <Loader2 className="animate-spin" size={24} /> : <CreditCard size={24} />}
                         <span className="font-black text-xs uppercase tracking-widest">Pagar Agora</span>
                      </button>
                   </div>
                </div>
             </div>
          </motion.div>
        )}

        {step === 'completed' && (
          <motion.div 
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-8"
          >
             <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-[60px] rounded-full" />
                <div className="bg-green-500 text-black w-24 h-24 rounded-full flex items-center justify-center relative shadow-2xl shadow-green-500/40">
                   <CheckCircle2 size={48} />
                </div>
             </div>

             <div className="space-y-4">
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Pedido Confirmado!</h2>
                <div className="max-w-xs mx-auto">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                        Sua solicitação de layout foi processada e já está com nossa equipe.
                    </p>
                </div>
             </div>

             <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Status do Pedido</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">Aberto</span>
                </div>
                <div className="space-y-2 text-left">
                   <p className="text-zinc-300 text-xs italic">"Em breve entraremos em contato via WhatsApp ou e-mail com a primeira prévia do seu layout."</p>
                </div>
             </div>

             <div className="flex gap-4">
                <button 
                  onClick={() => navigate('/my-orders')}
                  className="px-8 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition"
                >
                  Meus Pedidos
                </button>
                <button 
                  onClick={() => navigate('/shop')}
                  className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition"
                >
                  Voltar à Loja
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
