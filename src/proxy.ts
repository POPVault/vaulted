import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, INVESTOR_COOKIE, verifyToken } from "@/lib/session-token";

/**
 * First filter only: signature, purpose and expiry, no database. Authorization
 * is decided by requireInvestor and requireAdmin on the server.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = (await check(request, pathname)) ?? NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

const INVEST_PUBLIC = /^\/invest\/(enter|logout|i\/[^/]+)\/?$/;
const ADMIN_PUBLIC = /^\/admin(\/logout)?\/?$/;

async function check(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  if (pathname === "/invest" || pathname.startsWith("/invest/")) {
    if (INVEST_PUBLIC.test(pathname)) return null;
    const session = await verifyToken(request.cookies.get(INVESTOR_COOKIE)?.value, "investor");
    if (session) return null;
    return NextResponse.redirect(new URL("/invest/enter", request.url));
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (ADMIN_PUBLIC.test(pathname)) return null;
    const session = await verifyToken(request.cookies.get(ADMIN_COOKIE)?.value, "admin");
    if (session?.sub === "admin") return null;
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return null;
}

export const config = {
  matcher: ["/invest/:path*", "/admin/:path*"],
};
