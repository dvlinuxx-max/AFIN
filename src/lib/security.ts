// Request-level security helpers: client IP extraction, same-origin checks, and
// password strength rules shared by the auth routes.

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "local";
}

// True when the request is same-origin or has no Origin header (same-site navigations
// and non-CORS posts). Cross-origin state-changing requests are rejected.
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export interface StrengthResult {
  ok: boolean;
  message?: { ar: string; en: string };
}

export function passwordStrength(pw: string): StrengthResult {
  if (pw.length < 8) {
    return { ok: false, message: { ar: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", en: "Password must be at least 8 characters" } };
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(pw)).length;
  if (classes < 3) {
    return {
      ok: false,
      message: {
        ar: "استخدم مزيجاً من الأحرف الكبيرة والصغيرة والأرقام أو الرموز",
        en: "Use a mix of upper, lower case, and numbers or symbols",
      },
    };
  }
  const common = ["password", "12345678", "qwerty", "11111111", "afin12345", "00000000"];
  if (common.includes(pw.toLowerCase())) {
    return { ok: false, message: { ar: "كلمة المرور شائعة جداً", en: "This password is too common" } };
  }
  return { ok: true };
}
