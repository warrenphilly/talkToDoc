"use client";

import { Button } from "@/components/ui/button";

import { useUser } from "@clerk/nextjs";
import { Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

interface PricingOption {
  credits: number;
  price: number;
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: PricingOption) => void;
}

const pricingOptions: PricingOption[] = [
  { credits: 500, price: 1.5 },
  { credits: 2500, price: 5.0 },
];

export default function PricingModal({
  isOpen,
  onClose,
  onSelect,
}: PricingModalProps) {
  const { user } = useUser();
  const [selectedOption, setSelectedOption] = useState<PricingOption | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedOption) {
      setTotal(selectedOption.price * quantity);
    } else {
      setTotal(0);
    }
  }, [selectedOption, quantity]);

  if (!isOpen) return null;

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };

  const handleCheckout = async () => {
    if (!selectedOption || !user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Create a checkout session via the API
      const response = await fetch("/api/stripe/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credits: selectedOption.credits,
          price: selectedOption.price,
          quantity: quantity,
        }),
      });

      const { url, error: responseError } = await response.json();

      if (responseError) {
        throw new Error(responseError);
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      console.error("Error creating checkout session:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred during checkout"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-4 sm:p-6 shadow-lg mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Select Credit Package
          </h2>
          <p className="text-sm text-gray-500">
            Choose the credit package that works best for you
          </p>
        </div>

        <div className="space-y-4">
          {pricingOptions.map((option) => (
            <div
              key={option.credits}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                selectedOption?.credits === option.credits
                  ? "border-[#94b347] bg-[#94b347]/10"
                  : "border-gray-200 hover:border-[#94b347] hover:bg-[#94b347]/5"
              }`}
              onClick={() => setSelectedOption(option)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {option.credits} Credits
                  </h3>
                  <p className="text-sm text-gray-500">
                    ${option.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300">
                  {selectedOption?.credits === option.credits && (
                    <div className="h-3 w-3 rounded-full bg-[#94b347]"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedOption && (
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Quantity</h3>
                <p className="text-sm text-gray-500">
                  Select how many packages you want
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-[#94b347] hover:text-[#94b347] disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button
                  onClick={increaseQuantity}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-[#94b347] hover:text-[#94b347]"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Package:</span>
                <span>
                  {selectedOption.credits} credits × {quantity}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Price per package:</span>
                <span>${selectedOption.price.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between font-medium">
                <span>Total credits:</span>
                <span>{selectedOption.credits * quantity} credits</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-2 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div
            className={`font-medium ${
              selectedOption ? "text-gray-900" : "text-gray-400"
            }`}
          >
            Total: ${total.toFixed(2)}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="mr-2 rounded-full text-slate-600 bg-white border border-gray-400 shadow-none hover:bg-white hover:border-[#94b347] hover:text-[#94b347]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={!selectedOption || isLoading}
              className="rounded-full bg-[#94b347] text-white hover:bg-[#94b347]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Purchase"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
