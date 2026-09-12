import { NextRequest, NextResponse } from "next/server";
import { insertBorrowRequest, listBorrowRequests } from "@/lib/db";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const filters = {
    status: params.get("status") ?? "open",
    minPrincipal: params.get("minPrincipal") ?? undefined,
    maxPrincipal: params.get("maxPrincipal") ?? undefined,
    minMaturityDays: params.get("minMaturityDays")
      ? Number(params.get("minMaturityDays"))
      : undefined,
    maxMaturityDays: params.get("maxMaturityDays")
      ? Number(params.get("maxMaturityDays"))
      : undefined,
  };

  const requests = listBorrowRequests(filters);
  return NextResponse.json(requests);
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
