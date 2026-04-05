import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Redirect } from "wouter";

/**
 * Landing page - redirects based on authentication status
 */
export default function Home() {
  const { user, loading } = useAuth();

  // If authenticated, redirect to appropriate dashboard
  if (user && !loading) {
    switch (user.role) {
      case "super_admin":
        return <Redirect to="/super-admin/dashboard" />;
      case "admin_school":
        return <Redirect to="/escola/dashboard" />;
      case "teacher":
        return <Redirect to="/professor/dashboard" />;
      case "student":
        return <Redirect to="/aluno/chat" />;
      default:
        return <Redirect to="/login" />;
    }
  }

  // If not authenticated, show landing page or redirect to login
  if (!loading && !user) {
    return <Redirect to="/login" />;
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">PAI - Plataforma de Apoio Inclusivo</h1>
        <p className="text-gray-600 mb-6">Carregando...</p>
      </div>
    </div>
  );
}
