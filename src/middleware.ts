import { NextResponse, type NextRequest } from "next/server";

// CSRF defense: reject cross-origin state-changing requests to the API. The session
// cookie is SameSite=Lax, this closes the gap for any non-simple cross-site POST.
function crossOriginApiWrite(req: NextRequest): boolean {
  if (!req.nextUrl.pathname.startsWith("/api/")) return false;
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

const CSP = [
  "default-src 'self'",
  // The form expression engine compiles designer expressions with new Function at runtime.
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export function middleware(req: NextRequest) {
  if (crossOriginApiWrite(req)) {
    return new NextResponse(JSON.stringify({ error: "cross_origin" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", CSP);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
