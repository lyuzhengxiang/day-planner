"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GenerateButtonProps {
  label?: string;
  small?: boolean;
}

export default function GenerateButton({
  label = "Generate Today's Plan",
  small = false,
}: GenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    await fetch("/api/generate", { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  if (small) {
    return (
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="text-[10px] text-gray-600 hover:text-gray-400 uppercase tracking-wider"
      >
        {loading ? "generating..." : label}
      </button>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="mt-4 text-sm text-green-500 hover:text-green-400 border border-green-500/30 rounded px-4 py-2"
    >
      {loading ? "generating..." : label}
    </button>
  );
}
