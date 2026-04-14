import { Metadata } from "next";
import { FinancialPage } from "./financial-page";

export const metadata: Metadata = {
  title: "Financial | Ops Portal",
};

export default function Financial() {
  return <FinancialPage />;
}
