import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  ChartBar,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  LayoutGrid,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { fetchPlatformStats, type PlatformStats } from "@/lib/landingApi";

/**
 * Accent rotation for the capability tiles. Cycling a small palette keeps the
 * light/violet identity while giving the grid enough contrast to scan.
 */
const TONES = [
  { soft: "bg-violet-50 text-violet-600", solid: "group-hover:bg-violet-600" },
  { soft: "bg-amber-50 text-amber-600", solid: "group-hover:bg-amber-500" },
  { soft: "bg-teal-50 text-teal-700", solid: "group-hover:bg-teal-600" },
  { soft: "bg-sky-50 text-sky-600", solid: "group-hover:bg-sky-600" },
  { soft: "bg-indigo-50 text-indigo-600", solid: "group-hover:bg-indigo-600" },
  { soft: "bg-rose-50 text-rose-600", solid: "group-hover:bg-rose-600" },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Self-Service Portal",
    desc: "Course registration, timetable access, and digital transcripts handled in one place, without queueing at the registrar's office.",
  },
  {
    icon: CreditCard,
    title: "Payments & PRN",
    desc: "Generate payment references, track fee balances, and keep a clear history of every transaction against your record.",
  },
  {
    icon: GraduationCap,
    title: "Results & Transcripts",
    desc: "Follow your GPA as results publish, and download a transcript whenever you need one for an application or internship.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Identity",
    desc: "A digital ID card and one account for every university service, so you are not juggling separate credentials.",
  },
  {
    icon: Calendar,
    title: "Academic Calendar",
    desc: "Registration windows, exam dates, and deadlines in a single calendar, so nothing important slips past unnoticed.",
  },
  {
    icon: ChartBar,
    title: "Progress Analytics",
    desc: "See performance trends across courses and semesters, and for lecturers, a clear view of how a cohort is doing.",
  },
];

const ROLES = [
  {
    icon: GraduationCap,
    title: "Students",
    desc: "Register for courses, sit your quizzes, submit assignments, and track results and fees from your phone.",
    points: ["Register & enrol", "Submit work", "Track results"],
  },
  {
    icon: Users,
    title: "Lecturers",
    desc: "Publish materials, take attendance, set assignments and quizzes, and grade submissions in one workflow.",
    points: ["Publish content", "Mark & grade", "View analytics"],
  },
  {
    icon: Award,
    title: "Registrars",
    desc: "Manage student records, approve enrollments, and issue transcripts with a full audit trail behind every action.",
    points: ["Manage records", "Approve enrollments", "Issue transcripts"],
  },
];

const PLATFORM_POINTS = [
  {
    title: "One source of truth",
    desc: "Enrollments, results, and fees stay consistent everywhere they appear.",
  },
  {
    title: "Nothing gets missed",
    desc: "Deadlines and announcements reach the right people automatically.",
  },
  {
    title: "Fewer queues, faster service",
    desc: "Routine requests are self-service, so staff time goes to students who need it.",
  },
];

const formatCount = (value: number | null) =>
  value === null ? "—" : value.toLocaleString();

