import { NextResponse } from "next/server";
import { sessionProvider } from "@/lib/session";

export function GET() {
  const response = new NextResponse(null, { status: 303, headers: { Location: "/invest/enter" } });
  response.headers.set("Cache-Control", "no-store");
  const { name, value, ...options } = sessionProvider.clear();
  response.cookies.set(name, value, options);
  return response;
}
