"use server";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

    if (!CLERK_SECRET_KEY) {
      return NextResponse.json(
        { error: "CLERK_SECRET_KEY is not defined" },
        { status: 500 }
      );
    }

    const apiKey = CLERK_SECRET_KEY;
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/clerk`;

    // List existing webhooks first
    const listResponse = await fetch("https://api.clerk.dev/v1/webhooks", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const webhooks = await listResponse.json();
    console.log("Existing webhooks:", webhooks);

    // Create a new webhook for user.created events
    const createResponse = await fetch("https://api.clerk.dev/v1/webhooks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        active: true,
        events: ["user.created"],
        description:
          "Automatically create user in Firestore when created in Clerk",
      }),
    });

    const result = await createResponse.json();

    return NextResponse.json({
      success: true,
      message: "Webhook setup completed",
      data: result,
    });
  } catch (error) {
    console.error("Error syncing Clerk webhook:", error);
    return NextResponse.json(
      { error: "Failed to sync Clerk webhook" },
      { status: 500 }
    );
  }
}
