import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, IndianRupee, CalendarClock, Plus, CheckCircle2, XCircle, Clock, TrendingUp, Receipt } from "lucide-react";
import { toast } from "sonner";
import emiService, { type Loan, type EMICalculation } from "@/lib/emiService";
import { PayButton } from "@/components/payments/PaymentFlow";
import { useLanguage } from "@/contexts/LanguageContext";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-200 text-slate-700",
  rejected: "bg-red-100 text-red-700",
  default: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const EMIPage = () => {
  const { t } = useLanguage();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);

  const [amount, setAmount] = useState("60000");
  const [term, setTerm] = useState("12");
  const [purpose, setPurpose] = useState("equipment");
  const [calc, setCalc] = useState<EMICalculation | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const data = await emiService.getMyLoans();
      setLoans(data);
    } catch {
      toast.error("Could not load your EMI loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  useEffect(() => {
    if (!applyOpen) return;
    const principal = Number(amount);
    const months = Number(term);
    if (!principal || !months) return;
    setCalcLoading(true);
    const handle = setTimeout(() => {
      emiService
        .calculate(principal, months)
        .then(setCalc)
        .catch(() => setCalc(null))
        .finally(() => setCalcLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [amount, term, applyOpen]);

  const activeLoan = useMemo(() => loans.find((l) => l.loanStatus === "active"), [loans]);
  const totalOutstanding = useMemo(() => loans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0), [loans]);
  const totalPaid = useMemo(() => loans.reduce((sum, l) => sum + (l.paidAmount || 0), 0), [loans]);

  const handleApply = async () => {
    if (!calc || !calc.eligible) {
      toast.error(`Minimum EMI eligible amount is ₹${calc?.minEligibleAmount?.toLocaleString("en-IN") || "5,000"}`);
      return;
    }
    setSubmitting(true);
    try {
      await emiService.apply({
        loanAmount: Number(amount),
        loanTerm: Number(term),
        purpose,
      });
      toast.success("Loan application submitted. An admin will review it shortly.");
      setApplyOpen(false);
      loadLoans();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <DashboardLayout role="farmer">
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">EMI / Loans</h1>
            <p className="text-sm text-muted-foreground">Finance high-value purchases and track your repayments.</p>
          </div>
          <Button onClick={() => setApplyOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> Apply for EMI
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold text-foreground">{loans.filter((l) => l.loanStatus === "active").length}</p>
              </div>
              <Wallet className="h-8 w-8 text-emerald-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Next EMI Due</p>
                <p className="text-lg font-bold text-foreground">
                  {activeLoan?.nextEMIDueDate ? new Date(activeLoan.nextEMIDueDate).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
              <CalendarClock className="h-8 w-8 text-amber-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Remaining Balance</p>
                <p className="text-lg font-bold text-foreground">₹{totalOutstanding.toLocaleString("en-IN")}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-red-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-foreground">₹{totalPaid.toLocaleString("en-IN")}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Loans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </>
            )}
            {!loading && loans.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No EMI applications yet. Apply above for equipment, fertilizer, or seed purchases over ₹5,000.</p>
              </div>
            )}
            {!loading &&
              loans.map((loan) => {
                const progressPct = loan.totalPayable ? Math.min(100, (loan.paidAmount / loan.totalPayable) * 100) : 0;
                return (
                  <div key={loan._id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-foreground capitalize">{loan.purpose} — ₹{loan.loanAmount.toLocaleString("en-IN")}</p>
                        <p className="text-xs text-muted-foreground">{loan.loanTerm} months · {loan.interestRate}% p.a. · EMI ₹{loan.monthlyEMI?.toFixed(0)}/mo</p>
                      </div>
                      <Badge className={statusStyles[loan.loanStatus] || "bg-muted"}>{loan.loanStatus}</Badge>
                    </div>
                    {["active", "completed"].includes(loan.loanStatus) && (
                      <>
                        <Progress value={progressPct} />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Paid ₹{loan.paidAmount.toLocaleString("en-IN")} of ₹{loan.totalPayable.toFixed(0)}</span>
                          <span>Remaining ₹{loan.remainingAmount.toFixed(0)}</span>
                        </div>
                      </>
                    )}
                    {loan.loanStatus === "rejected" && loan.rejectionReason && (
                      <p className="text-xs text-red-600">Reason: {loan.rejectionReason}</p>
                    )}
                    {loan.loanStatus === "active" && loan.remainingAmount > 0 && (
                      <PayButton kind="emi" id={loan._id} label={`${t("app.emi.payInstalment")} · ₹${Math.min(loan.monthlyEMI, loan.remainingAmount).toFixed(0)}`} onDone={loadLoans} />
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for EMI Financing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={1000} />
            </div>
            <div>
              <Label>Tenure (months)</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 6, 9, 12, 18, 24, 36].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} months</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="fertilizers">Fertilizers</SelectItem>
                  <SelectItem value="seeds">Seeds</SelectItem>
                  <SelectItem value="irrigation">Irrigation</SelectItem>
                  <SelectItem value="machinery">Machinery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {calcLoading && <Skeleton className="h-24 w-full" />}
            {calc && !calcLoading && (
              <div className={`rounded-lg p-3 text-sm space-y-1 ${calc.eligible ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
                {!calc.eligible ? (
                  <p>EMI is only available for amounts ≥ ₹{calc.minEligibleAmount.toLocaleString("en-IN")}.</p>
                ) : (
                  <>
                    <div className="flex justify-between"><span>Monthly EMI</span><span className="font-semibold">₹{calc.monthlyEMI.toLocaleString("en-IN")}</span></div>
                    <div className="flex justify-between"><span>Total Interest</span><span>₹{calc.totalInterest.toLocaleString("en-IN")}</span></div>
                    <div className="flex justify-between"><span>Total Payable</span><span>₹{calc.totalPayable.toLocaleString("en-IN")}</span></div>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button disabled={submitting || !calc?.eligible} onClick={handleApply} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default EMIPage;
