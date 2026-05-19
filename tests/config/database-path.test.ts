import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRuntimeDatabaseUrl } from "../../src/lib/database-url.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CANONICAL_DATABASE_URL = /DATABASE_URL="file:\.\/prisma\/dev\.db"/;

test("Prisma schema reads DATABASE_URL from the environment", () => {
  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

  assert.match(schema, /url\s*=\s*env\("DATABASE_URL"\)/);
});

test(".env.example documents the canonical DATABASE_URL", () => {
  // The template must exist and point developers at the right SQLite path.
  // SECURITY: .env.example is committed; the real .env is gitignored.
  const envExample = readFileSync(resolve(root, ".env.example"), "utf8");

  assert.match(envExample, CANONICAL_DATABASE_URL);
});

test("local .env (if present) also matches the canonical DATABASE_URL", () => {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) {
    // CI doesn't ship a .env — that's expected. The previous test guards
    // the template instead.
    return;
  }
  const envFile = readFileSync(envPath, "utf8");
  assert.match(envFile, CANONICAL_DATABASE_URL);
});

test("runtime database URL resolves relative sqlite paths against the project root", () => {
  assert.equal(
    resolveRuntimeDatabaseUrl("file:./prisma/dev.db"),
    `file:${resolve(root, "prisma/dev.db")}`
  );
  assert.equal(
    resolveRuntimeDatabaseUrl("postgres://example"),
    "postgres://example"
  );
});
