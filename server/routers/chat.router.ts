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
        // Get student info
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

        const student = studentResult[0];

        const schoolRows = await db
          .select()
          .from(schools)
          .where(eq(schools.id, student.schoolId))
          .limit(1)
          .execute();

        const school = schoolRows[0];
        const schoolAdminRows = school
          ? await db
              .select()
              .from(users)
              .where(eq(users.id, school.adminId))
              .limit(1)
              .execute()
          : [];
        const schoolAdmin = schoolAdminRows[0];
        const adminEmail = schoolAdmin?.email || "admin@pai-inclusivo.com";
        const schoolName = school?.name || "School";

        // Check if student is blocked
        if (student.blockedAt) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your account has been blocked due to policy violations",
          });
        }

        // Get anamnesis
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

        // Check content safety if image
        if (input.contentType === "image" && input.imageUrl) {
          const safetyCheck = await checkContentSafety(input.imageUrl);

          if (!safetyCheck.isSafe) {
            // Log moderation violation
            const warningCount = student.moderationWarnings + 1;

            if (warningCount >= 2) {
              // Block student
              await db
                .update(students)
                .set({ blockedAt: new Date(), moderationWarnings: warningCount })
                .where(eq(students.id, student.id));

              // Send alerts
              await sendModerationWarning({
                guardianEmail: studentAnamnesis.guardianContactEmail || "",
                adminEmail,
                studentName: ctx.user!.name || "Student",
                warningNumber: 2,
                schoolName,
              });

              throw new TRPCError({
                code: "FORBIDDEN",
                message:
                  "Your account has been blocked due to policy violations",
              });
            } else {
              // First warning
              await db
                .update(students)
                .set({ moderationWarnings: warningCount })
                .where(eq(students.id, student.id));

              // Send warning email
              await sendModerationWarning({
                guardianEmail: studentAnamnesis.guardianContactEmail || "",
                adminEmail,
                studentName: ctx.user!.name || "Student",
                warningNumber: 1,
                schoolName,
              });

              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "This image contains inappropriate content. This is your first warning. Next violation will result in account suspension.",
              });
            }
          }
        }

        // Save student input message
        const detectedSubject = detectSubject(input.content, input.audioTranscription);

        const studentMessage = await db.insert(chatMessages).values({
          studentId: student.id,
          messageType: "student_input",
          contentType: input.contentType,
          content: input.content,
          imageUrl: input.imageUrl,
          audioUrl: input.audioUrl,
          subjectTopic: detectedSubject,
        }).returning({ id: chatMessages.id });

        // Analyze content with Gemini
        const aiResponse = await analyzeStudentContent({
          content: input.content,
          imageUrl: input.imageUrl,
          audioTranscription: input.audioTranscription,
          studentPreferences: {
            favoriteMovies: studentAnamnesis.favoriteMovies || undefined,
            favoriteMusic: studentAnamnesis.favoriteMusic || undefined,
            favoriteSports: studentAnamnesis.favoriteSports || undefined,
            favoriteFoods: studentAnamnesis.favoriteFoods || undefined,
            favoriteAnimations: studentAnamnesis.favoriteAnimations || undefined,
            otherInterests: studentAnamnesis.otherInterests || undefined,
          },
          prohibitedThemes: (studentAnamnesis.prohibitedThemes as string[]) || [],
          readingLevel: (studentAnamnesis.readingLevel as any) || "reads_well",
          writingLevel: (studentAnamnesis.writingLevel as any) || "writes_well",
          series: student.series,
          personaName: student.personaName || "Prof. Guilherme",
          subject: detectedSubject,
          enemEnabled: student.enemEnabled,
        });

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
