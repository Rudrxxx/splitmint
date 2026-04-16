import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("sm_token")?.value

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register")
  const isDashboardRoute = pathname.startsWith("/dashboard")

  if (isDashboardRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
}