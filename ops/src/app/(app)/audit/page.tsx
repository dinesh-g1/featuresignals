import { Metadata } from "next";
import { AuditPage } from "./audit-page";

export const metadata: Metadata = {
  title: "Audit Log | Ops Portal",
};

export default function Audit() {
  return <AuditPage />;
}
