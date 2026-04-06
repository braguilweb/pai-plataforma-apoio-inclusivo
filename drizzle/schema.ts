import {
  serial,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  date,
  json,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// Definições de tipos enumerados usados nas tabelas abaixo.
// Alterar valores de enum exige migração cuidadosa no banco.
// ============================================================================

/** Papéis disponíveis para usuários da plataforma */
export const roleEnum = pgEnum("role", [
  "super_admin",
  "admin_school",
  "teacher",
  "student",
]);

/** Nível de acesso ao grupo (leitura/escrita) */
export const groupAccessEnum = pgEnum("groupAccess", [
  "reads_writes",
  "non_reads_writes",
]);

/**
 * Status do usuário na plataforma:
 * - active: conta ativa e operacional
 * - blocked: conta suspensa por moderação ou admin
 * - pending_approval: aguardando aprovação/ativação
 */
export const statusEnum = pgEnum("status", [
  "active",
  "blocked",
  "pending_approval",
]);

// ============================================================================
// TABELA: users
// Tabela central de autenticação e identidade de todos os usuários.
// Inclui campos para o fluxo de ativação via token (admin da escola).
// ============================================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  /** Identificador único externo, usado pelo SDK de sessão */
  openId: varchar("openId", { length: 64 }).notNull(),

  /** Nome completo do usuário */
  name: text("name"),

  /** E-mail principal (usado para login e notificações) */
  email: varchar("email", { length: 320 }),

  /** Método de autenticação utilizado (ex: "username", "google") */
  loginMethod: varchar("loginMethod", { length: 64 }),

  /** Papel do usuário na plataforma */
  role: roleEnum("role").default("student").notNull(),

  /** ID da escola vinculada (nulo para super_admin) */
  schoolId: integer("schoolId"),

  /** Nível de acesso ao grupo de leitura/escrita */
  groupAccess: groupAccessEnum("groupAccess"),

  /** Nome de usuário para login com credenciais */
  loginUsername: varchar("loginUsername", { length: 255 }),

  /** Hash bcrypt da senha (nulo até o admin definir sua senha) */
  loginPasswordHash: text("loginPasswordHash"),

  /** Primeiro nome (exibição e personalização) */
  firstName: varchar("firstName", { length: 255 }),

  /** Data de nascimento */
  birthDate: date("birthDate"),

  /** Se o usuário aceitou os termos LGPD */
  lgpdAccepted: boolean("lgpdAccepted").default(false).notNull(),

  /** Data/hora em que o usuário aceitou os termos LGPD */
  lgpdAcceptedAt: timestamp("lgpdAcceptedAt"),

  /** Status atual da conta do usuário */
  status: statusEnum("status").default("active").notNull(),

  // --------------------------------------------------------------------------
  // CAMPOS DE ATIVAÇÃO — Fluxo de primeiro acesso do admin da escola
  // Gerados no momento da criação da escola pelo super_admin.
  // Limpos após o admin definir a senha com sucesso (uso único).
  // --------------------------------------------------------------------------

  /**
   * Token seguro (nanoid 64 chars) enviado por e-mail para o admin.
   * Nulo após uso ou expiração.
   */
  activationToken: varchar("activation_token", { length: 255 }),

  /**
   * Data/hora de expiração do token de ativação.
   * Padrão: 24 horas após a criação da escola.
   * Nulo após uso ou expiração.
   */
  activationTokenExpires: timestamp("activation_token_expires"),

  // --------------------------------------------------------------------------

  /** Data/hora de criação do registro */
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  /** Data/hora da última atualização do registro */
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),

  /** Data/hora do último login realizado */
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Tipo inferido para SELECT na tabela users */
export type User = typeof users.$inferSelect;

/** Tipo inferido para INSERT na tabela users */
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// TABELA: schools
// Armazena os dados de cada escola cadastrada na plataforma.
// ============================================================================

