import React, { createContext, useContext, ReactNode, useState } from 'react';

// Define types for our context
type AppContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

// Create context with default values
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export function AppContextProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Value provided to consuming components
  const value = {
    isDarkMode,
    toggleDarkMode
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}