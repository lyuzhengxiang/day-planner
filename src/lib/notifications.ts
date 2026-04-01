import { exec } from "child_process";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export function sendIMessage(
  phone: string,
  message: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const escaped = message.replace(/"/g, '\\"');
    const script = `osascript -e 'tell application "Messages" to send "${escaped}" to buddy "${phone}" of (1st account whose service type = iMessage)'`;

    exec(script, (err) => {
      if (err) {
        console.error("iMessage failed:", err.message);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
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

  if (!settings?.iMessagePhone && !settings?.emailAddress) {
    return { attempted: false, iMessage: false, email: false };
  }

  let iMessageSent = false;
  let emailSent = false;

  if (settings.iMessagePhone) {
    iMessageSent = await sendIMessage(settings.iMessagePhone, message);
  }

  // Email is a fallback — only send if iMessage was not configured or failed
  if (settings.emailAddress && !iMessageSent) {
    emailSent = await sendEmail(settings.emailAddress, subject, message);
  }

  return { attempted: true, iMessage: iMessageSent, email: emailSent };
}
