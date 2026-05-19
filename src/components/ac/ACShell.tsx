import type { ReactNode } from "react";
import { AC } from "@/lib/design-tokens";
import ACNav from "./ACNav";

interface ACShellProps {
  children: ReactNode;
}

export default function ACShell({ children }: ACShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: AC.shellGrad,
        color: AC.text,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <ACNav />
      <div
        style={{
          padding: "24px 48px 56px",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
