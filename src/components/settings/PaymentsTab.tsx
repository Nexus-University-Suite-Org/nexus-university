import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Download,
  Wallet,
  Calendar,
  Sparkles,
  ChevronRight,
  FileText,
  Building2,
  Smartphone,
  Globe,
  Landmark,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBackend,
  postBackend,
  getNuBackend,
  postNuBackend,
  getMessagingBackend,
} from "@/lib/backendApi";

interface StudentFee {
  id: number;
  studentId: number;
  feeAssignmentId: number;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FeeAssignmentItem {
  id: number;
  itemName: string;
  category: string;
  yearLevel: string;
  semester: string;
  academicYear: string;
  amount: number;
  currency: string;
  college: string;
  notes?: string;
}

interface Prn {
  id: number;
  prnCode: string;
  studentId: string;
  feeId: number | null;
  amount: number;
  purpose: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  expiresAt: string;
}

interface Transaction {
  id: number;
  prnId: number;
  prnCode: string;
  studentId: string;
  amount: number;
  paymentMethod: string;
  transactionRef: string;
  status: string;
  paidAt: string;
  createdAt: string;
}

interface ProgramFeeSemester {
  name: string;
  tuition?: number;
  functional?: number;
  total?: number;
}

interface ProgramFeeYear {
  year: number;
  semesters: ProgramFeeSemester[];
}

interface ProgramFeeStructure {
  currency?: string;
  year_fees?: ProgramFeeYear[];
}

const paymentMethods = [
  {
    key: "mobile-money",
    title: "Mobile Money",
    subtitle: "MTN MoMo, Airtel Money",
    timing: "Instant",
    desc: "Pay securely via your phone wallet",
    images: ["/images/payments/mtn-momo.png", "/images/payments/airtel-money.png"],
    bg: "from-emerald-500 to-teal-500",
  },
  {
    key: "bank-transfer",
    title: "Bank Transfer",
    subtitle: "All major banks",
    timing: "Same-day",
    desc: "Transfer to the university account",
    images: ["/images/payments/bank-transfer.svg"],
    bg: "from-primary to-primary/70",
  },
  {
    key: "bank-branch",
    title: "Bank Branch",
    subtitle: "Cash deposit",
    timing: "Same-day",
    desc: "Deposit at any bank branch",
    images: ["/images/payments/bank-branch.svg"],
    bg: "from-amber-500 to-orange-500",
  },
  {
    key: "online-portal",
    title: "Online Portal",
    subtitle: "Visa / Mastercard",
    timing: "Instant",
    desc: "Pay with your card online",
    images: ["/images/payments/visa.svg", "/images/payments/mastercard.svg"],
    bg: "from-secondary to-secondary/70",
  },
];

function parseProgramFees(json: string | null | undefined): ProgramFeeStructure | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ProgramFeeStructure;
  } catch {
    return null;
  }
}

function formatMoney(n: number, currency = "UGX") {
  const v = Number(n) || 0;
  return `${currency} ${v.toLocaleString("en-US")}`;
}

