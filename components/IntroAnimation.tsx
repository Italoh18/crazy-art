
import React, { useEffect, useState } from 'react';

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [textIndex, setTextIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const fullText = "CRAZY ART";
  const speed = 150; 

  useEffect(() => {
    // Sequência de entrada das letras
    if (textIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setTextIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      // Quando terminar de escrever, espera e finaliza
      const endTimeout = setTimeout(() => {
        setIsFinished(true);
        // Tempo para o slide-up antes de desmontar (700ms corresponde a duration-700)
        setTimeout(onComplete, 700); 
      }, 800); 
      return () => clearTimeout(endTimeout);
    }
  }, [textIndex, onComplete]);

  // Cálculo dinâmico do tamanho da fonte
  const getFontSize = () => {
    const count = Math.max(1, textIndex);
    if (count === 1) return '60vw';
    if (count === 2) return '45vw';
    if (count === 3) return '35vw';
    return `${Math.max(13, 45 - (count * 3.5))}vw`; 
  };

  const currentFontSize = getFontSize();
  
  const fontStyle = { 
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: currentFontSize,
    lineHeight: '1',
    letterSpacing: '-0.02em',
    transition: 'font-size 0.3s cubic-bezier(0.22, 1, 0.36, 1)' 
  };

  return (
    <div 
      className={`fixed inset-0 z-[99999] bg-white flex items-center justify-center overflow-hidden transition-transform duration-700 ease-in-out ${isFinished ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <style>{`
        @keyframes slideInFromRight {
          0% {
            transform: translateX(100vw) scale(1.2);
            opacity: 0;
          }
          60% {
            transform: translateX(-2vw) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        .char-enter {
          animation: slideInFromRight 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          display: inline-block;
          white-space: pre;
        }
      `}</style>

      <div className="w-full flex items-center justify-center px-2">
        <div 
          className="flex items-center justify-center font-black text-black whitespace-nowrap will-change-transform"
          style={fontStyle}
        >
          {fullText.slice(0, textIndex).split('').map((char, index) => (
            <span 
              key={index} 
              className={index === textIndex - 1 ? "char-enter" : "transition-all duration-300"}
            >
              {char}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
