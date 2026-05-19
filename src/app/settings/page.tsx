import { connection } from "next/server";
import ACShell from "@/components/ac/ACShell";
import ACCard from "@/components/ac/ACCard";
import ACSectionHeader from "@/components/ac/ACSectionHeader";
import Eyebrow from "@/components/ac/Eyebrow";
import Field from "@/components/ac/Field";
import RemindersCard from "@/components/ac/settings/RemindersCard";
import RecurringList from "@/components/ac/settings/RecurringList";
import { AC } from "@/lib/design-tokens";
import { prisma } from "@/lib/prisma";

interface IntegrationStatus {
  name: string;
  status: string;
  color: string;
  sub: string;
}

export default async function SettingsPage() {
  await connection();

  const [settings, recurringEvents] = await Promise.all([
    prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    }),
    prisma.recurringEvent.findMany({
      orderBy: [{ active: "desc" }, { startTime: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const initial = userInitial(settings.emailAddress);
  const activeRecurring = recurringEvents.filter((e) => e.active).length;

  const integrations: IntegrationStatus[] = [
    {
      name: "OpenAI",
      status: process.env.OPENAI_API_KEY ? "connected" : "missing key",
      color: process.env.OPENAI_API_KEY ? AC.green : AC.orange,
      sub: "Used for plan generation, weekly goal flow, and reflection.",
    },
    {
      name: "WeatherAPI",
      status: process.env.WEATHER_API_KEY ? "connected" : "missing key",
      color: process.env.WEATHER_API_KEY ? AC.green : AC.orange,
      sub: "Provides the daily weather summary on the Today screen.",
    },
    {
      name: "Resend",
      status: process.env.RESEND_API_KEY ? "connected" : "missing key",
      color: process.env.RESEND_API_KEY ? AC.green : AC.dim,
      sub: "Email fallback when iMessage delivery is unavailable.",
    },
    {
      name: "iMessage",
      status: settings.iMessagePhone ? "configured" : "not set",
      color: settings.iMessagePhone ? AC.green : AC.dim,
      sub: "Local AppleScript sender. Mac must be running.",
    },
  ];

  return (
    <ACShell>
      <div style={{ marginBottom: 24 }}>
        <Eyebrow>Account</Eyebrow>
        <h1
          style={{
            fontSize: 60,
            fontWeight: 800,
            margin: "2px 0 0",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          Settings
        </h1>
        <p style={{ margin: "6px 0 0", color: AC.dim, fontSize: 14 }}>
          Delivery, schedule, and the local services that power proactive nudges.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) minmax(420px, 1.4fr)",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <ACCard>
          <ACSectionHeader label="Profile" />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: `linear-gradient(135deg, ${AC.orange}, ${AC.red})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 800,
                color: AC.text,
              }}
            >
              {initial}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: AC.text }}>
                {settings.emailAddress || "Single user"}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: AC.dim }}>
                {settings.timezone || "America/Chicago"}
              </p>
            </div>
          </div>
          <Field label="Timezone" value={settings.timezone || "America/Chicago"} />
          <Field
            label="App URL"
            value={`http://${settings.macLocalIp || "localhost"}:${settings.appPort || "3000"}`}
            mono
          />
          <Field
            label="Voice endpoint"
            value={`http://${settings.macLocalIp || "localhost"}:${settings.appPort || "3000"}/api/today/voice`}
            mono
          />
        </ACCard>

        <RemindersCard
          initial={{
            iMessagePhone: settings.iMessagePhone,
            emailAddress: settings.emailAddress,
            morningTime: settings.morningTime,
            middayTime: settings.middayTime,
            eveningTime: settings.eveningTime,
          }}
        />
      </div>

      <ACSectionHeader
        label="Recurring events"
        right={`${activeRecurring} active · injected into daily plan`}
      />
      <ACCard style={{ marginBottom: 22 }}>
        <RecurringList initial={recurringEvents} />
      </ACCard>

      <ACSectionHeader label="Integrations" right="status" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {integrations.map((i) => (
          <ACCard key={i.name} style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: AC.text }}>
                {i.name}
              </p>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: i.color,
                  boxShadow: `0 0 6px ${i.color}`,
                }}
              />
            </div>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 11,
                color: i.color,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {i.status}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: AC.dim, lineHeight: 1.4 }}>
              {i.sub}
            </p>
          </ACCard>
        ))}
      </div>
    </ACShell>
  );
}

function userInitial(email: string): string {
  if (!email) return "S";
  const ch = email.trim()[0];
  return ch ? ch.toUpperCase() : "S";
}
