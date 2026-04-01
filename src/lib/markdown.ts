import { writeFileSync, mkdirSync } from "fs";
import { format } from "date-fns";
import path from "path";

interface MarkdownTask {
  text: string;
  urgency: string;
  completed: boolean;
  rolledOver: boolean;
}

interface ScheduleItem {
  title: string;
  startTime: string;
  endTime: string;
}

interface MarkdownData {
  date: Date;
  weather: string;
  quote: string;
  schedule: ScheduleItem[];
  tasks: MarkdownTask[];
}

export function generateMarkdown(data: MarkdownData): string {
  const { date, weather, quote, schedule, tasks } = data;

  const dateStr = format(date, "EEEE, MMMM d, yyyy");
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const filledBlocks = total > 0 ? Math.round((completed / total) * 16) : 0;
  const progressBar =
    "\u2588".repeat(filledBlocks) + "\u2591".repeat(16 - filledBlocks);

  let md = `# ${dateStr}\n`;
  md += `> Chicago \u2014 ${weather}\n\n`;
  md += `> "${quote}"\n\n`;

  if (schedule.length > 0) {
    md += `## Schedule\n`;
    for (const s of schedule) {
      md += `- ${s.startTime}\u2013${s.endTime} ${s.title} (recurring)\n`;
    }
    md += `\n`;
  }

  md += `## Tasks\n`;
  for (const t of tasks) {
    const check = t.completed ? "x" : " ";
    const rolled = t.rolledOver ? " *(rolled from yesterday)*" : "";
    md += `- [${check}] ${t.text} \`${t.urgency}\`${rolled}\n`;
  }

  md += `\n## Progress\n`;
  md += `${progressBar} ${completed}/${total} (${pct}%)\n`;

  return md;
}

export function exportDayMarkdown(
  data: MarkdownData,
  projectRoot: string = process.cwd()
): string {
  const dateStr = format(data.date, "yyyy-MM-dd");
  const dir = path.join(projectRoot, "days");
  mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${dateStr}.md`);
  const content = generateMarkdown(data);
  writeFileSync(filePath, content, "utf-8");

  return filePath;
}
