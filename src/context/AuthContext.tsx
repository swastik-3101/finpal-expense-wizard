
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('finpal_user');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // For demo purposes, we'll just create a mock user
    // In a real app, you would call an API to authenticate
    const mockUser = {
      id: '1',
      name: 'Demo User',
      email: email,
    };
    
    // Store user in localStorage
    localStorage.setItem('finpal_user', JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const register = async (email: string, password: string, name: string) => {
    // For demo purposes, we'll just create a mock user
    // In a real app, you would call an API to register
    const mockUser = {
      id: '1',
      name: name,
      email: email,
    };
    
    // Store user in localStorage
    localStorage.setItem('finpal_user', JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const logout = () => {
    localStorage.removeItem('finpal_user');
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
