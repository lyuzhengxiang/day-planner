import type { CSSProperties, ReactNode } from "react";
import { AC } from "@/lib/design-tokens";

interface ACSectionHeaderProps {
  label: string;
  right?: ReactNode;
  style?: CSSProperties;
}

export default function ACSectionHeader({ label, right, style }: ACSectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "0 4px 10px",
        ...style,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 13,
          color: AC.text,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </h3>
      {right && (
        <span
          style={{
            fontSize: 12,
            color: AC.dim,
            letterSpacing: "0.08em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {right}
        </span>
      )}
    </div>
  );
}
