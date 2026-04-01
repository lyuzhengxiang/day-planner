import { prisma } from "@/lib/prisma";
import { startOfDay, format } from "date-fns";

export async function GET() {
  const today = startOfDay(new Date());
  const plan = await prisma.dailyPlan.findUnique({
    where: { date: today },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  if (!plan) {
    return new Response("No plan generated for today yet.", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const dateStr = format(today, "EEEE, MMMM do");
  const urgent = plan.tasks.filter(
    (t) => t.urgency === "URGENT" && !t.completed
  );
  const high = plan.tasks.filter(
    (t) => t.urgency === "HIGH" && !t.completed
  );
  const remaining = plan.tasks.filter((t) => !t.completed);

  let speech = `Good morning. It's ${dateStr}. ${plan.weatherSummary} in Chicago.\n\n`;
  speech += `Your quote for today: ${plan.quote}\n\n`;
  speech += `You have ${remaining.length} tasks today. `;

  if (urgent.length > 0) {
    speech += `Your urgent ${urgent.length === 1 ? "task is" : "tasks are"}: ${urgent.map((t) => t.text).join(" and ")}. `;
  }
  if (high.length > 0) {
    speech += `High priority: ${high.map((t) => t.text).join(" and ")}. `;
  }

  speech += `\n\nYou're on a ${plan.streakCount} day streak. Let's keep it going.`;

  return new Response(speech, {
    headers: { "Content-Type": "text/plain" },
  });
}
