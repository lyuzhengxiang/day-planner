import test from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedCronRequest } from "../../src/lib/cron-auth.ts";

test("cron requests authorize with a bearer token", () => {
  const request = new Request("https://example.com/api/cron/morning", {
    headers: { Authorization: "Bearer secret-token" },
  });

  assert.equal(isAuthorizedCronRequest(request, "secret-token"), true);
  assert.equal(isAuthorizedCronRequest(request, "wrong-token"), false);
});

test("cron requests also allow a query-string secret for simple schedulers", () => {
  const request = new Request(
    "https://example.com/api/cron/morning?key=secret-token"
  );

  assert.equal(isAuthorizedCronRequest(request, "secret-token"), true);
});
