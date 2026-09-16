import { CANONICAL_HOST,REDIRECT_HOSTS,SEO_PRIVATE_PATHS } from "@/constants/seoRoutes";
import { NextRequest,NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.nextUrl.hostname.toLowerCase();
  if (REDIRECT_HOSTS.has(host)) {
    const destination = request.nextUrl.clone();
    destination.protocol = "https";
    destination.hostname = CANONICAL_HOST;
    destination.port = "";
    return NextResponse.redirect(destination, 301);
  }

  const response = NextResponse.next();
  if (SEO_PRIVATE_PATHS.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

// OpenNext's Cloudflare build currently requires the legacy runtime identifier.
export const runtime = "experimental-edge";
export const config = { matcher: "/((?!_next/static|_next/image|favicon.ico).*)" };
