import { Metadata } from "next";
import { CustomerDetailPage } from "./customer-detail-page";

export const metadata: Metadata = {
  title: "Customer Details | Ops Portal",
  description: "Customer details and subdomain management",
};

interface CustomerDetailPageProps {
  params: {
    org_id: string;
  };
}

export default function CustomerDetail({ params }: CustomerDetailPageProps) {
  return <CustomerDetailPage orgId={params.org_id} />;
}
