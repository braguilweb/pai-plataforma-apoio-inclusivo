import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";

// ============================================================================
// SCHEMAS POR ETAPA (validação gradual)
// ============================================================================

// Schema apenas para o Bloco 1 (Step 1)
const block1Schema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  birthDate: z.string().nonempty("Data de nascimento é obrigatória"),
  series: z.enum(["1º_ano", "2º_ano", "3º_ano"]),
  groupAccess: z.enum(["reads_writes", "non_reads_writes"]),
  guardianName: z.string().min(3, "Nome do responsável é obrigatório"),
  guardianContactEmail: z.string().email("E-mail inválido").min(1, "E-mail é obrigatório"),
  guardianContactWhatsapp: z.string().min(10, "WhatsApp deve ter pelo menos 10 dígitos"),
});

// Schema apenas para o Bloco 2 (Step 2)
const block2Schema = z.object({
  conditions: z.array(z.string()).min(1, "Selecione pelo menos uma condição"),
  readingLevel: z.enum(["non_reader", "reads_with_difficulty", "reads_well"]),
  writingLevel: z.enum(["non_writer", "writes_with_difficulty", "writes_well"]),
  observations: z.string().optional(),
});

// Schema apenas para o Bloco 3 (Step 3)
const block3Schema = z.object({
  subjects: z.array(z.string()).min(1, "Selecione pelo menos uma matéria"),
  enemEnabled: z.boolean(),
});

type Block1Data = z.infer<typeof block1Schema>;
type Block2Data = z.infer<typeof block2Schema>;
type Block3Data = z.infer<typeof block3Schema>;

const subjects = [
  "Português",
  "Literatura",
  "Inglês",
  "Educação Física",
  "Arte",
  "Matemática",
  "Biologia",
  "Física",
  "Química",
  "História",
  "Geografia",
  "Filosofia",
  "Sociologia",
];

const conditions = ["TEA", "TDAH", "DI", "Outro"];

