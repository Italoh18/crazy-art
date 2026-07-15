
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer } from '../types';
import { api } from '../src/services/api';
import { useData } from './DataContext';

type UserRole = 'guest' | 'admin' | 'client';

interface AuthContextType {
  role: UserRole;
  currentCustomer: Customer | null;
  loginAdmin: (code: string, rememberMe?: boolean) => Promise<boolean>;
  loginClient: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('user_role') || sessionStorage.getItem('user_role') || 'guest') as UserRole;
  });
  const { loadData } = useData();
  
  // CORREÇÃO: Inicialização síncrona (Lazy) para garantir que os dados estejam disponíveis na primeira renderização
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => {
      const saved = localStorage.getItem('current_customer') || sessionStorage.getItem('current_customer');
      try {
          return saved ? JSON.parse(saved) : null;
      } catch {
          return null;
      }
  });

  const refreshCustomer = async () => {
      if (role === 'client') {
          try {
              const data = await api.getClients();
              // For clients, the API returns a single object. For admins, an array.
              if (data && !Array.isArray(data)) {
                setCurrentCustomer(data);
                const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage;
                storage.setItem('current_customer', JSON.stringify(data));
              }
          } catch (e) {
              console.error("Failed to refresh user data", e);
          }
      }
  };

  useEffect(() => {
      // Sync extra caso o storage mude externamente
      const savedCustomer = localStorage.getItem('current_customer') || sessionStorage.getItem('current_customer');
      if (savedCustomer) {
          try {
              setCurrentCustomer(JSON.parse(savedCustomer));
          } catch(e) {}
      }
      
      // Auto-refresh data if user is a client to ensure subscription status is up to date
      refreshCustomer();
  }, [role]);

  const loginAdmin = async (code: string, rememberMe: boolean = true) => {
    try {
        const data = await api.auth({ code }, rememberMe);
        if (data.token) {
            setRole('admin');
            await loadData(); // Recarrega dados com o novo token
            return true;
        }
    } catch (e) { console.error(e); }
    return false;
  };

  const loginClient = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
        const payload = { email, password };
        const data = await api.auth(payload, rememberMe);
        if (data.token && data.customer) {
            setRole('client');
            setCurrentCustomer(data.customer);
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('current_customer', JSON.stringify(data.customer));
            await loadData(); // Recarrega dados com o novo token
            return true;
        }
    } catch (e) { console.error(e); }
    return false;
  };

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setRole('guest');
    setCurrentCustomer(null);
    loadData(); // Limpa dados sensíveis recarregando como guest (sem token)
  };

  return (
    <AuthContext.Provider value={{ role, currentCustomer, loginAdmin, loginClient, logout, refreshCustomer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
