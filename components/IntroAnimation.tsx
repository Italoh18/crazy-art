
import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'pulsing' | 'text-slam' | 'fade-out'>('pulsing');
  const [lettersVisible, setLettersVisible] = useState(false);

  useEffect(() => {
    // Stage 1: Pulsing Logo (0s - 2s)
    const timer1 = setTimeout(() => {
      setStage('text-slam');
      setLettersVisible(true);
    }, 2000);

    // Stage 2: Finish Text Animation & Start Fade Out (2s + 2.5s)
    const timer2 = setTimeout(() => {
      setStage('fade-out');
    }, 4500);

    // Stage 3: Complete & Unmount (4.5s + 1s fade)
    const timer3 = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  const words = ["CRAZY", "ART"];

  // Alterado para Times New Roman conforme solicitado
  const titleFont = { fontFamily: '"Times New Roman", Times, serif' };

  return (
    <div className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${stage === 'fade-out' ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* 1. GALAXY BACKGROUND */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1e1b4b_0%,_#000000_80%)]"></div>
          
          {/* Stars (Static for performance) */}
          <div className="absolute inset-0 opacity-80" style={{ backgroundSize: '200px 200px', backgroundImage: 'radial-gradient(white 1px, transparent 1px)' }}></div>
          <div className="absolute inset-0 opacity-50" style={{ backgroundSize: '350px 350px', backgroundImage: 'radial-gradient(white 1.5px, transparent 1.5px)', backgroundPosition: '100px 100px' }}></div>
          
          {/* Nebula Effects */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-primary/20 blur-[100px] rounded-full animate-pulse-slow mix-blend-screen"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-secondary/10 blur-[80px] rounded-full animate-spin-slow mix-blend-screen"></div>
      </div>

      {/* 2. PULSING LOGO PHASE */}
      <div className={`relative z-10 flex flex-col items-center justify-center transition-all duration-500 ${stage === 'pulsing' ? 'opacity-100 scale-100' : 'opacity-0 scale-[3] blur-xl'}`}>
         <div className="relative">
            {/* Core Glow */}
            <div className="absolute inset-0 bg-white blur-[20px] animate-pulse"></div>
            {/* Icon */}
            <div className="relative bg-white p-6 rounded-full animate-zoom-pulse shadow-[0_0_50px_rgba(255,255,255,0.8)]">
                <Sparkles size={48} className="text-black" />
            </div>
            {/* Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/30 rounded-full animate-ping"></div>
         </div>
      </div>

      {/* 3. TEXT SLAM PHASE */}
      {stage !== 'pulsing' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
            {words.map((word, wordIndex) => (
                <div key={wordIndex} className="flex overflow-hidden mb-2 md:mb-4">
                    {word.split('').map((char, charIndex) => {
                        // Calculate delay: Word offset + char offset
                        const delay = (wordIndex * 0.5) + (charIndex * 0.1); 
                        
                        return (
                            <span 
                                key={charIndex}
                                className={`
                                    block text-6xl md:text-9xl font-bold text-white px-1 md:px-2
                                    ${lettersVisible ? 'animate-letter-slam' : 'opacity-0'}
                                `}
                                style={{ 
                                    animationDelay: `${delay}s`,
                                    textShadow: '0 0 30px rgba(245, 158, 11, 0.6)',
                                    ...titleFont
                                }}
                            >
                                {char}
                            </span>
                        );
                    })}
                </div>
            ))}
            
            {/* Subtítulo removido conforme solicitado */}
        </div>
      )}
    </div>
  );
};
