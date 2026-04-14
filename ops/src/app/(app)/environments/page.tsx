import { Metadata } from "next";
import { EnvironmentsPage } from "./environments-page";

export const metadata: Metadata = {
  title: "Environments | Ops Portal",
  description: "Manage all customer environments",
};

export default function Environments() {
  return <EnvironmentsPage />;
}
