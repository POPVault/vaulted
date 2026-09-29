import path from "node:path";
import { pathToFileURL } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";
import { client, db, dbReady } from "./client";

export async function runMigrations(): Promise<void> {
  await dbReady;
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });
}

const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  runMigrations()
    .then(() => {
      console.log("Migrations applied.");
      client.close();
    })
    .catch((error: unknown) => {
      console.error(error);
      client.close();
      process.exit(1);
    });
}
