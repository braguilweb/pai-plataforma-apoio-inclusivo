import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentFirstAccess() {
  const [, setLocation] = useLocation();
  const [personaName, setPersonaName] = useState("");
  const [avatarStyle, setAvatarStyle] = useState("");

  const { mutate: completeFirstAccess, isPending } = trpc.students.completeFirstAccess.useMutation({
    onSuccess: () => {
      setLocation("/aluno/chat");
    },
    onError: (error) => {
      alert(`Erro ao salvar preferências: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (personaName && avatarStyle) {
      completeFirstAccess({
        personaName: personaName as "Prof. Guilherme" | "Gui" | "Tio Gui" | "Tio Guilherme",
        avatarStyle: avatarStyle as "manga" | "pixar" | "android",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="bg-blue-500 text-white rounded-t-lg">
          <CardTitle className="text-2xl">Bem-vindo ao PAI! 💙</CardTitle>
          <CardDescription className="text-blue-100">
            Vamos conhecer seu novo tutor
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div>
            <p className="font-medium mb-3">Como você quer chamar o PAI?</p>
            <Select value={personaName} onValueChange={setPersonaName}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Escolha um nome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Prof. Guilherme">Prof. Guilherme</SelectItem>
                <SelectItem value="Gui">Gui</SelectItem>
                <SelectItem value="Tio Gui">Tio Gui</SelectItem>
                <SelectItem value="Tio Guilherme">Tio Guilherme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="font-medium mb-3">Qual avatar você prefere?</p>
            <Select value={avatarStyle} onValueChange={setAvatarStyle}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Escolha um avatar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manga">Mangá 🎨</SelectItem>
                <SelectItem value="pixar">Pixar 3D 🎬</SelectItem>
                <SelectItem value="android">Robô Android 🤖</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">📋 Regras Importantes:</p>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>✅ Estude de 06:00 até 23:59</li>
              <li>✅ Máximo 4h de estudo por dia</li>
              <li>✅ Máximo 6h total de uso por dia</li>
              <li>⚠️ Não envie imagens inadequadas</li>
            </ul>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!personaName || !avatarStyle || isPending}
            className="w-full bg-blue-500 hover:bg-blue-600 text-lg h-12"
          >
            {isPending ? "Salvando..." : "Começar a Estudar!"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
