"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function getCurrentUserId() {
  const { userId } = await auth();

  if (!userId) {
    // If no userId, redirect to home page where Hero component will be shown
    redirect("/");
  }

  try {
    // Verify the session is still valid by attempting to get the user
    const clerk = await clerkClient();
    await clerk.users.getUser(userId);
    return userId;
  } catch (error) {
    // If there's an error (invalid/expired session), redirect to home
    redirect("/");
  }
}
