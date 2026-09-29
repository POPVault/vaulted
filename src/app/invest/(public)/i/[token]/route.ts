import { NextResponse, type NextRequest } from "next/server";
import { getInvestorByToken, hasOfferingAccess } from "@/data/investors";
import { findCurrentOffering } from "@/data/offerings";
import { consume } from "@/data/rateLimit";
import { clientIp } from "@/lib/ip";
import { investorSessionCookie, sessionProvider, touchLastViewed } from "@/lib/session";
import { isInviteToken } from "@/lib/validation/invite";

const WINDOW_MINUTES = 15;

function seeOther(location: string): NextResponse {
  // Relative Location, so the host behind the reverse proxy never matters.
  const response = new NextResponse(null, { status: 303, headers: { Location: location } });
  response.headers.set("Cache-Control", "no-store");
  // The token is in this URL; never pass it on as a referrer.
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

/** Any failure gets the same answer with no detail. */
function failure(): NextResponse {
  return seeOther("/invest/enter?e=1");
}

export async function GET(request: NextRequest, ctx: RouteContext<"/invest/i/[token]">) {
  const ip = clientIp(request.headers);
  // Both limits are consumed on every attempt; either being over rejects.
  const perIp = await consume(`token:${ip}`, 10, WINDOW_MINUTES);
  const global = await consume("token:global", 300, WINDOW_MINUTES);
  if (!perIp.allowed || !global.allowed) return failure();

  const { token } = await ctx.params;
  if (!isInviteToken(token)) return failure();

  const [investor, offering] = await Promise.all([getInvestorByToken(token), findCurrentOffering()]);
  if (!investor || !offering) return failure();
  if (!(await hasOfferingAccess(investor.id, offering.id))) return failure();

  await touchLastViewed(investor.id);
  const { name, value, ...options } = investorSessionCookie(
    await sessionProvider.createInvestorSession(investor.id),
  );
  const response = seeOther("/invest");
  response.cookies.set(name, value, options);
  return response;
}
