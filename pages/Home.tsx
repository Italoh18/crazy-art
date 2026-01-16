import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X, User, Lock, ShoppingBag, BookOpen, Wrench, Tv, Instagram, Facebook, Twitter, Mail } from 'lucide-react';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'client' | 'admin'>('client');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const { loginAdmin, loginClient } = useAuth();
  const navigate = useNavigate();

  // Carousel Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (loginMode === 'admin') {
      if (loginAdmin(inputValue)) {
        navigate('/customers');
      } else {
        setError('Código de acesso inválido.');
      }
    } else {
      if (loginClient(inputValue)) {
        navigate('/my-area');
      } else {
        setError('CPF não encontrado.');
      }
    }
  };

  const toggleMode = () => {
    setLoginMode(loginMode === 'client' ? 'admin' : 'client');
    setInputValue('');
    setError('');
  };

  const sections = [
    { name: 'Loja', icon: ShoppingBag },
    { name: 'Blog', icon: BookOpen },
    { name: 'Serviços', icon: Wrench },
    { name: 'Programas', icon: Tv },
  ];

  return (
    <div className="min-h-screen bg-background text-text flex flex-col relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-yellow-500/5 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/5 rounded-full blur-[150px]"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-40 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        {/* Centered Title */}
        <h1 
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-crazy-gradient text-center whitespace-nowrap"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          CRAZY ART
        </h1>

        {/* Right Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="ml-auto bg-surface border border-zinc-700 hover:border-primary text-white px-6 py-2 rounded-full transition duration-300 shadow-lg shadow-black/50 hover:shadow-primary/20 text-sm font-medium tracking-wide z-10"
        >
          Área do Cliente
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center w-full">
        
        {/* Full Width Carousel */}
        <div className="w-full h-[60vh] md:h-[80vh] relative overflow-hidden bg-zinc-900 group mb-12">
          {/* Slides Container */}
          <div 
             className="w-full h-full flex transition-transform duration-1000 ease-in-out"
             style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
             {[0, 1, 2].map((index) => (
                <div key={index} className="w-full h-full flex-shrink-0 relative flex items-center justify-center bg-zinc-950">
                    <div className="text-center p-12 border-4 border-dashed border-zinc-800 rounded-3xl bg-black/40 backdrop-blur-sm z-10">
                        <span className="text-zinc-500 text-xl md:text-3xl font-light tracking-[0.2em] uppercase block mb-4">
                        Imagem {index + 1}
                        </span>
                        <h3 className="text-4xl md:text-6xl font-bold text-white">
                        Em Construção
                        </h3>
                    </div>
                    {/* Placeholder Background Pattern */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-700 via-zinc-900 to-black"></div>
                </div>
             ))}
          </div>
          
          {/* Carousel Indicators */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-3 z-10">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'bg-primary w-12' : 'bg-zinc-600 w-4 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>

          {/* Gradient Overlay at Bottom of Carousel to blend with content */}
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
        </div>

        {/* Sections Grid */}
        <div className="w-full max-w-7xl px-6 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sections.map((section) => (
              <div 
                key={section.name} 
                className="relative bg-surface border border-zinc-800 p-8 rounded-xl flex flex-col items-center justify-center gap-4 group hover:border-zinc-700 hover:bg-zinc-900 transition duration-300 cursor-default"
              >
                <div className="absolute top-3 right-3 bg-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Em Breve
                </div>
                <div className="p-4 bg-black/50 rounded-full text-zinc-600 group-hover:text-zinc-400 transition transform group-hover:scale-110 duration-300">
                  <section.icon size={32} />
                </div>
                <span className="text-lg font-medium text-zinc-400 group-hover:text-white transition">
                  {section.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: '"Times New Roman", Times, serif' }}>CRAZY ART</h3>
            <p className="text-sm text-zinc-500">Transformando ideias em realidade.</p>
          </div>

          <div className="flex items-center space-x-6">
            <a href="#" className="text-zinc-500 hover:text-primary transition"><Instagram size={20} /></a>
            <a href="#" className="text-zinc-500 hover:text-primary transition"><Twitter size={20} /></a>
            <a href="#" className="text-zinc-500 hover:text-primary transition"><Facebook size={20} /></a>
            <a href="#" className="text-zinc-500 hover:text-primary transition"><Mail size={20} /></a>
          </div>

          <div className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Crazy Art Studio.
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition z-10"
            >
                <X size={24} />
            </button>
            
            <div className="h-1 w-full bg-crazy-gradient"></div>
            
            <div className="p-8">
              <div className="flex flex-col items-center mb-6">
                 {loginMode === 'client' ? (
                     <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 ring-1 ring-zinc-700">
                        <User className="text-primary" size={32} />
                     </div>
                 ) : (
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 ring-1 ring-zinc-700">
                        <Lock className="text-secondary" size={32} />
                     </div>
                 )}
                 <h2 className="text-2xl font-bold text-white">
                    {loginMode === 'client' ? 'Área do Cliente' : 'Acesso Adm'}
                 </h2>
                 <p className="text-zinc-400 text-sm mt-1">
                    {loginMode === 'client' ? 'Informe seu CPF' : 'Informe o código'}
                 </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <input 
                        type={loginMode === 'client' ? "text" : "password"}
                        placeholder={loginMode === 'client' ? "CPF (somente números)" : "Código de segurança"}
                        className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        autoFocus
                    />
                </div>
                
                {error && (
                    <div className="text-red-500 text-sm text-center font-medium bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition duration-200"
                >
                    {loginMode === 'client' ? 'Entrar' : 'Acessar Sistema'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                <button 
                    onClick={toggleMode}
                    className="text-xs text-zinc-500 hover:text-primary transition underline underline-offset-4"
                >
                    {loginMode === 'client' ? 'Acesso Administrativo' : 'Voltar para Cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}