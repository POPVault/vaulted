import path from "node:path";
import { defineConfig } from "drizzle-kit";

const file = path.resolve(process.env.DATABASE_PATH || "./data/vaulted.db");

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: `file:${file}` },
  strict: true,
  verbose: true,
});
