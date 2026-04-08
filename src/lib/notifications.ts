import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export function getNotificationEmail(settings?: {
  emailAddress?: string;
} | null): string | null {
  const email = settings?.emailAddress?.trim();
  return email ? email : null;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Day Planner <onboarding@resend.dev>",
      to,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.error("Email failed:", err);
    return false;
  }
}

export async function notify(
  message: string,
  subject = "Day Planner"
): Promise<{ attempted: boolean; iMessage: boolean; email: boolean }> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const email = getNotificationEmail(settings);

  if (!email) {
    return { attempted: false, iMessage: false, email: false };
  }

  const emailSent = await sendEmail(email, subject, message);

  return { attempted: true, iMessage: false, email: emailSent };
}
