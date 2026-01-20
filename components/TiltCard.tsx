
import React, { useRef, useState } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  depth?: number; // Intensidade do efeito 3D
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className = "", depth = 15 }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Posição do mouse relativa ao card
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calcular rotação (centro é 0)
    // Y roda baseado em X, X roda baseado em Y (invertido)
    const rotateY = ((mouseX - width / 2) / width) * depth; 
    const rotateX = ((mouseY - height / 2) / height) * -depth; 

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => setIsHovering(true);
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-all duration-200 ease-out ${className}`}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="h-full w-full"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.02, 1.02, 1.02)`,
          transformStyle: 'preserve-3d',
          transition: isHovering ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
        }}
      >
        {children}
        
        {/* Efeito de Brilho Holográfico (Glare) */}
        <div 
            className="absolute inset-0 pointer-events-none rounded-2xl mix-blend-overlay opacity-0 transition-opacity duration-300"
            style={{
                opacity: isHovering ? 0.4 : 0,
                background: `linear-gradient(${115 + rotation.x * 2}deg, transparent 20%, rgba(255,255,255,0.4) 45%, transparent 60%)`,
                transform: 'translateZ(1px)' // Fica acima do conteúdo base
            }}
        />
      </div>
    </div>
  );
};
