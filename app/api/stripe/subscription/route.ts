import { getUserByClerkId } from "@/lib/firebase/firestore";
import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is properly initialized
    if (!stripe) {
      console.error("Stripe client not initialized");
      return NextResponse.json(
        { error: "Payment service unavailable" },
        { status: 500 }
      );
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to subscribe" },
        { status: 401 }
      );
    }

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    // Get the Firestore user to store in metadata
    const firestoreUser = await getUserByClerkId(user.id);
    if (!firestoreUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Map plan IDs to Stripe price IDs
    const priceMap: Record<string, string> = {
      "pro-monthly": process.env.STRIPE_PRICE_MONTHLY || "",
      "pro-yearly": process.env.STRIPE_PRICE_YEARLY || "",
    };

    const priceId = priceMap[planId];

    // Better error handling for missing price IDs
    if (!priceId) {
      console.error(`Missing price ID for plan: ${planId}`, {
        availablePrices: {
          monthly: process.env.STRIPE_PRICE_MONTHLY ? "Set" : "Not set",
          yearly: process.env.STRIPE_PRICE_YEARLY ? "Set" : "Not set",
        },
      });

      return NextResponse.json(
        { error: "Invalid plan selected or price configuration missing" },
        { status: 400 }
      );
    }

    // Create a checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true&subscription=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
      metadata: {
        userId: firestoreUser.id,
        clerkId: user.id,
        type: "subscription",
        planId: planId,
      },
      customer_email: user.emailAddresses[0]?.emailAddress,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating subscription session:", error);
    return NextResponse.json(
      { error: "Failed to create subscription session" },
      { status: 500 }
    );
  }
}
