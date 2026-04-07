"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateReflectionButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    await fetch("/api/reflect", { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="rounded-full border border-green-500/30 px-4 py-2 text-sm text-green-500 transition-colors hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "generating..." : "Generate Reflection"}
    </button>
  );
}
