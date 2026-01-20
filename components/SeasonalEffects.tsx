
import React, { useState, useEffect, useRef } from 'react';
import { CloudSnow, Sun, CloudRain, Leaf, Square, X, Settings2 } from 'lucide-react';

type Season = 'winter' | 'spring' | 'summer' | 'autumn' | 'off';

export const SeasonalEffects = () => {
  const [season, setSeason] = useState<Season>('off');
  const [showControls, setShowControls] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 }); // Inicia fora da tela

  // Detecta estação inicial (Hemisfério Sul - Brasil)
  useEffect(() => {
    const month = new Date().getMonth(); // 0-11
    // Dez, Jan, Fev -> Verão (Summer)
    if (month === 11 || month === 0 || month === 1) setSeason('summer');
    // Mar, Abr, Mai -> Outono (Autumn)
    else if (month >= 2 && month <= 4) setSeason('autumn');
    // Jun, Jul, Ago -> Inverno (Winter)
    else if (month >= 5 && month <= 7) setSeason('winter');
    // Set, Out, Nov -> Primavera (Spring)
    else setSeason('spring');
  }, []);

  // Listener do Mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    
    // Reseta posição quando sai da janela para não prender partículas na borda
    const handleMouseLeave = () => {
        mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseout', handleMouseLeave);
    };
  }, []);

  // Gerenciador de Partículas (Canvas)
  useEffect(() => {
    if (season === 'off' || season === 'spring' || season === 'summer') {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajusta tamanho
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Configuração das Partículas
    const particles: any[] = [];
    const particleCount = season === 'winter' ? 200 : 80; // Aumentei um pouco a contagem

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speedY: Math.random() * (season === 'winter' ? 2 : 1) + 0.5,
        speedX: Math.random() * 1 - 0.5,
        vx: 0, // Velocidade de impulso X (interação)
        vy: 0, // Velocidade de impulso Y (interação)
        size: Math.random() * (season === 'winter' ? 3 : 8) + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 2,
        opacity: Math.random() * 0.5 + 0.3
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const interactionRadius = 150; // Raio de "limpeza"

      particles.forEach(p => {
        // 1. Interação com Mouse (Física de Repulsão)
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < interactionRadius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (interactionRadius - distance) / interactionRadius;
            const power = 12; // Força do empurrão

            p.vx += forceDirectionX * force * power;
            p.vy += forceDirectionY * force * power;
        }

        // 2. Aplicar velocidades
        p.x += p.speedX + p.vx;
        p.y += p.speedY + p.vy;

        // 3. Atrito (Friction) - Faz o impulso desaparecer gradualmente
        p.vx *= 0.92;
        p.vy *= 0.92;

        // 4. Reset se sair da tela (Loop Infinito)
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.vx = 0; // Reseta inércia ao reiniciar
          p.vy = 0;
        }
        // Se sair muito para os lados devido ao empurrão, teletransporta para o outro lado
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.x < -20) p.x = canvas.width + 20;

        // 5. Renderização
        ctx.save();
        ctx.translate(p.x, p.y);

        if (season === 'winter') {
          // Desenhar Neve (Círculos brancos)
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.fill();
        } else if (season === 'autumn') {
          // Desenhar Folha (Elipses rotacionadas)
          p.rotation += p.rotationSpeed + (p.vx * 2); // Gira mais rápido se empurrado
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
          // Cores de outono
          const colors = ['#eab308', '#f97316', '#ef4444', '#78350f']; 
          const colorIndex = Math.floor(p.size % colors.length);
          ctx.fillStyle = colors[colorIndex];
          ctx.globalAlpha = p.opacity;
          ctx.fill();
        }
        
        ctx.restore();
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [season]);

  // Estilos CSS Globais para Botões e Alvos Sazonais
  const getButtonStyles = () => {
    // Seletor unificado: Botões normais, botões com efeito explícito, e containers alvo (Home cards, Footer)
    const targets = `button:not(.no-effect), .btn-effect, .seasonal-target`;

    switch (season) {
      case 'winter':
        return `
          /* Efeito Neve Acumulada */
          ${targets} {
            position: relative;
            border-top: 1px solid rgba(255,255,255,0.4) !important;
          }
          ${targets.replace(/,/g, '::before,') + '::before'} {
            content: '';
            position: absolute;
            top: -4px;
            left: 2px;
            right: 2px;
            height: 6px;
            background: white;
            border-radius: 4px 4px 2px 2px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            pointer-events: none;
            z-index: 20;
            opacity: 0.9;
          }
          /* Pequenos floquinhos extras na borda */
          ${targets.replace(/,/g, '::after,') + '::after'} {
            content: '';
            position: absolute;
            top: -6px;
            right: 10px;
            width: 4px;
            height: 4px;
            background: white;
            border-radius: 50%;
            box-shadow: -15px 1px 0 white, 20px 2px 0 white;
            pointer-events: none;
            z-index: 20;
          }
        `;
      case 'summer':
        return `
          /* Efeito Suor/Calor */
          @keyframes sweat-drop {
            0% { top: 0; opacity: 0; height: 4px; }
            20% { opacity: 0.8; height: 8px; }
            80% { opacity: 0.8; height: 8px; }
            100% { top: 100%; opacity: 0; height: 4px; }
          }
          ${targets} {
            position: relative;
            overflow: hidden; /* Mantém a gota dentro */
          }
          ${targets.replace(/,/g, '::before,') + '::before'} {
            content: '';
            position: absolute;
            left: 20%;
            width: 3px;
            background: rgba(255,255,255,0.6);
            border-radius: 2px;
            animation: sweat-drop 3s infinite ease-in;
            pointer-events: none;
            box-shadow: 0 0 2px rgba(255,255,255,0.8);
          }
          ${targets.replace(/,/g, '::after,') + '::after'} {
            content: '';
            position: absolute;
            left: 70%;
            width: 2px;
            background: rgba(255,255,255,0.5);
            border-radius: 2px;
            animation: sweat-drop 4.5s infinite ease-in 1s; /* Delay diferente */
            pointer-events: none;
          }
        `;
      case 'spring':
        return `
          /* Efeito Flores Nascendo */
          ${targets} {
            position: relative;
          }
          /* Flor 1 */
          ${targets.replace(/,/g, '::before,') + '::before'} {
            content: '🌸';
            position: absolute;
            top: -8px;
            right: -4px;
            font-size: 14px;
            animation: grow 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            pointer-events: none;
            z-index: 20;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          /* Flor 2 */
          ${targets.replace(/,/g, '::after,') + '::after'} {
            content: '🌱';
            position: absolute;
            top: -6px;
            left: -2px;
            font-size: 10px;
            animation: grow 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 0.2s;
            pointer-events: none;
            z-index: 20;
          }
          @keyframes grow {
            from { transform: scale(0) translateY(5px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
        `;
      case 'autumn':
        return `
          /* Efeito Folhas Acumuladas */
          ${targets} {
            position: relative;
          }
          /* Folha Esquerda */
          ${targets.replace(/,/g, '::before,') + '::before'} {
            content: '🍂';
            position: absolute;
            top: -12px;
            left: 10%;
            font-size: 14px;
            transform: rotate(-15deg);
            pointer-events: none;
            z-index: 20;
            filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
          }
          /* Folha Direita */
          ${targets.replace(/,/g, '::after,') + '::after'} {
            content: '🍁';
            position: absolute;
            top: -10px;
            right: 15%;
            font-size: 13px;
            transform: rotate(25deg);
            pointer-events: none;
            z-index: 20;
            filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
          }
        `;
      default:
        return '';
    }
  };

  return (
    <>
      <style>{getButtonStyles()}</style>

      {/* Canvas Layer for Snow/Leaves */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{ opacity: 0.8 }}
      />

      {/* Controls UI */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2 font-sans no-effect">
        
        {showControls && (
          <div className="bg-zinc-900/90 border border-zinc-700 p-2 rounded-xl shadow-2xl backdrop-blur-md flex flex-col gap-1 mb-2 animate-fade-in-up">
            <span className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-1">Estação</span>
            
            <button 
              onClick={() => setSeason('summer')} 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition no-effect ${season === 'summer' ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-400 hover:bg-white/5'}`}
            >
              <Sun size={14} /> Verão (Suor)
            </button>
            
            <button 
              onClick={() => setSeason('winter')} 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition no-effect ${season === 'winter' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:bg-white/5'}`}
            >
              <CloudSnow size={14} /> Inverno (Neve)
            </button>
            
            <button 
              onClick={() => setSeason('spring')} 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition no-effect ${season === 'spring' ? 'bg-pink-500/20 text-pink-400' : 'text-zinc-400 hover:bg-white/5'}`}
            >
              <CloudRain size={14} /> Primavera (Flores)
            </button>

            <button 
              onClick={() => setSeason('autumn')} 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition no-effect ${season === 'autumn' ? 'bg-orange-500/20 text-orange-400' : 'text-zinc-400 hover:bg-white/5'}`}
            >
              <Leaf size={14} /> Outono (Folhas)
            </button>

            <div className="h-px bg-zinc-800 my-1"></div>

            <button 
              onClick={() => setSeason('off')} 
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition no-effect ${season === 'off' ? 'bg-red-500/20 text-red-400' : 'text-zinc-400 hover:bg-white/5'}`}
            >
              <Square size={14} fill="currentColor" /> Parar Efeitos
            </button>
          </div>
        )}

        <button 
          onClick={() => setShowControls(!showControls)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-300 p-3 rounded-full hover:bg-zinc-700 hover:text-white transition shadow-lg hover:scale-110 active:scale-95 no-effect"
          title="Controle de Efeitos Sazonais"
        >
          {showControls ? <X size={20} /> : <Settings2 size={20} />}
        </button>
      </div>
    </>
  );
};
