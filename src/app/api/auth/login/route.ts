import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { clientIp } from "@/lib/security";
import { rateLimit, rateLimitReset } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 10, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always run a verify to keep timing roughly constant whether or not the user exists.
  const hash = user?.passwordHash ?? "$2a$10$0000000000000000000000000000000000000000000000000000";
  const valid = (await verifyPassword(password, hash)) && !!user;

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json({ error: "locked", until: user.lockedUntil }, { status: 423 });
  }

  if (!valid) {
    if (user) {
      const fails = user.failedLogins + 1;
      const lock = fails >= MAX_FAILS;
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLogins: lock ? 0 : fails,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        },
      });
    }
    return NextResponse.json({ error: "bad_credentials" }, { status: 401 });
  }

  await db.user.update({ where: { id: user!.id }, data: { failedLogins: 0, lockedUntil: null } });
  rateLimitReset(`login:${ip}`);
  await createSession(user!.id);
  return NextResponse.json({ ok: true });
}
