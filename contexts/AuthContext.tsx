import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useData } from './DataContext';
import { Customer } from '../types';

type UserRole = 'guest' | 'admin' | 'client';

interface AuthContextType {
  role: UserRole;
  currentCustomer: Customer | null;
  loginAdmin: (code: string) => boolean;
  loginClient: (cpf: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [role, setRole] = useState<UserRole>('guest');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const { customers } = useData();

  const loginAdmin = (code: string) => {
    if (code === '79913061') {
      setRole('admin');
      setCurrentCustomer(null);
      return true;
    }
    return false;
  };

  const loginClient = (cpf: string) => {
    // Normalize CPF for comparison (remove punctuation if needed, currently exact match)
    const client = customers.find(c => c.cpf === cpf);
    if (client) {
      setRole('client');
      setCurrentCustomer(client);
      return true;
    }
    return false;
  };

  const logout = () => {
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};