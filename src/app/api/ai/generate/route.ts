import { NextResponse } from "next/server";
import { z } from "zod";
import { apiContext, unauthorized, forbidden, badRequest, ensure } from "@/lib/api";
import { generateForm } from "@/lib/ai";

const schema = z.object({
  prompt: z.string().min(3).max(2000),
  locale: z.enum(["ar", "en"]).optional(),
});

export async function POST(req: Request) {
  const ctx = await apiContext();
  if (!ctx) return unauthorized();
  if (!ensure(ctx.role, "form:write")) return forbidden();

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest();

  try {
    const result = await generateForm(ctx.orgId, parsed.data.prompt, parsed.data.locale ?? "ar");
    return NextResponse.json({ ok: true, schema: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "not_configured") return NextResponse.json({ error: "not_configured" }, { status: 400 });
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
