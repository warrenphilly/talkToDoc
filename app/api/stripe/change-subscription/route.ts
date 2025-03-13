import {
  getUserByClerkId,
  updateUserSubscription,
} from "@/lib/firebase/firestore";
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
        { error: "You must be logged in to manage your subscription" },
        { status: 401 }
      );
    }

    const { subscriptionId, newPlanId } = await req.json();

    if (!subscriptionId || !newPlanId) {
      return NextResponse.json(
        { error: "Subscription ID and new plan ID are required" },
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

    // Map plan IDs to Stripe price IDs
    const priceMap: Record<string, string> = {
      "pro-monthly": process.env.STRIPE_PRICE_MONTHLY || "",
      "pro-yearly": process.env.STRIPE_PRICE_YEARLY || "",
    };

    const newPriceId = priceMap[newPlanId];
    if (!newPriceId) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // Get the current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Check if we're upgrading from monthly to yearly
    const isUpgrading =
      firestoreUser.metadata.planId === "pro-monthly" &&
      newPlanId === "pro-yearly";

    if (isUpgrading) {
      // For upgrades, we'll create a checkout session to handle the proration
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer: subscription.customer as string,
        line_items: [
          {
            price: newPriceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true&subscription=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
        metadata: {
          userId: firestoreUser.id,
          clerkId: user.id,
          type: "subscription_change",
          oldPlanId: firestoreUser.metadata.planId,
          newPlanId: newPlanId,
        },
        subscription_data: {
          // This will cancel the old subscription when the new one is created
          transfer_data: {
            destination: subscription.id,
          },
        },
      });

      return NextResponse.json({ url: session.url });
    } else {
      // For downgrades or other changes, update the subscription directly
      // This will take effect at the end of the current billing period
      const updatedSubscription = await stripe.subscriptions.update(
        subscriptionId,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: "none", // Don't prorate, change takes effect at renewal
          metadata: {
            ...subscription.metadata,
            planId: newPlanId,
          },
        }
      );

      // Update the user's metadata in Firestore
      await updateUserSubscription(firestoreUser.id, {
        isPro: true, // Still pro
        subscriptionId: updatedSubscription.id,
        planId: newPlanId,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Subscription updated successfully",
      });
    }
  } catch (error) {
    console.error("Error changing subscription:", error);
    return NextResponse.json(
      { error: "Failed to change subscription" },
      { status: 500 }
    );
  }
}
