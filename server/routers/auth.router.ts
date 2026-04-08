import { z } from "zod";
import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import {
  authenticateGroup1Student,
  authenticateGroup2Student,
  authenticateAdmin,        // NOVO
  hashPassword,
  sanitizeUsername,
  validatePasswordStrength,
} from "../auth-helper";
import { getDb } from "../db";
import { users, schools, students } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";

// ============================================================================
// SCHEMAS DE VALIDAÇÃO COMPARTILHADOS
// Definidos fora dos procedures para facilitar reuso e leitura.
// ============================================================================

/**
 * Schema de validação para o endpoint de ativação de conta do admin.
 * As mesmas regras são espelhadas no frontend (SetPassword.tsx) via zod.
 *
 * Regras de senha:
 * - Mínimo 8 caracteres
 * - Ao menos uma letra maiúscula
 * - Ao menos um número
 */
const activateAdminAccountSchema = z
  .object({
    /** Token de ativação recebido via query string no link do e-mail */
    token: z.string().min(1, "Token de ativação não informado"),

    /** Nova senha escolhida pelo administrador */
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiúscula")
      .regex(/[0-9]/, "A senha deve conter ao menos um número"),

    /** Confirmação da senha (deve ser idêntica ao campo password) */
    confirmPassword: z.string(),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "As senhas não coincidem",
      path: ["confirmPassword"], // aponta o erro para o campo correto no frontend
    }
  );

// ============================================================================
// HELPER INTERNO: Criar sessão autenticada
// Reutilizado nos logins e no fluxo de ativação para evitar duplicação.
// ============================================================================

/**
 * Cria o token de sessão e define o cookie autenticado na resposta HTTP.
 * Chamado após login bem-sucedido ou ativação de conta.
 *
 * @param ctx    - Contexto tRPC com req/res
 * @param openId - Identificador único do usuário no SDK de sessão
 * @param name   - Nome do usuário para o payload do token
 */
async function createAuthSession(
  ctx: { req: any; res: any },
  openId: string,
  name: string
): Promise<void> {
  const sessionToken = await sdk.createSessionToken(openId, {
    name,
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(ctx.req);

  ctx.res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });
}

// ============================================================================
// ROUTER: authRouter
// Rotas públicas e protegidas de autenticação da plataforma.
// ============================================================================

