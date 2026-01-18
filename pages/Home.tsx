
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
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-yellow-500/5 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/5 rounded-full blur-[150px]"></div>
      </div>

      {role === 'guest' && (
        <header className="fixed top-0 left-0 w-full z-40 h-20 px-6 flex items-center justify-between bg-black/80 backdrop-blur-md border-b border-zinc-900 shadow-md">
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <h1 className="text-lg md:text-2xl font-bold tracking-[0.1em] bg-clip-text text-transparent bg-crazy-gradient text-center whitespace-nowrap uppercase" style={headerFont}>
              CRAZY ART
            </h1>
          </div>
          <div className="ml-auto relative group z-10">
              <div className="absolute -inset-0.5 bg-crazy-gradient rounded-full blur opacity-75 group-hover:opacity-100 animate-pulse transition duration-200"></div>
              <button onClick={handleHeaderButtonClick} className="relative bg-black text-white px-4 py-1.5 rounded-full border border-zinc-800 hover:text-white transition duration-200 text-xs font-medium tracking-wide flex items-center justify-center min-w-[80px]">
                  Login
              </button>
          </div>
        </header>
      )}

      <main className={`relative z-10 flex-1 flex flex-col items-center w-full ${role === 'guest' ? 'pt-20' : 'pt-0'}`}>
        <div className="w-full h-[60vh] md:h-[80vh] relative overflow-hidden bg-zinc-900 group shadow-2xl">
          <div className="w-full h-full flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
             {carouselImages.length > 0 ? (
                carouselImages.map((img) => (
                    <div key={img.id} className="w-full h-full flex-shrink-0 relative">
                        <img 
                            src={img.url} 
                            alt="Carousel Banner" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=1920';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>
                ))
             ) : (
                [0, 1].map((index) => (
                    <div key={index} className="w-full h-full flex-shrink-0 relative flex items-center justify-center bg-zinc-900">
                        <div className="text-center p-12 border-4 border-dashed border-zinc-800 rounded-3xl bg-black/40 backdrop-blur-sm z-10">
                            <span className="text-zinc-500 text-xl md:text-3xl font-light tracking-[0.2em] uppercase block mb-4">Em Construção</span>
                            <h3 className="text-4xl md:text-6xl font-bold text-white uppercase" style={headerFont}>CRAZY ART STUDIO</h3>
                        </div>
                    </div>
                 ))
             )}
          </div>

          {carouselImages.length > 1 && (
            <>
                <button 
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black transition opacity-0 group-hover:opacity-100"
                >
                    <ChevronLeft size={24} />
                </button>
                <button 
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselImages.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black transition opacity-0 group-hover:opacity-100"
                >
                    <ChevronRight size={24} />
                </button>
            </>
          )}
        </div>

        {carouselImages.length > 0 && (
            <div className="flex justify-center gap-2 mt-6 mb-12">
                {carouselImages.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            currentSlide === i ? 'w-8 bg-primary' : 'w-2 bg-zinc-800 hover:bg-zinc-700'
                        }`}
                        aria-label={`Ir para imagem ${i + 1}`}
                    />
                ))}
            </div>
        )}

        <div className="w-full max-w-6xl px-6 mb-20 mt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sections.map((section) => (
              <div key={section.name} onClick={() => handleSectionClick(section)} className={`relative bg-zinc-900 border border-zinc-800 p-8 rounded-xl flex flex-col items-center justify-center gap-4 group transition duration-300 shadow-lg ${section.status === 'active' ? 'cursor-pointer hover:border-primary/50 hover:bg-zinc-800' : 'opacity-50'}`}>
                <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition duration-300"><section.icon size={32} /></div>
                <span className="text-lg font-medium text-white uppercase" style={headerFont}>{section.name}</span>
                {section.status === 'soon' && (
                    <span className="absolute top-2 right-2 text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Em Breve</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={24} /></button>
            <div className="flex flex-col items-center mb-6">
                 <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4 ring-1 ring-zinc-800">
                    {loginMode === 'client' ? <User className="text-primary" size={32} /> : <Lock className="text-secondary" size={32} />}
                 </div>
                 <h2 className="text-2xl font-bold text-white uppercase" style={headerFont}>{loginMode === 'client' ? 'Área do Cliente' : 'Acesso Adm'}</h2>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type={loginMode === 'client' ? "text" : "password"} placeholder={loginMode === 'client' ? "CPF" : "Código"} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none" value={inputValue} onChange={handleInputChange} autoFocus />
                {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition">Entrar</button>
              </form>
              <div className="mt-6 text-center">
                <button onClick={() => setLoginMode(loginMode === 'client' ? 'admin' : 'client')} className="text-xs text-zinc-500 hover:text-primary underline">{loginMode === 'client' ? 'Acesso ADM' : 'Voltar para Cliente'}</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
