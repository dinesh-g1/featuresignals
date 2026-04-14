import { Metadata } from "next";
import { SandboxesPage } from "./sandboxes-page";

export const metadata: Metadata = {
  title: "Sandboxes | Ops Portal",
  description: "Internal sandbox environments",
};

export default function Sandboxes() {
  return <SandboxesPage />;
}
