import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Get the token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if no token
  if (!token) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  // If logged in and trying to access login page, redirect to home
  if (pathname === "/login") {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  // Role-based access control
  const role = token.role as string;

  // Admin routes
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  // HOD routes
  if (pathname.startsWith("/hod") && role !== "HOD") {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  // Faculty routes (accessible by both FACULTY and STAFF roles)
  if (pathname.startsWith("/faculty") && role !== "FACULTY" && role !== "STAFF") {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  // Student routes
  if (pathname.startsWith("/student") && role !== "STUDENT") {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}

// Protect all routes except public ones
export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
