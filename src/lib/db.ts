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

  CREATE TABLE IF NOT EXISTS borrow_requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    borrower        TEXT NOT NULL,
    security        TEXT NOT NULL,
    collateral_qty  TEXT NOT NULL,
    cash            TEXT NOT NULL,
    principal       TEXT NOT NULL,
    maturity_days   INTEGER NOT NULL,
    haircut_bps     INTEGER NOT NULL,
    note            TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'open',
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

// ── Borrow Request helpers ───────────────────────────────

export interface BorrowRequest {
  id: number;
  borrower: string;
  security: string;
  collateralQty: string;
  cash: string;
  principal: string;
  maturityDays: number;
  haircutBps: number;
  note: string;
  status: string;
  createdAt: number;
}

interface BorrowRequestRow {
  id: number;
  borrower: string;
  security: string;
  collateral_qty: string;
  cash: string;
  principal: string;
  maturity_days: number;
  haircut_bps: number;
  note: string;
  status: string;
  created_at: number;
}

function rowToBorrowRequest(row: BorrowRequestRow): BorrowRequest {
  return {
    id: row.id,
    borrower: row.borrower,
    security: row.security,
    collateralQty: row.collateral_qty,
    cash: row.cash,
    principal: row.principal,
    maturityDays: row.maturity_days,
    haircutBps: row.haircut_bps,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
  };
}

const insertBorrowRequestStmt = db.prepare(`
  INSERT INTO borrow_requests
    (borrower, security, collateral_qty, cash, principal, maturity_days, haircut_bps, note, status, created_at)
  VALUES
    (@borrower, @security, @collateral_qty, @cash, @principal, @maturity_days, @haircut_bps, @note, @status, @created_at)
`);

export function insertBorrowRequest(req: {
  borrower: string;
  security: string;
  collateralQty: string;
  cash: string;
  principal: string;
  maturityDays: number;
  haircutBps: number;
  note: string;
}): number {
  const result = insertBorrowRequestStmt.run({
    borrower: req.borrower,
    security: req.security,
    collateral_qty: req.collateralQty,
    cash: req.cash,
    principal: req.principal,
    maturity_days: req.maturityDays,
    haircut_bps: req.haircutBps,
    note: req.note,
    status: "open",
    created_at: Date.now(),
  });
  return Number(result.lastInsertRowid);
}

export function listBorrowRequests(filters?: {
  status?: string;
  minPrincipal?: string;
  maxPrincipal?: string;
  minMaturityDays?: number;
  maxMaturityDays?: number;
}): BorrowRequest[] {
  let sql = "SELECT * FROM borrow_requests WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }
  if (filters?.minPrincipal) {
    sql += " AND CAST(principal AS INTEGER) >= ?";
    params.push(Number(filters.minPrincipal));
  }
  if (filters?.maxPrincipal) {
    sql += " AND CAST(principal AS INTEGER) <= ?";
    params.push(Number(filters.maxPrincipal));
  }
  if (filters?.minMaturityDays) {
    sql += " AND maturity_days >= ?";
    params.push(filters.minMaturityDays);
  }
  if (filters?.maxMaturityDays) {
    sql += " AND maturity_days <= ?";
    params.push(filters.maxMaturityDays);
  }

  sql += " ORDER BY created_at DESC";

  const rows = db.prepare(sql).all(...params) as BorrowRequestRow[];
  return rows.map(rowToBorrowRequest);
}

export function getBorrowRequestsByBorrower(address: string): BorrowRequest[] {
  const rows = db
    .prepare("SELECT * FROM borrow_requests WHERE LOWER(borrower) = LOWER(?) ORDER BY created_at DESC")
    .all(address) as BorrowRequestRow[];
  return rows.map(rowToBorrowRequest);
}

// ── Seed mock borrow requests (runs once) ────────────────

const count = db.prepare("SELECT COUNT(*) AS n FROM borrow_requests").get() as { n: number };
if (count.n === 0) {
  const security = process.env.NEXT_PUBLIC_SECURITY_ADDRESS ?? "0xc2dadb01462b766bb2f58c9638b32e97200ca07d";
  const cash = process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x0000000000000000000000000000000000068cda";
  const now = Date.now();

  const seeds = [
    {
      borrower: "0x7821973f1433273c9bc66065ef62b7d893ac27d2",
      collateralQty: "5000",
      principal: "10000000000",
      maturityDays: 7,
      haircutBps: 500,
      note: "Looking for short-term liquidity against ATS bond position",
      created_at: now - 2 * 60 * 60 * 1000,
    },
    {
      borrower: "0x878df69aaa06e5d0af8d2d5015db81ba4e0e8068",
      collateralQty: "15000",
      principal: "50000000000",
      maturityDays: 14,
      haircutBps: 300,
      note: "Willing to negotiate on haircut for larger principal",
      created_at: now - 18 * 60 * 60 * 1000,
    },
    {
      borrower: "0x21707f8eac809afa4c066ad43d5a45da22824337",
      collateralQty: "2000",
      principal: "5000000000",
      maturityDays: 30,
      haircutBps: 750,
      note: "",
      created_at: now - 3 * 24 * 60 * 60 * 1000,
    },
  ];

  for (const s of seeds) {
    insertBorrowRequestStmt.run({
      borrower: s.borrower,
      security,
      collateral_qty: s.collateralQty,
      cash,
      principal: s.principal,
      maturity_days: s.maturityDays,
      haircut_bps: s.haircutBps,
      note: s.note,
      status: "open",
      created_at: s.created_at,
    });
  }
}
