import { NextRequest, NextResponse } from "next/server";
import { decodeAbiParameters, type Address, type Hex } from "viem";
import type { RepoFromEvent } from "@/types/repo-api";
import { getReposByAddress, upsertRepo } from "@/lib/db";

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

const dataParams = [
  { name: "security", type: "address" as const },
  { name: "collateralQty", type: "uint256" as const },
  { name: "cash", type: "address" as const },
  { name: "principal", type: "uint256" as const },
  { name: "repurchase", type: "uint256" as const },
  { name: "maturity", type: "uint64" as const },
  { name: "scheduleAddress", type: "address" as const },
] as const;

async function fetchFromMirrorNode(
  filterAddress?: string,
): Promise<RepoFromEvent[]> {
  if (!CONTRACT_ADDRESS) return [];

  const url = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${CONTRACT_ADDRESS}/results/logs?topic0=${REPO_OPENED_TOPIC}&limit=100`;

  const res = await fetch(url, { next: { revalidate: 10 } });
  if (!res.ok) return [];

  const body = (await res.json()) as MirrorResponse;
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

    // Persist to SQLite (status 1 = Open, since it came from RepoOpened event)
    upsertRepo(repo, 1);
  }

  return repos;
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

  // Return cached DB results immediately, refresh from chain in parallel
  const cached = filterAddress ? getReposByAddress(filterAddress) : [];

  const fresh = await fetchFromMirrorNode(filterAddress);

  // Use fresh if available, fall back to cached
  const results = fresh.length > 0 ? fresh : cached;

  return NextResponse.json(results);
}
