import {
  adminSchoolProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { students, anamnesis, schools, users, lgpdAcceptanceLogs } from "../../drizzle/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendLgpdAcceptanceLink } from "../email-helper";
import bcrypt from "bcryptjs";

type ProcedureOpts = {
  ctx: TrpcContext;
  input?: any;
};

// ============================================================================
// HELPER: Busca studentId pelo token salvo no banco (nanoid)
// Substitui o sistema JWT que era incompatível com o schools.router.ts
// ============================================================================
async function getStudentIdFromToken(db: any, token: string): Promise<number> {
  // Busca o usuário que possui esse activation_token
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.activationToken, token))
    .limit(1)
    .execute();

  if (!userRows.length) {
    throw new Error("Link de aceite inválido ou expirado");
  }

  const user = userRows[0];

  // Verifica se o token não expirou
  if (user.activationTokenExpires && new Date(user.activationTokenExpires) < new Date()) {
    throw new Error("Este link de aceite expirou. Solicite um novo ao administrador da escola.");
  }

  // Busca o aluno vinculado ao usuário
  const studentRows = await db
    .select()
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1)
    .execute();

  if (!studentRows.length) {
    throw new Error("Aluno não encontrado para este link");
  }

  return studentRows[0].id;
}

// ============================================================================

