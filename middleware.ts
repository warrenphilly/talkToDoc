import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const middleware = clerkMiddleware();

export default middleware;

export const config = {
  matcher: [
    // Exclude the /api/convert routes (or whichever large-file routes are used)
    "/((?!^api/convert).*)",
    "/(api|trpc)(.*)",
  ],
};