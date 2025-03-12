"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
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
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    subscriptionPlans.find((plan) => plan.id === currentPlan) || null
  );

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedPlan) {
      onSelect(selectedPlan);
      onClose();
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
        >
          <X size={20} />
        </button>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
          <p className="text-sm text-gray-500 mt-2">
            Select the plan that works best for your needs
          </p>
        </div>

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
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedPlan || selectedPlan.id === currentPlan}
            className="rounded-full bg-[#94b347] text-white hover:bg-[#94b347]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selectedPlan?.id === currentPlan ? "Current Plan" : "Upgrade Plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
