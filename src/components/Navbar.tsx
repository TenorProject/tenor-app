"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/open-repo", label: "Open Repo" },
  { href: "/sign-quote", label: "Sign Quote" },
  { href: "/compliance-test", label: "Compliance" },
  { href: "/audit", label: "Audit Trail" },
  { href: "/setup", label: "Setup" },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-3">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Tenor" className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <ConnectButton />
    </nav>
  );
}
