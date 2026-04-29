import { AC } from "@/lib/design-tokens";

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

export default function Field({ label, value, mono = false }: FieldProps) {
  return (
    <div style={{ marginTop: 14 }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: AC.dim,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <div
        style={{
          marginTop: 6,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10,
          fontSize: 13,
          color: AC.text,
          fontFamily: mono
            ? "var(--font-mono), ui-monospace, SFMono-Regular, monospace"
            : "inherit",
        }}
      >
        {value}
      </div>
    </div>
  );
}
