
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
import Orders from './pages/Orders';
import FontFinder from './pages/FontFinder';
import FontEditor from './pages/FontEditor'; // Nova Importação
import Programs from './pages/Programs';
import Shop from './pages/Shop';
import CarouselManager from './pages/CarouselManager';
import TrustedCompanies from './pages/TrustedCompanies'; 
import LayoutBuilder from './pages/LayoutBuilder';
import BackgroundRemover from './pages/BackgroundRemover';
import PixelArt from './pages/PixelArt'; 
import PdfToWord from './pages/PdfToWord';
import EmailTemplates from './pages/EmailTemplates';
import PendingOrders from './pages/PendingOrders';
import Coupons from './pages/Coupons';
import Identity from './pages/Identity';
import ArtDrive from './pages/ArtDrive';
import PrintCheck from './pages/PrintCheck';
import TraceMagic from './pages/TraceMagic';
import CdrConverter from './pages/CdrConverter';
import Feedbacks from './pages/Feedbacks';
import PricingCalculator from './pages/PricingCalculator';
import SmartEnlargement from './pages/SmartEnlargement';
import ClientOrders from './pages/ClientOrders'; // Nova Importação
import { Loader2 } from 'lucide-react';
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
    const rotationInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    const timeout = setTimeout(() => {
      setIsTakingTooLong(true);
    }, 8000);

    return () => {
      clearInterval(rotationInterval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white fixed inset-0 z-50">
      <Loader2 className="animate-spin text-primary mb-6" size={48} />
      <p className="text-zinc-500 animate-pulse font-mono text-sm tracking-wide text-center px-4">
        {isTakingTooLong ? "ok, agora é culpa da internet mesmo." : messages[messageIndex]}
      </p>
    </div>
  );
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/font-finder" element={<FontFinder />} />
            <Route path="/font-editor" element={<FontEditor />} /> {/* Nova Rota */}
            <Route path="/layout-builder" element={<LayoutBuilder />} />
            <Route path="/remove-bg" element={<BackgroundRemover />} />
            <Route path="/pixel-art" element={<PixelArt />} />
            <Route path="/pdf-to-word" element={<PdfToWord />} />
            <Route path="/print-check" element={<PrintCheck />} />
            <Route path="/trace-magic" element={<TraceMagic />} />
            <Route path="/cdr-converter" element={<CdrConverter />} />
            <Route path="/pricing-calculator" element={<PricingCalculator />} />
            <Route path="/smart-enlargement" element={<SmartEnlargement />} />
            <Route path="/my-area" element={<ClientRoute />} />
            <Route path="/my-orders" element={<ClientOrdersRoute />} /> {/* Nova Rota */}
            <Route path="/pending-confirmations" element={<ProtectedRoute requiredRole="admin"><PendingOrders /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute requiredRole="admin"><Orders /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute requiredRole="admin"><Customers /></ProtectedRoute>} />
            <Route path="/customers/:id" element={<ProtectedRoute requiredRole="admin"><CustomerDetails /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute requiredRole="admin"><Products /></ProtectedRoute>} />
            <Route path="/coupons" element={<ProtectedRoute requiredRole="admin"><Coupons /></ProtectedRoute>} />
            <Route path="/dre" element={<ProtectedRoute requiredRole="admin"><DRE /></ProtectedRoute>} />
            <Route path="/carousel-manager" element={<ProtectedRoute requiredRole="admin"><CarouselManager /></ProtectedRoute>} />
            <Route path="/trusted-companies" element={<ProtectedRoute requiredRole="admin"><TrustedCompanies /></ProtectedRoute>} />
            <Route path="/email-templates" element={<ProtectedRoute requiredRole="admin"><EmailTemplates /></ProtectedRoute>} />
            <Route path="/identity" element={<ProtectedRoute requiredRole="admin"><Identity /></ProtectedRoute>} />
            <Route path="/feedbacks" element={<ProtectedRoute requiredRole="admin"><Feedbacks /></ProtectedRoute>} />
        </Routes>
    );
}

const AppContent = ({ showIntro, setShowIntro }: { showIntro: boolean, setShowIntro: (v: boolean) => void }) => {
  const { isLoading, faviconUrl } = useData();
  
  useEffect(() => {
    if (faviconUrl) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      link.href = faviconUrl;
      document.head.appendChild(link);
      
      const linkApple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement || document.createElement('link');
      linkApple.rel = 'apple-touch-icon';
      linkApple.href = faviconUrl;
      document.head.appendChild(linkApple);
    }
  }, [faviconUrl]);
  
  return (
    <>
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
      {isLoading ? (
         <LoadingScreen />
      ) : (
         <Layout>
            <AppRoutes />
         </Layout>
      )}
    </>
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

const ClientOrdersRoute = () => {
    const { role, currentCustomer } = useAuth();
    if (role !== 'client' || !currentCustomer) return <Navigate to="/" replace />;
    return <ClientOrders />; 
};

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('intro_played');
  });

  const handleSetShowIntro = (value: boolean) => {
    if (!value) {
        sessionStorage.setItem('intro_played', 'true');
    }
    setShowIntro(value);
  };

  return (
    <DataProvider>
      <AuthProvider>
        <Router>
          <AppContent showIntro={showIntro} setShowIntro={handleSetShowIntro} />
        </Router>
      </AuthProvider>
    </DataProvider>
  );
}
