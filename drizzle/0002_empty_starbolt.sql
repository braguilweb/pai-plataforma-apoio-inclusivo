CREATE TYPE "public"."acceptanceType" AS ENUM('school', 'teacher', 'guardian', 'student');--> statement-breakpoint
CREATE TYPE "public"."actionTaken" AS ENUM('warning', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."avatarStyle" AS ENUM('manga', 'pixar', 'android');--> statement-breakpoint
CREATE TYPE "public"."colorPalette" AS ENUM('azul_serenidade', 'verde_natureza', 'roxo_criativo', 'laranja_energia', 'personalizada');--> statement-breakpoint
CREATE TYPE "public"."contentType" AS ENUM('text', 'image', 'audio');--> statement-breakpoint
CREATE TYPE "public"."groupAccess" AS ENUM('reads_writes', 'non_reads_writes');--> statement-breakpoint
CREATE TYPE "public"."messageType" AS ENUM('student_input', 'ai_response');--> statement-breakpoint
CREATE TYPE "public"."readingLevel" AS ENUM('non_reader', 'reads_with_difficulty', 'reads_well');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'admin_school', 'teacher', 'student');--> statement-breakpoint
CREATE TYPE "public"."series" AS ENUM('1º_ano', '2º_ano', '3º_ano');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'blocked', 'pending_approval');--> statement-breakpoint
CREATE TYPE "public"."violationType" AS ENUM('inappropriate_image', 'other');--> statement-breakpoint
CREATE TYPE "public"."writingLevel" AS ENUM('non_writer', 'writes_with_difficulty', 'writes_well');--> statement-breakpoint
CREATE TABLE "anamnesis" (
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatMessages" (
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
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colorPalettes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"primaryColor" varchar(7) NOT NULL,
	"secondaryColor" varchar(7) NOT NULL,
	"backgroundColor" varchar(7) NOT NULL,
	"textColor" varchar(7) NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lgpdAcceptanceLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"schoolId" integer,
	"acceptanceType" "acceptanceType" NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderationLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentId" integer NOT NULL,
	"messageId" integer NOT NULL,
	"violationType" "violationType" NOT NULL,
	"warningCount" integer NOT NULL,
	"actionTaken" "actionTaken" NOT NULL,
	"guardianNotified" boolean DEFAULT false NOT NULL,
	"adminNotified" boolean DEFAULT false NOT NULL,
	"adminActionRequired" boolean DEFAULT false NOT NULL,
	"adminActionTakenAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"adminId" integer NOT NULL,
	"logoUrl" text,
	"colorPalette" "colorPalette" DEFAULT 'azul_serenidade' NOT NULL,
	"customColorHex" varchar(7),
	"lgpdAccepted" boolean DEFAULT false NOT NULL,
	"lgpdAcceptedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
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
	"blockedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
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
	"lgpdAcceptedAt" timestamp,
	"status" "status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL
);
