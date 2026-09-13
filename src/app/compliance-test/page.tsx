"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import type { Address, Hex } from "viem";

const DEFAULT_SECURITY = (process.env.NEXT_PUBLIC_SECURITY_ADDRESS ?? "") as string;

const TRANSFER_BY_PARTITION_ABI = [
  {
    type: "function",
    name: "transferByPartition",
    inputs: [
      { name: "partition", type: "bytes32", internalType: "bytes32" },
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "data", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

type Result =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "rejected"; reason: string }
  | { kind: "succeeded" };

export default function ComplianceTestPage() {
  const { address, isConnected } = useAuth();
  const [securityAddress, setSecurityAddress] = useState(DEFAULT_SECURITY);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("1");
  const [partition, setPartition] = useState(
    "0x0000000000000000000000000000000000000000000000000000000000000001",
  );
  const [result, setResult] = useState<Result>({ kind: "idle" });

  const { writeContractAsync } = useWriteContract();
  const token = securityAddress.startsWith("0x") ? (securityAddress as Address) : undefined;

  // We track a successful txHash only if it unexpectedly succeeds
  const [successTxHash, setSuccessTxHash] = useState<Hex | undefined>();
  useWaitForTransactionReceipt({ hash: successTxHash });

  async function handleTest() {
    if (!token || !target) return;
    setResult({ kind: "pending" });
    setSuccessTxHash(undefined);

    try {
      const txHash = await writeContractAsync({
        address: token,
        abi: TRANSFER_BY_PARTITION_ABI,
        functionName: "transferByPartition",
        args: [
          partition as Hex,
          target as Address,
          BigInt(amount),
          "0x" as Hex,
        ],
      });
      // If we get here, the tx was submitted (unexpected)
      setSuccessTxHash(txHash);
      setResult({ kind: "succeeded" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ kind: "rejected", reason: msg });
    }
  }

  if (!isConnected || !address) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-zinc-600">
            <svg viewBox="0 0 24 24" className="h-10 w-10 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l7 4v5c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" />
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-zinc-400">Connect your wallet to run the compliance test.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance Test</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Verify that ATS transfer restrictions are enforced at the smart contract level.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 space-y-3">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">How it works</h2>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-zinc-400">
          <li>Enter the security token contract address (pre-filled from your environment).</li>
          <li>Enter a target address that is <span className="text-zinc-300 font-medium">not</span> registered in the on-chain identity registry.</li>
          <li>Click <span className="text-zinc-300 font-medium">Test Transfer</span> to attempt a <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">transferByPartition</code> call.</li>
          <li>The contract should <span className="text-zinc-300 font-medium">revert</span> the transaction, proving compliance is enforced.</li>
        </ol>
        <div className="border-t border-zinc-800/40 pt-3">
          <p className="text-xs text-zinc-500">
            If the transfer succeeds, it means the identity registry is not configured correctly or the target address is already whitelisted. A successful transfer is flagged as a compliance failure.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 sm:p-8 space-y-5">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Security Token Address</span>
          <input
            type="text"
            value={securityAddress}
            onChange={(e) => setSecurityAddress(e.target.value)}
            placeholder="0x..."
            className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
          />
        </label>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Non-whitelisted Address</span>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0x... (address not in the identity registry)"
            className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Amount (raw units)</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000 = 1 token (if 6 decimals)"
              className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
            />
          </label>

          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Partition (bytes32)</span>
            <input
              type="text"
              value={partition}
              onChange={(e) => setPartition(e.target.value)}
              className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
            />
          </label>
        </div>

        <button
          onClick={handleTest}
          disabled={!token || !target || result.kind === "pending"}
          className="rounded-md bg-white px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {result.kind === "pending" ? "Waiting for wallet..." : "Test Transfer"}
        </button>
      </div>

      {/* Result Display */}

      {result.kind === "rejected" && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-emerald-500/20 bg-emerald-500/10">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l7 4v5c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" />
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-emerald-400">
            Compliance Enforced
          </h2>
          <p className="text-sm text-zinc-400">Transfer rejected by the security token</p>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-400 transition-colors">
              Show revert reason
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-400 whitespace-pre-wrap break-all">
              {result.reason}
            </pre>
          </details>
        </div>
      )}

      {result.kind === "succeeded" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-red-500/20 bg-red-500/10">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <path d="M12 9v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400">
            Transfer Succeeded
          </h2>
          <p className="text-sm text-zinc-400">
            Compliance may not be configured correctly
          </p>
        </div>
      )}
    </div>
  );
}
