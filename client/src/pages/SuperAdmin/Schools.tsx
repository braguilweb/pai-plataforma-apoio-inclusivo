import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast as sonnerToast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, RefreshCw, Archive, Trash2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Componente interno para gerenciar a ativação de uma escola específica.
 * Exibe o link e permite reenvio de e-mail.
 */
function SchoolActivationCard({ schoolId }: { schoolId: number }) {
  const utils = trpc.useUtils();
  const { data: details, isLoading } = trpc.superAdmin.getSchoolActivationDetails.useQuery({ schoolId });
  
  const resend = trpc.superAdmin.resendActivationEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        sonnerToast.success("E-mail de ativação reenviado com sucesso!");
      } else {
        sonnerToast.error("Erro ao enviar e-mail: " + data.error);
      }
    },
    onError: (e) => sonnerToast.error("Falha na comunicação com o servidor"),
  });

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    sonnerToast.success("Link copiado para a área de transferência!");
  };

  if (isLoading) return <p className="text-xs text-gray-400 italic">Carregando detalhes de ativação...</p>;
  if (!details) return null;

  return (
    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Ações de Ativação</span>
        <Badge variant="outline" className="bg-white text-blue-600 border-blue-200">
          {details.status === 'pending_approval' ? 'Aguardando Admin' : details.status}
        </Badge>
      </div>
      
      <p className="text-xs text-gray-600">E-mail do Admin: <strong>{details.adminEmail}</strong></p>
      
      <div className="flex flex-wrap gap-2 pt-1">
        {details.activationLink && (
          <Button 
            size="sm" 
            variant="secondary" 
            className="h-8 text-xs gap-2"
            onClick={() => copyLink(details.activationLink!)}
          >
            <Copy className="w-3 h-3" /> Copiar Link Manual
          </Button>
        )}
        
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 text-xs gap-2 border-blue-200 hover:bg-blue-100"
          disabled={resend.isPending}
          onClick={() => resend.mutate({ schoolId })}
        >
          <Mail className="w-3 h-3" /> {resend.isPending ? 'Enviando...' : 'Reenviar E-mail'}
        </Button>
      </div>
      
      {details.expiresAt && (
        <p className="text-[10px] text-gray-400 italic">
          Token expira em: {new Date(details.expiresAt).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}

/**
 * Modal de confirmação para remover escola.
 * Oferece duas opções: Arquivar (soft delete) ou Remover Permanentemente (hard delete).
 */
function DeleteSchoolModal({
  isOpen,
  onClose,
  school,
  onArchive,
  onDeletePermanent,
  isArchiving,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  school: { id: number; name: string } | null;
  onArchive: () => void;
  onDeletePermanent: () => void;
  isArchiving: boolean;
  isDeleting: boolean;
}) {
  if (!school) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <Archive className="w-5 h-5" />
            Remover Escola
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Como deseja remover a escola <strong>"{school.name}"</strong>?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Opção 1: Arquivar */}
          <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Archive className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">📁 Arquivar Escola</h4>
                <p className="text-sm text-gray-600 mt-1">
                  A escola desaparece do dashboard principal, mas fica salva na área de arquivadas. 
                  Você pode restaurá-la posteriormente.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-3 w-full border-blue-200 hover:bg-blue-50"
                  onClick={onArchive}
                  disabled={isArchiving || isDeleting}
                >
                  {isArchiving ? "Arquivando..." : "Arquivar Escola"}
                </Button>
              </div>
            </div>
          </div>

          {/* Opção 2: Remover Permanentemente */}
          <div className="border border-red-200 rounded-lg p-4 hover:bg-red-50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-900">🗑️ Remover Permanentemente</h4>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Atenção:</strong> Esta ação é irreversível! 
                  Todos os dados da escola serão removidos permanentemente do sistema.
                </p>
                <Button 
                  variant="destructive" 
                  className="mt-3 w-full"
                  onClick={onDeletePermanent}
                  disabled={isArchiving || isDeleting}
                >
                  {isDeleting ? "Removendo..." : "Remover Permanentemente"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isArchiving || isDeleting}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Card de escola arquivada com opção de restaurar.
 */
function ArchivedSchoolCard({ 
  school, 
  onRestore 
}: { 
  school: any; 
  onRestore: (id: number) => void;
}) {
  return (
    <Card className="grayscale hover:grayscale-0 transition-all duration-300 border-gray-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-gray-700">{school.name}</CardTitle>
          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
            Arquivada
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Arquivada em: {school.dataArquivamento ? new Date(school.dataArquivamento).toLocaleDateString('pt-BR') : 'Data desconhecida'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2 border-green-200 text-green-700 hover:bg-green-50"
            onClick={() => onRestore(school.id)}
          >
            <RotateCcw className="w-4 h-4" /> Restaurar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminSchools() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const utils = trpc.useUtils();

  // Buscamos as listas do servidor
  const { data: activeSchools, isLoading: loadingActive } = trpc.superAdmin.listSchools.useQuery();
  const { data: pendingSchools, isLoading: loadingPending } = trpc.superAdmin.listPendingSchools.useQuery();
  const { data: archivedSchools, isLoading: loadingArchived } = trpc.superAdmin.listArchivedSchools.useQuery(undefined, {
    enabled: showArchived,
  });

  // Mutações
  const archiveSchool = trpc.superAdmin.archiveSchool.useMutation({
    onSuccess: () => {
      utils.superAdmin.listSchools.invalidate();
      utils.superAdmin.listPendingSchools.invalidate();
      utils.superAdmin.listArchivedSchools.invalidate();
      sonnerToast.success("Escola arquivada com sucesso!");
      setIsDeleteModalOpen(false);
      setSchoolToDelete(null);
    },
    onError: (e) => sonnerToast.error("Erro ao arquivar escola", { description: e.message }),
  });

  const deleteSchoolPermanent = trpc.superAdmin.deleteSchoolPermanent.useMutation({
    onSuccess: () => {
      utils.superAdmin.listSchools.invalidate();
      utils.superAdmin.listPendingSchools.invalidate();
      utils.superAdmin.listArchivedSchools.invalidate();
      sonnerToast.success("Escola removida permanentemente!");
      setIsDeleteModalOpen(false);
      setSchoolToDelete(null);
    },
    onError: (e) => sonnerToast.error("Erro ao remover escola", { description: e.message }),
  });

  const restoreSchool = trpc.superAdmin.restoreSchool.useMutation({
    onSuccess: () => {
      utils.superAdmin.listSchools.invalidate();
      utils.superAdmin.listArchivedSchools.invalidate();
      sonnerToast.success("Escola restaurada com sucesso!");
    },
    onError: (e) => sonnerToast.error("Erro ao restaurar escola", { description: e.message }),
  });

  const filterFn = (school: any) => school.name.toLowerCase().includes(searchTerm.toLowerCase());
  
  const filteredActive = activeSchools?.filter(filterFn) || [];
  const filteredPending = pendingSchools?.filter(filterFn) || [];
  const filteredArchived = archivedSchools?.filter(filterFn) || [];

  const handleDeleteClick = (school: { id: number; name: string }) => {
    setSchoolToDelete(school);
    setIsDeleteModalOpen(true);
  };

  const handleArchive = () => {
    if (!schoolToDelete) return;
    archiveSchool.mutate({ schoolId: schoolToDelete.id });
  };

  const handleDeletePermanent = () => {
    if (!schoolToDelete) return;
    deleteSchoolPermanent.mutate({ schoolId: schoolToDelete.id });
  };

  const handleRestore = (schoolId: number) => {
    restoreSchool.mutate({ schoolId });
  };

  if (loadingActive || loadingPending) {
    return (
      <div className="p-8 flex items-center gap-2">
        <RefreshCw className="animate-spin" /> Carregando escolas...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-indigo-700 text-white p-6 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Escolas</h1>
          <div className="flex gap-2">
             <Button onClick={() => setLocation("/super-admin/dashboard")} variant="secondary" size="sm">
               Painel Geral
             </Button>
             <Button onClick={() => setLocation("/super-admin/escolas/nova")} className="bg-green-500 hover:bg-green-600" size="sm">
               + Nova Escola
             </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Barra de Pesquisa */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <Input
            placeholder="Buscar por nome da escola..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button 
            variant={showArchived ? "default" : "outline"} 
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? "Ocultar Arquivadas" : "Ver Arquivadas"}
          </Button>
        </div>

        {/* --- SEÇÃO: ESCOLAS PENDENTES DE ATIVAÇÃO --- */}
        {filteredPending.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-xl font-bold text-gray-800">Aguardando Ativação ({filteredPending.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPending.map((school: any) => (
                <Card key={school.id} className="border-amber-100 bg-amber-50/30 hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg text-amber-900">{school.name}</CardTitle>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pendente</Badge>
                    </div>
                    <CardDescription>Criada em: {new Date(school.createdAt).toLocaleDateString('pt-BR')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SchoolActivationCard schoolId={school.id} />
                    <div className="mt-4 flex gap-2 justify-end">
                       <Button 
                         size="sm" 
                         variant="ghost" 
                         className="text-red-600 hover:bg-red-50" 
                         onClick={() => handleDeleteClick(school)}
                       >
                         <Trash2 className="w-4 h-4 mr-1" /> Remover
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* --- SEÇÃO: ESCOLAS ATIVAS --- */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Escolas Ativas ({filteredActive.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActive.length > 0 ? (
              filteredActive.map((school: any) => (
                <Card key={school.id} className="hover:shadow-lg transition-shadow border-indigo-50">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="truncate">{school.name}</CardTitle>
                      <Badge className="bg-green-100 text-green-700 border-green-200">Ativa</Badge>
                    </div>
                    <CardDescription>ID: {school.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold">Identidade</p>
                        <p className="font-medium text-xs">{school.colorPalette.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase font-bold">LGPD</p>
                        <p className={`font-medium text-xs ${school.lgpdAccepted ? 'text-green-600' : 'text-amber-600'}`}>
                          {school.lgpdAccepted ? "✅ Aceito" : "⏳ Pendente"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => setLocation(`/super-admin/escolas/${school.id}`)}
                      >
                        Gerenciar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteClick(school)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              !loadingActive && (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-400">Nenhuma escola ativa encontrada.</p>
                </div>
              )
            )}
          </div>
        </section>

        {/* --- SEÇÃO: ARQUIVADAS --- */}
        {showArchived && (
          <section className="mt-12 pt-8 border-t border-gray-200 space-y-4">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-600">Escolas Arquivadas ({filteredArchived.length})</h2>
            </div>
            
            {loadingArchived ? (
              <div className="py-8 text-center">
                <RefreshCw className="animate-spin mx-auto mb-2" /> Carregando arquivadas...
              </div>
            ) : filteredArchived.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredArchived.map((school: any) => (
                  <ArchivedSchoolCard 
                    key={school.id} 
                    school={school} 
                    onRestore={handleRestore}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-4 italic">Nenhuma escola no arquivo.</p>
            )}
          </section>
        )}
      </div>

      {/* Modal de Confirmação */}
      <DeleteSchoolModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSchoolToDelete(null);
        }}
        school={schoolToDelete}
        onArchive={handleArchive}
        onDeletePermanent={handleDeletePermanent}
        isArchiving={archiveSchool.isPending}
        isDeleting={deleteSchoolPermanent.isPending}
      />
    </div>
  );
}