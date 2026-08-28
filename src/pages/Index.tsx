import { Link, Navigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Users,
  Video,
  Award,
  ArrowRight,
  Sparkles,
  Play,
  Calendar,
  CreditCard,
  ChartBar,
  Globe,
  Shield,
  Zap,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";
import { useRef } from "react";

export default function Index() {
  const { user, profile, loading } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);

  // Only use scroll effects if we're actually going to render the landing page
  const shouldRender = !loading && !(user && profile);

  const { scrollYProgress } = useScroll({
    target: shouldRender ? heroRef : null,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Redirect authenticated users to their dashboard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && profile) {
    // Ensure we have the role before redirecting
    const destination =
      profile.role === "lecturer" ? "/lecturer" : "/dashboard";
    console.log("Redirecting to:", destination, "Role:", profile.role);
    return <Navigate to={destination} replace />;
  }

  const stats = [
    { value: "15,000+", label: "Enrolled Students" },
    { value: "450+", label: "Academic Programs" },
    { value: "120+", label: "Research Projects" },
    { value: "94%", label: "Employment Rate" },
  ];

  const features = [
    {
      icon: BookOpen,
      title: "Self-Service Portal",
      desc: "Comprehensive academic management including course registration, timetable access, and digital transcripts.",
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: CreditCard,
      title: "Financial Management",
      desc: "Automated PRN generation, tuition fee tracking, and secure payment integration for hassle-free transactions.",
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: GraduationCap,
      title: "Academic Excellence",
      desc: "Real-time GPA tracking, academic progress visualization, and Dean's List automated recognition.",
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: Shield,
      title: "Identity Management",
      desc: "Digital ID card generation and secure multi-factor authentication for all university resources.",
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      desc: "Synchronized academic calendars, exam schedules, and real-time lecture notifications.",
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: ChartBar,
      title: "Advanced Analytics",
      desc: "Data-driven insights for both students and lecturers to monitor performance and learning outcomes.",
      color: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden"
      >
        {/* Modern High-End Light Background */}
        <div className="absolute inset-0 bg-white" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_hsl(var(--primary)/0.08),_transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage: `radial-gradient(hsl(var(--muted-foreground)/0.3) 0.5px, transparent 0.5px)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-8">
                <Sparkles className="h-3 w-3" />
                <span>Next Generation Academic Management</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-display font-extrabold text-[#111827] tracking-tight mb-8 leading-[1.05]">
                Elevate Your <br />
                <span className="text-primary italic font-serif">
                  Academic Potential
                </span>
              </h1>

              <p className="text-xl text-zinc-500 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
                A sophisticated, unified platform for modern higher education.
                Manage your academic life, finances, and achievements with
                unparalleled efficiency.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                {user ? (
                  <Button
                    size="lg"
                    asChild
                    className="bg-violet-600 text-white hover:bg-violet-700 text-md px-10 h-14 rounded-full transition-all duration-300 shadow-xl shadow-violet-100"
                  >
                    <Link to="/dashboard">
                      Access Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      asChild
                      className="bg-violet-600 text-white hover:bg-violet-700 text-md px-10 h-14 rounded-full transition-all duration-300 shadow-xl shadow-violet-100"
                    >
                      <Link to="/auth">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Minimalist Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 border-t border-zinc-100 pt-16">
                {stats.map((stat, i) => (
                  <div key={stat.label} className="text-center group">
                    <div className="text-2xl md:text-3xl font-extrabold text-[#111827] mb-1 group-hover:text-violet-600 transition-colors">
                      {stat.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 relative bg-white border-t border-zinc-100">
        <div className="container">
          <div className="max-w-2xl mb-24">
            <h2 className="text-3xl md:text-4xl font-display font-extrabold text-[#111827] mb-6 tracking-tight">
              Core Institutional <br />
              Capabilities
            </h2>
            <div className="h-1.5 w-16 bg-gradient-to-r from-violet-600 to-indigo-600 mb-8 rounded-full" />
            <p className="text-zinc-500 text-lg leading-relaxed font-light">
              Designed for performance, security, and ease of use. Our modular
              ecosystem provides everything necessary for institutional success.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-2 -m-2 rounded-2xl hover:bg-violet-50/50 transition-colors duration-300"
              >
                <div
                  className={`h-12 w-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center mb-6 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-sm shadow-violet-50`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight text-[#111827]">
                  {feature.title}
                </h3>
                <p className="text-zinc-500 leading-relaxed text-sm lg:text-base font-light">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Institutional Focus */}
      <section className="py-32 bg-slate-50 text-foreground overflow-hidden relative border-y border-zinc-100">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-violet-600/5 skew-x-12 translate-x-1/2" />

        <div className="container relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="lg:w-1/2">
              <span className="text-violet-600 font-bold text-[10px] tracking-[0.2em] uppercase mb-4 block">
                Institutional Hub
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-extrabold text-[#111827] mb-8 leading-tight tracking-tight">
                Centralized Governance <br />
                for Modern Learning
              </h2>
              <p className="text-zinc-500 text-lg mb-10 leading-relaxed font-light">
                Our platform bridges the gap between administration and
                academia, eliminating bureaucracy through intelligent
                automation.
              </p>

              <div className="grid gap-4">
                {[
                  {
                    title: "Unified Platform",
                    desc: "One source of truth for all records",
                  },
                  {
                    title: "Automated Compliance",
                    desc: "Rigorous standards tracking",
                  },
                  {
                    title: "Secure Infrastructure",
                    desc: "Enterprise-grade data protection",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-5 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:border-violet-200 hover:shadow-md transition-all"
                  >
                    <CheckCircle2 className="h-6 w-6 text-violet-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-[#111827] mb-1">
                        {item.title}
                      </h4>
                      <p className="text-sm text-zinc-500 font-light">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="relative aspect-square max-w-lg mx-auto">
                <div className="absolute inset-0 bg-violet-500/10 blur-[100px] rounded-full" />
                <div className="relative h-full w-full rounded-3xl border border-zinc-100 bg-white shadow-2xl overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-zinc-100 bg-violet-50/30 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-violet-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-violet-200" />
                      <div className="h-2.5 w-2.5 rounded-full bg-violet-200" />
                    </div>
                    <div className="text-[10px] text-violet-400 font-mono tracking-tighter uppercase font-bold">
                      purple_core_v2.0
                    </div>
                  </div>
                  <div className="flex-1 p-8 space-y-8">
                    <div className="h-8 w-1/2 bg-violet-50 rounded-lg animate-pulse" />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-24 bg-violet-600/5 border border-violet-100 rounded-xl shadow-inner shadow-violet-50" />
                      <div className="h-24 bg-zinc-50 rounded-xl" />
                      <div className="h-24 bg-zinc-50 rounded-xl" />
                    </div>
                    <div className="space-y-4">
                      <div className="h-4 w-full bg-zinc-50 rounded" />
                      <div className="h-4 w-3/4 bg-zinc-50 rounded" />
                      <div className="h-4 w-5/6 bg-zinc-50 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Light Footer */}
      <footer className="py-20 bg-white border-t border-zinc-100">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-[#111827] tracking-tight">
                UniPortal
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-8 md:gap-12 text-sm text-zinc-500 font-bold tracking-tight">
              <Link
                to="/"
                className="hover:text-violet-600 transition-colors"
              >
                Institute
              </Link>
              <Link
                to="/"
                className="hover:text-violet-600 transition-colors"
              >
                Governance
              </Link>
              <Link
                to="/"
                className="hover:text-violet-600 transition-colors"
              >
                Resources
              </Link>
              <Link
                to="/"
                className="hover:text-violet-600 transition-colors"
              >
                Terms
              </Link>
            </div>

            <div className="text-zinc-400 text-[10px] font-mono uppercase tracking-[0.2em] font-bold">
              © 2025 nexus_systems_inc
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