export default function Index() {
  const { user, profile, loading } = useAuth();
  const { settings } = useSiteSettings();
  const heroRef = useRef<HTMLElement>(null);
  const [stats, setStats] = useState<PlatformStats>({
    courseUnits: null,
    learningResources: null,
    programmes: null,
  });

  const isSignedIn = Boolean(user && profile);
  const hasLiveStats = stats.courseUnits !== null;

  const { scrollYProgress } = useScroll({
    target: isSignedIn ? null : heroRef,
    offset: ["start start", "end start"],
  });
  const backdropY = useTransform(scrollYProgress, [0, 1], [0, 140]);

  useEffect(() => {
    if (isSignedIn) return;
    let active = true;
    fetchPlatformStats().then((next) => {
      if (active) setStats(next);
    });
    return () => {
      active = false;
    };
  }, [isSignedIn]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <Navigate
        to={
          profile?.role === "lecturer"
            ? "/lecturer"
            : profile?.role === "registrar"
              ? "/registrar"
              : "/dashboard"
        }
        replace
      />
    );
  }

  const statStrip = hasLiveStats
    ? [
        { value: formatCount(stats.courseUnits), label: "Course units live" },
        {
          value: formatCount(stats.learningResources),
          label: "Learning resources",
        },
        { value: formatCount(stats.programmes), label: "Programmes" },
        { value: "3", label: "Role-based portals" },
      ]
    : [
        { value: "24/7", label: "Portal access" },
        { value: "3", label: "Role-based portals" },
        { value: "1", label: "Account, all services" },
        { value: "PDF", label: "Transcript export" },
      ];

  const primaryCta = (
    <Button
      size="lg"
      asChild
      className="h-12 rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-indigo-600 px-9 text-base font-semibold text-white shadow-[0_18px_38px_rgba(109,40,217,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(109,40,217,0.35)]"
    >
      <Link to="/auth" className="inline-flex items-center">
        Get started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );

  const secondaryCta = (
    <Button
      size="lg"
      asChild
      variant="outline"
      className="h-12 rounded-full border-zinc-200 bg-white/85 px-8 text-base font-semibold text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:text-zinc-800"
    >
      <Link to="/auth" className="text-inherit">
        Sign in to continue
      </Link>
    </Button>
  );

  return (
    <div className="min-h-screen bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <LandingHeader />

      <main id="main">
        {/* Hero */}
        <section
          ref={heroRef}
          className="relative flex min-h-[85vh] items-center overflow-hidden pb-16 pt-24"
        >
          <motion.div
            style={{ y: backdropY }}
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <img
              src="/images/students.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center opacity-[1] saturate-[1.15] contrast-[1.15] brightness-[0.98]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.18)_28%,rgba(255,255,255,0.12)_58%,rgba(255,255,255,0.24)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,_hsl(258_90%_60%/0.12),_transparent_52%),radial-gradient(circle_at_15%_30%,_hsl(38_90%_60%/0.08),_transparent_26%)]" />
            <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-200/30 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.35]" style={{
              backgroundImage:
                "radial-gradient(hsl(240 5% 65%/0.35) 0.5px, transparent 0.5px)",
              backgroundSize: "32px 32px",
              maskImage:
                "radial-gradient(ellipse 70% 60% at 50% 35%, black, transparent)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 60% at 50% 35%, black, transparent)",
            }} />
          </motion.div>

          <div className="container relative z-10">
            <div className="mx-auto max-w-5xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-800 shadow-[0_10px_30px_rgba(109,40,217,0.12)] backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>One portal. Every academic need.</span>
                </div>

                <h1 className="mx-auto mb-6 max-w-5xl text-[2.5rem] font-black leading-[0.95] tracking-[-0.055em] text-[#0f172a] drop-shadow-[0_3px_14px_rgba(255,255,255,0.95)] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.25rem]">
                  <span className="block">Run your whole</span>
                  <span className="mt-2 block bg-gradient-to-r from-[#111827] via-violet-900 to-violet-700 bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(17,24,39,0.18)]">
                    university
                  </span>
                  <span className="mt-2 block -rotate-1 bg-gradient-to-r from-violet-800 via-violet-700 to-indigo-700 bg-clip-text font-serif italic text-transparent drop-shadow-[0_12px_20px_rgba(76,29,149,0.2)]">
                    life
                  </span>
                </h1>

                <p className="mx-auto mb-8 max-w-3xl text-base font-semibold leading-relaxed text-slate-900 drop-shadow-[0_1px_12px_rgba(255,255,255,0.82)] sm:text-lg md:text-xl">
                  Register for courses, pay fees, submit assignments, and
                  check your results — without the queues, the paperwork, or
                  the guesswork.
                </p>

                <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  {primaryCta}
                  {secondaryCta}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-zinc-200 pt-8 sm:gap-6 lg:grid-cols-4 lg:gap-8">
                  {statStrip.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.15 + i * 0.08,
                        duration: 0.45,
                      }}
                      className="rounded-2xl border border-zinc-100 bg-white/70 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.03)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(109,40,217,0.08)]"
                    >
                      <div className="mb-1 text-2xl font-black tracking-[-0.06em] text-[#111827] md:text-3xl">
                        {stat.value}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section
          id="features"
          className="scroll-mt-20 border-t border-zinc-100 bg-white py-24"
        >
          <div className="container">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <span className="mb-4 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-violet-600">
                Capabilities
              </span>
              <h2 className="mx-auto mb-5 max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.05em] text-[#111827] md:text-5xl lg:text-[4rem]">
                Everything the academic year throws at you,
                <span className="block">in one place</span>
              </h2>
              <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600" />
              <p className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-zinc-600">
                No more hunting across email, noticeboards, and departmental
                offices. The routine work is simply in the portal.
              </p>
            </div>

            <div className="grid gap-x-12 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, i) => {
                const tone = TONES[i % TONES.length];
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ delay: (i % 3) * 0.1, duration: 0.45 }}
                    className="group rounded-2xl p-3 transition-colors duration-300 hover:bg-zinc-50"
                  >
                    <div
                      className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${tone.soft} ${tone.solid} transition-all duration-300 group-hover:scale-105 group-hover:text-white`}
                    >
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2.5 text-lg font-bold tracking-tight text-[#111827]">
                      {feature.title}
                    </h3>
                    <p className="text-sm font-light leading-relaxed text-zinc-500 lg:text-base">
                      {feature.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Photographic section */}
        <section
          id="platform"
          className="relative isolate flex min-h-[560px] scroll-mt-20 items-center overflow-hidden bg-violet-950"
        >
          <img
            src="/images/campus-students.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-violet-950/95 via-violet-900/85 to-violet-950/60"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-transparent to-violet-950/40"
            aria-hidden="true"
          />

          <div className="container relative z-10 py-24">
            <div className="max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55 }}
              >
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                  Built around your week
                </span>
                <h2 className="mb-6 font-display text-3xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
                  Less admin. More time for the actual learning.
                </h2>
                <p className="mb-10 text-lg font-light leading-relaxed text-violet-100/85">
                  Everything the registrar's office, the finance desk, and
                  your department would each ask you for — collected into a
                  single account you can open on any device.
                </p>

                <div className="grid gap-4">
                  {PLATFORM_POINTS.map((point, i) => (
                    <motion.div
                      key={point.title}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ delay: i * 0.12, duration: 0.45 }}
                      className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:border-violet-300/30 hover:bg-white/10"
                    >
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-violet-300" />
                      <div>
                        <h3 className="mb-1 font-bold text-white">
                          {point.title}
                        </h3>
                        <p className="text-sm font-light text-violet-100/75">
                          {point.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section
          id="roles"
          className="scroll-mt-20 border-y border-zinc-100 bg-zinc-50/70 py-24"
        >
          <div className="container">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">
                One platform, three doors
              </span>
              <h2 className="mb-5 font-display text-3xl font-extrabold tracking-tight text-[#111827] md:text-4xl">
                Tailored to how you use it
              </h2>
              <p className="text-lg font-light leading-relaxed text-zinc-500">
                Sign in and the portal already knows who you are and what you
                need to see.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {ROLES.map((role, i) => (
                <motion.div
                  key={role.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: i * 0.12, duration: 0.45 }}
                  className="group flex flex-col rounded-3xl border border-zinc-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200/70 transition-transform duration-300 group-hover:scale-110">
                    <role.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2.5 font-display text-xl font-bold tracking-tight text-[#111827]">
                    {role.title}
                  </h3>
                  <p className="mb-6 flex-1 text-sm font-light leading-relaxed text-zinc-500">
                    {role.desc}
                  </p>
                  <ul className="space-y-2.5 border-t border-zinc-100 pt-5">
                    {role.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-2.5 text-sm text-zinc-600"
                      >
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-violet-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section
          id="get-started"
          className="scroll-mt-20 bg-white py-24"
        >
          <div className="container">
            <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 px-6 py-16 text-center md:px-16 md:py-20">
              <div
                className="absolute inset-0 opacity-20"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "radial-gradient(hsl(0 0% 100% / 0.5) 0.5px, transparent 0.5px)",
                  backgroundSize: "28px 28px",
                }}
              />
              <div className="relative z-10">
                <LayoutGrid className="mx-auto mb-6 h-9 w-9 text-violet-200" />
                <h2 className="mb-4 font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                  Your next semester starts here
                </h2>
                <p className="mx-auto mb-9 max-w-xl text-lg font-light leading-relaxed text-violet-100/90">
                  Create an account with your registration details and get
                  access to your courses, results, and fees straight away.
                </p>
                <Button
                  size="lg"
                  asChild
                  className="h-12 rounded-full bg-white px-9 text-base font-semibold text-violet-700 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-50"
                >
                  <Link to="/auth">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-zinc-50/70 py-14">
        <div className="container">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-xs">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                  ) : (
                    <GraduationCap className="h-5 w-5" />
                  )}
                </div>
                <span className="font-display text-lg font-bold tracking-tight text-[#111827]">
                  {settings.siteName}
                </span>
              </div>
              <p className="text-sm font-light leading-relaxed text-zinc-500">
                {settings.tagline}
              </p>
              {settings.supportEmail && (
                <a
                  href={`mailto:${settings.supportEmail}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-violet-600"
                >
                  <Mail className="h-4 w-4" />
                  {settings.supportEmail}
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-12 sm:gap-16">
              <div>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                  Explore
                </h3>
                <ul className="space-y-2.5 text-sm">
                  {[
                    { label: "Capabilities", href: "#features" },
                    { label: "Who it's for", href: "#roles" },
                    { label: "Platform", href: "#platform" },
                    { label: "Get started", href: "#get-started" },
                  ].map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-zinc-500 transition-colors hover:text-violet-600"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                  Portals
                </h3>
                <ul className="space-y-2.5 text-sm">
                  {["Student", "Lecturer", "Registrar"].map((role) => (
                    <li key={role}>
                      <Link
                        to="/auth"
                        className="text-zinc-500 transition-colors hover:text-violet-600"
                      >
                        {role} sign in
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200/70 pt-6 text-xs text-zinc-500 sm:flex-row">
            <p>
              © {new Date().getFullYear()} {settings.siteName}. All rights
              reserved.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]">
              {settings.shortName}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
