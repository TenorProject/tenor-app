import { NextRequest, NextResponse } from "next/server";
import { getProfile, upsertProfile } from "@/lib/db";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const profile = getProfile(address);
  if (!profile) {
    return NextResponse.json(null);
  }

  return NextResponse.json(profile);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, displayName, telegram, twitter } = body;

    if (!address || !displayName?.trim()) {
      return NextResponse.json({ error: "address and displayName are required" }, { status: 400 });
    }

    const tg = (telegram ?? "").trim();
    const tw = (twitter ?? "").trim();

    if (!tg && !tw) {
      return NextResponse.json(
        { error: "At least one social contact (Telegram or Twitter) is required" },
        { status: 400 },
      );
    }

    upsertProfile({
      address,
      displayName: displayName.trim(),
      telegram: tg,
      twitter: tw,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
