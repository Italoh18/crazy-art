import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Package, FileText, Menu, X, LogOut, LayoutDashboard, Paintbrush, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, currentCustomer } = useAuth();

  // If Guest, just show content (Home page handles its own layout essentially, or this wrapper is transparent)
  if (role === 'guest') {
    return <>{children}</>;
  }

  // Admin Routes in Sidebar
  const adminNavItems = [
    { name: 'Início', path: '/', icon: Home },
    { name: 'Clientes', path: '/customers', icon: Users },
    { name: 'Produtos', path: '/products', icon: Package },
    { name: 'Financeiro (DRE)', path: '/dre', icon: FileText },
  ];

  const isActive = (path: string) => {
      if (path === '/' && location.pathname !== '/') return false;
      return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Client Layout (Simplified)
  if (role === 'client') {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="bg-surface border-b border-zinc-800 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
                <div className="flex items-center space-x-4">
                     {/* Back Button without Logout */}
                     <Link to="/" className="text-zinc-400 hover:text-white transition p-2 hover:bg-zinc-800 rounded-full" title="Voltar ao Início">
                        <ArrowLeft size={20} />
                     </Link>
                     <div className="flex items-center space-x-2">
                        <Paintbrush className="text-primary" size={24} />
                        <span className="font-bold text-lg bg-clip-text text-transparent bg-crazy-gradient hidden sm:block">Crazy Art</span>
                     </div>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-zinc-400 text-sm hidden sm:block">Olá, <span className="text-white font-medium">{currentCustomer?.name}</span></span>
                    <button onClick={handleLogout} className="text-zinc-400 hover:text-secondary flex items-center space-x-1 pl-4 border-l border-zinc-700">
                        <LogOut size={18} />
                        <span className="text-sm">Sair</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
  }

  // Admin Layout
  return (
    <div className="flex h-screen bg-background overflow-hidden text-text">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-surface border-r border-zinc-800 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
             <span className="text-xl font-bold bg-clip-text text-transparent bg-crazy-gradient">Crazy Art</span>
             <span className="text-xs text-zinc-500 uppercase tracking-widest bg-zinc-800 px-1 rounded">ADM</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-zinc-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {adminNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-yellow-500/10 to-red-600/10 text-primary border border-primary/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
            <button 
                onClick={handleLogout}
                className="flex items-center space-x-3 px-4 py-3 w-full text-zinc-400 hover:text-secondary hover:bg-red-500/10 rounded-lg transition"
            >
                <LogOut size={20} />
                <span>Sair do Sistema</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-surface border-b border-zinc-800 lg:hidden">
            <span className="font-semibold text-white">Menu</span>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="text-zinc-400 hover:text-white focus:outline-none"
            >
              <Menu size={24} />
            </button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
};