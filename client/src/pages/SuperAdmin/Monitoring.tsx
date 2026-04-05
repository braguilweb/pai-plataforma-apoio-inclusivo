import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function SuperAdminMonitoring() {
  const [, setLocation] = useLocation();
  const { data } = trpc.superAdmin.getDashboardStats.useQuery();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Monitoramento do Sistema</h1>
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 mb-2">Visão consolidada de saúde do sistema</p>
          <p>Total de escolas: {data?.totalSchools || 0}</p>
          <p>Total de alunos: {data?.totalStudents || 0}</p>
          <p>Total de professores: {data?.totalTeachers || 0}</p>
          <Button variant="outline" onClick={() => setLocation("/super-admin/dashboard")}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
