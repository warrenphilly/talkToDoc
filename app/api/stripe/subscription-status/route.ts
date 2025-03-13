import { getUserByClerkId } from "@/lib/firebase/firestore";
import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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
        { error: "You must be logged in to check subscription status" },
        { status: 401 }
      );
    }

    // Get subscription ID from query params
    const url = new URL(req.url);
    const subscriptionId = url.searchParams.get("id");

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Get the Firestore user
    const firestoreUser = await getUserByClerkId(user.id);
    if (!firestoreUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Verify that the subscription belongs to this user
    if (
      !firestoreUser.metadata?.subscriptionId ||
      firestoreUser.metadata.subscriptionId !== subscriptionId
    ) {
      return NextResponse.json(
        { error: "Subscription not found for this user" },
        { status: 403 }
      );
    }

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: subscription.cancel_at,
      },
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return NextResponse.json(
      { error: "Failed to check subscription status" },
      { status: 500 }
    );
  }
}
