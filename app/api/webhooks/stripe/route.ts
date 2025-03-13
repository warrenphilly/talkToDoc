import {
  forceUpdateUserCreditBalance,
  getUserByClerkId,
  getUserById,
  updateUserCreditBalance,
  updateUserSubscription,
} from "@/lib/firebase/firestore";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

// This is your Stripe webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Check if Stripe is properly initialized
  if (!stripe) {
    console.error("Stripe client not initialized");
    return NextResponse.json(
      { error: "Payment service unavailable" },
      { status: 500 }
    );
  }

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
  console.log("tip the mast", event);

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    console.log("Checkout session completed:", session);

    // Handle different types of checkout sessions
    if (session.metadata?.type === "credit_purchase") {
      await fulfillCreditPurchase(session);
    } else if (session.metadata?.type === "subscription") {
      await handleSubscription(session);
    } else if (session.metadata?.type === "subscription_change") {
      await handleSubscriptionChange(session);
    }
  }

  return NextResponse.json({ received: true });
}

async function fulfillCreditPurchase(session: any) {
  try {
    console.log("Processing credit purchase from webhook:", {
      metadata: session.metadata,
      sessionId: session.id,
    });

    const userId = session.metadata?.userId;
    const clerkId = session.metadata?.clerkId; // Also check for clerkId
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if ((!userId && !clerkId) || isNaN(credits)) {
      console.error("Invalid metadata in session:", session.metadata);
      return;
    }

    // Try to get user by Firestore userId first
    let user = userId ? await getUserById(userId) : null;

    // If not found and we have clerkId, try to get by clerkId
    if (!user && clerkId) {
      console.log(`User not found by userId, trying clerkId: ${clerkId}`);
      user = await getUserByClerkId(clerkId);
    }

    if (!user) {
      console.error("User not found with either ID:", { userId, clerkId });
      return;
    }

    console.log("Found user:", {
      id: user.id,
      clerkId: user.clerkId,
      currentCredits: user.creditBalance,
    });

    // Calculate new credit balance
    const currentCredits = user.creditBalance || 0;
    const newCreditBalance = currentCredits + credits;

    console.log(
      `Updating credit balance: ${currentCredits} + ${credits} = ${newCreditBalance}`
    );

    // Try the force update function
    const updateResult = await forceUpdateUserCreditBalance(
      user.id, // Use the user.id from the found user
      newCreditBalance
    );

    if (updateResult) {
      console.log(
        `Successfully updated credit balance for user ${user.id}: ${currentCredits} -> ${newCreditBalance}`
      );
    } else {
      console.error(`Failed to update credit balance for user ${user.id}`);

      // Fallback to the regular update function
      const fallbackResult = await updateUserCreditBalance(
        user.id, // Use the user.id from the found user
        newCreditBalance
      );
      console.log(`Fallback update result: ${fallbackResult}`);

      // Verify the update worked
      const updatedUser = await getUserById(user.id);
      console.log("User after update attempt:", {
        id: updatedUser?.id,
        creditBalance: updatedUser?.creditBalance,
      });
    }
  } catch (error) {
    console.error("Error fulfilling credit purchase:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }
}

// Add this new function to handle subscriptions
async function handleSubscription(session: any) {
  try {
    console.log("Processing subscription from webhook:", {
      metadata: session.metadata,
      sessionId: session.id,
    });

    const userId = session.metadata?.userId;
    const clerkId = session.metadata?.clerkId;
    const planId = session.metadata?.planId;

    if (!userId || !clerkId || !planId) {
      console.error("Invalid metadata in session:", session.metadata);
      return;
    }

    // Get the user
    let user = await getUserById(userId);
    if (!user) {
      console.error("User not found:", { userId, clerkId });
      return;
    }

    // Update user metadata to reflect Pro status
    const isPro = planId !== "pay-as-you-go";

    // Update the user's metadata in Firestore
    // You'll need to implement this function in your firestore.ts file
    await updateUserSubscription(userId, {
      isPro,
      subscriptionId: session.subscription,
      planId,
      updatedAt: new Date().toISOString(),
    });

    console.log(
      `Successfully updated subscription for user ${userId} to ${planId}`
    );
  } catch (error) {
    console.error("Error handling subscription:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }
}

// Add this new function to handle subscription changes
async function handleSubscriptionChange(session: any) {
  try {
    console.log("Processing subscription change from webhook:", {
      metadata: session.metadata,
      sessionId: session.id,
    });

    const userId = session.metadata?.userId;
    const clerkId = session.metadata?.clerkId;
    const newPlanId = session.metadata?.newPlanId;
    const oldSubscriptionId = session.metadata?.oldSubscriptionId;

    if (!userId || !clerkId || !newPlanId) {
      console.error("Invalid metadata in session:", session.metadata);
      return;
    }

    // Get the user
    let user = await getUserById(userId);
    if (!user) {
      console.error("User not found:", { userId, clerkId });
      return;
    }

    // Get the new subscription ID from the session
    const newSubscriptionId = session.subscription;

    if (!newSubscriptionId) {
      console.error("No subscription ID found in session:", session);
      return;
    }

    // Update the user's metadata in Firestore
    await updateUserSubscription(userId, {
      isPro: true,
      subscriptionId: newSubscriptionId,
      planId: newPlanId,
      updatedAt: new Date().toISOString(),
    });

    console.log(
      `Successfully updated subscription for user ${userId} from ${oldSubscriptionId} to ${newSubscriptionId} (${newPlanId})`
    );
  } catch (error) {
    console.error("Error handling subscription change:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }
}

// This is needed for Next.js to handle the raw body
export const config = {
  api: {
    bodyParser: false,
  },
};
