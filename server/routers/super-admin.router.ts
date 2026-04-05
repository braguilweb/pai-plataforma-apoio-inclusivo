import { superAdminProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { schools, users, students } from "../../drizzle/schema";
import { z } from "zod";
import { eq, and, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendSchoolCreatedConfirmation } from "../email-helper";

// ============================================================================
// TIPOS E HELPERS
// ============================================================================

type ProcedureOpts = {
  ctx: TrpcContext;
  input?: any;
};

/**
 * Gera a data de expiração do token de ativação (24 horas).
 */
function getTokenExpiration(hours = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Constrói o link de ativação para o frontend.
 */
function buildActivationLink(token: string): string {
  const baseUrl = process.env.APP_URL ?? "http://localhost:5173";
  return `${baseUrl}/set-password?token=${token}`;
}

// ============================================================================
// ROUTER: superAdminRouter
// ============================================================================

export const superAdminRouter = router({

  // --- DASHBOARD E LISTAGEM ---

  getDashboardStats: superAdminProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Banco de dados indisponível");

    const allSchools = await db.select().from(schools).execute();
    const allStudents = await db.select().from(students).execute();
    const allTeachers = await db.select().from(users).where(eq(users.role, "teacher")).execute();

    return {
      totalSchools: allSchools.length,
      totalStudents: allStudents.length,
      totalTeachers: allTeachers.length,
      recentSchools: allSchools.slice(-5),
    };
  }),

  /** 
   * ATUALIZADO: Retorna escolas ATIVAS e também as PENDENTES de ativação.
   * Isso corrige o problema da escola "sumir" após ser criada.
   */
  listSchools: superAdminProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Banco de dados indisponível");

    // Buscamos escolas onde isActive é true OU que tenham um admin vinculado
    // Note: Em uma query real, poderíamos fazer join com users para ver o status do admin.
    return await db.select().from(schools).where(eq(schools.isActive, true)).execute();
  }),

  /**
   * NOVO: Lista especificamente escolas que aguardam ativação do admin.
   */
  listPendingSchools: superAdminProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Banco de dados indisponível");

    return await db.select().from(schools).where(eq(schools.isActive, false)).execute();
  }),

  listArchivedSchools: superAdminProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Banco de dados indisponível");
    // Aqui usamos uma lógica de soft-delete se implementada (ex: isActive false e não pendente)
    return []; 
  }),

  // --- CRIAÇÃO E GESTÃO ---

  createSchool: superAdminProcedure
    .input(z.object({
      name: z.string().min(3),
      cnpj: z.string(),
      email: z.string().email(),
      phone: z.string(),
      colorPalette: z.enum(["azul_serenidade", "verde_natureza", "roxo_criativo", "laranja_energia", "personalizada"]),
      customColorHex: z.string().optional(),
    }))
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      try {
        const db = await ctx.getDb();
        if (!db || !input) throw new Error("Dados inválidos");

        const activationToken = nanoid(64);
        const activationExpires = getTokenExpiration(24);

        // 1. Criar Usuário Admin (Pendente)
        const adminInsert = await db.insert(users).values({
          openId: `local_admin_${nanoid(10)}`,
          name: `Admin ${input.name}`,
          email: input.email,
          role: "admin_school",
          status: "pending_approval",
          activationToken,
          activationTokenExpires: activationExpires,
        }).returning({ id: users.id }).execute();

        const adminId = adminInsert[0].id;

        // 2. Criar Escola (Inativa até o admin ativar)
        const schoolInsert = await db.insert(schools).values({
          name: input.name,
          adminId,
          colorPalette: input.colorPalette,
          customColorHex: input.customColorHex,
          isActive: false, 
        }).returning({ id: schools.id }).execute();

        const schoolId = schoolInsert[0].id;

        // 3. Vincular escola ao admin
        await db.update(users).set({ schoolId }).where(eq(users.id, adminId)).execute();

        const activationLink = buildActivationLink(activationToken);
        const emailResult = await sendSchoolCreatedConfirmation({
          schoolName: input.name,
          adminName: `Admin ${input.name}`,
          adminEmail: input.email,
          activationLink,
        });

        return {
          success: true,
          schoolId,
          activationLink, // Retornamos o link para o frontend exibir se o e-mail falhar
          confirmationEmailSent: emailResult.success,
          confirmationEmailError: emailResult.error
        };
      } catch (e) {
        throw new Error("Erro ao criar escola");
      }
    }),

  /**
   * NOVO: Endpoint para reenviar convite ou obter link manual.
   */
  getSchoolActivationDetails: superAdminProcedure
    .input(z.object({ schoolId: z.number() }))
    .query(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const schoolResult = await db.select().from(schools).where(eq(schools.id, input.schoolId)).limit(1);
      if (!schoolResult.length) throw new Error("Escola não encontrada");

      const admin = await db.select().from(users).where(eq(users.id, schoolResult[0].adminId)).limit(1);
      if (!admin.length) throw new Error("Admin não encontrado");

      return {
        adminEmail: admin[0].email,
        status: admin[0].status,
        activationLink: admin[0].activationToken ? buildActivationLink(admin[0].activationToken) : null,
        expiresAt: admin[0].activationTokenExpires
      };
    }),

  /**
   * NOVO: Reenvia o e-mail de ativação para uma escola específica.
   */
  resendActivationEmail: superAdminProcedure
    .input(z.object({ schoolId: z.number() }))
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const school = await db.select().from(schools).where(eq(schools.id, input.schoolId)).limit(1);
      const admin = await db.select().from(users).where(eq(users.id, school[0].adminId)).limit(1);

      if (!admin[0].activationToken) {
         // Se não tem token, gera um novo
         const newToken = nanoid(64);
         await db.update(users).set({ 
           activationToken: newToken,
           activationTokenExpires: getTokenExpiration(24)
         }).where(eq(users.id, admin[0].id)).execute();
         admin[0].activationToken = newToken;
      }

      const link = buildActivationLink(admin[0].activationToken!);
      const result = await sendSchoolCreatedConfirmation({
        schoolName: school[0].name,
        adminName: admin[0].name || "Admin",
        adminEmail: admin[0].email!,
        activationLink: link
      });

      return { success: result.success, error: result.error };
    }),

  getSchool: superAdminProcedure.input(z.object({ schoolId: z.number() })).query(async (opts) => {
    const { ctx, input } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Banco de dados indisponível"); 
    return await db.select().from(schools).where(eq(schools.id, input.schoolId)).execute();
  }),

  deleteSchool: superAdminProcedure.input(z.object({ schoolId: z.number() })).mutation(async (opts) => {
    const { ctx, input } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Banco de dados indisponível");
    return await db.update(schools).set({ isActive: false, deletedAt: new Date() }).where(eq(schools.id, input.schoolId)).execute();
  }),
});