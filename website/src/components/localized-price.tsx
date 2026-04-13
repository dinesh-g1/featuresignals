"use client";

import { useEffect, useState } from "react";
import { detectCurrency, fmtINR, BASE_PRICE_INR } from "@/lib/currency";

/** Renders the Pro price in the user's detected currency */
export function LocalizedPrice() {
  const [cur, setCur] = useState("INR");
  useEffect(() => {
    setCur(detectCurrency());
  }, []);
  return <>{fmtINR(BASE_PRICE_INR, cur)}/month</>;
}

/** Renders the self-hosting base cost in the user's detected currency */
export function LocalizedSelfHostCost() {
  const [cur, setCur] = useState("INR");
  useEffect(() => {
    setCur(detectCurrency());
  }, []);
  return <>{fmtINR(735, cur)}/mo</>;
}

/** Renders just the localized price text (e.g. "$12/mo") — no /month suffix */
export function ProPriceLabel() {
  const [cur, setCur] = useState("INR");
  useEffect(() => {
    setCur(detectCurrency());
  }, []);
  return <>{fmtINR(BASE_PRICE_INR, cur)}</>;
}
