import Database from "better-sqlite3";
import path from "path";
import type { SignedQuote, QuotePayload } from "@/types/quote-api";
import type { RepoFromEvent } from "@/types/repo-api";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "tenor.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS quotes (
    id              TEXT PRIMARY KEY,
    lender          TEXT NOT NULL,
    borrower        TEXT NOT NULL,
    security        TEXT NOT NULL,
    partition       TEXT NOT NULL,
    collateral_qty  TEXT NOT NULL,
    cash            TEXT NOT NULL,
    principal       TEXT NOT NULL,
    repurchase      TEXT NOT NULL,
    maturity        INTEGER NOT NULL,
    quote_expiry    INTEGER NOT NULL,
    haircut_bps     INTEGER NOT NULL,
    signature       TEXT NOT NULL,
    created_at      INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS repos (
    id                TEXT PRIMARY KEY,
    lender            TEXT NOT NULL,
    borrower          TEXT NOT NULL,
    security          TEXT NOT NULL,
    principal         TEXT NOT NULL,
    repurchase        TEXT NOT NULL,
    maturity          INTEGER NOT NULL,
    schedule_address  TEXT,
    status            INTEGER NOT NULL DEFAULT 0,
    updated_at        INTEGER NOT NULL
  );
`);

// ── Quote helpers ─────────────────────────────────────────

const insertQuoteStmt = db.prepare(`
  INSERT OR REPLACE INTO quotes
    (id, lender, borrower, security, partition, collateral_qty, cash,
     principal, repurchase, maturity, quote_expiry, haircut_bps, signature, created_at)
  VALUES
    (@id, @lender, @borrower, @security, @partition, @collateral_qty, @cash,
     @principal, @repurchase, @maturity, @quote_expiry, @haircut_bps, @signature, @created_at)
`);

export function insertQuote(quote: QuotePayload, signature: string): void {
  insertQuoteStmt.run({
    id: quote.requestId,
    lender: quote.lender,
    borrower: quote.borrower,
    security: quote.security,
    partition: quote.partition,
    collateral_qty: quote.collateralQty,
    cash: quote.cash,
    principal: quote.principal,
    repurchase: quote.repurchase,
    maturity: Number(quote.maturity),
    quote_expiry: Number(quote.quoteExpiry),
    haircut_bps: Number(quote.haircutBps),
    signature,
    created_at: Date.now(),
  });
}

interface QuoteRow {
  id: string;
  lender: string;
  borrower: string;
  security: string;
  partition: string;
  collateral_qty: string;
  cash: string;
  principal: string;
  repurchase: string;
  maturity: number;
  quote_expiry: number;
  haircut_bps: number;
  signature: string;
  created_at: number;
}

function rowToSignedQuote(row: QuoteRow): SignedQuote {
  return {
    quote: {
      requestId: row.id as QuotePayload["requestId"],
      lender: row.lender as QuotePayload["lender"],
      borrower: row.borrower as QuotePayload["borrower"],
      security: row.security as QuotePayload["security"],
      partition: row.partition as QuotePayload["partition"],
      collateralQty: row.collateral_qty,
      cash: row.cash as QuotePayload["cash"],
      principal: row.principal,
      repurchase: row.repurchase,
      maturity: row.maturity.toString(),
      quoteExpiry: row.quote_expiry.toString(),
      haircutBps: row.haircut_bps.toString(),
    },
    signature: row.signature as SignedQuote["signature"],
    createdAt: row.created_at,
  };
}

export function getAllQuotes(): SignedQuote[] {
  const rows = db.prepare("SELECT * FROM quotes ORDER BY created_at DESC").all() as QuoteRow[];
  return rows.map(rowToSignedQuote);
}

export function getQuotesByBorrower(address: string): SignedQuote[] {
  const rows = db
    .prepare("SELECT * FROM quotes WHERE LOWER(borrower) = LOWER(?) ORDER BY created_at DESC")
    .all(address) as QuoteRow[];
  return rows.map(rowToSignedQuote);
}

export function getQuotesByLender(address: string): SignedQuote[] {
  const rows = db
    .prepare("SELECT * FROM quotes WHERE LOWER(lender) = LOWER(?) ORDER BY created_at DESC")
    .all(address) as QuoteRow[];
  return rows.map(rowToSignedQuote);
}

export function deleteQuote(id: string): void {
  db.prepare("DELETE FROM quotes WHERE id = ?").run(id);
}

// ── Repo helpers ──────────────────────────────────────────

const upsertRepoStmt = db.prepare(`
  INSERT OR REPLACE INTO repos
    (id, lender, borrower, security, principal, repurchase, maturity,
     schedule_address, status, updated_at)
  VALUES
    (@id, @lender, @borrower, @security, @principal, @repurchase, @maturity,
     @schedule_address, @status, @updated_at)
`);

export function upsertRepo(repo: RepoFromEvent, status = 0): void {
  upsertRepoStmt.run({
    id: repo.id,
    lender: repo.lender,
    borrower: repo.borrower,
    security: repo.security,
    principal: repo.principal,
    repurchase: repo.repurchase,
    maturity: Number(repo.maturity),
    schedule_address: repo.scheduleAddress,
    status,
    updated_at: Date.now(),
  });
}

interface RepoRow {
  id: string;
  lender: string;
  borrower: string;
  security: string;
  principal: string;
  repurchase: string;
  maturity: number;
  schedule_address: string | null;
  status: number;
  updated_at: number;
}

function rowToRepoFromEvent(row: RepoRow): RepoFromEvent {
  return {
    id: row.id as RepoFromEvent["id"],
    lender: row.lender as RepoFromEvent["lender"],
    borrower: row.borrower as RepoFromEvent["borrower"],
    security: row.security as RepoFromEvent["security"],
    collateralQty: "0",
    cash: "0x0000000000000000000000000000000000000000" as RepoFromEvent["cash"],
    principal: row.principal,
    repurchase: row.repurchase,
    maturity: row.maturity.toString(),
    scheduleAddress: (row.schedule_address ?? "") as RepoFromEvent["scheduleAddress"],
  };
}

export function getReposByAddress(address: string): RepoFromEvent[] {
  const rows = db
    .prepare(
      "SELECT * FROM repos WHERE LOWER(lender) = LOWER(?) OR LOWER(borrower) = LOWER(?) ORDER BY maturity DESC",
    )
    .all(address, address) as RepoRow[];
  return rows.map(rowToRepoFromEvent);
}

export function getRepoById(id: string): RepoFromEvent | undefined {
  const row = db.prepare("SELECT * FROM repos WHERE id = ?").get(id) as RepoRow | undefined;
  return row ? rowToRepoFromEvent(row) : undefined;
}

export function updateRepoStatus(id: string, status: number): void {
  db.prepare("UPDATE repos SET status = ?, updated_at = ? WHERE id = ?").run(
    status,
    Date.now(),
    id,
  );
}
