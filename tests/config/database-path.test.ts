import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRuntimeDatabaseUrl } from "../../src/lib/database-url.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("Prisma schema reads DATABASE_URL from the environment", () => {
  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

  assert.match(schema, /url\s*=\s*env\("DATABASE_URL"\)/);
});

test("default DATABASE_URL points at the canonical prisma/dev.db file", () => {
  const envFile = readFileSync(resolve(root, ".env"), "utf8");

  assert.match(envFile, /DATABASE_URL="file:\.\/prisma\/dev\.db"/);
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
