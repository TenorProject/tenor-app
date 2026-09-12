"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface ProfileModalProps {
  open: boolean;
  address: string;
  onComplete: () => void;
}

export function ProfileModal({ open, address, onComplete }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setDisplayName("");
      setTelegram("");
      setTwitter("");
      setStatus("idle");
      setErrorMsg("");
    }
  }, [open]);

  const hasSocial = telegram.trim() || twitter.trim();
  const canSubmit = displayName.trim() && hasSocial;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setStatus("saving");
    setErrorMsg("");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          displayName: displayName.trim(),
          telegram: telegram.trim(),
          twitter: twitter.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save profile");
      }

      onComplete();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }, [address, displayName, telegram, twitter, canSubmit, onComplete]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-white">Complete Your Profile</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Set a display name and at least one way for counterparties to reach you.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">
              Display Name <span className="text-zinc-600">*</span>
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or alias"
              autoFocus
              className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
            />
          </label>

          <div className="border-t border-zinc-800/40" />

          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">
              Social Contact <span className="text-zinc-600">(at least one)</span>
            </p>

            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs text-zinc-500 mb-1">Telegram</span>
                <div className="flex items-center rounded-md border border-zinc-700 bg-zinc-800/60 overflow-hidden focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500 hover:border-zinc-600 transition-colors">
                  <span className="px-3 text-sm text-zinc-500 select-none">@</span>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="username"
                    className="flex-1 bg-transparent px-0 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="block text-xs text-zinc-500 mb-1">Twitter / X</span>
                <div className="flex items-center rounded-md border border-zinc-700 bg-zinc-800/60 overflow-hidden focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500 hover:border-zinc-600 transition-colors">
                  <span className="px-3 text-sm text-zinc-500 select-none">@</span>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="username"
                    className="flex-1 bg-transparent px-0 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </label>
            </div>

            {!hasSocial && (displayName.trim()) && (
              <p className="mt-2 text-xs text-red-400">Please provide at least one social contact.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pt-5 pb-6">
          {status === "error" && (
            <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
              <p className="text-sm text-red-400">{errorMsg}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || status === "saving"}
            className="w-full rounded-md bg-white px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {status === "saving" ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
