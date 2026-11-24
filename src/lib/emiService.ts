import api from "@/lib/api";

export type LoanStatus = "pending" | "approved" | "rejected" | "active" | "completed" | "default" | "cancelled";

export interface Loan {
  _id: string;
  farmerId: string | { _id: string; name: string; email: string; phone?: string };
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  monthlyEMI: number;
  totalPayable: number;
  purpose: string;
  loanStatus: LoanStatus;
  remainingAmount: number;
  paidAmount: number;
  nextEMIDueDate: string | null;
  totalEMIPaid: number;
  rejectionReason?: string;
  createdAt: string;
}

export interface EMIPayment {
  _id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  status: string;
  paymentMethod: string;
  transactionId?: string;
}

export interface EMICalculation {
  principal: number;
  annualRate: number;
  months: number;
  monthlyEMI: number;
  totalPayable: number;
  totalInterest: number;
  eligible: boolean;
  minEligibleAmount: number;
}

export interface EMIConfig {
  minEligibleAmount: number;
  defaultInterestRate: number;
  minTenureMonths: number;
  maxTenureMonths: number;
}

export interface AdminEMIStats {
  pendingApplications: number;
  activeLoans: number;
  completedLoans: number;
  rejectedLoans: number;
  overdueLoans: number;
  totalFinancedAmount: number;
  totalReceived: number;
  totalOutstanding: number;
  monthlyCollection: number;
  monthlyPaymentCount: number;
}

export const emiService = {
  getConfig: async (): Promise<EMIConfig> => {
    const { data } = await api.get("/emi/config");
    return data.data;
  },

  calculate: async (principal: number, months: number, annualRate?: number): Promise<EMICalculation> => {
    const { data } = await api.post("/emi/calculate", { principal, months, annualRate });
    return data.data;
  },

  apply: async (payload: {
    loanAmount: number;
    loanTerm: number;
    purpose: string;
    interestRate?: number;
    collateral?: string;
    orderId?: string;
  }): Promise<Loan> => {
    const { data } = await api.post("/emi/apply", payload);
    return data.loan;
  },

  getMyLoans: async (): Promise<Loan[]> => {
    const { data } = await api.get("/emi/my-loans");
    return data.loans;
  },

  getLoanDetails: async (loanId: string): Promise<{ loan: Loan; payments: EMIPayment[] }> => {
    const { data } = await api.get(`/emi/${loanId}`);
    return { loan: data.loan, payments: data.payments };
  },

  cancelLoan: async (loanId: string): Promise<Loan> => {
    const { data } = await api.put(`/emi/${loanId}/cancel`);
    return data.loan;
  },

  payEMI: async (payload: { loanId: string; amount: number; paymentMethod: string; transactionId?: string }) => {
    const { data } = await api.post("/emi/pay", payload);
    return data;
  },

  getPaymentHistory: async (loanId: string): Promise<EMIPayment[]> => {
    const { data } = await api.get(`/emi/${loanId}/payments`);
    return data.payments;
  },

  // Admin
  getAllLoans: async (status?: LoanStatus): Promise<Loan[]> => {
    const { data } = await api.get("/emi/admin/all", { params: status ? { status } : undefined });
    return data.loans;
  },

  getPendingLoans: async (): Promise<Loan[]> => {
    const { data } = await api.get("/emi/admin/pending");
    return data.loans;
  },

  getAdminStats: async (): Promise<AdminEMIStats> => {
    const { data } = await api.get("/emi/admin/stats");
    return data.data;
  },

  approveLoan: async (loanId: string, approvalNotes?: string): Promise<Loan> => {
    const { data } = await api.put(`/emi/${loanId}/approve`, { approvalNotes });
    return data.loan;
  },

  rejectLoan: async (loanId: string, rejectionReason: string): Promise<Loan> => {
    const { data } = await api.put(`/emi/${loanId}/reject`, { rejectionReason });
    return data.loan;
  },
};

export default emiService;
