import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppContextProvider } from "./context/newvontext";
import { ProtectedRoute, PublicRoute } from "./context/RouteGuard";
import ChatbotWrapper from "./components/chatbot/ChatbotWrapper";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Analytics from "./pages/Analytics";
import Goals from "./pages/Goals";
import Insights from "./pages/insights";

import Income from "./pages/Income";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContextProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ChatbotWrapper />
            <BrowserRouter>
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <PublicRoute>
                      <Auth />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/expenses" 
                  element={
                    <ProtectedRoute>
                      <Expenses />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/analytics" 
                  element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/insights" 
                  element={
                    <ProtectedRoute>
                      <Insights />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/goals" 
                  element={
                    <ProtectedRoute>
                      <Goals />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/income" 
                  element={
                    <ProtectedRoute>
                      <Income />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              
            </BrowserRouter>
          </TooltipProvider>
        </AppContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;