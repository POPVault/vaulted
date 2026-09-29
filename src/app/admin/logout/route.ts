import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-session";

export function GET() {
  const response = new NextResponse(null, { status: 303, headers: { Location: "/admin" } });
  response.headers.set("Cache-Control", "no-store");
  const { name, value, ...options } = clearAdminSessionCookie();
  response.cookies.set(name, value, options);
  return response;
}
