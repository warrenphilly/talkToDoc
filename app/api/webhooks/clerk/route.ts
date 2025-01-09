import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createNewUser } from '@/lib/firebase/firestore'

export async function POST(req: Request) {
  console.log('Webhook received'); // Debug log

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET'); // Debug log
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers:', { svix_id, svix_timestamp, svix_signature }); // Debug log
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  console.log('Webhook payload:', payload); // Debug log
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    })
  }

  // Handle the webhook
  if (evt.type === 'user.created') {
    console.log('User created event received:', evt.data); // Debug log
    const { id, email_addresses, ...userData } = evt.data;
    
    try {
      await createNewUser({
        id,
        email: email_addresses[0]?.email_address,
        metadata: userData
      });
      
      console.log('User successfully created in Firestore'); // Debug log
      return new Response('User created successfully', { status: 200 })
    } catch (error) {
      console.error('Error creating user in Firestore:', error);
      return new Response('Error creating user', { status: 500 })
    }
  }

  console.log('Webhook processed, but no user.created event'); // Debug log
  return new Response('', { status: 200 })
}