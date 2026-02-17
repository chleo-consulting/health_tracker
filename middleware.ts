import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const { pathname } = request.nextUrl;

  // Rediriger vers /dashboard si déjà authentifié
  if (session && ["/", "/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protéger /dashboard et /api/entries
  if (!session) {
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname.startsWith("/api/entries")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Session manquante ou expirée" } },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/:path*", "/api/entries/:path*"],
};
