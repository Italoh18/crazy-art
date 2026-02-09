
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, User, Lock, ShoppingBag, BookOpen, Tv, ChevronLeft, ChevronRight, Sparkles, LayoutGrid, Layers, MapPin, UserPlus } from 'lucide-react';
import { GalaxyGame } from '../components/GalaxyGame';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'client' | 'admin'>('client');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [gameMode, setGameMode] = useState(false);
  
  // Registration Form State
  const [regData, setRegData] = useState({
    name: '', phone: '', email: '', cpf: '',
    street: '', number: '', zipCode: ''
  });
  
  const { loginAdmin, loginClient, role, logout } = useAuth();
  const { carouselImages, addCustomer, trustedCompanies } = useData();
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

  // Verificar se há solicitação de login via URL (vindo da loja por exemplo)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'login' && role === 'guest') {
        setIsModalOpen(true);
        // Limpar URL para não reabrir se der refresh
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
            creditLimit: 50.00 // Limite padrão para novos cadastros
        });
        
        // Após cadastrar, tenta logar automaticamente com o CPF
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

  // Máscaras de Input
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

  const handleHeaderButtonClick = () => {
      if (role !== 'guest') {
          logout();
          navigate('/');
      } else {
          setIsModalOpen(true);
          setIsRegisterMode(false);
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
          setIsRegisterMode(false);
          return;
      }
      navigate(section.path);
  };

  const headerFont = { fontFamily: '"Times New Roman", Times, serif' };

  return (
    <div className="min-h-screen bg-zinc-950 text-text flex flex-col relative overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none transform-gpu">
        <div className="absolute top-[-10%] left-[10%] w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-[60px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[80px]"></div>
      </div>

      {role === 'guest' && (
        <header className="fixed top-0 left-0 w-full z-40 h-20 px-6 flex items-center justify-between bg-black/80 backdrop-blur-sm border-b border-white/5 transition-all duration-300">
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] bg-clip-text text-transparent bg-crazy-gradient text-center whitespace-nowrap uppercase drop-shadow-sm" style={headerFont}>
              CRAZY ART
            </h1>
          </div>
          <div className="ml-auto relative group z-10">
              <button 
                onClick={handleHeaderButtonClick} 
                className="relative bg-zinc-900 text-white px-6 py-2 rounded-full border border-primary/50 shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:shadow-[0_0_25px_rgba(245,158,11,0.7)] hover:text-white transition duration-300 text-[11px] font-bold tracking-widest flex items-center justify-center min-w-[80px] uppercase hover:bg-black hover:border-primary"
              >
                  Login
              </button>
          </div>
        </header>
      )}

      <main className={`relative z-10 flex-1 flex flex-col items-center w-full ${role === 'guest' ? 'pt-20' : 'pt-0'}`}>
        
        <div 
            onClick={handleGalaxyTap}
            className="w-full h-[60vh] md:h-[70vh] relative overflow-hidden bg-black group shadow-2xl cursor-pointer select-none"
        >
          <div className="absolute inset-0 z-0 overflow-hidden bg-black">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#000000_100%)] opacity-80"></div>
             <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] bg-gradient-to-tr from-purple-900/20 to-transparent blur-[60px] animate-spin-slow"></div>
             </div>
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

        <div className="w-full max-w-4xl px-6 mb-24 mt-8 relative z-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section, idx) => (
              <div key={section.name} onClick={() => handleSectionClick(section)} className="h-full">
                <div className={`h-64 rounded-2xl seasonal-target transition-all duration-200 group relative bg-zinc-900 border border-zinc-800 ${section.status === 'active' ? 'cursor-pointer active:scale-95' : 'opacity-60 cursor-not-allowed grayscale'}`}>
                    <div className="relative h-full flex flex-col items-center justify-center gap-6 p-8">
                        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-400 group-hover:text-primary group-hover:border-primary/50 transition duration-300 shadow-lg">
                            <section.icon size={36} strokeWidth={1.5} />
                        </div>
                        <span className="text-lg font-bold text-zinc-300 group-hover:text-white uppercase tracking-wider transition-colors" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                            {section.name}
                        </span>
                        {section.status === 'soon' && (
                            <div className="absolute top-4 right-4"><span className="text-[10px] bg-black border border-zinc-800 text-zinc-500 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Em Breve</span></div>
                        )}
                    </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Card Programas & Ferramentas movido para destaque principal */}
          <div className="mt-6 max-w-2xl mx-auto">
              <div 
                onClick={() => navigate('/programs')}
                className="w-full h-28 rounded-2xl bg-zinc-900 seasonal-target border border-zinc-800 flex items-center justify-between px-8 group cursor-pointer active:scale-95 transition-all duration-300 hover:border-zinc-600 overflow-hidden relative"
              >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-6 relative z-10">
                      <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-400 group-hover:text-primary transition-all duration-300 group-hover:rotate-12">
                          <Tv size={32} strokeWidth={1.5} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-white tracking-[0.1em] uppercase group-hover:text-primary transition-colors" style={headerFont}>Programas & Ferramentas</h3>
                          <p className="text-zinc-500 text-xs tracking-wider uppercase mt-1">Layout 3D • Fontes • IA</p>
                      </div>
                  </div>
                  <div className="relative z-10 opacity-40 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-2">
                      <LayoutGrid size={24} className="text-zinc-400 group-hover:text-white transition-colors" />
                  </div>
              </div>
          </div>
        </div>

        {/* Empresas que Confiam - Seção Pública */}
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

      {/* MODAL REPOSICIONADO PARA CIMA (pt-12 md:pt-24) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/80 backdrop-blur-md p-4 animate-fade-in-up overflow-y-auto">
          <div className={`bg-zinc-900 border border-zinc-800 rounded-3xl w-full p-8 shadow-2xl relative overflow-hidden transition-all duration-500 ${isRegisterMode ? 'max-w-2xl max-h-[90vh] overflow-y-auto' : 'max-w-md'}`}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-transform hover:rotate-90 z-20"><X size={24} /></button>
            
            {!isRegisterMode ? (
              // MODO LOGIN
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
              // MODO CADASTRO (AUTO-REGISTRO CLIENTE)
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
