import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";

export default function SchoolConfiguration() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.schools.getConfiguration.useQuery();
  const [customColorHex, setCustomColorHex] = useState("#2563EB");
  const { mutate: updateConfig, isPending } = trpc.schools.updateConfiguration.useMutation();

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Configurações da Escola</h1>
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <p className="text-gray-600">Paleta atual: {data?.colorPalette}</p>
        <Input
          value={customColorHex}
          onChange={(e) => setCustomColorHex(e.target.value)}
          placeholder="#2563EB"
        />
        <Button
          disabled={isPending}
          onClick={() =>
            updateConfig({
              colorPalette: "personalizada",
              customColorHex,
            })
          }
        >
          {isPending ? "Salvando..." : "Salvar Cor Personalizada"}
        </Button>
        <Button variant="outline" onClick={() => setLocation("/escola/dashboard")}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
