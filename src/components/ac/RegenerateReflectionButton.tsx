"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AC } from "@/lib/design-tokens";

interface RegenerateReflectionButtonProps {
  variant?: "filled" | "outline";
  label?: string;
}

export default function RegenerateReflectionButton({
  variant = "outline",
  label = "Regenerate",
}: RegenerateReflectionButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/reflect", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const isFilled = variant === "filled";
  return (
    <button
      onClick={run}
      disabled={loading}
      style={{
        padding: "10px 16px",
        borderRadius: 999,
        background: isFilled ? AC.text : "rgba(255,255,255,0.06)",
        color: isFilled ? "#0a0a0a" : AC.text,
        fontSize: 13,
        fontWeight: 700,
        border: isFilled ? "none" : "1px solid rgba(255,255,255,0.1)",
        cursor: loading ? "default" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        opacity: loading ? 0.6 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      <span style={{ fontSize: 12 }}>↻</span>
      {loading ? "Generating…" : label}
    </button>
  );
}
