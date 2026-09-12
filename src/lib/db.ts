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

  CREATE TABLE IF NOT EXISTS user_profiles (
    address       TEXT PRIMARY KEY,
    display_name  TEXT NOT NULL,
    telegram      TEXT NOT NULL DEFAULT '',
    twitter       TEXT NOT NULL DEFAULT '',
    created_at    INTEGER NOT NULL
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
    status: "pending",
    created_at: Date.now(),
  });
  return Number(result.lastInsertRowid);
}

export function listBorrowRequests(filters?: {
  status?: string;
  borrower?: string;
  minPrincipal?: string;
  maxPrincipal?: string;
  minMaturityDays?: number;
  maxMaturityDays?: number;
  page?: number;
  pageSize?: number;
}): { data: BorrowRequest[]; total: number } {
  let where = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.status) {
    where += " AND status = ?";
    params.push(filters.status);
  }
  if (filters?.borrower) {
    where += " AND LOWER(borrower) = LOWER(?)";
    params.push(filters.borrower);
  }
  if (filters?.minPrincipal) {
    where += " AND CAST(principal AS INTEGER) >= ?";
    params.push(Number(filters.minPrincipal));
  }
  if (filters?.maxPrincipal) {
    where += " AND CAST(principal AS INTEGER) <= ?";
    params.push(Number(filters.maxPrincipal));
  }
  if (filters?.minMaturityDays) {
    where += " AND maturity_days >= ?";
    params.push(filters.minMaturityDays);
  }
  if (filters?.maxMaturityDays) {
    where += " AND maturity_days <= ?";
    params.push(filters.maxMaturityDays);
  }

  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM borrow_requests ${where}`).get(...params) as { n: number }
  ).n;

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  const rows = db
    .prepare(`SELECT * FROM borrow_requests ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset) as BorrowRequestRow[];

  return { data: rows.map(rowToBorrowRequest), total };
}

export function updateBorrowRequestStatus(id: number, status: string, borrower?: string): boolean {
  let sql = "UPDATE borrow_requests SET status = ? WHERE id = ?";
  const params: (string | number)[] = [status, id];

  // If borrower is provided, ensure only the owner can update
  if (borrower) {
    sql += " AND LOWER(borrower) = LOWER(?)";
    params.push(borrower);
  }

  const result = db.prepare(sql).run(...params);
  return result.changes > 0;
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
    {
      borrower: "0x4a3b0c5e8f1d2a6b9c7e0f3d5a8b1c4e7f2a6d9b",
      collateralQty: "8000",
      principal: "25000000000",
      maturityDays: 10,
      haircutBps: 400,
      note: "Need bridge financing for settlement cycle mismatch",
      created_at: now - 5 * 60 * 60 * 1000,
    },
    {
      borrower: "0x9c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
      collateralQty: "20000",
      principal: "75000000000",
      maturityDays: 21,
      haircutBps: 250,
      note: "Institutional desk, can provide additional collateral if needed",
      created_at: now - 8 * 60 * 60 * 1000,
    },
    {
      borrower: "0x1f2e3d4c5b6a7980918273645564738291a0b1c2",
      collateralQty: "3500",
      principal: "12000000000",
      maturityDays: 5,
      haircutBps: 600,
      note: "Short duration, flexible on terms",
      created_at: now - 1 * 24 * 60 * 60 * 1000,
    },
    {
      borrower: "0xa1b2c3d4e5f60718293a4b5c6d7e8f9001122334",
      collateralQty: "50000",
      principal: "200000000000",
      maturityDays: 60,
      haircutBps: 200,
      note: "Large block trade, prefer single counterparty",
      created_at: now - 2 * 24 * 60 * 60 * 1000,
    },
    {
      borrower: "0x5566778899aabbccddeeff0011223344556677aa",
      collateralQty: "1000",
      principal: "3000000000",
      maturityDays: 3,
      haircutBps: 800,
      note: "Weekend liquidity, will repurchase Monday",
      created_at: now - 10 * 60 * 60 * 1000,
    },
    {
      borrower: "0xdeadbeef1234567890abcdef1234567890abcdef",
      collateralQty: "12000",
      principal: "40000000000",
      maturityDays: 28,
      haircutBps: 350,
      note: "Monthly repo roll, recurring borrower",
      created_at: now - 4 * 24 * 60 * 60 * 1000,
    },
    {
      borrower: "0xcafe0001babe0002dead0003beef0004face0005",
      collateralQty: "7500",
      principal: "18000000000",
      maturityDays: 14,
      haircutBps: 450,
      note: "",
      created_at: now - 6 * 24 * 60 * 60 * 1000,
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
      status: "pending",
      created_at: s.created_at,
    });
  }

  // Seed profiles for mock borrowers
  const seedProfiles = [
    { address: "0x7821973f1433273c9bc66065ef62b7d893ac27d2", display_name: "Alice Chen", telegram: "alicechen", twitter: "alice_defi" },
    { address: "0x878df69aaa06e5d0af8d2d5015db81ba4e0e8068", display_name: "Bob Martinez", telegram: "bobmartinez", twitter: "" },
    { address: "0x21707f8eac809afa4c066ad43d5a45da22824337", display_name: "Carol Wu", telegram: "", twitter: "carol_trades" },
    { address: "0x4a3b0c5e8f1d2a6b9c7e0f3d5a8b1c4e7f2a6d9b", display_name: "David Park", telegram: "dpark_repo", twitter: "davidpark" },
    { address: "0x9c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d", display_name: "Elena Volkov", telegram: "elena_v", twitter: "elenavolkov" },
    { address: "0x1f2e3d4c5b6a7980918273645564738291a0b1c2", display_name: "Frank Tanaka", telegram: "ftanaka", twitter: "" },
    { address: "0xa1b2c3d4e5f60718293a4b5c6d7e8f9001122334", display_name: "Grace Okafor", telegram: "", twitter: "grace_otc" },
    { address: "0x5566778899aabbccddeeff0011223344556677aa", display_name: "Hassan Ali", telegram: "hassanali", twitter: "hassan_fi" },
    { address: "0xdeadbeef1234567890abcdef1234567890abcdef", display_name: "Isla Reyes", telegram: "islareyes", twitter: "" },
    { address: "0xcafe0001babe0002dead0003beef0004face0005", display_name: "James Novak", telegram: "jnovak", twitter: "jamesnovak" },
  ];

  const seedProfileStmt = db.prepare(`
    INSERT OR REPLACE INTO user_profiles
      (address, display_name, telegram, twitter, created_at)
    VALUES
      (@address, @display_name, @telegram, @twitter, @created_at)
  `);

  for (const p of seedProfiles) {
    seedProfileStmt.run({
      address: p.address.toLowerCase(),
      display_name: p.display_name,
      telegram: p.telegram,
      twitter: p.twitter,
      created_at: now,
    });
  }
}

