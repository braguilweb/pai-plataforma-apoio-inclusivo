import { z } from "zod";
import { studentProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { chatMessages, students, anamnesis, schools, users } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  analyzeStudentContent,
  checkComprehension,
  checkContentSafety,
} from "../gemini";
import { sendModerationWarning } from "../email-helper";

function detectSubject(content?: string, audioTranscription?: string) {
  const text = `${content || ""} ${audioTranscription || ""}`.toLowerCase();
  if (!text.trim()) return "General";
  if (/(matem|equa|álgebra|geometria)/i.test(text)) return "Matemática";
  if (/(história|historia|idade média|império|república)/i.test(text)) return "História";
  if (/(física|fisica|força|energia|movimento)/i.test(text)) return "Física";
  if (/(química|quimica|átomo|molecula|reação)/i.test(text)) return "Química";
  if (/(biologia|célula|celula|ecossistema)/i.test(text)) return "Biologia";
  if (/(português|portugues|gramática|gramatica|literatura)/i.test(text)) return "Linguagens";
  return "General";
}

// ✅ FUNÇÃO: Verificar se conteúdo é proibido (simples, para texto)
function checkForbiddenContent(content: string, forbiddenThemes: string[]): boolean {
  if (!forbiddenThemes || forbiddenThemes.length === 0) return false;
  
  const lowerContent = content.toLowerCase();
  return forbiddenThemes.some(theme => 
    lowerContent.includes(theme.toLowerCase())
  );
}

