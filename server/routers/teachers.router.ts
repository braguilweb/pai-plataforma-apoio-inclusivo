import { adminSchoolProcedure, teacherProcedure, router } from "../_core/trpc";
import { users, students, anamnesis, chatMessages, schools } from "../../drizzle/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const teachersRouter = router({
  // Admin criar professor
  createTeacher: adminSchoolProcedure
    .input(
      z.object({
        name: z.string().min(3),
        email: z.string().email(),
        phone: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!ctx.user) throw new Error("Usuário não autenticado");

      const schoolRows = await db
        .select()
        .from(schools)
        .where(eq(schools.adminId, ctx.user.id))
        .limit(1)
        .execute();

      if (!schoolRows.length) throw new Error("Escola do admin não encontrada");

      const newTeacher = await db
        .insert(users)
        .values({
          openId: `local_teacher_${nanoid(16)}`,
          name: input.name,
          email: input.email,
          role: "teacher",
          schoolId: schoolRows[0].id,
          lgpdAccepted: false,
        })
        .returning({ id: users.id })
        .execute();

      return { success: true, teacherId: newTeacher[0]?.id };
    }),

  // Professor listar seus alunos
  listMyStudents: teacherProcedure.query(async ({ ctx }) => {
    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");

    return await db
      .select()
      .from(students)
      .where(eq(students.teacherId, ctx.user.id))
      .execute();
  }),

  // Professor obter relatório de um aluno
  getStudentReport: teacherProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");

      const student = await db
        .select()
        .from(students)
        .where(eq(students.id, input.studentId))
        .execute();

      const studentAnamnesis = await db
        .select()
        .from(anamnesis)
        .where(eq(anamnesis.studentId, input.studentId))
        .execute();

      // Obter histórico de chat
      const chatHistory = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.studentId, input.studentId))
        .execute();

      // Agrupar por compreensão
      const comprehended = chatHistory.filter((msg: typeof chatMessages.$inferSelect) => msg.isComprehended === true).length;
      const notComprehended = chatHistory.filter((msg: typeof chatMessages.$inferSelect) => msg.isComprehended === false).length;

      return {
        student: student[0],
        anamnesis: studentAnamnesis[0],
        comprehensionStats: {
          totalInteractions: chatHistory.length,
          comprehended,
          notComprehended,
          comprehensionRate: chatHistory.length > 0 ? (comprehended / chatHistory.length) * 100 : 0,
        },
        recentChats: chatHistory.slice(-10),
      };
    }),

  // Professor receber notificações de dificuldade
  getNotifications: teacherProcedure.query(async ({ ctx }) => {
    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");

    const teacherStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.teacherId, ctx.user.id))
      .execute();

    if (!teacherStudents.length) return [];

    const studentIds = new Set(teacherStudents.map((s) => s.id));
    const allMessages = await db.select().from(chatMessages).execute();

    const failedByParent = new Map<number, number>();
    for (const msg of allMessages) {
      if (!studentIds.has(msg.studentId)) continue;
      if (msg.previousVersionId && msg.isComprehended === false) {
        const current = failedByParent.get(msg.previousVersionId) || 0;
        failedByParent.set(msg.previousVersionId, current + 1);
      }
    }

    return allMessages
      .filter((m) => {
        if (!studentIds.has(m.studentId)) return false;
        if (!m.previousVersionId) return false;
        return (failedByParent.get(m.previousVersionId) || 0) >= 2;
      })
      .slice(-20)
      .map((m) => ({
        id: m.id,
        studentId: m.studentId,
        message: "Aluno não compreendeu após múltiplas tentativas",
        subjectTopic: m.subjectTopic,
        createdAt: m.createdAt,
      }));
  }),
});
