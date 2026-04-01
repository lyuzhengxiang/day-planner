import { prisma } from "@/lib/prisma";
import quotesData from "@/data/quotes.json";

export async function pickQuote(): Promise<string> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentlyUsed = await prisma.quoteLog.findMany({
    where: { usedOn: { gte: thirtyDaysAgo } },
    select: { quoteText: true },
  });

  const usedTexts = new Set(recentlyUsed.map((q) => q.quoteText));
  const available = (quotesData as { text: string; theme: string }[]).filter(
    (q) => !usedTexts.has(q.text)
  );

  const pool = available.length > 0 ? available : (quotesData as { text: string; theme: string }[]);
  const selected = pool[Math.floor(Math.random() * pool.length)];

  await prisma.quoteLog.create({
    data: { quoteText: selected.text, usedOn: new Date() },
  });

  return selected.text;
}
