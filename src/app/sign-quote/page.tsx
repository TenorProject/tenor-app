"use client";

import { useState, useEffect, Suspense } from "react";
import { useSignTypedData } from "wagmi";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { keccak256, toHex, type Address, type Hex } from "viem";
import { TENOR_SETTLEMENT_ADDRESS } from "@/abi";
import { publishToHcs } from "@/lib/hcs";

const DEFAULT_SECURITY = (process.env.NEXT_PUBLIC_SECURITY_ADDRESS ?? "") as string;
const DEFAULT_CASH = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "") as string;

const EIP712_DOMAIN = {
  name: "Tenor",
  version: "1",
  chainId: 296,
  verifyingContract: TENOR_SETTLEMENT_ADDRESS,
} as const;

const QUOTE_TYPES = {
  Quote: [
    { name: "requestId", type: "bytes32" },
    { name: "lender", type: "address" },
    { name: "borrower", type: "address" },
    { name: "security", type: "address" },
    { name: "partition", type: "bytes32" },
    { name: "collateralQty", type: "uint256" },
    { name: "cash", type: "address" },
    { name: "principal", type: "uint256" },
    { name: "repurchase", type: "uint256" },
    { name: "maturity", type: "uint64" },
    { name: "quoteExpiry", type: "uint64" },
    { name: "haircutBps", type: "uint256" },
  ],
} as const;

function generateRequestId(): Hex {
  const uuid = crypto.randomUUID();
  return keccak256(toHex(uuid));
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-zinc-400">
      <span className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wide">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none transition-colors ${readOnly ? "opacity-50 cursor-not-allowed" : "hover:border-zinc-600"}`}
      />
    </label>
  );
}

export default function SignQuotePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 py-20 justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    }>
      <SignQuoteContent />
    </Suspense>
  );
}

