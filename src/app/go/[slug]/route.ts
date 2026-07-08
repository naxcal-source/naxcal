import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabaseAdmin.from("redirects").select("destination_url").eq("slug", slug).single();
  if (!data) return NextResponse.redirect(new URL("/", _req.url));
  return NextResponse.redirect(data.destination_url);
}
