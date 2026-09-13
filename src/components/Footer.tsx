export function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 px-6 py-6 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-4xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
          <a
            href="https://x.com/Tenor_protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Tenor_protocol
          </a>
          <span className="text-zinc-700">|</span>
          <span>Built for ETH Online Hackathon 2026</span>
        </div>
        <span className="text-xs text-zinc-600">v0.3.1</span>
      </div>
    </footer>
  );
}
