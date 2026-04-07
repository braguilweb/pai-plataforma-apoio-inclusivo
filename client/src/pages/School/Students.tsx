import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast as sonnerToast } from "sonner";
import {
  RefreshCw, Pencil, Trash2, GraduationCap,
  User, KeyRound, ShieldCheck, ShieldAlert,
  BookOpen, PenLine, MessageSquare, X, Phone, Mail,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
type StudentWithStatus = {
  id: number;
  userId: number;
  series: string;
  fullName: string | null;
  status: string;
  isActive: boolean;
  isPending: boolean;
  guardianName: string | null | undefined;
  guardianEmail: string | null | undefined;
  activationLink: string | null;
  loginUsername?: string | null;
  lgpdAccepted?: boolean;
  lgpdAcceptedAt?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal de DETALHES do aluno
// ─────────────────────────────────────────────────────────────────────────────
function StudentDetailModal({
  studentId,
  onClose,
}: {
  studentId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.schools.getStudentWithAnamnesis.useQuery(
    { studentId: studentId! },
    { enabled: studentId !== null }
  );

  const { data: messages, isLoading: loadingMessages } =
    trpc.schools.getStudentRecentMessages.useQuery(
      { studentId: studentId! },
      { enabled: studentId !== null }
    );

  const recentMessages = (messages || []).slice(0, 5);

  return (
    <Dialog open={studentId !== null} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
            {isLoading ? "Carregando..." : (data?.student ? `Aluno #${data.student.id}` : "Detalhes do Aluno")}
          </DialogTitle>
          <DialogDescription>
            Informações completas e histórico de interações
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <RefreshCw className="animate-spin w-4 h-4" />
            Carregando dados do aluno...
          </div>
        ) : data ? (
          <div className="space-y-4 pt-2">

            {/* Dados Gerais */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Dados Gerais
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 p-3 bg-white border border-indigo-100 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Série
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {data.student?.series?.replace("_", " ") || "—"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-white border border-indigo-100 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Responsável
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {data.anamnesis?.guardianName || "—"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-white border border-indigo-100 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      E-mail responsável
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {data.anamnesis?.guardianContactEmail || "—"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-white border border-indigo-100 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      WhatsApp
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {data.anamnesis?.guardianContactWhatsapp || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Níveis de Aprendizado */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Níveis de Aprendizado
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 p-3 bg-white border border-gray-100 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Leitura
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {data.anamnesis?.readingLevel || "—"}
                  </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-white border border-gray-100 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <PenLine className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Escrita
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {data.anamnesis?.writingLevel || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Últimas Interações */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Últimas Interações
                </span>
                <Badge variant="outline" className="text-indigo-600 border-indigo-200 text-xs">
                  {recentMessages.length} registros
                </Badge>
              </div>

              {loadingMessages ? (
                <div className="flex items-center gap-2 text-gray-400 py-2">
                  <RefreshCw className="animate-spin w-3 h-3" />
                  <span className="text-xs">Carregando...</span>
                </div>
              ) : recentMessages.length > 0 ? (
                <div className="space-y-2">
                  {recentMessages.map((m: any) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg"
                    >
                      <div className="p-1.5 bg-indigo-100 rounded-lg shrink-0">
                        <MessageSquare className="w-3 h-3 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700">{m.messageType}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{m.contentType}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center bg-white rounded-xl border border-dashed border-gray-200">
                  <MessageSquare className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Nenhuma interação registrada.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" /> Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de confirmação de exclusão
// ─────────────────────────────────────────────────────────────────────────────
function DeleteStudentModal({
  isOpen,
  onClose,
  student,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  student: StudentWithStatus | null;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="w-5 h-5" />
            Remover Aluno
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Tem certeza que deseja remover{" "}
            <strong>"{student.fullName || `Aluno #${student.id}`}"</strong>?
            <span className="text-red-500 text-xs mt-1 block">
              Esta ação é irreversível. Todos os dados, mensagens e histórico
              serão removidos permanentemente.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 px-3 bg-red-50 border border-red-100 rounded-lg space-y-1 text-sm text-gray-700">
          <p><span className="font-semibold">Nome:</span> {student.fullName || "—"}</p>
          <p><span className="font-semibold">Série:</span> {student.series?.replace("_", " ") || "—"}</p>
          {student.guardianName && (
            <p><span className="font-semibold">Responsável:</span> {student.guardianName}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Removendo...</>
            ) : (
              <><Trash2 className="w-4 h-4" /> Confirmar Remoção</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card individual do aluno
// ─────────────────────────────────────────────────────────────────────────────
function StudentCard({
  student,
  onViewClick,
  onDeleteClick,
}: {
  student: StudentWithStatus;
  onViewClick: (id: number) => void;
  onDeleteClick: (s: StudentWithStatus) => void;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
            <CardTitle className="text-base truncate">
              {student.fullName || `Aluno #${student.id}`}
            </CardTitle>
          </div>

          {student.lgpdAccepted ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 shrink-0">
              <ShieldCheck className="w-3 h-3" /> LGPD Aceito
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 shrink-0">
              <ShieldAlert className="w-3 h-3" /> LGPD Pendente
            </Badge>
          )}
        </div>

        <CardDescription className="text-xs text-gray-400 pl-10">
          {student.lgpdAccepted && student.lgpdAcceptedAt
            ? `Aceito em ${new Date(student.lgpdAcceptedAt).toLocaleDateString("pt-BR")}`
            : "Aguardando aceite dos responsáveis"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1 p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Série
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-800">
              {student.series?.replace("_", " ") || "—"}
            </span>
          </div>

          <div className="flex flex-col gap-1 p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Login
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-800 truncate">
              {student.loginUsername || "—"}
            </span>
          </div>
        </div>

        <div>
          {student.isPending && (
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">
              ⏳ Aguardando ativação
            </Badge>
          )}
          {student.isActive && (
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
              ✅ Ativo
            </Badge>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => onViewClick(student.id)}
          >
            <Pencil className="w-4 h-4" /> Ver Detalhes
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(student);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────
export default function SchoolStudents() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null); // ← modal detalhe
  const [studentToDelete, setStudentToDelete] = useState<StudentWithStatus | null>(null);
  const utils = trpc.useUtils();

  const { data: students, isLoading } = trpc.schools.listStudentsWithStatus.useQuery();

  const removeStudent = trpc.schools.removeStudent.useMutation({
    onSuccess: () => {
      utils.schools.listStudentsWithStatus.invalidate();
      sonnerToast.success("Aluno removido com sucesso!");
      setStudentToDelete(null);
    },
    onError: (e) =>
      sonnerToast.error("Erro ao remover aluno", { description: e.message }),
  });

  const filtered = (students as StudentWithStatus[] || []).filter((s) =>
    (s.fullName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = filtered.filter((s) => s.isActive).length;
  const pendingCount = filtered.filter((s) => s.isPending).length;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-500">
        <RefreshCw className="animate-spin w-4 h-4" />
        Carregando alunos...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* Header */}
      <div className="bg-indigo-700 text-white p-6 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Alunos</h1>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setLocation("/escola/dashboard")}>
              Painel Geral
            </Button>
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600"
              onClick={() => setLocation("/escola/alunos/novo")}
            >
              + Novo Aluno
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

        {/* Barra de busca */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <Input
            placeholder="Buscar por nome do aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2 shrink-0">
            <Badge className="bg-green-100 text-green-700 border-green-200">
              {activeCount} ativos
            </Badge>
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                {pendingCount} pendentes
              </Badge>
            )}
          </div>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onViewClick={setSelectedStudentId}       // ← abre o modal
                onDeleteClick={setStudentToDelete}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {searchTerm ? "Nenhum aluno encontrado." : "Nenhum aluno cadastrado."}
            </p>
            {!searchTerm && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setLocation("/escola/alunos/novo")}
              >
                Cadastrar primeiro aluno
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      <StudentDetailModal
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />

      {/* Modal de exclusão */}
      <DeleteStudentModal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        student={studentToDelete}
        onConfirm={() => {
          if (!studentToDelete) return;
          removeStudent.mutate({ studentId: studentToDelete.id });
        }}
        isDeleting={removeStudent.isPending}
      />
    </div>
  );
}