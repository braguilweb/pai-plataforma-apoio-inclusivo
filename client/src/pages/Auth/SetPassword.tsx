import { useEffect, useState } from "react";
import { useLocation } from "wouter"; 
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// ============================================================================
// SCHEMA DE VALIDAÇÃO (Sincronizado com o Backend)
// ============================================================================
const schema = z
  .object({
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
      .regex(/[0-9]/, "Deve conter ao menos um número"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

/**
 * COMPONENTE PRINCIPAL: SetPassword
 * Responsável por permitir que o admin defina sua senha inicial via token.
 */
export default function SetPassword() {
  // 1. Obter o token da URL
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [, setLocation] = useLocation();

  // Estados de UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [successData, setSuccessData] = useState<{ email: string; name: string } | null>(null);

  // 2. Setup do Formulário
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // 3. Mutação de Ativação
  const activate = trpc.auth.activateAdminAccount.useMutation({
    onSuccess: (data) => {
      setSuccessData({ email: data.email || "", name: data.name || "Administrador" });
    },
  });

  // 4. Efeito de redirecionamento após sucesso
  useEffect(() => {
    if (!successData) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation(`/login?email=${encodeURIComponent(successData.email)}`);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [successData, setLocation]);

  const onSubmit = (data: FormData) => {
    if (!token) return;
    activate.mutate({
      token,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
  };

  // --- TELA DE ERRO (Token Ausente) ---
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-100 shadow-lg">
          <CardContent className="pt-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Link Inválido</h2>
            <p className="text-gray-500 text-sm">Este link de ativação está incompleto ou expirou. Por favor, verifique seu e-mail.</p>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/login")}>Ir para o Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- TELA DE SUCESSO ---
  if (successData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-green-100 shadow-xl">
          <CardContent className="pt-10 text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Conta Ativada!</h2>
            <p className="text-gray-600">Olá <strong>{successData.name}</strong>, sua senha foi definida com sucesso.</p>
            <div className="py-4 px-6 bg-gray-50 rounded-lg inline-block text-sm text-gray-500">
              Redirecionando para o login em <span className="font-bold text-indigo-600 text-lg">{countdown}s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- FORMULÁRIO PRINCIPAL ---
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-none">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-2 shadow-indigo-200 shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Definir Senha</CardTitle>
          <CardDescription>Crie sua senha de acesso à Plataforma PAI</CardDescription>
        </CardHeader>
        <CardContent>
          {activate.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{activate.error.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Nova Senha</label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Mínimo 8 caracteres, A-Z, 0-9"
                  className={errors.password ? "border-red-400" : ""}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-500 font-medium">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Confirmar Senha</label>
              <div className="relative">
                <Input 
                  type={showConfirm ? "text" : "password"}
                  {...register("confirmPassword")}
                  placeholder="Repita a senha"
                  className={errors.confirmPassword ? "border-red-400" : ""}
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-[10px] text-red-500 font-medium">{errors.confirmPassword.message}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 text-md shadow-lg shadow-indigo-100"
              disabled={activate.isPending}
            >
              {activate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ativando Conta...
                </>
              ) : (
                "Ativar Minha Conta"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
