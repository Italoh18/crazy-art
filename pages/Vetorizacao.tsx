import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Scissors, Sparkles, MessageSquare, Image as ImageIcon, 
  Upload, HelpCircle, CheckCircle2, CreditCard, Wallet, 
  ArrowRight, Loader2, Info, ChevronRight, X, Palette, Hash, Ruler, Vector
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ImageUploadInput } from '../components/ImageUploadInput';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';

type VetorizacaoStep = 'selection' | 'details' | 'summary' | 'completed';

export default function Vetorizacao() {
  const navigate = useNavigate();
  const { currentCustomer, role } = useAuth();
  const { products, orders, loadData } = useData();
  const isAuthenticated = role !== 'guest';
  
  const [step, setStep] = useState<VetorizacaoStep>('selection');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [alterations, setAlterations] = useState('');
  const [keepOriginalColors, setKeepOriginalColors] = useState(true);
  const [colorChanges, setColorChanges] = useState('');
  const [artUrl, setArtUrl] = useState('');
  
  const [showIncompleteError, setShowIncompleteError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'online' | null>(null);

  // Filter products that contain "VETORIZAÇÃO"
  const vetorizacaoItems = useMemo(() => {
    return products.filter(p => 
      p.name.toUpperCase().includes('VETORIZA') || 
      p.description?.toUpperCase().includes('VETORIZA') ||
      p.subcategory?.toUpperCase().includes('VETORIZA')
    );
  }, [products]);

  // Calculation for Real Available Limit
  const availableCredit = useMemo(() => {
    if (!currentCustomer) return 0;
    const openOrdersTotal = orders
      .filter(o => o.client_id === currentCustomer.id && o.status === 'open')
      .reduce((a, o) => a + Number(o.total || 0), 0);
    return Math.max(0, (currentCustomer.creditLimit || 0) - openOrdersTotal);
  }, [currentCustomer, orders]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setStep('details');
    window.scrollTo(0, 0);
  };

  const handleNextToSummary = () => {
    if (!artUrl) {
      setShowIncompleteError(true);
      return;
    }
    setStep('summary');
    window.scrollTo(0, 0);
  };

  const calculateFinalPrice = () => {
    return selectedProduct?.price || 0;
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
        const description = `Vetorização: ${selectedProduct?.name}. Alterações: ${alterations || 'Nenhuma'}. Cores originais: ${keepOriginalColors ? 'Sim' : 'Não'}. ${!keepOriginalColors ? 'Mudanças: ' + colorChanges : ''}`;
        
        const response = await fetch('/api/layout-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                serviceId: selectedProduct?.id,
                description,
                exampleUrl: artUrl,
                paymentMethod: method,
                value: finalPrice,
                type: 'vetorizacao' // Custom flag if needed by backend
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

  return (
    <div className="min-h-screen pb-24 max-w-4xl mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => {
            if (step === 'selection') navigate('/shop');
            else if (step === 'details') setStep('selection');
            else if (step === 'summary') setStep('details');
            else navigate('/shop');
          }}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Vetorização</h1>
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Vetorização profissional de logotipos e artes</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Selecione o tipo de serviço</h2>
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Escolha qual vetorização você deseja solicitar</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {vetorizacaoItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => handleProductSelect(item)}
                        className="group bg-zinc-900/50 border border-zinc-800 p-4 rounded-3xl flex items-center gap-6 hover:border-primary/50 transition-all text-left"
                    >
                        <div className="w-24 h-24 rounded-2xl bg-zinc-800 overflow-hidden shrink-0">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                    <ImageIcon size={32} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic mb-1">{item.name}</h3>
                            <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed mb-2">{item.description || 'Digitalização de arte para vetor com alta precisão.'}</p>
                            <span className="text-primary font-black text-sm">R$ {item.price.toFixed(2)}</span>
                        </div>
                        <ChevronRight className="text-zinc-700 group-hover:text-primary transition-colors" />
                    </button>
                ))}
                {vetorizacaoItems.length === 0 && (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhum serviço de vetorização encontrado no catálogo.</p>
                    </div>
                )}
            </div>
          </motion.div>
        )}

        {step === 'details' && selectedProduct && (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-8">
                <div>
                   <div className="flex items-center gap-2 mb-6">
                      <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">01</span>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Terá alguma alteração?</h3>
                   </div>
                   
                   <div className="grid gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Descreva se precisa de alguma alteração no formato, texto, ou layout na arte (Opcional)</label>
                            <textarea 
                                value={alterations}
                                onChange={(e) => setAlterations(e.target.value)}
                                placeholder="Ex: Mudar a fonte do texto para algo mais moderno, retirar o elemento X..."
                                className="w-full bg-black/60 border border-zinc-800 rounded-2xl p-4 text-white text-sm outline-none focus:border-primary transition h-32 resize-none mt-2"
                            />
                        </div>
                   </div>
                </div>

                <div>
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                         <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">02</span>
                         <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Manter cores originais?</h3>
                      </div>
                      <div className="flex bg-black border border-zinc-800 rounded-xl p-1">
                          <button 
                            onClick={() => setKeepOriginalColors(true)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${keepOriginalColors ? 'bg-primary text-white' : 'text-zinc-500'}`}
                          >
                              SIM
                          </button>
                          <button 
                            onClick={() => setKeepOriginalColors(false)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${!keepOriginalColors ? 'bg-primary text-white' : 'text-zinc-500'}`}
                          >
                              NÃO
                          </button>
                      </div>
                   </div>
                   
                   {!keepOriginalColors && (
                       <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                            <textarea 
                                value={colorChanges}
                                onChange={(e) => setColorChanges(e.target.value)}
                                placeholder="Descreva as mudanças de cores desejadas..."
                                className="w-full bg-black/60 border border-zinc-800 rounded-2xl p-4 text-white text-sm outline-none focus:border-primary transition h-32 resize-none mt-2"
                            />
                       </motion.div>
                   )}
                </div>

                <div>
                   <div className="flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">03</span>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Envie sua arte</h3>
                      <div className="group relative">
                          <div className="p-1.5 bg-zinc-800 rounded-full text-zinc-500 cursor-help">
                              <HelpCircle size={14} />
                          </div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <p className="text-[10px] text-zinc-400 font-bold leading-relaxed uppercase tracking-tight">
                                  Upload Avançado de Arquivos: O campo de upload está configurado para aceitar formatos de design especializados, incluindo PDF, CDR, AI, TIFF, junto com padrão JPG e PNG.
                              </p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-950" />
                          </div>
                      </div>
                   </div>
                   <ImageUploadInput 
                        value={artUrl}
                        onChange={setArtUrl}
                        label="Upload da Arte"
                        placeholder="Link do arquivo ou upload"
                        category="clientes"
                        accept=".pdf,.cdr,.ai,.tiff,.tif,.jpg,.jpeg,.png,application/pdf,image/tiff,image/jpeg,image/png"
                        maxSizeMB={5}
                   />
                   {showIncompleteError && !artUrl && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase tracking-widest">Por favor, envie o arquivo da imagem/logo para vetorizar</p>}
                </div>

                <button 
                  onClick={handleNextToSummary}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  Seguir para Pagamento <ArrowRight size={20} />
                </button>
            </div>
          </motion.div>
        )}

        {step === 'summary' && selectedProduct && (
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
                   Resumo da Vetorização <CheckCircle2 className="text-primary" />
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div>
                         <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block mb-2">Serviço Selecionado</label>
                         <p className="text-xl font-black text-white uppercase">{selectedProduct.name}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block mb-1">Cores Originais</label>
                            <p className="text-white font-bold">{keepOriginalColors ? 'Sim' : 'Não'}</p>
                        </div>
                      </div>

                      {alterations && (
                        <div>
                            <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block mb-2">Alterações Solicitadas</label>
                            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-zinc-300 text-sm italic leading-relaxed">
                                {alterations}
                            </div>
                        </div>
                      )}

                      {!keepOriginalColors && (
                        <div>
                            <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block mb-2">Alterações de Cor</label>
                            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl text-zinc-300 text-sm italic leading-relaxed">
                                {colorChanges || 'Nenhuma alteração descrita'}
                            </div>
                        </div>
                      )}

                      <div className="pt-8 border-t border-zinc-900">
                         <div className="flex justify-between items-center bg-zinc-900/80 p-6 rounded-2xl border border-primary/20">
                            <span className="text-zinc-500 font-black text-xs uppercase">Valor do Serviço</span>
                            <span className="text-3xl font-black text-primary">R$ {calculateFinalPrice().toFixed(2)}</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block">Arquivo Enviado</label>
                      <div className="aspect-video rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
                        {artUrl ? (
                            artUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img src={artUrl} className="w-full h-full object-contain" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-zinc-500">
                                    <Upload size={32} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Documento Enviado</span>
                                    <span className="text-[8px] text-zinc-600 truncate max-w-[150px]">{artUrl.split('/').pop()}</span>
                                </div>
                            )
                        ) : (
                            <div className="text-zinc-700 italic text-[10px]">Não enviado</div>
                        )}
                      </div>
                   </div>
                </div>

                <div className="mt-12 space-y-6">
                   <div className="flex flex-col gap-4">
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
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Vetorização Solicitada!</h2>
                <div className="max-w-xs mx-auto">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                        Sua solicitação de vetorização foi processada com sucesso.
                    </p>
                </div>
             </div>

             <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Status</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">Em Análise</span>
                </div>
                <div className="space-y-2 text-left">
                   <p className="text-zinc-300 text-xs italic">"Em breve você poderá baixar sua arte finalizada em Meus Pedidos."</p>
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
