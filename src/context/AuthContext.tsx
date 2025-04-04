
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import api from '@/api/apiConfig';
import { toast } from '@/hooks/use-toast';

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if token exists and verify it with the backend
    const verifyToken = async () => {
      const token = localStorage.getItem('finpal_token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await api.get('/auth/me');
        console.log("Auth verification response:", response.data);
        setUser(response.data.user);
      } catch (error) {
        console.error('Failed to verify token:', error);
        localStorage.removeItem('finpal_token');
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyToken();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      console.log("Login response:", response.data);
      const { token, user } = response.data;
      
      localStorage.setItem('finpal_token', token);
      setUser(user);
      
      return Promise.resolve();
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to login';
      return Promise.reject(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { email, password, name });
      console.log("Registration response:", response.data);
      const { token, user } = response.data;
      
      localStorage.setItem('finpal_token', token);
      setUser(user);
      
      return Promise.resolve();
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to register';
      return Promise.reject(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('finpal_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
