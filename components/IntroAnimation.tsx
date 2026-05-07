
import React, { useEffect, useState, useMemo, useCallback } from 'react';

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [textIndex, setTextIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const fullText = "CRAZY ART";
  const speed = 150; 

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    // Sequência de entrada das letras
    if (textIndex < fullText.length) {
      timeout = setTimeout(() => {
        setTextIndex(prev => prev + 1);
      }, speed);
    } else {
      // Quando terminar de escrever, espera e finaliza
      timeout = setTimeout(() => {
        setIsFinished(true);
        // Tempo para o slide-up antes de desmontar (700ms corresponde a duration-700)
        setTimeout(onComplete, 700); 
      }, 800); 
    }
    return () => clearTimeout(timeout);
  }, [textIndex, onComplete]);

  // Cálculo memoizado do tamanho da fonte
  const currentFontSize = useMemo(() => {
    const count = Math.max(1, textIndex);
    if (count === 1) return '60vw';
    if (count === 2) return '45vw';
    if (count === 3) return '35vw';
    // Estabiliza o tamanho diminuindo gradualmente
    return `${Math.max(13, 45 - (count * 3.5))}vw`; 
  }, [textIndex]);

  const fontStyle = useMemo(() => ({ 
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: currentFontSize,
    lineHeight: '1',
    letterSpacing: '-0.02em',
    transition: 'font-size 0.3s cubic-bezier(0.22, 1, 0.36, 1)' 
  }), [currentFontSize]);

  return (
    <div 
      className={`fixed inset-0 z-[99999] bg-white flex items-center justify-center overflow-hidden transition-transform duration-700 ease-in-out ${isFinished ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <div className="w-full flex items-center justify-center px-2">
        <div 
          className="flex items-center justify-center font-black text-black whitespace-nowrap will-change-[font-size,transform]"
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
