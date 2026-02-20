
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

type Season = 'winter' | 'spring' | 'summer' | 'autumn' | 'off';

export const SeasonalEffects = () => {
  const [season, setSeason] = useState<Season>('off');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 }); 
  
  const location = useLocation();

  // Detecta estação inicial
  useEffect(() => {
    // Se estiver no editor de fontes, desliga efeitos
    if (location.pathname.includes('/font-editor')) {
        setSeason('off');
        return;
    }

    const month = new Date().getMonth(); 
    if (month === 11 || month === 0 || month === 1) setSeason('summer');
    else if (month >= 2 && month <= 4) setSeason('autumn');
    else if (month >= 5 && month <= 7) setSeason('winter');
    else setSeason('spring');
  }, [location.pathname]); // Reexecuta ao mudar de rota

  // Atualiza Variáveis CSS Globais
  useEffect(() => {
    const root = document.documentElement;
    // Se estiver off (ex: no editor), limpa as vars
    if (season === 'off') {
        root.style.removeProperty('--season-primary');
        root.style.removeProperty('--season-glow');
        return;
    }

    switch(season) {
        case 'winter':
            root.style.setProperty('--season-primary', '#38bdf8'); 
            root.style.setProperty('--season-glow', 'rgba(56, 189, 248, 0.4)');
            break;
        case 'summer':
            root.style.setProperty('--season-primary', '#f59e0b'); 
            root.style.setProperty('--season-glow', 'rgba(245, 158, 11, 0.4)');
            break;
        case 'spring':
            root.style.setProperty('--season-primary', '#f472b6'); 
            root.style.setProperty('--season-glow', 'rgba(244, 114, 182, 0.4)');
            break;
        case 'autumn':
            root.style.setProperty('--season-primary', '#f97316'); 
            root.style.setProperty('--season-glow', 'rgba(249, 115, 22, 0.4)');
            break;
    }
  }, [season]);

  // Listener do Mouse
  useEffect(() => {
    if (season === 'off') return;

    const handleMouseMove = (e: MouseEvent) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
        mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseout', handleMouseLeave);
    };
  }, [season]);

  // Gerenciador de Partículas
  useEffect(() => {
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

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const particles: any[] = [];
    const particleCount = season === 'winter' ? 200 : 60; 

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speedY: Math.random() * (season === 'winter' ? 2 : 0.8) + 0.3,
        speedX: Math.random() * 1 - 0.5,
        vx: 0,
        vy: 0,
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
      const interactionRadius = 150;

      particles.forEach(p => {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < interactionRadius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (interactionRadius - distance) / interactionRadius;
            const power = 12;

            p.vx += forceDirectionX * force * power;
            p.vy += forceDirectionY * force * power;
        }

        p.x += p.speedX + p.vx;
        p.y += p.speedY + p.vy;

        if (season === 'spring' || season === 'autumn') {
            p.x += Math.sin(p.y * 0.01) * 0.5;
        }

        p.vx *= 0.92;
        p.vy *= 0.92;

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.vx = 0;
          p.vy = 0;
        }
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.x < -20) p.x = canvas.width + 20;

        ctx.save();
        ctx.translate(p.x, p.y);

        if (season === 'winter') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.fill();
        } else if (season === 'autumn') {
          p.rotation += p.rotationSpeed + (p.vx * 2);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
          const colors = ['#eab308', '#f97316', '#ef4444', '#78350f']; 
          const colorIndex = Math.floor(p.size % colors.length);
          ctx.fillStyle = colors[colorIndex];
          ctx.globalAlpha = p.opacity;
          ctx.fill();
        } else if (season === 'spring') {
          p.rotation += p.rotationSpeed * 0.5;
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          const colors = ['#fbcfe8', '#f9a8d4', '#f472b6', '#ffffff', '#e879f9']; 
          const colorIndex = Math.floor((p.size * 10) % colors.length);
          ctx.fillStyle = colors[colorIndex];
          ctx.globalAlpha = p.opacity;
          ctx.fill();
        } else if (season === 'summer') {
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

  const getButtonStyles = () => {
    if (season === 'off') return '';
    const targets = `button:not(.no-effect), .btn-effect, .seasonal-target`;
    let seasonalRules = '';

    switch (season) {
      case 'winter':
        seasonalRules = `
          ${targets} { position: relative; border-top: 1px solid rgba(255,255,255,0.4) !important; }
          ${targets.replace(/,/g, '::before,') + '::before'} { content: ''; position: absolute; top: -4px; left: 2px; right: 2px; height: 6px; background: white; border-radius: 4px 4px 2px 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); pointer-events: none; z-index: 20; opacity: 0.9; }
        `;
        break;
      case 'summer':
        seasonalRules = `
          @keyframes sweat-drop { 0% { top: 0; opacity: 0; height: 4px; } 20% { opacity: 0.8; height: 8px; } 100% { top: 100%; opacity: 0; height: 4px; } }
          ${targets} { position: relative; overflow: hidden; }
          ${targets.replace(/,/g, '::before,') + '::before'} { content: ''; position: absolute; left: 20%; width: 3px; background: rgba(255,255,255,0.6); border-radius: 2px; animation: sweat-drop 3s infinite ease-in; pointer-events: none; }
        `;
        break;
      case 'spring':
        seasonalRules = `
          ${targets} { position: relative; }
          ${targets.replace(/,/g, '::before,') + '::before'} { content: '🌸'; position: absolute; top: -8px; right: -4px; font-size: 14px; animation: grow 0.5s forwards; pointer-events: none; z-index: 20; }
          @keyframes grow { from { transform: scale(0) translateY(5px); } to { transform: scale(1) translateY(0); } }
        `;
        break;
      case 'autumn':
        seasonalRules = `
          ${targets} { position: relative; }
          ${targets.replace(/,/g, '::before,') + '::before'} { content: '🍂'; position: absolute; top: -12px; left: 10%; font-size: 14px; transform: rotate(-15deg); pointer-events: none; z-index: 20; }
        `;
        break;
    }

    return `
      ${seasonalRules}
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
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[9998]" style={{ opacity: 0.8 }} />
    </>
  );
};
