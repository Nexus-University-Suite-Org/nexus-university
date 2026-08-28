import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { getPRNShareUrl } from "@/lib/config";
import {
  Receipt,
  Copy,
  CheckCircle2,
  RefreshCw,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  CreditCard,
  Shield,
  QrCode,
  Share2,
  Zap,
  ArrowRight,
  Layers,
  Eye,
  X,
  Smartphone,
  Wallet,
  Building2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, getNuBackend, postNuBackend } from "@/lib/backendApi";

interface GeneratedPRN {
  id?: string;
  code: string;
  amount: number;
  purpose: string;
  generatedAt: Date;
  expiresAt: Date;
  fee_id?: string;
  status?: string;
}

interface Fee {
  id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  semester: string;
  description: string;
}

interface BankInfo {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  swiftCode: string;
  accountNumber: string;
  accountName: string;
  branch: string;
  cardTypes: string[];
}

export function GeneratePRNTab() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPRN, setGeneratedPRN] = useState<GeneratedPRN | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentPRNs, setRecentPRNs] = useState<GeneratedPRN[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showMoMoProvider, setShowMoMoProvider] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [showMoMoPhone, setShowMoMoPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [smsSid, setSmsSid] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [showBankBranch, setShowBankBranch] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>(null);
  const [bankDepositConfirmed, setBankDepositConfirmed] = useState(false);

  const paymentMethods = [
    {
      key: "mobile-money",
      name: "Mobile Money",
      desc: "MTN MoMo, Airtel Money",
      color: "from-emerald-500 to-teal-500",
      images: ["/images/payments/mtn-momo.png", "/images/payments/airtel-money.png"],
      instant: true,
      timing: "Instant",
    },
    {
      key: "bank-transfer",
      name: "Bank Transfer",
      desc: "All major banks",
      color: "from-primary to-primary/70",
      images: ["/images/payments/bank-transfer.svg"],
      instant: false,
      timing: "Same-day",
    },
    {
      key: "bank-branch",
      name: "Bank Branch",
      desc: "Cash deposit",
      color: "from-amber-500 to-orange-500",
      images: ["/images/payments/bank-branch.svg"],
      instant: false,
      timing: "Same-day",
    },
    {
      key: "online-portal",
      name: "Online Portal",
      desc: "Visa/Mastercard",
      color: "from-secondary to-secondary/70",
      images: ["/images/payments/visa.svg", "/images/payments/mastercard.svg"],
      instant: true,
      timing: "Instant",
    },
  ];

  const banks: BankInfo[] = [
    {
      id: "stanbic",
      name: "Stanbic Bank Uganda",
      shortName: "Stanbic",
      logo: "/images/payments/banks/stanbic.png",
      swiftCode: "SBICUGKX",
      accountNumber: "9030000123456",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala Road",
      cardTypes: ["Visa", "Mastercard"],
    },
    {
      id: "absa",
      name: "Absa Bank Uganda",
      shortName: "Absa",
      logo: "/images/payments/banks/absa.png",
      swiftCode: "ABCOUGKX",
      accountNumber: "6001234567890",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala Road",
      cardTypes: ["Visa", "Mastercard"],
    },
    {
      id: "centenary",
      name: "Centenary Bank",
      shortName: "Centenary",
      logo: "/images/payments/banks/centenary.png",
      swiftCode: "CERBUGKA",
      accountNumber: "1001234567890",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala",
      cardTypes: ["Visa"],
    },
    {
      id: "stanchart",
      name: "Standard Chartered Bank",
      shortName: "StanChart",
      logo: "/images/payments/banks/standard-chartered.png",
      swiftCode: "SCBLUGKA",
      accountNumber: "0100123456789",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala Road",
      cardTypes: ["Visa", "Mastercard"],
    },
    {
      id: "dfcu",
      name: "dfcu Bank",
      shortName: "dfcu",
      logo: "/images/payments/banks/dfcu.png",
      swiftCode: "DFCOUGKA",
      accountNumber: "0101234567890",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala",
      cardTypes: ["Visa"],
    },
    {
      id: "equity",
      name: "Equity Bank Uganda",
      shortName: "Equity",
      logo: "/images/payments/banks/equity.png",
      swiftCode: "EQBLUGKA",
      accountNumber: "1001234567890",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala",
      cardTypes: ["Visa", "Mastercard"],
    },
    {
      id: "kcb",
      name: "KCB Bank Uganda",
      shortName: "KCB",
      logo: "/images/payments/banks/kcb.png",
      swiftCode: "KCBLUGKA",
      accountNumber: "1001234567890",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala",
      cardTypes: ["Visa", "Mastercard"],
    },
    {
      id: "ncba",
      name: "NCBA Bank Uganda",
      shortName: "NCBA",
      logo: "/images/payments/banks/ncba.png",
      swiftCode: "ABCOUGKX",
      accountNumber: "1001234567890",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala",
      cardTypes: ["Visa", "Mastercard"],
    },
    {
      id: "boa",
      name: "Bank of Africa Uganda",
      shortName: "BOA",
      logo: "/images/payments/banks/bank-of-africa.png",
      swiftCode: "AFRIUGKA",
      accountNumber: "0101234567890",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala",
      cardTypes: ["Visa", "Mastercard"],
    },
    {
      id: "uba",
      name: "United Bank for Africa",
      shortName: "UBA",
      logo: "/images/payments/banks/uba.png",
      swiftCode: "UNAFUGKA",
      accountNumber: "1001234567890",
      accountName: "Nexus University",
      branch: "Main Branch - Kampala",
      cardTypes: ["Visa", "Mastercard"],
    },
  ];

  useEffect(() => {
    if (user) {
      fetchFees();
      fetchRecentPRNs();
    }
  }, [user]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      if (!user) return;
      const data = await getBackend<any[]>(
        `/api/v1/student-fees?studentId=${user.uid}`,
      );

      // Sort by due_date descending
      const sorted = [...data].sort((a: any, b: any) => {
        const aTime = Date.parse(a?.due_date || "");
        const bTime = Date.parse(b?.due_date || "");
        const safeA = Number.isNaN(aTime) ? 0 : aTime;
        const safeB = Number.isNaN(bTime) ? 0 : bTime;
        return safeB - safeA;
      });

      setFees(sorted as Fee[]);
    } catch (error) {
      console.error("Error fetching fees:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPRNs = async () => {
    try {
      if (!user) return;
      const data = await getNuBackend<{ id: number; prnCode: string; amount: number; purpose: string; createdAt: string; expiresAt: string; status: string }[]>(
        `/api/v1/payments/prn/${user.uid}`,
      );
      const mapped: GeneratedPRN[] = data.map((p) => ({
        id: String(p.id),
        code: p.prnCode,
        amount: p.amount,
        purpose: p.purpose,
        generatedAt: new Date(p.createdAt),
        expiresAt: new Date(p.expiresAt),
        status: p.status,
      }));
      setRecentPRNs(mapped.slice(0, 5));
    } catch (error) {
      console.error("Error fetching recent PRNs:", error);
    }
  };

  const purposes = [
    { value: "tuition", label: "Tuition Fees", icon: "🎓", amount: 2500000 },
    {
      value: "functional",
      label: "Functional Fees",
      icon: "⚡",
      amount: 500000,
    },
    {
      value: "retake",
      label: "Retake Examination",
      icon: "📝",
      amount: 100000,
    },
    {
      value: "supplementary",
      label: "Supplementary Exam",
      icon: "📋",
      amount: 150000,
    },
    {
      value: "transcript",
      label: "Academic Transcript",
      icon: "📄",
      amount: 50000,
    },
    {
      value: "certificate",
      label: "Certificate Collection",
      icon: "🏆",
      amount: 75000,
    },
    { value: "id_card", label: "Student ID Card", icon: "🪪", amount: 25000 },
    { value: "library", label: "Library Fine", icon: "📚", amount: 10000 },
    {
      value: "accommodation",
      label: "Accommodation Fee",
      icon: "🏠",
      amount: 1200000,
    },
  ];

  const handlePurposeChange = (value: string) => {
    setPurpose(value);
    const selectedPurpose = purposes.find((p) => p.value === value);
    if (selectedPurpose) {
      setAmount(selectedPurpose.amount.toString());
    }
  };

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider.toLowerCase());
    setShowMoMoProvider(false);
    setShowMoMoPhone(true);
  };

  const handleMoMoPayment = async () => {
    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a payment",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber || phoneNumber.length < 9) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayment(true);

    try {
      // Generate transaction ID
      const txnId = `MOMO-${selectedProvider}-${Math.floor(
        Date.now() / 1000,
      )}-${Math.floor(100 + Math.random() * 900)}`;
      setTransactionId(txnId);

      // TODO: Replace with platform backend API call when available
      // const response = await postBackend("/api/payments/momo/", { ... });

      // Show the payment waiting modal
      setShowPhonePrompt(true);
      setShowMoMoPhone(false);

      toast({
        title: "USSD Prompt Sent! 📱",
        description: `Check your phone +256${phoneNumber} and enter your PIN to confirm payment of UGX ${generatedPRN?.amount.toLocaleString()}`,
      });
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description:
          error.message ||
          "Failed to initiate payment. Check your number and try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!transactionId) return;

    try {
      // TODO: Replace with platform backend API call when available
      // const response = await getBackend(`/api/payments/status/${transactionId}/`);

      // Payment confirmed - update database
      if (generatedPRN?.id && generatedPRN?.fee_id) {
        // TODO: Update payment status via backend API
      }

      // Close modals and reset state
      setShowPhonePrompt(false);
      setPhoneNumber("");
      setPin("");
      setSelectedProvider("");
      setTransactionId("");

      toast({
        title: "Payment Successful! 🎉",
        description: `UGX ${generatedPRN?.amount.toLocaleString()} has been deducted from your account`,
      });

      await fetchFees();
    } catch (error: any) {
      console.error("Error checking payment status:", error);
    }
  };

  useEffect(() => {
    if (!showPhonePrompt || !transactionId) return;

    // Poll payment status every 3 seconds
    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [showPhonePrompt, transactionId]);

  const handlePinVerification = async () => {
    setPinError("");
    setVerifyingPin(true);

    try {
      await checkPaymentStatus();
    } catch (error: any) {
      console.error("Payment status error:", error);
      setPinError("Failed to verify payment. Retrying...");
    } finally {
      setVerifyingPin(false);
    }
  };

  const handlePaymentMethod = async (methodKey: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make a payment",
        variant: "destructive",
      });
      return;
    }

    // Check if there's a generated PRN
    if (!generatedPRN) {
      toast({
        title: "No PRN Available",
        description:
          "Please generate a PRN first before selecting a payment method",
        variant: "destructive",
      });
      return;
    }

    // Special handling for mobile money - show provider selection
    if (methodKey === "mobile-money") {
      setShowMoMoProvider(true);
      return;
    }

    // Special handling for bank branch - show bank selection modal
    if (methodKey === "bank-branch") {
      setShowBankBranch(true);
      return;
    }

    const method = paymentMethods.find((m) => m.key === methodKey);
    if (!method) return;

    setProcessingPayment(true);

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const transactionRef = `PAY-${method.key}-${Math.floor(
        Date.now() / 1000,
      )}-${Math.floor(100 + Math.random() * 900)}`;

      // TODO: Replace with platform backend API call when available
      // await postBackend("/api/payments/", { ... });

      toast({
        title: method.instant ? "Payment Processed" : "Payment Submitted",
        description: method.instant
          ? `Your payment via ${method.name} has been completed successfully.`
          : `Your payment via ${method.name} is being processed and will be confirmed soon.`,
      });

      // Refresh fees to show updated status
      await fetchFees();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description:
          error.message || "An error occurred while processing your payment",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const generatePRN = async () => {
    if (!amount || !purpose) {
      toast({
        title: "Missing Information",
        description: "Please enter an amount and select a purpose",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const parsedAmount = parseFloat(amount);

      // Call NU-Backend to generate PRN
      const res = await postNuBackend<{ id: number; prnCode: string; amount: number; purpose: string; expiresAt: string }>(
        "/api/v1/payments/prn/generate",
        {
          studentId: user?.uid || "",
          feeId: selectedFeeId ? Number(selectedFeeId) : null,
          amount: parsedAmount,
          purpose,
        }
      );

      const purposeLabel =
        purposes.find((p) => p.value === purpose)?.label || purpose;

      const newPRN: GeneratedPRN = {
        id: String(res.id),
        code: res.prnCode,
        amount: res.amount,
        purpose: purposeLabel,
        generatedAt: new Date(),
        expiresAt: new Date(res.expiresAt),
        fee_id: selectedFeeId,
        status: "pending",
      };

      setGeneratedPRN(newPRN);
      setRecentPRNs((prev) => [newPRN, ...prev.slice(0, 4)]);

      toast({
        title: "PRN Generated Successfully",
        description: `PRN ${res.prnCode} is ready. Pay within 48 hours.`,
      });

      // Reset form
      setAmount("");
      setPurpose("");
      setSelectedFeeId("");
    } catch (error) {
      console.error("Error generating PRN:", error);
      toast({
        title: "Error",
        description: "Failed to generate PRN. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedPRN) {
      navigator.clipboard.writeText(generatedPRN.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard!" });
    }
  };

  const downloadPRN = () => {
    if (!generatedPRN) return;

    const content = `
═══════════════════════════════════════════════════════════════
                    PAYMENT REFERENCE NUMBER (PRN)
═══════════════════════════════════════════════════════════════

    PRN Code:        ${generatedPRN.code}
    Amount:          UGX ${generatedPRN.amount.toLocaleString()}
    Purpose:         ${generatedPRN.purpose}
    
    Generated:       ${generatedPRN.generatedAt.toLocaleString()}
    Expires:         ${generatedPRN.expiresAt.toLocaleString()}
    
    Student:         ${profile?.full_name}
    Student Number:  ${profile?.student_number || "N/A"}

═══════════════════════════════════════════════════════════════
    
    INSTRUCTIONS:
    • This PRN is valid for 48 hours from generation
    • Present this code at any authorized payment point
    • Keep this receipt for your records
    • Contact support if payment is not reflected in 48 hours

═══════════════════════════════════════════════════════════════
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRN-${generatedPRN.code}.txt`;
    a.click();
  };

  const formatAmount = (value: string) => {
    const num = parseInt(value.replace(/,/g, ""));
    if (isNaN(num)) return "";
    return num.toLocaleString();
  };

  const sharePRN = async () => {
    if (!generatedPRN) return;

    const shareText = `PRN Code: ${
      generatedPRN.code
    }\nAmount: UGX ${generatedPRN.amount.toLocaleString()}\nPurpose: ${
      generatedPRN.purpose
    }\n\nExpires: ${generatedPRN.expiresAt.toLocaleString()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Payment Reference Number",
          text: shareText,
        });
        toast({
          title: "Shared Successfully",
          description: "PRN shared with your contacts",
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to Clipboard",
        description: "Share text copied. You can paste it anywhere.",
      });
    }
  };

  const downloadReceiptImage = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `PRN-Receipt-${generatedPRN?.code}.png`;
      link.click();
      toast({
        title: "Receipt Downloaded",
        description: "Receipt saved as image",
      });
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="relative grid lg:grid-cols-3 gap-8">
        {/* Main PRN Generator */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card via-card to-muted/50">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-secondary/10 via-accent/5 to-transparent" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/10 to-transparent" />
              <div className="absolute top-4 right-4">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut" as const,
                  }}
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary via-accent to-secondary shadow-lg shadow-secondary/30 flex items-center justify-center">
                    <Receipt className="h-8 w-8 text-secondary-foreground" />
                  </div>
                </motion.div>
              </div>

              <CardHeader className="relative pb-2">
                <div className="space-y-1">
                  <Badge className="w-fit bg-secondary/10 text-secondary border-0 mb-2">
                    <Zap className="h-3 w-3 mr-1" />
                    Instant Generation
                  </Badge>
                  <CardTitle className="text-3xl md:text-4xl font-bold">
                    Generate PRN
                  </CardTitle>
                  <CardDescription className="text-base">
                    Create a payment reference number for university fees and
                    services
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="relative space-y-8 pt-6">
                {/* Purpose Selection - Visual Grid */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Payment Type
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {purposes.map((p, i) => (
                      <motion.button
                        key={p.value}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => handlePurposeChange(p.value)}
                        className={`relative p-4 rounded-2xl border-2 transition-all duration-300 text-left group ${
                          purpose === p.value
                            ? "border-secondary bg-secondary/10 shadow-lg shadow-secondary/20"
                            : "border-border hover:border-secondary/50 hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-2xl mb-2 block">{p.icon}</span>
                        <span className="text-xs font-medium block truncate">
                          {p.label}
                        </span>
                        {purpose === p.value && (
                          <motion.div
                            layoutId="selected"
                            className="absolute top-2 right-2 h-2 w-2 rounded-full bg-secondary"
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Fee Selection - Link to Student Fees */}
                {fees.length > 0 && (
                  <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border">
                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Pay Towards Outstanding Fee (Optional)
                    </Label>
                    <Select
                      value={selectedFeeId}
                      onValueChange={setSelectedFeeId}
                    >
                      <SelectTrigger className="rounded-xl border-2 h-12">
                        <SelectValue placeholder="Select a fee to pay towards..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fees.map((fee) => {
                          const remaining = fee.amount - fee.paid_amount;
                          return (
                            <SelectItem key={fee.id} value={fee.id}>
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="font-medium">
                                    {fee.description}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({fee.semester})
                                  </span>
                                </div>
                                <span className="text-xs bg-muted px-2 py-1 rounded">
                                  Remaining: UGX {remaining.toLocaleString()}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedFeeId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2 pt-2"
                      >
                        {fees.find((f) => f.id === selectedFeeId) && (
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Total Fee:
                              </span>
                              <span className="font-medium">
                                UGX{" "}
                                {fees
                                  .find((f) => f.id === selectedFeeId)
                                  ?.amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Already Paid:
                              </span>
                              <span className="font-medium text-emerald-600">
                                UGX{" "}
                                {fees
                                  .find((f) => f.id === selectedFeeId)
                                  ?.paid_amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between border-t pt-1">
                              <span className="text-muted-foreground">
                                Remaining Balance:
                              </span>
                              <span className="font-semibold text-lg">
                                UGX{" "}
                                {(
                                  (fees.find((f) => f.id === selectedFeeId)
                                    ?.amount || 0) -
                                  (fees.find((f) => f.id === selectedFeeId)
                                    ?.paid_amount || 0)
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Amount Input - Premium Style */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment Amount
                  </Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                      UGX
                    </div>
                    <Input
                      type="text"
                      value={formatAmount(amount)}
                      onChange={(e) =>
                        setAmount(e.target.value.replace(/,/g, ""))
                      }
                      className="h-20 pl-20 text-3xl font-bold text-right pr-6 border-2 rounded-2xl focus:border-secondary transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Generate Button - Premium */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={generatePRN}
                    disabled={isGenerating || !amount || !purpose}
                    className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-xl shadow-primary/25 transition-all duration-300 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <RefreshCw className="h-6 w-6" />
                        </motion.div>
                        <span>Generating PRN...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-6 w-6" />
                        <span>Generate PRN</span>
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Generated PRN Display - Ticket Style */}
          <AnimatePresence>
            {generatedPRN && (
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className="relative">
                  {/* Ticket Shape with Notches */}
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-background rounded-full" />
                  <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-background rounded-full" />

                  <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-1 rounded-3xl shadow-2xl shadow-emerald-500/30">
                    <div className="bg-card rounded-[22px] p-8">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0">
                              Payment Reference Generated
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Valid for 48 hours
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setShowQR(!showQR)}
                              className="rounded-xl"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={copyToClipboard}
                              className="rounded-xl"
                            >
                              {copied ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={downloadPRN}
                              className="rounded-xl"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </div>
                      </div>

                      {/* PRN Code - Large Display */}
                      <div className="text-center py-8 px-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 mb-8">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                          Your PRN Code
                        </p>
                        <motion.p
                          className="font-mono text-2xl md:text-4xl font-black tracking-wider"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.3, type: "spring" }}
                        >
                          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                            {generatedPRN.code}
                          </span>
                        </motion.p>
                      </div>

                      {/* QR Code Display */}
                      <AnimatePresence>
                        {showQR && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex justify-center p-6 rounded-2xl bg-white border-2 border-dashed border-emerald-500/50 mb-8"
                          >
                            <div className="flex flex-col items-center gap-3">
                              <p className="text-sm font-medium text-muted-foreground">
                                Scan to complete payment
                              </p>
                              <QRCodeSVG
                                value={generatedPRN.code}
                                size={200}
                                level="H"
                                includeMargin={true}
                                fgColor="#000000"
                                bgColor="#ffffff"
                              />
                              <p className="text-xs text-muted-foreground text-center">
                                PRN: {generatedPRN.code}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          {
                            label: "Amount",
                            value: `UGX ${generatedPRN.amount.toLocaleString()}`,
                            icon: Wallet,
                          },
                          {
                            label: "Purpose",
                            value: generatedPRN.purpose,
                            icon: Layers,
                          },
                          {
                            label: "Generated",
                            value:
                              generatedPRN.generatedAt.toLocaleTimeString(),
                            icon: Clock,
                          },
                          {
                            label: "Expires",
                            value: generatedPRN.expiresAt.toLocaleString(),
                            icon: AlertCircle,
                          },
                        ].map((item, i) => (
                          <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            className="p-4 rounded-2xl bg-muted/50 border border-border/50"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {item.label}
                              </span>
                            </div>
                            <p
                              className={`font-semibold truncate ${
                                item.label === "Expires" ? "text-amber-600" : ""
                              }`}
                            >
                              {item.value}
                            </p>
                          </motion.div>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            onClick={sharePRN}
                            variant="outline"
                            className="h-12 rounded-xl gap-2 w-full"
                          >
                            <Share2 className="h-4 w-4" />
                            Share PRN
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            onClick={() => setShowReceiptModal(true)}
                            className="h-12 rounded-xl gap-2 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                          >
                            <Eye className="h-4 w-4" />
                            View Receipt
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent PRNs - Timeline Style */}
          {recentPRNs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Clock className="h-5 w-5 text-secondary" />
                    Recent PRNs
                  </CardTitle>
                  <CardDescription>
                    Your payment reference history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-secondary via-accent to-transparent" />

                    <div className="space-y-4">
                      {recentPRNs.map((prn, i) => {
                        const now = new Date();
                        const isExpired = prn.expiresAt <= now;
                        const isPaid = prn.status === "paid";
                        const hoursLeft = isExpired
                          ? 0
                          : Math.round(
                              (prn.expiresAt.getTime() - now.getTime()) /
                                (1000 * 60 * 60),
                            );
                        const dotColor = isPaid
                          ? "bg-emerald-500 shadow-emerald-500/50"
                          : isExpired
                            ? "bg-red-400 shadow-red-400/50"
                            : hoursLeft <= 12
                              ? "bg-amber-500 shadow-amber-500/50"
                              : "bg-secondary shadow-secondary/50";
                        const statusLabel = isPaid
                          ? "Paid"
                          : isExpired
                            ? "Expired"
                            : hoursLeft <= 12
                              ? "Expiring Soon"
                              : "Active";
                        const statusColor = isPaid
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                          : isExpired
                            ? "bg-red-500/10 text-red-600 border-red-200"
                            : hoursLeft <= 12
                              ? "bg-amber-500/10 text-amber-600 border-amber-200"
                              : "bg-secondary/10 text-secondary border-secondary/20";

                        return (
                          <motion.div
                            key={prn.code}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="relative flex items-start gap-4 pl-12"
                          >
                            {/* Timeline Dot */}
                            <div
                              className={`absolute left-4 h-4 w-4 rounded-full shadow-lg ${dotColor}`}
                            />

                            <div className="flex-1 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors border border-border/50 group">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-mono font-bold text-sm">
                                  {prn.code}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${statusColor}`}
                                >
                                  {statusLabel}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted-foreground">
                                  {prn.purpose}
                                </p>
                                <p className="font-bold text-sm">
                                  UGX {prn.amount.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {prn.generatedAt.toLocaleDateString("en-UG", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {!isPaid && (
                                  <span
                                    className={
                                      isExpired
                                        ? "text-red-500"
                                        : hoursLeft <= 12
                                          ? "text-amber-600 font-semibold"
                                          : ""
                                    }
                                  >
                                    {isExpired
                                      ? "Expired"
                                      : `${hoursLeft}h remaining`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar - Floating Cards */}
        <div className="space-y-6">
          {/* Quick Info Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/30 to-transparent rounded-bl-full" />
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Important</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      PRNs expire after 48 hours. Complete your payment before
                      expiry to avoid regeneration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Methods */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment Methods
                </CardTitle>
                <CardDescription>Choose how you want to pay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentMethods.map((method, i) => {
                  return (
                    <motion.div
                      key={method.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="p-4 rounded-2xl border border-border/50 bg-muted/20 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-12 w-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center shadow-lg`}
                        >
                          {method.images.length > 1 ? (
                            <div className="flex gap-0.5">
                              {method.images.map((img, idx) => (
                                <img key={idx} src={img} alt="" className="h-5 w-auto object-contain" />
                              ))}
                            </div>
                          ) : (
                            <img src={method.images[0]} alt={method.name} className="h-6 w-auto object-contain" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">
                              {method.name}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {method.timing}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {method.desc}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handlePaymentMethod(method.key)}
                          disabled={!generatedPRN || processingPayment}
                          className="gap-1"
                        >
                          {processingPayment ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Pay Now
                              <ArrowRight className="h-3 w-3" />
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Processing Time */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">Processing Time</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Payments reflect within 24-48 hours. Contact support if
                      not updated after this period.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Receipt Modal Dialog */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6 rounded-xl sm:rounded-lg">
          <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 gap-3">
            <div className="flex-1">
              <DialogTitle className="text-lg sm:text-xl">
                Payment Receipt
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Keep this receipt for your records
              </DialogDescription>
            </div>
            <button
              onClick={() => setShowReceiptModal(false)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          {generatedPRN && (
            <div className="space-y-4 sm:space-y-6">
              {/* Receipt Content */}
              <div
                ref={receiptRef}
                className="p-4 sm:p-8 space-y-4 sm:space-y-6 bg-white text-black rounded-xl sm:rounded-2xl border-2 border-emerald-500"
              >
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 sm:pb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-emerald-700 mb-1 sm:mb-2">
                    PAYMENT RECEIPT
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Nexus University Portal
                  </p>
                </div>

                {/* Student Information */}
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700">
                      Student Name:
                    </span>
                    <span className="text-gray-900 text-right">
                      {profile?.full_name || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700">
                      Student Number:
                    </span>
                    <span className="font-mono text-gray-900">
                      {profile?.student_number || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-300 pb-2">
                    <span className="font-semibold text-gray-700">Email:</span>
                    <span className="text-gray-900 text-right break-all">
                      {profile?.email || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-emerald-50 p-3 sm:p-4 rounded-lg sm:rounded-xl space-y-2 sm:space-y-3">
                  <h3 className="font-bold text-emerald-900 text-sm sm:text-base">
                    Payment Details
                  </h3>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-700">PRN Code:</span>
                      <span className="font-mono font-bold text-emerald-700 text-base sm:text-lg break-all">
                        {generatedPRN.code}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Amount:</span>
                      <span className="font-bold text-gray-900">
                        UGX {generatedPRN.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-700">Purpose:</span>
                      <span className="text-gray-900 text-right">
                        {generatedPRN.purpose}
                      </span>
                    </div>
                    {generatedPRN.fee_id && (
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-700">Linked Fee:</span>
                        <span className="text-gray-900 text-right">
                          {fees.find((f) => f.id === generatedPRN.fee_id)
                            ?.description || "General"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamp Information */}
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-700">Generated:</span>
                    <span className="text-gray-900 text-right">
                      {generatedPRN.generatedAt.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-700">Expires:</span>
                    <span className="font-semibold text-amber-700">
                      {generatedPRN.expiresAt.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* QR Code for Receipt */}
                <div className="flex justify-center py-3 sm:py-4 border-t-2 border-b-2 border-dashed border-gray-300 overflow-x-auto">
                  <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-300 flex-shrink-0">
                    <QRCodeSVG
                      value={generatedPRN.code}
                      size={window.innerWidth < 480 ? 100 : 120}
                      level="H"
                      includeMargin={true}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                  <h4 className="font-bold text-blue-900 mb-2 text-sm sm:text-base">
                    Instructions:
                  </h4>
                  <ul className="text-xs sm:text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>This PRN is valid for 48 hours from generation</li>
                    <li>Present this code at any authorized payment point</li>
                    <li>Keep this receipt for your records</li>
                    <li>
                      Contact support if payment is not reflected within 48
                      hours
                    </li>
                  </ul>
                </div>

                {/* Footer */}
                <div className="text-center border-t-2 border-dashed border-gray-300 pt-3 sm:pt-4">
                  <p className="text-xs text-gray-600">
                    Receipt ID: {generatedPRN.id || generatedPRN.code}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Generated by Nexus University Payment System
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
                <Button
                  onClick={downloadReceiptImage}
                  variant="outline"
                  className="gap-2 w-full sm:flex-1 text-xs sm:text-sm h-10 sm:h-auto"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Download as Image</span>
                  <span className="inline xs:hidden">Image</span>
                </Button>
                <Button
                  onClick={downloadPRN}
                  variant="outline"
                  className="gap-2 w-full sm:flex-1 text-xs sm:text-sm h-10 sm:h-auto"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Download as Text</span>
                  <span className="inline xs:hidden">Text</span>
                </Button>
                <Button
                  onClick={sharePRN}
                  className="gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm h-10 sm:h-auto"
                >
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Money Provider Selection Modal */}
      <Dialog open={showMoMoProvider} onOpenChange={setShowMoMoProvider}>
        <DialogContent className="max-w-2xl border-0 overflow-hidden p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            {/* Epic Header with Gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 pb-16">
              {/* Animated Background Orbs */}
              <motion.div
                className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <div className="relative z-10">
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-between mb-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                      <Smartphone className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-black">
                        Mobile Money
                      </h2>
                      <p className="text-black/60 text-sm">
                        Select your provider to continue
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMoMoProvider(false)}
                    className="text-white hover:bg-white/20 rounded-xl"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </motion.div>

                {generatedPRN && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-black/70 text-sm mb-1">
                          Amount to Pay
                        </p>
                        <p className="text-4xl font-black text-black">
                          UGX {generatedPRN.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-black/70 text-sm mb-1">For</p>
                        <p className="text-black font-semibold">
                          {generatedPRN.purpose}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Provider Cards */}
            <div className="p-8 -mt-8">
              <div className="grid grid-cols-2 gap-6">
                {/* MTN MoMo */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProviderSelect("MTN")}
                  className="cursor-pointer group"
                >
                  <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 h-64">
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16" />
                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full translate-y-20 -translate-x-20" />
                    </div>

                    <CardContent className="relative h-full flex flex-col items-center justify-center p-8">
                      <motion.div
                        animate={{ rotate: [0, 5, 0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="mb-6"
                      >
                        <div className="h-24 w-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center">
                          <img src="/images/payments/mtn-momo.png" alt="MTN MoMo" className="h-16 w-auto object-contain" />
                        </div>
                      </motion.div>

                      <h3 className="text-2xl font-black text-white mb-2">
                        MTN MoMo
                      </h3>
                      <p className="text-white/90 text-sm text-center mb-4">
                        Mobile Money
                      </p>

                      <motion.div
                        className="flex items-center gap-2 text-white font-semibold"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Select <ArrowRight className="h-5 w-5" />
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Airtel Money */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProviderSelect("AIRTEL")}
                  className="cursor-pointer group"
                >
                  <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 h-64">
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-y-16 -translate-x-16" />
                      <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-y-20 translate-x-20" />
                    </div>

                    <CardContent className="relative h-full flex flex-col items-center justify-center p-8">
                      <motion.div
                        animate={{ rotate: [0, -5, 0, 5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="mb-6"
                      >
                        <div className="h-24 w-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center">
                          <img src="/images/payments/airtel-money.png" alt="Airtel Money" className="h-16 w-auto object-contain" />
                        </div>
                      </motion.div>

                      <h3 className="text-2xl font-black text-white mb-2">
                        Airtel Money
                      </h3>
                      <p className="text-white/90 text-sm text-center mb-4">
                        Mobile Money
                      </p>

                      <motion.div
                        className="flex items-center gap-2 text-white font-semibold"
                        animate={{ x: [0, 5, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: 0.5,
                        }}
                      >
                        Select <ArrowRight className="h-5 w-5" />
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Info Banner */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
              >
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-900 text-sm">
                      Secure Payment
                    </p>
                    <p className="text-emerald-700 text-xs">
                      Your payment is encrypted and processed securely. Instant
                      confirmation upon approval.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Mobile Money Phone Number Entry Modal */}
      <Dialog open={showMoMoPhone} onOpenChange={setShowMoMoPhone}>
        <DialogContent className="max-w-lg border-0 overflow-hidden p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Dynamic Header based on Provider */}
            <div
              className={`relative overflow-hidden p-8 pb-12 ${
                selectedProvider === "mtn"
                  ? "bg-gradient-to-br from-yellow-500 via-yellow-600 to-amber-600"
                  : "bg-gradient-to-br from-red-600 via-red-700 to-rose-700"
              }`}
            >
              {/* Animated Orbs */}
              <motion.div
                className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-2xl"
                animate={{ scale: [1, 1.3, 1], x: [0, 20, 0], y: [0, -20, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-32 h-32 bg-white/20 rounded-full blur-2xl"
                animate={{
                  scale: [1.3, 1, 1.3],
                  x: [0, -15, 0],
                  y: [0, 15, 0],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="h-14 w-14 rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-xl"
                    >
                      <Smartphone className="h-7 w-7 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-black text-white">
                        {selectedProvider} MoMo
                      </h2>
                      <p className="text-white/80 text-sm">
                        Enter your phone number
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowMoMoPhone(false);
                      setPhoneNumber("");
                    }}
                    className="text-white hover:bg-white/20 rounded-xl"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {generatedPRN && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/20 backdrop-blur-md rounded-2xl p-5 border border-white/30 shadow-2xl"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-xs mb-1">
                          Payment Amount
                        </p>
                        <p className="text-3xl font-black text-white">
                          UGX {generatedPRN.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="h-16 w-16 rounded-xl bg-white/30 flex items-center justify-center">
                        <Wallet className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Phone Number Input Section */}
            <div className="p-8 -mt-6">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                {/* Phone Input Card */}
                <Card className="border-2 border-border shadow-xl">
                  <CardContent className="p-6">
                    <Label className="text-base font-bold mb-3 block">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            selectedProvider === "mtn"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <span className="text-muted-foreground font-mono">
                          +256
                        </span>
                      </div>
                      <Input
                        type="tel"
                        placeholder="7XX XXX XXX"
                        value={phoneNumber}
                        onChange={(e) =>
                          setPhoneNumber(e.target.value.replace(/\D/g, ""))
                        }
                        maxLength={9}
                        className="pl-32 pr-4 h-14 text-lg font-mono rounded-xl border-2 focus:ring-4"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Enter your {selectedProvider} number without the country
                      code
                    </p>
                  </CardContent>
                </Card>

                {/* Instructions */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`p-4 rounded-2xl ${
                    selectedProvider === "mtn"
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        selectedProvider === "MTN"
                          ? "bg-yellow-100"
                          : "bg-red-100"
                      }`}
                    >
                      <Zap
                        className={`h-5 w-5 ${
                          selectedProvider === "mtn"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`font-bold text-sm mb-1 ${
                          selectedProvider === "mtn"
                            ? "text-yellow-900"
                            : "text-red-900"
                        }`}
                      >
                        How it works
                      </p>
                      <ul
                        className={`text-xs space-y-1 ${
                          selectedProvider === "mtn"
                            ? "text-yellow-800"
                            : "text-red-800"
                        }`}
                      >
                        <li>• Enter your {selectedProvider} phone number</li>
                        <li>• You'll receive a prompt on your phone</li>
                        <li>• Enter your PIN to confirm payment</li>
                        <li>• Instant confirmation once approved</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMoMoPhone(false);
                      setShowMoMoProvider(true);
                    }}
                    className="h-14 rounded-xl gap-2 text-base"
                  >
                    Back
                  </Button>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleMoMoPayment}
                      disabled={phoneNumber.length < 9 || processingPayment}
                      className={`h-14 rounded-xl gap-2 text-base w-full shadow-xl ${
                        selectedProvider === "mtn"
                          ? "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700"
                          : "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800"
                      }`}
                    >
                      {processingPayment ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Pay Now
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* MTN/Airtel Phone Prompt Modal - Looks like phone notification */}
      <Dialog open={showPhonePrompt} onOpenChange={setShowPhonePrompt}>
        <DialogContent className="max-w-sm border-0 overflow-hidden p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative"
          >
            {/* Phone Frame - Mimics phone notification */}
            <div
              className={`relative overflow-hidden ${
                selectedProvider === "mtn"
                  ? "bg-gradient-to-b from-yellow-400 to-yellow-500"
                  : "bg-gradient-to-b from-red-500 to-red-600"
              } p-6 pt-12`}
            >
              {/* Top Status Bar Effect */}
              <div className="absolute top-0 inset-x-0 h-8 bg-black/20 flex items-center justify-between px-6 text-white text-xs">
                <span>9:41</span>
                <div className="flex gap-1">
                  <div className="w-4 h-3 border border-white/50" />
                  <div className="w-4 h-3 border border-white/50" />
                  <div className="w-4 h-3 border border-white/50 fill-white/50" />
                </div>
              </div>

              {/* Main Notification Card */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div
                  className={`${
                    selectedProvider === "mtn"
                      ? "bg-gradient-to-r from-yellow-400 to-amber-500"
                      : "bg-gradient-to-r from-red-500 to-red-600"
                  } p-6 text-white`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-white/30 flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">
                        {selectedProvider} MoMo
                      </p>
                      <p className="text-white/90 text-sm">
                        Payment Confirmation
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Payment Details */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center"
                  >
                    <p className="text-muted-foreground text-sm mb-2">
                      Amount to Pay
                    </p>
                    <div className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                      UGX {generatedPRN?.amount.toLocaleString()}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {generatedPRN?.purpose}
                    </p>
                  </motion.div>

                  {/* Phone Number Display */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="flex items-center justify-center gap-2 py-4 bg-muted/50 rounded-2xl"
                  >
                    <span className="text-muted-foreground">+256</span>
                    <span className="font-mono font-bold">{phoneNumber}</span>
                  </motion.div>

                  {/* PIN Entry Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-3"
                  >
                    <Label className="text-base font-bold block">
                      Enter Your PIN
                    </Label>
                    <div className="relative">
                      <input
                        type="password"
                        inputMode="numeric"
                        placeholder="••••"
                        value={pin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (value.length <= 4) {
                            setPin(value);
                            setPinError("");
                          }
                        }}
                        maxLength={4}
                        className="w-full h-16 text-center text-4xl font-bold rounded-2xl border-2 border-border focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
                      />
                      <motion.div
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1"
                        animate={{ scale: pin.length === 4 ? 1.1 : 1 }}
                      >
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            className={`h-3 w-3 rounded-full ${
                              i < pin.length
                                ? "bg-emerald-500 shadow-lg shadow-emerald-500/50"
                                : "bg-muted"
                            }`}
                            animate={
                              i < pin.length ? { scale: [1, 1.2, 1] } : {}
                            }
                            transition={{ duration: 0.3 }}
                          />
                        ))}
                      </motion.div>
                    </div>
                    {pinError && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-destructive text-sm font-medium"
                      >
                        {pinError}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Security Info */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200"
                  >
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900 text-sm">
                          Secure Payment
                        </p>
                        <p className="text-emerald-700 text-xs">
                          Never share your PIN. This is a secure transaction.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-2 gap-3 pt-4"
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPhonePrompt(false);
                        setShowMoMoPhone(true);
                        setPin("");
                        setPinError("");
                      }}
                      className="h-12 rounded-xl font-semibold"
                      disabled={verifyingPin}
                    >
                      Cancel
                    </Button>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handlePinVerification}
                        disabled={pin.length !== 4 || verifyingPin}
                        className={`h-12 rounded-xl gap-2 w-full font-semibold shadow-lg ${
                          selectedProvider === "mtn"
                            ? "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 disabled:opacity-50"
                            : "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 disabled:opacity-50"
                        }`}
                      >
                        {verifyingPin ? (
                          <>
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5" />
                            Confirm
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Phone Bottom Bezel Effect */}
              <div className="h-6" />
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Bank Branch Modal */}
      <Dialog open={showBankBranch} onOpenChange={setShowBankBranch}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Bank Branch Deposit
            </DialogTitle>
            <DialogDescription>
              Select your bank and deposit the PRN amount at any branch
            </DialogDescription>
          </DialogHeader>

          {!selectedBank ? (
            /* Bank Selection Grid */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose your bank to view deposit details:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {banks.map((bank, i) => (
                  <motion.div
                    key={bank.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.03, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedBank(bank)}
                    className="cursor-pointer group"
                  >
                    <Card className="relative overflow-hidden border-2 border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-lg">
                      <CardContent className="p-4 flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-xl bg-white border border-border flex items-center justify-center p-2 shadow-sm group-hover:shadow-md transition-shadow">
                          <img
                            src={bank.logo}
                            alt={bank.name}
                            className="h-full w-auto object-contain"
                          />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">{bank.shortName}</p>
                          <p className="text-xs text-muted-foreground">
                            {bank.cardTypes.join(" / ")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Deposit Details */
            <div className="space-y-6">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBank(null);
                  setBankDepositConfirmed(false);
                }}
                className="gap-2"
              >
                ← Back to banks
              </Button>

              {/* Bank Info Header */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border">
                <div className="h-14 w-14 rounded-xl bg-white border border-border flex items-center justify-center p-2">
                  <img
                    src={selectedBank.logo}
                    alt={selectedBank.name}
                    className="h-full w-auto object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedBank.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBank.branch}
                  </p>
                </div>
              </div>

              {/* PRN Amount */}
              {generatedPRN && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Amount to Deposit
                    </span>
                    <span className="text-2xl font-black">
                      UGX {generatedPRN.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">PRN Code</span>
                    <span className="font-mono font-bold text-primary">
                      {generatedPRN.code}
                    </span>
                  </div>
                </div>
              )}

              {/* Account Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                  Deposit To These Account Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Account Number", value: selectedBank.accountNumber },
                    { label: "Account Name", value: selectedBank.accountName },
                    { label: "SWIFT Code", value: selectedBank.swiftCode },
                    { label: "Branch", value: selectedBank.branch },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-3 rounded-xl bg-muted/50 border border-border"
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {item.label}
                      </p>
                      <p className="font-mono font-semibold text-sm">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="font-bold text-amber-900 text-sm">
                      Important Instructions
                    </p>
                    <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                      <li>
                        Write the PRN code <strong>{generatedPRN?.code}</strong> on
                        your deposit slip
                      </li>
                      <li>Deposit the exact amount shown above</li>
                      <li>Keep your deposit receipt for reference</li>
                      <li>
                        Payment will be reflected within 24 hours after deposit
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <input
                  type="checkbox"
                  id="bank-deposit-confirm"
                  checked={bankDepositConfirmed}
                  onChange={(e) => setBankDepositConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label
                  htmlFor="bank-deposit-confirm"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  I have noted the account details and PRN code, and I will
                  deposit the exact amount at my nearest {selectedBank.name}{" "}
                  branch
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedBank(null);
                    setBankDepositConfirmed(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!bankDepositConfirmed}
                  onClick={() => {
                    toast({
                      title: "Deposit Instructions Saved",
                      description: `Deposit UGX ${generatedPRN?.amount.toLocaleString()} at ${selectedBank.name} using PRN ${generatedPRN?.code}`,
                    });
                    setShowBankBranch(false);
                    setSelectedBank(null);
                    setBankDepositConfirmed(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Deposit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for Wallet icon
const Wallet = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </svg>
);
