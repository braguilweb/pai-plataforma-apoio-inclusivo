import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function SchoolTeachers() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.schools.listTeachers.useQuery();

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Professores</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setLocation("/escola/professores/novo")}
            className="bg-green-600"
          >
            + Novo
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/escola/dashboard")}
          >
            Voltar
          </Button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        {data && data.length > 0 ? (
          <div className="space-y-2">
            {data.map((teacher: any) => (
              <div key={teacher.id} className="border rounded p-3">
                <p className="font-medium">{teacher.name || `Professor #${teacher.id}`}</p>
                <p className="text-sm text-gray-600">{teacher.email || "Sem e-mail"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">Nenhum professor cadastrado.</p>
        )}
      </div>
    </div>
  );
}
