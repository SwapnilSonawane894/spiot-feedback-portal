import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // If user is logged in and tries to access login page, redirect to home
    if (token && pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Role-based access control
    if (token) {
      const role = token.role as string;

      // Admin routes
      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }

      // HOD routes
      if (pathname.startsWith("/hod") && role !== "HOD") {
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Faculty routes
      if (pathname.startsWith("/faculty") && role !== "FACULTY") {
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Student routes
      if (pathname.startsWith("/student") && role !== "STUDENT") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Public routes that don't require authentication
        if (pathname === "/login" || pathname.startsWith("/api/auth")) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Protect all routes except public ones
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
