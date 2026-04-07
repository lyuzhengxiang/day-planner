"use client";

import { useEffect, useState } from "react";

interface SettingsData {
  iMessagePhone: string;
  emailAddress: string;
  morningTime: string;
  middayTime: string;
  eveningTime: string;
  timezone: string;
  macLocalIp: string;
  appPort: string;
}

export default function SettingsForm({ initial }: { initial: SettingsData }) {
  const [data, setData] = useState(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncSettings() {
      const response = await fetch("/api/settings");
      if (!response.ok || cancelled) {
        return;
      }

      const latest = (await response.json()) as SettingsData;
      if (!cancelled) {
        setData(latest);
      }
    }

    void syncSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fields: {
    key: keyof SettingsData;
    label: string;
    placeholder: string;
  }[] = [
    { key: "iMessagePhone", label: "Phone (iMessage)", placeholder: "+11234567890" },
    { key: "emailAddress", label: "Email (fallback)", placeholder: "you@example.com" },
    { key: "morningTime", label: "Morning plan time", placeholder: "06:30" },
    { key: "middayTime", label: "Midday nudge time", placeholder: "12:30" },
    { key: "eveningTime", label: "Evening wrap-up time", placeholder: "20:30" },
    { key: "timezone", label: "Timezone", placeholder: "America/Chicago" },
  ];

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-[10px] uppercase tracking-wider text-gray-600 block mb-1">
            {f.label}
          </label>
          <input
            value={data[f.key]}
            onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            className="w-full bg-transparent border-b border-gray-700 text-sm text-gray-200 outline-none py-2 focus:border-green-500 transition-colors"
          />
        </div>
      ))}

      <div className="pt-4">
        <label className="text-[10px] uppercase tracking-wider text-gray-600 block mb-1">
          Local IP (for Apple Shortcuts)
        </label>
        <p className="text-sm text-gray-400 font-mono">
          {data.macLocalIp || "detecting..."}:{data.appPort || "3000"}
        </p>
        <p className="text-[10px] text-gray-600 mt-1">
          Use this in your Shortcut URL: http://
          {data.macLocalIp || "..."}:{data.appPort || "3000"}/api/today/voice
        </p>
      </div>

      <button
        onClick={handleSave}
        className="mt-4 text-sm text-green-500 border border-green-500/30 rounded px-4 py-2 hover:bg-green-500/10"
      >
        {saved ? "saved!" : "save settings"}
      </button>
    </div>
  );
}
