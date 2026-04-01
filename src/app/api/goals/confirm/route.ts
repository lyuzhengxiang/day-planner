import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { startOfWeek } from "date-fns";

interface Goal {
  text: string;
  priority: string;
}

interface Question {
  question: string;
  options: string[];
  answer: string | null;
}

export async function POST(req: NextRequest) {
  const { sessionId, action, goals } = await req.json();
  const isVoice = req.headers.get("accept") === "text/plain";

  const session = await prisma.goalSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return isVoice
      ? new Response("Session not found", {
          headers: { "Content-Type": "text/plain" },
        })
      : NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let finalGoals: Goal[] = goals;

  if (action === "shuffle") {
    const questions: Question[] = JSON.parse(session.questions);
    const qaSummary = questions
      .filter((q) => q.answer !== null)
      .map(
        (q) =>
          `Q: ${q.question}\nA: ${q.options[Number(q.answer!) - 1] || q.answer}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content:
            'Generate a DIFFERENT set of 4-6 weekly goals based on the same answers. Be creative with alternative approaches.\n\nRespond with ONLY valid JSON:\n{"goals": [{"text": "...", "priority": "URGENT|HIGH|MEDIUM|LOW"}]}',
        },
        {
          role: "user",
          content: `Initial input: ${session.initialInput}\n\n${qaSummary}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    finalGoals = JSON.parse(
      completion.choices[0].message.content || '{"goals":[]}'
    ).goals;

    if (isVoice) {
      const goalsText = finalGoals
        .map((g, i) => `${i + 1}: ${g.text}, priority ${g.priority}`)
        .join(". ");
      return new Response(
        `goals: Here's a different set. ${goalsText}. Say accept, shuffle, or edit.`,
        { headers: { "Content-Type": "text/plain" } }
      );
    }

    return NextResponse.json({
      sessionId,
      goals: finalGoals,
      reshuffled: true,
    });
  }

  // action is "accept" or "edit"
  if (action === "accept" && !finalGoals) {
    const questions: Question[] = JSON.parse(session.questions);
    const qaSummary = questions
      .filter((q) => q.answer !== null)
      .map(
        (q) =>
          `Q: ${q.question}\nA: ${q.options[Number(q.answer!) - 1] || q.answer}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content:
            'Generate 4-6 concrete weekly goals.\n\nRespond with ONLY valid JSON:\n{"goals": [{"text": "...", "priority": "URGENT|HIGH|MEDIUM|LOW"}]}',
        },
        {
          role: "user",
          content: `Initial input: ${session.initialInput}\n\n${qaSummary}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    finalGoals = JSON.parse(
      completion.choices[0].message.content || '{"goals":[]}'
    ).goals;
  }

  // Deactivate old goals
  await prisma.weeklyGoal.updateMany({
    where: { active: true },
    data: { active: false },
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const created = await Promise.all(
    finalGoals.map((g) =>
      prisma.weeklyGoal.create({
        data: {
          goalSessionId: sessionId,
          text: g.text,
          priority: g.priority,
          weekStart,
          active: true,
        },
      })
    )
  );

  await prisma.goalSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED" },
  });

  if (isVoice) {
    return new Response(
      `Done! ${created.length} goals set for this week. You're all set.`,
      { headers: { "Content-Type": "text/plain" } }
    );
  }

  return NextResponse.json({ confirmed: true, goals: created });
}
