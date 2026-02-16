
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Package, FileText, Menu, X, LogOut, ArrowLeft, Home, Instagram, Facebook, Mail, MessageCircle, Image as ImageIcon, Sparkles, ClipboardList, Building, Clock, Ticket, Fingerprint, User, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SeasonalEffects } from './SeasonalEffects';
import { StickManCleaner } from './StickManCleaner';
import { CosmicPulseSystem } from './CosmicPulseSystem';
import { FluidTrail } from './FluidTrail';
import { NotificationCenter } from './NotificationCenter';
import { VirtualAssistant } from './VirtualAssistant'; // Importando Assistente

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isClientMenuOpen, setIsClientMenuOpen] = React.useState(false); 
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, currentCustomer } = useAuth();
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
    { name: 'Feedbacks', path: '/feedbacks', icon: MessageSquare }, // Nova Aba
  ];

  const isActive = (path: string) => {
      if (path === '/' && location.pathname !== '/') return false;
      return location.pathname.startsWith(path);
  };

  if (role === 'client') {
    return (
        <div className="min-h-screen flex flex-col relative selection:bg-primary/30 selection:text-white overflow-x-hidden">
            <BackgroundEffects />
            <FluidTrail />
            <SeasonalEffects />
            <StickManCleaner />
            <CosmicPulseSystem />
            
            <header className="glass-panel h-16 flex items-center justify-between px-6 sticky top-4 mx-4 rounded-2xl z-30 transition-all duration-300 border border-white/10 shadow-2xl mt-4 backdrop-blur-2xl">
                <div className="flex items-center space-x-4">
                     <Link to="/" className="text-zinc-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full hover:scale-110">
                        <ArrowLeft size={20} />
                     </Link>
                     <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Crazy Art" className="h-8 w-auto object-contain" />
                        <span className="text-lg font-bold font-heading tracking-wider hidden sm:block text-transparent bg-clip-text bg-crazy-gradient">CRAZY ART</span>
                     </div>
                </div>
                
                <div className="hidden md:flex items-center space-x-6">
                    <NotificationCenter />
                    <Link to="/my-area" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
                       <User size={16} />
                       <span className="font-semibold">{currentCustomer?.name.split(' ')[0]}</span>
                    </Link>
                    <button onClick={handleLogout} className="text-zinc-400 hover:text-red-400 flex items-center space-x-2 transition-colors hover:scale-105">
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Sair</span>
                    </button>
                </div>

                <div className="flex items-center gap-4 md:hidden">
                    <NotificationCenter />
                    <button onClick={() => setIsClientMenuOpen(true)} className="text-zinc-300">
                        <Menu size={24} />
                    </button>
                </div>
            </header>

            {isClientMenuOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-center items-center gap-8 animate-fade-in md:hidden">
                    <button onClick={() => setIsClientMenuOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white p-2">
                        <X size={32} />
                    </button>
                    
                    <div className="flex flex-col items-center gap-2 mb-4">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                            <User size={40} className="text-primary" />
                        </div>
                        <span className="text-xl font-bold text-white">{currentCustomer?.name}</span>
                    </div>

                    <Link to="/my-area" onClick={() => setIsClientMenuOpen(false)} className="text-2xl font-bold text-primary uppercase tracking-widest">Minha Área</Link>
                    <Link to="/shop" onClick={() => setIsClientMenuOpen(false)} className="text-2xl font-bold text-white uppercase tracking-widest">Loja</Link>
                    
                    <button onClick={handleLogout} className="text-xl font-bold text-red-500 uppercase tracking-widest flex items-center gap-2 mt-8">
                        <LogOut size={20} /> Sair
                    </button>
                </div>
            )}

            <main key={location.pathname} className="flex-1 p-6 max-w-7xl mx-auto w-full animate-page-enter">
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
      <VirtualAssistant /> {/* ADICIONADO AQUI NO LAYOUT ADMIN */}
      
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
