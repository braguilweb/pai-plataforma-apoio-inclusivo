import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";

export default function SchoolStudentDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/escola/alunos/:id");
  const studentId = Number(params?.id || 0);
  const { data, isLoading } = trpc.schools.getStudentWithAnamnesis.useQuery(
    { studentId },
    { enabled: studentId > 0 }
  );
  const { data: messages } = trpc.schools.getStudentRecentMessages.useQuery(
    { studentId },
    { enabled: studentId > 0 }
  );

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Detalhes do Aluno</h1>
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <p><strong>ID:</strong> {data?.student?.id}</p>
        <p><strong>Série:</strong> {data?.student?.series}</p>
        <p><strong>Pessoa responsável:</strong> {data?.anamnesis?.guardianName || "-"}</p>
        <p><strong>Leitura:</strong> {data?.anamnesis?.readingLevel || "-"}</p>
        <p><strong>Escrita:</strong> {data?.anamnesis?.writingLevel || "-"}</p>

        <div>
          <p className="font-semibold mb-2">Últimas interações</p>
          <div className="space-y-2">
            {(messages || []).slice(0, 5).map((m: any) => (
              <div key={m.id} className="border rounded p-2 text-sm">
                {m.messageType} / {m.contentType}
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" onClick={() => setLocation("/escola/alunos")}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