// ── User Profile helpers ─────────────────────────────────

export interface UserProfile {
  address: string;
  displayName: string;
  telegram: string;
  twitter: string;
  createdAt: number;
}

interface UserProfileRow {
  address: string;
  display_name: string;
  telegram: string;
  twitter: string;
  created_at: number;
}

function rowToUserProfile(row: UserProfileRow): UserProfile {
  return {
    address: row.address,
    displayName: row.display_name,
    telegram: row.telegram,
    twitter: row.twitter,
    createdAt: row.created_at,
  };
}

const upsertProfileStmt = db.prepare(`
  INSERT OR REPLACE INTO user_profiles
    (address, display_name, telegram, twitter, created_at)
  VALUES
    (@address, @display_name, @telegram, @twitter, @created_at)
`);

export function upsertProfile(profile: {
  address: string;
  displayName: string;
  telegram: string;
  twitter: string;
}): void {
  upsertProfileStmt.run({
    address: profile.address.toLowerCase(),
    display_name: profile.displayName,
    telegram: profile.telegram,
    twitter: profile.twitter,
    created_at: Date.now(),
  });
}

export function getProfile(address: string): UserProfile | null {
  const row = db
    .prepare("SELECT * FROM user_profiles WHERE LOWER(address) = LOWER(?)")
    .get(address) as UserProfileRow | undefined;
  return row ? rowToUserProfile(row) : null;
}

export function getProfiles(addresses: string[]): Record<string, UserProfile> {
  if (addresses.length === 0) return {};
  const placeholders = addresses.map(() => "LOWER(?)").join(",");
  const rows = db
    .prepare(`SELECT * FROM user_profiles WHERE LOWER(address) IN (${placeholders})`)
    .all(...addresses.map((a) => a.toLowerCase())) as UserProfileRow[];
  const map: Record<string, UserProfile> = {};
  for (const row of rows) {
    map[row.address.toLowerCase()] = rowToUserProfile(row);
  }
  return map;
}
