import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function SchoolTeachersNew() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Novo Professor</h1>
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <p className="text-gray-600">Formulário de novo professor (TODO)</p>
        <Button variant="outline" onClick={() => setLocation("/escola/professores")}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
