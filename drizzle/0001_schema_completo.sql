-- Migration: 0001_schema_completo
-- Description: Schema consolidado - estado atual do banco
-- Created: 2026-04-07
-- WARNING: Arquivo gerado após consolidação de migrations antigas

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
        CREATE TYPE "role" AS ENUM ('super_admin', 'admin_school', 'teacher', 'student');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'groupaccess') THEN
        CREATE TYPE "groupAccess" AS ENUM ('reads_writes', 'non_reads_writes');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status') THEN
        CREATE TYPE "status" AS ENUM ('active', 'blocked', 'pending_approval');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'colorpalette') THEN
        CREATE TYPE "colorPalette" AS ENUM ('azul_serenidade', 'verde_natureza', 'roxo_criativo', 'laranja_energia', 'personalizada');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'avatarstyle') THEN
        CREATE TYPE "avatarStyle" AS ENUM ('manga', 'pixar', 'android');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'series') THEN
        CREATE TYPE "series" AS ENUM ('1º_ano', '2º_ano', '3º_ano');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'readinglevel') THEN
        CREATE TYPE "readingLevel" AS ENUM ('non_reader', 'reads_with_difficulty', 'reads_well');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'writinglevel') THEN
        CREATE TYPE "writingLevel" AS ENUM ('non_writer', 'writes_with_difficulty', 'writes_well');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'messagetype') THEN
        CREATE TYPE "messageType" AS ENUM ('student_input', 'ai_response');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contenttype') THEN
        CREATE TYPE "contentType" AS ENUM ('text', 'image', 'audio');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'violationtype') THEN
        CREATE TYPE "violationType" AS ENUM ('inappropriate_image', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actiontaken') THEN
        CREATE TYPE "actionTaken" AS ENUM ('warning', 'blocked');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acceptancetype') THEN
        CREATE TYPE "acceptanceType" AS ENUM ('school', 'teacher', 'guardian', 'student');
    END IF;
END $$;

-- =============================================================================
-- TABELAS COM IF NOT EXISTS (Idempotente - pode rodar várias vezes sem erro)
-- =============================================================================

-- Tabela: users
CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "openId" varchar(64) NOT NULL UNIQUE,
    "name" text,
    "email" varchar(320),
    "loginMethod" varchar(64),
    "role" "role" DEFAULT 'student' NOT NULL,
    "schoolId" integer,
    "groupAccess" "groupAccess",
    "loginUsername" varchar(255),
    "loginPasswordHash" text,
    "firstName" varchar(255),
    "birthDate" date,
    "lgpdAccepted" boolean DEFAULT false NOT NULL,
    "lgpdAcceptedAt" timestamp without time zone,
    "status" "status" DEFAULT 'active' NOT NULL,
    "activation_token" varchar(255),
    "activation_token_expires" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "lastSignedIn" timestamp without time zone DEFAULT now() NOT NULL
);

-- Tabela: schools
CREATE TABLE IF NOT EXISTS "schools" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar(255) NOT NULL,
    "adminId" integer NOT NULL,
    "logoUrl" text,
    "colorPalette" "colorPalette" DEFAULT 'azul_serenidade' NOT NULL,
    "customColorHex" varchar(7),
    "lgpdAccepted" boolean DEFAULT false NOT NULL,
    "lgpdAcceptedAt" timestamp without time zone,
    "isActive" boolean DEFAULT true,
    "arquivada" boolean DEFAULT false NOT NULL,
    "dataArquivamento" timestamp without time zone,
    "deletedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

