ALTER TABLE "schools" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "deletedAt" timestamp;