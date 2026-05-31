import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|fonts|images).*)"],
};

export default auth((req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const isLoggedIn = !!req.auth?.user;
  let currentHost = hostname
    .replace(`.tamph.com`, "")
    .replace(`.localhost:3000`, "");

  if (url.pathname === "/favicon.ico" && currentHost === "research") {
    return NextResponse.rewrite(new URL("/research-favicon.svg", req.url));
  }

  if (url.pathname === "/research-favicon.svg" || url.pathname === "/icon.svg") {
    return NextResponse.next();
  }

  // 1. Shared Global Routes (do not prefix with subdomains)
  const isAuthRoute =
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/register") ||
    url.pathname.startsWith("/verify-email");
  if (isAuthRoute) {
    if (isLoggedIn && !url.pathname.startsWith("/verify-email")) {
      return NextResponse.redirect(
        new URL(currentHost === "research" ? "/projects" : "/", req.url),
      );
    }
    return NextResponse.next();
  }

  // 2. Root Domain Routing
  if (hostname === "tamph.com" || hostname === "localhost:3000") {
    // Block direct access to subdomains from the root URL path
    if (
      url.pathname.startsWith("/admin") ||
      url.pathname.startsWith("/learn") ||
      url.pathname.startsWith("/research")
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 3. Subdomain Route Protection & Rewriting
  if (currentHost === "admin") {
    // Protect Admin Subdomain
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(
          `/login?callbackUrl=${encodeURIComponent(url.pathname + url.search)}`,
          req.url,
        ),
      );
    }
    const roles = (req.auth?.user as any)?.roles || [];
    if (!roles.includes("ADMIN") && !roles.includes("MODERATOR")) {
      // If logged in but not an admin/moderator, send them to unauthorized page
      return NextResponse.redirect(new URL("https://tamph.com/401", req.url));
    }
    return NextResponse.rewrite(new URL(`/admin${url.pathname}`, req.url));
  }

  if (currentHost === "learn") {
    // Protect LMS
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(
          `/login?callbackUrl=${encodeURIComponent(url.pathname + url.search)}`,
          req.url,
        ),
      );
    }
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-site-pathname", url.pathname);
    return NextResponse.rewrite(new URL(`/learn${url.pathname}`, req.url), {
      request: { headers: requestHeaders },
    });
  }

  if (currentHost === "research") {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(
          `/login?callbackUrl=${encodeURIComponent(url.pathname + url.search)}`,
          req.url,
        ),
      );
    }
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-site-pathname", url.pathname);
    return NextResponse.rewrite(new URL(`/research${url.pathname}`, req.url), {
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
});
