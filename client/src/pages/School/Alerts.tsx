import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function SchoolAlerts() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.schools.getModerationAlerts.useQuery();

  if (isLoading) return <div className="p-8">Carregando alertas...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Alertas e Moderação</h1>
        <Button
          variant="outline"
          onClick={() => setLocation("/escola/dashboard")}
        >
          Voltar
        </Button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        {data && data.length > 0 ? (
          <div className="space-y-3">
            {data.map((alert: any) => (
              <div key={alert.id} className="border rounded p-3">
                <p className="font-medium">Aluno #{alert.studentId}</p>
                <p className="text-sm text-gray-600">Ação: {alert.actionTaken}</p>
                <p className="text-sm text-gray-600">Ocorrências: {alert.warningCount}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">Sem alertas de moderação.</p>
        )}
      </div>
    </div>
  );
}
