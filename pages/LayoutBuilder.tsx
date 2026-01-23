
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Rotate3d, Share2, ZoomIn, ZoomOut, RefreshCcw, Layers } from 'lucide-react';

export default function LayoutBuilder() {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);

  // Controle de rotação pelo mouse/touch
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    lastMouseX.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const delta = clientX - lastMouseX.current;
    setRotation((prev) => prev + delta * 0.5);
    lastMouseX.current = clientX;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Efeito de estrelas
  const stars = Array.from({ length: 80 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    opacity: Math.random(),
    animDelay: `${Math.random() * 5}s`
  }));

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.6, Math.min(1.5, prev + delta)));
  };

  // Definições de Cores
  const layoutColors = {
    base: "#e4e4e7", // Branco levemente cinza para simular o tecido da imagem
    stroke: "#18181b", // Linhas pretas (desenho técnico)
    accent: "#DC2626", // Detalhes em vermelho
    gold: "#F59E0B"
  };

  return (
    <div 
      className="min-h-screen bg-black text-white overflow-hidden relative flex flex-col"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2a2a35_0%,_#000000_100%)] opacity-90"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] animate-pulse-slow"></div>
        {stars.map(s => (
          <div 
            key={s.id}
            className="absolute bg-white rounded-full animate-twinkle"
            style={{
              top: s.top,
              left: s.left,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity * 0.5,
              animationDelay: s.animDelay
            }}
          />
        ))}
      </div>

      {/* HEADER */}
      <div className="relative z-20 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-4">
          <Link to="/" className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition border border-white/10">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading tracking-wide">Monte seu Layout</h1>
            <p className="text-xs text-zinc-500 hidden md:block">Modelo Técnico (Mockup)</p>
          </div>
        </div>
        <div className="flex gap-3">
             <button onClick={() => setRotation(0)} className="p-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
                <RefreshCcw size={20} />
             </button>
            <button className="p-3 bg-primary text-white rounded-full shadow-lg hover:bg-amber-600 transition hover:scale-105 active:scale-95 shadow-primary/20">
            <Share2 size={20} />
            </button>
        </div>
      </div>

      {/* VIEWER AREA */}
      <div className="flex-1 relative z-10 flex items-center justify-center perspective-1000 cursor-grab active:cursor-grabbing">
        
        {/* 3D SCENE CONTAINER */}
        <div 
          className="relative w-[340px] h-[600px] md:w-[420px] md:h-[700px] transition-transform duration-75 ease-out"
          style={{ 
            transform: `scale(${zoom}) rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* =================================================================================
              FRENTE (FRONT SIDE)
          ================================================================================= */}
          <div className="absolute inset-0 backface-hidden drop-shadow-2xl" style={{ transform: 'translateZ(1px)' }}>
            
            <svg viewBox="0 0 500 750" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="fabricGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f4f4f5" />
                        <stop offset="50%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#f4f4f5" />
                    </linearGradient>
                    <filter id="shadowFilter">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="black" floodOpacity="0.2" />
                    </filter>
                </defs>

                {/* --- CAMISA FRENTE --- */}
                <g transform="translate(0, 20)">
                    {/* Corpo Principal (T-Shirt Standard Cut) */}
                    <path 
                        d="M160,50 
                           Q250,80 340,50  
                           L440,140 
                           L410,180 
                           L350,140 
                           L350,420 
                           Q250,425 150,420 
                           L150,140 
                           L90,180 
                           L60,140 
                           Z" 
                        fill="url(#fabricGradient)" 
                        stroke={layoutColors.stroke} 
                        strokeWidth="2"
                    />

                    {/* Detalhe da Gola (Redonda/Careca) */}
                    <path d="M160,50 Q250,80 340,50" fill="none" stroke={layoutColors.stroke} strokeWidth="2" /> {/* Costas da gola */}
                    <path d="M160,50 Q250,120 340,50" fill="#f0f0f0" stroke={layoutColors.stroke} strokeWidth="2" /> {/* Frente da gola */}
                    <path d="M170,55 Q250,110 330,55" fill="none" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" /> {/* Costura Gola */}

                    {/* Etiqueta interna */}
                    <path d="M230,65 Q250,70 270,65 L270,75 Q250,80 230,75 Z" fill="#ddd" stroke="none" />

                    {/* Mangas (Bainha) */}
                    <path d="M60,140 L90,180" fill="none" stroke={layoutColors.stroke} strokeWidth="2" />
                    <line x1="65" y1="170" x2="85" y2="150" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" /> {/* Costura Manga Esq */}
                    
                    <path d="M440,140 L410,180" fill="none" stroke={layoutColors.stroke} strokeWidth="2" />
                    <line x1="435" y1="170" x2="415" y2="150" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" /> {/* Costura Manga Dir */}

                    {/* Cava da Manga */}
                    <path d="M150,140 Q140,90 160,50" fill="none" stroke={layoutColors.stroke} strokeWidth="1" opacity="0.3" />
                    <path d="M350,140 Q360,90 340,50" fill="none" stroke={layoutColors.stroke} strokeWidth="1" opacity="0.3" />

                    {/* Bainha Inferior */}
                    <path d="M150,410 Q250,415 350,410" fill="none" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" />

                    {/* LOGO */}
                    <g transform="translate(250, 200)">
                        <text x="0" y="0" textAnchor="middle" fill="#18181b" fontFamily="Impact, sans-serif" fontSize="50" letterSpacing="2">CRAZY</text>
                        <text x="0" y="30" textAnchor="middle" fill={layoutColors.accent} fontFamily="Arial, sans-serif" fontSize="20" letterSpacing="5" fontWeight="bold">ART</text>
                    </g>
                </g>

                {/* --- SHORT FRENTE --- */}
                <g transform="translate(0, 440)">
                    {/* Outline Short */}
                    <path 
                        d="M130,20 
                           L370,20 
                           L390,260 
                           L260,270 
                           L250,150 
                           L240,270 
                           L110,260 
                           Z" 
                        fill="url(#fabricGradient)" 
                        stroke={layoutColors.stroke} 
                        strokeWidth="2"
                    />

                    {/* Cós Elástico (Ruffled Waistband) */}
                    <rect x="130" y="20" width="240" height="35" fill="#e4e4e7" stroke={layoutColors.stroke} strokeWidth="2" />
                    {/* Linhas de franzido do elástico */}
                    <path d="M140,20 L140,55 M150,20 L150,55 M160,20 L160,55 M170,20 L170,55 M180,20 L180,55 M190,20 L190,55" stroke={layoutColors.stroke} strokeWidth="0.5" opacity="0.5" />
                    <path d="M360,20 L360,55 M350,20 L350,55 M340,20 L340,55 M330,20 L330,55 M320,20 L320,55 M310,20 L310,55" stroke={layoutColors.stroke} strokeWidth="0.5" opacity="0.5" />
                    
                    {/* Cordão (Drawstring) */}
                    <path d="M240,37 Q235,80 230,120" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
                    <path d="M260,37 Q265,80 270,120" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
                    {/* Ponteiras */}
                    <rect x="227" y="115" width="6" height="12" fill={layoutColors.accent} rx="2" />
                    <rect x="267" y="115" width="6" height="12" fill={layoutColors.accent} rx="2" />
                    {/* Ilhós */}
                    <circle cx="240" cy="37" r="3" fill="#333" />
                    <circle cx="260" cy="37" r="3" fill="#333" />

                    {/* Bolsos Laterais Curvos */}
                    <path d="M132,60 Q170,120 170,180" fill="none" stroke={layoutColors.stroke} strokeWidth="1.5" />
                    <path d="M170,180 L170,60" fill="none" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" opacity="0.5" /> {/* Saco do bolso interno */}
                    
                    <path d="M368,60 Q330,120 330,180" fill="none" stroke={layoutColors.stroke} strokeWidth="1.5" />
                    
                    {/* Gancho (Fly) Falso */}
                    <path d="M250,55 L250,150" fill="none" stroke={layoutColors.stroke} strokeWidth="1" />
                    <path d="M250,150 Q230,160 250,170" fill="none" stroke={layoutColors.stroke} strokeWidth="1" opacity="0.5" />

                    {/* Abertura Lateral (Vents) */}
                    <path d="M110,240 L110,260" fill="none" stroke={layoutColors.stroke} strokeWidth="2" />
                    <circle cx="114" cy="245" r="2" fill={layoutColors.stroke} />
                    
                    <path d="M390,240 L390,260" fill="none" stroke={layoutColors.stroke} strokeWidth="2" />
                    <circle cx="386" cy="245" r="2" fill={layoutColors.stroke} />

                    {/* Bainha Short */}
                    <path d="M110,250 L240,260" fill="none" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" />
                    <path d="M390,250 L260,260" fill="none" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" />
                </g>
            </svg>
          </div>

          {/* =================================================================================
              COSTAS (BACK SIDE)
          ================================================================================= */}
          <div 
            className="absolute inset-0 backface-hidden drop-shadow-2xl" 
            style={{ transform: 'rotateY(180deg) translateZ(1px)' }}
          >
             <svg viewBox="0 0 500 750" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="fabricGradientBack" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f4f4f5" />
                        <stop offset="50%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#f4f4f5" />
                    </linearGradient>
                </defs>

                {/* --- CAMISA COSTAS --- */}
                <g transform="translate(0, 20)">
                    {/* Corpo Costas */}
                    <path 
                        d="M160,50 
                           Q250,40 340,50  
                           L440,140 
                           L410,180 
                           L350,140 
                           L350,420 
                           Q250,425 150,420 
                           L150,140 
                           L90,180 
                           L60,140 
                           Z" 
                        fill="url(#fabricGradientBack)" 
                        stroke={layoutColors.stroke} 
                        strokeWidth="2"
                    />

                    {/* Gola Costas */}
                    <path d="M160,50 Q250,70 340,50" fill="none" stroke={layoutColors.stroke} strokeWidth="2" />
                    <path d="M160,50 Q250,40 340,50" fill="none" stroke={layoutColors.stroke} strokeWidth="2" /> {/* Top edge */}

                    {/* Mangas Costas */}
                    <path d="M60,140 L90,180" fill="none" stroke={layoutColors.stroke} strokeWidth="2" />
                    <path d="M440,140 L410,180" fill="none" stroke={layoutColors.stroke} strokeWidth="2" />
                    <path d="M150,140 Q140,90 160,50" fill="none" stroke={layoutColors.stroke} strokeWidth="1" opacity="0.3" />
                    <path d="M350,140 Q360,90 340,50" fill="none" stroke={layoutColors.stroke} strokeWidth="1" opacity="0.3" />

                    {/* Bainha Inferior */}
                    <path d="M150,410 Q250,415 350,410" fill="none" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" />

                    {/* Nome e Número */}
                    <g transform="translate(250, 180)">
                        <text x="0" y="0" textAnchor="middle" fill="#18181b" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" letterSpacing="2">SEU NOME</text>
                        <text x="0" y="140" textAnchor="middle" fill="none" stroke="#18181b" strokeWidth="2" fontFamily="Impact, sans-serif" fontSize="140">10</text>
                    </g>
                </g>

                {/* --- SHORT COSTAS --- */}
                <g transform="translate(0, 440)">
                    {/* Outline Short */}
                    <path 
                        d="M130,20 
                           L370,20 
                           L390,260 
                           L260,270 
                           L250,170 
                           L240,270 
                           L110,260 
                           Z" 
                        fill="url(#fabricGradientBack)" 
                        stroke={layoutColors.stroke} 
                        strokeWidth="2"
                    />

                    {/* Cós Costas */}
                    <rect x="130" y="20" width="240" height="35" fill="#e4e4e7" stroke={layoutColors.stroke} strokeWidth="2" />
                    {/* Franzido */}
                    <path d="M140,20 L140,55 M160,20 L160,55 M180,20 L180,55 M200,20 L200,55" stroke={layoutColors.stroke} strokeWidth="0.5" opacity="0.5" />
                    <path d="M360,20 L360,55 M340,20 L340,55 M320,20 L320,55 M300,20 L300,55" stroke={layoutColors.stroke} strokeWidth="0.5" opacity="0.5" />

                    {/* Bolsos Traseiros (Welt Pockets) */}
                    <rect x="170" y="80" width="60" height="10" fill="none" stroke={layoutColors.stroke} strokeWidth="1.5" />
                    <rect x="270" y="80" width="60" height="10" fill="none" stroke={layoutColors.stroke} strokeWidth="1.5" />

                    {/* Costura Central Traseira */}
                    <path d="M250,55 L250,170" fill="none" stroke={layoutColors.stroke} strokeWidth="1" />

                    {/* Abertura Lateral (Vents) */}
                    <path d="M110,240 L110,260" fill="none" stroke={layoutColors.stroke} strokeWidth="2" />
                    <circle cx="114" cy="245" r="2" fill={layoutColors.stroke} />
                    
                    <path d="M390,240 L390,260" fill="none" stroke={layoutColors.stroke} strokeWidth="2" />
                    <circle cx="386" cy="245" r="2" fill={layoutColors.stroke} />

                    {/* Bainha */}
                    <path d="M110,250 L240,260" fill="none" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" />
                    <path d="M390,250 L260,260" fill="none" stroke={layoutColors.stroke} strokeWidth="1" strokeDasharray="3 1" />
                </g>
             </svg>
          </div>
        </div>

        {/* SHADOW */}
        <div className="absolute bottom-[5%] w-[300px] h-[30px] bg-black/60 blur-xl rounded-[100%] z-0 transform rotate-x-60"></div>
      </div>

      {/* CONTROLS */}
      <div className="relative z-20 p-8 glass-panel border-t border-white/10 mt-auto backdrop-blur-xl bg-black/40">
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between text-zinc-400 text-sm font-mono mb-2">
            <span className="flex items-center gap-2"><Rotate3d size={14} /> ROTAÇÃO 360°</span>
            <span className="text-white">{Math.round(rotation % 360)}°</span>
          </div>
          
          {/* Custom Range Slider */}
          <div className="relative w-full h-2 bg-zinc-800 rounded-full overflow-hidden group">
             <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-75" 
                style={{ width: `${((rotation % 360) / 360) * 100}%` }}
             ></div>
             <input 
                type="range" 
                min="0" 
                max="360" 
                value={rotation % 360} 
                onChange={(e) => setRotation(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
          </div>

          <div className="flex justify-center gap-6 pt-2">
            <button 
              onClick={() => handleZoom(-0.1)} 
              className="p-4 bg-zinc-900 rounded-2xl hover:bg-zinc-800 text-white transition active:scale-95 border border-white/5 shadow-lg group"
              title="Reduzir Zoom"
            >
               <ZoomOut size={20} className="group-hover:scale-110 transition-transform" />
            </button>
            
            <button 
              onClick={() => setRotation(prev => prev + 180)} 
              className="flex items-center gap-3 px-8 py-4 bg-zinc-900 rounded-2xl hover:bg-zinc-800 text-white transition font-bold border border-white/5 shadow-lg active:scale-95 group"
            >
               <Layers size={20} className="text-primary group-hover:rotate-180 transition-transform duration-500" />
               <span className="tracking-widest text-sm">GIRAR</span>
            </button>
            
             <button 
              onClick={() => handleZoom(0.1)} 
              className="p-4 bg-zinc-900 rounded-2xl hover:bg-zinc-800 text-white transition active:scale-95 border border-white/5 shadow-lg group"
              title="Aumentar Zoom"
            >
               <ZoomIn size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <p className="text-center text-zinc-600 text-[10px] uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Arraste para interagir
          </p>
        </div>
      </div>

      <style>{`
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .perspective-1000 {
          perspective: 1500px;
        }
      `}</style>
    </div>
  );
}
