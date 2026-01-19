
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Package, FileText, Menu, X, LogOut, ArrowLeft, Home, Instagram, Facebook, Mail, MessageCircle, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, currentCustomer } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const headerStyle = { letterSpacing: '0.05em' };

  // Fundo Animado Global
  const BackgroundEffects = () => (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60"></div>
      
      {/* Animated Blobs */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[40%] left-[-10%] w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] animate-float" style={{ animationDelay: '4s' }}></div>
    </div>
  );

  const Footer = () => (
    <footer className="glass-panel border-t-0 border-t-zinc-800/30 py-8 px-6 mt-auto w-full z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Esquerda */}
        <div className="flex flex-col text-center md:text-left">
          <h2 className="text-xl font-bold text-white mb-1 uppercase bg-clip-text text-transparent bg-crazy-gradient tracking-widest font-heading">CRAZY ART</h2>
          <p className="text-zinc-500 text-xs tracking-wide">transformando ideias em realidade</p>
        </div>
        
        {/* Meio */}
        <div className="flex flex-col items-center">
          <div className="flex space-x-6">
            {[
              { icon: MessageCircle, href: "https://wa.me/5516994142665" },
              { icon: Instagram, href: "https://instagram.com" },
              { icon: Facebook, href: "https://facebook.com" },
              { icon: Mail, href: "mailto:contato@crazyart.com" }
            ].map((item, idx) => (
              <a 
                key={idx}
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-zinc-500 hover:text-white transition-all hover:scale-110 hover:shadow-glow p-2 rounded-full hover:bg-white/5"
              >
                <item.icon size={22} />
              </a>
            ))}
          </div>
        </div>

        {/* Direita */}
        <div className="flex flex-col items-center md:items-end opacity-60">
          <p className="text-zinc-500 text-[10px] font-bold tracking-[0.2em] uppercase">CRAZY ART ® 2024</p>
        </div>
      </div>
    </footer>
  );

  if (role === 'guest') {
    return (
      <div className="flex flex-col min-h-screen relative selection:bg-primary/30 selection:text-white">
        <BackgroundEffects />
        <main className="flex-1 animate-fade-in">{children}</main>
        <Footer />
      </div>
    );
  }

  const adminNavItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Clientes', path: '/customers', icon: Users },
    { name: 'Produtos', path: '/products', icon: Package },
    { name: 'Carrossel', path: '/carousel-manager', icon: ImageIcon },
    { name: 'Financeiro', path: '/dre', icon: FileText },
  ];

  const isActive = (path: string) => {
      if (path === '/' && location.pathname !== '/') return false;
      return location.pathname.startsWith(path);
  };

  if (role === 'client') {
    return (
        <div className="min-h-screen flex flex-col relative selection:bg-primary/30 selection:text-white">
            <BackgroundEffects />
            <header className="glass-panel h-16 flex items-center justify-between px-6 sticky top-4 mx-4 rounded-2xl z-30 transition-all duration-300 border border-white/5 shadow-lg mt-4">
                <div className="flex items-center space-x-4">
                     <Link to="/" className="text-zinc-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full">
                        <ArrowLeft size={20} />
                     </Link>
                     <div className="flex items-center">
                        <span className="font-bold text-lg bg-clip-text text-transparent bg-crazy-gradient hidden sm:block uppercase tracking-wider font-heading">CRAZY ART</span>
                     </div>
                </div>
                <div className="flex items-center space-x-6">
                    <span className="text-zinc-400 text-sm hidden sm:block">Olá, <span className="text-white font-semibold">{currentCustomer?.name.split(' ')[0]}</span></span>
                    <button onClick={handleLogout} className="text-zinc-400 hover:text-red-400 flex items-center space-x-2 transition-colors">
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Sair</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 p-6 max-w-7xl mx-auto w-full animate-fade-in-up">
                {children}
            </main>
            <Footer />
        </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-text relative selection:bg-primary/30 selection:text-white">
      <BackgroundEffects />
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 glass-panel border-r border-white/5 transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-20 px-8 border-b border-white/5">
          <div className="flex items-center group cursor-default">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow mr-3">
                <Sparkles size={16} className="text-white" />
             </div>
             <div>
                <span className="text-lg font-bold text-white uppercase tracking-wider font-heading block leading-none">CRAZY ART</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Studio</span>
             </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-zinc-400 hover:text-white transition-transform hover:rotate-90">
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 mt-4">
          <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Menu Principal</p>
          {adminNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  active
                    ? 'text-white shadow-lg shadow-primary/5 bg-white/5 border border-white/5'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary rounded-r-full"></div>
                )}
                <item.icon size={20} className={`relative z-10 transition-transform duration-300 ${active ? 'text-primary scale-110' : 'group-hover:text-zinc-300'}`} />
                <span className={`relative z-10 font-medium tracking-wide ${active ? 'font-semibold' : ''}`}>{item.name}</span>
                
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
            <button 
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3.5 w-full text-zinc-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-300 group border border-transparent hover:border-red-500/10"
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
                <div className="hidden sm:block animate-fade-in-up">
                    <h2 className="text-lg font-bold text-white font-heading">Visão Geral</h2>
                    <p className="text-xs text-zinc-500">Bem-vindo de volta, Administrador.</p>
                </div>
            </div>
            
            <div className="flex items-center lg:hidden">
              <span className="font-bold text-sm bg-clip-text text-transparent bg-crazy-gradient uppercase tracking-widest font-heading">CRAZY ART</span>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center shadow-lg">
                    <span className="font-bold text-primary">AD</span>
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 scroll-smooth">
          <div className="animate-fade-in-up max-w-7xl mx-auto">
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
