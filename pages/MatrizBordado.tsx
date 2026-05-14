
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Scissors, Sparkles, MessageSquare, Image as ImageIcon, 
  Upload, HelpCircle, CheckCircle2, CreditCard, Wallet, 
  ArrowRight, Loader2, Info, ChevronRight, X, Palette, Hash, Ruler
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ImageUploadInput } from '../components/ImageUploadInput';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';

type MatrizStep = 'selection' | 'details' | 'summary' | 'completed';

export default function MatrizBordado() {
  const navigate = useNavigate();
  const { currentCustomer, role } = useAuth();
  const { products, orders, loadData } = useData();
  const isAuthenticated = role !== 'guest';
  
  const [step, setStep] = useState<MatrizStep>('selection');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [keepOriginalColors, setKeepOriginalColors] = useState(true);
  const [colorChanges, setColorChanges] = useState('');
  const [artUrl, setArtUrl] = useState('');
  
  const [showIncompleteError, setShowIncompleteError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'online' | null>(null);
  const [isAnalyzingColors, setIsAnalyzingColors] = useState(false);
  const [analyzedColorCount, setAnalyzedColorCount] = useState<number | ''>('');
  const [analyzedColors, setAnalyzedColors] = useState<string[]>([]);

  useEffect(() => {
    if(artUrl) {
       if(artUrl.endsWith('.pdf') || artUrl.includes('application/pdf') || artUrl.includes('.cdr') || artUrl.includes('.ai') || artUrl.includes('.tiff') || artUrl.includes('.tif')) {
          setAnalyzedColorCount('');
          setAnalyzedColors([]);
          return;
       }
       setIsAnalyzingColors(true);
       
       const img = new Image();
       img.crossOrigin = 'Anonymous';
       img.onload = () => {
             const canvas = document.createElement('canvas');
             const ctx = canvas.getContext('2d', { willReadFrequently: true });
             if(!ctx) { 
               setIsAnalyzingColors(false);
               return; 
             }
             const maxDim = 400; 
             let w = img.width;
             let h = img.height;
             if(w > maxDim || h > maxDim) {
                 const ratio = Math.min(maxDim/w, maxDim/h);
                 w = Math.floor(w * ratio);
                 h = Math.floor(h * ratio);
             }
             canvas.width = w;
             canvas.height = h;
             ctx.drawImage(img, 0, 0, w, h);
             const imageData = ctx.getImageData(0, 0, w, h);
             const pixels = imageData.data;
             
             const colorsFreq: Record<string, number> = {};
             for(let i = 0; i < pixels.length; i += 4) {
                 if(pixels[i+3] > 10) {
                     const qr = Math.floor(pixels[i] / 32) * 32;
                     const qg = Math.floor(pixels[i+1] / 32) * 32;
                     const qb = Math.floor(pixels[i+2] / 32) * 32;
                     const key = `${qr},${qg},${qb}`;
                     colorsFreq[key] = (colorsFreq[key] || 0) + 1;
                 }
             }
             
             const sortedColors = Object.keys(colorsFreq).sort((a,b) => colorsFreq[b] - colorsFreq[a]);
             // Assuming the most frequent color is the background, skip it if there's more than one color
             const actualColors = sortedColors.length > 1 ? sortedColors.slice(1) : sortedColors;
             const hexColors = actualColors.map(c => {
                 const [r, g, b] = c.split(',').map(Number);
                 const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
                 return hex(r + 16 > 255 ? 255 : r + 16, g + 16 > 255 ? 255 : g + 16, b + 16 > 255 ? 255 : b + 16);
             });
             
             let count = sortedColors.length - 1;
             if(count < 1) count = 1;
             
             setAnalyzedColorCount(count);
             setAnalyzedColors(hexColors);
             setIsAnalyzingColors(false);
       };
       img.onerror = () => {
           setIsAnalyzingColors(false);
       };
       // Use proxy for analysis to avoid CORS tainted canvas when fetching from custom R2 domain
       img.src = `/api/proxy-image?url=${encodeURIComponent(artUrl)}`;
    } else {
       setAnalyzedColorCount('');
       setAnalyzedColors([]);
    }
  }, [artUrl]);

  // Filter specific embroidery service names
  const embroideryItems = useMemo(() => {
    const allowedNames = [
      "MATRIZ BÁSICA",
      "MATRIZ INTERMEDIARIA",
      "MATRIZ AVANÇADA",
      "MATRIZ PROFISSIONAL"
    ];
    return products
      .filter(p => allowedNames.includes(p.name.toUpperCase()))
      .sort((a, b) => allowedNames.indexOf(a.name.toUpperCase()) - allowedNames.indexOf(b.name.toUpperCase()));
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
    if (!width || !height || !artUrl) {
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
        const colorDesc = analyzedColorCount !== '' ? ` Quantidade de cores: ${analyzedColorCount}.` : '';
        const description = `Matriz de Bordado: ${selectedProduct?.name}. Tamanho: ${width}x${height}cm. Cores originais: ${keepOriginalColors ? 'Sim' : 'Não'}. ${!keepOriginalColors ? 'Mudanças: ' + colorChanges : ''}${colorDesc}`;
        
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
                type: 'matriz_bordado' // Custom flag if needed by backend
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
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Matriz de Bordado</h1>
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Digitalização profissional para sua máquina</p>
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
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Escolha qual matriz você deseja solicitar</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {embroideryItems.map(item => (
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
                            <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed mb-2">{item.description || 'Digitalização de matriz com alta precisão.'}</p>
                            <span className="text-primary font-black text-sm">R$ {item.price.toFixed(2)}</span>
                        </div>
                        <ChevronRight className="text-zinc-700 group-hover:text-primary transition-colors" />
                    </button>
                ))}
                {embroideryItems.length === 0 && (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhum serviço de bordado encontrado no catálogo.</p>
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
                      <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Qual tamanho deseja para a matriz?</h3>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Largura (cm)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={width} 
                                    onChange={(e) => setWidth(e.target.value)}
                                    placeholder="Ex: 10" 
                                    className={`w-full bg-black/60 border ${showIncompleteError && !width ? 'border-red-500' : 'border-zinc-800'} rounded-2xl p-4 text-white text-sm outline-none focus:border-primary transition`}
                                />
                                <Ruler className="absolute right-4 top-4 text-zinc-700" size={18} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Altura (cm)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={height} 
                                    onChange={(e) => setHeight(e.target.value)}
                                    placeholder="Ex: 8" 
                                    className={`w-full bg-black/60 border ${showIncompleteError && !height ? 'border-red-500' : 'border-zinc-800'} rounded-2xl p-4 text-white text-sm outline-none focus:border-primary transition`}
                                />
                                <Ruler className="absolute right-4 top-4 text-zinc-700" size={18} />
                            </div>
                        </div>
                   </div>
                </div>

                <div>
                   <div className="flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">02</span>
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
                        label="Upload da Arte (Referência para Matriz)"
                        placeholder="Link do arquivo ou upload"
                        category="clientes"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        maxSizeMB={5}
                   />
                   {showIncompleteError && !artUrl && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase tracking-widest">Por favor, envie o arquivo da matriz</p>}
                   
                   {isAnalyzingColors && (
                       <div className="mt-6 flex flex-col items-center justify-center gap-3 p-8 border border-dashed border-primary/50 bg-primary/5 rounded-2xl">
                           <Loader2 className="animate-spin text-primary" size={32} />
                           <p className="text-primary font-bold uppercase tracking-widest text-xs">Analisando cores da imagem...</p>
                       </div>
                   )}

                   {!isAnalyzingColors && artUrl && (
                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
                           <div className="aspect-video w-full rounded-2xl bg-black border border-zinc-800 flex items-center justify-center overflow-hidden relative">
                               {artUrl.includes('.pdf') || artUrl.includes('application/pdf') || artUrl.includes('.cdr') || artUrl.includes('.ai') ? (
                                   <div className="flex flex-col items-center text-zinc-500 p-8">
                                       <ImageIcon size={48} className="mb-2 opacity-50" />
                                       <span className="text-[10px] uppercase font-bold tracking-widest">Arquivo não visualizável</span>
                                   </div>
                               ) : (
                                   <img src={artUrl} className="w-full h-full object-contain" />
                               )}
                           </div>
                       </motion.div>
                   )}
                </div>

                <div>
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                         <span className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-black text-sm italic">03</span>
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

                   {analyzedColorCount !== '' && (
                       <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-6 flex flex-col gap-3">
                           <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Essa é a quantidade de cores correta do projeto?</label>
                           <div className="relative">
                               <input 
                                   type="number"
                                   value={analyzedColorCount}
                                   onChange={(e) => setAnalyzedColorCount(e.target.value === '' ? '' : Number(e.target.value))}
                                   className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none focus:border-primary transition pl-10"
                               />
                               <Palette className="absolute left-3 top-3.5 text-zinc-700" size={16} />
                           </div>
                           
                           {analyzedColors.length > 0 && (
                               <div className="mt-2">
                                   <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-2 block">Tabela de cores identificadas</label>
                                   <div className="flex flex-wrap gap-2">
                                       {analyzedColors.map((hex, idx) => (
                                           <div key={idx} className="w-8 h-8 rounded-full border-2 border-zinc-800 shadow-sm" style={{ backgroundColor: hex }} title={hex} />
                                       ))}
                                   </div>
                               </div>
                           )}
                       </div>
                   )}
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
                   Resumo da Matriz <CheckCircle2 className="text-primary" />
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div>
                         <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block mb-2">Serviço Selecionado</label>
                         <p className="text-xl font-black text-white uppercase">{selectedProduct.name}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block mb-1">Tamanho</label>
                            <p className="text-white font-bold">{width} x {height} cm</p>
                        </div>
                        <div>
                            <label className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest block mb-1">Cores Originais</label>
                            <p className="text-white font-bold">{keepOriginalColors ? 'Sim' : 'Não'}</p>
                        </div>
                      </div>

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
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Matriz Solicitada!</h2>
                <div className="max-w-xs mx-auto">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                        Sua solicitação de matriz de bordado foi processada com sucesso.
                    </p>
                </div>
             </div>

             <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Status</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">Em Análise</span>
                </div>
                <div className="space-y-2 text-left">
                   <p className="text-zinc-300 text-xs italic">"Em breve você poderá baixar sua matriz finalizada em Meus Pedidos."</p>
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
