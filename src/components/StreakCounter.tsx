interface StreakCounterProps {
  count: number;
}

export default function StreakCounter({ count }: StreakCounterProps) {
  if (count === 0) return null;
  return <span className="text-xs text-gray-500">{count} day streak</span>;
}
