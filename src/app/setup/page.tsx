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

  if (isPending) return (
    <div className="mt-3 flex items-center gap-2 text-sm text-yellow-400">
      <div className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
      Waiting for wallet...
    </div>
  );
  if (isConfirming) return (
    <div className="mt-3 flex items-center gap-2 text-sm text-yellow-400">
      <div className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
      Confirming transaction...
    </div>
  );
  if (isSuccess) return (
    <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
      <p className="text-sm text-emerald-400">Transaction confirmed.</p>
    </div>
  );
  if (isError) return (
    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
      <p className="text-sm text-red-400">{error?.message ?? "Transaction failed."}</p>
    </div>
  );
  return null;
}

function LenderSetup({ address }: { address: Address }) {
  const [usdcAddress, setUsdcAddress] = useState(DEFAULT_USDC);
  const [amount, setAmount] = useState("1000000");
  const [securityAddress, setSecurityAddress] = useState(DEFAULT_SECURITY);

  const token = usdcAddress.startsWith("0x") ? (usdcAddress as Address) : undefined;
  const bondToken = securityAddress.startsWith("0x") ? (securityAddress as Address) : undefined;

  const { data: allowance } = useErc20Allowance(token, address, TENOR_SETTLEMENT_ADDRESS);
  const { approve, txHash, isPending, isError, error } = useErc20Approve();

  const { writeContract, data: authTxHash, isPending: authPending, isError: authIsError, error: authError } = useWriteContract();

  function handleApprove() {
    if (!token) return;
    const parsed = parseUnits(amount, 6);
    approve(token, TENOR_SETTLEMENT_ADDRESS, parsed);
  }

  function handleAuthorizeBond() {
    if (!bondToken) return;
    writeContract({
      address: bondToken,
      abi: AUTHORIZE_OPERATOR_ABI,
      functionName: "authorizeOperator",
      args: [TENOR_SETTLEMENT_ADDRESS],
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 sm:p-8 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs font-mono text-zinc-400">L</div>
          <h2 className="text-lg font-semibold text-white">Lender Setup</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Approve USDC spending and authorize TenorSettlement on the ATS security token.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">USDC Token Address</span>
          <input
            type="text"
            value={usdcAddress}
            onChange={(e) => setUsdcAddress(e.target.value)}
            placeholder="0x..."
            className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
          />
        </label>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Approval Amount (USDC)</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000"
            className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
          />
        </label>

        <button
          onClick={handleApprove}
          disabled={!token || isPending}
          className="w-fit rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Approve USDC
        </button>

        <TxFeedback txHash={txHash} isPending={isPending} isError={isError} error={error} />

        {allowance !== undefined && token && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>Current allowance:</span>
            <span className="font-mono text-zinc-300">
              {formatUnits(allowance, 6)} USDC
            </span>
          </div>
        )}

        <div className="border-t border-zinc-800/60 pt-4 mt-1">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">ATS Bond Authorization</p>
          <label className="block text-sm mb-3">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Security Token Address</span>
            <input
              type="text"
              value={securityAddress}
              onChange={(e) => setSecurityAddress(e.target.value)}
              placeholder="0x..."
              className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
            />
          </label>
          <button
            onClick={handleAuthorizeBond}
            disabled={!bondToken || authPending}
            className="w-fit rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Authorize Operator
          </button>
          <TxFeedback txHash={authTxHash} isPending={authPending} isError={authIsError} error={authError} />
        </div>
      </div>
    </section>
  );
}

function BorrowerSetup({ address }: { address: Address }) {
  const [securityAddress, setSecurityAddress] = useState(DEFAULT_SECURITY);
  const [approveAmount, setApproveAmount] = useState("1000000");

  const token = securityAddress.startsWith("0x") ? (securityAddress as Address) : undefined;

  const { writeContract, data: txHash, isPending, isError, error } = useWriteContract();
  const { approve, txHash: approveTxHash, isPending: approvePending, isError: approveIsError, error: approveError } = useErc20Approve();
  const { data: allowance } = useErc20Allowance(token, address, TENOR_SETTLEMENT_ADDRESS);

  function handleAuthorize() {
    if (!token) return;
    writeContract({
      address: token,
      abi: AUTHORIZE_OPERATOR_ABI,
      functionName: "authorizeOperator",
      args: [TENOR_SETTLEMENT_ADDRESS],
    });
  }

  function handleApprove() {
    if (!token) return;
    approve(token, TENOR_SETTLEMENT_ADDRESS, BigInt(approveAmount));
  }

  return (
    <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 sm:p-8 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs font-mono text-zinc-400">B</div>
          <h2 className="text-lg font-semibold text-white">Borrower Setup</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Approve and authorize TenorSettlement on the ATS security token.
        </p>
      </div>

      <div className="flex flex-col gap-4">
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

        <button
          onClick={handleAuthorize}
          disabled={!token || isPending}
          className="w-fit rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Authorize Operator
        </button>

        <TxFeedback txHash={txHash} isPending={isPending} isError={isError} error={error} />

        <div className="border-t border-zinc-800/60 pt-4 mt-1">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">ERC-20 Approval</p>
          <label className="block text-sm mb-3">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Approval Amount (raw)</span>
            <input
              type="text"
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              placeholder="1000000"
              className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
            />
          </label>
          <button
            onClick={handleApprove}
            disabled={!token || approvePending}
            className="w-fit rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Approve
          </button>
          <TxFeedback txHash={approveTxHash} isPending={approvePending} isError={approveIsError} error={approveError} />
          {allowance !== undefined && token && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 mt-3">
              <span>Current allowance:</span>
              <span className="font-mono text-zinc-300">{allowance.toString()}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function SetupPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-zinc-600">
            <svg viewBox="0 0 24 24" className="h-10 w-10 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-zinc-400">Connect your wallet to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Setup</h1>
        <p className="mt-1 text-sm text-zinc-500">
          One-time approvals required before trading. Complete the section matching your role.
        </p>
      </div>
      <LenderSetup address={address} />
      <BorrowerSetup address={address} />
    </div>
  );
}
