import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function SchoolStudents() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: students, isLoading } = trpc.schools.listStudents.useQuery();

  const filteredStudents = students?.filter((s: any) =>
    s.id.toString().includes(searchTerm)
  );

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Alunos</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setLocation("/escola/alunos/novo")}
              className="bg-green-600 hover:bg-green-700"
            >
              + Novo Aluno
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/escola/dashboard")}
            >
              Voltar
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {filteredStudents && filteredStudents.length > 0 ? (
            filteredStudents.map((student: any) => (
              <Card
                key={student.id}
                className="cursor-pointer hover:shadow-lg"
                onClick={() => setLocation(`/escola/alunos/${student.id}`)}
              >
                <CardHeader>
                  <CardTitle>Aluno #{student.id}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>
                    <span className="font-medium">Série:</span> {student.series}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {student.blockedAt ? "🔒 Bloqueado" : "✅ Ativo"}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Nenhum aluno encontrado</p>
              <Button
                onClick={() => setLocation("/escola/alunos/novo")}
                className="bg-green-600 hover:bg-green-700"
              >
                Criar Primeiro Aluno
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
