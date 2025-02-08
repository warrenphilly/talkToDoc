import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const middleware = clerkMiddleware();

export default middleware;

export const config = {
  matcher: [
    // Exclude /api/convert routes from Clerk because it can re-parse large files
    "/((?!^api/convert).*)",
    "/(api|trpc)(.*)",
  ],
};