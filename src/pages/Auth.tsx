import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  BookOpen,
  Award,
  Users,
  Sparkles,
  IdCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

export default function Auth() {
  console.log("[AuthPage] Component rendering");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  console.log("[AuthPage] State initialized:", { identifier, password, loading });

  const { signInWithStudentId } = useAuth();
  const { settings } = useSiteSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    console.log("[AuthPage] handleSignIn called with:", { identifier });
    e.preventDefault();
    setLoading(true);
    console.log("[AuthPage] Loading set to true");

    try {
      console.log("[AuthPage] Calling signInWithStudentId...");
      const { error, profile } = await signInWithStudentId(
        identifier,
        password,
      );
      console.log("[AuthPage] signInWithStudentId result:", { error, profile });
      if (error) throw error;

      const userRole = profile?.role || "student";
      console.log("[AuthPage] Login successful, userRole:", userRole);
      toast({ title: "Welcome back!" });
      console.log("[AuthPage] Navigating to:", userRole === "lecturer" ? "/lecturer" : "/dashboard");
      navigate(userRole === "lecturer" ? "/lecturer" : "/dashboard");
    } catch (error: any) {
      console.error("[AuthPage] Error during sign in:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log("[AuthPage] Loading set to false");
    }
  };

  const benefits = [
    { icon: BookOpen, text: "Access 2,500+ courses" },
    { icon: Award, text: "Track grades & achievements" },
    { icon: Users, text: "Join live sessions" },
  ];

  return (
    <div className="min-h-screen flex bg-[radial-gradient(circle_at_top_left,_rgba(194,234,201,0.62),_transparent_35%),linear-gradient(135deg,#f4f9f3_0%,#eef3ef_100%)]">
      {/* Left Panel - Decorative */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden"
      >
        <img
          src="/images/students.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center brightness-[0.72] contrast-[1.1] saturate-[1.05]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.78)_0%,rgba(27,55,78,0.74)_32%,rgba(17,115,128,0.28)_72%,rgba(38,165,144,0.38)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.25]" style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.9) 0.8px, transparent 0.8px)",
          backgroundSize: "30px 30px",
          maskImage: "radial-gradient(circle at center, black 35%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 35%, transparent 100%)",
        }} />

        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 right-[20%] w-72 h-72 rounded-full bg-[#f5c66f]/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-20 left-[10%] w-60 h-60 rounded-full bg-[#7fe0c4]/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-20 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/15 shadow-[0_10px_30px_rgba(15,23,42,0.2)]">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={`${settings.siteName} logo`}
                  className="h-7 w-7 object-contain"
                />
              ) : (
                <GraduationCap className="h-7 w-7 text-white" />
              )}
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/8 text-white/90 text-sm font-medium mb-8 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-[#f6d07a]" />
                <span>Join 50,000+ students</span>
              </div>
            </motion.div>

            <h1 className="mb-6 font-display text-4xl xl:text-5xl font-bold leading-[0.95] text-white">
              Your Gateway to
              <span className="mt-2 block bg-gradient-to-r from-[#f5d587] via-[#f0b24c] to-[#f4c870] bg-clip-text text-transparent">
                Academic Excellence
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-lg text-white/80 leading-relaxed">
              Access courses, manage your schedule, track grades, and connect
              with classmates — all in one powerful platform.
            </p>

            <div className="space-y-4">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
                    <benefit.icon className="h-5 w-5 text-[#f6d07a]" />
                  </div>
                  <span className="text-white/90 text-lg font-medium">
                    {benefit.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-[#0d1a2b] bg-gradient-to-br from-[#d9f5b7] via-[#97d267] to-[#5cad5e]"
                  style={{ zIndex: 5 - i }}
                />
              ))}
            </div>
            <div className="text-sm text-white/80">
              <span className="font-semibold text-white">4.9★</span> from
              10,000+ reviews
            </div>
          </div>
        </div>

        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-32 right-16 hidden xl:block"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
            <BookOpen className="h-8 w-8 text-white/85" />
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute bottom-40 right-24 hidden xl:block"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-[#c5f0cb]/30 backdrop-blur-sm shadow-[0_10px_24px_rgba(15,23,42,0.22)]">
            <Award className="h-10 w-10 text-[#f2bd56]" />
          </div>
        </motion.div>
      </motion.div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(170,215,178,0.22),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(136,196,152,0.18),_transparent_32%)]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-[520px] rounded-[28px] border border-[#dfeee3] bg-white/80 p-6 shadow-[0_25px_80px_rgba(15,40,26,0.08)] backdrop-blur-xl sm:p-7"
        >
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#a8dfb2] to-[#73c88b] flex items-center justify-center shadow-[0_10px_20px_rgba(99,175,118,0.35)]">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={`${settings.siteName} logo`}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <GraduationCap className="h-6 w-6 text-[#15322a]" />
              )}
            </div>
            <span className="font-display text-xl font-bold text-[#1a2b20]">
              {settings.shortName}
            </span>
          </Link>

          {/* Form Header */}
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d9efd9] bg-[#f0f9f2] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#2b5c3d]">
              <Sparkles className="h-3.5 w-3.5 text-[#5bbd7d]" />
              Secure access
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-[#122320] mb-3 leading-none">
              Welcome back
            </h1>
            <p className="text-[#4d5f57] text-lg">
              Sign in with your student credentials
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium text-[#213a31]">
                Student / Registration Number or Email
              </Label>
              <div className="relative">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#4c8e62]" />
                <Input
                  id="identifier"
                  placeholder="21/U/12345/PS, 2100712345 or email"
                  value={identifier}
                  onChange={(e) => {
                    console.log("[AuthPage] identifier changed:", e.target.value);
                    setIdentifier(e.target.value);
                  }}
                  className="h-14 pl-12 text-base rounded-2xl border-[#cfe7d1] bg-[#f7fbf7] text-[#1f2a37] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 focus-visible:ring-[#9dd1a8] focus-visible:ring-offset-0 focus-visible:border-[#9dd1a8]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-[#213a31]">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-[#4d8d66] hover:text-[#37714f] font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#4c8e62]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    console.log("[AuthPage] password changed");
                    setPassword(e.target.value);
                  }}
                  className="h-14 pl-12 pr-12 text-base rounded-2xl border-[#cfe7d1] bg-[#f7fbf7] text-[#1f2a37] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 focus-visible:ring-[#9dd1a8] focus-visible:ring-offset-0 focus-visible:border-[#9dd1a8]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#597b67] hover:text-[#183a2a] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              onClick={() => console.log("[AuthPage] Submit button clicked")}
              className="w-full h-14 text-base font-semibold bg-gradient-to-r from-[#bfe8bf] via-[#9ed9a4] to-[#7cc98d] text-[#163229] hover:brightness-[1.02] rounded-2xl shadow-[0_18px_30px_rgba(92,170,112,0.30)] group border border-[#a6d6ad]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
