
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Products from './pages/Products';
import DRE from './pages/DRE';
import FontFinder from './pages/FontFinder';
import Programs from './pages/Programs';
import Shop from './pages/Shop';
import CarouselManager from './pages/CarouselManager';
import { Loader2 } from 'lucide-react';
import { ScreenshotGuard } from './components/ScreenshotGuard';
import { IntroAnimation } from './components/IntroAnimation';

const LoadingScreen = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTakingTooLong, setIsTakingTooLong] = useState(false);

  const messages = [
    "Alinhando pixels...",
    "Ajustando kerning...",
    "Convertendo ideia em impacto...",
    "Prometemos que não é preguiça."
  ];

  useEffect(() => {
    // Rotaciona as mensagens a cada 2.5 segundos
    const rotationInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    // Ativa o easter egg após 8 segundos
    const timeout = setTimeout(() => {
      setIsTakingTooLong(true);
    }, 8000);

    return () => {
      clearInterval(rotationInterval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin text-primary mb-6" size={48} />
      <p className="text-zinc-500 animate-pulse font-mono text-sm tracking-wide text-center px-4">
        {isTakingTooLong ? "ok, agora é culpa da internet mesmo." : messages[messageIndex]}
      </p>
    </div>
  );
};

const AppContent = ({ showIntro, setShowIntro }: { showIntro: boolean, setShowIntro: (v: boolean) => void }) => {
  const { isLoading } = useData();
  
  // 1. Mostrar Intro Primeiro (se ativada)
  if (showIntro) {
      return <IntroAnimation onComplete={() => setShowIntro(false)} />;
  }

  // 2. Mostrar Loading do Contexto (se necessário)
  if (isLoading) return <LoadingScreen />;

  // 3. Mostrar App
  return (
    <Layout>
      <ScreenshotGuard />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/font-finder" element={<FontFinder />} />
        <Route path="/my-area" element={<ClientRoute />} />
        <Route path="/customers" element={<ProtectedRoute requiredRole="admin"><Customers /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute requiredRole="admin"><CustomerDetails /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute requiredRole="admin"><Products /></ProtectedRoute>} />
        <Route path="/dre" element={<ProtectedRoute requiredRole="admin"><DRE /></ProtectedRoute>} />
        <Route path="/carousel-manager" element={<ProtectedRoute requiredRole="admin"><CarouselManager /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
};

const ProtectedRoute = ({ children, requiredRole }: { children?: React.ReactNode, requiredRole: 'admin' | 'client' }) => {
  const { role } = useAuth();
  if (role === 'guest') return <Navigate to="/" replace />;
  if (requiredRole === 'admin' && role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const ClientRoute = () => {
    const { role, currentCustomer } = useAuth();
    if (role !== 'client' || !currentCustomer) return <Navigate to="/" replace />;
    return <CustomerDetails />; 
};

export default function App() {
  // Estado para controlar a intro
  // Iniciamos como true para sempre mostrar ao carregar/recarregar a página
  const [showIntro, setShowIntro] = useState(true);

  return (
    <DataProvider>
      <AuthProvider>
        <Router>
          <AppContent showIntro={showIntro} setShowIntro={setShowIntro} />
        </Router>
      </AuthProvider>
    </DataProvider>
  );
}
