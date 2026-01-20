
import React, { useEffect, useState } from 'react';

export const ScreenshotGuard = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detecta atalhos comuns de print
      const isPrintScreen = e.key === 'PrintScreen';
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');
      const isWinSnippet = (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's';

      if (isPrintScreen || isMacScreenshot || isWinSnippet) {
        setIsVisible(true);
        // Esconde após 4 segundos
        setTimeout(() => setIsVisible(false), 4000);
      }
    };

    // Adiciona listener para 'keyup' também para garantir captura do PrintScreen em alguns OS
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), 4000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-end pointer-events-none">
      {/* Camada de desfoque para "estragar" o print se for rápido o suficiente e focar no aviso */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-fade-in transition-all duration-300"></div>

      {/* Container do Personagem */}
      <div className="relative z-[101] mr-4 mb-0 animate-slide-up-bounce">
        <div className="relative w-64 h-64">
          
          {/* Balão de Fala */}
          <div 
            className="absolute -top-24 right-10 bg-white text-black p-5 rounded-2xl rounded-br-none shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 border-black transform origin-bottom-right animate-pop-in"
            style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
          >
            <p className="text-sm font-bold leading-tight">
              essa ideia merece mais<br/>do que um print.
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 italic">
              (mas ficou boa a foto?)
            </p>
          </div>

          {/* Stick Man SVG - Pose de "Pare/Julgamento" */}
          <svg viewBox="0 0 200 300" className="w-full h-full drop-shadow-2xl">
            <g transform="translate(20, 0)">
              {/* Cabeça */}
              <circle cx="100" cy="60" r="25" fill="white" stroke="black" strokeWidth="4" />
              
              {/* Rosto Julgador */}
              <circle cx="90" cy="55" r="2.5" fill="black" /> {/* Olho esq */}
              <circle cx="110" cy="55" r="2.5" fill="black" /> {/* Olho dir */}
              <line x1="85" y1="45" x2="95" y2="48" stroke="black" strokeWidth="2" /> {/* Sobrancelha esq levantada */}
              <line x1="105" y1="48" x2="115" y2="45" stroke="black" strokeWidth="2" /> {/* Sobrancelha dir */}
              <path d="M90 75 Q100 70 110 75" stroke="black" strokeWidth="2" fill="none" /> {/* Boca sorrisinho de lado */}

              {/* Corpo */}
              <line x1="100" y1="85" x2="100" y2="180" stroke="white" strokeWidth="4" strokeLinecap="round" />

              {/* Braço Direito (Apontando para cima/balão) */}
              <line x1="100" y1="100" x2="140" y2="60" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <circle cx="140" cy="60" r="4" fill="white" /> {/* Mão */}

              {/* Braço Esquerdo (Mão na cintura) */}
              <path d="M100 100 L70 130 L90 160" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />

              {/* Pernas */}
              <line x1="100" y1="180" x2="70" y2="280" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <line x1="100" y1="180" x2="130" y2="280" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes slide-up-bounce {
          0% { transform: translateY(100%); opacity: 0; }
          60% { transform: translateY(-20px); opacity: 1; }
          80% { transform: translateY(10px); }
          100% { transform: translateY(0); }
        }
        @keyframes pop-in {
          0% { transform: scale(0); opacity: 0; }
          80% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-slide-up-bounce {
          animation: slide-up-bounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .animate-pop-in {
          animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 0.3s; /* Delay para aparecer depois do boneco */
          opacity: 0; /* Começa invisível devido ao delay */
        }
      `}</style>
    </div>
  );
};
