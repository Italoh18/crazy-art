import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
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

// Route Guard Component
const ProtectedRoute = ({ children, requiredRole }: { children?: React.ReactNode, requiredRole: 'admin' | 'client' }) => {
  const { role, currentCustomer } = useAuth();
  
  if (role === 'guest') return <Navigate to="/" replace />;
  if (requiredRole === 'admin' && role !== 'admin') return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

// Special Client Route Wrapper
const ClientRoute = () => {
    const { role, currentCustomer } = useAuth();
    if (role !== 'client' || !currentCustomer) return <Navigate to="/" replace />;
    
    // In client mode, we reuse the CustomerDetails component but lock it down visually inside the component
    // or just pass the ID.
    return <CustomerDetails />; 
};

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/programs" element={<Programs />} />
              <Route path="/font-finder" element={<FontFinder />} />
              
              {/* Client Route */}
              <Route path="/my-area" element={<ClientRoute />} />

              {/* Admin Routes */}
              <Route path="/customers" element={
                <ProtectedRoute requiredRole="admin"><Customers /></ProtectedRoute>
              } />
              <Route path="/customers/:id" element={
                <ProtectedRoute requiredRole="admin"><CustomerDetails /></ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute requiredRole="admin"><Products /></ProtectedRoute>
              } />
              <Route path="/dre" element={
                <ProtectedRoute requiredRole="admin"><DRE /></ProtectedRoute>
              } />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </DataProvider>
  );
}