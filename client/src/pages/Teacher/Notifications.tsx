import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function TeacherNotifications() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.teachers.getNotifications.useQuery();

  if (isLoading) return <div className="p-8">Carregando notificações...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Notificações</h1>
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
            {data.map((n: any) => (
              <div key={n.id} className="border rounded p-3">
                <p className="font-medium">Aluno #{n.studentId}</p>
                <p className="text-sm text-gray-600">{n.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">Sem notificações no momento.</p>
        )}
      </div>
    </div>
  );
}
