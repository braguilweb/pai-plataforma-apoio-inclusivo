import { adminSchoolProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { schools, students, users, anamnesis, moderationLogs, chatMessages } from "../../drizzle/schema";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendStudentAcceptanceEmail, sendSchoolCreatedConfirmation } from "server/email-helper";

type ProcedureOpts = {
  ctx: TrpcContext;
  input?: any;
};

// ============================================================================
// HELPER: Geração de login único
// Prioridade:
//   1. nome.primeirosobrenome  → ex: joao.silva
//   2. nome.anonascimento      → ex: joao.2015
//   3. nome.001, nome.002...   → ex: joao.001
// ============================================================================

/**
 * Normaliza uma string para uso em login:
 * - Remove acentos
 * - Converte para minúsculas
 * - Remove caracteres especiais
 */
function normalizeForLogin(str: string): string {
  return str
    .normalize("NFD")                          // separa letras de acentos
    .replace(/[\u0300-\u036f]/g, "")           // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");               // só letras e números
}

/**
 * Gera um login único para o aluno verificando disponibilidade no banco.
 *
 * @param db        - Instância do banco de dados
 * @param fullName  - Nome completo do aluno
 * @param birthDate - Data de nascimento no formato "YYYY-MM-DD"
 * @returns Login único gerado
 */
async function generateUniqueLogin(
  db: any,
  fullName: string,
  birthDate: string
): Promise<string> {
  const parts = fullName.trim().split(/\s+/);
  const firstName = normalizeForLogin(parts[0]);
  const lastName = parts.length > 1 ? normalizeForLogin(parts[parts.length - 1]) : null;
  const birthYear = birthDate ? new Date(birthDate).getFullYear().toString() : null;

  // Checa se login já existe no banco
  const isLoginTaken = async (login: string): Promise<boolean> => {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.loginUsername, login))
      .limit(1)
      .execute();
    return existing.length > 0;
  };

  // Tentativa 1: nome.primeirosobrenome → ex: joao.silva
  if (lastName) {
    const candidate = `${firstName}.${lastName}`;
    if (!(await isLoginTaken(candidate))) return candidate;
  }

  // Tentativa 2: nome.anonascimento → ex: joao.2015
  if (birthYear) {
    const candidate = `${firstName}.${birthYear}`;
    if (!(await isLoginTaken(candidate))) return candidate;
  }

  // Tentativa 3: nome.001, nome.002... → ex: joao.001
  for (let i = 1; i <= 999; i++) {
    const suffix = i.toString().padStart(3, "0");
    const candidate = `${firstName}.${suffix}`;
    if (!(await isLoginTaken(candidate))) return candidate;
  }

  // Fallback extremo (praticamente impossível chegar aqui)
  return `${firstName}.${nanoid(6)}`;
}

