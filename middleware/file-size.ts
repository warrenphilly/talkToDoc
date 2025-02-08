import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/convert')) {
    return NextResponse.next({
      headers: {
        'max-body-size': '10mb',
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/convert/:path*',
};