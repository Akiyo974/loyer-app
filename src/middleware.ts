import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register");

  const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
  const isOnboarding = nextUrl.pathname.startsWith("/onboarding");

  // Autoriser les routes auth et API
  if (isApiAuth) return NextResponse.next();

  // Rediriger les utilisateurs non connectés vers /login
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Rediriger les utilisateurs connectés hors des pages auth
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
