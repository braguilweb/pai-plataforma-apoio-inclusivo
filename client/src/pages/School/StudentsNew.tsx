import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useForm, Controller } from "react-hook-form";
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
import { AlertCircle } from "lucide-react";

const createStudentSchema = z.object({
  // Bloco 1
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  birthDate: z.string().nonempty("Data de nascimento é obrigatória"),
  series: z.enum(["1º_ano", "2º_ano", "3º_ano"]),
  groupAccess: z.enum(["reads_writes", "non_reads_writes"]),
  guardianName: z.string().min(3),
  guardianContactWhatsapp: z.string().min(10),

  // Bloco 2
  conditions: z.array(z.string()).min(1, "Selecione pelo menos uma condição"),
  readingLevel: z.enum(["non_reader", "reads_with_difficulty", "reads_well"]),
  writingLevel: z.enum(["non_writer", "writes_with_difficulty", "writes_well"]),
  observations: z.string().optional(),

  // Bloco 4
  subjects: z.array(z.string()).min(1, "Selecione pelo menos uma matéria"),
  enemEnabled: z.boolean(),
});

type CreateStudentForm = z.infer<typeof createStudentSchema>;

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
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const form = useForm<CreateStudentForm>({
    resolver: zodResolver(createStudentSchema),
  });

  const { mutate: createStudent, isPending } = trpc.students.createStudent.useMutation({
    onSuccess: (data: { acceptanceLink: string; whatsappLink?: string }) => {
      alert(
        `Aluno criado!\n\nLink de aceite: ${data.acceptanceLink}${
          data.whatsappLink ? `\n\nAtalho WhatsApp: ${data.whatsappLink}` : ""
        }`
      );
      setLocation("/escola/alunos");
    },
    onError: (error) => {
      alert(`Erro: ${error.message}`);
    },
  });

  const onSubmit = (data: CreateStudentForm) => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    // Enviar ao servidor
    createStudent({
      fullName: data.fullName,
      birthDate: data.birthDate,
      series: data.series,
      groupAccess: data.groupAccess,
      independentLogin: false,
      guardianName: data.guardianName,
      guardianContactWhatsapp: data.guardianContactWhatsapp,
      conditions: selectedConditions,
      readingLevel: data.readingLevel,
      writingLevel: data.writingLevel,
      observations: data.observations,
      subjects: selectedSubjects,
      enemEnabled: data.enemEnabled,
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
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  step >= num
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* BLOCO 1 */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Bloco 1 - Identificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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

                  <FormField
                    control={form.control}
                    name="series"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Série *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a série" />
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
                    control={form.control}
                    name="groupAccess"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo de Acesso *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o grupo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="reads_writes">Lê e Escreve</SelectItem>
                            <SelectItem value="non_reads_writes">Não Lê / Não Escreve</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guardianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Responsável *</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-base" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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
                </CardContent>
              </Card>
            )}

            {/* BLOCO 2 */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Bloco 2 - Diagnóstico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormItem>
                    <FormLabel>Condições Diagnosticadas *</FormLabel>
                    <div className="space-y-2 mt-2">
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
                          <label htmlFor={condition} className="cursor-pointer">
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

                  <FormField
                    control={form.control}
                    name="readingLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de Leitura *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    control={form.control}
                    name="writingLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de Escrita *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                  <FormField
                    control={form.control}
                    name="observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* BLOCO 3 - Plano de Estudo (Bloco 4 na spec) */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Bloco 3 - Plano de Estudo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormItem>
                    <FormLabel>Matérias *</FormLabel>
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
                    control={form.control}
                    name="enemEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Habilitar preparação ENEM</FormLabel>
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Depois deste cadastro, o responsável receberá um link para preencher as
                      preferências (Bloco 3 da especificação) e aceitar os termos LGPD.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Botões de navegação */}
            <div className="flex gap-4 justify-end">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={isPending}
                >
                  ← Anterior
                </Button>
              )}
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isPending}
              >
                {isPending ? "Enviando..." : step === 3 ? "Finalizar" : "Próximo →"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/escola/alunos")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
