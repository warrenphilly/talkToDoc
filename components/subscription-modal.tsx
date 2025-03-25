"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CancelSubscriptionModal from "./cancel-subscription-modal";

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
  subscriptionId?: string | null;
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
  subscriptionId = null,
}: SubscriptionModalProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    subscriptionPlans.find((plan) => plan.id === currentPlan) || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add state for plan switching
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlan | null>(null);
  const [isPlanChangeModalOpen, setIsPlanChangeModalOpen] = useState(false);

  // Add a state to track if the subscription is canceled but still active
  const [isCanceled, setIsCanceled] = useState(false);

  // Define isPro before using it in useEffect
  const isPro = currentPlan !== "pay-as-you-go";
  const isManagingSubscription = isPro && subscriptionId;

  // Update the useEffect to check if the subscription is canceled
  useEffect(() => {
    // Check if the subscription is canceled but still active
    const checkSubscriptionStatus = async () => {
      if (subscriptionId) {
        try {
          const response = await fetch(
            `/api/stripe/subscription-status?id=${subscriptionId}`
          );
          const data = await response.json();

          if (response.ok && data.subscription) {
            setIsCanceled(data.subscription.cancel_at_period_end);
          }
        } catch (error) {
          console.error("Error checking subscription status:", error);
        }
      }
    };

    if (isOpen && isPro && subscriptionId) {
      checkSubscriptionStatus();
    }
  }, [isOpen, isPro, subscriptionId]);

  if (!isOpen) return null;

  // Determine the alternative plan for the current subscription
  const getAlternativePlan = () => {
    if (currentPlan === "pro-monthly") {
      return subscriptionPlans.find((plan) => plan.id === "pro-yearly");
    } else if (currentPlan === "pro-yearly") {
      return subscriptionPlans.find((plan) => plan.id === "pro-monthly");
    }
    return null;
  };

  const alternativePlan = getAlternativePlan();

  // Handle plan change confirmation
  const handlePlanChangeConfirm = async () => {
    if (!targetPlan) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log(`Changing from ${currentPlan} to ${targetPlan.id}`);

      const response = await fetch("/api/stripe/change-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId,
          newPlanId: targetPlan.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change subscription plan");
      }

      // If we need to redirect to checkout for proration/upgrade
      if (data.url) {
        router.push(data.url);
        return;
      }

      setSuccessMessage(
        `Your subscription has been changed to ${targetPlan.name}. The changes will take effect at your next billing cycle.`
      );

      // Refresh the page after a short delay
      setTimeout(() => {
        router.refresh();
        onClose();
      }, 3000);
    } catch (err) {
      console.error("Error changing subscription plan:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while changing your subscription plan"
      );
    } finally {
      setIsLoading(false);
      setIsPlanChangeModalOpen(false);
    }
  };

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

        console.log("Creating subscription for plan:", selectedPlan.id);

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
        console.log("Subscription API response:", data);

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

  const handleCancelSubscription = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!subscriptionId) {
        throw new Error("No subscription ID found");
      }

      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      setSuccessMessage(
        "Your subscription has been canceled. You'll have access to premium features until the end of your current billing period."
      );

      // Refresh the page after a short delay to update the UI
      setTimeout(() => {
        router.refresh();
        onClose();
      }, 3000);
    } catch (err) {
      console.error("Error canceling subscription:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while canceling your subscription"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to handle subscription reactivation
  const handleReactivateSubscription = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!subscriptionId) {
        throw new Error("No subscription ID found");
      }

      const response = await fetch("/api/stripe/reactivate-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reactivate subscription");
      }

      setSuccessMessage(
        "Your subscription has been reactivated. You will continue to have access to premium features."
      );
      setIsCanceled(false);

      // Refresh the page after a short delay to update the UI
      setTimeout(() => {
        router.refresh();
      }, 3000);
    } catch (err) {
      console.error("Error reactivating subscription:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while reactivating your subscription"
      );
    } finally {
      setIsLoading(false);
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
    <div className="bg-red-500">
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-10 bg-red-">
        <div className="relative w-full max-w-4xl min-h-[70vh] max-h-[90vh] rounded-xl bg-white shadow-lg m-8 flex flex-col">
          {/* Header - Fixed at top */}
      
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-6 pt-2 m-6">

            <div className=" p-4">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
              disabled={isLoading}
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {isManagingSubscription
                  ? "Manage Your Plan"
                  : "Choose Your Plan"}
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                {isManagingSubscription
                  ? `You're currently on the ${
                      currentPlan === "pro-monthly"
                        ? "Pro Monthly"
                        : "Pro Yearly"
                    } plan`
                  : "Select the plan that works best for your needs"}
              </p>
            </div>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                {successMessage}
              </div>
            )}

            {/* Add a banner for canceled subscriptions */}
            {isManagingSubscription && isCanceled && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
                <div className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 mt-0.5 text-amber-600 flex-shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-800">
                      Subscription Canceled
                    </h4>
                    <p className="text-sm mt-1">
                      Your subscription has been canceled but will remain active
                      until the end of your current billing period. You can
                      reactivate your subscription to continue your benefits
                      beyond that date.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isManagingSubscription ? (
              <div className="flex flex-col items-center">
                {/* Current Plan Details */}
                <div className="w-full max-w-2xl">
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                    <h3 className="text-lg font-semibold mb-3 text-center">
                      Your Current Plan
                    </h3>
                    <div className="text-center mb-4">
                      <span className="text-xl font-bold text-gray-900">
                        {currentPlan === "pro-monthly"
                          ? "Pro Monthly"
                          : "Pro Yearly"}
                      </span>
                      <span className="block text-gray-500 mt-1">
                        {currentPlan === "pro-monthly"
                          ? `$${subscriptionPlans
                              .find((p) => p.id === "pro-monthly")
                              ?.price.toFixed(2)}/month`
                          : `$${subscriptionPlans
                              .find((p) => p.id === "pro-yearly")
                              ?.price.toFixed(2)}/year`}
                      </span>
                      {isCanceled && (
                        <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                          Ends at billing period
                        </span>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4">
                      <h4 className="font-medium text-blue-800 mb-2 text-sm">
                        Your Benefits
                      </h4>
                      <ul className="space-y-1">
                        {subscriptionPlans
                          .find((p) => p.id === currentPlan)
                          ?.features.map((feature, index) => (
                            <li
                              key={index}
                              className="flex items-start text-blue-700"
                            >
                              <Check
                                size={14}
                                className="mr-2 mt-0.5 text-blue-600 flex-shrink-0"
                              />
                              <span className="text-xs">{feature}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>

                  {/* Plan Management Options */}
                  <div className="space-y-3">
                    <h3 className="text-md font-medium mb-2">
                      Subscription Options
                    </h3>

                    {/* Reactivate Subscription Option (only show if canceled) */}
                    {isCanceled && (
                      <div className="border border-green-200 rounded-lg p-3 hover:border-green-300 transition-colors bg-green-50">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div className="flex-1 min-w-[200px]">
                            <h4 className="font-medium text-gray-900 text-sm">
                              Reactivate Subscription
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              Continue your subscription beyond the current
                              billing period
                            </p>
                          </div>
                          <Button
                            onClick={handleReactivateSubscription}
                            className="rounded-full bg-green-600 text-white hover:bg-green-700 text-sm px-3 py-1 h-auto"
                            disabled={isLoading}
                          >
                            {isLoading ? "Processing..." : "Reactivate"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Switch Plan Option */}
                    {alternativePlan && (
                      <div className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div className="flex-1 min-w-[200px]">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {alternativePlan.name} - $
                              {alternativePlan.price.toFixed(2)}
                              {alternativePlan.id === "pro-yearly"
                                ? "/year"
                                : "/month"}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {currentPlan === "pro-monthly"
                                ? "Save money with annual billing"
                                : "Switch to monthly billing for more flexibility"}
                            </p>

                            {currentPlan === "pro-monthly" && (
                              <p className="text-xs text-[#94b347] font-medium mt-1">
                                {getSavingsText(alternativePlan)}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              setTargetPlan(alternativePlan);
                              setIsPlanChangeModalOpen(true);
                            }}
                            className="rounded-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 text-sm px-3 py-1 h-auto"
                            disabled={isLoading}
                          >
                            Switch to {alternativePlan.name.replace("Pro ", "")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Cancel Subscription Option */}
                    <div
                      className={`border rounded-lg p-3 transition-colors ${
                        isCanceled
                          ? "border-gray-200 bg-gray-50"
                          : "border-gray-200 hover:border-red-200"
                      }`}
                    >
                      <div className="flex justify-between items-center flex-wrap gap-2 ">
                        <div className="flex-1 min-w-[200px]">
                          <h4
                            className={`font-medium text-sm ${
                              isCanceled ? "text-gray-500" : "text-gray-900"
                            }`}
                          >
                            Cancel Subscription
                          </h4>
                          <p
                            className={`text-xs mt-1 ${
                              isCanceled ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {isCanceled
                              ? "Your subscription is already canceled"
                              : "You'll keep access until the end of your current billing period"}
                          </p>
                        </div>
                        <Button
                          onClick={() => setIsCancelModalOpen(true)}
                          className={`rounded-full text-sm px-3 py-1 h-auto ${
                            isCanceled
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200"
                          }`}
                          disabled={isLoading || isCanceled}
                        >
                          Cancel Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subscriptionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl border p-4 transition-all ${
                      selectedPlan?.id === plan.id
                        ? "border-[#94b347] ring-1 ring-[#94b347]"
                        : "border-gray-200 hover:border-gray-300"
                    } ${plan.popular ? "md:scale-105" : ""}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-2 left-0 right-0 mx-auto w-fit rounded-full bg-[#94b347] px-2 py-0.5 text-xs font-medium text-white">
                        Most Popular
                      </div>
                    )}

                    <div className="mb-3">
                      <h3 className="text-md font-semibold text-gray-900">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {plan.description}
                      </p>
                    </div>

                    <div className="mb-4">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">
                          {plan.id === "pay-as-you-go"
                            ? "Free"
                            : `$${plan.price.toFixed(2)}`}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
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

                    <ul className="mb-4 space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check
                            size={14}
                            className="mr-1.5 mt-0.5 text-[#94b347] flex-shrink-0"
                          />
                          <span className="text-xs text-gray-600">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full rounded-full text-sm py-1.5 ${
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
            )}
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="sticky bottom-0 bg-white p-4 border-t rounded-b-xl border-gray-100 z-10">
            <div className="flex items-center justify-end">
              <Button
                onClick={onClose}
                variant="outline"
                className="mr-2 rounded-full text-slate-600 bg-white border border-gray-400 shadow-none hover:bg-white hover:border-[#94b347] hover:text-[#94b347] text-sm py-1.5"
                disabled={isLoading}
              >
                {isManagingSubscription ? "Close" : "Cancel"}
              </Button>

              {!isManagingSubscription && (
                <Button
                  onClick={handleSelect}
                  disabled={
                    !selectedPlan ||
                    selectedPlan.id === currentPlan ||
                    isLoading
                  }
                  className="rounded-full bg-[#94b347] text-white hover:bg-[#94b347]/90 disabled:cursor-not-allowed disabled:opacity-50 text-sm py-1.5"
                >
                  {isLoading
                    ? "Processing..."
                    : selectedPlan?.id === currentPlan
                    ? "Current Plan"
                    : "Upgrade Plan"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Confirmation Modal */}
      <CancelSubscriptionModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelSubscription}
      />

      {/* Plan Change Confirmation Modal */}
      <PlanChangeModal
        isOpen={isPlanChangeModalOpen}
        onClose={() => setIsPlanChangeModalOpen(false)}
        onConfirm={handlePlanChangeConfirm}
        currentPlan={currentPlan}
        targetPlan={targetPlan}
      />
    </div>
  );
}

// Add this new component for plan change confirmation
interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  currentPlan: string;
  targetPlan: SubscriptionPlan | null;
}

function PlanChangeModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  targetPlan,
}: PlanChangeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !targetPlan) return null;

  const isUpgrading =
    currentPlan === "pro-monthly" && targetPlan.id === "pro-yearly";
  const isDowngrading =
    currentPlan === "pro-yearly" && targetPlan.id === "pro-monthly";

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onConfirm();
    } catch (err) {
      console.error("Error changing plan:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while changing your subscription plan"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-gray-900">
            Change Subscription Plan
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {isUpgrading
              ? "You're about to upgrade to our annual plan"
              : "You're about to change your subscription plan"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-between items-center p-3 border-b border-gray-200">
            <span className="font-medium">Current Plan:</span>
            <span>
              {currentPlan === "pro-monthly" ? "Pro Monthly" : "Pro Yearly"}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 border-b border-gray-200">
            <span className="font-medium">New Plan:</span>
            <span>{targetPlan.name}</span>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            {isUpgrading ? (
              <>
                <h4 className="font-medium text-gray-900 mb-2">
                  Upgrading to Annual Plan
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 text-green-600" />
                    <span>You'll be charged the annual rate immediately</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 text-green-600" />
                    <span>Save money compared to monthly billing</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 text-green-600" />
                    <span>Your new billing cycle will start today</span>
                  </li>
                </ul>
              </>
            ) : isDowngrading ? (
              <>
                <h4 className="font-medium text-gray-900 mb-2">
                  Switching to Monthly Plan
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 text-blue-600" />
                    <span>
                      Your plan will change at the end of your current billing
                      period
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 text-blue-600" />
                    <span>You'll keep all benefits until then</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="mr-2 mt-0.5 text-blue-600" />
                    <span>
                      After that, you'll be billed at the monthly rate
                    </span>
                  </li>
                </ul>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                Your subscription plan will be updated. The changes will take
                effect according to Stripe's billing policies.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between space-x-4 ">
          <Button
            onClick={onClose}
            variant="outline"
            className="rounded-full text-slate-600 bg-white border border-gray-400 shadow-none hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="rounded-full bg-[#94b347] text-white hover:bg-[#94b347]/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
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
            ) : (
              "Confirm Change"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
