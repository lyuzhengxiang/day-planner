interface GoalBreakdown {
  goalId: number;
  goalText: string;
  tasksCompleted: number;
  tasksTotal: number;
}

interface ReflectionCardProps {
  tasksCompleted: number;
  tasksTotal: number;
  goalsBreakdown: GoalBreakdown[];
  carryForward: string[];
  summary: string;
}

export default function ReflectionCard({
  tasksCompleted,
  tasksTotal,
  goalsBreakdown,
  carryForward,
  summary,
}: ReflectionCardProps) {
  const pct =
    tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  return (
    <div>
      <div className="border-l-2 border-gray-700 pl-4 mb-6">
        <p className="text-sm text-gray-400 italic leading-relaxed">
          {summary}
        </p>
      </div>

      <div className="flex gap-6 mb-6">
        <div>
          <span className="text-2xl text-gray-200">{tasksCompleted}</span>
          <span className="text-sm text-gray-600">/{tasksTotal} tasks</span>
        </div>
        <div>
          <span className="text-2xl text-gray-200">{pct}%</span>
          <span className="text-sm text-gray-600"> completion</span>
        </div>
      </div>

      {goalsBreakdown.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">
            Goals Breakdown
          </h3>
          <div className="space-y-2">
            {goalsBreakdown.map((g) => {
              const gPct =
                g.tasksTotal > 0
                  ? Math.round((g.tasksCompleted / g.tasksTotal) * 100)
                  : 0;
              return (
                <div key={g.goalId} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 flex-1">
                    {g.goalText}
                  </span>
                  <div className="w-16 bg-gray-800 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${
                        gPct === 100 ? "bg-green-500" : "bg-gray-500"
                      }`}
                      style={{ width: `${gPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {g.tasksCompleted}/{g.tasksTotal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {carryForward.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">
            Carry Forward
          </h3>
          <div className="space-y-1">
            {carryForward.map((task, i) => (
              <div key={i} className="text-sm text-gray-500">
                &bull; {task}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
