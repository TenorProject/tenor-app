"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
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
  const { address, isConnected } = useAccount();
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
        <p className="text-zinc-400">Connect your wallet to run the compliance test.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold text-white">Compliance Test</h1>
      <p className="text-sm text-zinc-400">
        Attempt to transfer a security token to an address that is{" "}
        <span className="text-white font-medium">NOT</span> in the identity registry.
        The token itself will reject the transfer.
      </p>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <label className="text-sm text-zinc-400">
          Security Token Address
          <input
            type="text"
            value={securityAddress}
            onChange={(e) => setSecurityAddress(e.target.value)}
            placeholder="0x..."
            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <label className="text-sm text-zinc-400">
          Non-whitelisted Address
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0x... (address NOT in the identity registry)"
            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm text-zinc-400">
            Amount
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1"
              className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </label>

          <label className="text-sm text-zinc-400">
            Partition (bytes32)
            <input
              type="text"
              value={partition}
              onChange={(e) => setPartition(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>

        <button
          onClick={handleTest}
          disabled={!token || !target || result.kind === "pending"}
          className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {result.kind === "pending" ? "Waiting for wallet..." : "Test Transfer"}
        </button>
      </div>

      {/* ── Result Display (large & prominent for demo) ──── */}

      {result.kind === "rejected" && (
        <div className="rounded-xl border-2 border-emerald-500 bg-emerald-950/60 p-8 text-center space-y-3">
          <div className="text-4xl">&#x2713;</div>
          <h2 className="text-2xl font-bold text-emerald-400">
            Compliance Enforced
          </h2>
          <p className="text-lg text-emerald-300">Transfer rejected by the security token</p>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-emerald-400/70 hover:text-emerald-400">
              Show revert reason
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-900 p-4 text-xs text-zinc-300 whitespace-pre-wrap break-all">
              {result.reason}
            </pre>
          </details>
        </div>
      )}

      {result.kind === "succeeded" && (
        <div className="rounded-xl border-2 border-red-500 bg-red-950/60 p-8 text-center space-y-3">
          <div className="text-4xl">&#x26A0;</div>
          <h2 className="text-2xl font-bold text-red-400">
            Transfer Succeeded
          </h2>
          <p className="text-lg text-red-300">
            Compliance may not be configured correctly
          </p>
        </div>
      )}
    </div>
  );
}
