"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { PrivateKey } from "@hashgraph/sdk";

interface KeyConverterModalProps {
  open: boolean;
  onClose: () => void;
}

export function KeyConverterModal({ open, onClose }: KeyConverterModalProps) {
  const [rawKey, setRawKey] = useState("");
  const [derKey, setDerKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setRawKey("");
      setDerKey(null);
      setError(null);
      setCopied(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleConvert = useCallback(() => {
    setError(null);
    setDerKey(null);
    setCopied(false);

    try {
      const cleaned = rawKey.trim();
      if (!cleaned) {
        setError("Please paste your private key.");
        return;
      }

      const pk = PrivateKey.fromStringECDSA(
        cleaned.startsWith("0x") ? cleaned : `0x${cleaned}`,
      );
      setDerKey(pk.toStringDer());
    } catch {
      setError("Invalid private key. Please paste a valid ECDSA private key.");
    }
  }, [rawKey]);

  const handleCopy = useCallback(async () => {
    if (!derKey) return;
    await navigator.clipboard.writeText(derKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [derKey]);

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/50">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Convert to Hedera Format</h2>
              <p className="text-xs text-zinc-500">For HashPack and other Hedera wallets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Security notice */}
        <div className="mx-6 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 mb-5">
          <div className="flex gap-2.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 mt-0.5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l7 4v5c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This conversion runs <span className="font-medium text-zinc-300">entirely in your browser</span>. Your private key is never sent to any server, stored on disk, or accessible to us. It exists only in browser-confined memory during conversion.
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="px-6 space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">
              EVM Private Key
            </span>
            <input
              ref={inputRef}
              type="password"
              value={rawKey}
              onChange={(e) => {
                setRawKey(e.target.value);
                setDerKey(null);
                setError(null);
              }}
              placeholder="Paste your private key from Privy..."
              className="block w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm text-white font-mono placeholder-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none transition-colors"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {!derKey && (
            <button
              onClick={handleConvert}
              disabled={!rawKey.trim()}
              className="w-full rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Convert
            </button>
          )}
        </div>

        {/* Result */}
        {derKey && (
          <div className="px-6 mt-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Hedera DER Format</span>
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700 px-3 py-2.5">
                <p className="text-xs font-mono text-zinc-300 break-all select-all leading-relaxed">
                  {derKey}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 transition-colors"
              >
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>,
    document.body,
  );
}
