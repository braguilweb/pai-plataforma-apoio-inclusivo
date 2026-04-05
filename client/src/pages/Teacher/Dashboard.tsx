import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">Professor - Dashboard</h1>
          <Button variant="outline">Sair</Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Meus Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/professor/alunos")}
              className="bg-blue-600"
            >
              Ver Meus Alunos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/professor/notificacoes")}
              className="bg-blue-600"
            >
              Ver Notificações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
