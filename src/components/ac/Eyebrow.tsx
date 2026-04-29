import type { CSSProperties, ReactNode } from "react";
import { AC } from "@/lib/design-tokens";

interface EyebrowProps {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}

export default function Eyebrow({ children, color = AC.dim, style }: EyebrowProps) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 12,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.18em",
        fontWeight: 700,
        ...style,
      }}
    >
      {children}
    </p>
  );
}
