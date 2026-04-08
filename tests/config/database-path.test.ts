import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("Prisma schema uses PostgreSQL via DATABASE_URL", () => {
  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");

  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.match(schema, /url\s*=\s*env\("DATABASE_URL"\)/);
});

test("env example documents cloud deployment variables", () => {
  const envFile = readFileSync(resolve(root, ".env.example"), "utf8");

  assert.match(envFile, /DATABASE_URL="postgresql:\/\//);
  assert.match(envFile, /APP_BASE_URL=/);
  assert.match(envFile, /CRON_SECRET=/);
});
