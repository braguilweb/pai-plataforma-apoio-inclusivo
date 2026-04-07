import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";


// ============================================================================
// PÁGINAS PÚBLICAS
// Acessíveis sem autenticação
// ============================================================================
import Login from "./pages/Auth/Login";
import Home from "./pages/Home";

/**
 * NOVO: Página de definição de senha para o administrador da escola.
 * Acessada via link enviado por e-mail com token de ativação.
 * Rota: /set-password?token=<token>
 */
import SetPassword from "./pages/Auth/SetPassword";

// ============================================================================
// PÁGINAS — SUPER ADMIN
// Acesso restrito ao papel "super_admin"
// ============================================================================
import SuperAdminDashboard   from "./pages/SuperAdmin/Dashboard";
import SuperAdminSchools     from "./pages/SuperAdmin/Schools";
import SuperAdminSchoolsNew  from "./pages/SuperAdmin/SchoolsNew";
import SuperAdminAvatars     from "./pages/SuperAdmin/Avatars";
import SuperAdminMonitoring  from "./pages/SuperAdmin/Monitoring";
import SuperAdminMaintenance from "./pages/SuperAdmin/Maintenance";

// ============================================================================
// PÁGINAS — ADMIN DA ESCOLA
// Acesso restrito ao papel "admin_school"
// ============================================================================
import SchoolDashboard     from "./pages/School/Dashboard";
import SchoolConfiguration from "./pages/School/Configuration";
import SchoolTeachers      from "./pages/School/Teachers";
import SchoolTeachersNew   from "./pages/School/TeachersNew";
import SchoolStudents      from "./pages/School/Students";
import SchoolStudentsNew   from "./pages/School/StudentsNew";
import SchoolStudentDetail from "./pages/School/StudentDetail";
import SchoolAlerts        from "./pages/School/Alerts";

// ============================================================================
// PÁGINAS — PROFESSOR
// Acesso restrito ao papel "teacher"
// ============================================================================
import TeacherDashboard     from "./pages/Teacher/Dashboard";
import TeacherStudents      from "./pages/Teacher/Students";
import TeacherStudentDetail from "./pages/Teacher/StudentDetail";
import TeacherNotifications from "./pages/Teacher/Notifications";

// ============================================================================
// PÁGINAS — ALUNO
// Acesso restrito ao papel "student"
// ============================================================================
import StudentChat        from "./pages/Student/Chat";
import StudentFirstAccess from "./pages/Student/FirstAccess";

// ============================================================================
// PÁGINAS — ACEITE LGPD
// Pública: acessada via link enviado ao responsável por e-mail
// ============================================================================
import AcceptanceLink from "./pages/Acceptance/AcceptanceLink";

// ============================================================================
// COMPONENTE: LoadingPage
// Exibido enquanto o estado de autenticação ainda está sendo carregado.
// Evita flash de conteúdo protegido ou redirecionamento prematuro.
// ============================================================================
function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Skeleton className="w-96 h-96" />
    </div>
  );
}

// ============================================================================
// COMPONENTE: ProtectedRoute
// Wrapper que protege rotas exigindo autenticação e papel específico.
//
// Comportamento:
//  - Sem usuário logado  → redireciona para /login
//  - Papel não permitido → exibe página 404 (NotFound)
//  - Papel permitido     → renderiza o componente normalmente
// ============================================================================
interface ProtectedRouteProps {
  component:    React.ComponentType<any>;
  allowedRoles: string[];
}

