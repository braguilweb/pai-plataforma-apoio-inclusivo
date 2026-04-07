ALTER TABLE "schools" ADD COLUMN "arquivada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "dataArquivamento" timestamp;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "firstAccessCompleted" boolean DEFAULT false NOT NULL;