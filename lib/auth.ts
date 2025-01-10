"use server";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

export async function getCurrentUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("User not authenticated");
  return userId;
}
