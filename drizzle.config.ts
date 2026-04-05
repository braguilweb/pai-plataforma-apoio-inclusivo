import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Explicitly load .env.local so CLI tools (drizzle-kit) see the DATABASE_URL
dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
