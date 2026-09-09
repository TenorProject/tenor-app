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
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.sequenceNumber}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>#{msg.sequenceNumber}</span>
                <span>{formatTimestamp(msg.timestamp)}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-200 font-mono break-all whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
