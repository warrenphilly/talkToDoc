import {
  createFirestoreUser,
  getUserByClerkId,
} from "@/lib/firebase/firestore";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

export async function POST(req: Request) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
      throw new Error(
        "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
      );
    }

    // Get the headers
    const headersList = await headers();
    const svix_id = headersList.get("svix-id");
    const svix_timestamp = headersList.get("svix-timestamp");
    const svix_signature = headersList.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("Missing Svix headers:", {
        svix_id,
        svix_timestamp,
        svix_signature,
      });
      return new Response("Error occurred -- no svix headers", {
        status: 400,
      });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    console.log("Received webhook payload:", body);

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error verifying webhook signature", {
        status: 400,
      });
    }

    // Handle the webhook
    const eventType = evt.type;
    console.log(
      "Received Clerk webhook event:",
      eventType,
      "with data:",
      JSON.stringify(evt.data)
    );

    if (eventType === "user.created") {
      const {
        id,
        email_addresses,
        first_name,
        last_name,
        username,
        image_url,
        public_metadata,
      } = evt.data;

      if (!id) {
        console.error("Missing user ID in webhook data");
        return new Response("Missing user ID in webhook data", { status: 400 });
      }

      try {
        // Check if user already exists in Firestore
        const existingUser = await getUserByClerkId(id);

        if (!existingUser) {
          console.log("Creating new Firestore user for Clerk user:", id);

          // Create the user in Firestore
          const userData = {
            id,
            email: email_addresses?.[0]?.email_address,
            firstName: first_name || undefined,
            lastName: last_name || undefined,
            username: username || undefined,
            imageUrl: image_url,
            metadata: (public_metadata as Record<string, any>) || {},
            language: "English", // Default language
          };

          console.log("User data to be saved:", JSON.stringify(userData));

          // Create the user in Firestore
          const userId = await createFirestoreUser(userData);

          console.log("Successfully created Firestore user:", userId);
        } else {
          console.log("User already exists in Firestore:", existingUser.id);
        }
      } catch (error) {
        console.error("Error processing user.created event:", error);
        return new Response("Error processing user.created event", {
          status: 500,
        });
      }
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Unexpected error in webhook handler:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