/** Paletas de cores disponíveis para personalização da escola */
export const colorPaletteEnum = pgEnum("colorPalette", [
  "azul_serenidade",
  "verde_natureza",
  "roxo_criativo",
  "laranja_energia",
  "personalizada",
]);

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),

  /** Nome oficial da escola */
  name: varchar("name", { length: 255 }).notNull(),

  /** ID do usuário administrador responsável pela escola */
  adminId: integer("adminId").notNull(),

  /** URL do logotipo da escola (armazenado em object storage) */
  logoUrl: text("logoUrl"),

  /** Paleta de cores selecionada para a identidade visual */
  colorPalette: colorPaletteEnum("colorPalette")
    .default("azul_serenidade")
    .notNull(),

  /** Cor personalizada em hex (usado quando colorPalette = "personalizada") */
  customColorHex: varchar("customColorHex", { length: 7 }),

  /** Se os termos LGPD foram aceitos em nome da escola */
  lgpdAccepted: boolean("lgpdAccepted").default(false).notNull(),

  /** Data/hora em que o LGPD foi aceito pela escola */
  lgpdAcceptedAt: timestamp("lgpdAcceptedAt"),

  /**
   * Indica se a escola está ativa na plataforma.
   * Torna-se true após o admin concluir o fluxo de ativação.
   */
  isActive: boolean("isActive").default(true).notNull(),

  /**
   * Indica se a escola foi arquivada (soft delete).
   * Escolas arquivadas não aparecem no dashboard principal,
   * mas ficam disponíveis na área de arquivadas.
   */
  arquivada: boolean("arquivada").default(false).notNull(),

  /** Data/hora em que a escola foi arquivada */
  dataArquivamento: timestamp("dataArquivamento"),

  /**
   * Data/hora de exclusão permanente da escola (hard delete lógico).
   * Quando preenchido, indica que a escola foi removida permanentemente.
   */
  deletedAt: timestamp("deletedAt"),

  /** Data/hora de criação do registro */
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  /** Data/hora da última atualização do registro */
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/** Tipo inferido para SELECT na tabela schools */
export type School = typeof schools.$inferSelect;

/** Tipo inferido para INSERT na tabela schools */
export type InsertSchool = typeof schools.$inferInsert;

// ============================================================================
// TABELA: students
// Dados pedagógicos e de perfil dos alunos vinculados às escolas.
// ============================================================================

/** Série/ano escolar do aluno */
export const seriesEnum = pgEnum("series", [
  "1º_ano",
  "2º_ano",
  "3º_ano",
]);

/** Estilo visual do avatar gerado para o aluno */
export const avatarStyleEnum = pgEnum("avatarStyle", [
  "manga",
  "pixar",
  "android",
]);

