import { Metadata } from "next";
import { DashboardPage } from "./dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard | Ops Portal",
  description: "Ops Portal Dashboard",
};

export default function Page() {
  return <DashboardPage />;
}
