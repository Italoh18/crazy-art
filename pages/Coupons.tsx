
import React, { useEffect, useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Trash2, Ticket, Percent, Tag, Share2, Copy, Download, X, Mail, MessageCircle, Facebook, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Coupons() {
  const { coupons, loadCoupons, addCoupon, deleteCoupon } = useData();
  const [formData, setFormData] = useState({ code: '', percentage: '', type: 'all' });
  const [sharingCoupon, setSharingCoupon] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
      loadCoupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.percentage) return;

    await addCoupon({
        code: formData.code,
        percentage: parseFloat(formData.percentage),
        type: formData.type
    });
    
    setFormData({ code: '', percentage: '', type: 'all' });
  };

  const getTypeLabel = (type: string) => {
      switch(type) {
          case 'product': return 'Apenas Produtos';
          case 'service': return 'Apenas Serviços';
          case 'art': return 'Artes Prontas';
          case 'all': return 'Todos os Itens';
          default: return type;
      }
  };

  const getBadgeColor = (type: string) => {
      switch(type) {
          case 'product': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
          case 'service': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
          case 'art': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
          default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      }
  };

  const generateCouponImage = (coupon: any): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Fundo Preto
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1000, 1000);

    // Contorno Laranja Interno
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 40;
    const padding = 60;
    ctx.strokeRect(padding, padding, 1000 - padding * 2, 1000 - padding * 2);

    // Texto Central (Cupom)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    
    // Título
    ctx.font = 'bold 60px Inter, sans-serif';
    ctx.fillText('CUPOM DE DESCONTO', 500, 300);

    // Código
    ctx.font = 'bold 180px JetBrains Mono, monospace';
    ctx.fillStyle = '#F97316';
    ctx.fillText(coupon.code, 500, 520);

    // Desconto
    ctx.font = 'bold 100px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${coupon.percentage}% OFF`, 500, 680);

    // Válido Para
    ctx.font = '50px Inter, sans-serif';
    ctx.fillStyle = '#9CA3AF'; // zinc-400
    ctx.fillText('Válido para:', 500, 800);
    
    ctx.font = 'bold 60px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(getTypeLabel(coupon.type).toUpperCase(), 500, 880);

    return canvas.toDataURL('image/png');
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleShare = async (coupon: any, platform: string) => {
    const text = `Use o cupom ${coupon.code} e ganhe ${coupon.percentage}% de desconto na Crazy Art! Válido para ${getTypeLabel(coupon.type).toLowerCase()}. Aproveite: ${window.location.origin}`;
    const title = `Cupom ${coupon.code} - Crazy Art`;
    
    // Para WhatsApp e alguns outros, tentamos o Web Share API se disponível (principalmente Mobile)
    if ((platform === 'whatsapp' || platform === 'native') && navigator.share) {
      try {
        const dataUrl = generateCouponImage(coupon);
        const file = dataURLtoFile(dataUrl, `cupom-${coupon.code}.png`);
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: title,
            text: text,
          });
          return;
        }
      } catch (err) {
        console.error('Erro ao compartilhar via Web Share:', err);
      }
    }

    switch(platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
        break;
      case 'copy':
        try {
          // Tenta copiar imagem e texto se possível (Area de transferência moderna)
          const dataUrl = generateCouponImage(coupon);
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
          ]);
          alert('Imagem do cupom copiada para a área de transferência! Cole no chat desejado.');
        } catch (e) {
          // Fallback para apenas texto
          navigator.clipboard.writeText(coupon.code);
          alert('Código do cupom copiado para a área de transferência!');
        }
        break;
      case 'download':
        const dataUrl = generateCouponImage(coupon);
        const link = document.createElement('a');
        link.download = `cupom-${coupon.code}.png`;
        link.href = dataUrl;
        link.click();
        break;
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in relative">
      <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Ticket size={28} />
          </div>
          <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Gerenciar Cupons</h1>
              <p className="text-zinc-400 text-sm mt-1">Crie códigos de desconto para seus clientes.</p>
          </div>
      </div>

      <div className="bg-surface border border-zinc-800 p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Plus size={18} className="text-primary" /> Novo Cupom
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Código do Cupom</label>
            <div className="relative">
                <input
                type="text"
                placeholder="Ex: PROMO10"
                className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition uppercase font-mono tracking-wider"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
                <Tag className="absolute left-3 top-3.5 text-zinc-500" size={16} />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Desconto (%)</label>
            <div className="relative">
                <input
                type="number"
                placeholder="10"
                min="1"
                max="100"
                className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition font-mono"
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                />
                <Percent className="absolute left-3 top-3.5 text-zinc-500" size={16} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Aplicar em</label>
            <select
                className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition appearance-none cursor-pointer"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
                <option value="all">Toda a Loja</option>
                <option value="product">Apenas Produtos</option>
                <option value="service">Apenas Serviços</option>
                <option value="art">Artes Prontas</option>
            </select>
          </div>

          <button 
            type="submit"
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-600 transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            <span>Criar Cupom</span>
          </button>
        </form>
      </div>

      <div className="bg-surface border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-300 uppercase text-xs font-bold tracking-wider">
                      <tr>
                          <th className="px-6 py-4">Código</th>
                          <th className="px-6 py-4">Desconto</th>
                          <th className="px-6 py-4">Válido Para</th>
                          <th className="px-6 py-4">Criado em</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                      {coupons.length === 0 ? (
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-zinc-600">
                                  <Ticket size={40} className="mx-auto mb-3 opacity-20" />
                                  <p>Nenhum cupom ativo.</p>
                              </td>
                          </tr>
                      ) : (
                          coupons.map((coupon) => (
                              <tr key={coupon.id} className="hover:bg-white/[0.02] transition-colors group">
                                  <td className="px-6 py-4 font-mono text-white font-bold tracking-wider text-lg">
                                      {coupon.code}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-white">
                                      {coupon.percentage}% OFF
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-block px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-wide ${getBadgeColor(coupon.type)}`}>
                                          {getTypeLabel(coupon.type)}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono">
                                      {new Date(coupon.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                          <button 
                                              onClick={() => setSharingCoupon(coupon)}
                                              className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                                              title="Compartilhar Cupom"
                                          >
                                              <Share2 size={18} />
                                          </button>
                                          <button 
                                              onClick={() => deleteCoupon(coupon.id)}
                                              className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                              title="Excluir Cupom"
                                          >
                                              <Trash2 size={18} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Modal de Compartilhamento */}
      <AnimatePresence>
        {sharingCoupon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSharingCoupon(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 blur-[100px] -z-10" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Compartilhar Cupom</h3>
                  <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-bold">Convide seus clientes</p>
                </div>
                <button 
                  onClick={() => setSharingCoupon(null)}
                  className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Preview Card */}
              <div className="aspect-square w-full bg-black border-2 border-primary/30 rounded-2xl p-6 flex flex-col items-center justify-center relative shadow-inner overflow-hidden mb-8 group cursor-pointer"
                   onClick={() => handleShare(sharingCoupon, 'download')}>
                 <div className="absolute inset-4 border border-primary/20 rounded-xl" />
                 <Ticket className="text-primary/10 absolute -right-4 -bottom-4 w-32 h-32 rotate-12" />
                 
                 <div className="text-center relative z-10 w-full px-4">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">Cupom de Desconto</p>
                    <h4 className="text-5xl font-black text-primary font-mono tracking-tighter mb-2">{sharingCoupon.code}</h4>
                    <div className="h-px w-12 bg-zinc-800 mx-auto my-4" />
                    <p className="text-3xl font-bold text-white mb-2">{sharingCoupon.percentage}% OFF</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Válido para: <span className="text-zinc-300 font-bold">{getTypeLabel(sharingCoupon.type)}</span></p>
                 </div>

                 <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <div className="bg-primary text-white p-3 rounded-full shadow-lg scale-90 group-hover:scale-100 transition duration-300">
                        <Download size={24} />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleShare(sharingCoupon, 'whatsapp')}
                  className="flex items-center gap-3 p-4 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] rounded-2xl hover:bg-[#25D366]/20 transition font-bold text-sm"
                >
                  <MessageCircle size={20} />
                  WhatsApp
                </button>
                <button 
                  onClick={() => handleShare(sharingCoupon, 'facebook')}
                  className="flex items-center gap-3 p-4 bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] rounded-2xl hover:bg-[#1877F2]/20 transition font-bold text-sm"
                >
                  <Facebook size={20} />
                  Facebook
                </button>
                <button 
                  onClick={() => handleShare(sharingCoupon, 'email')}
                  className="flex items-center gap-3 p-4 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-2xl hover:bg-zinc-700 transition font-bold text-sm"
                >
                  <Mail size={20} />
                  E-mail
                </button>
                <button 
                  onClick={() => handleShare(sharingCoupon, 'copy')}
                  className="flex items-center gap-3 p-4 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-2xl hover:bg-zinc-700 transition font-bold text-sm"
                >
                  <Copy size={20} />
                  Copiar
                </button>
                <button 
                  onClick={() => handleShare(sharingCoupon, 'download')}
                  className="col-span-2 flex items-center justify-center gap-3 p-4 bg-primary text-white rounded-2xl hover:bg-amber-600 transition font-bold shadow-lg shadow-primary/20"
                >
                  <Download size={20} />
                  Baixar Cartão de Cupom (PNG)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
