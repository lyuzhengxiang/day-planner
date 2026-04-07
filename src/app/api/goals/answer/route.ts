import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAI } from "@/lib/openai";

interface Question {
  question: string;
  options: string[];
  answer: string | null;
}

export async function POST(req: NextRequest) {
  const { sessionId, answer } = await req.json();
  const isVoice = req.headers.get("accept") === "text/plain";
  const openai = getOpenAI();

  const session = await prisma.goalSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.status !== "IN_PROGRESS") {
    const msg = "Session not found or already completed";
    return isVoice
      ? new Response(msg, { headers: { "Content-Type": "text/plain" } })
      : NextResponse.json({ error: msg }, { status: 404 });
  }

  const questions: Question[] = JSON.parse(session.questions);
  const currentQ = questions[questions.length - 1];
  currentQ.answer = answer;

  const answeredCount = questions.filter((q) => q.answer !== null).length;

  if (answeredCount >= 5) {
    const qaSummary = questions
      .map(
        (q) =>
          `Q: ${q.question}\nA: ${q.options[Number(q.answer) - 1] || q.answer}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: `Based on the user's answers, generate 4-6 concrete weekly goals with priorities. Be specific and actionable.

Respond with ONLY valid JSON:
{
  "goals": [
    { "text": "goal description", "priority": "URGENT|HIGH|MEDIUM|LOW" }
  ]
}`,
        },
        {
          role: "user",
          content: `Initial input: ${session.initialInput}\n\n${qaSummary}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      completion.choices[0].message.content || '{"goals":[]}'
    );

    await prisma.goalSession.update({
      where: { id: sessionId },
      data: { questions: JSON.stringify(questions) },
    });

    if (isVoice) {
      const goalsText = result.goals
        .map(
          (g: { text: string; priority: string }, i: number) =>
            `${i + 1}: ${g.text}, priority ${g.priority}`
        )
        .join(". ");
      return new Response(
        `goals: Here's your week. ${goalsText}. Say accept, shuffle, or edit.`,
        { headers: { "Content-Type": "text/plain" } }
      );
    }

    return NextResponse.json({ sessionId, done: true, goals: result.goals });
  }

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
        content: `You are helping the user set weekly goals. Generate question ${answeredCount + 1} of 5-6. Make it specific based on previous answers. 5-6 multiple choice options.

Respond with ONLY valid JSON:
{
  "question": "...",
  "options": ["...", "...", "...", "...", "...", "Other"]
}`,
      },
      {
        role: "user",
        content: `Initial input: ${session.initialInput}\n\nPrevious:\n${qaSummary}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const nextQ = JSON.parse(completion.choices[0].message.content || "{}");

  questions.push({ question: nextQ.question, options: nextQ.options, answer: null });

  await prisma.goalSession.update({
    where: { id: sessionId },
    data: { questions: JSON.stringify(questions) },
  });

  if (isVoice) {
    const optionsText = nextQ.options
      .map((o: string, i: number) => `${i + 1}: ${o}`)
      .join(". ");
    return new Response(`${nextQ.question}\n${optionsText}`, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({
    sessionId,
    ...nextQ,
    questionNumber: answeredCount + 1,
  });
}
