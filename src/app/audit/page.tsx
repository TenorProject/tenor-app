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

const EVENT_COLORS: Record<string, { border: string; bg: string; badge: string; badgeText: string; dot: string }> = {
  QuoteSigned: { border: "border-blue-500/15", bg: "bg-blue-500/5", badge: "bg-blue-500/10", badgeText: "text-blue-400", dot: "bg-blue-400" },
  RepoOpened: { border: "border-emerald-500/15", bg: "bg-emerald-500/5", badge: "bg-emerald-500/10", badgeText: "text-emerald-400", dot: "bg-emerald-400" },
  RepoRepaidEarly: { border: "border-yellow-500/15", bg: "bg-yellow-500/5", badge: "bg-yellow-500/10", badgeText: "text-yellow-400", dot: "bg-yellow-400" },
};

const DEFAULT_COLORS = { border: "border-zinc-800/60", bg: "bg-zinc-900/30", badge: "bg-zinc-800", badgeText: "text-zinc-400", dot: "bg-zinc-500" };

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
      <div className="relative flex gap-4">
        <div className="flex flex-col items-center">
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-600 mt-1.5" />
          <div className="flex-1 w-px bg-zinc-800/60" />
        </div>
        <div className="flex-1 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3 mb-3">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>#{sequenceNumber}</span>
            <span>{formatTimestamp(timestamp)}</span>
          </div>
          <p className="mt-1 text-sm text-zinc-300 font-mono break-all whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  const colors = EVENT_COLORS[parsed.event] ?? DEFAULT_COLORS;
  const { fields } = parsed;

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-2.5 w-2.5 rounded-full ${colors.dot} mt-1.5`} />
        <div className="flex-1 w-px bg-zinc-800/60" />
      </div>
      <div className={`flex-1 rounded-xl border ${colors.border} ${colors.bg} px-4 py-3 mb-3`}>
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge} ${colors.badgeText}`}>
            {parsed.event}
          </span>
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span>#{sequenceNumber}</span>
            <span>{formatTimestamp(timestamp)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mt-3">
          {fields.id && (
            <div className="text-zinc-500 col-span-2">
              ID <span className="font-mono text-zinc-400 text-xs">{truncAddr(fields.id)}</span>
            </div>
          )}
          {fields.lender && (
            <div>
              <span className="text-xs text-zinc-500">Lender</span>
              <p className="font-mono text-zinc-300 text-xs">{truncAddr(fields.lender)}</p>
            </div>
          )}
          {fields.borrower && (
            <div>
              <span className="text-xs text-zinc-500">Borrower</span>
              <p className="font-mono text-zinc-300 text-xs">{truncAddr(fields.borrower)}</p>
            </div>
          )}
          {fields.principal && (
            <div>
              <span className="text-xs text-zinc-500">Principal</span>
              <p className="text-zinc-300 font-mono text-xs">{formatUSDC(fields.principal)} USDC</p>
            </div>
          )}
          {fields.maturity && (
            <div>
              <span className="text-xs text-zinc-500">Maturity</span>
              <p className="text-zinc-300 text-xs">{formatMaturity(fields.maturity)}</p>
            </div>
          )}
          {fields.repaidAt && (
            <div>
              <span className="text-xs text-zinc-500">Repaid At</span>
              <p className="text-zinc-300 text-xs">{formatMaturity(fields.repaidAt)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function AuditPage() {
  const [messages, setMessages] = useState<HcsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil(messages.length / PAGE_SIZE));
  const paged = messages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        text: `Published, sequence #${data.sequenceNumber}`,
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
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
        <p className="mt-1 text-sm text-zinc-500">
          HCS messages for the configured topic. Auto-refreshes every 10 seconds.
        </p>
      </div>

      {/* Publish section */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 space-y-3">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Publish to HCS</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message to publish..."
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
          />
          <button
            onClick={handlePublish}
            disabled={publishing || !input.trim()}
            className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
        {publishResult && (
          <div className={`rounded-lg border px-4 py-2.5 ${publishResult.kind === "success" ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            <p className={`text-sm ${publishResult.kind === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {publishResult.text}
            </p>
          </div>
        )}
      </div>

      {/* Message list */}
      {loading ? (
        <div className="flex items-center gap-2 py-8">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
          <p className="text-sm text-zinc-500">Loading messages...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
          <p className="text-sm text-zinc-500">No messages found.</p>
        </div>
      ) : (
        <>
          <div className="pt-2">
            {paged.map((msg) => (
              <AuditMessageCard
                key={msg.sequenceNumber}
                content={msg.content}
                sequenceNumber={msg.sequenceNumber}
                timestamp={msg.timestamp}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-zinc-600">
                Page {page} of {totalPages} ({messages.length} messages)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={`dot-${i}`} className="px-1 text-zinc-600 text-sm">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                          item === page
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
