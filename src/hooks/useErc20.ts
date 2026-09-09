"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { erc20Abi, type Address } from "viem";

export function useErc20Balance(
  token: Address | undefined,
  account: Address | undefined,
) {
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !!token && !!account },
  });
}

export function useErc20Allowance(
  token: Address | undefined,
  owner: Address | undefined,
  spender: Address | undefined,
) {
  return useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!token && !!owner && !!spender },
  });
}

export function useErc20Approve() {
  const { writeContract, data: txHash, ...rest } = useWriteContract();

  function approve(token: Address, spender: Address, amount: bigint) {
    writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
    });
  }

  return { approve, txHash, ...rest };
}