// No ProtectedRoute, dentro do seu App.tsx
function ProtectedRoute({ component: Component, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingPage />;
  if (!user) return <Redirect to="/login" />;
  if (!allowedRoles.includes(user.role)) return <NotFound />;

  // Se for aluno, verifica se ele tem personaName ou avatarStyle (o que indica que ele já passou pelo primeiro acesso)
  // Como o 'user' é o objeto base, se você tiver acesso ao perfil do estudante aqui, verifique-o:
  const userData = user as any;

if (
  user.role === "student" &&
  userData.firstAccessCompleted === false &&
  window.location.pathname !== "/aluno/primeiro-acesso"
) {
  return <Redirect to="/aluno/primeiro-acesso" />;
}

  return <Component />;
}

// ============================================================================
// COMPONENTE: Router
// Define todas as rotas da aplicação organizadas por perfil de acesso.
//
// Estrutura:
//  1. Rotas Públicas  — sem autenticação
//  2. Super Admin     — papel: super_admin
//  3. Admin da Escola — papel: admin_school
//  4. Professor       — papel: teacher
//  5. Aluno           — papel: student
//  6. Fallback        — rota não encontrada (404)
// ============================================================================
function Router() {
  return (
    <Switch>

      {/* ================================================================== */}
      {/* ROTAS PÚBLICAS                                                      */}
      {/* Acessíveis sem autenticação — não usar ProtectedRoute aqui         */}
      {/* ================================================================== */}

      {/* Página inicial / landing */}
      <Route path="/" component={Home} />

      {/* Tela de login unificada */}
      <Route path="/login" component={Login} />

      {/* 
        NOVO: Ativação de conta do admin da escola.
        
        O admin recebe um e-mail com o link:
          https://dominio.com/set-password?token=<token_64_chars>
        
        Esta rota é pública pois o admin ainda não tem conta ativa
        e não pode estar autenticado ao acessá-la.
        O token na query string é validado pelo backend (activateAdminAccount).
      */}
      <Route path="/set-password" component={SetPassword} />

      {/* Aceite de termos LGPD pelo responsável do aluno */}
      <Route path="/aceite/:token" component={AcceptanceLink} />

      {/* Página de manutenção (acessível publicamente para avisos) */}
      <Route path="/manutencao" component={SuperAdminMaintenance} />

      {/* ================================================================== */}
      {/* ROTAS — SUPER ADMIN                                                 */}
      {/* Papel exigido: "super_admin"                                        */}
      {/* ================================================================== */}

      {/* Painel principal do super admin */}
      <Route path="/super-admin/dashboard" component={() => (
        <ProtectedRoute
          component={SuperAdminDashboard}
          allowedRoles={["super_admin"]}
        />
      )} />

      {/* Listagem de escolas cadastradas */}
      <Route path="/super-admin/escolas" component={() => (
        <ProtectedRoute
          component={SuperAdminSchools}
          allowedRoles={["super_admin"]}
        />
      )} />

      {/* Formulário de cadastro de nova escola */}
      <Route path="/super-admin/escolas/nova" component={() => (
        <ProtectedRoute
          component={SuperAdminSchoolsNew}
          allowedRoles={["super_admin"]}
        />
      )} />

      {/* Gerenciamento de avatares disponíveis */}
      <Route path="/super-admin/avatares" component={() => (
        <ProtectedRoute
          component={SuperAdminAvatars}
          allowedRoles={["super_admin"]}
        />
      )} />

      {/* Monitoramento geral da plataforma */}
      <Route path="/super-admin/monitoramento" component={() => (
        <ProtectedRoute
          component={SuperAdminMonitoring}
          allowedRoles={["super_admin"]}
        />
      )} />

      {/* ================================================================== */}
      {/* ROTAS — ADMIN DA ESCOLA                                             */}
      {/* Papel exigido: "admin_school"                                       */}
      {/* ================================================================== */}

      {/* Painel principal da escola */}
      <Route path="/escola/dashboard" component={() => (
        <ProtectedRoute
          component={SchoolDashboard}
          allowedRoles={["admin_school"]}
        />
      )} />

      {/* Configurações gerais da escola (logo, cores, etc.) */}
      <Route path="/escola/configuracoes" component={() => (
        <ProtectedRoute
          component={SchoolConfiguration}
          allowedRoles={["admin_school"]}
        />
      )} />

      {/* Listagem de professores */}
      <Route path="/escola/professores" component={() => (
        <ProtectedRoute
          component={SchoolTeachers}
          allowedRoles={["admin_school"]}
        />
      )} />

      {/* Formulário de cadastro de novo professor */}
      <Route path="/escola/professores/novo" component={() => (
        <ProtectedRoute
          component={SchoolTeachersNew}
          allowedRoles={["admin_school"]}
        />
      )} />

      {/* Listagem de alunos da escola */}
      <Route path="/escola/alunos" component={() => (
        <ProtectedRoute
          component={SchoolStudents}
          allowedRoles={["admin_school"]}
        />
      )} />

      {/* Formulário de cadastro de novo aluno */}
      <Route path="/escola/alunos/novo" component={() => (
        <ProtectedRoute
          component={SchoolStudentsNew}
          allowedRoles={["admin_school"]}
        />
      )} />

      {/* Detalhes e anamnese de um aluno específico */}
      <Route path="/escola/alunos/:id" component={() => (
        <ProtectedRoute
          component={SchoolStudentDetail}
          allowedRoles={["admin_school"]}
        />
      )} />

      {/* Alertas de moderação da escola */}
      <Route path="/escola/alertas" component={() => (
        <ProtectedRoute
          component={SchoolAlerts}
          allowedRoles={["admin_school"]}
        />
      )} />

      {/* ================================================================== */}
      {/* ROTAS — PROFESSOR                                                   */}
      {/* Papel exigido: "teacher"                                            */}
      {/* ================================================================== */}

      {/* Painel principal do professor */}
      <Route path="/professor/dashboard" component={() => (
        <ProtectedRoute
          component={TeacherDashboard}
          allowedRoles={["teacher"]}
        />
      )} />

      {/* Listagem de alunos do professor */}
      <Route path="/professor/alunos" component={() => (
        <ProtectedRoute
          component={TeacherStudents}
          allowedRoles={["teacher"]}
        />
      )} />

      {/* Detalhes de um aluno específico (visão do professor) */}
      <Route path="/professor/alunos/:id" component={() => (
        <ProtectedRoute
          component={TeacherStudentDetail}
          allowedRoles={["teacher"]}
        />
      )} />

      {/* Central de notificações do professor */}
      <Route path="/professor/notificacoes" component={() => (
        <ProtectedRoute
          component={TeacherNotifications}
          allowedRoles={["teacher"]}
        />
      )} />

      {/* ================================================================== */}
      {/* ROTAS — ALUNO                                                       */}
      {/* Papel exigido: "student"                                            */}
      {/* ================================================================== */}

      {/* Tela de primeiro acesso do aluno (escolha de avatar, etc.) */}
      <Route path="/aluno/primeiro-acesso" component={() => (
        <ProtectedRoute
          component={StudentFirstAccess}
          allowedRoles={["student"]}
        />
      )} />

      {/* Chat principal do aluno com a IA */}
      <Route path="/aluno/chat" component={() => (
        <ProtectedRoute
          component={StudentChat}
          allowedRoles={["student"]}
        />
      )} />

      {/* ================================================================== */}
      {/* FALLBACK — Rota não encontrada                                      */}
      {/* Deve ser sempre a última rota do Switch                             */}
      {/* ================================================================== */}
      <Route component={NotFound} />

    </Switch>
  );
}

// ============================================================================
// COMPONENTE: App
// Raiz da aplicação. Envolve tudo com os providers globais:
//  - ErrorBoundary:  captura erros de renderização sem quebrar a aplicação
//  - ThemeProvider:  gerencia o tema claro/escuro
//  - TooltipProvider: habilita tooltips em toda a árvore de componentes
//  - Toaster:        sistema de notificações toast (sonner)
// ============================================================================
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          {/* Sistema de notificações toast global */}
          <Toaster />

          {/* Roteamento principal da aplicação */}
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;