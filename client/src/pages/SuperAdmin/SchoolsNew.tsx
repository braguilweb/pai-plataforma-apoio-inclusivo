import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast as sonnerToast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Copy, ArrowLeft, School } from "lucide-react";

export default function SuperAdminSchoolsNew() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Estado para armazenar o link de ativação gerado após a criação
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const { mutate: createSchool, isPending } = trpc.superAdmin.createSchool.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // Armazenamos o link para exibir na tela de sucesso
        if (data.activationLink) {
          setCreatedLink(data.activationLink);
        }

        if (data.confirmationEmailSent) {
          sonnerToast.success("Escola criada com sucesso!", {
            description: "O e-mail de ativação foi enviado para o administrador.",
          });
        } else {
          sonnerToast.warning("Escola criada, mas o e-mail falhou.", {
            description: "Use o link abaixo para enviar manualmente.",
            duration: 10000,
          });
        }
      }
    },
    onError: (e) => sonnerToast.error("Erro ao criar escola", { description: e.message }),
  });

  const copyLink = () => {
    if (createdLink) {
      navigator.clipboard.writeText(createdLink);
      sonnerToast.success("Link copiado!");
    }
  };

  // Se a escola foi criada, mostramos a tela de sucesso com o link
  if (createdLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl border-green-100">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Escola Criada!</CardTitle>
            <p className="text-sm text-gray-500 mt-1">A escola <strong>{name}</strong> foi registrada no sistema.</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <p className="text-xs font-bold text-blue-800 uppercase mb-2">Link de Ativação do Admin</p>
              <div className="flex gap-2">
                <Input readOnly value={createdLink} className="bg-white text-xs h-9" />
                <Button size="sm" onClick={copyLink} variant="outline" className="shrink-0 h-9 border-blue-200">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-blue-600 mt-2 italic">
                Envie este link para o e-mail <strong>{email}</strong> caso ele não tenha recebido a notificação automática.
              </p>
            </div>

            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setLocation("/super-admin/escolas")}>
              Ir para Lista de Escolas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulário de Criação
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => setLocation("/super-admin/escolas")}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Voltar para a lista</span>
        </button>

        <Card className="shadow-lg border-none">
          <CardHeader className="bg-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <School className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Cadastrar Nova Escola</CardTitle>
                <p className="text-indigo-100 text-xs mt-1">Preencha os dados básicos para iniciar o onboarding.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nome da Instituição</label>
                <Input placeholder="Ex: Escola Municipal de Ensino Inclusivo" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">CNPJ</label>
                <Input placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">E-mail do Administrador</label>
                  <Input type="email" placeholder="admin@escola.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <p className="text-[10px] text-gray-400 italic">Um convite será enviado para este endereço.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Telefone de Contato</label>
                  <Input placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                className="w-full h-12 text-md font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md"
                disabled={isPending || !name || !cnpj || !email || !phone}
                onClick={() =>
                  createSchool({
                    name,
                    cnpj,
                    email,
                    phone,
                    colorPalette: "azul_serenidade",
                  })
                }
              >
                {isPending ? (
                  <span className="flex items-center gap-2 italic">Criando Instituição...</span>
                ) : (
                  "Finalizar Cadastro e Enviar Convite"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
