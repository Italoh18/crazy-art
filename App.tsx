
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import { Loader2 } from 'lucide-react';
import { IntroAnimation } from './components/IntroAnimation';

// Lazy loading rotas secundárias e ferramentas pesadas
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetails = lazy(() => import('./pages/CustomerDetails'));
const Products = lazy(() => import('./pages/Products'));
const DRE = lazy(() => import('./pages/DRE'));
const Orders = lazy(() => import('./pages/Orders'));
const FontEditor = lazy(() => import('./pages/FontEditor'));
const Programs = lazy(() => import('./pages/Programs'));
const Shop = lazy(() => import('./pages/Shop'));
const CarouselManager = lazy(() => import('./pages/CarouselManager'));
const TrustedCompanies = lazy(() => import('./pages/TrustedCompanies')); 
const LayoutBuilder = lazy(() => import('./pages/LayoutBuilder'));
const BackgroundRemover = lazy(() => import('./pages/BackgroundRemover'));
const PixelArt = lazy(() => import('./pages/PixelArt')); 
const PdfToWord = lazy(() => import('./pages/PdfToWord'));
const EmailTemplates = lazy(() => import('./pages/EmailTemplates'));
const PendingOrders = lazy(() => import('./pages/PendingOrders'));
const Coupons = lazy(() => import('./pages/Coupons'));
const Identity = lazy(() => import('./pages/Identity'));
const ArtDrive = lazy(() => import('./pages/ArtDrive'));
const PrintCheck = lazy(() => import('./pages/PrintCheck'));
const TraceMagic = lazy(() => import('./pages/TraceMagic'));
const PowerTraceAlfa = lazy(() => import('./pages/PowerTraceAlfa'));
const CdrConverter = lazy(() => import('./pages/CdrConverter'));
const Feedbacks = lazy(() => import('./pages/Feedbacks'));
const PricingCalculator = lazy(() => import('./pages/PricingCalculator'));
const SmartEnlargement = lazy(() => import('./pages/SmartEnlargement'));
const Statement = lazy(() => import('./pages/Statement'));
const ClientOrders = lazy(() => import('./pages/ClientOrders'));
const LayoutSimples = lazy(() => import('./pages/LayoutSimples'));
const MontagemMolde = lazy(() => import('./pages/MontagemMolde'));
const MatrizBordado = lazy(() => import('./pages/MatrizBordado'));
const Vetorizacao = lazy(() => import('./pages/Vetorizacao'));
const MoldesManager = lazy(() => import('./pages/MoldesManager'));
const AdminMockupSoon = lazy(() => import('./pages/AdminMockupSoon'));
const ListaPublica = lazy(() => import('./pages/ListaPublica'));

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

const RouteLoadingScreen = () => (
  <div className="flex h-[50vh] w-full items-center justify-center">
    <Loader2 className="animate-spin text-primary opacity-50" size={32} />
  </div>
);

const AppRoutes = () => {
    return (
        <Suspense fallback={<RouteLoadingScreen />}>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/quitanda_de_art" element={<Shop />} />
                <Route path="/tools" element={<Programs />} />
                <Route path="/font-editor" element={<FontEditor />} /> {/* Nova Rota */}
                <Route path="/layout-builder" element={<LayoutBuilder />} />
                <Route path="/remove-bg" element={<BackgroundRemover />} />
                <Route path="/pixel-art" element={<PixelArt />} />
                <Route path="/pdf-to-word" element={<PdfToWord />} />
                <Route path="/print-check" element={<PrintCheck />} />
                <Route path="/trace-magic" element={<TraceMagic />} />
                <Route path="/power-trace-alfa" element={<PowerTraceAlfa />} />
                <Route path="/cdr-converter" element={<CdrConverter />} />
                <Route path="/pricing-calculator" element={<PricingCalculator />} />
                <Route path="/smart-enlargement" element={<SmartEnlargement />} />
                <Route path="/layout-simples" element={<LayoutSimples />} />
                <Route path="/montagem-molde" element={<MontagemMolde />} />
                <Route path="/matriz-bordado" element={<MatrizBordado />} />
                <Route path="/vetorizacao" element={<Vetorizacao />} />
                <Route path="/lista-publica/:id" element={<ListaPublica />} />
                <Route path="/minha-area" element={<ClientRoute />} />
                <Route path="/my-orders" element={<ClientOrdersRoute />} />
                <Route path="/statement" element={<StatementRoute />} /> {/* Nova Rota */}
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
                <Route path="/moldes" element={<ProtectedRoute requiredRole="admin"><MoldesManager /></ProtectedRoute>} />
                <Route path="/feedbacks" element={<ProtectedRoute requiredRole="admin"><Feedbacks /></ProtectedRoute>} />
                <Route path="/admin-mockup-soon" element={<ProtectedRoute requiredRole="admin"><AdminMockupSoon /></ProtectedRoute>} />
            </Routes>
        </Suspense>
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

const StatementRoute = () => {
    const { role, currentCustomer } = useAuth();
    if (role !== 'client' || !currentCustomer) return <Navigate to="/" replace />;
    return <Statement />; 
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
        <CartProvider>
          <Router>
            <AppContent showIntro={showIntro} setShowIntro={handleSetShowIntro} />
          </Router>
        </CartProvider>
      </AuthProvider>
    </DataProvider>
  );
}
