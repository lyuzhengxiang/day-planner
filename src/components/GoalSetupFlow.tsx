"use client";

import { useState } from "react";

interface GoalSetupFlowProps {
  onComplete: () => void;
}

type Phase = "input" | "questioning" | "review";

interface GeneratedGoal {
  text: string;
  priority: string;
}

export default function GoalSetupFlow({ onComplete }: GoalSetupFlowProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [goals, setGoals] = useState<GeneratedGoal[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!input.trim()) return;
    setLoading(true);
    const res = await fetch("/api/goals/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const data = await res.json();
    setSessionId(data.sessionId);
    setQuestion(data.question);
    setOptions(data.options);
    setQuestionNumber(1);
    setPhase("questioning");
    setLoading(false);
  }

  async function handleAnswer(index: number) {
    setLoading(true);
    const res = await fetch("/api/goals/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answer: String(index + 1) }),
    });
    const data = await res.json();

    if (data.done) {
      setGoals(data.goals);
      setPhase("review");
    } else {
      setQuestion(data.question);
      setOptions(data.options);
      setQuestionNumber(data.questionNumber);
    }
    setLoading(false);
  }

  async function handleConfirm(action: "accept" | "shuffle") {
    setLoading(true);
    const res = await fetch("/api/goals/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action, goals }),
    });
    const data = await res.json();

    if (data.reshuffled) {
      setGoals(data.goals);
    } else {
      onComplete();
    }
    setLoading(false);
  }

  if (phase === "input") {
    return (
      <div className="mt-6">
        <p className="text-sm text-gray-400 mb-3">
          What do you want to focus on this week?
        </p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="e.g., launch my saas, learn swift..."
            className="flex-1 bg-transparent border-b border-gray-700 text-sm text-gray-200 outline-none py-2"
          />
          <button
            onClick={handleStart}
            disabled={loading}
            className="text-sm text-green-500 hover:text-green-400"
          >
            {loading ? "..." : "go"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "questioning") {
    return (
      <div className="mt-6">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">
          Question {questionNumber} of 5-6
        </p>
        <p className="text-sm text-gray-300 mb-4">{question}</p>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={loading}
              className="w-full text-left flex items-center gap-3 py-2 px-3 rounded border border-gray-800 hover:border-gray-600 transition-colors"
            >
              <span className="text-green-500 text-sm w-5">{i + 1}</span>
              <span className="text-sm text-gray-300">{opt}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-gray-400 mb-4">Here&apos;s your week:</p>
      <div className="space-y-2 mb-6">
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{i + 1}.</span>
            <span className="text-gray-200 flex-1">{g.text}</span>
            <span className="text-[9px] uppercase tracking-wider text-gray-500">
              {g.priority}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleConfirm("accept")}
          disabled={loading}
          className="text-sm text-green-500 border border-green-500/30 rounded px-4 py-2 hover:bg-green-500/10"
        >
          accept
        </button>
        <button
          onClick={() => handleConfirm("shuffle")}
          disabled={loading}
          className="text-sm text-gray-400 border border-gray-700 rounded px-4 py-2 hover:border-gray-500"
        >
          shuffle
        </button>
      </div>
    </div>
  );
}
