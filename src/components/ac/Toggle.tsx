"use client";

import { AC } from "@/lib/design-tokens";

interface ToggleProps {
  on: boolean;
  onClick?: () => void;
  color?: string;
  disabled?: boolean;
}

export default function Toggle({ on, onClick, color = AC.green, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={on}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: on ? color : "rgba(255,255,255,0.1)",
        border: "none",
        position: "relative",
        cursor: disabled ? "default" : "pointer",
        boxShadow: on ? `0 0 10px ${color}` : "none",
        transition: "background 200ms",
        padding: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: 10,
          background: AC.text,
          transition: "left 200ms",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}