export function PaymentsTab() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [feeItems, setFeeItems] = useState<FeeAssignmentItem[]>([]);
  const [prns, setPrns] = useState<Prn[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [programFeeFallback, setProgramFeeFallback] = useState<ProgramFeeStructure | null>(
    null,
  );
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid || "";

  const fetchData = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const [fees, transactionsData, prnsData, catalogue, programData] =
        await Promise.all([
          getBackend<StudentFee[]>(`/api/v1/student-fees?studentId=${uid}`).catch(
            () => [] as StudentFee[],
          ),
          getNuBackend<Transaction[]>(
            `/api/v1/payments/transactions/${uid}`,
          ).catch(() => [] as Transaction[]),
          getNuBackend<Prn[]>(`/api/v1/payments/prn/${uid}`).catch(
            () => [] as Prn[],
          ),
          getBackend<FeeAssignmentItem[]>("/api/v1/fees").catch(
            () => [] as FeeAssignmentItem[],
          ),
          getBackend<any>("/api/v1/programs").catch(() => null),
        ]);

      setStudentFees(fees || []);
      setTransactions(transactionsData || []);
      setPrns(prnsData || []);

      const collegePref = profile?.college || "";
      const cats = (catalogue || []).filter(
        (f) =>
          !collegePref ||
          f.college?.toLowerCase().includes(collegePref.toLowerCase()) ||
          collegePref.toLowerCase().includes(f.college?.toLowerCase() || ""),
      );
      setFeeItems(cats.length > 0 ? cats : catalogue || []);

      // Fallback fee derivation from the student's programme record
      let programDetail: any = null;
      const name = profile?.programme || profile?.department || "";
      const match =
        programsFind(programData, name) || (programData || [])[0];
      if (match?.id) {
        try {
          programDetail = await getBackend<any>(`/api/v1/programs/${match.id}`);
        } catch {
          programDetail = null;
        }
      }
      setProgramFeeFallback(
        programDetail?.fees
          ? parseProgramFees(programDetail.fees)
          : null,
      );
    } catch (e: any) {
      console.error("Error fetching payment data:", e);
      setError(e?.message || "Could not load payment data.");
    } finally {
      setLoading(false);
    }
  }, [uid, profile?.college, profile?.programme, profile?.department]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function programsFind(list: any[] | null, name: string) {
    if (!Array.isArray(list)) return null;
    const n = (name || "").trim().toLowerCase();
    return (
      list.find(
        (p) =>
          (p.programName || "").toLowerCase() === n ||
          (p.programCode || "").toLowerCase() === n ||
          (p.programName || "").toLowerCase().includes(n) ||
          (p.programCode || "").toLowerCase().includes(n),
      ) ||
      list.find((p) => p.status === "Active") ||
      list[0]
    );
  }

  // ---- Fee snapshot derivation ----
  const currentAcademicYear = useMemo(() => {
    const d = new Date();
    const m = d.getMonth() + 1;
    return m <= 6 ? `${d.getFullYear() - 1}/${d.getFullYear()}` : `${d.getFullYear()}/${d.getFullYear() + 1}`;
  }, []);

  const hasStudentFees = studentFees.length > 0;

  const totalFees = useMemo(() => {
    if (hasStudentFees) {
      return studentFees.reduce((s, f) => s + (Number(f.amount) || 0), 0);
    }
    if (programFeeFallback?.year_fees?.length) {
      return programFeeFallback.year_fees.reduce(
        (sum, y) =>
          sum +
          (y.semesters || []).reduce(
            (s2, sem) => s2 + (Number(sem.total) || 0),
            0,
          ),
        0,
      );
    }
    return (feeItems || []).reduce((s, f) => s + (Number(f.amount) || 0), 0);
  }, [hasStudentFees, studentFees, programFeeFallback, feeItems]);

  const totalPaid = useMemo(() => {
    if (hasStudentFees) {
      return studentFees.reduce((s, f) => s + (Number(f.paidAmount) || 0), 0);
    }
    // Fall back to confirmed transactions
    return transactions
      .filter((t) => t.status === "confirmed" || t.status === "paid")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [hasStudentFees, studentFees, transactions]);

  const outstanding = Math.max(totalFees - totalPaid, 0);
  const paymentProgress = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

  const currency = useMemo(() => {
    if (hasStudentFees) return "UGX";
    return programFeeFallback?.currency || "UGX";
  }, [hasStudentFees, programFeeFallback]);

  // ---- Outstanding items to pay ----
  const outstandingItems = useMemo(() => {
    if (hasStudentFees) {
      return studentFees
        .map((f) => ({ ...f, remaining: Math.max(Number(f.balance) || Number(f.amount) - Number(f.paidAmount), 0) }))
        .filter((f) => f.remaining > 0);
    }
    // Derive from program fee fallback: current year, unpaid
    if (programFeeFallback?.year_fees?.length) {
      const items: { label: string; amount: number }[] = [];
      programFeeFallback.year_fees.forEach((y) => {
        (y.semesters || []).forEach((sem) => {
          const amt = Number(sem.total) || 0;
          if (amt > 0)
            items.push({ label: `Year ${y.year} • ${sem.name || `Semester`}`, amount: amt });
        });
      });
      return items;
    }
    return (feeItems || []).map((f) => ({
      label: `${f.itemName} (${f.category})`,
      amount: Number(f.amount) || 0,
    }));
  }, [hasStudentFees, studentFees, programFeeFallback, feeItems]);

  const totalOutstanding = outstandingItems.reduce((s, i) => s + i.amount, 0);

  // ---- Real pay flow via NU PRN + record ----
  const handlePay = async (methodKey: string) => {
    if (!uid) return;
    const method = paymentMethods.find((m) => m.key === methodKey);
    if (!method) return;

    if (outstandingItems.length === 0) {
      toast({
        title: "All settled",
        description: "You have no outstanding balances to pay right now.",
      });
      return;
    }

    const item = outstandingItems[0];
    const amount = Math.round(item.amount);
    if (amount <= 0) return;

    setPayingKey(methodKey);
    const transactionRef = `TX-${method.key.toUpperCase()}-${Math.floor(Date.now() / 1000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      // 1. Generate a PRN reference
      const prn = await postNuBackend<Prn>("/api/v1/payments/prn/generate", {
        studentId: uid,
        feeId: null,
        amount,
        purpose: item.label,
      });

      // 2. Record the transaction against the PRN (persists a real transaction)
      const tx = await postNuBackend<Transaction>("/api/v1/payments/record", {
        studentId: uid,
        prnId: prn.id,
        amount,
        paymentMethod: method.title,
        transactionRef,
      });

      // 3. If a matching NAP student-fee row exists, also update its balance
      if (studentFees.length > 0 && hasStudentFees) {
        try {
          await postBackend(
            `/api/v1/student-fees/${studentFees[0].id}/payments?amount=${amount}`,
            undefined,
          );
        } catch {
          // non-fatal
        }
      }

      setTransactions((prev) => [tx, ...prev]);
      setPrns((prev) => [prn, ...prev]);
      await fetchData();

      toast({
        title: "Payment recorded",
        description: `${formatMoney(amount, currency)} via ${method.title}. Reference ${tx.transactionRef}.`,
      });
    } catch (e: any) {
      console.error("Payment failed", e);
      toast({
        title: "Payment failed",
        description: e?.message || "We could not process your payment.",
        variant: "destructive",
      });
    } finally {
      setPayingKey(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "confirmed":
      case "paid":
      case "completed":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
      case "pending":
      case "active":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "failed":
      case "expired":
        return "bg-destructive/10 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getMethodIcon = (m: string) => {
    const s = (m || "").toLowerCase();
    if (s.includes("mobile") || s.includes("momo") || s.includes("airtel"))
      return Smartphone;
    if (s.includes("bank") || s.includes("branch") || s.includes("transfer"))
      return Building2;
    return Globe;
  };

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime(),
      ),
    [transactions],
  );

  const activePrns = useMemo(
    () =>
      prns.filter(
        (p) => p.status !== "paid" && new Date(p.expiresAt).getTime() > Date.now(),
      ),
    [prns],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 p-12 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your payment information…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl"
          animate={{ y: [0, 30, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-to-tr from-primary/10 to-secondary/10 rounded-full blur-3xl"
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <div className="relative space-y-8">
        {error && (
          <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            {error}
          </div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card via-card to-muted/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                    <Wallet className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Your Fees & Payments</CardTitle>
                    <CardDescription className="text-base">
                      Manage tuition and institutional charges for {currentAcademicYear}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <motion.div
                    className="text-center px-6 py-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <p className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      {paymentProgress.toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      COMPLETED
                    </p>
                  </motion.div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative pt-2">
              <div className="relative h-6 rounded-full bg-muted/50 overflow-hidden mb-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${paymentProgress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full"
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Amount Paid
                  </p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatMoney(totalPaid, currency)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Outstanding
                  </p>
                  <p className="text-xl font-bold text-amber-600">
                    {formatMoney(outstanding, currency)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Total Fees
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {formatMoney(totalFees, currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            {
              label: "Total Fees",
              value: totalFees,
              icon: Wallet,
              gradient: "from-primary to-primary/70",
            },
            {
              label: "Amount Paid",
              value: totalPaid,
              icon: CheckCircle2,
              gradient: "from-emerald-500 to-teal-500",
            },
            {
              label: "Outstanding",
              value: outstanding,
              icon: outstanding > 0 ? AlertTriangle : CheckCircle2,
              gradient:
                outstanding > 0
                  ? "from-amber-500 to-orange-500"
                  : "from-emerald-500 to-teal-500",
            },
            {
              label: "Transactions",
              value: transactions.length,
              icon: Receipt,
              gradient: "from-secondary to-secondary/70",
            },
          ].map((stat, i) => (
            <motion.div
              key={`stat-${i}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.08, type: "spring" }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="relative overflow-hidden border-0 shadow-xl bg-card/80 backdrop-blur-sm h-full">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5`}
                />
                <div
                  className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${stat.gradient} opacity-10 rounded-bl-full`}
                />
                <CardContent className="pt-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}
                    >
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold truncate">
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Outstanding breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Fee Breakdown</CardTitle>
                  <CardDescription>
                    {hasStudentFees
                      ? "Your assigned fee schedule"
                      : "Estimated fee schedule from your programme"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-4 sm:p-6">
              {outstandingItems.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                  <h3 className="font-semibold text-lg">
                    You're fully paid up 🎉
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    No outstanding balances on your account.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {outstandingItems.map((item, i) => {
                    const pct = totalOutstanding > 0 ? (item.amount / totalOutstanding) * 100 : 0;
                    return (
                      <motion.div
                        key={`${item.label}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-4 rounded-xl border border-border/50 bg-muted/20"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{item.label}</p>
                              {hasStudentFees && (item as any).dueDate && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Due{" "}
                                  {new Date((item as any).dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="font-bold text-sm">
                            {formatMoney(item.amount, currency)}
                          </p>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-primary to-secondary"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                  <div className="pt-3 flex items-center justify-between border-t border-border/50">
                    <p className="text-sm text-muted-foreground">Total outstanding</p>
                    <p className="font-bold text-lg text-amber-600">
                      {formatMoney(totalOutstanding, currency)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Make a Payment</CardTitle>
                  <CardDescription>
                    Choose how you'd like to pay your outstanding balance
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {paymentMethods.map((method) => {
                const busy = payingKey === method.key;
                return (
                  <div
                    key={method.key}
                    className="p-4 rounded-2xl border border-border/50 bg-muted/20 hover:border-primary/30 transition-all flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${method.bg} flex items-center justify-center px-1 shadow-lg`}
                      >
                        {method.images.length > 1 ? (
                          <div className="flex gap-0.5">
                            {method.images.map((img, idx) => (
                              <img key={idx} src={img} alt="" className="h-5 w-auto object-contain" />
                            ))}
                          </div>
                        ) : (
                          <img src={method.images[0]} alt={method.title} className="h-5 w-auto object-contain" />
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {method.timing}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{method.title}</p>
                      <p className="text-muted-foreground text-xs">{method.desc}</p>
                    </div>
                    <Button
                      size="sm"
                      className="mt-auto gap-2"
                      onClick={() => handlePay(method.key)}
                      disabled={outstanding <= 0 || payingKey !== null}
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {busy ? "Processing…" : "Pay Now"}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Payment history */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Payment History</CardTitle>
                      <CardDescription>
                        Your recorded transactions
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">{sortedTransactions.length} total</Badge>
                </div>
              </CardHeader>
              <Separator />
              <CardContent>
                {sortedTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg mb-2">
                      No payments recorded yet
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Payments you make will appear here with their receipts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedTransactions.map((tx, i) => {
                      const Icon = getMethodIcon(tx.paymentMethod);
                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setSelectedTransaction(tx)}
                          className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer border border-border/50 group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p className="font-bold">
                                {formatMoney(tx.amount, currency)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {tx.paymentMethod} • {tx.prnCode}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {tx.transactionRef}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(tx.status)}>
                              {tx.status}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-2">
                              {new Date(tx.paidAt || tx.createdAt).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric", year: "numeric" },
                              )}
                            </p>
                            <ChevronRight className="h-5 w-5 text-muted-foreground mt-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Active PRNs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Payment Reference Numbers (PRNs)
                    </CardTitle>
                    <CardDescription>
                      Bank/mobile payment references for settlement
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent>
                {activePrns.length === 0 ? (
                  <div className="text-center py-10">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-semibold text-lg mb-1">No active PRNs</h3>
                    <p className="text-muted-foreground text-sm">
                      Generate one to get a reference for bank or mobile-money payment.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activePrns.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-2xl border border-border/50 bg-muted/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={getStatusColor(p.status)}>{p.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(p.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-mono text-sm text-primary break-all">
                          {p.prnCode}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {p.purpose || "Fee payment"}
                        </p>
                        <p className="font-bold mt-1">{formatMoney(p.amount, currency)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {[
            {
              title: "Generate PRN",
              desc: "Create a payment reference",
              icon: Sparkles,
              gradient: "from-primary to-primary/70",
            },
            {
              title: "Payment Statement",
              desc: "View full history",
              icon: FileText,
              gradient: "from-secondary to-secondary/70",
            },
            {
              title: "Contact Finance",
              desc: "Get support",
              icon: Building2,
              gradient: "from-accent to-accent/70",
            },
          ].map((action, i) => (
            <motion.div
              key={`action-${i}`}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="border-0 shadow-lg cursor-pointer overflow-hidden group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Receipt modal */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedTransaction(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="border-0 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-white/20 text-white border-0">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {selectedTransaction.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTransaction(null)}
                    className="text-white hover:bg-white/20"
                  >
                    Close
                  </Button>
                </div>
                <p className="text-4xl font-black">
                  {formatMoney(selectedTransaction.amount, currency)}
                </p>
                <p className="text-white/80 text-sm mt-1">Payment Receipt</p>
              </div>
              <CardContent className="p-6 space-y-4">
                {[
                  { label: "Transaction Ref", value: selectedTransaction.transactionRef },
                  { label: "PRN Code", value: selectedTransaction.prnCode },
                  { label: "Payment Method", value: selectedTransaction.paymentMethod },
                  { label: "Status", value: selectedTransaction.status },
                  {
                    label: "Paid On",
                    value: new Date(
                      selectedTransaction.paidAt || selectedTransaction.createdAt,
                    ).toLocaleString(),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                  >
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-right break-all">{item.value}</span>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl gap-2"
                    onClick={() => {
                      const text = [
                        "PAYMENT RECEIPT",
                        `Amount: ${formatMoney(selectedTransaction.amount, currency)}`,
                        `Ref: ${selectedTransaction.transactionRef}`,
                        `PRN: ${selectedTransaction.prnCode}`,
                        `Method: ${selectedTransaction.paymentMethod}`,
                        `Status: ${selectedTransaction.status}`,
                        `Date: ${new Date(selectedTransaction.paidAt || selectedTransaction.createdAt).toLocaleString()}`,
                      ].join("\n");
                      const blob = new Blob([text], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `receipt-${selectedTransaction.transactionRef}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast({ title: "Downloaded", description: "Receipt downloaded." });
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button className="h-12 rounded-xl gap-2 bg-gradient-to-r from-emerald-600 to-teal-600">
                    <FileText className="h-4 w-4" />
                    View Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
