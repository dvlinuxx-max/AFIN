import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

const schema = z.object({ name: z.string().min(1).max(160) });

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const org = await db.organization.create({
    data: { name: parsed.data.name, slug: `org-${nanoid(6)}` },
  });
  await db.membership.create({ data: { userId, orgId: org.id, role: "owner" } });
  return NextResponse.json({ ok: true, id: org.id });
}
