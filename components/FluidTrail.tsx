
import React, { useEffect, useRef } from 'react';

export const FluidTrail = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number; age: number }[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, moved: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuração inicial do Canvas
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Listener de Mouse
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, moved: true };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Configurações do Rastro
    const trailLength = 50; // Quantidade de pontos
    const trailWidth = 4;   // Espessura inicial
    const decaySpeed = 0.025; // Velocidade de desaparecimento

    // Animation Loop
    let animationFrameId: number;

    const animate = () => {
      // Fade out anterior (cria o efeito de rastro suave)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Adicionar novo ponto se o mouse moveu
      if (mouseRef.current.moved) {
        pointsRef.current.push({ 
          x: mouseRef.current.x, 
          y: mouseRef.current.y, 
          age: 1.0 // 1.0 = Vida cheia, 0.0 = Morto
        });
        mouseRef.current.moved = false; // Reset flag
      }

      // Se o mouse parou, adiciona pontos na mesma posição para manter o rastro conectado até desaparecer
      // ou apenas deixa o rastro existente morrer. Vamos deixar morrer para efeito de "tinta acabando".
      
      const points = pointsRef.current;

      // Atualizar idade dos pontos
      for (let i = 0; i < points.length; i++) {
        points[i].age -= decaySpeed;
      }

      // Remover pontos mortos
      // Mantemos pelo menos 2 pontos para desenhar linha, a menos que todos estejam mortos
      while (points.length > 0 && points[0].age <= 0) {
        points.shift();
      }

      // Desenhar o Rastro
      if (points.length > 2) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Desenhar segmentos
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          
          // Suavização simples usando linha direta, 
          // mas modulando a espessura e opacidade por segmento
          
          // Cor Dinâmica: Gradiente de Dourado (#F59E0B) para Vermelho (#DC2626) baseado na idade
          // Age 1.0 -> Dourado (Novo)
          // Age 0.0 -> Vermelho (Velho)
          
          // Interpolação de cor manual (simplificada para performance)
          // R: 245 -> 220, G: 158 -> 38, B: 11 -> 38 (Aprox Vermelho)
          // Vamos usar HSL para facilitar um brilho neon
          // Gold ~ 35deg, Red ~ 0deg
          const hue = p1.age * 40; // 0 a 40
          const lightness = 50 + (p1.age * 10); // Mais brilhante quando novo
          
          ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${p1.age})`;
          ctx.lineWidth = trailWidth * p1.age;
          
          // Quadratic Curve para suavidade extra se houver ponto seguinte
          if (i < points.length - 2) {
             const xc = (points[i].x + points[i + 1].x) / 2;
             const yc = (points[i].y + points[i + 1].y) / 2;
             // Na verdade, desenhar linhas pequenas conectadas é mais performático para gradiente por segmento
             // Para gradiente perfeito ao longo da linha, precisaríamos de um gradientStroke complexo.
             // Segmentos individuais funcionam bem para efeito "partícula/fita".
             ctx.lineTo(p2.x, p2.y);
          } else {
             ctx.lineTo(p2.x, p2.y);
          }
          
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[60]" // Z-index acima do background, abaixo do conteúdo (geralmente)
      style={{ mixBlendMode: 'screen' }} // Faz o brilho somar com o fundo escuro
    />
  );
};
