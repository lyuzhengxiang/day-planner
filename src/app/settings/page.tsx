import { connection } from "next/server";
import RecurringManager from "@/components/RecurringManager";
import SettingsForm from "@/components/SettingsForm";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  await connection();

  const [settings, recurringEvents] = await Promise.all([
    prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    }),
    prisma.recurringEvent.findMany({
      orderBy: [{ active: "desc" }, { startTime: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      <section className="rounded-[28px] border border-gray-800/80 bg-black/25 px-6 py-6">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
          Settings
        </p>
        <h1 className="mt-3 text-3xl text-gray-100">Delivery and timing</h1>
        <p className="mt-3 text-sm leading-7 text-gray-400">
          Notification delivery stays local-first: iMessage on your Mac, email
          as fallback, and a local network URL for Siri Shortcuts.
        </p>

        <div className="mt-6">
          <SettingsForm initial={settings} />
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-800/80 bg-black/25 px-6 py-6">
        <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">
          Fixed Schedule
        </p>
        <h2 className="mt-3 text-2xl text-gray-100">Recurring events</h2>
        <p className="mt-3 text-sm leading-7 text-gray-400">
          These blocks are injected into the daily planner so generated tasks
          land around the parts of the day you cannot move.
        </p>

        <div className="mt-6">
          <RecurringManager initialEvents={recurringEvents} />
        </div>
      </section>
    </div>
  );
}
