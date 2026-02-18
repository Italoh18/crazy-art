
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer } from '../types';
import { api } from '../src/services/api';

type UserRole = 'guest' | 'admin' | 'client';

interface AuthContextType {
  role: UserRole;
  currentCustomer: Customer | null;
  loginAdmin: (code: string) => Promise<boolean>;
  loginClient: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [role, setRole] = useState<UserRole>((localStorage.getItem('user_role') as UserRole) || 'guest');
  
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => {
      const saved = localStorage.getItem('current_customer');
      try {
          return saved ? JSON.parse(saved) : null;
      } catch {
          return null;
      }
  });

  useEffect(() => {
      const savedCustomer = localStorage.getItem('current_customer');
      if (savedCustomer) setCurrentCustomer(JSON.parse(savedCustomer));
  }, []);

  const loginAdmin = async (code: string) => {
    try {
        const data = await api.auth({ code });
        if (data.token) {
            setRole('admin');
            return true;
        }
    } catch (e) { console.error(e); }
    return false;
  };

  const loginClient = async (email: string, password: string) => {
    try {
        const data = await api.auth({ email, password });
        if (data.token && data.customer) {
            setRole('client');
            setCurrentCustomer(data.customer);
            localStorage.setItem('current_customer', JSON.stringify(data.customer));
            return true;
        }
    } catch (e) { console.error(e); }
    return false;
  };

  const logout = () => {
    localStorage.clear();
    setRole('guest');
    setCurrentCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ role, currentCustomer, loginAdmin, loginClient, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
