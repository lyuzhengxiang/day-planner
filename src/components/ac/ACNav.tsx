"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { AC } from "@/lib/design-tokens";

const links = [
  { href: "/", label: "Today" },
  { href: "/week", label: "Goals" },
  { href: "/history", label: "History" },
  { href: "/review", label: "Review" },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ACNav() {
  const pathname = usePathname();
  const today = format(new Date(), "MMM d, yyyy");

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 48px 16px",
        borderBottom: `1px solid ${AC.cardBorder}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            background: `conic-gradient(${AC.red} 0 35%, ${AC.green} 35% 70%, ${AC.cyan} 70% 100%)`,
            boxShadow: "0 0 14px rgba(255,55,95,0.3)",
          }}
        />
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
          Day Planner
        </span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {links.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.02em",
                color: active ? AC.text : AC.dim,
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                transition: "color 150ms ease, background 150ms ease",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          suppressHydrationWarning
          style={{ fontSize: 12, color: AC.dim, fontVariantNumeric: "tabular-nums" }}
        >
          {today}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${AC.orange}, ${AC.red})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: AC.text,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          S
        </div>
      </div>
    </nav>
  );
}
