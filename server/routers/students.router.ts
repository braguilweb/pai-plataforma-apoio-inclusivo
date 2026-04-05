import {
  adminSchoolProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { students, anamnesis, schools, users } from "../../drizzle/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "../_core/env";
import { sendLgpdAcceptanceLink } from "../email-helper";
import { lgpdAcceptanceLogs } from "../../drizzle/schema";

type ProcedureOpts = {
  ctx: TrpcContext;
  input?: any;
};

const ACCEPTANCE_PURPOSE = "guardian_lgpd_acceptance";

function getTokenSecret() {
  return new TextEncoder().encode(ENV.cookieSecret || "dev-secret");
}

async function createAcceptanceToken(studentId: number) {
  return new SignJWT({ purpose: ACCEPTANCE_PURPOSE, studentId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("7d")
    .sign(getTokenSecret());
}

async function getStudentIdFromAcceptanceToken(token: string): Promise<number> {
  const { payload } = await jwtVerify(token, getTokenSecret(), {
    algorithms: ["HS256"],
  });

  if (payload.purpose !== ACCEPTANCE_PURPOSE || typeof payload.studentId !== "number") {
    throw new Error("Token de aceite inválido");
  }

  return payload.studentId;
}

export const studentsRouter = router({
  // Criar aluno (Bloco 1 + 2)
  createStudent: adminSchoolProcedure
    .input(
      z.object({
        // Bloco 1 - Identificação
        fullName: z.string().min(3),
        birthDate: z.string(),
        series: z.enum(["1º_ano", "2º_ano", "3º_ano"]),
        groupAccess: z.enum(["reads_writes", "non_reads_writes"]),
        independentLogin: z.boolean(),
        guardianName: z.string(),
        guardianContactWhatsapp: z.string(),
        guardianContactEmail: z.string().email().optional(),

        // Bloco 2 - Diagnóstico
        conditions: z.array(z.string()),
        readingLevel: z.enum(["non_reader", "reads_with_difficulty", "reads_well"]),
        writingLevel: z.enum(["non_writer", "writes_with_difficulty", "writes_well"]),
        observations: z.string().optional(),

        // Bloco 4 - Plano de Estudo
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

        const { studentId } = await db.transaction(async (tx) => {
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

        const acceptanceToken = await createAcceptanceToken(studentId);
        const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
        const acceptanceLink = `${appBaseUrl}/aceite/${acceptanceToken}`;

        const whatsappLink = `https://wa.me/${String(input.guardianContactWhatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Segue o link para aceite LGPD do aluno ${input.fullName}: ${acceptanceLink}`)}`;

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
          studentId: studentId,
          acceptanceLink,
          whatsappLink,
        };
      } catch (error: unknown) {
        console.error("Erro ao criar aluno:", error);
        throw new Error(error instanceof Error ? error.message : "Erro ao criar aluno");
      }
    }),

  resolveAcceptanceToken: publicProcedure
    .input(z.object({ token: z.string().min(10) }))
    .query(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");
      if (!input) throw new Error("Input not provided");

      const studentId = await getStudentIdFromAcceptanceToken(input.token);

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
        hasBlock3: Boolean(anamnesisRows[0]?.block3Completed),
      };
    }),

  // Preencher Bloco 3 (Preferências) pelo responsável
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

      const studentId = await getStudentIdFromAcceptanceToken(input.token);

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

  // Aceitar LGPD (responsável)
  acceptLGPD: publicProcedure
    .input(z.object({ token: z.string().min(10), agreementToken: z.boolean() }))
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;

      if (!input) throw new Error("Input not provided");
      if (!input.agreementToken) throw new Error("Você deve aceitar os termos");

      const db = await ctx.getDb();
      if (!db) throw new Error("Database not available");

      const studentId = await getStudentIdFromAcceptanceToken(input.token);

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
        .set({
          block3Completed: true,
        })
        .where(eq(anamnesis.studentId, studentId))
        .execute();

      await db
        .update(users)
        .set({
          lgpdAccepted: true,
          lgpdAcceptedAt: new Date(),
          status: "active",
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

  // Obter dados do aluno para chat
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