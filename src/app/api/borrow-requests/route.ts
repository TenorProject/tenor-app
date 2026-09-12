import { NextRequest, NextResponse } from "next/server";
import { insertBorrowRequest, listBorrowRequests, getProfiles, updateBorrowRequestStatus } from "@/lib/db";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const filters = {
    status: params.get("status") ?? undefined,
    borrower: params.get("borrower") ?? undefined,
    minPrincipal: params.get("minPrincipal") ?? undefined,
    maxPrincipal: params.get("maxPrincipal") ?? undefined,
    minMaturityDays: params.get("minMaturityDays")
      ? Number(params.get("minMaturityDays"))
      : undefined,
    maxMaturityDays: params.get("maxMaturityDays")
      ? Number(params.get("maxMaturityDays"))
      : undefined,
    page: params.get("page") ? Number(params.get("page")) : 1,
    pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : 10,
  };

  const { data: requests, total } = listBorrowRequests(filters);

  // Attach profile info for each borrower
  const borrowerAddresses = [...new Set(requests.map((r) => r.borrower))];
  const profiles = getProfiles(borrowerAddresses);

  const enriched = requests.map((r) => ({
    ...r,
    profile: profiles[r.borrower.toLowerCase()] ?? null,
  }));

  return NextResponse.json({
    data: enriched,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.ceil(total / filters.pageSize!),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { borrower, security, collateralQty, cash, principal, maturityDays, haircutBps, note } = body;

    if (!borrower || !security || !collateralQty || !cash || !principal || !maturityDays || haircutBps === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = insertBorrowRequest({
      borrower,
      security,
      collateralQty,
      cash,
      principal,
      maturityDays: Number(maturityDays),
      haircutBps: Number(haircutBps),
      note: note ?? "",
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, borrower } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }

    if (!["pending", "confirmed", "canceled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // For cancel, require borrower address to verify ownership
    const updated = updateBorrowRequestStatus(
      Number(id),
      status,
      status === "canceled" ? borrower : undefined,
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
