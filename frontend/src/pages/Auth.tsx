
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";
import { useEffect } from "react";

export default function Auth() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already authenticated and redirect if needed
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (email: string, password: string, name: string) => {
    try {
      await register(email, password, name);
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-finpal-50 to-background p-4">
      <div className="mb-8 text-center">
        <div className="flex justify-center items-center mb-2">
          <DollarSign className="h-8 w-8 text-finpal-500" />
          <h1 className="text-3xl font-bold ml-2">FinPal</h1>
        </div>
        <p className="text-lg text-muted-foreground">Your personal finance assistant</p>
      </div>
      <AuthForm onLogin={handleLogin} onRegister={handleRegister} />
    </div>
  );
}
