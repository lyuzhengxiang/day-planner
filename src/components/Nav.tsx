"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "today" },
  { href: "/week", label: "goals" },
  { href: "/history", label: "history" },
  { href: "/review", label: "review" },
  { href: "/settings", label: "settings" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 mb-8 border-b border-gray-800 pb-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-xs uppercase tracking-wider transition-colors ${
            pathname === link.href
              ? "text-green-500"
              : "text-gray-600 hover:text-gray-400"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
