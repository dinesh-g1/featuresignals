import { Metadata } from "next";
import { LicensesPage } from "./licenses-page";

export const metadata: Metadata = {
  title: "Licenses | Ops Portal",
};

export default function Licenses() {
  return <LicensesPage />;
}