-- Tabela: students
CREATE TABLE IF NOT EXISTS "students" (
    "id" serial PRIMARY KEY NOT NULL,
    "userId" integer NOT NULL,
    "schoolId" integer NOT NULL,
    "series" "series" NOT NULL,
    "teacherId" integer,
    "personaName" varchar(255),
    "avatarStyle" "avatarStyle",
    "preferredSubjects" json,
    "enemEnabled" boolean DEFAULT false NOT NULL,
    "moderationWarnings" integer DEFAULT 0 NOT NULL,
    "blockedAt" timestamp without time zone,
    "firstAccessCompleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

-- Tabela: anamnesis
CREATE TABLE IF NOT EXISTS "anamnesis" (
    "id" serial PRIMARY KEY NOT NULL,
    "studentId" integer NOT NULL,
    "block1Completed" boolean DEFAULT false NOT NULL,
    "block2Completed" boolean DEFAULT false NOT NULL,
    "block3Completed" boolean DEFAULT false NOT NULL,
    "block4Completed" boolean DEFAULT false NOT NULL,
    "guardianName" varchar(255),
    "guardianContactWhatsapp" varchar(20),
    "guardianContactEmail" varchar(320),
    "conditions" json,
    "readingLevel" "readingLevel",
    "writingLevel" "writingLevel",
    "observations" text,
    "favoriteMovies" text,
    "favoriteMusic" text,
    "favoriteSports" text,
    "favoriteFoods" text,
    "favoriteAnimations" text,
    "otherInterests" text,
    "prohibitedThemes" json,
    "subjects" json,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

-- Tabela: chatMessages
CREATE TABLE IF NOT EXISTS "chatMessages" (
    "id" serial PRIMARY KEY NOT NULL,
    "studentId" integer NOT NULL,
    "messageType" "messageType" NOT NULL,
    "contentType" "contentType" NOT NULL,
    "content" text,
    "imageUrl" text,
    "audioUrl" text,
    "isComprehended" boolean,
    "comprehensionScore" varchar(10),
    "subjectTopic" varchar(255),
    "versionNumber" integer DEFAULT 1 NOT NULL,
    "previousVersionId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

-- Tabela: moderationLogs
CREATE TABLE IF NOT EXISTS "moderationLogs" (
    "id" serial PRIMARY KEY NOT NULL,
    "studentId" integer NOT NULL,
    "messageId" integer NOT NULL,
    "violationType" "violationType" NOT NULL,
    "warningCount" integer NOT NULL,
    "actionTaken" "actionTaken" NOT NULL,
    "guardianNotified" boolean DEFAULT false NOT NULL,
    "adminNotified" boolean DEFAULT false NOT NULL,
    "adminActionRequired" boolean DEFAULT false NOT NULL,
    "adminActionTakenAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);

-- Tabela: colorPalettes
CREATE TABLE IF NOT EXISTS "colorPalettes" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar(255) NOT NULL,
    "primaryColor" varchar(7) NOT NULL,
    "secondaryColor" varchar(7) NOT NULL,
    "backgroundColor" varchar(7) NOT NULL,
    "textColor" varchar(7) NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);

-- Tabela: lgpdAcceptanceLogs
CREATE TABLE IF NOT EXISTS "lgpdAcceptanceLogs" (
    "id" serial PRIMARY KEY NOT NULL,
    "userId" integer,
    "schoolId" integer,
    "acceptanceType" "acceptanceType" NOT NULL,
    "ipAddress" varchar(45),
    "userAgent" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);

-- =============================================================================
-- ÍNDICES (Performance)
-- =============================================================================

CREATE INDEX IF NOT EXISTS "idx_users_activation_token" ON "users"("activation_token") WHERE "activation_token" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_users_login_username" ON "users"("loginUsername") WHERE "loginUsername" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_users_school" ON "users"("schoolId") WHERE "schoolId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_schools_arquivada" ON "schools"("arquivada") WHERE "arquivada" = true;
CREATE INDEX IF NOT EXISTS "idx_students_school" ON "students"("schoolId");
CREATE INDEX IF NOT EXISTS "idx_students_teacher" ON "students"("teacherId") WHERE "teacherId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_chat_student_created" ON "chatMessages"("studentId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_moderation_pending" ON "moderationLogs"("adminActionRequired", "createdAt") WHERE "adminActionRequired" = true;