export const students = pgTable("students", {
  id: serial("id").primaryKey(),

  /** ID do usuário base vinculado a este aluno */
  userId: integer("userId").notNull(),

  /** ID da escola em que o aluno está matriculado */
  schoolId: integer("schoolId").notNull(),

  /** Série escolar atual */
  series: seriesEnum("series").notNull(),

  /** ID do professor responsável pelo aluno (opcional) */
  teacherId: integer("teacherId"),

  /** Nome da persona/avatar do aluno na plataforma */
  personaName: varchar("personaName", { length: 255 }),

  /** Estilo do avatar escolhido */
  avatarStyle: avatarStyleEnum("avatarStyle"),

  /** Matérias favoritas (armazenado como JSON) */
  preferredSubjects: json("preferredSubjects"),

  /** Se o modo ENEM está habilitado para este aluno */
  enemEnabled: boolean("enemEnabled").default(false).notNull(),

  /** Quantidade de avisos de moderação recebidos */
  moderationWarnings: integer("moderationWarnings").default(0).notNull(),

  /** Data/hora em que o aluno foi bloqueado (se aplicável) */
  blockedAt: timestamp("blockedAt"),

  /** Data/hora de criação do registro */
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  /** Data/hora da última atualização do registro */
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/** Tipo inferido para SELECT na tabela students */
export type Student = typeof students.$inferSelect;

/** Tipo inferido para INSERT na tabela students */
export type InsertStudent = typeof students.$inferInsert;

// ============================================================================
// TABELA: anamnesis
// Ficha de anamnese do aluno, preenchida pelo professor/responsável.
// Dividida em blocos para facilitar o preenchimento progressivo.
// ============================================================================

/** Nível de leitura do aluno */
export const readingLevelEnum = pgEnum("readingLevel", [
  "non_reader",
  "reads_with_difficulty",
  "reads_well",
]);

/** Nível de escrita do aluno */
export const writingLevelEnum = pgEnum("writingLevel", [
  "non_writer",
  "writes_with_difficulty",
  "writes_well",
]);

export const anamnesis = pgTable("anamnesis", {
  id: serial("id").primaryKey(),

  /** ID do aluno ao qual esta anamnese pertence */
  studentId: integer("studentId").notNull(),

  // Controle de progresso de preenchimento por bloco
  block1Completed: boolean("block1Completed").default(false).notNull(),
  block2Completed: boolean("block2Completed").default(false).notNull(),
  block3Completed: boolean("block3Completed").default(false).notNull(),
  block4Completed: boolean("block4Completed").default(false).notNull(),

  // Dados do responsável legal
  guardianName: varchar("guardianName", { length: 255 }),
  guardianContactWhatsapp: varchar("guardianContactWhatsapp", { length: 20 }),
  guardianContactEmail: varchar("guardianContactEmail", { length: 320 }),

  /** Condições diagnósticas do aluno (JSON: CID, nome, etc.) */
  conditions: json("conditions"),

  /** Nível atual de leitura */
  readingLevel: readingLevelEnum("readingLevel"),

  /** Nível atual de escrita */
  writingLevel: writingLevelEnum("writingLevel"),

  /** Observações livres do professor/responsável */
  observations: text("observations"),

  // Preferências e interesses para personalização do conteúdo
  favoriteMovies: text("favoriteMovies"),
  favoriteMusic: text("favoriteMusic"),
  favoriteSports: text("favoriteSports"),
  favoriteFoods: text("favoriteFoods"),
  favoriteAnimations: text("favoriteAnimations"),
  otherInterests: text("otherInterests"),

  /** Temas que devem ser evitados no conteúdo gerado (JSON) */
  prohibitedThemes: json("prohibitedThemes"),

  /** Matérias e configurações pedagógicas (JSON) */
  subjects: json("subjects"),

  /** Data/hora de criação do registro */
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  /** Data/hora da última atualização do registro */
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/** Tipo inferido para SELECT na tabela anamnesis */
export type Anamnesis = typeof anamnesis.$inferSelect;

/** Tipo inferido para INSERT na tabela anamnesis */
export type InsertAnamnesis = typeof anamnesis.$inferInsert;

// ============================================================================
// TABELA: chatMessages
// Histórico de mensagens trocadas entre alunos e a IA.
// ============================================================================

/** Quem originou a mensagem */
export const messageTypeEnum = pgEnum("messageType", [
  "student_input",
  "ai_response",
]);

/** Formato do conteúdo da mensagem */
export const contentTypeEnum = pgEnum("contentType", [
  "text",
  "image",
  "audio",
]);

export const chatMessages = pgTable("chatMessages", {
  id: serial("id").primaryKey(),

  /** ID do aluno dono da conversa */
  studentId: integer("studentId").notNull(),

  /** Tipo da mensagem (do aluno ou da IA) */
  messageType: messageTypeEnum("messageType").notNull(),

  /** Formato do conteúdo */
  contentType: contentTypeEnum("contentType").notNull(),

  /** Texto da mensagem (quando contentType = "text") */
  content: text("content"),

  /** URL da imagem (quando contentType = "image") */
  imageUrl: text("imageUrl"),

  /** URL do áudio (quando contentType = "audio") */
  audioUrl: text("audioUrl"),

  /** Se o aluno compreendeu a resposta da IA */
  isComprehended: boolean("isComprehended"),

  /** Score de compreensão calculado (ex: "85%") */
  comprehensionScore: varchar("comprehensionScore", { length: 10 }),

  /** Tópico/matéria abordado na mensagem */
  subjectTopic: varchar("subjectTopic", { length: 255 }),

  /** Versão da mensagem (para controle de edições) */
  versionNumber: integer("versionNumber").default(1).notNull(),

  /** ID da versão anterior (para histórico de edições) */
  previousVersionId: integer("previousVersionId"),

  /** Data/hora de criação do registro */
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  /** Data/hora da última atualização do registro */
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/** Tipo inferido para SELECT na tabela chatMessages */
export type ChatMessage = typeof chatMessages.$inferSelect;

/** Tipo inferido para INSERT na tabela chatMessages */
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ============================================================================
// TABELA: moderationLogs
// Registro de ações de moderação tomadas sobre alunos.
// ============================================================================

/** Tipo de violação detectada */
export const violationTypeEnum = pgEnum("violationType", [
  "inappropriate_image",
  "other",
]);

/** Ação tomada em resposta à violação */
export const actionTakenEnum = pgEnum("actionTaken", [
  "warning",
  "blocked",
]);

export const moderationLogs = pgTable("moderationLogs", {
  id: serial("id").primaryKey(),

  /** ID do aluno que cometeu a violação */
  studentId: integer("studentId").notNull(),

  /** ID da mensagem que originou a violação */
  messageId: integer("messageId").notNull(),

  /** Tipo da violação detectada */
  violationType: violationTypeEnum("violationType").notNull(),

  /** Contagem de avisos acumulados até este registro */
  warningCount: integer("warningCount").notNull(),

  /** Ação executada automaticamente pelo sistema */
  actionTaken: actionTakenEnum("actionTaken").notNull(),

  /** Se o responsável foi notificado */
  guardianNotified: boolean("guardianNotified").default(false).notNull(),

  /** Se o administrador da escola foi notificado */
  adminNotified: boolean("adminNotified").default(false).notNull(),

  /** Se uma ação manual do admin ainda é necessária */
  adminActionRequired: boolean("adminActionRequired").default(false).notNull(),

  /** Data/hora em que o admin tomou uma ação manual */
  adminActionTakenAt: timestamp("adminActionTakenAt"),

  /** Data/hora de criação do registro */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Tipo inferido para SELECT na tabela moderationLogs */
export type ModerationLog = typeof moderationLogs.$inferSelect;

/** Tipo inferido para INSERT na tabela moderationLogs */
export type InsertModerationLog = typeof moderationLogs.$inferInsert;

// ============================================================================
// TABELA: colorPalettes
// Paletas de cores pré-definidas disponíveis para as escolas.
// ============================================================================
export const colorPalettes = pgTable("colorPalettes", {
  id: serial("id").primaryKey(),

  /** Nome descritivo da paleta */
  name: varchar("name", { length: 255 }).notNull(),

  /** Cor primária em hex */
  primaryColor: varchar("primaryColor", { length: 7 }).notNull(),

  /** Cor secundária em hex */
  secondaryColor: varchar("secondaryColor", { length: 7 }).notNull(),

  /** Cor de fundo em hex */
  backgroundColor: varchar("backgroundColor", { length: 7 }).notNull(),

  /** Cor do texto em hex */
  textColor: varchar("textColor", { length: 7 }).notNull(),

  /** Se esta é a paleta padrão do sistema */
  isDefault: boolean("isDefault").default(false).notNull(),

  /** Data/hora de criação do registro */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Tipo inferido para SELECT na tabela colorPalettes */
export type ColorPalette = typeof colorPalettes.$inferSelect;

/** Tipo inferido para INSERT na tabela colorPalettes */
export type InsertColorPalette = typeof colorPalettes.$inferInsert;

// ============================================================================
// TABELA: lgpdAcceptanceLogs
// Registro auditável de cada aceite dos termos LGPD na plataforma.
// ============================================================================

/** Tipo de entidade que realizou o aceite */
export const acceptanceTypeEnum = pgEnum("acceptanceType", [
  "school",
  "teacher",
  "guardian",
  "student",
]);

export const lgpdAcceptanceLogs = pgTable("lgpdAcceptanceLogs", {
  id: serial("id").primaryKey(),

  /** ID do usuário que realizou o aceite (opcional para schools) */
  userId: integer("userId"),

  /** ID da escola vinculada ao aceite (opcional para users) */
  schoolId: integer("schoolId"),

  /** Tipo de entidade que aceitou os termos */
  acceptanceType: acceptanceTypeEnum("acceptanceType").notNull(),

  /** Endereço IP no momento do aceite (IPv4 ou IPv6) */
  ipAddress: varchar("ipAddress", { length: 45 }),

  /** User-agent do navegador no momento do aceite */
  userAgent: text("userAgent"),

  /** Data/hora de criação do registro */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Tipo inferido para SELECT na tabela lgpdAcceptanceLogs */
export type LgpdAcceptanceLog = typeof lgpdAcceptanceLogs.$inferSelect;

/** Tipo inferido para INSERT na tabela lgpdAcceptanceLogs */
export type InsertLgpdAcceptanceLog = typeof lgpdAcceptanceLogs.$inferInsert;

// ============================================================================
// RELATIONS
// Define os relacionamentos entre tabelas para uso com o ORM do Drizzle.
// Usado em queries com `.with()` para joins automáticos.
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  /** Escolas em que o usuário é admin */
  schoolsAsAdmin: many(schools),

  /** Registros de alunos vinculados a este usuário */
  students: many(students),

  /** Alunos dos quais este usuário é professor */
  studentsAsTeacher: many(students),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  /** Usuário administrador da escola */
  admin: one(users, {
    fields: [schools.adminId],
    references: [users.id],
  }),

  /** Alunos matriculados na escola */
  students: many(students),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  /** Usuário base vinculado ao aluno */
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),

  /** Escola em que o aluno está matriculado */
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),

  /** Professor responsável pelo aluno */
  teacher: one(users, {
    fields: [students.teacherId],
    references: [users.id],
  }),

  /** Ficha de anamnese do aluno */
  anamnesis: one(anamnesis),

  /** Histórico de mensagens do chat */
  chatMessages: many(chatMessages),
}));

export const anamnesisRelations = relations(anamnesis, ({ one }) => ({
  /** Aluno dono desta anamnese */
  student: one(students, {
    fields: [anamnesis.studentId],
    references: [students.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  /** Aluno dono desta conversa */
  student: one(students, {
    fields: [chatMessages.studentId],
    references: [students.id],
  }),

  /** Versão anterior desta mensagem (histórico de edições) */
  previousVersion: one(chatMessages, {
    fields: [chatMessages.previousVersionId],
    references: [chatMessages.id],
  }),
}));

export const moderationLogsRelations = relations(moderationLogs, ({ one }) => ({
  /** Aluno relacionado ao registro de moderação */
  student: one(students, {
    fields: [moderationLogs.studentId],
    references: [students.id],
  }),

  /** Mensagem que originou o registro de moderação */
  message: one(chatMessages, {
    fields: [moderationLogs.messageId],
    references: [chatMessages.id],
  }),
}));