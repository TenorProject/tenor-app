/** Fire-and-forget HCS publish. Never throws. */
export function publishToHcs(message: string) {
  fetch("/api/hcs/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  }).catch(() => {
    // intentionally swallowed — HCS publish is best-effort
  });
}