export const studentsRouter = router({

  // ============================================================================
  // CRIAR ALUNO
  // ============================================================================
  createStudent: adminSchoolProcedure
    .input(
      z.object({
        fullName: z.string().min(3),
        birthDate: z.string(),
        series: z.enum(["1º_ano", "2º_ano", "3º_ano"]),
        groupAccess: z.enum(["reads_writes", "non_reads_writes"]),
        independentLogin: z.boolean(),
        guardianName: z.string(),
        guardianContactWhatsapp: z.string(),
        guardianContactEmail: z.string().email().optional(),
        conditions: z.array(z.string()),
        readingLevel: z.enum(["non_reader", "reads_with_difficulty", "reads_well"]),
        writingLevel: z.enum(["non_writer", "writes_with_difficulty", "writes_well"]),
        observations: z.string().optional(),
        subjects: z.array(z.string()),
        enemEnabled: z.boolean().default(false),
      })
    )
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;

      try {
        const db = await ctx.getDb();
        if (!db) throw new Error("Database not available");
        if (!ctx.user) throw new Error("Usuário não autenticado");
        if (!input) throw new Error("Input not provided");

        const school = await db
          .select()
          .from(schools)
          .where(eq(schools.adminId, ctx.user.id))
          .execute();

        if (!school.length) throw new Error("Escola não encontrada");

        const firstName = input.fullName.trim().split(" ")[0] || input.fullName;

        // ── Token como nanoid (compatível com schools.router.ts) ──────────────
        const acceptanceToken = nanoid(64);
        const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

        const { studentId } = await db.transaction(async (tx: any) => {
          const studentUserInsert = await tx
            .insert(users)
            .values({
              openId: `local_student_${nanoid(16)}`,
              name: input.fullName,
              role: "student",
              schoolId: school[0].id,
              groupAccess: input.groupAccess,
              firstName,
              birthDate: input.birthDate,
              status: "pending_approval",
              lgpdAccepted: false,
              activationToken: acceptanceToken,        // ✅ nanoid no banco
              activationTokenExpires: tokenExpires,    // ✅ expiração
            })
            .returning({ id: users.id });

          if (!studentUserInsert.length) throw new Error("Falha ao criar usuário do aluno");

          const studentUserId = studentUserInsert[0].id;

          const newStudent = await tx
            .insert(students)
            .values({
              userId: studentUserId,
              schoolId: school[0].id,
              series: input.series,
              personaName: "Gui",
              avatarStyle: "manga",
              enemEnabled: input.enemEnabled,
            })
            .returning({ id: students.id })
            .execute();

          const createdStudentId = newStudent[0]?.id;
          if (!createdStudentId) throw new Error("Falha ao criar aluno");

          await tx
            .insert(anamnesis)
            .values({
              studentId: createdStudentId,
              block1Completed: true,
              block2Completed: true,
              guardianName: input.guardianName,
              guardianContactWhatsapp: input.guardianContactWhatsapp,
              guardianContactEmail: input.guardianContactEmail,
              conditions: JSON.stringify(input.conditions),
              readingLevel: input.readingLevel,
              writingLevel: input.writingLevel,
              observations: input.observations,
              subjects: JSON.stringify(input.subjects),
            })
            .execute();

          return { studentId: createdStudentId };
        });

        const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
        const acceptanceLink = `${appBaseUrl}/aceite/${acceptanceToken}`;

        const whatsappLink = `https://wa.me/${String(input.guardianContactWhatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(
          `Olá! Segue o link para aceite LGPD do aluno ${input.fullName}: ${acceptanceLink}`
        )}`;

        if (input.guardianContactEmail) {
          await sendLgpdAcceptanceLink({
            guardianEmail: input.guardianContactEmail,
            guardianName: input.guardianName,
            studentName: input.fullName,
            acceptanceLink,
          });
        }

        return {
          success: true,
          studentId,
          acceptanceLink,
          whatsappLink,
        };
      } catch (error: unknown) {
        console.error("Erro ao criar aluno:", error);
        throw new Error(error instanceof Error ? error.message : "Erro ao criar aluno");
      }
    }),

  // Adicione dentro do studentsRouter:
  //  — limpa o token aqui, após criar a senha
  setStudentPassword: publicProcedure
  .input(z.object({
    token: z.string().min(10),
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  }))
  .mutation(async (opts: ProcedureOpts) => {
    const { ctx, input } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");
    if (!input) throw new Error("Input not provided");

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.activationToken, input.token))
      .limit(1)
      .execute();

    if (!userRows.length) {
      throw new Error("Link inválido ou senha já foi criada anteriormente.");
    }

    // Verifica expiração
    if (
      userRows[0].activationTokenExpires &&
      new Date(userRows[0].activationTokenExpires) < new Date()
    ) {
      throw new Error("Este link expirou. Solicite um novo ao administrador.");
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    await db
      .update(users)
      .set({
        loginPasswordHash: hashedPassword,
        activationToken: null,        // ✅ limpa o token só aqui
        activationTokenExpires: null,
      })
      .where(eq(users.id, userRows[0].id))
      .execute();

    return { success: true };
  }),


  // ============================================================================
  // RESOLVER TOKEN DE ACEITE
  // ✅ Agora busca pelo nanoid no banco em vez de verificar JWT
  // ============================================================================
  resolveAcceptanceToken: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!input) throw new Error("Input not provided");

      // ✅ Usa nanoid lookup no banco
      const studentId = await getStudentIdFromToken(db, input.token);

      const studentRows = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1)
        .execute();

      if (!studentRows.length) throw new Error("Aluno não encontrado para este link");

      const studentUserRows = await db
        .select()
        .from(users)
        .where(eq(users.id, studentRows[0].userId))
        .limit(1)
        .execute();

      if (!studentUserRows.length) throw new Error("Usuário do aluno não encontrado");

      if (studentUserRows[0].lgpdAccepted) {
        throw new Error("Este link de aceite já foi utilizado");
      }

      const anamnesisRows = await db
        .select()
        .from(anamnesis)
        .where(eq(anamnesis.studentId, studentId))
        .limit(1)
        .execute();

      return {
        studentId,
        studentName: studentUserRows[0].name,
        hasBlock3: Boolean(anamnesisRows[0]?.block3Completed),
      };
    }),

  // ============================================================================
  // PREENCHER BLOCO 3 (Preferências)
  // ============================================================================
  fillBlock3: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
        favoriteMovies: z.string().optional(),
        favoriteMusic: z.string().optional(),
        favoriteSports: z.string().optional(),
        favoriteFoods: z.string().optional(),
        favoriteAnimations: z.string().optional(),
        otherInterests: z.string().optional(),
        prohibitedThemes: z.array(z.string()).length(3),
      })
    )
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!input) throw new Error("Input not provided");

      // ✅ Usa nanoid lookup no banco
      const studentId = await getStudentIdFromToken(db, input.token);

      const studentRows = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1)
        .execute();

      if (!studentRows.length) throw new Error("Aluno não encontrado");

      const studentUserRows = await db
        .select()
        .from(users)
        .where(eq(users.id, studentRows[0].userId))
        .limit(1)
        .execute();

      if (!studentUserRows.length) throw new Error("Usuário do aluno não encontrado");
      if (studentUserRows[0].lgpdAccepted) throw new Error("Este link de aceite já foi utilizado");

      return await db
        .update(anamnesis)
        .set({
          block3Completed: true,
          favoriteMovies: input.favoriteMovies,
          favoriteMusic: input.favoriteMusic,
          favoriteSports: input.favoriteSports,
          favoriteFoods: input.favoriteFoods,
          favoriteAnimations: input.favoriteAnimations,
          otherInterests: input.otherInterests,
          prohibitedThemes: JSON.stringify(input.prohibitedThemes),
        })
        .where(eq(anamnesis.studentId, studentId))
        .execute();
    }),

  // ============================================================================
  // ACEITAR LGPD
  // ============================================================================
  // ✅ acceptLGPD — NÃO limpa o token aqui
