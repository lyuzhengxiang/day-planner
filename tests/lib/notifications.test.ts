import test from "node:test";
import assert from "node:assert/strict";
import { getNotificationEmail } from "../../src/lib/notifications.ts";

test("cloud notifications only use the configured email address", () => {
  assert.equal(
    getNotificationEmail({
      emailAddress: "  me@example.com  ",
      iMessagePhone: "+18723823360",
    }),
    "me@example.com"
  );
  assert.equal(
    getNotificationEmail({
      emailAddress: "   ",
      iMessagePhone: "+18723823360",
    }),
    null
  );
});
