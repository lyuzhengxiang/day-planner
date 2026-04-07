import { resolve } from "node:path";

export function resolveRuntimeDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl || !databaseUrl.startsWith("file:./")) {
    return databaseUrl;
  }

  const relativePath = databaseUrl.slice("file:".length);
  return `file:${resolve(
    /* turbopackIgnore: true */ process.cwd(),
    relativePath.slice(2)
  )}`;
}
