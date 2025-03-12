import { getUserByClerkId } from "@/lib/firebase/firestore";
import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with your secret key

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to make a purchase" },
        { status: 401 }
      );
    }

    const { credits, price, quantity = 1 } = await req.json();

    if (!credits || !price) {
      return NextResponse.json(
        { error: "Credits and price are required" },
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

    // Calculate the total
    const totalCredits = credits * quantity;
    const totalAmount = Math.round(price * 100 * quantity); // Convert to cents for Stripe

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${totalCredits} Credits`,
              description: `Purchase of ${totalCredits} credits for your account`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1, // We've already calculated the total
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
      metadata: {
        userId: firestoreUser.id,
        clerkId: user.id,
        credits: totalCredits.toString(),
        type: "credit_purchase",
      },
      customer_email: user.emailAddresses[0]?.emailAddress,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
