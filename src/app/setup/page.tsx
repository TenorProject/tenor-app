"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Address, type Hex } from "viem";
import { useErc20Allowance, useErc20Approve } from "@/hooks/useErc20";
import { TENOR_SETTLEMENT_ADDRESS } from "@/abi";
import { formatUnits } from "viem";

const AUTHORIZE_OPERATOR_ABI = [
  {
    type: "function",
    name: "authorizeOperator",
    inputs: [{ name: "operator", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const DEFAULT_USDC = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "") as string;
const DEFAULT_SECURITY = (process.env.NEXT_PUBLIC_SECURITY_ADDRESS ?? "") as string;

function TxFeedback({ txHash, isPending, isError, error }: {
  txHash: Hex | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}) {
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (isPending) return <p className="mt-2 text-sm text-yellow-400">Waiting for wallet...</p>;
  if (isConfirming) return <p className="mt-2 text-sm text-yellow-400">Confirming tx...</p>;
  if (isSuccess) return <p className="mt-2 text-sm text-emerald-400">Transaction confirmed.</p>;
  if (isError) return <p className="mt-2 text-sm text-red-400">{error?.message ?? "Transaction failed."}</p>;
  return null;
}

function LenderSetup({ address }: { address: Address }) {
  const [usdcAddress, setUsdcAddress] = useState(DEFAULT_USDC);
  const [amount, setAmount] = useState("1000000");

  const token = usdcAddress.startsWith("0x") ? (usdcAddress as Address) : undefined;

  const { data: allowance } = useErc20Allowance(token, address, TENOR_SETTLEMENT_ADDRESS);
  const { approve, txHash, isPending, isError, error } = useErc20Approve();

  function handleApprove() {
    if (!token) return;
    const parsed = parseUnits(amount, 6);
    approve(token, TENOR_SETTLEMENT_ADDRESS, parsed);
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-white">Lender Setup — Approve USDC</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Connected as <span className="font-mono text-zinc-300">{address}</span>
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-sm text-zinc-400">
          USDC Token Address
          <input
            type="text"
            value={usdcAddress}
            onChange={(e) => setUsdcAddress(e.target.value)}
            placeholder="0x..."
            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <label className="text-sm text-zinc-400">
          Approval Amount (USDC, 6 decimals)
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000"
            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <button
          onClick={handleApprove}
          disabled={!token || isPending}
          className="mt-1 w-fit rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Approve
        </button>

        <TxFeedback txHash={txHash} isPending={isPending} isError={isError} error={error} />

        {allowance !== undefined && token && (
          <p className="text-sm text-zinc-400">
            Current allowance:{" "}
            <span className="font-mono text-zinc-200">
              {formatUnits(allowance, 6)} USDC
            </span>
          </p>
        )}
      </div>
    </section>
  );
}

function BorrowerSetup({ address }: { address: Address }) {
  const [securityAddress, setSecurityAddress] = useState(DEFAULT_SECURITY);

  const token = securityAddress.startsWith("0x") ? (securityAddress as Address) : undefined;

  const { writeContract, data: txHash, isPending, isError, error } = useWriteContract();

  function handleAuthorize() {
    if (!token) return;
    writeContract({
      address: token,
      abi: AUTHORIZE_OPERATOR_ABI,
      functionName: "authorizeOperator",
      args: [TENOR_SETTLEMENT_ADDRESS],
    });
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-white">Borrower Setup — Authorize ATS Operator</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Connected as <span className="font-mono text-zinc-300">{address}</span>
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-sm text-zinc-400">
          Security Token Address (Bond Diamond)
          <input
            type="text"
            value={securityAddress}
            onChange={(e) => setSecurityAddress(e.target.value)}
            placeholder="0x..."
            className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <button
          onClick={handleAuthorize}
          disabled={!token || isPending}
          className="mt-1 w-fit rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Authorize Operator
        </button>

        <TxFeedback txHash={txHash} isPending={isPending} isError={isError} error={error} />
      </div>
    </section>
  );
}

export default function SetupPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">Connect your wallet to continue.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold text-white">Setup</h1>
      <p className="text-sm text-zinc-400">
        One-time approvals required before trading. Complete the section matching your role.
      </p>
      <LenderSetup address={address} />
      <BorrowerSetup address={address} />
    </div>
  );
}
