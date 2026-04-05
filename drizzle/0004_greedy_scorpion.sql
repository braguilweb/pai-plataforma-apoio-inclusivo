ALTER TABLE "users" ADD COLUMN "activation_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activation_token_expires" timestamp;