acceptLGPD: publicProcedure
  .input(z.object({ token: z.string().min(10), agreementToken: z.boolean() }))
  .mutation(async (opts: ProcedureOpts) => {
    const { ctx, input } = opts;
    if (!input) throw new Error("Input not provided");
    if (!input.agreementToken) throw new Error("Você deve aceitar os termos");

    const db = await ctx.getDb();
    if (!db) throw new Error("Database not available");

    const studentId = await getStudentIdFromToken(db, input.token);

    const studentRows = await db
      .select()
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1)
      .execute();

    if (!studentRows.length) throw new Error("Aluno não encontrado");

    const studentUserRows = await db
      .select()
      .from(users)
      .where(eq(users.id, studentRows[0].userId))
      .limit(1)
      .execute();

    if (!studentUserRows.length) throw new Error("Usuário do aluno não encontrado");
    if (studentUserRows[0].lgpdAccepted) throw new Error("Este link de aceite já foi utilizado");

    await db
      .update(anamnesis)
      .set({ block3Completed: true })
      .where(eq(anamnesis.studentId, studentId))
      .execute();

    await db
      .update(users)
      .set({
        lgpdAccepted: true,
        lgpdAcceptedAt: new Date(),
        status: "active",
        // ✅ token NÃO é limpo aqui — será limpo pelo setStudentPassword
      })
      .where(eq(users.id, studentRows[0].userId))
      .execute();

    const ipAddress =
      (ctx.req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
      ctx.req.socket.remoteAddress ||
      null;
    const userAgent = ctx.req.headers["user-agent"] || null;

    await db.insert(lgpdAcceptanceLogs).values({
      userId: studentRows[0].userId,
      schoolId: studentRows[0].schoolId,
      acceptanceType: "guardian",
      ipAddress,
      userAgent,
    });

    return { success: true };
  }),

  
  // ============================================================================
  // PRIMEIRO ACESSO
  // ============================================================================
  completeFirstAccess: protectedProcedure
    .input(
      z.object({
        personaName: z.enum(["Prof. Guilherme", "Gui", "Tio Gui", "Tio Guilherme"]),
        avatarStyle: z.enum(["manga", "pixar", "android"]),
      })
    )
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!ctx.user) throw new Error("Usuário não autenticado");
      if (!input) throw new Error("Input not provided");

      const studentRows = await db
        .select()
        .from(students)
        .where(eq(students.userId, ctx.user.id))
        .limit(1)
        .execute();

      if (!studentRows.length) throw new Error("Aluno não encontrado");

      await db
        .update(students)
        .set({
          personaName: input.personaName,
          avatarStyle: input.avatarStyle,
          updatedAt: new Date(),
        })
        .where(eq(students.id, studentRows[0].id))
        .execute();

      return { success: true };
    }),

  // ============================================================================
  // PERFIL DO ALUNO PARA CHAT
  // ============================================================================
  getStudentProfile: protectedProcedure
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
});