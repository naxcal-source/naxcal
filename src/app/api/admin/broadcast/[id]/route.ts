import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { deleteBroadcast, getBroadcast, updateDraftBroadcast } from "@/lib/resend-admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);
  const { id } = await params;
  try {
    const broadcast = await getBroadcast(id);
    return NextResponse.json({ broadcast });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);
  const { id } = await params;
  try {
    const { subject, html, name } = await req.json();
    const broadcast = await updateDraftBroadcast(id, { subject, html, name });
    return NextResponse.json({ broadcast });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);
  const { id } = await params;
  try {
    await deleteBroadcast(id);
    return NextResponse.json({ status: "deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
