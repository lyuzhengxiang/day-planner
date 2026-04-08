import test from "node:test";
import assert from "node:assert/strict";
import {
  getEventsForDate,
  needsContactSetup,
  parseDayParam,
  summarizeTasks,
} from "../../src/lib/planner.ts";

test("summarizeTasks counts totals and percentage", () => {
  assert.deepEqual(
    summarizeTasks([
      { completed: true },
      { completed: false },
      { completed: true },
    ]),
    {
      completed: 2,
      percentage: 67,
      remaining: 1,
      total: 3,
    }
  );
});

test("getEventsForDate filters and sorts recurring events for a date", () => {
  const events = getEventsForDate(
    [
      {
        title: "Late class",
        daysOfWeek: "2,4",
        startTime: "15:00",
        endTime: "16:00",
      },
      {
        title: "Morning lab",
        daysOfWeek: "2",
        startTime: "09:00",
        endTime: "10:00",
      },
      {
        title: "Wrong day",
        daysOfWeek: "1",
        startTime: "08:00",
        endTime: "09:00",
      },
    ],
    new Date("2026-04-07T12:00:00.000Z")
  );

  assert.deepEqual(events.map((event) => event.title), [
    "Morning lab",
    "Late class",
  ]);
});

test("needsContactSetup only returns false once an email exists", () => {
  assert.equal(needsContactSetup(null), true);
  assert.equal(
    needsContactSetup({ iMessagePhone: "", emailAddress: "  " }),
    true
  );
  assert.equal(
    needsContactSetup({ iMessagePhone: "+18723823360", emailAddress: "  " }),
    true
  );
  assert.equal(
    needsContactSetup({ iMessagePhone: "", emailAddress: "me@example.com" }),
    false
  );
});

test("parseDayParam only accepts yyyy-mm-dd values", () => {
  const parsed = parseDayParam("2026-04-07");

  assert.ok(parsed);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 3);
  assert.equal(parsed.getDate(), 7);
  assert.equal(parseDayParam("04-07-2026"), null);
  assert.equal(parseDayParam("2026-99-99"), null);
});
