import bcryptjs from "bcryptjs";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// HASH E VERIFICAÇÃO DE SENHA
// ============================================================================

/** Gera o hash bcrypt de uma senha em texto plano */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

/** Verifica se uma senha em texto plano corresponde ao hash armazenado */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

// ============================================================================
// AUTENTICAÇÃO — GRUPO 1 (alunos que leem e escrevem)
// Login via loginUsername + senha
// ============================================================================

/**
 * Autentica alunos do Grupo 1 usando nome de usuário e senha.
 * NÃO usar para admins ou super admins.
 */
export async function authenticateGroup1Student(
  username: string,
  password: string
): Promise<{ success: boolean; userId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.loginUsername, username))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Usuário não encontrado" };
    }

    const user = result[0];

    if (user.status === "blocked") {
      return { success: false, error: "Conta bloqueada" };
    }

    if (!user.loginPasswordHash) {
      return { success: false, error: "Configuração de usuário inválida" };
    }

    const passwordValid = await verifyPassword(password, user.loginPasswordHash);
    if (!passwordValid) {
      return { success: false, error: "Senha incorreta" };
    }

    if (!user.lgpdAccepted) {
      return { success: false, error: "Aceite LGPD necessário" };
    }

    return { success: true, userId: user.id };
  } catch (error) {
    console.error("[auth-helper] Erro na autenticação Grupo 1:", error);
    return { success: false, error: "Falha na autenticação" };
  }
}

// ============================================================================
// AUTENTICAÇÃO — GRUPO 2 (alunos que não leem/escrevem)
// Login via primeiro nome + data de nascimento
// ============================================================================

/**
 * Autentica alunos do Grupo 2 usando primeiro nome e data de nascimento.
 * Não requer senha.
 */
export async function authenticateGroup2Student(
  firstName: string,
  birthDate: string
): Promise<{ success: boolean; userId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.firstName, firstName))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Aluno não encontrado" };
    }

    const user = result[0];

    if (user.status === "blocked") {
      return { success: false, error: "Conta bloqueada" };
    }

    if (!user.birthDate) {
      return { success: false, error: "Configuração de usuário inválida" };
    }

    const userBirthDate = new Date(user.birthDate).toISOString().split("T")[0];
    if (userBirthDate !== birthDate) {
      return { success: false, error: "Data de nascimento incorreta" };
    }

    if (!user.lgpdAccepted) {
      return { success: false, error: "Aceite LGPD necessário" };
    }

    return { success: true, userId: user.id };
  } catch (error) {
    console.error("[auth-helper] Erro na autenticação Grupo 2:", error);
    return { success: false, error: "Falha na autenticação" };
  }
}

// ============================================================================
// AUTENTICAÇÃO — ADMINISTRADORES (super_admin e admin_school)
// ===========================================================================
/**
 * Autentica administradores (super_admin e admin_school).
 * Aceita loginUsername ou email como identificador.
 */
export async function authenticateAdmin(
  identifier: string,
  password: string
): Promise<{
  success: boolean;
  userId?: number;
  role?: string;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Tenta por loginUsername primeiro
    let result = await db
      .select()
      .from(users)
      .where(eq(users.loginUsername, identifier))
      .limit(1);

    // Se não achou por username, tenta por email
    if (result.length === 0) {
      result = await db
        .select()
        .from(users)
        .where(eq(users.email, identifier))
        .limit(1);
    }

    if (result.length === 0) {
      return { success: false, error: "Usuário ou senha incorretos" };
    }

    const user = result[0];

    // Apenas admins usam este fluxo
    if (user.role !== "super_admin" && user.role !== "admin_school") {
      return { success: false, error: "Usuário ou senha incorretos" };
    }

    if (user.status === "blocked") {
      return { success: false, error: "Conta bloqueada. Entre em contato com o suporte." };
    }

    if (user.status === "pending_approval") {
      return {
        success: false,
        error: "Conta pendente de ativação. Verifique seu e-mail.",
      };
    }

    if (!user.loginPasswordHash) {
      return { success: false, error: "Senha não configurada." };
    }

    const passwordValid = await verifyPassword(password, user.loginPasswordHash);
    if (!passwordValid) {
      return { success: false, error: "Usuário ou senha incorretos" };
    }

    console.log(`[auth-helper] Admin autenticado: ${user.email} (${user.role})`);

    return { success: true, userId: user.id, role: user.role };

  } catch (error) {
    console.error("[auth-helper] Erro na autenticação de admin:", error);
    return { success: false, error: "Falha na autenticação" };
  }
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/** Gera um token simples para reset de senha */
export function generateResetToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Valida a força da senha conforme as regras da plataforma:
 * - Mínimo 8 caracteres
 * - Ao menos uma letra maiúscula
 * - Ao menos uma letra minúscula
 * - Ao menos um número
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("A senha deve ter pelo menos 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("A senha deve conter ao menos uma letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("A senha deve conter ao menos uma letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("A senha deve conter ao menos um número");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitiza o nome de usuário dos alunos do Grupo 1.
 * Remove espaços, acentos e caracteres especiais.
 * Formato esperado: somente letras minúsculas e números.
 */
export function sanitizeUsername(username: string): string {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}