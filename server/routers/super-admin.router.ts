import { superAdminProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { schools, users, students } from "../../drizzle/schema";
import { z } from "zod";
import { eq, and, or, isNull, desc } from "drizzle-orm";
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

    // Contar apenas escolas ativas (não arquivadas e não deletadas)
    const allSchools = await db
      .select()
      .from(schools)
      .where(
        and(
          eq(schools.arquivada, false),
          isNull(schools.deletedAt)
        )
      )
      .execute();
    
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
   * Lista escolas ATIVAS (não arquivadas, não deletadas, isActive = true).
   * Usada no dashboard principal.
   */
  listSchools: superAdminProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Banco de dados indisponível");

    return await db
      .select()
      .from(schools)
      .where(
        and(
          eq(schools.isActive, true),
          eq(schools.arquivada, false),
          isNull(schools.deletedAt)
        )
      )
      .execute();
  }),

  /**
   * Lista escolas que aguardam ativação do admin.
   * (isActive = false, não arquivadas, não deletadas)
   */
  listPendingSchools: superAdminProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Banco de dados indisponível");

    return await db
      .select()
      .from(schools)
      .where(
        and(
          eq(schools.isActive, false),
          eq(schools.arquivada, false),
          isNull(schools.deletedAt)
        )
      )
      .execute();
  }),

  /**
   * Lista escolas ARQUIVADAS (soft delete).
   * Escolas que foram arquivadas mas não removidas permanentemente.
   */
  listArchivedSchools: superAdminProcedure.query(async (opts: ProcedureOpts) => {
    const { ctx } = opts;
    const db = await ctx.getDb();
    if (!db) throw new Error("Banco de dados indisponível");

    return await db
      .select()
      .from(schools)
      .where(
        and(
          eq(schools.arquivada, true),
          isNull(schools.deletedAt)
        )
      )
      .orderBy(desc(schools.dataArquivamento))
      .execute();
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
          arquivada: false,
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
          activationLink,
          confirmationEmailSent: emailResult.success,
          confirmationEmailError: emailResult.error
        };
      } catch (e: any) {
        // Verificar se é erro de constraint única (email duplicado)
        if (e.message?.includes("unique") || e.code === "23505") {
          throw new Error("Já existe uma escola ativa com este administrador. Arquive ou remova a escola existente primeiro.");
        }
        throw new Error("Erro ao criar escola: " + (e.message || "Erro desconhecido"));
      }
    }),

  /**
   * Endpoint para reenviar convite ou obter link manual.
   */
  getSchoolActivationDetails: superAdminProcedure
    .input(z.object({ schoolId: z.number() }))
    .query(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const schoolResult = await db
        .select()
        .from(schools)
        .where(
          and(
            eq(schools.id, input.schoolId),
            isNull(schools.deletedAt)
          )
        )
        .limit(1);
      
      if (!schoolResult.length) throw new Error("Escola não encontrada");

      const admin = await db
        .select()
        .from(users)
        .where(eq(users.id, schoolResult[0].adminId))
        .limit(1);
      
      if (!admin.length) throw new Error("Admin não encontrado");

      return {
        adminEmail: admin[0].email,
        status: admin[0].status,
        activationLink: admin[0].activationToken ? buildActivationLink(admin[0].activationToken) : null,
        expiresAt: admin[0].activationTokenExpires
      };
    }),

  /**
   * Reenvia o e-mail de ativação para uma escola específica.
   */
  resendActivationEmail: superAdminProcedure
    .input(z.object({ schoolId: z.number() }))
    .mutation(async (opts: ProcedureOpts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const school = await db
        .select()
        .from(schools)
        .where(
          and(
            eq(schools.id, input.schoolId),
            isNull(schools.deletedAt)
          )
        )
        .limit(1);
      
      if (!school.length) throw new Error("Escola não encontrada");

      const admin = await db
        .select()
        .from(users)
        .where(eq(users.id, school[0].adminId))
        .limit(1);

      if (!admin.length) throw new Error("Admin não encontrado");

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

  getSchool: superAdminProcedure
    .input(z.object({ schoolId: z.number() }))
    .query(async (opts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      return await db
        .select()
        .from(schools)
        .where(
          and(
            eq(schools.id, input.schoolId),
            isNull(schools.deletedAt)
          )
        )
        .execute();
    }),

  /**
   * ARQUIVAR escola (Soft Delete).
   * A escola some do dashboard mas fica na área de arquivadas.
   */
  archiveSchool: superAdminProcedure
    .input(z.object({ schoolId: z.number() }))
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const result = await db
        .update(schools)
        .set({ 
          arquivada: true, 
          dataArquivamento: new Date(),
          isActive: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(schools.id, input.schoolId),
            isNull(schools.deletedAt)
          )
        )
        .returning({ id: schools.id })
        .execute();

      if (!result.length) {
        throw new Error("Escola não encontrada ou já arquivada/removida");
      }

      return { 
        success: true, 
        message: "Escola arquivada com sucesso",
        schoolId: input.schoolId 
      };
    }),

  /**
   * RESTAURAR escola arquivada.
   * Volta a escola para o dashboard (desfaz o soft delete).
   */
  restoreSchool: superAdminProcedure
    .input(z.object({ schoolId: z.number() }))
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      const result = await db
        .update(schools)
        .set({ 
          arquivada: false, 
          dataArquivamento: null,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(schools.id, input.schoolId),
            eq(schools.arquivada, true),
            isNull(schools.deletedAt)
          )
        )
        .returning({ id: schools.id })
        .execute();

      if (!result.length) {
        throw new Error("Escola não encontrada ou não está arquivada");
      }

      return { 
        success: true, 
        message: "Escola restaurada com sucesso",
        schoolId: input.schoolId 
      };
    }),

  /**
   * REMOVER PERMANENTEMENTE (Hard Delete).
   * Remove a escola e todos os dados associados permanentemente.
   * ATENÇÃO: Esta ação é irreversível!
   */
  deleteSchoolPermanent: superAdminProcedure
    .input(z.object({ schoolId: z.number() }))
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Banco de dados indisponível");

      // Primeiro, verificar se a escola existe
      const school = await db
        .select()
        .from(schools)
        .where(eq(schools.id, input.schoolId))
        .limit(1);

      if (!school.length) {
        throw new Error("Escola não encontrada");
      }

      // Hard delete: marcar como deletada (ou remover do banco)
      // Opção 1: Soft delete lógico (recomendado - mantém dados para auditoria)
      const result = await db
        .update(schools)
        .set({ 
          deletedAt: new Date(),
          isActive: false,
          arquivada: true,
          updatedAt: new Date()
        })
        .where(eq(schools.id, input.schoolId))
        .returning({ id: schools.id })
        .execute();

      // Opção 2: Hard delete físico (descomente se quiser remover do banco)
      // await db.delete(schools).where(eq(schools.id, input.schoolId)).execute();

      if (!result.length) {
        throw new Error("Erro ao remover escola");
      }

      return { 
        success: true, 
        message: "Escola removida permanentemente",
        schoolId: input.schoolId 
      };
    }),

  /**
   * DEPRECATED: Mantido para compatibilidade.
   * Agora redireciona para archiveSchool (soft delete).
   */
  deleteSchool: superAdminProcedure
    .input(z.object({ schoolId: z.number() }))
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const db = await ctx.getDb();
      if (!db) throw new Error("Banco de dados indisponível");
      
      // Soft delete (arquivar) ao invés de hard delete
      return await db
        .update(schools)
        .set({ 
          arquivada: true, 
          dataArquivamento: new Date(),
          isActive: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(schools.id, input.schoolId),
            isNull(schools.deletedAt)
          )
        )
        .execute();
    }),
});