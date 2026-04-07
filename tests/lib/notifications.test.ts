import test from "node:test";
import assert from "node:assert/strict";
import { buildIMessageArgs } from "../../src/lib/notifications.ts";

test("buildIMessageArgs passes phone and message as raw osascript arguments", () => {
  const phone = "+18723823360";
  const message = `Here's your plan for today.\n\n"Revenue solves all known problems."`;

  const args = buildIMessageArgs(phone, message);

  assert.deepEqual(args.slice(0, 14), [
    "-e",
    "on run argv",
    "-e",
    "set targetBuddy to item 1 of argv as text",
    "-e",
    "set outgoingMessage to item 2 of argv as text",
    "-e",
    'tell application "Messages"',
    "-e",
    'set targetService to 1st account whose service type = iMessage',
    "-e",
    "send outgoingMessage to buddy targetBuddy of targetService",
    "-e",
    "end tell",
  ]);
  assert.equal(args[14], "-e");
  assert.equal(args[15], "end run");
  assert.equal(args[16], phone);
  assert.equal(args[17], message);
});
