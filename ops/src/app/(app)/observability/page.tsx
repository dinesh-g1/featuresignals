import { Metadata } from "next";
import { ObservabilityPage } from "./observability-page";

export const metadata: Metadata = {
  title: "Observability | Ops Portal",
};

export default function Observability() {
  return <ObservabilityPage />;
}
