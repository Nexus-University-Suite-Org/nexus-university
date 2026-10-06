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
 * Accent rotation for the capability tiles. Each tone is mapped to the
 * feature area it represents so the cards feel section-aware and lively.
 */
const TONES = [
  { soft: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/80", solid: "group-hover:bg-violet-600", card: "border-violet-200/80 bg-white/80 hover:border-violet-300 hover:bg-violet-50/40" },
  { soft: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80", solid: "group-hover:bg-amber-500", card: "border-amber-200/80 bg-white/80 hover:border-amber-300 hover:bg-amber-50/40" },
  { soft: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 group-hover:text-white", solid: "group-hover:bg-emerald-600", card: "border-emerald-200/80 bg-white/80 hover:border-emerald-300 hover:bg-emerald-50/40" },
  { soft: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80", solid: "group-hover:bg-sky-600", card: "border-sky-200/80 bg-white/80 hover:border-sky-300 hover:bg-sky-50/40" },
  { soft: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80", solid: "group-hover:bg-rose-600", card: "border-rose-200/80 bg-white/80 hover:border-rose-300 hover:bg-rose-50/40" },
  { soft: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80", solid: "group-hover:bg-indigo-600", card: "border-indigo-200/80 bg-white/80 hover:border-indigo-300 hover:bg-indigo-50/40" },
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
        to={profile?.role === "registrar" ? "/registrar" : "/dashboard"}
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
      className="h-12 rounded-full bg-gradient-to-r from-[#c4e3b9] via-[#b4dca7] to-[#9fcc8f] px-9 text-base font-semibold text-[#204734] shadow-[0_18px_38px_rgba(126,180,125,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(126,180,125,0.28)]"
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
    <div className="min-h-screen bg-[#f7f8f4]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
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
              className="absolute inset-0 h-full w-full object-cover object-center opacity-[1] saturate-[1.1] contrast-[1.12] brightness-[0.7]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,20,35,0.78)_0%,rgba(17,31,41,0.68)_35%,rgba(17,31,41,0.44)_55%,rgba(17,31,41,0.7)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(74,222,128,0.18),transparent_28%),radial-gradient(circle_at_85%_28%,rgba(253,230,138,0.12),transparent_20%)]" />
            <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.22]" style={{
              backgroundImage:
                "radial-gradient(hsl(0 0% 100%/0.7) 0.6px, transparent 0.6px)",
              backgroundSize: "28px 28px",
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
                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#edf9f2] shadow-[0_10px_30px_rgba(16,35,28,0.22)] backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-[#d7f7cf]" />
                  <span>One portal. Every academic need.</span>
                </div>

                <h1 className="mx-auto mb-6 max-w-5xl text-[2.6rem] font-black leading-[0.94] tracking-[-0.055em] text-white drop-shadow-[0_3px_20px_rgba(2,6,23,0.5)] sm:text-[3.8rem] md:text-[4.8rem] lg:text-[5.25rem]">
                  <span className="block">Run your whole</span>
                  <span className="mt-2 block bg-gradient-to-r from-[#fefefe] via-[#dff8e7] to-[#b7e6b5] bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
                    university
                  </span>
                  <span className="mt-2 block -rotate-1 bg-gradient-to-r from-[#f8eec4] via-[#f9d36d] to-[#f3b74f] bg-clip-text font-serif italic text-transparent drop-shadow-[0_12px_20px_rgba(0,0,0,0.18)]">
                    life
                  </span>
                </h1>

                <p className="mx-auto mb-8 max-w-3xl text-base font-medium leading-relaxed text-slate-100/95 drop-shadow-[0_1px_12px_rgba(15,23,42,0.72)] sm:text-lg md:text-xl">
                  Register for courses, pay fees, submit assignments, and
                  check your results — without the queues, the paperwork, or
                  the guesswork.
                </p>

                <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  {primaryCta}
                  {secondaryCta}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/15 pt-8 sm:gap-6 lg:grid-cols-4 lg:gap-8">
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
          className="scroll-mt-20 border-t border-[#e7efe5] bg-[#f5faf4] py-24"
        >
          <div className="container">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <span className="mb-4 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#5a8e69]">
                Capabilities
              </span>
              <h2 className="mx-auto mb-5 max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.05em] text-[#111827] md:text-5xl lg:text-[4rem]">
                Everything the academic year throws at you,
                <span className="block">in one place</span>
              </h2>
              <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-gradient-to-r from-[#b2d7a0] to-[#7bb27d]" />
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
                    className={`group rounded-2xl border p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.04)] ${tone.card}`}
                  >
                    <div
                      className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${tone.soft} ${tone.solid} transition-all duration-300 group-hover:scale-105 group-hover:text-white`}
                    >
                      <feature.icon className="h-6 w-6 text-current" />
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
          className="relative isolate flex min-h-[560px] scroll-mt-20 items-center overflow-hidden bg-emerald-950"
        >
          <img
            src="/images/campus-students.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/85 to-emerald-950/60"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-emerald-950/70 via-transparent to-emerald-950/40"
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
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                  Built around your week
                </span>
                <h2 className="mb-6 font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
                  Less admin. More time for the actual learning.
                </h2>
                <p className="mb-10 max-w-xl text-lg font-medium leading-relaxed text-emerald-50/90">
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
                      className="flex gap-4 rounded-2xl border border-white/20 bg-white/12 p-5 shadow-[0_18px_36px_rgba(4,9,20,0.15)] backdrop-blur-md transition-colors hover:border-emerald-300/40 hover:bg-white/15"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                      <div>
                        <h3 className="mb-1 text-base font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                          {point.title}
                        </h3>
                        <p className="text-sm font-medium leading-relaxed text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
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
          className="scroll-mt-20 border-y border-[#e7efe5] bg-[#f3f8f1] py-24"
        >
          <div className="container">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
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
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group flex flex-col rounded-[28px] border border-[#dfeee0] bg-[#f8fdf7] p-7 shadow-[0_18px_40px_rgba(76,118,82,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#cfe7d3] hover:shadow-[0_22px_50px_rgba(118,161,119,0.12)]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dff6d8] via-[#cfecc3] to-[#b7dfae] text-[#244d3d] shadow-[0_12px_26px_rgba(132,182,122,0.2)] transition-transform duration-300 group-hover:scale-110">
                    <role.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2.5 font-display text-xl font-bold tracking-tight text-[#111827]">
                    {role.title}
                  </h3>
                  <p className="mb-6 flex-1 text-sm font-medium leading-relaxed text-zinc-600">
                    {role.desc}
                  </p>
                  <ul className="space-y-2.5 border-t border-[#e4efe2] pt-5">
                    {role.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-2.5 text-sm font-medium text-zinc-700"
                      >
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#79b27e]" />
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
            <div className="relative isolate mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-emerald-100 bg-[radial-gradient(circle_at_top,_rgba(236,253,245,0.96),_rgba(255,255,255,0.96)_35%,_rgba(245,250,247,1)_100%)] px-6 py-16 text-center shadow-[0_25px_80px_rgba(16,42,31,0.08)] md:px-14 md:py-20">
              <div className="absolute inset-0 opacity-80" aria-hidden="true">
                <div className="absolute -left-14 top-8 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl" />
                <div className="absolute -right-10 bottom-6 h-44 w-44 rounded-full bg-lime-200/40 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(rgba(16,185,129,0.12)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />
              </div>

              <div className="relative z-10">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-white/80 shadow-[0_16px_32px_rgba(16,185,129,0.12)] backdrop-blur-sm">
                  <LayoutGrid className="h-7 w-7 text-emerald-600" />
                </div>

                <div className="mb-4 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                  Start your journey
                </div>

                <h2 className="mb-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-[#111827] md:text-5xl">
                  Your next semester starts here
                </h2>
                <p className="mx-auto mb-9 max-w-2xl text-base font-light leading-relaxed text-zinc-600 md:text-lg">
                  Create an account with your registration details and get
                  access to your courses, results, and fees straight away.
                </p>
                <Button
                  size="lg"
                  asChild
                  className="h-14 rounded-full bg-gradient-to-r from-[#eaf8ea] via-[#e0f3df] to-[#d7f0d1] px-8 text-base font-semibold text-[#183d32] shadow-[0_18px_30px_rgba(122,168,123,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_36px_rgba(122,168,123,0.25)]"
                >
                  <Link to="/auth" className="inline-flex items-center">
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
      <footer className="border-t border-[#dfeee1] bg-[linear-gradient(180deg,#edf8ee_0%,#edf7ef_100%)] py-10 sm:py-12 lg:py-14">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm md:max-w-xs">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#a9d8a2] to-[#6ea66f] text-[#123228] shadow-[0_10px_20px_rgba(110,166,111,0.2)]">
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
                <span className="font-display text-lg font-bold tracking-tight text-[#173b33]">
                  {settings.siteName}
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-[#3a4b43]">
                {settings.tagline}
              </p>
              {settings.supportEmail && (
                <a
                  href={`mailto:${settings.supportEmail}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#355d49] transition-colors hover:text-[#224e3f]"
                >
                  <Mail className="h-4 w-4" />
                  {settings.supportEmail}
                </a>
              )}
            </div>

            <div className="flex w-full max-w-xl flex-col gap-8 sm:flex-row sm:justify-between lg:justify-end lg:gap-16">
              <div>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3f5f52]">
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
                        className="font-medium text-[#4a5f57] transition-colors hover:text-[#1d473d]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3f5f52]">
                  Portals
                </h3>
                <ul className="space-y-2.5 text-sm">
                  {["Student", "Lecturer", "Registrar"].map((role) => (
                    <li key={role}>
                      <Link
                        to="/auth"
                        className="font-medium text-[#4a5f57] transition-colors hover:text-[#1d473d]"
                      >
                        {role} sign in
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[#cfe2d0] pt-5 text-xs text-[#496559] sm:flex-row sm:items-center">
            <p>
              © {new Date().getFullYear()} {settings.siteName}. All rights
              reserved.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#295241]">
              {settings.shortName}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
