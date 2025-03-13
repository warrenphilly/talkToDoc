"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
}: CancelSubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onConfirm();
      onClose();
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
            Cancel Subscription
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Are you sure you want to cancel your subscription? You'll lose
            access to premium features at the end of your current billing
            period.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end space-x-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="rounded-full text-slate-600 bg-white border border-gray-400 shadow-none hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
            disabled={isLoading}
          >
            Keep Subscription
          </Button>
          <Button
            onClick={handleConfirm}
            className="rounded-full bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                Canceling...
              </span>
            ) : (
              "Cancel Subscription"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
