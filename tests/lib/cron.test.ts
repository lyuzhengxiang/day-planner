import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEveningWrapUpMessage,
  buildMiddayNudgeMessage,
  initCron,
  resetCronForTests,
  reloadCron,
  timeToCron,
} from "../../src/lib/cron.ts";

test("timeToCron converts hh:mm to cron format", () => {
  assert.equal(timeToCron("06:30"), "30 6 * * *");
  assert.equal(timeToCron("21:05"), "5 21 * * *");
});

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

test("reloadCron stops old jobs before replacing them", async () => {
  resetCronForTests();

  const stopped: string[] = [];
  const scheduled: string[] = [];

  const scheduler = {
    schedule(expression: string) {
      scheduled.push(expression);
      return {
        stop() {
          stopped.push(expression);
        },
      };
    },
  };

  const deps = {
    getSettings: async () => ({
      morningTime: "06:30",
      middayTime: "12:30",
      eveningTime: "20:30",
      timezone: "America/Chicago",
      macLocalIp: "192.168.1.10",
    }),
    generateDailyPlan: async () => ({ planId: 1 }),
    getTodayPlan: async () => null,
    generateWeeklyReflection: async () => ({ summary: "Solid week." }),
    notify: async () => ({ attempted: false, iMessage: false, email: false }),
  };

  await initCron({ scheduler, deps });
  assert.deepEqual(scheduled, [
    "30 6 * * *",
    "30 12 * * *",
    "30 20 * * *",
    "0 18 * * 0",
  ]);

  await reloadCron({ scheduler, deps });
  assert.deepEqual(stopped, [
    "30 6 * * *",
    "30 12 * * *",
    "30 20 * * *",
    "0 18 * * 0",
  ]);
  assert.equal(scheduled.length, 8);

  resetCronForTests();
});
