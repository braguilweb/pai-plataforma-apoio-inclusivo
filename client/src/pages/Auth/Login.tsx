import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button }      from "@/components/ui/button";
import { Input }       from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Tab ativa — "admin" como padrão
  const [activeTab, setActiveTab] = useState("admin");
  const [error, setError]         = useState("");

  // Campos Admin
  const [adminIdentifier, setAdminIdentifier] = useState("");
  const [adminPassword,   setAdminPassword]   = useState("");

  // Campos Grupo 1
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Campos Grupo 2
  const [firstName, setFirstName] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // ── Mutation: Admin ───────────────────────────────────────────────────────
  const { mutate: loginAdmin, isPending: isPendingAdmin } =
    trpc.auth.loginAdmin.useMutation({
      onSuccess: async (data) => {
        try {
          await utils.auth.me.invalidate();
        } catch (err) {
          console.error("Erro ao invalidar cache:", err);
        }

        // Redireciona conforme o papel retornado pelo backend
        if (data.role === "super_admin") {
          setLocation("/super-admin/dashboard");
        } else if (data.role === "admin_school") {
          setLocation("/escola/dashboard");
        } else {
          setLocation("/");
        }
      },
      onError: (err) => setError(err.message),
    });

  // ── Mutation: Grupo 1 ─────────────────────────────────────────────────────
  const { mutate: loginGroup1, isPending: isPending1 } =
  trpc.auth.loginGroup1.useMutation({
    onSuccess: async (data) => {
      try {
        await utils.auth.me.invalidate();
      } catch (err) {
        console.error("Erro ao invalidar cache:", err);
      }
      
      // ✅ VERIFICAR PRIMEIRO ACESSO (igual ao Grupo 2)
      if (!data?.personaName || !data?.avatarStyle) {
        setLocation("/aluno/primeiro-acesso");
      } else {
        setLocation("/aluno/chat");
      }
    },
    onError: (err) => setError(err.message),
  });


  
    // ── Mutation: Grupo 2 ─────────────────────────────────────────────────────
  const { mutate: loginGroup2, isPending: isPending2 } =
    trpc.auth.loginGroup2.useMutation({
      onSuccess: async (data) => {
        // Invalidar cache para garantir dados atualizados
        try {
          await utils.auth.me.invalidate();
        } catch (err) {
          console.error("Erro ao invalidar cache:", err);
        }
        
        // Verificar se é primeiro acesso (sem persona/avatar)
        // data deve conter informações do usuário logado
        if (!data?.personaName || !data?.avatarStyle) {
          // Primeiro acesso - escolher avatar/persona
          setLocation("/aluno/primeiro-acesso");
        } else {
          // Já tem persona - ir direto para o chat
          setLocation("/aluno/chat");
        }
      },
      onError: (err) => setError(err.message),
    });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!adminIdentifier.trim() || !adminPassword.trim()) {
      setError("Usuário e senha são obrigatórios");
      return;
    }
    loginAdmin({ email: adminIdentifier, password: adminPassword });
  };

  const handleLoginGroup1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Usuário e senha são obrigatórios");
      return;
    }
    loginGroup1({ username, password });
  };

  const handleLoginGroup2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !birthDate.trim()) {
      setError("Nome e data de nascimento são obrigatórios");
      return;
    }
    loginGroup2({ firstName, birthDate });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100
                    flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">

        <CardHeader className="bg-blue-500 text-white rounded-t-lg">
          <CardTitle className="text-2xl">PAI 💙</CardTitle>
          <CardDescription className="text-blue-100">
            Plataforma de Apoio Inclusivo
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(v) => { setActiveTab(v); setError(""); }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="grupo1">Lê/Escreve</TabsTrigger>
              <TabsTrigger value="grupo2">Não Lê</TabsTrigger>
            </TabsList>

            {/* Aba Admin */}
            <TabsContent value="admin">
              <form onSubmit={handleLoginAdmin} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Login  Super-Admin
                  </label>
                  <Input
                    type="text"
                    placeholder="ex: nome do usuário"
                    value={adminIdentifier}
                    onChange={(e) => setAdminIdentifier(e.target.value)}
                    disabled={isPendingAdmin}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    disabled={isPendingAdmin}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-500"
                  disabled={isPendingAdmin}
                >
                  {isPendingAdmin ? "Entrando..." : "Entrar como Admin"}
                </Button>
              </form>
            </TabsContent>

            {/* Aba Grupo 1 */}
            <TabsContent value="grupo1">
              <form onSubmit={handleLoginGroup1} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário</label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isPending1}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending1}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-500"
                  disabled={isPending1}
                >
                  {isPending1 ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            {/* Aba Grupo 2 */}
            <TabsContent value="grupo2">
              <form onSubmit={handleLoginGroup2} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seu Nome</label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isPending2}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Data de Nascimento
                  </label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    disabled={isPending2}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-500"
                  disabled={isPending2}
                >
                  {isPending2 ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}