import { NextRequest, NextResponse } from "next/server";
import { decodeAbiParameters, type Address, type Hex } from "viem";
import type { RepoFromEvent } from "@/types/repo-api";

const REPO_OPENED_TOPIC =
  "0x2140300833b75568cd4d84ccca076b1f311a3690644751af2b09a735f20ad49c";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TENOR_SETTLEMENT_ADDRESS ?? "";

interface MirrorLog {
  topics: Hex[];
  data: Hex;
}

interface MirrorResponse {
  logs: MirrorLog[];
  links?: { next?: string };
}

export async function GET(request: NextRequest) {
  const filterAddress = request.nextUrl.searchParams
    .get("address")
    ?.toLowerCase();

  if (!CONTRACT_ADDRESS) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_TENOR_SETTLEMENT_ADDRESS not set" },
      { status: 500 },
    );
  }

  const url = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${CONTRACT_ADDRESS}/results/logs?topic0=${REPO_OPENED_TOPIC}&limit=100`;

  const res = await fetch(url, { next: { revalidate: 10 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Mirror node returned ${res.status}` },
      { status: 502 },
    );
  }

  const body = (await res.json()) as MirrorResponse;

  const dataParams = [
    { name: "security", type: "address" as const },
    { name: "collateralQty", type: "uint256" as const },
    { name: "cash", type: "address" as const },
    { name: "principal", type: "uint256" as const },
    { name: "repurchase", type: "uint256" as const },
    { name: "maturity", type: "uint64" as const },
    { name: "scheduleAddress", type: "address" as const },
  ] as const;

  const repos: RepoFromEvent[] = [];

  for (const log of body.logs ?? []) {
    if (log.topics.length < 4) continue;

    const id = log.topics[1];
    const lender = ("0x" + log.topics[2].slice(26)) as Address;
    const borrower = ("0x" + log.topics[3].slice(26)) as Address;

    const decoded = decodeAbiParameters(dataParams, log.data);

    const repo: RepoFromEvent = {
      id,
      lender,
      borrower,
      security: decoded[0],
      collateralQty: decoded[1].toString(),
      cash: decoded[2],
      principal: decoded[3].toString(),
      repurchase: decoded[4].toString(),
      maturity: decoded[5].toString(),
      scheduleAddress: decoded[6],
    };

    if (filterAddress) {
      if (
        repo.lender.toLowerCase() !== filterAddress &&
        repo.borrower.toLowerCase() !== filterAddress
      ) {
        continue;
      }
    }

    repos.push(repo);
  }

  return NextResponse.json(repos);
}
