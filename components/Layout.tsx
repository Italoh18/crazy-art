
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Package, FileText, Menu, X, LogOut, ArrowLeft, Home, Instagram, Facebook, Mail, MessageCircle, Image as ImageIcon } from 'lucide-react';
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

  const headerStyle = { fontFamily: '"Times New Roman", Times, serif', letterSpacing: '0.05em' };

  const Footer = () => (
    <footer className="bg-surface/50 border-t border-zinc-800/50 py-10 px-6 mt-auto w-full backdrop-blur-sm">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Esquerda */}
        <div className="flex flex-col text-center md:text-left">
          <h2 className="text-lg md:text-xl font-bold text-white mb-1 uppercase bg-clip-text text-transparent bg-crazy-gradient" style={headerStyle}>CRAZY ART</h2>
          <p className="text-muted text-sm italic">transformando ideias em realidade</p>
        </div>
        
        {/* Meio */}
        <div className="flex flex-col items-center">
          <span className="text-white font-medium mb-4 uppercase tracking-widest text-xs opacity-50">formas de contato</span>
          <div className="flex space-x-6">
            <a href="https://wa.me/5516994142665" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-all hover:scale-125 hover:-translate-y-1 duration-300" title="WhatsApp">
              <MessageCircle size={26} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-all hover:scale-125 hover:-translate-y-1 duration-300" title="Instagram">
              <Instagram size={26} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-primary transition-all hover:scale-125 hover:-translate-y-1 duration-300" title="Facebook">
              <Facebook size={26} />
            </a>
            <a href="mailto:contato@crazyart.com" className="text-muted hover:text-primary transition-all hover:scale-125 hover:-translate-y-1 duration-300" title="Email">
              <Mail size={26} />
            </a>
          </div>
        </div>

        {/* Direita */}
        <div className="flex flex-col items-center md:items-end">
          <p className="text-muted text-xs font-semibold tracking-widest uppercase">CRAZY ART ® 2024</p>
          <p className="text-[10px] text-zinc-600 mt-1 uppercase">todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  );

  if (role === 'guest') {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 animate-fade-in-up">{children}</main>
        <Footer />
      </div>
    );
  }

  const adminNavItems = [
    { name: 'Início', path: '/', icon: Home },
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
        <div className="min-h-screen bg-background flex flex-col">
            <header className="bg-surface/80 backdrop-blur-md border-b border-zinc-800 h-16 flex items-center justify-between px-6 sticky top-0 z-30 transition-all duration-300">
                <div className="flex items-center space-x-4">
                     <Link to="/" className="text-zinc-400 hover:text-white transition p-2 hover:bg-zinc-800 rounded-full hover:scale-110">
                        <ArrowLeft size={20} />
                     </Link>
                     <div className="flex items-center">
                        <span className="font-bold text-sm bg-clip-text text-transparent bg-crazy-gradient hidden sm:block uppercase tracking-wider" style={headerStyle}>CRAZY ART</span>
                     </div>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-zinc-400 text-sm hidden sm:block">Olá, <span className="text-white font-medium">{currentCustomer?.name}</span></span>
                    <button onClick={handleLogout} className="text-zinc-400 hover:text-secondary flex items-center space-x-1 pl-4 border-l border-zinc-700 hover:scale-105 transition">
                        <LogOut size={18} />
                        <span className="text-sm">Sair</span>
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
    <div className="flex h-screen bg-background overflow-hidden text-text">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-20 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-surface/95 backdrop-blur-xl border-r border-zinc-800 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0 shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-zinc-800/50">
          <div className="flex items-center group cursor-default">
             <span className="text-sm font-bold bg-clip-text text-transparent bg-crazy-gradient uppercase group-hover:opacity-80 transition" style={headerStyle}>CRAZY ART</span>
             <span className="ml-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700">ADM</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-zinc-400 hover:text-white transition-transform hover:rotate-90">
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {adminNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-yellow-500/10 to-red-600/10 text-primary border border-primary/20 shadow-lg shadow-primary/5'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white hover:translate-x-1'
              }`}
            >
              <item.icon size={20} className={`transition-transform duration-300 ${isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800/50">
            <button 
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3 w-full text-zinc-400 hover:text-secondary hover:bg-red-500/10 rounded-xl transition-all duration-300 group"
            >
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Sair do Sistema</span>
            </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="flex items-center justify-between h-16 px-6 bg-surface/80 backdrop-blur-md border-b border-zinc-800 z-10">
            <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-400 hover:text-white lg:hidden hover:scale-110 transition">
              <Menu size={24} />
            </button>
            <span className="text-zinc-400 text-sm hidden sm:block animate-fade-in-up">Olá, <span className="text-white font-medium">Administrador</span></span>
            <div className="flex items-center lg:hidden">
              <span className="font-bold text-sm bg-clip-text text-transparent bg-crazy-gradient uppercase" style={headerStyle}>CRAZY ART</span>
            </div>
            <div className="w-8 lg:hidden"></div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6 scroll-smooth">
          <div className="animate-fade-in-up">
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};