function SignQuoteContent() {
  const { address, isConnected } = useAuth();
  const { signTypedDataAsync } = useSignTypedData();
  const searchParams = useSearchParams();

  const [requestId, setRequestId] = useState<Hex>("0x");
  const [borrower, setBorrower] = useState("");
  const [security, setSecurity] = useState(DEFAULT_SECURITY);
  const [partition, setPartition] = useState(
    "0x0000000000000000000000000000000000000000000000000000000000000001",
  );
  const [collateralQty, setCollateralQty] = useState("");
  const [cash, setCash] = useState(DEFAULT_CASH);
  const [principal, setPrincipal] = useState("");
  const [repurchase, setRepurchase] = useState("");
  const [maturity, setMaturity] = useState("");
  const [quoteExpiry, setQuoteExpiry] = useState("");
  const [haircutBps, setHaircutBps] = useState("");

  const [borrowRequestId, setBorrowRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "signing" | "posting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [savedRequestId, setSavedRequestId] = useState("");

  useEffect(() => {
    setRequestId(generateRequestId());

    // Pre-fill from search params (coming from Market page)
    if (searchParams.get("borrowRequestId")) setBorrowRequestId(searchParams.get("borrowRequestId")!);
    if (searchParams.get("borrower")) setBorrower(searchParams.get("borrower")!);
    if (searchParams.get("security")) setSecurity(searchParams.get("security")!);
    if (searchParams.get("cash")) setCash(searchParams.get("cash")!);
    if (searchParams.get("collateralQty")) setCollateralQty(searchParams.get("collateralQty")!);
    if (searchParams.get("principal")) setPrincipal(searchParams.get("principal")!);
    if (searchParams.get("haircutBps")) setHaircutBps(searchParams.get("haircutBps")!);

    const now = new Date();
    const oneHour = new Date(now.getTime() + 60 * 60 * 1000);

    // If maturityDays is provided, calculate maturity date from now
    const maturityDays = searchParams.get("maturityDays");
    if (maturityDays) {
      const mat = new Date(now.getTime() + Number(maturityDays) * 24 * 60 * 60 * 1000);
      setMaturity(toDatetimeLocal(mat));
    } else {
      const oneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      setMaturity(toDatetimeLocal(oneDay));
    }

    setQuoteExpiry(toDatetimeLocal(oneHour));
  }, [searchParams]);

  if (!isConnected || !address) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-zinc-600 text-4xl mb-4">
            <svg viewBox="0 0 24 24" className="h-10 w-10 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 17c2-4 4-8 6-4s4 8 6 0 3-6 6-2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 21h18" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-zinc-400">Connect your wallet to sign a quote.</p>
        </div>
      </div>
    );
  }

  async function handleSign() {
    setStatus("signing");
    setErrorMsg("");

    try {
      const maturityUnix = BigInt(Math.floor(new Date(maturity).getTime() / 1000));
      const expiryUnix = BigInt(Math.floor(new Date(quoteExpiry).getTime() / 1000));

      const message = {
        requestId: requestId,
        lender: address as Address,
        borrower: borrower as Address,
        security: security as Address,
        partition: partition as Hex,
        collateralQty: BigInt(collateralQty),
        cash: cash as Address,
        principal: BigInt(principal),
        repurchase: BigInt(repurchase),
        maturity: maturityUnix,
        quoteExpiry: expiryUnix,
        haircutBps: BigInt(haircutBps),
      };

      const signature = await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: QUOTE_TYPES,
        primaryType: "Quote",
        message,
      });

      setStatus("posting");

      const payload = {
        quote: {
          requestId: message.requestId,
          lender: message.lender,
          borrower: message.borrower,
          security: message.security,
          partition: message.partition,
          collateralQty: message.collateralQty.toString(),
          cash: message.cash,
          principal: message.principal.toString(),
          repurchase: message.repurchase.toString(),
          maturity: message.maturity.toString(),
          quoteExpiry: message.quoteExpiry.toString(),
          haircutBps: message.haircutBps.toString(),
        },
        signature,
        borrowRequestId: borrowRequestId ? Number(borrowRequestId) : undefined,
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`POST failed: ${res.status}`);

      setSavedRequestId(requestId);
      setStatus("done");
      publishToHcs(
        `QuoteSigned | id=${requestId} | lender=${address} | borrower=${borrower} | principal=${message.principal} | maturity=${message.maturity}`,
      );
      setRequestId(generateRequestId());
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Sign Quote</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Define the repo terms and commit with your EIP-712 signature as the lender.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 sm:p-8 space-y-6">
        {/* Identities */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Parties</h3>
          <InputField label="Request ID" value={requestId} onChange={() => {}} readOnly />
          <InputField label="Lender (you)" value={address} onChange={() => {}} readOnly />
          <InputField label="Borrower" value={borrower} onChange={setBorrower} placeholder="0x..." />
        </div>

        <div className="border-t border-zinc-800/40" />

        {/* Tokens */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Tokens</h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Security Token" value={security} onChange={setSecurity} placeholder="0x..." />
            <InputField label="Cash Token (USDC)" value={cash} onChange={setCash} placeholder="0x..." />
          </div>
          <InputField label="Partition (bytes32)" value={partition} onChange={setPartition} />
        </div>

        <div className="border-t border-zinc-800/40" />

        {/* Terms */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Terms</h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Collateral Qty (raw units)" value={collateralQty} onChange={setCollateralQty} placeholder="e.g. 1000" />
            <InputField label="Haircut (bps, e.g. 500 = 5%)" value={haircutBps} onChange={setHaircutBps} placeholder="500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Principal (raw, 6 decimals)" value={principal} onChange={setPrincipal} placeholder="10000000000 = 10,000 USDC" />
            <InputField label="Repurchase (raw, 6 decimals)" value={repurchase} onChange={setRepurchase} placeholder="10500000000 = 10,500 USDC" />
          </div>
        </div>

        <div className="border-t border-zinc-800/40" />

        {/* Schedule */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Maturity" value={maturity} onChange={setMaturity} type="datetime-local" />
            <InputField label="Quote Expiry" value={quoteExpiry} onChange={setQuoteExpiry} type="datetime-local" />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSign}
            disabled={status === "signing" || status === "posting"}
            className="rounded-md bg-white px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {status === "signing"
              ? "Waiting for signature..."
              : status === "posting"
                ? "Saving quote..."
                : "Sign Quote"}
          </button>
        </div>

        {status === "done" && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <p className="text-sm text-emerald-400">
              Quote signed and saved.
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-400 break-all">{savedRequestId}</p>
          </div>
        )}
        {status === "error" && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-sm text-red-400">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
