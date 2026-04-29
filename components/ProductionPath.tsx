
import React from 'react';
import { Hourglass, RotateCw, CheckCircle2, Circle } from 'lucide-react';
import { ProductionStep } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface ProductionPathProps {
  orderId: string;
  currentStep: ProductionStep;
  isCompact?: boolean;
  orderSource?: string;
}

const STEPS: { id: ProductionStep; label: string }[] = [
  { id: 'production', label: 'Em Produção' },
  { id: 'approval', label: 'Em Aprovação' },
  { id: 'finishing', label: 'Finalizando' },
  { id: 'completed', label: 'Concluído' }
];

export const ProductionPath: React.FC<ProductionPathProps> = ({ orderId, currentStep, isCompact = false, orderSource }) => {
  const { updateProductionStep } = useData();
  const { role } = useAuth();

  const getStepIndex = (step: ProductionStep) => STEPS.findIndex(s => s.id === step);
  const currentIndex = getStepIndex(currentStep);

  const handleStepClick = async (stepId: ProductionStep, index: number) => {
    if (role === 'admin') {
      // Admin can set any step
      await updateProductionStep(orderId, stepId);
    } else if (role === 'client' && currentStep === 'approval' && stepId === 'approval') {
      // Client can approve when in approval stage
      // Clicking the approval step when it's active moves it to finishing
      await updateProductionStep(orderId, 'finishing');
    }
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

        const canClick = (role === 'admin') || (role === 'client' && currentStep === 'approval' && step.id === 'approval');

        return (
          <React.Fragment key={step.id}>
            <div 
              className={`flex flex-col items-center gap-1 group ${canClick ? 'cursor-pointer' : ''}`}
              onClick={() => canClick && handleStepClick(step.id, index)}
              title={step.label}
            >
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${containerClass} ${canClick ? 'hover:scale-110 active:scale-95' : ''}`}>
                <span className={iconClass}>{icon}</span>
              </div>
              {!isCompact && (
                <span className={`text-[8px] uppercase font-bold tracking-tighter transition-colors ${isCurrent ? 'text-blue-400' : isPast ? 'text-emerald-500' : 'text-zinc-600'}`}>
                  {step.label}
                </span>
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div className={`h-[1px] ${isCompact ? 'w-2' : 'w-4'} ${isPast ? 'bg-emerald-500/30' : 'bg-zinc-800'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
