import type { CSSProperties, ReactNode } from "react";
import { AC } from "@/lib/design-tokens";

interface ACCardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export default function ACCard({ children, style, className }: ACCardProps) {
  return (
    <div
      className={className}
      style={{
        background: AC.card,
        border: `1px solid ${AC.cardBorder}`,
        borderRadius: 24,
        padding: "20px 22px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
