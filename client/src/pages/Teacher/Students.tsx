import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function TeacherStudents() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.teachers.listMyStudents.useQuery();

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Meus Alunos</h1>
        <Button
          variant="outline"
          onClick={() => setLocation("/professor/dashboard")}
        >
          Voltar
        </Button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        {data && data.length > 0 ? (
          <div className="space-y-2">
            {data.map((student: any) => (
              <div
                key={student.id}
                className="border rounded p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setLocation(`/professor/alunos/${student.id}`)}
              >
                <p className="font-medium">Aluno #{student.id}</p>
                <p className="text-sm text-gray-600">Série: {student.series}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">Nenhum aluno vinculado.</p>
        )}
      </div>
    </div>
  );
}
