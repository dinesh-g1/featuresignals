export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'past_due' | 'failed' | 'cancelled';
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface MRRData {
  currentMRR: number;
  currency: string;
  avgRevenuePerCustomer: number;
  churnRate: number;
  monthlyRevenue: MonthlyRevenuePoint[];
}

export interface MonthlyRevenuePoint {
  month: string;
  revenue: number;
}

export interface UsageRecord {
  tenantId: string;
  tenantName: string;
  period: string;
  evaluations: number;
  flagsConfigured: number;
  environments: number;
  cost: number;
}

export interface CostBreakdown {
  tenantId: string;
  tenantName: string;
  tier: string;
  basePrice: number;
  addons: CostAddon[];
  totalCost: number;
  currency: string;
}

export interface CostAddon {
  name: string;
  description: string;
  amount: number;
}

export interface InvoiceList {
  invoices: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaymentRetryResponse {
  success: boolean;
  invoiceId: string;
  newStatus: string;
}
