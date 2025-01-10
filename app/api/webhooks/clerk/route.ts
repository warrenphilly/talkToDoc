import { createNewUser } from '@/lib/firebase/firestore';
import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

export async function POST(req: Request) {
  try {
    console.log('Webhook received');

    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
    if (!WEBHOOK_SECRET) {
      throw new Error('Missing CLERK_WEBHOOK_SECRET')
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing svix headers:', { svix_id, svix_timestamp, svix_signature });
      return new Response('Missing svix headers', {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get the body as text first
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    
    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    try {
      const evt = wh.verify(rawBody, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;

      // Handle the webhook
      if (evt.type === 'user.created') {
        const { id, email_addresses, ...userData } = evt.data;
        
        await createNewUser({
          id,
          email: email_addresses[0]?.email_address,
          metadata: userData
        });
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ success: true, message: 'Webhook processed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (err) {
      console.error('Webhook verification failed:', err);
      return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Webhook processing failed:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}