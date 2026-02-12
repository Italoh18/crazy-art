
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

  // Atualiza Variáveis CSS Globais conforme a estação
  useEffect(() => {
    const root = document.documentElement;
    switch(season) {
        case 'winter':
            root.style.setProperty('--season-primary', '#38bdf8'); // sky-400 (Cyan/Blue)
            root.style.setProperty('--season-glow', 'rgba(56, 189, 248, 0.4)');
            break;
        case 'summer':
            root.style.setProperty('--season-primary', '#f59e0b'); // amber-500 (Golden)
            root.style.setProperty('--season-glow', 'rgba(245, 158, 11, 0.4)');
            break;
        case 'spring':
            root.style.setProperty('--season-primary', '#f472b6'); // pink-400 (Pink/Sakura)
            root.style.setProperty('--season-glow', 'rgba(244, 114, 182, 0.4)');
            break;
        case 'autumn':
            root.style.setProperty('--season-primary', '#f97316'); // orange-500 (Rust/Orange)
            root.style.setProperty('--season-glow', 'rgba(249, 115, 22, 0.4)');
            break;
        default:
            root.style.setProperty('--season-primary', 'rgba(255, 255, 255, 0.2)'); // White subtle
            root.style.setProperty('--season-glow', 'rgba(255, 255, 255, 0.1)');
    }
  }, [season]);

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
    // Agora permitimos spring na animação
    if (season === 'off') {
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
    // Mais partículas no inverno, quantidade moderada nas outras estações
    const particleCount = season === 'winter' ? 200 : 60; 

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        // Velocidade baseada na estação (pétalas caem mais devagar que neve)
        speedY: Math.random() * (season === 'winter' ? 2 : 0.8) + 0.3,
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

        // Movimento lateral senoidal para folhas e pétalas
        if (season === 'spring' || season === 'autumn') {
            p.x += Math.sin(p.y * 0.01) * 0.5;
        }

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
        } else if (season === 'spring') {
          // Desenhar Pétalas (Forma oval suave, tons rosa/branco)
          p.rotation += p.rotationSpeed * 0.5;
          ctx.rotate((p.rotation * Math.PI) / 180);
          
          ctx.beginPath();
          // Pétala: Elipse um pouco mais larga em uma ponta
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          
          // Cores de primavera (Sakura)
          const colors = ['#fbcfe8', '#f9a8d4', '#f472b6', '#ffffff', '#e879f9']; 
          const colorIndex = Math.floor((p.size * 10) % colors.length);
          
          ctx.fillStyle = colors[colorIndex];
          ctx.globalAlpha = p.opacity;
          ctx.fill();
        } else if (season === 'summer') {
            // Desenhar "Calor" (Partículas amarelas/brancas subindo levemente ou flutuando)
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 200, 50, ${p.opacity * 0.5})`;
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
    // Seletor unificado: Botões normais, botões com efeito explícito, e containers alvo
    const targets = `button:not(.no-effect), .btn-effect, .seasonal-target`;

    // Regras CSS baseadas na estação
    let seasonalRules = '';

    switch (season) {
      case 'winter':
        seasonalRules = `
          /* Efeito Neve Acumulada */
          ${targets} { position: relative; border-top: 1px solid rgba(255,255,255,0.4) !important; }
          ${targets.replace(/,/g, '::before,') + '::before'} { content: ''; position: absolute; top: -4px; left: 2px; right: 2px; height: 6px; background: white; border-radius: 4px 4px 2px 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); pointer-events: none; z-index: 20; opacity: 0.9; }
        `;
        break;
      case 'summer':
        seasonalRules = `
          /* Efeito Suor/Calor */
          @keyframes sweat-drop { 0% { top: 0; opacity: 0; height: 4px; } 20% { opacity: 0.8; height: 8px; } 100% { top: 100%; opacity: 0; height: 4px; } }
          ${targets} { position: relative; overflow: hidden; }
          ${targets.replace(/,/g, '::before,') + '::before'} { content: ''; position: absolute; left: 20%; width: 3px; background: rgba(255,255,255,0.6); border-radius: 2px; animation: sweat-drop 3s infinite ease-in; pointer-events: none; }
        `;
        break;
      case 'spring':
        seasonalRules = `
          /* Efeito Flores */
          ${targets} { position: relative; }
          ${targets.replace(/,/g, '::before,') + '::before'} { content: '🌸'; position: absolute; top: -8px; right: -4px; font-size: 14px; animation: grow 0.5s forwards; pointer-events: none; z-index: 20; }
          @keyframes grow { from { transform: scale(0) translateY(5px); } to { transform: scale(1) translateY(0); } }
        `;
        break;
      case 'autumn':
        seasonalRules = `
          /* Efeito Folhas */
          ${targets} { position: relative; }
          ${targets.replace(/,/g, '::before,') + '::before'} { content: '🍂'; position: absolute; top: -12px; left: 10%; font-size: 14px; transform: rotate(-15deg); pointer-events: none; z-index: 20; }
        `;
        break;
      default:
        seasonalRules = '';
    }

    return `
      ${seasonalRules}
      
      /* CLASSE PARA BORDAS DO MENU REATIVAS */
      .seasonal-border {
         transition: border-color 0.5s ease, box-shadow 0.5s ease;
         border-color: rgba(255,255,255,0.1);
      }
      .seasonal-border:hover, .seasonal-border:focus-within, .seasonal-border.active {
         border-color: var(--season-primary, rgba(255,255,255,0.2)) !important;
         box-shadow: 0 0 25px var(--season-glow, rgba(255,255,255,0.1)) !important;
      }
    `;
  };

  return (
    <>
      <style>{getButtonStyles()}</style>

      {/* Canvas Layer for Snow/Leaves/Petals */}
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
              <CloudRain size={14} /> Primavera (Pétalas)
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
