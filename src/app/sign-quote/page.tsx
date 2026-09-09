"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { keccak256, toHex, parseUnits, type Address, type Hex } from "viem";
import { TENOR_SETTLEMENT_ADDRESS } from "@/abi";

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
    <label className="text-sm text-zinc-400">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
      />
    </label>
  );
}

export default function SignQuotePage() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

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

  const [status, setStatus] = useState<"idle" | "signing" | "posting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [savedRequestId, setSavedRequestId] = useState("");

  useEffect(() => {
    setRequestId(generateRequestId());

    const now = new Date();
    const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const oneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setQuoteExpiry(toDatetimeLocal(oneHour));
    setMaturity(toDatetimeLocal(oneDay));
  }, []);

  if (!isConnected || !address) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">Connect your wallet to sign a quote.</p>
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
        principal: parseUnits(principal, 6),
        repurchase: parseUnits(repurchase, 6),
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
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`POST failed: ${res.status}`);

      setSavedRequestId(requestId);
      setStatus("done");
      setRequestId(generateRequestId());
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold text-white">Sign Quote</h1>
      <p className="text-sm text-zinc-400">
        Fill in the repo terms and sign with EIP-712. Your signature commits you as the lender.
      </p>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <InputField label="Request ID" value={requestId} onChange={() => {}} readOnly />
        <InputField label="Lender (you)" value={address} onChange={() => {}} readOnly />
        <InputField label="Borrower" value={borrower} onChange={setBorrower} placeholder="0x..." />

        <div className="grid grid-cols-2 gap-4">
          <InputField label="Security Token" value={security} onChange={setSecurity} placeholder="0x..." />
          <InputField label="Cash Token (USDC)" value={cash} onChange={setCash} placeholder="0x..." />
        </div>

        <InputField label="Partition (bytes32)" value={partition} onChange={setPartition} />

        <div className="grid grid-cols-2 gap-4">
          <InputField label="Collateral Qty (raw units)" value={collateralQty} onChange={setCollateralQty} placeholder="e.g. 1000" />
          <InputField label="Haircut (bps, e.g. 500 = 5%)" value={haircutBps} onChange={setHaircutBps} placeholder="500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField label="Principal (USDC)" value={principal} onChange={setPrincipal} placeholder="10000" />
          <InputField label="Repurchase (USDC)" value={repurchase} onChange={setRepurchase} placeholder="10050" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField label="Maturity" value={maturity} onChange={setMaturity} type="datetime-local" />
          <InputField label="Quote Expiry" value={quoteExpiry} onChange={setQuoteExpiry} type="datetime-local" />
        </div>

        <button
          onClick={handleSign}
          disabled={status === "signing" || status === "posting"}
          className="mt-2 rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === "signing"
            ? "Waiting for signature..."
            : status === "posting"
              ? "Saving quote..."
              : "Sign Quote"}
        </button>

        {status === "done" && (
          <p className="text-sm text-emerald-400">
            Quote signed and saved. Request ID:{" "}
            <span className="font-mono text-xs break-all">{savedRequestId}</span>
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-400">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
