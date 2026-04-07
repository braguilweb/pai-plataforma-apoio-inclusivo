import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast as sonnerToast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Indicador de steps
// ─────────────────────────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ["Preferências", "Consentimento", "Criar Senha"];

  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const stepNum = i + 1;
        const isCompleted = current > stepNum;
        const isActive = current === stepNum;

        return (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                ${isCompleted ? "bg-green-500 text-white" :
                  isActive ? "bg-indigo-600 text-white" :
                  "bg-gray-200 text-gray-400"}
              `}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-indigo-600" : "text-gray-400"}`}>
                {labels[i]}
              </span>
            </div>

            {i < total - 1 && (
              <div className={`h-0.5 w-12 mb-4 transition-all ${current > stepNum ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tela de sucesso final
// ─────────────────────────────────────────────────────────────────────────────
function SuccessScreen({ studentName }: { studentName: string }) {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown === 0) {
      // ✅ Redireciona para login já na aba estudante
      setLocation("/login?tab=student");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Cadastro Concluído! 🎉
          </h1>
          <p className="text-gray-600">
            O cadastro de <strong>{studentName}</strong> está completo.
          </p>
        </div>

        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 space-y-1">
          <p>✅ Preferências salvas</p>
          <p>✅ Termos LGPD aceitos</p>
          <p>✅ Senha criada com sucesso</p>
        </div>

        {/* Contador regressivo */}
        <div className="space-y-3">
          <div className="relative w-16 h-16 mx-auto">
            {/* Círculo de progresso SVG */}
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke="#E0E7FF"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="3"
                strokeDasharray="100"
                strokeDashoffset={100 - (countdown / 10) * 100}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-indigo-600">
              {countdown}
            </span>
          </div>

          <p className="text-sm text-gray-500">
            Redirecionando para o login em{" "}
            <strong className="text-indigo-600">{countdown}</strong>{" "}
            {countdown === 1 ? "segundo" : "segundos"}...
          </p>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setLocation("/login?tab=student")}
          >
            Ir para o login agora →
          </Button>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function AcceptanceLink() {
  const [, params] = useRoute("/aceite/:token");
  const token = params && "token" in params ? params.token : undefined;

  const [step, setStep] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const [studentName, setStudentName] = useState("");

  // Step 1 — Preferências
  const [favoriteMovies, setFavoriteMovies] = useState("");
  const [favoriteMusic, setFavoriteMusic] = useState("");
  const [favoriteSports, setFavoriteSports] = useState("");
  const [favoriteFoods, setFavoriteFoods] = useState("");
  const [favoriteAnimations, setFavoriteAnimations] = useState("");
  const [otherInterests, setOtherInterests] = useState("");
  const [prohibitedThemes, setProhibitedThemes] = useState(["", "", ""]);

  // Step 2 — LGPD
  const [lgpdAccepted, setLgpdAccepted] = useState(false);

  // Step 3 — Senha
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── Queries & Mutations ───────────────────────────────────────────────────
 const { data: tokenInfo, isLoading: isLoadingToken, error: tokenError } =
  trpc.students.resolveAcceptanceToken.useQuery(
    { token: token || "" },
    { enabled: Boolean(token) }
  );

  // Logo abaixo do useQuery, adicione:
  useEffect(() => {
  if (tokenInfo?.studentName) {
    setStudentName(tokenInfo.studentName);
  }
  }, [tokenInfo]);

  const { mutate: fillBlock3, isPending: isSavingPrefs } =
    trpc.students.fillBlock3.useMutation({
      onSuccess: () => setStep(2),
      onError: (e: any) => sonnerToast.error("Erro ao salvar preferências", { description: e.message }),
    });

  const { mutate: acceptLGPD, isPending: isAccepting } =
    trpc.students.acceptLGPD.useMutation({
      onSuccess: () => setStep(3),
      onError: (e: any) => sonnerToast.error("Erro ao aceitar termos", { description: e.message }),
    });

  const { mutate: setStudentPassword, isPending: isSavingPassword } =
    trpc.students.setStudentPassword.useMutation({
      onSuccess: () => setIsFinished(true),
      onError: (e: any) => sonnerToast.error("Erro ao criar senha", { description: e.message }),
    });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStep1 = () => {
    if (!token) return;
    fillBlock3({
      token,
      favoriteMovies,
      favoriteMusic,
      favoriteSports,
      favoriteFoods,
      favoriteAnimations,
      otherInterests,
      prohibitedThemes: prohibitedThemes.map((t) => t.trim() || "—"),
    });
  };

  const handleStep2 = () => {
    if (!token) return;
    if (!lgpdAccepted) {
      sonnerToast.error("Você deve aceitar os termos LGPD para continuar.");
      return;
    }
    acceptLGPD({ token, agreementToken: true });
  };

  const handleStep3 = () => {
    if (!token) return;
    if (password.length < 6) {
      sonnerToast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== passwordConfirm) {
      sonnerToast.error("As senhas não coincidem.");
      return;
    }
    setStudentPassword({ token, password });
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Link inválido.</p>
        </div>
      </div>
    );
  }

  if (isLoadingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-gray-400">
        <RefreshCw className="animate-spin w-5 h-5" />
        Validando link...
      </div>
    );
  }

  if (tokenError || !tokenInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="font-bold text-gray-800 mb-2">Link inválido ou expirado</h2>
          <p className="text-gray-500 text-sm">
            {(tokenError as any)?.message || "Não foi possível validar este link."}
          </p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return <SuccessScreen studentName={studentName} />;
  }

  const isPending = isSavingPrefs || isAccepting || isSavingPassword;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* Header */}
      <div className="bg-indigo-700 text-white p-6 shadow-md">
        <div className="max-w-2xl mx-auto">
          <p className="text-indigo-300 text-sm mb-1">Plataforma PAI</p>
          <h1 className="text-2xl font-bold tracking-tight">
            Formulário de Consentimento
          </h1>
          {studentName && (
            <p className="text-indigo-200 text-sm mt-1">
              Aluno(a): <strong>{studentName}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-8">

        <StepIndicator current={step} total={3} />

        {/* ── STEP 1: Preferências ─────────────────────────────────────────── */}
        {step === 1 && (
          <Card className="border-indigo-50">
            <CardHeader>
              <CardTitle className="text-indigo-800">
                📚 Preferências do Aluno(a)
              </CardTitle>
              <CardDescription>
                Essas informações ajudam a personalizar o aprendizado na PAI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "🎬 Filmes / Séries favoritos", value: favoriteMovies, set: setFavoriteMovies, placeholder: "Ex: Homem-Aranha, Stranger Things" },
                { label: "🎵 Músicas favoritas", value: favoriteMusic, set: setFavoriteMusic, placeholder: "Ex: Funk, K-pop, Sertanejo" },
                { label: "⚽ Esportes favoritos", value: favoriteSports, set: setFavoriteSports, placeholder: "Ex: Futebol, Skate, Natação" },
                { label: "🍕 Comidas favoritas", value: favoriteFoods, set: setFavoriteFoods, placeholder: "Ex: Pizza, Brigadeiro, Tacos" },
                { label: "🎨 Animações favoritas", value: favoriteAnimations, set: setFavoriteAnimations, placeholder: "Ex: Dragon Ball, Naruto, Ghibli" },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
                  <Input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
                </div>
              ))}

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">💡 Outros interesses</label>
                <Textarea
                  value={otherInterests}
                  onChange={(e) => setOtherInterests(e.target.value)}
                  placeholder="Outros temas, jogos, hobbies..."
                  rows={3}
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">🚫 Temas que prefere evitar (até 3)</p>
                <div className="space-y-2">
                  {prohibitedThemes.map((theme, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                      <Input
                        value={theme}
                        onChange={(e) => {
                          const next = [...prohibitedThemes];
                          next[idx] = e.target.value;
                          setProhibitedThemes(next);
                        }}
                        placeholder={`Ex: Violência, Conteúdo adulto`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: LGPD ─────────────────────────────────────────────────── */}
        {step === 2 && (
          <Card className="border-indigo-50">
            <CardHeader>
              <CardTitle className="text-indigo-800">📋 Termos de Consentimento (LGPD)</CardTitle>
              <CardDescription>Leia com atenção antes de aceitar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Leia atentamente antes de aceitar.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-xl max-h-52 overflow-y-auto text-sm space-y-2 text-gray-700 border border-gray-100">
                <p><strong>TERMO DE CONSENTIMENTO — PAI PLATAFORMA DE APOIO INCLUSIVO</strong></p>
                <p>Eu, responsável pelo(a) menor, autorizo o uso da plataforma PAI para fins educacionais. Declaro que:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Fui informado(a) sobre como a plataforma funciona</li>
                  <li>Autorizo o armazenamento seguro dos dados educacionais do aluno</li>
                  <li>Autorizo o uso de IA para personalizar o aprendizado</li>
                  <li>Compreendo os limites de tempo diário para proteção da saúde</li>
                  <li>Reconheço que os dados sensíveis serão protegidos conforme LGPD</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <Checkbox
                  id="lgpd"
                  checked={lgpdAccepted}
                  onCheckedChange={(v) => setLgpdAccepted(v === true)}
                />
                <label htmlFor="lgpd" className="text-sm cursor-pointer font-medium text-indigo-800">
                  ✅ Li e aceito os termos acima
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: Criar Senha ───────────────────────────────────────────── */}
        {step === 3 && (
          <Card className="border-indigo-50">
            <CardHeader>
              <CardTitle className="text-indigo-800">🔑 Criar Senha de Acesso</CardTitle>
              <CardDescription>
                Esta será a senha usada pelo(a) {studentName || "aluno(a)"} para entrar na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
                ✅ Consentimento LGPD registrado com sucesso!
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && password.length < 6 && (
                  <p className="text-xs text-red-500 mt-1">Senha muito curta (mínimo 6 caracteres)</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Confirmar Senha
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repita a senha"
                />
                {passwordConfirm.length > 0 && password !== passwordConfirm && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
              </div>

            </CardContent>
          </Card>
        )}

        {/* ── Botões de navegação ───────────────────────────────────────────── */}
        <div className="flex gap-4 justify-end mt-6">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} disabled={isPending}>
              ← Voltar
            </Button>
          )}

          {step === 1 && (
            <Button
              onClick={handleStep1}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              disabled={isPending}
            >
              {isSavingPrefs ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</> : "Próximo →"}
            </Button>
          )}

          {step === 2 && (
            <Button
              onClick={handleStep2}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              disabled={isPending || !lgpdAccepted}
            >
              {isAccepting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Registrando...</> : "Aceitar e Continuar →"}
            </Button>
          )}

          {step === 3 && (
            <Button
              onClick={handleStep3}
              className="bg-green-600 hover:bg-green-700 gap-2"
              disabled={isPending || password.length < 6 || password !== passwordConfirm}
            >
              {isSavingPassword ? <><RefreshCw className="w-4 h-4 animate-spin" /> Criando senha...</> : "✅ Finalizar Cadastro"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}