
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { X, User, Lock, ShoppingBag, BookOpen, Tv, ChevronLeft, ChevronRight, Sparkles, LayoutGrid, Layers, MapPin, UserPlus, Menu, LogOut, Wrench, Grid, Palette } from 'lucide-react';
import { GalaxyGame } from '../components/GalaxyGame';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'client' | 'admin'>('client');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [gameMode, setGameMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Registration Form State
  const [regData, setRegData] = useState({
    name: '', phone: '', email: '', cpf: '',
    street: '', number: '', zipCode: ''
  });
  
  const { loginAdmin, loginClient, role, logout, currentCustomer } = useAuth();
  const { carouselImages, addCustomer, trustedCompanies, faviconUrl } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const tapCountRef = useRef(0);
  const resetTapTimeoutRef = useRef<any>(null);

  const stars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      opacity: Math.random(),
      twinkleDuration: `${Math.random() * 3 + 2}s`,
    }));
  }, []);

  const meteors = useMemo(() => {
    return Array.from({ length: 2 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 50}%`,
      animationDelay: `${Math.random() * 10 + 1}s`,
      animationDuration: `${Math.random() * 2 + 3}s`
    }));
  }, []);

  // Verificar se há solicitação de login via URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'login' && role === 'guest') {
        setIsModalOpen(true);
        window.history.replaceState({}, '', '/');
    }
  }, [location, role]);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!regData.name || !regData.cpf || !regData.phone) {
        setError('Por favor, preencha os campos obrigatórios.');
        return;
    }

    try {
        await addCustomer({
            name: regData.name,
            phone: regData.phone,
            email: regData.email,
            cpf: regData.cpf,
            address: {
                street: regData.street,
                number: regData.number,
                zipCode: regData.zipCode
            },
            creditLimit: 0.00 
        });
        
        const success = await loginClient(regData.cpf);
        if (success) {
            setIsModalOpen(false);
            navigate('/my-area');
            window.location.reload();
        } else {
            setIsRegisterMode(false);
            setInputValue(regData.cpf);
            setError('Cadastro realizado! Agora faça seu login.');
        }
    } catch (err: any) {
        setError(err.message || 'Erro ao realizar cadastro.');
    }
  };

  const maskDocument = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d{1,2})/, '$1-$2')
              .substring(0, 14);
    } else {
      return v.replace(/^(\d{2})(\d)/, '$1.$2')
              .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
              .replace(/\.(\d{3})(\d)/, '.$1/$2')
              .replace(/(\d{4})(\d)/, '$1-$2')
              .substring(0, 18);
    }
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (loginMode === 'client') {
          setInputValue(maskDocument(e.target.value));
      } else {
          setInputValue(e.target.value);
      }
  };

  const handleRegInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === 'cpf') value = maskDocument(value);
    if (name === 'phone') value = maskPhone(value);
    setRegData({ ...regData, [name]: value });
  };

  const menuItems = [
    ...(role !== 'guest' ? [{ name: 'Minha Área', icon: User, path: '/my-area', color: 'text-primary' }] : []),
    { name: 'Loja', icon: ShoppingBag, path: '/shop', color: 'text-emerald-400' },
    { name: 'Quitanda', sub: 'de Artes', icon: Palette, path: '/shop?tab=art', color: 'text-purple-400' }, 
    { name: 'Ferramentas', icon: Wrench, path: '/programs', color: 'text-blue-400' },
    { name: 'Blog', icon: BookOpen, path: '', color: 'text-zinc-400', disabled: true },
  ];

  const headerFont = { fontFamily: '"Times New Roman", Times, serif' };

  return (
    <div className="min-h-screen bg-zinc-950 text-text flex flex-col relative overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none transform-gpu">
        <div className="absolute top-[-10%] left-[10%] w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-[60px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[80px]"></div>
      </div>

      {/* CABEÇALHO (HEADER) - VISÍVEL PARA TODOS NA HOME */}
      <header className="fixed top-0 left-0 w-full z-50 h-20 px-6 grid grid-cols-3 items-center bg-black/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="flex justify-start">
            <button 
              className={`md:hidden transition p-2 rounded-full ${isMobileMenuOpen ? 'text-white bg-white/10' : 'text-zinc-300 hover:text-white'}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                <Menu size={24} />
            </button>
        </div>
        
        <div className="flex justify-center items-center">
          <h1 
            className="hidden md:block text-2xl font-bold tracking-[0.15em] bg-clip-text text-transparent bg-crazy-gradient text-center whitespace-nowrap uppercase drop-shadow-sm cursor-pointer hover:scale-105 transition-transform" 
            style={headerFont} 
            onClick={() => window.scrollTo(0,0)}
          >
            CRAZY ART
          </h1>

          <div className="md:hidden" onClick={() => window.scrollTo(0,0)}>
            {faviconUrl ? (
              <img src={faviconUrl} alt="Logo" className="h-12 w-auto object-contain drop-shadow-lg" />
            ) : (
              <h1 className="text-xl font-bold tracking-[0.15em] bg-clip-text text-transparent bg-crazy-gradient text-center whitespace-nowrap uppercase drop-shadow-sm" style={headerFont}>
                CRAZY ART
              </h1>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
            <button 
              onClick={() => {
                if (role === 'guest') {
                  setIsModalOpen(true);
                  setIsRegisterMode(false);
                } else {
                  navigate(role === 'admin' ? '/customers' : '/my-area');
                }
              }}
              className="relative group p-[1px] rounded-full transition-all duration-300 active:scale-95 hover:scale-105"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-orange-500 to-secondary rounded-full blur-[6px] opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-black h-full px-6 py-2 rounded-full flex items-center gap-2 border border-white/10 group-hover:border-white/30 transition-colors shadow-2xl">
                  <User size={14} className="text-primary group-hover:text-white transition-colors" />
                  <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">
                    {role === 'guest' ? 'Login' : (role === 'admin' ? 'Painel ADM' : 'Minha Área')}
                  </span>
                </div>
            </button>
        </div>
      </header>

      {/* NAV BAR DESKTOP (MENU HORIZONTAL) - VISÍVEL PARA TODOS NA HOME */}
      <nav className="fixed top-24 left-0 w-full z-40 hidden md:flex justify-center items-start pt-2 pb-2 pointer-events-none">
          <div className="flex gap-8 items-center pointer-events-auto bg-[#09090b]/80 backdrop-blur-xl border border-white/10 rounded-full px-10 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-slide-down-reveal transition-all duration-500 group relative seasonal-border">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

              {menuItems.map((item) => (
                  <div key={item.name} className="relative group/item">
                      {item.disabled ? (
                          <span className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-600 cursor-not-allowed flex items-center gap-2">
                              <item.icon size={14} />
                              <div className="flex flex-col items-start leading-none">
                                  <span>{item.name}</span>
                                  {item.sub && <span className="text-[8px] opacity-50 mt-0.5 tracking-tight font-normal">{item.sub}</span>}
                              </div>
                              <span className="text-[8px] opacity-50 ml-1 bg-zinc-800 px-1 rounded">(Breve)</span>
                          </span>
                      ) : (
                          <Link 
                              to={item.path}
                              className={`
                                  flex items-center gap-3 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300
                                  hover:bg-white/10 hover:text-white hover:scale-105
                                  ${item.color} bg-transparent
                              `}
                          >
                              <item.icon size={16} />
                              <div className="flex flex-col items-start leading-none">
                                  <span>{item.name}</span>
                                  {item.sub && <span className="text-[8px] opacity-80 mt-0.5 tracking-tight font-normal group-hover/item:text-white transition-colors">{item.sub}</span>}
                              </div>
                          </Link>
                      )}
                  </div>
              ))}
          </div>
      </nav>

      {/* Mobile Menu Floating Pill */}
      {isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed top-24 left-4 right-4 z-50 md:hidden animate-scale-in origin-top">
                <div className="bg-[#121215]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-2 relative overflow-hidden ring-1 ring-white/5 seasonal-border">
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/20 rounded-b-full shadow-[0_0_15px_rgba(255,255,255,0.2)]"></div>
                     
                     <div className="flex justify-between items-center mb-1 border-b border-white/5 pb-3">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Menu size={14} /> Menu
                        </span>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-400 hover:text-white bg-white/5 p-1.5 rounded-full transition active:scale-90"><X size={16} /></button>
                     </div>

                     {role === 'guest' ? (
                        <button 
                            onClick={() => { setIsMobileMenuOpen(false); setIsModalOpen(true); setIsRegisterMode(false); }}
                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group"
                        >
                            <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition"><User size={20} /></div>
                            <div>
                                <span className="block text-white font-bold text-sm uppercase tracking-wide">Login / Cadastro</span>
                                <span className="text-[10px] text-zinc-500">Acesse sua conta</span>
                            </div>
                        </button>
                     ) : (
                        <Link to={role === 'admin' ? '/customers' : '/my-area'} onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group">
                            <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition"><User size={20} /></div>
                            <div>
                                <span className="block text-white font-bold text-sm uppercase tracking-wide">
                                    {role === 'admin' ? 'Painel Administrativo' : 'Minha Área'}
                                </span>
                                <span className="text-[10px] text-zinc-500">Gerenciar conta</span>
                            </div>
                        </Link>
                     )}

                     <div className="h-px bg-white/5 my-1"></div>

                     <Link to="/shop" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group">
                        <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition"><ShoppingBag size={20} /></div>
                        <span className="text-white font-bold text-sm uppercase tracking-wide">Loja</span>
                     </Link>

                     <Link to="/shop?tab=art" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group">
                        <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition"><Palette size={20} /></div>
                        <div>
                            <span className="block text-white font-bold text-sm uppercase tracking-wide">Quitanda</span>
                            <span className="text-[10px] text-purple-400 font-bold">de Artes</span>
                        </div>
                     </Link>
                     
                     <Link to="/programs" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group">
                        <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition"><Wrench size={20} /></div>
                        <span className="text-white font-bold text-sm uppercase tracking-wide">Ferramentas</span>
                     </Link>

                     <div className="w-full text-left px-4 py-3 rounded-xl opacity-50 cursor-not-allowed flex items-center gap-4">
                        <div className="bg-zinc-800 p-2 rounded-lg text-zinc-500"><BookOpen size={20} /></div>
                        <span className="text-zinc-500 font-bold text-sm uppercase tracking-wide">Blog (Em Breve)</span>
                     </div>
                </div>
            </div>
          </>
      )}

      <main className="relative z-10 flex-1 flex flex-col items-center w-full pt-20">
        <div 
            onClick={handleGalaxyTap}
            className="w-full h-[60vh] md:h-[70vh] relative overflow-hidden bg-black group shadow-2xl cursor-pointer select-none"
        >
          <div className="absolute inset-0 z-0 overflow-hidden bg-black">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#000000_100%)] opacity-80"></div>
             <div className="absolute inset-0 z-10">
                {stars.map((star) => (
                    <div key={star.id} className="absolute" style={{ left: star.left, top: star.top }}>
                        <div className="rounded-full bg-white animate-twinkle" style={{ width: `${star.size}px`, height: `${star.size}px`, opacity: star.opacity, animationDuration: star.twinkleDuration }} />
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
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-90 z-20"></div>
          </div>

          {gameMode && (
              <div className="absolute inset-0 z-50">
                  <GalaxyGame onClose={() => setGameMode(false)} />
              </div>
          )}

          {!gameMode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none pb-[10vh]">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 blur-[30px] rounded-full"></div>
                    <h2 className="text-5xl md:text-7xl font-bold text-white tracking-[0.2em] font-heading text-center drop-shadow-lg animate-fade-in-up" style={headerFont}>
                        CRAZY ART
                    </h2>
                    <div className="h-px w-24 bg-zinc-700 mx-auto my-6"></div>
                    <p className="text-zinc-300 text-sm md:text-lg tracking-[0.5em] text-center uppercase animate-fade-in-up font-light" style={{ animationDelay: '200ms' }}>
                        transformando ideias
                    </p>
                </div>
            </div>
          )}

          {!gameMode && (
            <div className="absolute bottom-0 left-0 w-full h-[25%] z-40 bg-gradient-to-t from-black via-black/80 to-transparent" onClick={(e) => e.stopPropagation()}>
                <div className="w-full h-full flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                    {carouselImages.length > 0 ? (
                        carouselImages.map((img) => (
                            <div key={img.id} className="w-full h-full flex-shrink-0 relative">
                                <img src={img.url} alt="Banner" className="w-full h-full object-cover opacity-60" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=1920'; }} />
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
                        <button onClick={() => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-white/10 transition-all border border-white/5"><ChevronLeft size={16} /></button>
                        <button onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselImages.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-white/10 transition-all border border-white/5"><ChevronRight size={16} /></button>
                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                            {carouselImages.map((_, i) => (
                                <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1 rounded-full transition-all duration-300 ${currentSlide === i ? 'w-8 bg-primary' : 'w-2 bg-zinc-700'}`} />
                            ))}
                        </div>
                    </>
                )}
            </div>
          )}
        </div>

        {trustedCompanies.length > 0 && (
            <div className="w-full bg-zinc-950/80 backdrop-blur-sm py-12 border-t border-zinc-900 mb-8 animate-fade-in-up">
                <div className="max-w-7xl mx-auto px-6">
                    <h3 className="text-center text-sm font-bold text-zinc-500 uppercase tracking-[0.3em] mb-8 opacity-60">Empresas que Confiam</h3>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 hover:opacity-100 transition-opacity duration-500">
                        {trustedCompanies.map((company) => (
                            <div key={company.id} className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-500 hover:scale-110">
                                <img 
                                    src={company.image_url} 
                                    alt={company.name || "Empresa Parceira"} 
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/80 backdrop-blur-md p-4 animate-fade-in-up overflow-y-auto">
          <div className={`bg-zinc-900 border border-zinc-800 rounded-3xl w-full p-8 shadow-2xl relative overflow-hidden transition-all duration-500 ${isRegisterMode ? 'max-w-2xl max-h-[90vh] overflow-y-auto' : 'max-w-md'}`}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-transform hover:rotate-90 z-20"><X size={24} /></button>
            
            {!isRegisterMode ? (
              <div className="animate-fade-in">
                <div className="flex flex-col items-center mb-8 relative z-10">
                    <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-4 ring-1 ring-zinc-800 shadow-xl">
                        {loginMode === 'client' ? <User className="text-primary" size={40} strokeWidth={1.5} /> : <Lock className="text-secondary" size={40} strokeWidth={1.5} />}
                    </div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-wide" style={headerFont}>{loginMode === 'client' ? 'Área do Cliente' : 'Acesso Adm'}</h2>
                    <p className="text-zinc-500 text-sm mt-2">{loginMode === 'client' ? 'Entre com seu CPF ou CNPJ' : 'Digite o código administrativo'}</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                    <input 
                        type={loginMode === 'client' ? "text" : "password"} 
                        placeholder={loginMode === 'client' ? "000.000.000-00" : "Código de Acesso"} 
                        className="w-full bg-black/50 border border-zinc-700 rounded-xl px-5 py-4 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-600 text-center tracking-widest font-mono" 
                        value={inputValue} 
                        onChange={handleLoginInputChange} 
                        autoFocus 
                    />
                    {error && <div className="text-red-500 text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20 animate-pulse text-xs font-bold">{error}</div>}
                    <button type="submit" className="w-full bg-zinc-100 text-black font-bold py-4 rounded-xl hover:bg-white transition-all transform active:scale-95 uppercase tracking-wider text-sm btn-active-effect shadow-xl">Entrar</button>
                </form>

                <div className="mt-8 flex flex-col items-center gap-4 relative z-10">
                    {loginMode === 'client' && (
                        <button 
                            onClick={() => { setIsRegisterMode(true); setError(''); }}
                            className="text-sm font-bold text-primary hover:text-amber-400 transition-colors flex items-center gap-2 group"
                        >
                            <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
                            Ainda não tem conta? Cadastre-se
                        </button>
                    )}
                    <button onClick={() => { setLoginMode(loginMode === 'client' ? 'admin' : 'client'); setError(''); }} className="text-xs text-zinc-500 hover:text-white transition-colors border-b border-dashed border-zinc-700 hover:border-white pb-0.5">{loginMode === 'client' ? 'Acesso Administrativo' : 'Voltar para Login de Cliente'}</button>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <UserPlus size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-wide font-heading" style={headerFont}>Novo Cadastro</h2>
                        <p className="text-zinc-500 text-xs">Crie sua conta para acompanhar pedidos e comprar na loja.</p>
                    </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Nome Completo / Razão Social</label>
                            <input name="name" required value={regData.name} onChange={handleRegInputChange} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition placeholder-zinc-800" placeholder="Seu nome" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Telefone</label>
                            <input name="phone" required placeholder="(99) 99999-9999" value={regData.phone} onChange={handleRegInputChange} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition font-mono" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">CPF / CNPJ</label>
                            <input name="cpf" required placeholder="000.000.000-00" value={regData.cpf} onChange={handleRegInputChange} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition font-mono" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Email (Opcional)</label>
                            <input name="email" type="email" value={regData.email} onChange={handleRegInputChange} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" placeholder="exemplo@email.com" />
                        </div>

                        <div className="md:col-span-2 border-t border-zinc-800 pt-6 mt-2">
                            <h3 className="font-bold text-zinc-400 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
                                <MapPin size={14} className="text-primary" /> Endereço de Entrega
                            </h3>
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Rua</label>
                            <input name="street" required value={regData.street} onChange={handleRegInputChange} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" placeholder="Nome da rua" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Número</label>
                            <input name="number" required value={regData.number} onChange={handleRegInputChange} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition" placeholder="123" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">CEP</label>
                            <input name="zipCode" required value={regData.zipCode} onChange={handleRegInputChange} className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition font-mono" placeholder="00000-000" />
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20 text-xs font-bold animate-shake">{error}</div>}

                    <div className="pt-6 flex flex-col gap-3">
                        <button type="submit" className="w-full bg-primary text-white font-black py-4 rounded-xl hover:bg-amber-600 transition shadow-lg shadow-primary/20 active:scale-95 uppercase tracking-widest text-sm">Criar Minha Conta</button>
                        <button type="button" onClick={() => { setIsRegisterMode(false); setError(''); }} className="w-full py-3 text-zinc-500 hover:text-white transition font-bold text-xs uppercase tracking-widest">Já tenho conta. Voltar ao Login</button>
                    </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