export const authRouter = router({

  // ==========================================================================
  // LOGIN — GRUPO 1 (leitores/escritores)
  // Autenticação via username + senha
  // ==========================================================================

  /**
   * Login para alunos do Grupo 1 (leem e escrevem).
   * Valida as credenciais e cria a sessão autenticada via cookie.
   */
  loginGroup1: publicProcedure
  .input(
    z.object({
      username: z.string().min(3),
      password: z.string().min(6),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const result = await authenticateGroup1Student(
      input.username,
      input.password
    );

    if (!result.success) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: result.error || "Credenciais inválidas",
      });
    }

    // Criar cookie de sessão
    try {
      const db = await getDb();
      if (db && result.userId) {
        const found = await db
          .select()
          .from(users)
          .where(eq(users.id, result.userId))
          .limit(1);

        if (found.length > 0 && found[0].openId) {
          await createAuthSession(ctx, found[0].openId, found[0].name || "");
        }

        // ✅ BUSCAR DADOS DO STUDENT para verificar primeiro acesso
        const student = await db
          .select({
            firstAccessCompleted: students.firstAccessCompleted,
            personaName: students.personaName,
            avatarStyle: students.avatarStyle,
          })
          .from(students)
          .where(eq(students.userId, result.userId))
          .limit(1)
          .then(rows => rows[0] || null);

        return {
          success: true,
          userId: result.userId,
          firstAccessCompleted: student?.firstAccessCompleted ?? false,
          personaName: student?.personaName ?? null,
          avatarStyle: student?.avatarStyle ?? null,
        };
      }
    } catch (err) {
      console.error(
        "[auth] Falha ao criar cookie de sessão após loginGroup1:",
        err
      );
    }

    // Fallback se der erro no try
    return {
      success: true,
      userId: result.userId,
      firstAccessCompleted: false,
      personaName: null,
      avatarStyle: null,
    };
  }),
  

  // ==========================================================================
  // LOGIN — GRUPO 2 (não-leitores/não-escritores)
  // Autenticação via primeiro nome + data de nascimento (sem senha)
  // ==========================================================================

  /**
   * Login para alunos do Grupo 2 (não leem nem escrevem).
   * Valida primeiro nome + data de nascimento e cria sessão autenticada.
   */
    loginGroup2: publicProcedure
    .input(
      z.object({
        firstName: z.string().min(2),
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await authenticateGroup2Student(
        input.firstName,
        input.birthDate
      );

      if (!result.success || !result.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: result.error || "Dados de acesso inválidos",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      const found = await db
        .select()
        .from(users)
        .where(eq(users.id, result.userId))
        .limit(1);

      const user = found[0];

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado na base de dados",
        });
      }

      // Cria a sessão com o usuário encontrado
      if (user.openId) {
        await createAuthSession(ctx, user.openId, user.name || "");
      }

      // Agora o TypeScript sabe que 'user' existe aqui.
      // O 'as any' é usado para campos que podem não estar definidos no tipo do Schema
      return {
        success: true,
        userId: user.id,
        role: user.role,
        name: user.name,
        personaName: (user as any).personaName || null,
        avatarStyle: (user as any).avatarStyle || null,
      };
    }),

  /**
 * Login para administradores (super_admin e admin_school).
 * Autentica via e-mail + senha — fluxo separado dos alunos.
 * 
 * O super_admin após autenticar é redirecionado para /super-admin/dashboard.
 * O admin_school após autenticar é redirecionado para /escola/dashboard.
 */
