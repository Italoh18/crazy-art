
import React, { useEffect, useState } from 'react';

export const CosmicPulseSystem = () => {
  const [activePulse, setActivePulse] = useState<'none' | 'top' | 'bottom' | 'vertical'>('none');
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Função para disparar o pulso
    const triggerPulse = () => {
      // 1. Escolher aleatoriamente qual borda vai "energizar"
      const types: ('top' | 'bottom' | 'vertical')[] = ['top', 'bottom', 'vertical'];
      const nextPulse = types[Math.floor(Math.random() * types.length)];
      
      setActivePulse(nextPulse);

      // 2. Chance rara (30%) de mostrar a mensagem "sistema sincronizado"
      const shouldShowText = Math.random() < 0.3;
      if (shouldShowText) {
        setShowStatus(true);
        // Esconde o texto depois de 3 segundos
        setTimeout(() => setShowStatus(false), 3000);
      }

      // 3. Resetar o pulso visual depois que a animação acabar (2s)
      setTimeout(() => {
        setActivePulse('none');
      }, 2000);

      // 4. Agendar o próximo pulso (entre 10 e 20 segundos)
      const nextInterval = Math.random() * 10000 + 10000;
      timeoutId = setTimeout(triggerPulse, nextInterval);
    };

    // Inicia o loop
    let timeoutId = setTimeout(triggerPulse, 5000); // Primeiro pulso rápido

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
      {/* 
        PULSO HORIZONTAL (TOPO) 
        Viaja da esquerda para a direita na borda superior
      */}
      <div 
        className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/80 to-transparent transition-opacity duration-500
        ${activePulse === 'top' ? 'opacity-100 animate-energy-flow-x' : 'opacity-0'}`}
        style={{ boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)' }}
      />

      {/* 
        PULSO HORIZONTAL (BASE) 
        Viaja da direita para a esquerda na borda inferior
      */}
      <div 
        className={`absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent transition-opacity duration-500
        ${activePulse === 'bottom' ? 'opacity-100 animate-energy-flow-x-reverse' : 'opacity-0'}`}
        style={{ boxShadow: '0 0 10px rgba(34, 211, 238, 0.3)' }}
      />

      {/* 
        PULSO VERTICAL (DIREITA) 
        Viaja de cima para baixo
      */}
      <div 
        className={`absolute top-0 right-0 h-full w-[1px] bg-gradient-to-b from-transparent via-white/30 to-transparent transition-opacity duration-500
        ${activePulse === 'vertical' ? 'opacity-100 animate-energy-flow-y' : 'opacity-0'}`}
      />

      {/* 
        MENSAGEM DE SISTEMA 
        Aparece sutilmente no canto inferior direito
      */}
      <div className={`absolute bottom-8 right-8 flex items-center gap-2 transition-all duration-1000 ease-in-out ${showStatus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
         <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-[0.3em] drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
            sistema sincronizado.
         </span>
      </div>

      <style>{`
        @keyframes energy-flow-x {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes energy-flow-x-reverse {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes energy-flow-y {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-energy-flow-x {
          animation: energy-flow-x 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-energy-flow-x-reverse {
          animation: energy-flow-x-reverse 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-energy-flow-y {
          animation: energy-flow-y 1.5s linear forwards;
        }
      `}</style>
    </div>
  );
};
