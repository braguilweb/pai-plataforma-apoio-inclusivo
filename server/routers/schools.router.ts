import { adminSchoolProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { schools, students, users, anamnesis, moderationLogs, chatMessages } from "../../drizzle/schema";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";

type ProcedureOpts = {
  ctx: TrpcContext;
  input?: any;
};

export const schoolsRouter = router({
  // Dashboard
  getDashboard: adminSchoolProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;

    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");
    if (!ctx.user) throw new Error("Usuário não autenticado");

    const school = await db
      .select()
      .from(schools)
      .where(eq(schools.adminId, ctx.user.id))
      .execute();

    if (!school.length) throw new Error("Escola não encontrada");

    const schoolId = school[0].id;

    const studentList = await db
      .select()
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .execute();

    const teacherList = await db
      .select()
      .from(users)
      .where(eq(users.schoolId, schoolId))
      .execute();

    return {
      school: school[0],
      studentCount: studentList.length,
      teacherCount: teacherList.length,
      recentStudents: studentList.slice(-5),
    };
  }),

  // Configurações da escola
  getConfiguration: adminSchoolProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");
    if (!ctx.user) throw new Error("Usuário não autenticado");

    const school = await db
      .select()
      .from(schools)
      .where(eq(schools.adminId, ctx.user.id))
      .limit(1)
      .execute();

    if (!school.length) throw new Error("Escola não encontrada");
    return school[0];
  }),

  updateConfiguration: adminSchoolProcedure
    .input(
      z.object({
        colorPalette: z
          .enum([
            "azul_serenidade",
            "verde_natureza",
            "roxo_criativo",
            "laranja_energia",
            "personalizada",
          ])
          .optional(),
        customColorHex: z.string().optional(),
        logoUrl: z.string().optional(),
      })
    )
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;

      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!ctx.user) throw new Error("Usuário não autenticado");

      return await db
        .update(schools)
        .set({
          colorPalette: input?.colorPalette,
          customColorHex: input?.customColorHex,
          logoUrl: input?.logoUrl,
        })
        .where(eq(schools.adminId, ctx.user.id))
        .execute();
    }),

  // Listar alunos
  listStudents: adminSchoolProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;

    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");
    if (!ctx.user) throw new Error("Usuário não autenticado");

    const school = await db
      .select()
      .from(schools)
      .where(eq(schools.adminId, ctx.user.id))
      .execute();

    if (!school.length) throw new Error("Escola não encontrada");

    return await db
      .select()
      .from(students)
      .where(eq(students.schoolId, school[0].id))
      .execute();
  }),

  // Listar professores
  listTeachers: adminSchoolProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;

    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");
    if (!ctx.user) throw new Error("Usuário não autenticado");

    const school = await db
      .select()
      .from(schools)
      .where(eq(schools.adminId, ctx.user.id))
      .execute();

    if (!school.length) throw new Error("Escola não encontrada");

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.schoolId, school[0].id))
      .execute();

    return userRows.filter((u) => u.role === "teacher");
  }),

  // Obter aluno com anamnese
  getStudentWithAnamnesis: adminSchoolProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;

      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!input) throw new Error("Input not provided");

      const student = await db
        .select()
        .from(students)
        .where(eq(students.id, input.studentId))
        .execute();

      if (!student.length) throw new Error("Aluno não encontrado");

      const studentAnamnesis = await db
        .select()
        .from(anamnesis)
        .where(eq(anamnesis.studentId, input.studentId))
        .execute();

      return {
        student: student[0],
        anamnesis: studentAnamnesis[0],
      };
    }),

  getStudentRecentMessages: adminSchoolProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!input) throw new Error("Input not provided");

      return await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.studentId, input.studentId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(20)
        .execute();
    }),

  getModerationAlerts: adminSchoolProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");
    if (!ctx.user) throw new Error("Usuário não autenticado");

    const school = await db
      .select()
      .from(schools)
      .where(eq(schools.adminId, ctx.user.id))
      .limit(1)
      .execute();

    if (!school.length) throw new Error("Escola não encontrada");

    const studentRows = await db
      .select()
      .from(students)
      .where(eq(students.schoolId, school[0].id))
      .execute();

    if (!studentRows.length) return [];

    const studentMap = new Map(studentRows.map((s) => [s.id, s]));
    const allLogs = await db.select().from(moderationLogs).orderBy(desc(moderationLogs.createdAt)).execute();

    return allLogs
      .filter((l) => studentMap.has(l.studentId))
      .slice(0, 50)
      .map((l) => ({
        ...l,
        student: studentMap.get(l.studentId),
      }));
  }),

  // Liberar aluno bloqueado
  unlockStudent: adminSchoolProcedure
    .input(z.object({ studentId: z.number() }))
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;

      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!input) throw new Error("Input not provided");

      return await db
        .update(students)
        .set({ blockedAt: null, moderationWarnings: 0 })
        .where(eq(students.id, input.studentId))
        .execute();
    }),

  // Bloquear aluno
  blockStudent: adminSchoolProcedure
    .input(z.object({ studentId: z.number() }))
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;

      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!input) throw new Error("Input not provided");

      return await db
        .update(students)
        .set({ blockedAt: new Date() })
        .where(eq(students.id, input.studentId))
        .execute();
    }),
});