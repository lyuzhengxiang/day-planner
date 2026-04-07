interface ProgressBarProps {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 mt-4">
      <div className="flex-1 bg-gray-800 rounded-full h-1">
        <div
          className="bg-green-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-500 text-xs">
        {completed}/{total} ({pct}%)
      </span>
    </div>
  );
}
