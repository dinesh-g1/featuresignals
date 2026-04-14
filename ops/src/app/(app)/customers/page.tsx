import { Metadata } from "next";
import { CustomersPage } from "./customers-page";

export const metadata: Metadata = {
  title: "Customers | Ops Portal",
  description: "Customer management and health scores",
};

export default function Customers() {
  return <CustomersPage />;
}
