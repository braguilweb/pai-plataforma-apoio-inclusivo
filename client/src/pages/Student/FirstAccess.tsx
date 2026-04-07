import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";
import { Loader2, User, Sparkles, Check, Bot, Star } from "lucide-react";

const avatarStyles = [
  { 
    id: "manga", 
    name: "Manga", 
    description: "Estilo anime japonês",
    icon: "👾",
    color: "bg-pink-50 border-pink-200 hover:bg-pink-100"
  },
  { 
    id: "pixar", 
    name: "Pixar", 
    description: "Estilo 3D realista",
    icon: "🎬",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100"
  },
  { 
    id: "android", 
    name: "Android", 
    description: "Estilo robótico/futurista",
    icon: "🤖",
    color: "bg-green-50 border-green-200 hover:bg-green-100"
  },
];

type PersonaOption =
  | "Guilherme"
  | "Professor Guilherme"
  | "Tio Gui"
  | "Tio Guilherme"
  | "Gui";

const personaOptions: PersonaOption[] = [
  "Guilherme",
  "Professor Guilherme",
  "Tio Gui",
  "Tio Guilherme",
  "Gui",
];

export default function StudentFirstAccess() {
  const [, setLocation] = useLocation();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [personaName, setPersonaName] = useState<PersonaOption | null>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutate: savePersona, isPending } = trpc.students.savePersona.useMutation({
    onSuccess: () => {
      sonnerToast.success("Persona criada com sucesso!", {
        description: "Redirecionando para o chat...",
      });
      setTimeout(() => {
        setLocation("/aluno/chat");
      }, 1500);
    },
    onError: (error: { message: string }) => {
      setIsSubmitting(false);
      sonnerToast.error("Erro ao salvar persona", {
        description: error.message,
      });
    },
  });

  // ✅ FUNÇÃO MANTIDA
  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
  };

  // ✅ FUNÇÃO MANTIDA
  const handleNext = () => {
    if (!selectedStyle) {
      sonnerToast.error("Escolha um estilo de avatar");
      return;
    }
    setStep(2);
  };

  // ✅ FUNÇÃO CORRIGIDA
  const handleSubmit = () => {
    // Previne múltiplos cliques
    if (isSubmitting || isPending) return;

    if (personaName === null) {
      sonnerToast.error("Escolha um nome para o assistente");
      return;
    }

    if (!selectedStyle) {
      sonnerToast.error("Escolha um estilo de avatar");
      return;
    }

    setIsSubmitting(true);

    savePersona({
      personaName,
      avatarStyle: selectedStyle as "manga" | "pixar" | "android",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-indigo-700 text-white p-6 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Primeiro Acesso</h1>
              <p className="text-indigo-200 text-sm">Personalize sua experiência na plataforma</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30">
            Passo {step} de 2
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Progresso visual */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2 bg-white p-2 rounded-full shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              step >= 1 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {step > 1 ? <Check className="w-5 h-5" /> : "1"}
            </div>
            <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full bg-indigo-600 transition-all duration-300 ${step >= 2 ? "w-full" : "w-0"}`} />
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              step >= 2 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              2
            </div>
          </div>
        </div>

        {step === 1 && (
          <Card className="shadow-lg border-indigo-50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                <Bot className="w-8 h-8 text-indigo-600" />
              </div>
              <CardTitle className="text-xl text-indigo-900">Escolha seu Avatar</CardTitle>
              <CardDescription className="text-gray-500">
                Como você quer ser representado na plataforma?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {avatarStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleSelect(style.id)}
                    className={`p-6 rounded-xl border-2 transition-all text-center group ${
                      selectedStyle === style.id
                        ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2"
                        : `${style.color} border-transparent hover:shadow-md`
                    }`}
                  >
                    <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                      {style.icon}
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">{style.name}</h3>
                    <p className="text-xs text-gray-600">{style.description}</p>
                    
                    {selectedStyle === style.id && (
                      <Badge className="mt-3 bg-indigo-600 text-white border-0">
                        <Check className="w-3 h-3 mr-1" /> Selecionado
                      </Badge>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button
                  onClick={handleNext}
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                  disabled={!selectedStyle}
                >
                  Próximo <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="shadow-lg border-indigo-50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                <User className="w-8 h-8 text-indigo-600" />
              </div>
              <CardTitle className="text-xl text-indigo-900">Nomeie sua Persona</CardTitle>
              <CardDescription className="text-gray-500">
                Como você quer ser chamado durante os estudos?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview do avatar selecionado */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-4xl">
                  {avatarStyles.find(s => s.id === selectedStyle)?.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estilo selecionado</p>
                  <p className="font-semibold text-gray-800">
                    {avatarStyles.find(s => s.id === selectedStyle)?.name}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep(1)}
                  className="ml-auto text-indigo-600"
                >
                  Trocar
                </Button>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Star className="w-4 h-4 text-indigo-500" />
                  Escolha o nome do seu assistente *
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {personaOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPersonaName(option)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        personaName === option
                          ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{option}</span>
                        {personaName === option && (
                          <Check className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-500">
                  Escolha como você quer chamar seu assistente durante os estudos.
                </p>
              </div>

              <div className="flex gap-4 justify-between pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="gap-2"
                >
                  ← Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                  disabled={isPending || personaName === null || isSubmitting}
                >
                  {isPending || isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      Começar a Estudar! <Check className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}