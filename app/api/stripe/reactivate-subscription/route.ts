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

    const { subscriptionId } = await req.json();

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

    // Reactivate the subscription by removing the cancel_at_period_end flag
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    // Update the user's metadata in Firestore
    await updateUserSubscription(firestoreUser.id, {
      isPro: true,
      subscriptionId: subscription.id,
      planId: firestoreUser.metadata.planId || "",
      updatedAt: new Date().toISOString(),
      canceledAt: undefined,
      cancelAtPeriodEnd: false,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription reactivated successfully",
    });
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return NextResponse.json(
      { error: "Failed to reactivate subscription" },
      { status: 500 }
    );
  }
}
