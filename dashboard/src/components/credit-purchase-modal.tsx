"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { CreditPack, CreditPurchaseResponse } from "@/lib/types";

interface CreditPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  bearerId: string;
  bearerName: string;
  currentBalance: number;
  includedPerMonth: number;
  packs: CreditPack[];
  onPurchased: (response: CreditPurchaseResponse) => void;
}

export function CreditPurchaseModal({
  open,
  onClose,
  bearerId,
  bearerName,
  currentBalance,
  includedPerMonth,
  packs,
  onPurchased,
}: CreditPurchaseModalProps) {
  const token = useAppStore((s) => s.token);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  if (!open) return null;

  async function handlePurchase(packId: string) {
    if (!token) return;
    setPurchasing(packId);
    try {
      const result = await api.purchaseCredits(token, packId);
      onPurchased(result);
      toast(`Purchased ${result.purchase.credits} credits successfully!`, "success");
      onClose();
    } catch {
      toast("Failed to purchase credits. Please try again.", "error");
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-[var(--borderColor-default)] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Purchase ${bearerName} credits`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--borderColor-default)]">
          <h2 className="text-lg font-bold text-[var(--fgColor-default)]">
            Purchase {bearerName} Credits
          </h2>
          <p className="mt-1 text-sm text-[var(--fgColor-muted)]">
            Current balance:{" "}
            <span className="font-semibold tabular-nums text-[var(--fgColor-default)]">
              {currentBalance.toLocaleString()}
            </span>{" "}
            credits · {includedPerMonth.toLocaleString()} included/month
          </p>
        </div>

        {/* Pack list */}
        <div className="px-6 py-4 space-y-3">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="flex items-center justify-between p-4 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] hover:border-[var(--borderColor-accent-emphasis)] transition-colors"
            >
              <div>
                <p className="font-semibold text-[var(--fgColor-default)]">
                  {pack.name}
                </p>
                <p className="text-sm text-[var(--fgColor-muted)]">
                  {pack.credits.toLocaleString()} credits
                </p>
                <p className="text-xs text-[var(--fgColor-muted)]">
                  {pack.price_display} · ~
                  {(pack.price_paise / pack.credits / 100).toFixed(2)}/credit
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handlePurchase(pack.id)}
                disabled={purchasing !== null}
                aria-label={`Purchase ${pack.name} pack`}
              >
                {purchasing === pack.id ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  "Buy"
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
          <div className="flex items-start gap-2 text-xs text-[var(--fgColor-muted)]">
            <span>💡</span>
            <div>
              <p>Credits never expire. Unused credits roll over each month.</p>
              <p className="mt-0.5">
                Need more?{" "}
                <a
                  href="mailto:sales@featuresignals.com"
                  className="text-[var(--fgColor-accent)] underline"
                >
                  Contact sales
                </a>{" "}
                for custom Enterprise pools.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
