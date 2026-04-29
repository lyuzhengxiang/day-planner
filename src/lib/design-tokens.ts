export const AC = {
  bg: "#0a0a0a",
  shellGrad: "radial-gradient(circle at 20% 0%, #1a1a1c 0%, #0a0a0a 60%)",
  card: "rgba(28,28,30,0.7)",
  cardBorder: "rgba(255,255,255,0.06)",
  text: "#f5f5f7",
  dim: "#8e8e93",
  faint: "#48484a",
  red: "#ff375f",
  green: "#a8ff35",
  cyan: "#0ad7ff",
  orange: "#ff9f0a",
  pink: "#ff2d92",
  purple: "#bf5af2",
  yellow: "#ffd60a",
} as const;

export const URGENCY_COLOR: Record<string, string> = {
  URGENT: AC.red,
  HIGH: AC.orange,
  MEDIUM: AC.cyan,
  LOW: AC.dim,
};

export const GOAL_RING_COLORS = [AC.red, AC.green, AC.cyan, AC.orange, AC.purple] as const;

export const KIND_COLOR: Record<string, string> = {
  work: AC.cyan,
  wellness: AC.green,
  learning: AC.purple,
  default: AC.orange,
};

export function ringColorForScore(score: number): string {
  if (score >= 0.7) return AC.green;
  if (score >= 0.5) return AC.orange;
  return AC.red;
}
