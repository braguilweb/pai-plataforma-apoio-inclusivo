import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";

export default function TeacherStudentDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/professor/alunos/:id");
  const studentId = Number(params?.id || 0);
  const { data, isLoading } = trpc.teachers.getStudentReport.useQuery(
    { studentId },
    { enabled: studentId > 0 }
  );

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Relatório do Aluno</h1>
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <p><strong>Aluno:</strong> #{data?.student?.id}</p>
        <p><strong>Total de interações:</strong> {data?.comprehensionStats?.totalInteractions || 0}</p>
        <p><strong>Compreensão:</strong> {(data?.comprehensionStats?.comprehensionRate || 0).toFixed(1)}%</p>
        <p><strong>Compreendeu:</strong> {data?.comprehensionStats?.comprehended || 0}</p>
        <p><strong>Não compreendeu:</strong> {data?.comprehensionStats?.notComprehended || 0}</p>

        <div>
          <p className="font-semibold mb-2">Interações recentes</p>
          <div className="space-y-2">
            {(data?.recentChats || []).map((msg: any) => (
              <div key={msg.id} className="border rounded p-2 text-sm">
                {msg.messageType} / {msg.contentType}
              </div>
            ))}
          </div>
        </div>
        <Button variant="outline" onClick={() => setLocation("/professor/alunos")}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
