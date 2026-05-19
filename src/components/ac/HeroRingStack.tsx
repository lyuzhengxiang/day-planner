import type { ReactNode } from "react";
import { AC } from "@/lib/design-tokens";
import Ring from "./Ring";

interface HeroRingStackProps {
  values: [number, number, number];
  colors?: [string, string, string];
  size?: number;
  center?: ReactNode;
}

export default function HeroRingStack({
  values,
  colors = [AC.red, AC.green, AC.cyan],
  size = 280,
  center,
}: HeroRingStackProps) {
  const inset1 = 0;
  const inset2 = 32;
  const inset3 = 64;
  const stroke1 = 28;
  const stroke2 = 26;
  const stroke3 = 24;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{ position: "absolute", inset: inset1 }}>
        <Ring size={size} stroke={stroke1} value={values[0]} color={colors[0]} glow />
      </div>
      <div style={{ position: "absolute", inset: inset2 }}>
        <Ring size={size - inset2 * 2} stroke={stroke2} value={values[1]} color={colors[1]} glow />
      </div>
      <div style={{ position: "absolute", inset: inset3 }}>
        <Ring size={size - inset3 * 2} stroke={stroke3} value={values[2]} color={colors[2]} glow />
      </div>
      {center && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {center}
        </div>
      )}
    </div>
  );
}
