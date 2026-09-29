import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Loads KEY=VALUE pairs from .env.local into process.env without overriding
 * values already set. Must run before anything imports the database client,
 * which reads DATABASE_PATH at import time.
 */
export function loadEnvLocal(file = path.resolve(process.cwd(), ".env.local")) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rest] = match;
    let value = rest.trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
