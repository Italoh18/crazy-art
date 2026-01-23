
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { X, User, Lock, ShoppingBag, BookOpen, Tv, LogOut, ChevronLeft, ChevronRight, Sparkles, LayoutGrid, Layers } from 'lucide-react';
import { GalaxyGame } from '../components/GalaxyGame';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'client' | 'admin'>('client');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [gameMode, setGameMode] = useState(false);
  const [scrollY, setScrollY] = useState(0); 
  
  const { loginAdmin, loginClient, role, logout } = useAuth();
  const { carouselImages } = useData();
  const navigate = useNavigate();

  const tapCountRef = useRef(0);
  const resetTapTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      opacity: Math.random(),
      twinkleDuration: `${Math.random() * 3 + 2}s`,
      twinkleDelay: `${Math.random() * 2}s`,
      floatDuration: `${Math.random() * 10 + 10}s`,
      floatDelay: `${Math.random() * 10}s`
    }));
  }, []);

  const meteors = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 50}%`,
      animationDelay: `${Math.random() * 10 + 1}s`,
      animationDuration: `${Math.random() * 2 + 3}s`
    }));
  }, []);

  useEffect(() => {
    if (carouselImages.length > 0) {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }
  }, [carouselImages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
            e.preventDefault();
            setGameMode(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGalaxyTap = () => {
    if (gameMode) return;
    tapCountRef.current += 1;
    if (resetTapTimeoutRef.current) clearTimeout(resetTapTimeoutRef.current);

    if (tapCountRef.current === 3) {
        setGameMode(true);
        tapCountRef.current = 0;
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(100);
    } else {
        resetTapTimeoutRef.current = setTimeout(() => { tapCountRef.current = 0; }, 500);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (loginMode === 'admin') {
      const success = await loginAdmin(inputValue);
      if (success) {
        setIsModalOpen(false);
        navigate('/customers');
        window.location.reload();
      } else {
        setError('Código de acesso inválido.');
      }
    } else {
      const success = await loginClient(inputValue);
      if (success) {
        setIsModalOpen(false);
        navigate('/my-area');
        window.location.reload();
      } else {
        setError('Documento (CPF/CNPJ) não encontrado.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (loginMode === 'client') {
          let v = e.target.value.replace(/\D/g, '');
          if (v.length <= 11) {
            v = v.replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d{1,2})/, '$1-$2');
          } else {
            v = v.replace(/^(\d{2})(\d)/, '$1.$2')
                 .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                 .replace(/\.(\d{3})(\d)/, '.$1/$2')
                 .replace(/(\d{4})(\d)/, '$1-$2');
          }
          setInputValue(v.substring(0, 18));
      } else {
          setInputValue(e.target.value);
      }
  };

  const handleHeaderButtonClick = () => {
      if (role !== 'guest') {
          logout();
          navigate('/');
      } else {
          setIsModalOpen(true);
      }
  };

  const sections = [
    { name: 'Minha Área', icon: User, status: 'active', path: '/my-area' },
    { name: 'Loja', icon: ShoppingBag, status: 'active', path: '/shop' },
    { name: 'Blog', icon: BookOpen, status: 'soon', path: '' },
  ];

  const handleSectionClick = (section: any) => {
      if (section.status !== 'active') return;
      if (section.path === '/my-area' && role === 'guest') {
          setIsModalOpen(true);
          return;
      }
      navigate(section.path);
  };

  const headerFont = { fontFamily: '"Times New Roman", Times, serif' };

  return (
    <div className="min-h-screen bg-zinc-950 text-text flex flex-col relative overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[150px] animate-float"></div>
      </div>

      {role === 'guest' && (
        <header className="fixed top-0 left-0 w-full z-40 h-20 px-6 flex items-center justify-between bg-black/30 backdrop-blur-lg border-b border-white/5 transition-all duration-300">
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] bg-clip-text text-transparent bg-crazy-gradient text-center whitespace-nowrap uppercase drop-shadow-sm" style={headerFont}>
              CRAZY ART
            </h1>
          </div>
          <div className="ml-auto relative group z-10">
              <div className="absolute -inset-0.5 bg-crazy-gradient rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
              <button onClick={handleHeaderButtonClick} className="relative bg-black text-white px-5 py-1.5 rounded-full border border-zinc-800 hover:text-white transition duration-200 text-[11px] font-bold tracking-widest flex items-center justify-center min-w-[80px] uppercase hover:bg-zinc-900">
                  Login
              </button>
          </div>
        </header>
      )}

      <main className={`relative z-10 flex-1 flex flex-col items-center w-full ${role === 'guest' ? 'pt-20' : 'pt-0'}`}>
        
        <div 
            onClick={handleGalaxyTap}
            className="w-full h-[70vh] md:h-[80vh] relative overflow-hidden bg-black group shadow-2xl perspective-1000 cursor-pointer select-none"
        >
          <div className="absolute inset-0 z-0 overflow-hidden bg-black">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#000000_100%)] opacity-60"></div>
             <div className="absolute inset-0 pointer-events-none" style={{ transform: `translateY(${scrollY * 0.3}px)` }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180vw] h-[180vw] bg-flare-gradient opacity-10 blur-[120px] animate-spin-slow mix-blend-screen"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[140vw] bg-conic-gradient(from 90deg, #4c1d95, #000, #4c1d95) opacity-20 blur-[90px] animate-spin-reverse-slow mix-blend-color-dodge"></div>
             </div>
             <div className="absolute inset-0 z-10" style={{ transform: `translateY(${scrollY * 0.5}px)` }}>
                {stars.map((star) => (
                    <div key={star.id} className="absolute animate-float" style={{ left: star.left, top: star.top, animationDuration: star.floatDuration, animationDelay: star.floatDelay }}>
                        <div className="rounded-full bg-white animate-twinkle" style={{ width: `${star.size}px`, height: `${star.size}px`, opacity: star.opacity, animationDuration: star.twinkleDuration, animationDelay: star.twinkleDelay, boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.8)` }} />
                    </div>
                ))}
             </div>
             {!gameMode && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {meteors.map((meteor) => (
                        <div key={meteor.id} className="absolute h-0.5 w-[150px] bg-gradient-to-r from-transparent via-white to-transparent animate-meteor opacity-0" style={{ top: meteor.top, left: meteor.left, animationDelay: meteor.animationDelay, animationDuration: meteor.animationDuration }}></div>
                    ))}
                </div>
             )}
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
             <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black opacity-90 z-20"></div>
          </div>

          {gameMode && (
              <div className="absolute inset-0 z-50">
                  <GalaxyGame onClose={() => setGameMode(false)} />
              </div>
          )}

          {!gameMode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none pb-[20vh]">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-full animate-pulse-slow"></div>
                    <h2 className="text-5xl md:text-7xl font-bold text-white tracking-[0.2em] font-heading text-center drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] animate-fade-in-up" style={headerFont}>
                        CRAZY ART
                    </h2>
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-500 to-transparent mx-auto my-6"></div>
                    <p className="text-zinc-300 text-sm md:text-lg tracking-[0.5em] text-center uppercase animate-fade-in-up font-light" style={{ animationDelay: '200ms' }}>
                        transformando ideias
                    </p>
                </div>
            </div>
          )}

          {!gameMode && (
            <div className="absolute bottom-0 left-0 w-full h-[20%] z-40 bg-black/60 backdrop-blur-md border-t border-white/10 shadow-[0_-10px_50px_rgba(0,0,0,0.8)]" onClick={(e) => e.stopPropagation()}>
                <div className="w-full h-full flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                    {carouselImages.length > 0 ? (
                        carouselImages.map((img) => (
                            <div key={img.id} className="w-full h-full flex-shrink-0 relative group/slide">
                                <img src={img.url} alt="Banner" className="w-full h-full object-cover opacity-70 group-hover/slide:opacity-100 transition-opacity duration-500 scale-105" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=1920'; }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            </div>
                        ))
                    ) : (
                        [0, 1].map((index) => (
                            <div key={index} className="w-full h-full flex-shrink-0 relative flex items-center justify-center bg-zinc-900/50">
                                <div className="flex items-center gap-3 opacity-50"><Sparkles size={16} /><span className="text-xs uppercase tracking-widest text-zinc-400">Destaques em Breve</span></div>
                            </div>
                        ))
                    )}
                </div>
                {carouselImages.length > 1 && (
                    <>
                        <button onClick={() => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-white/20 transition-all border border-white/10 backdrop-blur-sm group hover:scale-110"><ChevronLeft size={16} /></button>
                        <button onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselImages.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-white/20 transition-all border border-white/10 backdrop-blur-sm group hover:scale-110"><ChevronRight size={16} /></button>
                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                            {carouselImages.map((_, i) => (
                                <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-8 bg-primary shadow-[0_0_10px_#f59e0b]' : 'w-2 bg-zinc-600 hover:bg-zinc-400'}`} />
                            ))}
                        </div>
                    </>
                )}
            </div>
          )}
        </div>

        {/* CONTAINER DOS BOTÕES PRINCIPAIS REDUZIDO */}
        <div className="w-full max-w-4xl px-6 mb-24 mt-8 relative z-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sections.map((section, idx) => (
              <div key={section.name} onClick={() => handleSectionClick(section)} className="h-full">
                <div className={`h-64 rounded-2xl seasonal-target transition-all duration-200 group relative ${section.status === 'active' ? 'cursor-pointer active:scale-95 active:shadow-[0_0_30px_rgba(245,158,11,0.4)]' : 'opacity-60 cursor-not-allowed grayscale'}`}>
                    <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 group-hover:border-primary/60 group-hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.6),inset_0_0_15px_-5px_rgba(245,158,11,0.3)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-500"></div>
                    </div>
                    <div className="relative h-full flex flex-col items-center justify-center gap-6 p-8">
                        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-400 group-hover:text-primary group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition duration-300 shadow-xl">
                            <section.icon size={36} strokeWidth={1.5} />
                        </div>
                        <span className="text-lg font-bold text-zinc-300 group-hover:text-white uppercase tracking-wider transition-colors" style={{ fontFamily: '"Times New Roman", Times, serif', textShadow: '0 10px 20px rgba(0,0,0,0.8)' }}>
                            {section.name}
                        </span>
                        {section.status === 'soon' && (
                            <div className="absolute top-4 right-4"><span className="text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-500 px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-lg">Em Breve</span></div>
                        )}
                        <div className="absolute bottom-6 right-6 w-2 h-2 bg-primary/60 rounded-full blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity delay-100"></div>
                    </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* BOTÃO MONTE SEU LAYOUT (INATIVO) */}
          <div className="mt-8 max-w-2xl mx-auto">
              <div 
                className="w-full h-24 rounded-2xl glass-panel border border-white/5 flex items-center justify-between px-8 group opacity-60 grayscale cursor-not-allowed overflow-hidden relative"
              >
                  <div className="flex items-center gap-6 relative z-10">
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-600">
                          <Layers size={28} strokeWidth={1.5} />
                      </div>
                      <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-zinc-400 tracking-[0.1em] uppercase" style={headerFont}>Monte seu Layout</h3>
                            <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-bold">EM BREVE</span>
                          </div>
                          <p className="text-zinc-600 text-xs tracking-wider uppercase">Visualize camisas e shorts em 3D</p>
                      </div>
                  </div>
              </div>
          </div>

          {/* BOTÃO RETANGULAR PROGRAMAS */}
          <div className="mt-4 max-w-2xl mx-auto">
              <div 
                onClick={() => navigate('/programs')}
                className="w-full h-24 rounded-2xl glass-panel seasonal-target border border-white/10 flex items-center justify-between px-8 group cursor-pointer active:scale-95 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] overflow-hidden"
              >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="flex items-center gap-6 relative z-10">
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-400 group-hover:text-primary group-hover:border-primary/40 group-hover:shadow-glow transition-all duration-300">
                          <Tv size={28} strokeWidth={1.5} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-white tracking-[0.1em] uppercase" style={headerFont}>Programas & Ferramentas</h3>
                          <p className="text-zinc-500 text-xs tracking-wider group-hover:text-zinc-400 transition-colors uppercase">Acesse utilitários e apps exclusivos</p>
                      </div>
                  </div>
                  
                  <div className="relative z-10 opacity-40 group-hover:opacity-100 transition-opacity">
                      <LayoutGrid size={24} className="text-zinc-400 group-hover:text-primary transition-colors" />
                  </div>
              </div>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in-up">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-transform hover:rotate-90"><X size={24} /></button>
            <div className="flex flex-col items-center mb-8 relative z-10">
                 <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-4 ring-1 ring-zinc-800 shadow-xl">
                    {loginMode === 'client' ? <User className="text-primary" size={40} strokeWidth={1.5} /> : <Lock className="text-secondary" size={40} strokeWidth={1.5} />}
                 </div>
                 <h2 className="text-2xl font-bold text-white uppercase tracking-wide" style={headerFont}>{loginMode === 'client' ? 'Área do Cliente' : 'Acesso Adm'}</h2>
                 <p className="text-zinc-500 text-sm mt-2">Entre com seu CPF ou CNPJ</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                <input type={loginMode === 'client' ? "text" : "password"} placeholder={loginMode === 'client' ? "CPF ou CNPJ (apenas números)" : "Código de Acesso"} className="w-full bg-black/50 border border-zinc-700 rounded-xl px-5 py-4 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-600 text-center tracking-widest" value={inputValue} onChange={handleInputChange} autoFocus />
                {error && <div className="text-red-500 text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20 animate-pulse text-xs">{error}</div>}
                <button type="submit" className="w-full bg-gradient-to-r from-white to-zinc-300 text-black font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-all transform active:scale-95 uppercase tracking-wider text-sm btn-active-effect">Entrar</button>
              </form>
              <div className="mt-8 text-center relative z-10">
                <button onClick={() => setLoginMode(loginMode === 'client' ? 'admin' : 'client')} className="text-xs text-zinc-500 hover:text-white transition-colors border-b border-dashed border-zinc-700 hover:border-white pb-0.5">{loginMode === 'client' ? 'Acesso Administrativo' : 'Voltar para Login de Cliente'}</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
