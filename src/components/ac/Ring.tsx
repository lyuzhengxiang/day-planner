interface RingProps {
  size: number;
  stroke: number;
  value: number;
  color: string;
  glow?: boolean;
}

export default function Ring({ size, stroke, value, color, glow = false }: RingProps) {
  const r = size / 2 - stroke / 2 - 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const offset = c * (1 - v);
  const id = `g-${color.replace("#", "")}-${size}-${Math.round(v * 100)}`;

  return (
    <svg
      width={size}
      height={size}
      style={{
        display: "block",
        filter: glow ? `drop-shadow(0 0 14px ${color})` : "none",
      }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeOpacity="0.12"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: "stroke-dashoffset 600ms cubic-bezier(.4,0,.2,1)",
        }}
      />
    </svg>
  );
}
