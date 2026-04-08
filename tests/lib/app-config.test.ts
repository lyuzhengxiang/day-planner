import test from "node:test";
import assert from "node:assert/strict";
import { getAppBaseUrl } from "../../src/lib/app-config.ts";

test("getAppBaseUrl prefers APP_BASE_URL and trims the trailing slash", () => {
  assert.equal(
    getAppBaseUrl("https://day-planner.vercel.app/"),
    "https://day-planner.vercel.app"
  );
});

test("getAppBaseUrl falls back to localhost when unset", () => {
  assert.equal(getAppBaseUrl(undefined), "http://localhost:3000");
});
