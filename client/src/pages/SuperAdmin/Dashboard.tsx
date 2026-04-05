import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, BookOpen } from "lucide-react";



export default function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.superAdmin.getDashboardStats.useQuery();
  
  
  const { mutate: logout } = trpc.logout.useMutation();

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">PAI - Super Admin</h1>
          <Button variant="outline" onClick={() => logout()}>
            Sair
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Escolas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data?.totalSchools || 0}</p>
              <p className="text-xs text-gray-500">Cadastradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Alunos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data?.totalStudents || 0}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Professores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data?.totalTeachers || 0}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento</CardTitle>
            <CardDescription>Acesso às funções de administração</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setLocation("/super-admin/escolas")}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Gerenciar Escolas
              </Button>
              <Button
                onClick={() => setLocation("/super-admin/avatares")}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Configurar Avatares
              </Button>
              <Button
                onClick={() => setLocation("/super-admin/monitoramento")}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Monitoramento
              </Button>
              <Button
                onClick={() => setLocation("/super-admin/manutencao")}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Modo Manutenção
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Últimas Escolas */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas Escolas Cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentSchools && data.recentSchools.length > 0 ? (
              <div className="space-y-2">
                {data.recentSchools.map((school: any) => (
                  <div
                    key={school.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setLocation(`/super-admin/escolas/${school.id}`)}
                  >
                    <p className="font-medium">{school.name}</p>
                    <p className="text-sm text-gray-500">
                      Paleta: {school.colorPalette}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma escola cadastrada ainda</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
