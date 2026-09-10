"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export default function Home() {
  const lifecycle = useInView(0.1);
  const capabilities = useInView(0.1);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-24 pb-32 sm:px-12 lg:px-20">
        {/* Animated floating orbs */}
        <div
          className="absolute top-[-10%] left-[5%] w-[600px] h-[600px] rounded-full opacity-[0.15] blur-[120px] pointer-events-none animate-float-slow"
          style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.1] blur-[100px] pointer-events-none animate-float-reverse"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-20%] left-[40%] w-[450px] h-[450px] rounded-full opacity-[0.08] blur-[90px] pointer-events-none animate-float-slow"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", animationDelay: "5s" }}
        />

        {/* Network lines SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          <line x1="10%" y1="20%" x2="50%" y2="60%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" className="animate-line-draw" />
          <line x1="80%" y1="10%" x2="40%" y2="80%" stroke="rgba(255,255,255,0.06)" strokeWidth="1" className="animate-line-draw-delayed" />
          <line x1="60%" y1="5%" x2="90%" y2="70%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" className="animate-line-draw-delayed-2" />
          <line x1="20%" y1="80%" x2="70%" y2="30%" stroke="rgba(255,255,255,0.06)" strokeWidth="1" className="animate-line-draw-delayed" />
          <line x1="5%" y1="50%" x2="95%" y2="45%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" className="animate-line-draw-delayed-2" />
          {/* Nodes at intersections */}
          <circle cx="10%" cy="20%" r="3" fill="rgba(16,185,129,0.3)" className="animate-fade-in delay-500" />
          <circle cx="50%" cy="60%" r="3" fill="rgba(16,185,129,0.25)" className="animate-fade-in delay-700" />
          <circle cx="80%" cy="10%" r="2.5" fill="rgba(59,130,246,0.25)" className="animate-fade-in delay-600" />
          <circle cx="40%" cy="80%" r="3" fill="rgba(59,130,246,0.2)" className="animate-fade-in delay-900" />
          <circle cx="90%" cy="70%" r="2.5" fill="rgba(139,92,246,0.2)" className="animate-fade-in delay-800" />
          <circle cx="70%" cy="30%" r="3" fill="rgba(16,185,129,0.2)" className="animate-fade-in delay-1000" />
        </svg>

        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />

        {/* Animated accent line */}
        <div className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent animate-pulse-line" />

        <div className="relative mx-auto max-w-4xl">
          <h1 className="animate-fade-up text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white tracking-tight leading-[1.08] max-w-3xl">
            Repurchase agreements,
            <br />
            settled on Hedera.
          </h1>
          <p className="animate-fade-up delay-200 mt-6 text-lg text-zinc-400 max-w-lg leading-relaxed">
            Tenor moves repo settlement on-chain. Lenders sign quotes,
            borrowers post collateral, and every action is recorded
            to an immutable audit trail on Hedera Consensus Service.
          </p>
          <div className="animate-fade-up delay-400 mt-10 flex items-center gap-4">
            <Link
              href="/sign-quote"
              className="group relative rounded-md bg-white px-6 py-2.5 text-sm font-medium text-zinc-950 transition-all hover:shadow-[0_0_24px_rgba(255,255,255,0.15)]"
            >
              Launch App
            </Link>
            <Link
              href="/audit"
              className="rounded-md border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
            >
              View Audit Trail
            </Link>
          </div>
        </div>
      </section>

      {/* Lifecycle */}
      <section ref={lifecycle.ref} className="relative border-t border-zinc-800/60 px-6 py-20 sm:px-12 lg:px-20 overflow-hidden">
        {/* Rotating mesh gradient */}
        <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[200%] opacity-[0.06] pointer-events-none animate-mesh-rotate" style={{
          background: "conic-gradient(from 0deg at 50% 50%, #10b981 0deg, transparent 60deg, #3b82f6 120deg, transparent 180deg, #8b5cf6 240deg, transparent 300deg, #10b981 360deg)",
          filter: "blur(100px)",
        }} />

        <div className="relative mx-auto max-w-4xl">
          <h2 className={`text-2xl font-bold text-white mb-12 transition-all duration-500 ${lifecycle.visible ? "opacity-100" : "opacity-0 translate-y-4"}`}>
            How a repo settles
          </h2>

          <div className="relative">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Lender signs a quote",
                  desc: "The lender defines terms like principal, repurchase price, maturity, and haircut, then commits with an EIP-712 signature. No transaction, no gas.",
                },
                {
                  step: "2",
                  title: "Borrower opens the repo",
                  desc: "The borrower reviews the signed quote, posts collateral, and calls openRepo on the smart contract. Principal transfers from lender to borrower atomically.",
                },
                {
                  step: "3",
                  title: "Settlement at maturity",
                  desc: "At maturity the borrower repays the repurchase amount and recovers collateral. Early repayment is supported. If the borrower does not repay, the lender keeps the collateral.",
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className={`relative rounded-lg border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm p-6 transition-all duration-500 hover:border-zinc-700 hover:bg-zinc-900 ${lifecycle.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                  style={{ transitionDelay: lifecycle.visible ? `${300 + i * 150}ms` : "0ms" }}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 text-sm font-mono text-zinc-300 mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section ref={capabilities.ref} className="relative border-t border-zinc-800/60 px-6 py-20 sm:px-12 lg:px-20 overflow-hidden">
        {/* Floating glow orbs */}
        <div
          className="absolute top-[30%] left-[20%] w-[500px] h-[500px] rounded-full opacity-[0.1] blur-[100px] pointer-events-none animate-float-reverse"
          style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.07] blur-[90px] pointer-events-none animate-float-slow"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", animationDelay: "3s" }}
        />

        <div className="relative mx-auto max-w-4xl">
          <h2 className={`text-2xl font-bold text-white mb-12 transition-all duration-500 ${capabilities.visible ? "opacity-100" : "opacity-0 translate-y-4"}`}>
            What makes it work
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
                title: "Scheduled unwind",
                desc: "The closing leg is scheduled on-chain at open. At maturity, the Hedera network executes settlement automatically. No keeper, no bot, no one needs to be online.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 17c2-4 4-8 6-4s4 8 6 0 3-6 6-2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 21h18" strokeLinecap="round" />
                  </svg>
                ),
                title: "EIP-712 typed signatures",
                desc: "Lenders commit off-chain with typed data signatures. Quotes are gasless until a borrower executes them on-chain.",
              },
              {
                icon: (
                  <svg viewBox="0 0 40 40" className="h-5 w-5" fill="none">
                    <path d="M13 11v18M27 11v18M13 17h14M13 23h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                ),
                title: "Hedera smart contracts",
                desc: "TenorSettlement runs on Hedera EVM with fast finality, low fees, and native scheduled transactions for automatic maturity settlement.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2l7 4v5c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" />
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
                title: "ATS compliance built in",
                desc: "Security tokens enforce transfer restrictions at the contract level. Unauthorized transfers revert automatically with no off-chain gating required.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 3v18" strokeLinecap="round" />
                  </svg>
                ),
                title: "HCS audit trail",
                desc: "Every lifecycle event is published to Hedera Consensus Service, creating a tamper-proof, timestamped record visible to all parties.",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={`group flex gap-4 rounded-lg border border-transparent p-5 transition-all duration-500 hover:border-zinc-800 hover:bg-zinc-900/50 ${capabilities.visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`}
                style={{ transitionDelay: capabilities.visible ? `${200 + i * 120}ms` : "0ms" }}
              >
                <div className="mt-0.5 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="border-t border-zinc-800/60 px-6 py-14 sm:px-12 lg:px-20">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500">
            {["Hedera", "Solidity", "Next.js", "wagmi", "viem"].map((tech, i) => (
              <span key={tech} className="animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                {tech}
              </span>
            ))}
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