loginAdmin: publicProcedure
  .input(
    z.object({
      // Aceita username ou email — sem z.string().email()
      email:    z.string().min(1, "Usuário obrigatório"),
      password: z.string().min(1, "Senha obrigatória"),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const result = await authenticateAdmin(input.email, input.password);

    if (!result.success) {
      throw new TRPCError({
        code:    "UNAUTHORIZED",
        message: result.error || "Credenciais inválidas",
      });
    }

    try {
      const db = await getDb();
      if (db && result.userId) {
        const found = await db
          .select()
          .from(users)
          .where(eq(users.id, result.userId))
          .limit(1);

        if (found.length > 0 && found[0].openId) {
          await createAuthSession(ctx, found[0].openId, found[0].name || "");
        }
      }
    } catch (err) {
      console.error("[auth] Falha ao criar sessão após loginAdmin:", err);
    }

    return {
      success: true,
      userId:  result.userId,
      role:    result.role,
    };
}),  
  
  // ==========================================================================
  // DEFINIR SENHA — Grupo 1 (primeiro acesso ou reset manual)
  // NÃO confundir com activateAdminAccount — este é para alunos.
  // ==========================================================================

  /**
   * Define ou redefine a senha de um aluno do Grupo 1.
   * Usado no primeiro acesso ou em resets manuais pelo admin.
   */
  setPassword: publicProcedure
    .input(
      z.object({
        username:   z.string().min(3),
        password:   z.string().min(8),
        resetToken: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const validation = validatePasswordStrength(input.password);

      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.errors.join("; "),
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      const sanitized     = sanitizeUsername(input.username);
      const hashedPassword = await hashPassword(input.password);

      try {
        const result = await db
          .select()
          .from(users)
          .where(eq(users.loginUsername, sanitized))
          .limit(1);

        if (result.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuário não encontrado",
          });
        }

        await db
          .update(users)
          .set({
            loginPasswordHash: hashedPassword,
            updatedAt:         new Date(),
          })
          .where(eq(users.id, result[0].id));

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[auth] Falha ao definir senha do aluno:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao definir senha",
        });
      }
    }),

  // ==========================================================================
  // ATIVAR CONTA DO ADMIN DA ESCOLA — Novo endpoint
  //
  // Fluxo:
  //  1. Admin recebe e-mail com link /set-password?token=<token>
  //  2. Frontend chama este endpoint com o token e a nova senha
  //  3. Backend valida o token (existe e não expirou)
  //  4. Hash da senha é salvo, token é removido, conta é ativada
  //  5. Escola vinculada também é ativada (isActive: true)
  //  6. Sessão autenticada é criada automaticamente (auto-login)
  //  7. Frontend redireciona para o dashboard ou para completar o perfil
  // ==========================================================================

  /**
   * Ativa a conta de um administrador de escola via token de ativação.
   *
   * - Token é de uso único: limpo após ativação bem-sucedida.
   * - Token tem validade de 24 horas (definida no createSchool).
   * - Após ativar, faz o auto-login criando o cookie de sessão.
   * - A escola vinculada também é marcada como ativa.
   */
  activateAdminAccount: publicProcedure
    .input(activateAdminAccountSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      const now = new Date();

      // ──────────────────────────────────────────────────────────────────────
      // PASSO 1: Buscar usuário pelo token de ativação
      //
      // Condições da query:
      //  - activationToken deve ser exatamente igual ao token recebido
      //  - activationTokenExpires deve ser maior que "agora" (não expirado)
      //
      // Se nenhum resultado: token inválido ou já utilizado/expirado.
      // ──────────────────────────────────────────────────────────────────────
      let user;

      try {
        const result = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.activationToken, input.token),
              gt(users.activationTokenExpires, now) // token ainda dentro da validade
            )
          )
          .limit(1);

        user = result[0];
      } catch (error) {
        console.error("[auth] Erro ao buscar usuário pelo token de ativação:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao validar token de ativação",
        });
      }

      // Token não encontrado ou expirado
      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Link de ativação inválido ou expirado. " +
            "Solicite um novo link ao suporte.",
        });
      }

      console.log(
        `[auth] Token de ativação válido para usuário ID ${user.id} (${user.email})`
      );

      // ──────────────────────────────────────────────────────────────────────
      // PASSO 2: Gerar hash da nova senha
      //
      // hashPassword usa bcrypt com salt rounds adequados (definido em auth-helper).
      // Nunca armazenamos a senha em texto plano.
      // ──────────────────────────────────────────────────────────────────────
      const hashedPassword = await hashPassword(input.password);

      // ──────────────────────────────────────────────────────────────────────
      // PASSO 3: Atualizar o usuário — ativar conta e limpar o token
      //
      // Ações realizadas em um único UPDATE:
      //  - loginPasswordHash: salva o hash da nova senha
      //  - activationToken: null → token de uso único, descartado após uso
      //  - activationTokenExpires: null → sem validade pendente
      //  - status: "active" → conta ativa na plataforma
      //  - updatedAt: registra a data/hora da ativação
      // ──────────────────────────────────────────────────────────────────────
      try {
        await db
          .update(users)
          .set({
            loginPasswordHash:      hashedPassword,
            activationToken:        null, // token invalidado após uso (uso único)
            activationTokenExpires: null, // limpa expiração junto com o token
            status:                 "active",
            updatedAt:              now,
          })
          .where(eq(users.id, user.id));

        console.log(
          `[auth] Usuário ID ${user.id} ativado com sucesso (status: active)`
        );
      } catch (error) {
        console.error("[auth] Erro ao ativar conta do admin:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao ativar conta. Tente novamente.",
        });
      }

      // ──────────────────────────────────────────────────────────────────────
      // PASSO 4: Ativar a escola vinculada ao admin
      //
      // A escola foi criada com isActive: false no createSchool.
      // Só ativamos se ainda estiver inativa para evitar sobrescrever
      // uma escola que o admin possa ter desativado manualmente depois.
      // ──────────────────────────────────────────────────────────────────────
      if (user.schoolId) {
        try {
          await db
            .update(schools)
            .set({
              isActive:  true,
              updatedAt: now,
            })
            .where(
              and(
                eq(schools.id, user.schoolId),
                eq(schools.isActive, false) // só atualiza se ainda estiver inativa
              )
            );

          console.log(
            `[auth] Escola ID ${user.schoolId} ativada junto com a conta do admin`
          );
        } catch (error) {
          // Não lança exceção — a conta do admin foi ativada com sucesso.
          // A ativação da escola pode ser feita manualmente pelo super admin.
          console.warn(
            `[auth] Aviso: Falha ao ativar escola ID ${user.schoolId}:`,
            error
          );
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // PASSO 5: Auto-login — criar sessão autenticada automaticamente
      //
      // Após definir a senha, o admin já está autenticado.
      // Isso evita que ele precise fazer login manual logo em seguida,
      // melhorando a experiência de primeiro acesso.
      // ──────────────────────────────────────────────────────────────────────
      try {
        if (user.openId) {
          await createAuthSession(ctx, user.openId, user.name || "");

          console.log(
            `[auth] Sessão criada automaticamente para ${user.email} após ativação`
          );
        }
      } catch (err) {
        // Não lança exceção — a conta foi ativada com sucesso.
        // O admin conseguirá fazer login normalmente pela tela de login.
        console.warn(
          "[auth] Aviso: Falha ao criar sessão automática após ativação:",
          err
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // PASSO 6: Retornar dados para o frontend
      //
      // O frontend usa o email para pré-preencher a tela de login
      // caso o auto-login falhe, e o nome para exibir uma mensagem
      // de boas-vindas personalizada.
      // ──────────────────────────────────────────────────────────────────────
      return {
        success:  true,
        email:    user.email,
        name:     user.name,
        schoolId: user.schoolId,
        message:  "Conta ativada com sucesso! Bem-vindo(a) à Plataforma PAI.",
      };
    }),

  // ==========================================================================
  // ME — Usuário atual
  // ==========================================================================

  /**
   * Retorna os dados do usuário autenticado na sessão atual.
   * Retorna null se não houver sessão ativa.
   */
  me: publicProcedure.query(async ({ ctx }) => {
  if (!ctx.user) return null;

  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Banco de dados indisponível",
    });
  }

  const foundUser = await db
    .select()
    .from(users)
    .where(eq(users.id, ctx.user.id))
    .limit(1);

  const user = foundUser[0];

  if (!user) return null;

  // Para usuários que não são alunos, retorna normalmente
  if (user.role !== "student") {
    return user;
  }

  // Se for aluno, busca os dados complementares na tabela students
  const foundStudent = await db
    .select()
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1);

  const student = foundStudent[0];

  return {
    ...user,
    firstAccessCompleted: student?.firstAccessCompleted ?? false,
    personaName: student?.personaName ?? null,
    avatarStyle: student?.avatarStyle ?? null,
  };
  }),

  // ==========================================================================
  // LOGOUT
  // ==========================================================================

  /**
   * Encerra a sessão do usuário autenticado.
   * Remove o cookie de sessão da resposta HTTP.
   */
  logout: protectedProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);

    try {
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      console.log("[auth] Sessão encerrada com sucesso");
    } catch (err) {
      // Loga o erro mas não falha o logout para não prender o usuário
      console.error("[auth] Falha ao limpar cookie de sessão no logout:", err);
    }

    return { success: true };
  }),

  // ==========================================================================
  // CHECK USERNAME AVAILABLE — Disponibilidade de username
  // ==========================================================================

  /**
   * Verifica se um nome de usuário está disponível para cadastro.
   * Usado no formulário de registro de alunos do Grupo 1.
   */
  checkUsernameAvailable: publicProcedure
    .input(z.object({ username: z.string().min(3) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Banco de dados indisponível",
        });
      }

      const sanitized = sanitizeUsername(input.username);

      try {
        const result = await db
          .select()
          .from(users)
          .where(eq(users.loginUsername, sanitized))
          .limit(1);

        return { available: result.length === 0 };
      } catch (error) {
        console.error("[auth] Falha ao verificar disponibilidade de username:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao verificar disponibilidade",
        });
      }
    }),
});