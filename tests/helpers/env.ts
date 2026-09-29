// Fixed values for the test run. Imported by playwright.config.ts and by every
// helper before the database client, which reads DATABASE_PATH at import time.
// Never read from .env.local, so tests cannot touch the development database.

export const TEST_PORT = 3100;
export const BASE_URL = `http://localhost:${TEST_PORT}`;

export const TEST_ENV = {
  DATABASE_PATH: "./data/test.db",
  SESSION_SECRET: "playwright-session-secret-0123456789-abcdefghij",
  ADMIN_CODE: "playwright-admin-code",
  // Tests never write into the real ./private/documents.
  DOCUMENTS_DIR: "./data/test-documents",
} as const;

for (const [key, value] of Object.entries(TEST_ENV)) process.env[key] = value;