export default function SchoolStudentsNew() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  
  // Estados para dados de cada bloco
  const [block1Data, setBlock1Data] = useState<Block1Data | null>(null);
  const [block2Data, setBlock2Data] = useState<Block2Data | null>(null);
  
  // Estados para seleções múltiplas
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Form do Bloco 1
  const formBlock1 = useForm<Block1Data>({
    resolver: zodResolver(block1Schema),
    defaultValues: {
      fullName: "",
      birthDate: "",
      series: undefined,
      groupAccess: undefined,
      guardianName: "",
      guardianContactEmail: "",
      guardianContactWhatsapp: "",
    },
  });

  // Form do Bloco 2
  const formBlock2 = useForm<Block2Data>({
    resolver: zodResolver(block2Schema),
    defaultValues: {
      conditions: [],
      readingLevel: "non_reader",
      writingLevel: "non_writer",
      observations: "",
    },
  });

  // Form do Bloco 3
  const formBlock3 = useForm<Block3Data>({
    resolver: zodResolver(block3Schema),
    defaultValues: {
      subjects: [],
      enemEnabled: false,
    },
  });

  // Mutação para criar aluno
  const { mutate: createStudent, isPending } = trpc.schools.createStudent.useMutation({
    onSuccess: (data) => {
      sonnerToast.success("Aluno criado com sucesso!", {
        description: `Link de aceite enviado para ${data.guardianEmail}`,
      });
      
      alert(
        `✅ Aluno cadastrado!\n\n` +
        `📧 Responsável: ${data.guardianEmail}\n` +
        `🔗 Link de aceite: ${data.acceptanceLink}\n\n` +
        `O responsável deve acessar este link para:\n` +
        `- Aceitar os termos LGPD\n` +
        `- Completar a anamnese (Bloco 3)\n` +
        `- Gerar o login do aluno`
      );
      
      setLocation("/escola/alunos");
    },
    onError: (error) => {
      sonnerToast.error("Erro ao criar aluno", {
        description: error.message,
      });
    },
  });

  // Avançar para próximo bloco
  const handleNext = async () => {
    if (step === 1) {
      const isValid = await formBlock1.trigger();
      if (!isValid) {
        sonnerToast.error("Preencha todos os campos obrigatórios");
        return;
      }
      setBlock1Data(formBlock1.getValues());
      setStep(2);
    } else if (step === 2) {
      // Verificar condições selecionadas
      if (selectedConditions.length === 0) {
        sonnerToast.error("Selecione pelo menos uma condição");
        return;
      }
      
      // Sincronizar condições no form
      formBlock2.setValue("conditions", selectedConditions, { shouldValidate: true });
      
      const isValid = await formBlock2.trigger();
      
      if (!isValid) {
        sonnerToast.error("Preencha todos os campos obrigatórios");
        return;
      }
      
      setBlock2Data({
        ...formBlock2.getValues(),
        conditions: selectedConditions,
      });
      setStep(3);
    }
  };

  // Voltar bloco anterior
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Finalizar cadastro
    // Finalizar cadastro
    // Finalizar cadastro - versão simplificada e funcional
  const handleSubmit = () => {
    console.log("=== Finalizando cadastro ===");
    
    // Validação manual das matérias
    if (selectedSubjects.length === 0) {
      sonnerToast.error("Selecione pelo menos uma matéria");
      return;
    }

    if (!block1Data || !block2Data) {
      sonnerToast.error("Dados incompletos. Volte e preencha todos os blocos.");
      return;
    }

    // Pegar valor do ENEM (padrão false se não marcado)
    const enemValue = formBlock3.getValues().enemEnabled === true;

    console.log("Dados a enviar:", {
      block1: block1Data,
      block2: block2Data,
      subjects: selectedSubjects,
      enem: enemValue,
    });

    // Enviar dados completos - sem validação do formBlock3
    createStudent({
      fullName: block1Data.fullName,
      birthDate: block1Data.birthDate,
      series: block1Data.series,
      groupAccess: block1Data.groupAccess,
      guardianName: block1Data.guardianName,
      guardianContactEmail: block1Data.guardianContactEmail,
      guardianContactWhatsapp: block1Data.guardianContactWhatsapp,
      conditions: selectedConditions,
      readingLevel: block2Data.readingLevel,
      writingLevel: block2Data.writingLevel,
      observations: block2Data.observations || "",
      subjects: selectedSubjects,
      enemEnabled: enemValue,
    });
  };

  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Cadastro de Aluno</h1>
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-colors ${
                  step === num
                    ? "bg-blue-600 text-white"
                    : step > num
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {step > num ? "✓" : num}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {step === 1 && "Bloco 1: Identificação do Aluno"}
            {step === 2 && "Bloco 2: Diagnóstico e Necessidades"}
            {step === 3 && "Bloco 3: Plano de Estudo"}
          </p>
        </div>

        {/* BLOCO 1 */}
        {step === 1 && (
          <Form {...formBlock1}>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <Card>
                <CardHeader>
                  <CardTitle>Bloco 1 - Identificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={formBlock1.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-base" placeholder="Nome completo do aluno" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={formBlock1.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento *</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={formBlock1.control}
                      name="series"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Série *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1º_ano">1º Ano</SelectItem>
                              <SelectItem value="2º_ano">2º Ano</SelectItem>
                              <SelectItem value="3º_ano">3º Ano</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formBlock1.control}
                      name="groupAccess"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grupo de Acesso *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="reads_writes">Lê e Escreve</SelectItem>
                              <SelectItem value="non_reads_writes">Não Lê/Escreve</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Dados do Responsável</h3>
                    
                    <FormField
                      control={formBlock1.control}
                      name="guardianName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Responsável *</FormLabel>
                          <FormControl>
                            <Input {...field} className="text-base" placeholder="Nome completo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formBlock1.control}
                      name="guardianContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail do Responsável *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="responsavel@exemplo.com"
                              className="text-base"
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-gray-500 mt-1">
                            O link de aceite será enviado para este e-mail
                          </p>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formBlock1.control}
                      name="guardianContactWhatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp do Responsável *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="(11) 99999-9999"
                              className="text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/escola/alunos")}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleNext}
                >
                  Próximo →
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* BLOCO 2 */}
        {step === 2 && (
          <Form {...formBlock2}>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <Card>
                <CardHeader>
                  <CardTitle>Bloco 2 - Diagnóstico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormItem>
                    <FormLabel>Condições Diagnosticadas *</FormLabel>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {conditions.map((condition) => (
                        <div key={condition} className="flex items-center space-x-2">
                          <Checkbox
                            id={condition}
                            checked={selectedConditions.includes(condition)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedConditions([...selectedConditions, condition]);
                              } else {
                                setSelectedConditions(
                                  selectedConditions.filter((c) => c !== condition)
                                );
                              }
                            }}
                          />
                          <label htmlFor={condition} className="cursor-pointer text-sm">
                            {condition}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedConditions.length === 0 && (
                      <p className="text-red-500 text-sm mt-2">
                        Selecione pelo menos uma condição
                      </p>
                    )}
                  </FormItem>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={formBlock2.control}
                      name="readingLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de Leitura *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="non_reader">Não lê</SelectItem>
                              <SelectItem value="reads_with_difficulty">Lê com dificuldade</SelectItem>
                              <SelectItem value="reads_well">Lê bem</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formBlock2.control}
                      name="writingLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de Escrita *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="non_writer">Não escreve</SelectItem>
                              <SelectItem value="writes_with_difficulty">Escreve com dificuldade</SelectItem>
                              <SelectItem value="writes_well">Escreve bem</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={formBlock2.control}
                    name="observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações Médicas/Pedagógicas</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Informações adicionais sobre o aluno..."
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                >
                  ← Anterior
                </Button>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleNext}
                >
                  Próximo →
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* BLOCO 3 */}
        {step === 3 && (
          <Form {...formBlock3}>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <Card>
                <CardHeader>
                  <CardTitle>Bloco 3 - Plano de Estudo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormItem>
                    <FormLabel>Matérias do Plano de Estudo *</FormLabel>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {subjects.map((subject) => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={subject}
                            checked={selectedSubjects.includes(subject)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSubjects([...selectedSubjects, subject]);
                              } else {
                                setSelectedSubjects(
                                  selectedSubjects.filter((s) => s !== subject)
                                );
                              }
                            }}
                          />
                          <label htmlFor={subject} className="cursor-pointer text-sm">
                            {subject}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedSubjects.length === 0 && (
                      <p className="text-red-500 text-sm mt-2">
                        Selecione pelo menos uma matéria
                      </p>
                    )}
                  </FormItem>

                  <FormField
                    control={formBlock3.control}
                    name="enemEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Habilitar preparação ENEM</FormLabel>
                          <p className="text-sm text-gray-500">
                            Inclui conteúdos e simulados preparatórios para o ENEM
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Próximos passos:</strong> Após finalizar, o responsável receberá um link para:
                      <ul className="list-disc ml-4 mt-2 space-y-1">
                        <li>Aceitar os termos LGPD</li>
                        <li>Completar a anamnese detalhada (Bloco 3)</li>
                        <li>Gerar o login automático do aluno</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isPending}
                >
                  ← Anterior
                </Button>
                <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Finalizar Cadastro"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}