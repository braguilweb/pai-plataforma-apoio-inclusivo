import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AcceptanceLink() {
  const [, params] = useRoute("/aceite/:token");
  const [, setLocation] = useLocation();
  const token = params && 'token' in params ? params.token : undefined;
  const [step, setStep] = useState(1);

  // Bloco 3 - Preferências
  const [favoriteMovies, setFavoriteMovies] = useState("");
  const [favoriteMusic, setFavoriteMusic] = useState("");
  const [favoriteSports, setFavoriteSports] = useState("");
  const [favoriteFoods, setFavoriteFoods] = useState("");
  const [favoriteAnimations, setFavoriteAnimations] = useState("");
  const [otherInterests, setOtherInterests] = useState("");
  const [prohibitedThemes, setProhibitedThemes] = useState(["", "", ""]);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);

  const { data: tokenInfo, isLoading: isLoadingToken } = trpc.students.resolveAcceptanceToken.useQuery(
    { token: token || "" },
    { enabled: Boolean(token) }
  );

  const { mutate: fillBlock3, isPending } = trpc.students.fillBlock3.useMutation({
    onSuccess: () => {
      if (!token) return;
      acceptLGPD({ token, agreementToken: true });
    },
    onError: (error: any) => {
      alert(`Erro: ${error.message}`);
    },
  });

  const { mutate: acceptLGPD, isPending: isAccepting } = trpc.students.acceptLGPD.useMutation({
    onSuccess: () => {
      alert("Consentimento concluído com sucesso!");
      setLocation("/login");
    },
    onError: (error: any) => {
      alert(`Erro ao aceitar LGPD: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!token) {
      alert("Link inválido");
      return;
    }

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!lgpdAccepted) {
        alert("Você deve aceitar os termos LGPD");
        return;
      }

      fillBlock3({
        token,
        favoriteMovies,
        favoriteMusic,
        favoriteSports,
        favoriteFoods,
        favoriteAnimations,
        otherInterests,
        prohibitedThemes: prohibitedThemes.filter((t) => t.trim()),
      });
    }
  };

  if (!token) {
    return <div className="p-8">Link inválido.</div>;
  }

  if (isLoadingToken) {
    return <div className="p-8">Validando link...</div>;
  }

  if (!tokenInfo) {
    return <div className="p-8">Não foi possível validar este link.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            Formulário de Consentimento - PAI
          </h1>
          <p className="text-gray-600">
            Preencha as preferências do seu filho/filha
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2 mb-8">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
              step >= 1 ? "bg-blue-500 text-white" : "bg-gray-300"
            }`}
          >
            1
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
              step >= 2 ? "bg-blue-500 text-white" : "bg-gray-300"
            }`}
          >
            2
          </div>
        </div>

        {/* STEP 1: Preferências */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Bloco 3 - Preferências de Seu Filho/Filha</CardTitle>
              <CardDescription>
                Essas informações ajudam o PAI a personalizar o aprendizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Filmes/Séries favoritos</label>
                <Input
                  value={favoriteMovies}
                  onChange={(e) => setFavoriteMovies(e.target.value)}
                  placeholder="Ex: Homem-Aranha, Stranger Things"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Músicas favoritas</label>
                <Input
                  value={favoriteMusic}
                  onChange={(e) => setFavoriteMusic(e.target.value)}
                  placeholder="Ex: Funk, K-pop, Sertanejo"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Esportes favoritos</label>
                <Input
                  value={favoriteSports}
                  onChange={(e) => setFavoriteSports(e.target.value)}
                  placeholder="Ex: Futebol, Skate, Natação"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Comidas favoritas</label>
                <Input
                  value={favoriteFoods}
                  onChange={(e) => setFavoriteFoods(e.target.value)}
                  placeholder="Ex: Pizza, Brigadeiro, Tacos"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Animações favoritas</label>
                <Input
                  value={favoriteAnimations}
                  onChange={(e) => setFavoriteAnimations(e.target.value)}
                  placeholder="Ex: Dragon Ball, Naruto, Ghibli"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Outros interesses</label>
                <Textarea
                  value={otherInterests}
                  onChange={(e) => setOtherInterests(e.target.value)}
                  placeholder="Outros temas, jogos, hobbies..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Temas Proibidos + LGPD */}
        {step === 2 && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Temas Proibidos</CardTitle>
                <CardDescription>
                  Escolha até 3 temas que seu filho não deve estudar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {prohibitedThemes.map((theme, idx) => (
                  <div key={idx}>
                    <label className="text-sm font-medium mb-1 block">
                      Tema Proibido {idx + 1}
                    </label>
                    <Input
                      value={theme}
                      onChange={(e) => {
                        const newThemes = [...prohibitedThemes];
                        newThemes[idx] = e.target.value;
                        setProhibitedThemes(newThemes);
                      }}
                      placeholder="Ex: Violência, Conteúdo adulto"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>LGPD - Termos de Consentimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Leia atentamente antes de aceitar.
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 p-4 rounded-lg max-h-48 overflow-y-auto text-sm space-y-2 text-gray-700">
                  <p>
                    <strong>TERMO DE CONSENTIMENTO - PAI PLATAFORMA DE APOIO INCLUSIVO</strong>
                  </p>
                  <p>
                    Eu, responsável pelo(a) menor, autorizo o uso da plataforma PAI
                    para fins educacionais. Declaro que:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Fui informado(a) sobre como a plataforma funciona
                    </li>
                    <li>
                      Autorizo o armazenamento seguro dos dados educacionais do
                      aluno
                    </li>
                    <li>
                      Autorizo o uso de IA para personalizar o aprendizado
                    </li>
                    <li>
                      Compreendo os limites de tempo diário para proteção da saúde
                    </li>
                    <li>
                      Reconheço que os dados sensíveis serão protegidos conforme LGPD
                    </li>
                  </ul>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lgpd"
                    checked={lgpdAccepted}
                    onCheckedChange={(checked) => setLgpdAccepted(checked === true)}
                  />
                  <label htmlFor="lgpd" className="text-sm cursor-pointer">
                    ✅ Eu li e aceito os termos acima
                  </label>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Botões */}
        <div className="flex gap-4 justify-end mt-8">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              disabled={isPending}
            >
              ← Voltar
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isPending || isAccepting}
          >
            {isPending || isAccepting ? "Salvando..." : step === 1 ? "Próximo →" : "Finalizar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
