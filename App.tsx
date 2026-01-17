
import React from 'react';
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
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
    <Loader2 className="animate-spin text-primary mb-4" size={48} />
    <p className="text-zinc-500 animate-pulse">Sincronizando com Banco de Dados...</p>
  </div>
);

const AppContent = () => {
  const { isLoading } = useData();
  
  if (isLoading) return <LoadingScreen />;

  return (
    <Layout>
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
  return (
    <DataProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </DataProvider>
  );
}
