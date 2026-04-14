import { Metadata } from "next";
import { OpsUsersPage } from "./ops-users-page";

export const metadata: Metadata = {
  title: "Ops Users | Ops Portal",
};

export default function OpsUsers() {
  return <OpsUsersPage />;
}
