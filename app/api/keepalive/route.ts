import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://zzugeqlhjwibabomjxdw.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export async function GET() {
  try {
    if (!supabaseAnonKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing Supabase anon key. Add NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY in Vercel environment variables.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("keepalive_ping")
      .upsert(
        {
          id: 1,
          project: "ReffGuardPro",
          touched_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id, project, touched_at")
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          hint:
            "Run supabase/keepalive_ping.sql once in Supabase SQL Editor, then check Vercel env vars.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown keepalive error",
      },
      { status: 500 }
    );
  }
}
