
import React, { useEffect, useState, useRef } from 'react';

export const StickManCleaner = () => {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'talking' | 'exiting'>('hidden');
  const [position, setPosition] = useState(-200);
  
  // Audio refs (opcional, deixado mudo por padrão, mas estrutura pronta)
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detecta Ctrl+Z ou Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        // Não prevenimos o default para permitir o "undo" real em inputs,
        // mas iniciamos a animação.
        triggerAnimation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  const triggerAnimation = () => {
    if (isActive) return; // Evita spam
    setIsActive(true);
    setPhase('entering');
    setPosition(-150);

    // Sequência de Animação
    
    // 1. Entrar varrendo (0s a 4s)
    // Vamos mover via JS requestAnimationFrame ou CSS transition. 
    // Usaremos CSS transition no style transform.
    
    // Pequeno delay para renderizar o 'entering' antes de mover
    setTimeout(() => {
        // Move até 60% da tela
        setPosition(window.innerWidth * 0.6);
    }, 100);

    // 2. Parar e Falar (após 4s, tempo estimado da transição)
    setTimeout(() => {
        setPhase('talking');
    }, 4100);

    // 3. Sair (após terminar de falar, +3s)
    setTimeout(() => {
        setPhase('exiting');
        setPosition(window.innerWidth + 200);
    }, 7500);

    // 4. Resetar (após sair da tela)
    setTimeout(() => {
        setIsActive(false);
        setPhase('hidden');
        setPosition(-200);
    }, 11000); // 7.5s + tempo de saída
  };

  if (!isActive) return null;

  // Cálculos de estilo baseados na fase
  const isSweeping = phase === 'entering' || phase === 'exiting';
  
  // Duração da transição depende da fase
  const transitionDuration = phase === 'entering' ? '4s' : phase === 'exiting' ? '3s' : '0s';

  return (
    <div 
        ref={containerRef}
        className="fixed bottom-0 z-[99999] pointer-events-none"
        style={{ 
            left: 0,
            transform: `translateX(${position}px)`,
            transition: `transform ${transitionDuration} linear`
        }}
    >
        <div className="relative w-48 h-64">
            
            {/* Balão de Fala */}
            <div 
                className={`absolute -top-16 -right-20 bg-white text-black p-4 rounded-2xl rounded-bl-none shadow-xl border-2 border-black transition-all duration-300 transform origin-bottom-left ${phase === 'talking' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
            >
                <p className="text-sm font-bold whitespace-nowrap">não é tão fácil assim...</p>
            </div>

            {/* Stick Man SVG */}
            <svg viewBox="0 0 200 300" className="w-full h-full drop-shadow-lg">
                <g className={isSweeping ? "animate-body-rock" : ""}>
                    {/* Cabeça */}
                    <circle cx="100" cy="60" r="20" fill="white" stroke="black" strokeWidth="4" />
                    
                    {/* Olhos (Mudam quando fala) */}
                    {phase === 'talking' ? (
                        <g>
                             {/* Olhar para o usuário (tela) */}
                            <circle cx="95" cy="55" r="2" fill="black" />
                            <circle cx="105" cy="55" r="2" fill="black" />
                            {/* Boca séria */}
                            <line x1="92" y1="70" x2="108" y2="70" stroke="black" strokeWidth="2" />
                        </g>
                    ) : (
                        <g>
                            {/* Olhando para o chão/vassoura */}
                            <circle cx="105" cy="65" r="2" fill="black" />
                            <circle cx="115" cy="65" r="2" fill="black" />
                        </g>
                    )}

                    {/* Corpo */}
                    <line x1="100" y1="80" x2="100" y2="180" stroke="white" strokeWidth="4" strokeLinecap="round" />

                    {/* Braços (Animados varrendo) */}
                    <g className={isSweeping ? "animate-arms-sweep" : ""}>
                         {/* Braço Esquerdo (Segurando topo do cabo) */}
                         <line x1="100" y1="100" x2="140" y2="140" stroke="white" strokeWidth="4" strokeLinecap="round" />
                         {/* Braço Direito (Segurando meio do cabo) */}
                         <line x1="100" y1="110" x2="160" y2="160" stroke="white" strokeWidth="4" strokeLinecap="round" />
                         
                         {/* Vassoura */}
                         <g transform="translate(140, 140) rotate(15)">
                            <line x1="0" y1="0" x2="60" y2="120" stroke="#8B4513" strokeWidth="6" strokeLinecap="round" />
                            {/* Cerdas */}
                            <path d="M50 110 L30 150 L90 150 L70 110 Z" fill="#D2B48C" stroke="none" />
                            <line x1="35" y1="150" x2="45" y2="115" stroke="#8B4513" strokeWidth="1" />
                            <line x1="45" y1="150" x2="50" y2="115" stroke="#8B4513" strokeWidth="1" />
                            <line x1="55" y1="150" x2="55" y2="115" stroke="#8B4513" strokeWidth="1" />
                            <line x1="65" y1="150" x2="60" y2="115" stroke="#8B4513" strokeWidth="1" />
                            <line x1="75" y1="150" x2="65" y2="115" stroke="#8B4513" strokeWidth="1" />
                         </g>
                    </g>

                    {/* Pernas (Animadas andando) */}
                    <g>
                        <line x1="100" y1="180" x2="80" y2="280" stroke="white" strokeWidth="4" strokeLinecap="round" className={isSweeping ? "animate-leg-left" : ""} />
                        <line x1="100" y1="180" x2="120" y2="280" stroke="white" strokeWidth="4" strokeLinecap="round" className={isSweeping ? "animate-leg-right" : ""} />
                    </g>
                </g>

                {/* Poeira (Só aparece quando varrendo) */}
                {isSweeping && (
                    <g className="animate-dust" transform="translate(180, 280)">
                         <circle cx="0" cy="0" r="5" fill="#aaa" opacity="0.6">
                            <animate attributeName="cy" values="0;-20;-40" dur="1s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.6;0" dur="1s" repeatCount="indefinite" />
                            <animate attributeName="cx" values="0;10;20" dur="1s" repeatCount="indefinite" />
                         </circle>
                         <circle cx="10" cy="5" r="3" fill="#ccc" opacity="0.5">
                            <animate attributeName="cy" values="5;-15;-30" dur="0.8s" begin="0.2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.5;0" dur="0.8s" begin="0.2s" repeatCount="indefinite" />
                         </circle>
                         <circle cx="-5" cy="5" r="4" fill="#888" opacity="0.4">
                            <animate attributeName="cy" values="5;-25;-50" dur="1.2s" begin="0.1s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.4;0" dur="1.2s" begin="0.1s" repeatCount="indefinite" />
                         </circle>
                    </g>
                )}
            </svg>
        </div>

        {/* Estilos CSS embutidos para animações específicas do boneco */}
        <style>{`
            @keyframes leg-walk {
                0%, 100% { transform: rotate(-20deg); transform-origin: 100px 180px; }
                50% { transform: rotate(20deg); transform-origin: 100px 180px; }
            }
            @keyframes leg-walk-reverse {
                0%, 100% { transform: rotate(20deg); transform-origin: 100px 180px; }
                50% { transform: rotate(-20deg); transform-origin: 100px 180px; }
            }
            @keyframes arm-sweep {
                0%, 100% { transform: rotate(-10deg); transform-origin: 100px 100px; }
                50% { transform: rotate(25deg); transform-origin: 100px 100px; }
            }
            @keyframes body-rock {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(2px) rotate(2deg); }
            }
            
            .animate-leg-left { animation: leg-walk 0.5s infinite linear; }
            .animate-leg-right { animation: leg-walk-reverse 0.5s infinite linear; }
            .animate-arms-sweep { animation: arm-sweep 0.8s infinite ease-in-out; }
            .animate-body-rock { animation: body-rock 0.4s infinite ease-in-out; }
        `}</style>
    </div>
  );
};
