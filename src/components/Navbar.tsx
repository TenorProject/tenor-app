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
    <nav className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm px-6 py-3 sticky top-0 z-40">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Tenor" className="h-5 w-auto opacity-90 hover:opacity-100 transition-opacity" />
        </Link>
        <div className="hidden sm:flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-zinc-800/80 text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
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
