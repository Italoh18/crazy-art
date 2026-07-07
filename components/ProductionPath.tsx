import React from 'react';
import { Hourglass, RotateCw, CheckCircle2, Circle, X, CloudDownload, ExternalLink } from 'lucide-react';
import { Order, ProductionStep } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductionPathProps {
  order: Order;
  isCompact?: boolean;
  onStepClick?: (order: Order, stepId: ProductionStep) => void;
}

const STEPS: { id: ProductionStep; label: string }[] = [
  { id: 'production', label: 'Em Produção' },
  { id: 'approval', label: 'Em Aprovação' },
  { id: 'finishing', label: 'Finalizando' },
  { id: 'completed', label: 'Concluído' }
];

export const ProductionPath: React.FC<ProductionPathProps> = ({ order, isCompact = false, onStepClick }) => {
  const { updateProductionStep, updateOrder } = useData();
  const { role } = useAuth();
  const [hoveredStep, setHoveredStep] = React.useState<ProductionStep | null>(null);
  const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = React.useState(false);

  const currentStep = order.production_step || 'production';
  const orderId = order.id;
  const orderSource = order.source;

  const getStepIndex = (step: ProductionStep) => STEPS.findIndex(s => s.id === step);
  const currentIndex = getStepIndex(currentStep);

  const getAttachments = () => {
    const parts = order.description ? order.description.split('\n\n--- IMAGENS EXTRAS ---\n') : [];
    const extraImagesList = parts[1] ? parts[1].split(',').filter(Boolean) : [];

    const list: { label: string; url: string }[] = [];
    
    if ((order as any).example_url) {
      list.push({ label: 'Referência / Exemplo', url: (order as any).example_url });
    }
    if ((order as any).logo_url) {
      list.push({ label: 'Logo / Arquivo Base', url: (order as any).logo_url });
    }
    if ((order as any).first_art_link) {
      list.push({ label: 'Arte Principal', url: (order as any).first_art_link });
    }
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, idx) => {
        if (item.art_link && item.art_link !== (order as any).first_art_link) {
          list.push({ label: `Arte do Item ${idx + 1}`, url: item.art_link });
        }
      });
    }
    extraImagesList.forEach((url, idx) => {
      list.push({ label: `Imagem Extra ${idx + 1}`, url });
    });

    return {
      description: parts[0] || order.description || 'Sem descrição',
      attachments: list
    };
  };

  const handleStepClick = async (stepId: ProductionStep, index: number) => {
    if (role === 'admin' && stepId === 'production') {
      setIsAttachmentsModalOpen(true);
      return;
    }

    if (onStepClick) {
      onStepClick(order, stepId);
      return;
    }

    if (role === 'admin') {
      if (stepId === 'approval' || stepId === 'completed') {
        alert(`Para colocar em aprovação ou concluir este pedido com anexo de arte, faça-o através da tela de Pedidos.`);
        return;
      }
      await updateProductionStep(orderId, stepId);
    }
  };

  const renderTooltip = (stepId: ProductionStep) => {
    if (stepId === 'production') {
      const displayImage = (order as any).first_art_link || order.items?.find(it => it.art_link)?.art_link || (order as any).logo_url;
      const { description: cleanDesc } = getAttachments();
      
      return (
        <div className="p-3 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Arte do Pedido</div>
          {displayImage ? (
            <img src={displayImage} alt="Arte" className="w-full aspect-square object-cover rounded-lg mb-2" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full aspect-square bg-black rounded-lg mb-2 flex items-center justify-center text-zinc-700 text-[10px]">Sem imagem</div>
          )}
          <p className="text-[10px] text-zinc-400 line-clamp-3 leading-relaxed">
            {order.source === 'montagem_molde' ? 'Montagem de Molde (veja detalhes no ícone olho)' : cleanDesc}
          </p>
        </div>
      );
    }
    
    if (stepId === 'finishing' && order.change_request_desc) {
      return (
        <div className="p-3 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Alteração Solicitada</div>
          {order.change_request_image_url && (
            <img src={order.change_request_image_url} alt="Referência" className="w-full aspect-square object-cover rounded-lg mb-2" referrerPolicy="no-referrer" />
          )}
          <p className="text-[10px] text-zinc-400 leading-relaxed italic">"{order.change_request_desc}"</p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className={`flex items-center ${isCompact ? 'gap-1' : 'gap-4'}`}>
      {STEPS.map((step, index) => {
        const isPast = index < currentIndex || (currentStep === 'completed');
        const isCurrent = index === currentIndex && currentStep !== 'completed';
        const isFuture = index > currentIndex && currentStep !== 'completed';
        const isLayoutPending = (orderSource === 'layout_simples' || orderSource === 'montagem_molde') && step.id === 'production' && currentStep === 'production';

        let icon = <Circle size={isCompact ? 12 : 16} />;
        let iconClass = "text-zinc-700";
        let containerClass = "border-zinc-800 bg-zinc-900/50";

        if (isPast) {
          icon = <CheckCircle2 size={isCompact ? 12 : 16} />;
          iconClass = "text-emerald-500";
          containerClass = "border-emerald-500/30 bg-emerald-500/10";
        } else if (isCurrent) {
          if (step.id === 'production') {
            icon = <Hourglass size={isCompact ? 12 : 16} className="animate-spin" />;
          } else {
            icon = <RotateCw size={isCompact ? 12 : 16} className="animate-spin" />;
          }
          
          if (isLayoutPending) {
            iconClass = "text-amber-500";
            containerClass = "border-amber-500 bg-amber-500/20 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]";
          } else {
            iconClass = "text-blue-500";
            containerClass = "border-blue-500/50 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
          }
        }

        const canClick = (role === 'admin');

        return (
          <React.Fragment key={step.id}>
            <div 
              className="relative"
              onMouseEnter={() => setHoveredStep(step.id)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <div 
                className={`flex flex-col items-center gap-1 group ${canClick ? 'cursor-pointer' : ''}`}
                onClick={() => canClick && handleStepClick(step.id, index)}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all ${containerClass} ${canClick ? 'hover:scale-110 active:scale-95' : ''}`}>
                  <span className={iconClass}>{icon}</span>
                </div>
                {!isCompact && (
                  <span className={`text-[8px] uppercase font-bold tracking-tighter transition-colors ${isCurrent ? 'text-blue-400' : isPast ? 'text-emerald-500' : 'text-zinc-600'}`}>
                    {step.label}
                  </span>
                )}
              </div>

              <AnimatePresence>
                {hoveredStep === step.id && renderTooltip(step.id) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[60]"
                  >
                    {renderTooltip(step.id)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`h-[1px] ${isCompact ? 'w-1 sm:w-2' : 'w-2 sm:w-4'} ${isPast ? 'bg-emerald-500/30' : 'bg-zinc-800'}`} />
            )}
          </React.Fragment>
        );
      })}

      {/* Modal de Anexos do Pedido para Admin */}
      <AnimatePresence>
        {isAttachmentsModalOpen && (
          <div className="fixed inset-0 z-[200] flex justify-center items-center bg-black/85 backdrop-blur-md p-4" onClick={(e) => e.stopPropagation()}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121215] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative text-left"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight uppercase">Anexos e Briefing</h2>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">Pedido #{order.order_number}</p>
                </div>
                <button 
                  onClick={() => setIsAttachmentsModalOpen(false)} 
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all border border-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Descrição / Briefing */}
              <div className="space-y-2 bg-black/40 border border-white/5 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Descrição do Pedido</span>
                <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed italic">
                  "{getAttachments().description}"
                </p>
              </div>

              {/* Visualização de Todos os Anexos */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Imagens / Arquivos Anexados ({getAttachments().attachments.length})</span>
                
                {getAttachments().attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[280px] overflow-y-auto p-1 custom-scrollbar">
                    {getAttachments().attachments.map((file, idx) => (
                      <div key={idx} className="bg-zinc-900/50 border border-white/5 p-3 rounded-2xl flex flex-col items-center space-y-2 group relative">
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-black/40 flex items-center justify-center border border-white/5 relative">
                          <img 
                            src={file.url} 
                            alt={file.label} 
                            className="max-w-full max-h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <a 
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 rounded-xl"
                          >
                            <ExternalLink size={18} />
                          </a>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight text-center truncate w-full">{file.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-800 text-center text-zinc-600 text-xs">
                    Nenhum arquivo anexado a este pedido.
                  </div>
                )}
              </div>

              {/* Botões de Ações */}
              <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                <button
                  type="button"
                  onClick={() => setIsAttachmentsModalOpen(false)}
                  className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl font-bold text-xs uppercase border border-white/5 transition"
                >
                  Fechar
                </button>
                {getAttachments().attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const urls = getAttachments().attachments.map(a => a.url);
                      for (let i = 0; i < urls.length; i++) {
                        const url = urls[i];
                        if (!url) continue;
                        try {
                          const a = document.createElement('a');
                          a.href = url;
                          a.target = '_blank';
                          a.download = `crazyart-${order.order_number}-anexo-${i + 1}`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          await new Promise(resolve => setTimeout(resolve, 350));
                        } catch (err) {
                          console.error("Erro ao baixar anexo:", url, err);
                        }
                      }
                    }}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-2 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/20 active:scale-95"
                  >
                    <CloudDownload size={15} />
                    Baixar Tudo
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
