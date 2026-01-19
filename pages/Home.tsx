
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { X, User, Lock, ShoppingBag, BookOpen, Tv, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'client' | 'admin'>('client');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const { loginAdmin, loginClient, role, logout } = useAuth();
  const { carouselImages } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (carouselImages.length > 0) {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }
  }, [carouselImages]);

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
        setError('CPF não encontrado.');
      }
    }
  };

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (loginMode === 'client') {
          setInputValue(maskCPF(e.target.value));
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
    { name: 'Blog', icon: BookOpen, status: 'soon', path: '' },
    { name: 'Programas', icon: Tv, status: 'active', path: '/programs' },
    { name: 'Loja', icon: ShoppingBag, status: 'active', path: '/shop' },
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
      {/* Background Animated Blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[150px] animate-float"></div>
      </div>

      {role === 'guest' && (
        <header className="fixed top-0 left-0 w-full z-40 h-20 px-6 flex items-center justify-between bg-black/60 backdrop-blur-lg border-b border-white/5 transition-all duration-300">
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
        {/* Carousel */}
        <div className="w-full h-[60vh] md:h-[75vh] relative overflow-hidden bg-zinc-900 group shadow-2xl">
          <div className="w-full h-full flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
             {carouselImages.length > 0 ? (
                carouselImages.map((img) => (
                    <div key={img.id} className="w-full h-full flex-shrink-0 relative">
                        <img 
                            src={img.url} 
                            alt="Carousel Banner" 
                            className="w-full h-full object-cover brightness-75 hover:brightness-90 transition duration-1000 transform hover:scale-105"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=1920';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                    </div>
                ))
             ) : (
                [0, 1].map((index) => (
                    <div key={index} className="w-full h-full flex-shrink-0 relative flex items-center justify-center bg-zinc-900">
                        <div className="text-center p-12 border border-white/10 rounded-3xl bg-black/40 backdrop-blur-md z-10 animate-fade-in-up">
                            <span className="text-zinc-400 text-lg md:text-2xl font-light tracking-[0.3em] uppercase block mb-4">Em Construção</span>
                            <h3 className="text-4xl md:text-6xl font-bold text-white uppercase drop-shadow-xl" style={headerFont}>CRAZY ART STUDIO</h3>
                        </div>
                    </div>
                 ))
             )}
          </div>

          {carouselImages.length > 1 && (
            <>
                <button 
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/30 backdrop-blur-md text-white rounded-full hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 border border-white/10 hover:scale-110"
                >
                    <ChevronLeft size={24} />
                </button>
                <button 
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselImages.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/30 backdrop-blur-md text-white rounded-full hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 border border-white/10 hover:scale-110"
                >
                    <ChevronRight size={24} />
                </button>
            </>
          )}
        </div>

        {/* Carousel Indicators */}
        {carouselImages.length > 0 && (
            <div className="flex justify-center gap-3 mt-8 mb-12">
                {carouselImages.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                            currentSlide === i ? 'w-10 bg-gradient-to-r from-yellow-500 to-red-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'w-2 bg-zinc-800 hover:bg-zinc-600'
                        }`}
                        aria-label={`Ir para imagem ${i + 1}`}
                    />
                ))}
            </div>
        )}

        {/* Navigation Cards */}
        <div className="w-full max-w-7xl px-6 mb-24 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {sections.map((section, idx) => (
              <div 
                key={section.name} 
                onClick={() => handleSectionClick(section)} 
                className={`relative bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-2xl flex flex-col items-center justify-center gap-6 group transition-all duration-500 backdrop-blur-sm overflow-hidden 
                ${section.status === 'active' ? 'cursor-pointer hover:border-primary/50 hover:-translate-y-2 hover:shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)]' : 'opacity-60 cursor-not-allowed grayscale'}`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-400 group-hover:text-primary group-hover:border-primary/30 group-hover:scale-110 transition duration-500 shadow-lg relative z-10">
                    <section.icon size={36} strokeWidth={1.5} />
                </div>
                <span className="text-lg font-bold text-zinc-300 group-hover:text-white uppercase tracking-wider transition-colors relative z-10" style={headerFont}>{section.name}</span>
                
                {section.status === 'soon' && (
                    <span className="absolute top-4 right-4 text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-500 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Em Breve</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Login Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in-up">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
            {/* Modal Glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>

            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-transform hover:rotate-90"><X size={24} /></button>
            
            <div className="flex flex-col items-center mb-8 relative z-10">
                 <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-4 ring-1 ring-zinc-800 shadow-xl">
                    {loginMode === 'client' ? <User className="text-primary" size={40} strokeWidth={1.5} /> : <Lock className="text-secondary" size={40} strokeWidth={1.5} />}
                 </div>
                 <h2 className="text-2xl font-bold text-white uppercase tracking-wide" style={headerFont}>{loginMode === 'client' ? 'Área do Cliente' : 'Acesso Adm'}</h2>
                 <p className="text-zinc-500 text-sm mt-2">Entre para gerenciar seus pedidos</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                <input 
                    type={loginMode === 'client' ? "text" : "password"} 
                    placeholder={loginMode === 'client' ? "CPF (apenas números)" : "Código de Acesso"} 
                    className="w-full bg-black/50 border border-zinc-700 rounded-xl px-5 py-4 text-white focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-600 text-center tracking-widest" 
                    value={inputValue} 
                    onChange={handleInputChange} 
                    autoFocus 
                />
                {error && <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20 animate-pulse">{error}</div>}
                <button type="submit" className="w-full bg-gradient-to-r from-white to-zinc-300 text-black font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-all transform active:scale-95 uppercase tracking-wider text-sm">Entrar</button>
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
