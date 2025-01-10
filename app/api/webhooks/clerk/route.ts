import { createNewUser } from "@/lib/firebase/firestore";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

export async function POST(req: Request) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!WEBHOOK_SECRET) {
      throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
    }

    // Get the headers
    const headersList = await headers();
    const svix_id = headersList.get("svix-id");
    const svix_timestamp = headersList.get("svix-timestamp");
    const svix_signature = headersList.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Error occurred -- no svix headers', {
        status: 400
      });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

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
      console.error('Error verifying webhook:', err);
      return new Response('Error occurred', {
        status: 400
      });
    }

    // Handle the webhook
    const eventType = evt.type;
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data;
      
      await createNewUser({
        id,
        email: email_addresses?.[0]?.email_address,
        firstName: first_name || undefined,
        lastName: last_name || undefined,
        imageUrl: image_url,
        createdAt: new Date(),
        metadata: public_metadata as Record<string, any> || {}
      });
    }

    return new Response('Success', { status: 200 });
  } catch (error) {
    console.error('Error in webhook:', error);
    return new Response('Error occurred', { status: 400 });
  }
}
