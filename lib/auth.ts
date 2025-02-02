"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function getCurrentUserId() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in"); // Redirect to your sign-in page
  }

  return userId;
}
