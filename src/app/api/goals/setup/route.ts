import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAI } from "@/lib/openai";
import {
  PROMPT_LIMITS,
  PROMPT_SAFETY_PREAMBLE,
  sanitizeUserText,
  wrapUserBlock,
} from "@/lib/prompt-safety";

export async function POST(req: NextRequest) {
  const { input } = await req.json();
  const isVoice = req.headers.get("accept") === "text/plain";
  const openai = getOpenAI();

  // SECURITY: bound the user-supplied initial input before it reaches OpenAI.
  const safeInput = sanitizeUserText(input, PROMPT_LIMITS.initialInput);
  if (safeInput.length === 0) {
    return NextResponse.json(
      { error: "input is required" },
      { status: 400 }
    );
  }

  const existingGoals = await prisma.weeklyGoal.findMany({
    where: { active: true },
    select: { text: true, priority: true },
  });

  const existingContext =
    existingGoals.length > 0
      ? wrapUserBlock(
          "existing-goals",
          existingGoals.map((g) => sanitizeUserText(g.text)).join(", ")
        )
      : "No previous goals";

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      {
        role: "system",
        content: `You are a weekly goal-setting assistant. ${PROMPT_SAFETY_PREAMBLE}

The user gives brief input about their focus. Generate the FIRST of 5-6 multiple-choice questions to understand their goals better. Each question should have 5-6 numbered options plus "Other".

${existingContext}

Respond with ONLY valid JSON:
{
  "question": "What's your main focus this week?",
  "options": ["Getting new users", "Building features", "Revenue/monetization", "Content/marketing", "Operations/admin", "Other (type your own)"]
}`,
      },
      { role: "user", content: wrapUserBlock("user-input", safeInput) },
    ],
    response_format: { type: "json_object" },
  });

  const firstQuestion = JSON.parse(
    completion.choices[0].message.content || "{}"
  );

  const session = await prisma.goalSession.create({
    data: {
      initialInput: safeInput,
      questions: JSON.stringify([
        {
          question: firstQuestion.question,
          options: firstQuestion.options,
          answer: null,
        },
      ]),
      status: "IN_PROGRESS",
    },
  });

  if (isVoice) {
    const optionsText = firstQuestion.options
      .map((o: string, i: number) => `${i + 1}: ${o}`)
      .join(". ");
    return new Response(`${firstQuestion.question}\n${optionsText}`, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ sessionId: session.id, ...firstQuestion });
}
