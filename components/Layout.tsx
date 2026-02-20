
import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Package, FileText, Menu, X, LogOut, ArrowLeft, Home, Instagram, Facebook, Mail, MessageCircle, Image as ImageIcon, Sparkles, ClipboardList, Building, Clock, Ticket, Fingerprint, User, MessageSquare, ChevronDown, LayoutGrid, ShoppingBag, Palette, Wrench, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SeasonalEffects } from './SeasonalEffects';
import { StickManCleaner } from './StickManCleaner';
import { CosmicPulseSystem } from './CosmicPulseSystem';
import { FluidTrail } from './FluidTrail';
import { NotificationCenter } from './NotificationCenter';
import { VirtualAssistant } from './VirtualAssistant'; 
import { CookieConsent } from './CookieConsent'; // Importado

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isClientMenuOpen, setIsClientMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false); // Novo state para dropdown
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, currentCustomer } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Fechar menu de usuário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timesFont = { fontFamily: '"Times New Roman", Times, serif' };

  // Fundo Impactante "Flare" SEM PARALLAX
  const BackgroundEffects = () => (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-background">
      <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-spin-slow opacity-20">
        <div className="w-full h-full bg-flare-gradient blur-[100px] mix-blend-screen"></div>
      </div>
      <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[140px] mix-blend-screen animate-float"></div>
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-background/60 to-background opacity-90"></div>
    </div>
  );

  const Footer = () => (
    <footer className="glass-panel border-t-0 border-t-zinc-800/30 py-8 px-6 mt-auto w-full z-10 relative z-20 seasonal-target backdrop-blur-xl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        <div className="flex flex-col text-center md:text-left">
          <h2 className="text-xl font-bold text-white mb-1 uppercase bg-clip-text text-transparent bg-crazy-gradient tracking-widest drop-shadow-sm" style={timesFont}>CRAZY ART</h2>
          <p className="text-zinc-500 text-xs tracking-wide">transformando ideias em realidade</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex space-x-6">
            {[
              { icon: MessageCircle, href: "https://wa.me/5516994142665" },
              { icon: Instagram, href: "https://instagram.com" },
              { icon: Facebook, href: "https://facebook.com" },
              { icon: Mail, href: "mailto:crazyartoficial@outlook.com" } 
            ].map((item, idx) => (
              <a 
                key={idx}
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-zinc-400 hover:text-white transition-all hover:scale-125 hover:shadow-glow p-2.5 rounded-full hover:bg-white/10"
              >
                <item.icon size={20} />
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center md:items-end opacity-60">
          <p className="text-zinc-500 text-[10px] font-bold tracking-[0.2em] uppercase" style={timesFont}>CRAZY ART ® 2026</p>
        </div>
      </div>
    </footer>
  );

  if (role === 'guest') {
    return (
      <div className="flex flex-col min-h-screen relative selection:bg-primary/30 selection:text-white overflow-x-hidden">
        <BackgroundEffects />
        <FluidTrail />
        <SeasonalEffects />
        <StickManCleaner />
        <CosmicPulseSystem />
        <CookieConsent /> {/* Aviso LGPD */}
        <main key={location.pathname} className="flex-1 animate-page-enter">
            {children}
        </main>
        <VirtualAssistant />
        <Footer />
      </div>
    );
  }

  const adminNavItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Fila de Produção', path: '/pending-confirmations', icon: Clock },
    { name: 'Pedidos', path: '/orders', icon: ClipboardList }, 
    { name: 'Clientes', path: '/customers', icon: Users },
    { name: 'Produtos', path: '/products', icon: Package },
    { name: 'Cupons', path: '/coupons', icon: Ticket }, 
    { name: 'Carrossel', path: '/carousel-manager', icon: ImageIcon },
    { name: 'Financeiro', path: '/dre', icon: FileText },
    { name: 'Empresas que Confiam', path: '/trusted-companies', icon: Building },
    { name: 'Templates E-mail', path: '/email-templates', icon: Mail }, 
    { name: 'Identidade', path: '/identity', icon: Fingerprint },
    { name: 'Feedbacks', path: '/feedbacks', icon: MessageSquare },
  ];

  const isActive = (path: string) => {
      if (path === '/' && location.pathname !== '/') return false;
      return location.pathname.startsWith(path);
  };

  if (role === 'client') {
    const isHomePage = location.pathname === '/';

    return (
        <div className="min-h-screen flex flex-col relative selection:bg-primary/30 selection:text-white overflow-x-hidden">
            <BackgroundEffects />
            <FluidTrail />
            <SeasonalEffects />
            <StickManCleaner />
            <CosmicPulseSystem />
            <CookieConsent /> {/* Aviso LGPD */}
            
            {/* Oculta o cabeçalho do layout se estiver na home, pois a home tem o próprio cabeçalho */}
            {!isHomePage && (
                <header className="fixed top-0 left-0 w-full z-50 h-20 px-6 grid grid-cols-3 items-center bg-black/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
                    <div className="flex justify-start items-center gap-2">
                        <Link to="/" className="text-zinc-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full">
                            <ArrowLeft size={20} />
                        </Link>
                        <button onClick={() => setIsClientMenuOpen(true)} className="text-zinc-300 md:hidden p-2 hover:bg-white/10 rounded-full transition">
                            <Menu size={24} />
                        </button>
                    </div>
                    
                    <div className="flex justify-center items-center">
                        <Link to="/">
                             <h1 className="text-2xl font-bold tracking-[0.15em] bg-clip-text text-transparent bg-crazy-gradient text-center whitespace-nowrap uppercase drop-shadow-sm" style={timesFont}>CRAZY ART</h1>
                        </Link>
                    </div>
                    
                    <div className="flex justify-end items-center gap-4">
                        <div className="hidden md:flex items-center space-x-6" ref={userMenuRef}>
                            <NotificationCenter />
                            
                            <div className="relative">
                                <button 
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-crazy-gradient flex items-center justify-center border border-white/20">
                                        <User size={16} className="text-white" />
                                    </div>
                                    <span className="text-xs font-bold text-white uppercase tracking-wider hidden sm:inline">
                                        Olá, {currentCustomer?.name.split(' ')[0]}
                                    </span>
                                    <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isUserMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-[#18181b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60] animate-scale-in origin-top-right">
                                        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sua Conta</p>
                                            <p className="text-xs font-bold text-white truncate mt-1">{currentCustomer?.name}</p>
                                        </div>
                                        <div className="p-2">
                                            <Link 
                                                to="/my-area"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                                            >
                                                <User size={18} className="text-primary" />
                                                Minha Área
                                            </Link>
                                            <Link 
                                                to="/my-orders"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                                            >
                                                <ClipboardList size={18} className="text-emerald-500" />
                                                Meus Pedidos
                                            </Link>
                                            <button 
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    handleLogout();
                                                }}
                                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm font-medium"
                                            >
                                                <LogOut size={18} />
                                                Sair
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 md:hidden">
                            <NotificationCenter />
                        </div>
                    </div>
                </header>
            )}

            {isClientMenuOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden transition-opacity" onClick={() => setIsClientMenuOpen(false)} />
                    <div className="fixed top-24 left-4 right-4 z-50 md:hidden animate-scale-in origin-top">
                        <div className="bg-[#121215]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-2 relative overflow-hidden ring-1 ring-white/5 seasonal-border">
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/20 rounded-b-full shadow-[0_0_15px_rgba(255,255,255,0.2)]"></div>
                             
                             <div className="flex justify-between items-center mb-1 border-b border-white/5 pb-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Menu size={14} /> Menu
                                </span>
                                <button onClick={() => setIsClientMenuOpen(false)} className="text-zinc-400 hover:text-white bg-white/5 p-1.5 rounded-full transition active:scale-90"><X size={16} /></button>
                             </div>

                             <div className="px-4 py-2 border-b border-white/5 mb-2">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Olá, {currentCustomer?.name.split(' ')[0]}</p>
                             </div>
                             
                             <Link to="/my-area" onClick={() => setIsClientMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group">
                                <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition"><User size={20} /></div>
                                <span className="text-white font-bold text-sm uppercase tracking-wide">Minha Área</span>
                             </Link>
                             <Link to="/my-orders" onClick={() => setIsClientMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group">
                                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition"><ClipboardList size={20} /></div>
                                <span className="text-white font-bold text-sm uppercase tracking-wide">Meus Pedidos</span>
                             </Link>
                             
                             <button 
                                onClick={() => {
                                    setIsClientMenuOpen(false);
                                    handleLogout();
                                }}
                                className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-500/10 transition flex items-center gap-4 group mt-1"
                             >
                                <div className="bg-zinc-800 p-2 rounded-lg text-zinc-400 group-hover:text-red-500 transition"><LogOut size={20} /></div>
                                <span className="text-zinc-400 group-hover:text-red-500 font-bold text-sm uppercase tracking-wide transition">Sair</span>
                             </button>

                             <div className="h-px bg-white/5 my-1"></div>

                             <Link to="/shop" onClick={() => setIsClientMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group">
                                <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition"><ShoppingBag size={20} /></div>
                                <span className="text-white font-bold text-sm uppercase tracking-wide">Loja</span>
                             </Link>

                             <Link to="/shop?tab=art" onClick={() => setIsClientMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group">
                                <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition"><Palette size={20} /></div>
                                <div>
                                    <span className="block text-white font-bold text-sm uppercase tracking-wide">Quitanda</span>
                                    <span className="text-[10px] text-purple-400 font-bold">de Artes</span>
                                </div>
                             </Link>
                             
                             <Link to="/programs" onClick={() => setIsClientMenuOpen(false)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition flex items-center gap-4 group">
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

            <main key={location.pathname} className={`flex-1 ${!isHomePage ? 'pt-24 p-6 max-w-7xl mx-auto w-full' : ''} animate-page-enter`}>
                {children}
            </main>
            <VirtualAssistant />
            <Footer />
        </div>
    );
  }

  // Layout ADMIN
  return (
    <div className="flex h-screen overflow-hidden text-text relative selection:bg-primary/30 selection:text-white">
      <BackgroundEffects />
      <FluidTrail />
      <SeasonalEffects />
      <StickManCleaner />
      <CosmicPulseSystem />
      <VirtualAssistant />
      <CookieConsent /> {/* Aviso LGPD */}
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 glass-panel border-r border-white/5 transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-center h-24 px-6 border-b border-white/5 bg-white/[0.02] gap-3">
          <img src="/logo.png" alt="Crazy Art" className="h-10 w-auto object-contain" />
          <span className="text-xl font-bold font-heading tracking-wider text-transparent bg-clip-text bg-crazy-gradient" style={timesFont}>CRAZY ART</span>
          
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden absolute top-6 right-4 text-zinc-400 hover:text-white transition-transform hover:rotate-90">
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 mt-4 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1 opacity-70">Menu Principal</p>
          {adminNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  active
                    ? 'text-white bg-white/10 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.3)]'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white hover:pl-5'
                }`}
              >
                {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-crazy-gradient rounded-r-full shadow-[0_0_10px_#f59e0b]"></div>
                )}
                <item.icon size={20} className={`relative z-10 transition-transform duration-300 ${active ? 'text-primary scale-110 drop-shadow-md' : 'group-hover:text-zinc-200'}`} />
                <span className={`relative z-10 font-medium tracking-wide ${active ? 'font-semibold' : ''}`}>{item.name}</span>
                
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 bg-white/[0.02]">
            <button 
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3.5 w-full text-zinc-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-300 group border border-transparent hover:border-red-500/20"
            >
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Sair do Sistema</span>
            </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="flex items-center justify-between h-20 px-8 glass-panel border-b border-white/5 z-20 sticky top-0 backdrop-blur-xl">
            <div className="flex items-center">
                <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-400 hover:text-white lg:hidden hover:scale-110 transition mr-4">
                <Menu size={24} />
                </button>
                <div className="hidden sm:block animate-page-enter">
                    <h2 className="text-lg font-bold text-white font-heading tracking-wide">Visão Geral</h2>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <p className="text-xs text-zinc-500">Sistema Online</p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3 lg:hidden">
              <img src="/logo.png" alt="Crazy Art" className="h-8 w-auto object-contain" />
              <span className="text-lg font-bold font-heading tracking-wider text-transparent bg-clip-text bg-crazy-gradient">CRAZY ART</span>
            </div>
            
            <div className="flex items-center gap-4">
                <NotificationCenter />
                <div className="flex flex-col items-end mr-2 hidden sm:block">
                  <span className="text-xs font-bold text-white">Administrador</span>
                  <span className="text-[10px] text-zinc-500">Acesso Total</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer hover:scale-105 group">
                    <span className="font-bold text-primary group-hover:text-white transition-colors">AD</span>
                </div>
            </div>
        </header>

        <main key={location.pathname} className="flex-1 overflow-x-hidden overflow-y-auto p-6 scroll-smooth animate-page-enter">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
          <div className="max-w-7xl mx-auto mt-10">
              <Footer />
          </div>
        </main>
      </div>
    </div>
  );
};