// ============================================================================

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
    const allLogs = await db
      .select()
      .from(moderationLogs)
      .orderBy(desc(moderationLogs.createdAt))
      .execute();

    return allLogs
      .filter((l) => studentMap.has(l.studentId))
      .slice(0, 50)
      .map((l) => ({
        ...l,
        student: studentMap.get(l.studentId),
      }));
  }),

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

  // ============================================================================
  // CADASTRO DE ALUNO
  // ============================================================================
  createStudent: adminSchoolProcedure
    .input(z.object({
      fullName: z.string().min(3),
      birthDate: z.string(),
      series: z.enum(["1º_ano", "2º_ano", "3º_ano"]),
      groupAccess: z.enum(["reads_writes", "non_reads_writes"]),
      guardianName: z.string().min(3),
      guardianContactEmail: z.string().email(),
      guardianContactWhatsapp: z.string(),
      conditions: z.array(z.string()),
      readingLevel: z.enum(["non_reader", "reads_with_difficulty", "reads_well"]),
      writingLevel: z.enum(["non_writer", "writes_with_difficulty", "writes_well"]),
      observations: z.string().optional(),
      subjects: z.array(z.string()),
      enemEnabled: z.boolean(),
    }))
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!ctx.user) throw new Error("Usuário não autenticado");

      const school = await db
        .select()
        .from(schools)
        .where(eq(schools.adminId, ctx.user.id))
        .limit(1);

      if (!school.length) throw new Error("Escola não encontrada");
      const schoolId = school[0].id;

      // ── Gera login único ───────────────────────────────────────────────────
      const loginUsername = await generateUniqueLogin(db, input.fullName, input.birthDate);
      console.log(`[createStudent] Login gerado: ${loginUsername}`);

      // ── Token de aceite ────────────────────────────────────────────────────
      const acceptanceToken = nanoid(64);
      const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // ── Criar usuário ──────────────────────────────────────────────────────
      const userInsert = await db
        .insert(users)
        .values({
          openId: `student_${nanoid(10)}`,
          name: input.fullName,
          email: null,
          role: "student",
          status: "pending_approval",
          schoolId,
          groupAccess: input.groupAccess,
          firstName: input.fullName.split(" ")[0],
          birthDate: input.birthDate,
          loginUsername,                        // ✅ login gerado automaticamente
          activationToken: acceptanceToken,
          activationTokenExpires: tokenExpires,
        })
        .returning({ id: users.id })
        .execute();

      const userId = userInsert[0].id;

      // ── Criar aluno ────────────────────────────────────────────────────────
      const studentInsert = await db
        .insert(students)
        .values({
          userId,
          schoolId,
          series: input.series,
          personaName: null,
          avatarStyle: null,
          enemEnabled: input.enemEnabled,
          moderationWarnings: 0,
        })
        .returning({ id: students.id })
        .execute();

      const studentId = studentInsert[0].id;

      // ── Criar anamnese ─────────────────────────────────────────────────────
      await db
        .insert(anamnesis)
        .values({
          studentId,
          block1Completed: true,
          block2Completed: true,
          block3Completed: false,
          block4Completed: false,
          guardianName: input.guardianName,
          guardianContactWhatsapp: input.guardianContactWhatsapp,
          guardianContactEmail: input.guardianContactEmail,
          conditions: input.conditions,
          readingLevel: input.readingLevel,
          writingLevel: input.writingLevel,
          observations: input.observations || "",
          subjects: input.subjects,
          favoriteMovies: null,
          favoriteMusic: null,
          favoriteSports: null,
          favoriteFoods: null,
          favoriteAnimations: null,
          otherInterests: null,
          prohibitedThemes: [],
        })
        .execute();

      // ── Link de aceite ─────────────────────────────────────────────────────
      const baseUrl = process.env.APP_URL || "http://localhost:5173";
      const acceptanceLink = `${baseUrl}/aceite/${acceptanceToken}`;

      // ── Enviar e-mail ──────────────────────────────────────────────────────
      const emailResult = await sendStudentAcceptanceEmail({
        to: input.guardianContactEmail,
        studentName: input.fullName,
        guardianName: input.guardianName,
        acceptanceLink,
        loginUsername, // ✅ passa o login gerado para o e-mail
      });

      console.log("=== DEBUG CADASTRO ALUNO ===");
      console.log("Login gerado:", loginUsername);
      console.log("guardianEmail:", input.guardianContactEmail);
      console.log("acceptanceLink:", acceptanceLink);
      console.log("emailResult:", JSON.stringify(emailResult));
      console.log("===========================");

      return {
        success: true,
        studentId,
        userId,
        loginUsername,               // ✅ retorna o login para exibir na tela
        guardianEmail: input.guardianContactEmail,
        acceptanceLink,
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
        message: emailResult.success
          ? "Aluno criado. E-mail enviado ao responsável."
          : "Aluno criado. Falha no e-mail - use o link manual.",
      };
    }),

  // ============================================================================
  // REMOVER ALUNO
  // ============================================================================
  removeStudent: adminSchoolProcedure
    .input(z.object({ studentId: z.number() }))
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
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

      const student = await db
        .select()
        .from(students)
        .where(eq(students.id, input.studentId))
        .limit(1)
        .execute();

      if (!student.length) throw new Error("Aluno não encontrado");
      if (student[0].schoolId !== school[0].id)
        throw new Error("Aluno não pertence à sua escola");

      await db.delete(anamnesis).where(eq(anamnesis.studentId, input.studentId)).execute();
      await db.delete(chatMessages).where(eq(chatMessages.studentId, input.studentId)).execute();
      await db.delete(moderationLogs).where(eq(moderationLogs.studentId, input.studentId)).execute();
      await db.delete(students).where(eq(students.id, input.studentId)).execute();
      await db.delete(users).where(eq(users.id, student[0].userId)).execute();

      return { success: true };
    }),

  // ============================================================================
  // LISTAR ALUNOS COM STATUS
  // ============================================================================
  listStudentsWithStatus: adminSchoolProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");
    if (!ctx.user) throw new Error("Usuário não autenticado");

    const school = await db
      .select()
      .from(schools)
      .where(eq(schools.adminId, ctx.user.id))
      .limit(1);

    if (!school.length) throw new Error("Escola não encontrada");

    const studentRows = await db
      .select({
        student: students,
        user: users,
        anamnesis: anamnesis,
      })
      .from(students)
      .where(eq(students.schoolId, school[0].id))
      .innerJoin(users, eq(students.userId, users.id))
      .leftJoin(anamnesis, eq(anamnesis.studentId, students.id))
      .execute();

    return studentRows.map(({ student, user, anamnesis }) => ({
      ...student,
      fullName: user.name,
      status: user.status,
      isActive: user.status === "active",
      isPending: user.status === "pending_approval",
      loginUsername: user.loginUsername,        // ✅ incluído
      lgpdAccepted: user.lgpdAccepted,          // ✅ incluído
      lgpdAcceptedAt: user.lgpdAcceptedAt?.toISOString() ?? null, // ✅ incluído
      guardianEmail: anamnesis?.guardianContactEmail,
      guardianName: anamnesis?.guardianName,
      block3Completed: anamnesis?.block3Completed,
      activationLink: user.activationToken
        ? `${process.env.APP_URL || "http://localhost:5173"}/aceite/${user.activationToken}`
        : null,
    }));
  }),
});