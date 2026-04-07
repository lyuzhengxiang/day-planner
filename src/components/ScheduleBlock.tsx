interface Event {
  title: string;
  startTime: string;
  endTime: string;
}

interface ScheduleBlockProps {
  events: Event[];
}

export default function ScheduleBlock({ events }: ScheduleBlockProps) {
  if (events.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
        Schedule
      </h3>
      {events.map((e, i) => (
        <div key={i} className="flex items-center gap-2 py-1 text-xs text-gray-500">
          <span className="text-gray-600">
            {e.startTime}&ndash;{e.endTime}
          </span>
          <span>{e.title}</span>
          <span className="text-gray-700">(recurring)</span>
        </div>
      ))}
    </div>
  );
}
