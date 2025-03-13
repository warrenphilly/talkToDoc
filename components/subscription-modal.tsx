"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Export the SubscriptionPlan interface
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  popular?: boolean;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (plan: SubscriptionPlan) => void;
  currentPlan?: string;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "pay-as-you-go",
    name: "Pay As You Go",
    description: "Purchase credits as needed",
    price: 0,
    features: [
      "First 1500 credits free",
      "Pay only for what you use",
      "500 credits for $1.50",
      "2500 credits for $5.00",
      "No recurring charges",
    ],
  },
  {
    id: "pro-monthly",
    name: "Pro Monthly",
    description: "Perfect for academic weapons",
    price: 6.49,
    features: [
      "Unlimited credits",
      "Priority support",
      "Advanced features",
      "No usage limits",
    ],
    popular: true,
  },
  {
    id: "pro-yearly",
    name: "Pro Yearly",
    description: "Save in the long run",
    price: 56.99,
    features: [
      "Everything in Pro Monthly",
      "Save over 25% compared to monthly",
      "Annual billing",
      "No usage limits",
    ],
  },
];

export default function SubscriptionModal({
  isOpen,
  onClose,
  onSelect,
  currentPlan = "pay-as-you-go",
}: SubscriptionModalProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    subscriptionPlans.find((plan) => plan.id === currentPlan) || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = async () => {
    if (selectedPlan) {
      if (selectedPlan.id === "pay-as-you-go") {
        // For pay-as-you-go, just use the existing onSelect callback
        onSelect(selectedPlan);
        onClose();
        return;
      }

      // For subscription plans, create a Stripe checkout session
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/stripe/subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId: selectedPlan.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create subscription");
        }

        // Redirect to Stripe Checkout
        if (data.url) {
          router.push(data.url);
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (err) {
        console.error("Subscription error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while processing your subscription"
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getDisplayPrice = (plan: SubscriptionPlan) => {
    if (plan.id === "pay-as-you-go") {
      return "Free";
    } else if (plan.id === "pro-monthly") {
      return `$${plan.price.toFixed(2)}/month`;
    } else {
      return `$${plan.price.toFixed(2)}/year`;
    }
  };

  const getSavingsText = (plan: SubscriptionPlan) => {
    if (plan.id === "pro-yearly") {
      // Calculate monthly equivalent
      const monthlyEquivalent = plan.price / 12;
      const monthlyPlan = subscriptionPlans.find((p) => p.id === "pro-monthly");

      if (monthlyPlan) {
        const savings = (monthlyPlan.price * 12 - plan.price).toFixed(2);
        const savingsPercentage = Math.round(
          ((monthlyPlan.price * 12 - plan.price) / (monthlyPlan.price * 12)) *
            100
        );
        return `Save $${savings} (${savingsPercentage}%) per year`;
      }
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-10">
      <div className="relative w-full max-w-4xl rounded-lg bg-white p-6 shadow-lg mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-sm text-gray-500 mt-2">
            Select the plan that works best for your needs
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-6 transition-all ${
                selectedPlan?.id === plan.id
                  ? "border-[#94b347] ring-1 ring-[#94b347]"
                  : "border-gray-200 hover:border-gray-300"
              } ${plan.popular ? "md:scale-105" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-[#94b347] px-3 py-1 text-xs font-medium text-white">
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div>
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.id === "pay-as-you-go"
                      ? "Free"
                      : `$${plan.price.toFixed(2)}`}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    {plan.id === "pay-as-you-go"
                      ? "to start"
                      : plan.id === "pro-monthly"
                      ? "/month"
                      : "/year"}
                  </span>
                </div>

                {getSavingsText(plan) && (
                  <div className="mt-1 text-xs text-[#94b347] font-medium">
                    {getSavingsText(plan)}
                  </div>
                )}
              </div>

              <ul className="mb-6 space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 text-[#94b347]" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => setSelectedPlan(plan)}
                className={`w-full rounded-full ${
                  selectedPlan?.id === plan.id
                    ? "bg-[#94b347] text-white hover:bg-[#94b347]/90"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
                disabled={isLoading}
              >
                {plan.id === currentPlan
                  ? "Current Plan"
                  : selectedPlan?.id === plan.id
                  ? "Selected"
                  : "Select Plan"}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            className="mr-2 rounded-full text-slate-600 bg-white border border-gray-400 shadow-none hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={
              !selectedPlan || selectedPlan.id === currentPlan || isLoading
            }
            className="rounded-full bg-[#94b347] text-white hover:bg-[#94b347]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : selectedPlan?.id === currentPlan ? (
              "Current Plan"
            ) : (
              "Upgrade Plan"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
