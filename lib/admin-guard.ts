import { NextRequest, NextResponse } from "next/server";
import { getSession, AuthedSession } from "@/lib/session";

// Wraps getSession with a role check. Returns either a valid staff session or
// a Response to return immediately — callers do:
//   const result = await requireStaff(req);
//   if (result instanceof NextResponse) return result;
//   const session = result;
export async function requireStaff(req: NextRequest): Promise<AuthedSession | NextResponse> {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "domani_staff") {
    return NextResponse.json({ error: "Staff access only" }, { status: 403 });
  }
  return session;
}