import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Settings } from "lucide-react";

export default function SchoolDashboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.schools.getDashboard.useQuery();
  const { mutate: logout } = trpc.logout.useMutation();

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">{data?.school?.name || "Escola"} - Painel Admin</h1>
          <Button variant="outline" onClick={() => logout()}>
            Sair
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Alunos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data?.studentCount || 0}</p>
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
              <p className="text-3xl font-bold">{data?.teacherCount || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Menu de Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setLocation("/escola/alunos")}
                className="bg-blue-500 hover:bg-blue-600 h-12"
              >
                Gerir Alunos
              </Button>
              <Button
                onClick={() => setLocation("/escola/alunos/novo")}
                className="bg-green-600 hover:bg-green-700 h-12"
              >
                + Novo Aluno
              </Button>
              <Button
                onClick={() => setLocation("/escola/professores")}
                className="bg-blue-500 hover:bg-blue-600 h-12"
              >
                Gerir Professores
              </Button>
              <Button
                onClick={() => setLocation("/escola/configuracoes")}
                className="bg-gray-600 hover:bg-gray-700 h-12 flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Últimos Alunos */}
        {data?.recentStudents && data.recentStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Últimos Alunos Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentStudents.map((student: any) => (
                  <div
                    key={student.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setLocation(`/escola/alunos/${student.id}`)}
                  >
                    <p className="font-medium">ID: {student.id}</p>
                    <p className="text-sm text-gray-500">Série: {student.series}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
