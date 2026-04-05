import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

export default function SuperAdminMaintenance() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Modo Manutenção</h1>
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <Alert className="mb-4">
            <AlertDescription>
              Modo manutenção ainda sem persistência backend. Nesta fase, disponibilizamos o painel e mensagem operacional.
            </AlertDescription>
          </Alert>
          <p className="text-gray-600 mb-4">Quando ativado, alunos devem ser redirecionados para tela de manutenção.</p>
          <Button variant="outline" onClick={() => setLocation("/super-admin/dashboard")}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
