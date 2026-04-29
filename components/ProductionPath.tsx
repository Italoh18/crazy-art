
import React from 'react';
import { Hourglass, RotateCw, CheckCircle2, Circle } from 'lucide-react';
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

  const currentStep = order.production_step || 'production';
  const orderId = order.id;
  const orderSource = order.source;

  const getStepIndex = (step: ProductionStep) => STEPS.findIndex(s => s.id === step);
  const currentIndex = getStepIndex(currentStep);

  const handleStepClick = async (stepId: ProductionStep, index: number) => {
    if (onStepClick) {
      onStepClick(order, stepId);
      return;
    }

    if (role === 'admin') {
      await updateProductionStep(orderId, stepId);
    }
  };

  const renderTooltip = (stepId: ProductionStep) => {
    if (stepId === 'production') {
      const displayImage = (order as any).first_art_link || order.items?.find(it => it.art_link)?.art_link || (order as any).logo_url;
      
      return (
        <div className="p-3 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Arte do Pedido</div>
          {displayImage ? (
            <img src={displayImage} alt="Arte" className="w-full aspect-square object-cover rounded-lg mb-2" />
          ) : (
            <div className="w-full aspect-square bg-black rounded-lg mb-2 flex items-center justify-center text-zinc-700 text-[10px]">Sem imagem</div>
          )}
          <p className="text-[10px] text-zinc-400 line-clamp-3 leading-relaxed">{order.description || 'Sem descrição'}</p>
        </div>
      );
    }
    
    if (stepId === 'finishing' && order.change_request_desc) {
      return (
        <div className="p-3 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Alteração Solicitada</div>
          {order.change_request_image_url && (
            <img src={order.change_request_image_url} alt="Referência" className="w-full aspect-square object-cover rounded-lg mb-2" />
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
    </div>
  );
};
