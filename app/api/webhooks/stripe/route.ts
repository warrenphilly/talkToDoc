import { getUserById, updateUserCreditBalance } from "@/lib/firebase/firestore";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with your secret key


// This is your Stripe webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature") as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret!);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Make sure this is a credit purchase
    if (session.metadata?.type === "credit_purchase") {
      await fulfillCreditPurchase(session);
    }
  }

  return NextResponse.json({ received: true });
}

async function fulfillCreditPurchase(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!userId || isNaN(credits)) {
      console.error("Invalid metadata in session:", session.metadata);
      return;
    }

    // Get current user data
    const user = await getUserById(userId);
    if (!user) {
      console.error("User not found:", userId);
      return;
    }

    // Calculate new credit balance
    const currentCredits = user.creditBalance || 0;
    const newCreditBalance = currentCredits + credits;

    // Update the user's credit balance
    await updateUserCreditBalance(userId, newCreditBalance);

    console.log(
      `Successfully updated credit balance for user ${userId}: ${currentCredits} -> ${newCreditBalance}`
    );
  } catch (error) {
    console.error("Error fulfilling credit purchase:", error);
  }
}

// This is needed for Next.js to handle the raw body
export const config = {
  api: {
    bodyParser: false,
  },
};
