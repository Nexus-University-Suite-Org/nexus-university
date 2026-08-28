import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  MailOpen,
  LockOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import OtpPopup from "@/components/OtpPopup";

type ForgotPasswordStep = "identifier" | "otp" | "password" | "success";

export default function ForgotPassword() {
  const [step, setStep] = useState<ForgotPasswordStep>("identifier");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [formData, setFormData] = useState({
    identifier: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [userEmail, setUserEmail] = useState("");
  const [otpPopupOpen, setOtpPopupOpen] = useState(false);
  const [otpPopupData, setOtpPopupData] = useState<{
    otp: string;
    email: string;
    expiryMinutes: number;
    title?: string;
    instructions?: string;
  } | null>(null);

  const { generateOTP, verifyOTP, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      setUserEmail(formData.identifier);

      const { error } = await generateOTP(formData.identifier, "");
      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: `A verification code has been sent to ${formData.identifier}`,
        duration: 5000,
      });

      setStep("otp");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const enteredOtp = otpValues.join("");

    try {
      const { valid, error } = await verifyOTP(formData.identifier, enteredOtp);
      if (error) throw error;

      if (valid) {
        toast({
          title: "Email Verified!",
          description: "Please set your new password.",
        });
        setStep("password");
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await resetPassword(
        formData.identifier,
        formData.password,
      );
      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your password has been reset.",
      });
      setStep("success");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: "identifier", label: "Identify" },
      { key: "otp", label: "Verify" },
      { key: "password", label: "Reset" },
    ];

    const currentIndex = steps.findIndex((s) => s.key === step);

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                i <= currentIndex
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  i < currentIndex ? "bg-secondary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderForm = () => {
    switch (step) {
      case "identifier":
        return (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-transparent to-accent/20 rounded-2xl blur-xl" />
              <div className="relative bg-gradient-to-br from-secondary/10 to-accent/5 p-6 rounded-2xl border border-secondary/20 backdrop-blur-sm">
                <MailOpen className="h-5 w-5 text-secondary mb-3" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter your email address or student number, and we'll send you
                  a verification code to reset your password.
                </p>
              </div>
            </motion.div>

            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium">
                Email or Student Number
              </Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                <Input
                  id="identifier"
                  placeholder="student@university.edu or 2100712345"
                  value={formData.identifier}
                  onChange={(e) =>
                    setFormData({ ...formData, identifier: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background focus:border-secondary transition-all"
                  required
                />
                <div className="absolute inset-0 rounded-xl border border-secondary opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-gradient-to-r from-secondary to-accent text-secondary-foreground hover:from-secondary/90 hover:to-accent/90 rounded-xl shadow-glow group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Send Verification Code
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        );

      case "otp":
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-20 w-20 rounded-2xl bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center mx-auto mb-6 border border-secondary/30"
              >
                <KeyRound className="h-10 w-10 text-secondary" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">
                Enter Verification Code
              </h3>
              <p className="text-muted-foreground text-sm">
                We've sent a 4-digit code to{" "}
                <span className="font-medium text-foreground">{userEmail}</span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center gap-3"
            >
              {otpValues.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Input
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="h-16 w-16 text-center text-2xl font-bold rounded-xl bg-muted/50 border-border focus:bg-background focus:border-secondary transition-all focus:shadow-glow"
                  />
                </motion.div>
              ))}
            </motion.div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-gradient-to-r from-secondary to-accent text-secondary-foreground hover:from-secondary/90 hover:to-accent/90 rounded-xl shadow-glow group"
              disabled={loading || otpValues.some((v) => !v)}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Verify Code
                  <CheckCircle2 className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Didn't receive the code?{" "}
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error } = await generateOTP(formData.identifier, "");
                    if (error) throw error;
                    toast({
                      title: "OTP Resent",
                      description: `A new verification code has been sent to ${formData.identifier}`,
                      duration: 5000,
                    });
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to resend OTP",
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-secondary font-medium hover:text-secondary/80 transition-colors"
              >
                Resend
              </button>
            </p>
          </form>
        );

      case "password":
        return (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-6"
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30"
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">
                Create New Password
              </h3>
              <p className="text-muted-foreground text-sm">
                Choose a strong password to secure your account
              </p>
            </motion.div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                New Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="h-14 pl-12 pr-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background focus:border-secondary transition-all"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="h-14 pl-12 pr-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background focus:border-secondary transition-all"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-secondary/10 border border-secondary/20"
            >
              <ShieldCheck className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/80">
                Use a combination of uppercase, lowercase, numbers, and symbols
                for maximum security
              </p>
            </motion.div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-gradient-to-r from-secondary to-accent text-secondary-foreground hover:from-secondary/90 hover:to-accent/90 rounded-xl shadow-glow group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Reset Password
                  <LockOpen className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        );

      case "success":
        return (
          <motion.div className="space-y-6 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto border-2 border-emerald-500/30">
                <motion.div
                  animate={{ scale: [0.8, 1.2, 1] }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Password Reset Successfully!
              </h2>
              <p className="text-muted-foreground text-lg">
                Your password has been changed. You can now sign in with your
                new password.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 justify-center"
            >
              <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-foreground/80">
                Your account is now secure with your new password
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-3"
            >
              <Button
                onClick={() => navigate("/auth")}
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-secondary to-accent text-secondary-foreground hover:from-secondary/90 hover:to-accent/90 rounded-xl shadow-glow group"
              >
                Back to Sign In
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full h-14 text-base font-semibold"
              >
                Go to Home
              </Button>
            </motion.div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Decorative */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden"
      >
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--secondary)/0.3)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_hsl(var(--accent)/0.2)_0%,_transparent_50%)]" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 right-[20%] w-72 h-72 rounded-full bg-secondary/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-20 left-[10%] w-60 h-60 rounded-full bg-accent/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-20 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white">
              UniPortal
            </span>
          </Link>

          <div className="max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-8">
                <Sparkles className="h-4 w-4 text-secondary" />
                <span>Account Recovery</span>
              </div>

              <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                Regain Access to
                <span className="block text-secondary">Your Account</span>
              </h1>

              <p className="text-lg text-white/70 mb-10">
                Follow a simple verification process to reset your password and
                regain full access to your UniPortal account.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Mail, text: "Verify your email" },
                  { icon: KeyRound, text: "Confirm with OTP" },
                  { icon: LockOpen, text: "Create new password" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-white/90">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
            className="absolute top-32 right-16 hidden xl:block"
          >
            <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <LockOpen className="h-8 w-8 text-white/80" />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">UniPortal</span>
          </Link>

          {/* Back button */}
          {step !== "identifier" && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => {
                if (step === "otp") setStep("identifier");
                else if (step === "password") setStep("otp");
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </motion.button>
          )}

          {/* Step Indicator */}
          {step !== "success" && renderStepIndicator()}

          {/* Form Header */}
          {step !== "success" && (
            <div className="mb-8">
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                key={step}
                className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3"
              >
                {step === "identifier"
                  ? "Forgot your password?"
                  : step === "otp"
                    ? "Verify your identity"
                    : "Create new password"}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground text-lg"
              >
                {step === "identifier"
                  ? "Don't worry, we'll help you reset it"
                  : step === "otp"
                    ? "Enter the code we sent you"
                    : "Choose a strong password"}
              </motion.p>
            </div>
          )}

          {/* Render Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderForm()}
            </motion.div>
          </AnimatePresence>

          {/* Back to sign in link */}
          {step !== "success" && (
            <p className="text-center text-muted-foreground mt-8">
              Remember your password?{" "}
              <Link
                to="/auth"
                className="text-secondary font-semibold hover:text-secondary/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          )}
        </motion.div>
      </div>

      {otpPopupData && (
        <OtpPopup
          open={otpPopupOpen}
          onOpenChange={setOtpPopupOpen}
          otp={otpPopupData.otp}
          email={otpPopupData.email}
          expiryMinutes={otpPopupData.expiryMinutes}
          title={otpPopupData.title}
          instructions={otpPopupData.instructions}
        />
      )}
    </div>
  );
}
