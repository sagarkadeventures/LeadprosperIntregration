import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "radcred-super-secret-key-2026"
);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // ── Protect dashboard routes ──────────────────────────
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/apply")) {
    const token = request.cookies.get("rc_token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("rc_token");
      return response;
    }
  }

  // ── Redirect logged-in users away from login ──────────
  if (pathname === "/login") {
    const token = request.cookies.get("rc_token")?.value;
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } catch {}
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/apply/:path*", "/login"],
};