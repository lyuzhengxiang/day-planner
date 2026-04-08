import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEveningWrapUpMessage,
  buildMiddayNudgeMessage,
  runEveningCron,
  runMiddayCron,
  runMorningCron,
  runWeeklyReviewCron,
} from "../../src/lib/cron.ts";

test("buildMiddayNudgeMessage only notifies when progress is below half", () => {
  assert.equal(
    buildMiddayNudgeMessage([
      { text: "Ship feature", urgency: "URGENT", completed: true },
      { text: "Reply to email", urgency: "LOW", completed: false },
    ]),
    null
  );

  const message = buildMiddayNudgeMessage([
    { text: "Ship feature", urgency: "URGENT", completed: false },
    { text: "Reply to email", urgency: "LOW", completed: false },
    { text: "Read docs", urgency: "MEDIUM", completed: true },
  ]);

  assert.match(message ?? "", /2 tasks left/i);
  assert.match(message ?? "", /Ship feature/);
});

test("buildEveningWrapUpMessage includes remaining work and review link", () => {
  const message = buildEveningWrapUpMessage(
    [
      { text: "Ship feature", completed: false },
      { text: "Read docs", completed: true },
      { text: "Plan tomorrow", completed: false },
    ],
    "http://192.168.1.10:3000"
  );

  assert.match(message ?? "", /2 still open/i);
  assert.match(message ?? "", /Ship feature/);
  assert.match(message ?? "", /Plan tomorrow/);
  assert.match(message ?? "", /192.168.1.10:3000/);
});

test("runMorningCron delegates to daily plan generation", async () => {
  let called = false;
  const deps = {
    generateDailyPlan: async () => {
      called = true;
      return { planId: 1 };
    },
    getTodayPlan: async () => null,
    generateWeeklyReflection: async () => ({ summary: "Solid week." }),
    notify: async () => ({ attempted: false, iMessage: false, email: false }),
  };

  const result = await runMorningCron(deps);

  assert.equal(called, true);
  assert.deepEqual(result, { planId: 1 });
});

test("runMiddayCron only notifies when the message builder returns content", async () => {
  let sent = "";
  const deps = {
    generateDailyPlan: async () => ({ planId: 1 }),
    getTodayPlan: async () => ({
      tasks: [
        { text: "Ship feature", urgency: "URGENT", completed: false },
        { text: "Read docs", urgency: "LOW", completed: false },
      ],
    }),
    generateWeeklyReflection: async () => ({ summary: "Solid week." }),
    notify: async (message: string) => {
      sent = message;
      return { attempted: true, iMessage: false, email: true };
    },
  };

  const result = await runMiddayCron(deps);

  assert.equal(result.notified, true);
  assert.match(result.message ?? "", /2 tasks left/i);
  assert.match(sent, /Ship feature/);
});

test("runEveningCron links back to the deployed app URL", async () => {
  let sent = "";
  const deps = {
    generateDailyPlan: async () => ({ planId: 1 }),
    getTodayPlan: async () => ({
      tasks: [{ text: "Ship feature", completed: false }],
    }),
    generateWeeklyReflection: async () => ({ summary: "Solid week." }),
    notify: async (message: string) => {
      sent = message;
      return { attempted: true, iMessage: false, email: true };
    },
  };

  const result = await runEveningCron(
    deps,
    "https://day-planner.vercel.app"
  );

  assert.equal(result.notified, true);
  assert.match(sent, /day-planner\.vercel\.app/);
});

test("runWeeklyReviewCron emails the review link", async () => {
  let sent = "";
  const deps = {
    generateDailyPlan: async () => ({ planId: 1 }),
    getTodayPlan: async () => null,
    generateWeeklyReflection: async () => ({ summary: "Solid week." }),
    notify: async (message: string) => {
      sent = message;
      return { attempted: true, iMessage: false, email: true };
    },
  };

  const result = await runWeeklyReviewCron(
    deps,
    "https://day-planner.vercel.app"
  );

  assert.deepEqual(result, { notified: true, summary: "Solid week." });
  assert.match(sent, /\/review/);
});