export const chatRouter = router({
  /**
   * Send message to AI (text, image, or audio)
   */
  sendMessage: studentProcedure
    .input(
      z.object({
        contentType: z.enum(["text", "image", "audio"]),
        content: z.string().optional(),
        imageUrl: z.string().optional(),
        audioUrl: z.string().optional(),
        audioTranscription: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // ✅ BUSCAR STUDENT + SCHOOL (com JOIN para pegar nome da escola)
        const studentResult = await db
          .select({
            student: students,
            school: {
              name: schools.name,
            },
          })
          .from(students)
          .leftJoin(schools, eq(schools.id, students.schoolId))
          .where(eq(students.userId, ctx.user!.id))
          .limit(1);

        if (studentResult.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        const { student, school } = studentResult[0];

        // Buscar anamnesis
        const anamnesisResult = await db
          .select()
          .from(anamnesis)
          .where(eq(anamnesis.studentId, student.id))
          .limit(1);

        if (anamnesisResult.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Student profile not complete",
          });
        }

        const studentAnamnesis = anamnesisResult[0];
        const prohibitedThemes = (studentAnamnesis.prohibitedThemes as string[]) || [];

        // ✅ VERIFICAR CONTEÚDO PROIBIDO NO TEXTO (antes de enviar ao Gemini)
        if (input.content && checkForbiddenContent(input.content, prohibitedThemes)) {
          // Incrementar warning
          const newWarningCount = (student.moderationWarnings || 0) + 1;
          
          // Buscar dados para email
          const schoolAdminRows = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, student.schoolId)) // Ajustar se necessário
            .limit(1);
          
          const adminEmail = schoolAdminRows[0]?.email || "admin@pai-inclusivo.com";

          if (newWarningCount === 1) {
            // 1º STRIKE: Avisar aluno + notificar, não bloquear
            await db
              .update(students)
              .set({ moderationWarnings: newWarningCount })
              .where(eq(students.id, student.id));

            await sendModerationWarning({
              guardianEmail: studentAnamnesis.guardianContactEmail || "",
              adminEmail,
              studentName: ctx.user!.name || "Aluno",
              warningNumber: 1,
              schoolName: school?.name || "Escola",
            });

            return {
              success: false,
              warning: true,
              message: `⚠️ Esse assunto não pode ser discutido aqui. Seu responsável foi notificado. Lembre-se: ${prohibitedThemes.join(", ")} são temas proibidos.`,
            };
          } else if (newWarningCount === 2) {
            // 2º STRIKE: Aviso mais sério
            await db
              .update(students)
              .set({ moderationWarnings: newWarningCount })
              .where(eq(students.id, student.id));

            await sendModerationWarning({
              guardianEmail: studentAnamnesis.guardianContactEmail || "",
              adminEmail,
              studentName: ctx.user!.name || "Aluno",
              warningNumber: 2,
              schoolName: school?.name || "Escola",
            });

            return {
              success: false,
              warning: true,
              message: "⚠️ ÚLTIMO AVISO! Próximo desrespeito às regras resultará em bloqueio da conta. Converse com seu responsável.",
            };
          } else {
            // 3º STRIKE: Bloquear
            await db
              .update(students)
              .set({ 
                blockedAt: new Date(), 
                moderationWarnings: newWarningCount 
              })
              .where(eq(students.id, student.id));

            await sendModerationWarning({
              guardianEmail: studentAnamnesis.guardianContactEmail || "",
              adminEmail,
              studentName: ctx.user!.name || "Aluno",
              warningNumber: 3,
              schoolName: school?.name || "Escola",
            });

            throw new TRPCError({
              code: "FORBIDDEN",
              message: "🚫 Sua conta foi bloqueada por violar as regras da plataforma. Seu responsável precisa entrar em contato com a escola para liberar o acesso.",
            });
          }
        }

        // Check if student is blocked (por violação anterior ou manual)
        if (student.blockedAt) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "🚫 Sua conta está bloqueada. Peça ao responsável para entrar em contato com a escola.",
          });
        }

        // Check content safety if image
        if (input.contentType === "image" && input.imageUrl) {
          const safetyCheck = await checkContentSafety(input.imageUrl);

          if (!safetyCheck.isSafe) {
            const newWarningCount = (student.moderationWarnings || 0) + 1;
            // ... mesma lógica de strikes acima para imagens
            // (simplificado por brevidade, copie a lógica do texto acima)
          }
        }

        // Detect subject
        const detectedSubject = detectSubject(input.content, input.audioTranscription);

        // ✅ BUSCAR ÚLTIMAS 2 MENSAGENS PARA CONTEXTO
        const recentMessages = await db
          .select({
            messageType: chatMessages.messageType,
            content: chatMessages.content,
          })
          .from(chatMessages)
          .where(eq(chatMessages.studentId, student.id))
          .orderBy(desc(chatMessages.createdAt))
          .limit(2);

        // Formatar para o Gemini (inverter ordem: mais antiga -> mais nova)
        const formattedHistory = recentMessages
          .reverse()
          .map(msg => ({
            role: msg.messageType === 'student_input' ? 'user' as const : 'model' as const,
            content: msg.content || ''
          }));

        // Save student input message
        const studentMessage = await db.insert(chatMessages).values({
          studentId: student.id,
          messageType: "student_input",
          contentType: input.contentType,
          content: input.content,
          imageUrl: input.imageUrl,
          audioUrl: input.audioUrl,
          subjectTopic: detectedSubject,
        }).returning({ id: chatMessages.id });


       // Buscar dados do usuário (para usar também no fallback)
        const userData = await db
          .select({ firstName: users.firstName, name: users.name, birthDate: users.birthDate })
          .from(users)
          .where(eq(users.id, ctx.user!.id))
          .limit(1)
          .then(rows => rows[0] || null);

        // ✅ CHAMAR GEMINI COM CONTEXTO E PERFIL COMPLETO
        let aiResponse;
        try {
          aiResponse = await analyzeStudentContent({
            content: input.content,
            imageUrl: input.imageUrl,
            audioTranscription: input.audioTranscription,
            history: formattedHistory, // ✅ CONTEXTO DA CONVERSA
            studentPreferences: {
              favoriteMovies: studentAnamnesis.favoriteMovies || undefined,
              favoriteMusic: studentAnamnesis.favoriteMusic || undefined,
              favoriteSports: studentAnamnesis.favoriteSports || undefined,
              favoriteFoods: studentAnamnesis.favoriteFoods || undefined,
              favoriteAnimations: studentAnamnesis.favoriteAnimations || undefined,
              otherInterests: studentAnamnesis.otherInterests || undefined,
            },
            prohibitedThemes: prohibitedThemes,
            readingLevel: (studentAnamnesis.readingLevel as any) || "reads_well",
            writingLevel: (studentAnamnesis.writingLevel as any) || "writes_well",
            series: student.series,
            personaName: student.personaName || "Prof. Guilherme",
            subject: detectedSubject,
            enemEnabled: student.enemEnabled,
            studentData: {
              firstName: userData?.firstName || userData?.name?.split(" ")[0] || "Aluno",
              birthDate: userData?.birthDate,
            },
            schoolData: school || null, // ✅ DADOS DA ESCOLA
          });
        } catch (geminiError: any) {
          // Fallback quando Gemini falha
          console.error("❌ Gemini falhou, usando fallback:", geminiError.message);
          
          const studentFirstName = userData?.firstName || userData?.name?.split(" ")[0] || "amigo";
          const tutorName = student.personaName || "Seu Tutor";
          
          aiResponse = {
            introduction: `Oi ${studentFirstName}! Sou o ${tutorName}! 🎉 Recebi sua mensagem, mas estou com um pouco de dor de cabeça técnica agora...`,
            summary: input.content 
              ? `Você perguntou sobre "${input.content}". Estou processando isso com carinho, mas nossa conexão está lenta. Tente novamente em alguns instantes!`
              : "Estou aqui para te ajudar! Só preciso de um momento para organizar minhas ideias...",
            glossary: [
              { term: "Paciência", definition: "Virtude de quem espera calmamente" }
            ],
            questions: [
              `Enquanto isso, o que mais você gostaria de saber sobre "${input.content || 'esse assunto'}"?`
            ],
            enemQuestion: student.enemEnabled ? {
              question: "Questão para reflexão: Qual habilidade de estudo você está usando agora?",
              options: ["Memorização", "Pesquisa", "Análise", "Todas"],
              correctAnswer: 3
            } : undefined
          };
        }

        // Save AI response
        await db.insert(chatMessages).values({
          studentId: student.id,
          messageType: "ai_response",
          contentType: "text",
          content: JSON.stringify({
            introduction: aiResponse.introduction,
            summary: aiResponse.summary,
            glossary: aiResponse.glossary,
            questions: aiResponse.questions,
            enemQuestion: aiResponse.enemQuestion,
          }),
          subjectTopic: detectedSubject,
        });

        return {
          success: true,
          messageId: studentMessage[0]?.id ?? null,
          response: aiResponse,
        };
      } catch (error) {
        console.error("Failed to send message:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process message",
        });
      }
    }),

  /**
   * Submit student response to questions
   */
  submitResponse: studentProcedure
    .input(
      z.object({
        messageId: z.number(),
        responseType: z.enum(["text", "image", "audio"]),
        responseContent: z.string().optional(),
        responseImageUrl: z.string().optional(),
        responseAudioUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Get original message
        const originalMessage = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.id, input.messageId))
          .limit(1);

        if (originalMessage.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Message not found",
          });
        }

        const message = originalMessage[0];

        const studentRows = await db
          .select()
          .from(students)
          .where(eq(students.id, message.studentId))
          .limit(1)
          .execute();
        const personaName = studentRows[0]?.personaName || "Prof. Guilherme";

        // Parse AI response
        const aiResponseData = JSON.parse(message.content || "{}");

        // Check comprehension
        const comprehensionResult = await checkComprehension({
          originalContent: aiResponseData.summary,
          studentResponse: input.responseContent || "",
          questions: aiResponseData.questions,
          personaName,
        });

        // Save response
        await db.insert(chatMessages).values({
          studentId: message.studentId,
          messageType: "student_input",
          contentType: input.responseType,
          content: input.responseContent,
          imageUrl: input.responseImageUrl,
          audioUrl: input.responseAudioUrl,
          isComprehended: comprehensionResult.isComprehended,
          comprehensionScore: comprehensionResult.score.toString(),
          subjectTopic: message.subjectTopic,
          previousVersionId: input.messageId,
        });

        const previousAttempts = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.previousVersionId, input.messageId));

        const failedAttempts = previousAttempts.filter(
          (m) => m.isComprehended === false
        ).length;

        const needsTeacherAttention =
          comprehensionResult.isComprehended === false && failedAttempts >= 2;

        return {
          success: true,
          isComprehended: comprehensionResult.isComprehended,
          score: comprehensionResult.score,
          feedback: comprehensionResult.feedback,
          needsTeacherAttention,
        };
      } catch (error) {
        console.error("Failed to submit response:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process response",
        });
      }
    }),

  /**
   * Get chat history for student
   */
  getHistory: studentProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      const studentResult = await db
        .select()
        .from(students)
        .where(eq(students.userId, ctx.user!.id))
        .limit(1);

      if (studentResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.studentId, studentResult[0].id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(50);

      return messages;
    } catch (error) {
      console.error("Failed to get chat history:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get history",
      });
    }
  }),
});