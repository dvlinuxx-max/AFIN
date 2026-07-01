import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { apiContext, unauthorized, badRequest, forbidden } from "@/lib/api";

const schema = z.object({ orgId: z.string().min(1) });

export async function POST(req: Request) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();

  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: ctx.userId, orgId: parsed.data.orgId } },
  });
  if (!membership) return forbidden();

  const store = await cookies();
  store.set("afin_org", parsed.data.orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true });
}
