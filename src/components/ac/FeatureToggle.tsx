"use client";

import { AC } from "@/lib/design-tokens";
import Toggle from "./Toggle";

interface FeatureToggleProps {
  label: string;
  sub: string;
  on: boolean;
  onClick: () => void;
  color?: string;
}

export default function FeatureToggle({
  label,
  sub,
  on,
  onClick,
  color = AC.green,
}: FeatureToggleProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      style={{
        flex: 1,
        padding: "12px 14px",
        background: on ? `${color}15` : "rgba(255,255,255,0.03)",
        border: `1px solid ${on ? `${color}55` : "rgba(255,255,255,0.06)"}`,
        borderRadius: 12,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      <Toggle on={on} onClick={onClick} color={color} />
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: AC.text }}>{label}</p>
        <p style={{ margin: 0, fontSize: 11, color: AC.dim }}>{sub}</p>
      </div>
    </div>
  );
}
