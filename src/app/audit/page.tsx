"use client";

import { useEffect, useState, useCallback } from "react";

interface HcsMessage {
  sequenceNumber: number;
  timestamp: string;
  content: string;
}

function formatTimestamp(ts: string): string {
  const [seconds, nanos] = ts.split(".");
  const ms = Number(seconds) * 1000 + Number((nanos ?? "0").slice(0, 3));
  return new Date(ms).toLocaleString();
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatUSDC(raw: string) {
  const val = Number(raw) / 1e6;
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMaturity(unix: string) {
  return new Date(Number(unix) * 1000).toLocaleString();
}

const EVENT_COLORS: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
  QuoteSigned: { border: "border-blue-500/30", bg: "bg-blue-600/10", badge: "bg-blue-600/20", badgeText: "text-blue-400" },
  RepoOpened: { border: "border-emerald-500/30", bg: "bg-emerald-600/10", badge: "bg-emerald-600/20", badgeText: "text-emerald-400" },
  RepoRepaidEarly: { border: "border-yellow-500/30", bg: "bg-yellow-600/10", badge: "bg-yellow-600/20", badgeText: "text-yellow-400" },
};

const DEFAULT_COLORS = { border: "border-zinc-700", bg: "bg-zinc-900", badge: "bg-zinc-700", badgeText: "text-zinc-300" };

function parseAuditMessage(content: string) {
  const pipeIndex = content.indexOf("|");
  if (pipeIndex === -1) return null;

  const event = content.slice(0, pipeIndex).trim();
  const fields: Record<string, string> = {};
  content.slice(pipeIndex + 1).split("|").forEach((part) => {
    const eq = part.indexOf("=");
    if (eq !== -1) {
      fields[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  });

  return { event, fields };
}

function AuditMessageCard({ content, sequenceNumber, timestamp }: { content: string; sequenceNumber: number; timestamp: string }) {
  const parsed = parseAuditMessage(content);

  if (!parsed) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>#{sequenceNumber}</span>
          <span>{formatTimestamp(timestamp)}</span>
        </div>
        <p className="mt-1 text-sm text-zinc-200 font-mono break-all whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  const colors = EVENT_COLORS[parsed.event] ?? DEFAULT_COLORS;
  const { fields } = parsed;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} px-4 py-3 space-y-2`}>
      <div className="flex items-center justify-between">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors.badge} ${colors.badgeText}`}>
          {parsed.event}
        </span>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>#{sequenceNumber}</span>
          <span>{formatTimestamp(timestamp)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {fields.id && (
          <div className="text-zinc-400 col-span-2">
            ID: <span className="font-mono text-zinc-300 text-xs">{truncAddr(fields.id)}</span>
          </div>
        )}
        {fields.lender && (
          <div className="text-zinc-400">
            Lender: <span className="font-mono text-zinc-200">{truncAddr(fields.lender)}</span>
          </div>
        )}
        {fields.borrower && (
          <div className="text-zinc-400">
            Borrower: <span className="font-mono text-zinc-200">{truncAddr(fields.borrower)}</span>
          </div>
        )}
        {fields.principal && (
          <div className="text-zinc-400">
            Principal: <span className="text-zinc-200">{formatUSDC(fields.principal)} USDC</span>
          </div>
        )}
        {fields.maturity && (
          <div className="text-zinc-400">
            Maturity: <span className="text-zinc-200">{formatMaturity(fields.maturity)}</span>
          </div>
        )}
        {fields.repaidAt && (
          <div className="text-zinc-400">
            Repaid At: <span className="text-zinc-200">{formatMaturity(fields.repaidAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [messages, setMessages] = useState<HcsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const fetchMessages = useCallback(() => {
    fetch("/api/hcs/messages")
      .then((r) => r.json())
      .then((data: HcsMessage[]) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, 10_000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  async function handlePublish() {
    if (!input.trim()) return;
    setPublishing(true);
    setPublishResult(null);

    try {
      const res = await fetch("/api/hcs/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });
      const data = (await res.json()) as {
        status?: string;
        sequenceNumber?: string;
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setPublishResult({
        kind: "success",
        text: `Published — seq #${data.sequenceNumber}`,
      });
      setInput("");
      setTimeout(fetchMessages, 3000);
    } catch (err) {
      setPublishResult({
        kind: "error",
        text: err instanceof Error ? err.message : "Publish failed",
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
      <p className="text-sm text-zinc-400">
        HCS messages for the configured topic. Auto-refreshes every 10 seconds.
      </p>

      {/* Publish section */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Publish to HCS</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message to publish..."
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handlePublish}
            disabled={publishing || !input.trim()}
            className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
        {publishResult && (
          <p
            className={`text-sm ${publishResult.kind === "success" ? "text-emerald-400" : "text-red-400"}`}
          >
            {publishResult.text}
          </p>
        )}
      </div>

      {/* Message list */}
      {loading ? (
        <p className="text-sm text-zinc-500">Loading messages...</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-zinc-500">No messages found.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <AuditMessageCard
              key={msg.sequenceNumber}
              content={msg.content}
              sequenceNumber={msg.sequenceNumber}
              timestamp={msg.timestamp}
            />
          ))}
        </div>
      )}
    </div>
  );
}
