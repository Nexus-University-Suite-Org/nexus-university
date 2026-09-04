import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Award,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  FileText,
  Building,
  Users,
  Landmark,
  ChevronDown,
  Coins,
  ListChecks,
  Sparkles,
  Briefcase,
  ShieldCheck,
  School,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend } from "@/lib/backendApi";

interface Program {
  id: number;
  programName: string;
  programCode: string;
  programType: string;
  awardQualification: string;
  programDescription: string;
  programObjectives: string;
  learningOutcomes: string;
  careerOpportunities: string;
  status: string;
  facultySchool: string;
  department: string;
  programCoordinator: string;
  campus: string;
  duration: number;
  durationUnit: string;
  numberOfYears: number;
  numberOfSemesters: number;
  semestersPerYear: number;
  totalCreditUnits: number;
  studyMode: string;
  academicCalendar: string;
  fees: string;
  admissionRequirements: string;
  curriculum: string;
  intakes: string;
  studyOptions: string;
  accreditation: string;
  shotDescription?: string;
  cutoffScore: number;
  minimumUcePasses: number;
  capacity: number;
  intakeYear: string;
}

interface Course {
  code: string;
  name: string;
  credits: number;
  type: string;
  prerequisites?: string;
}

interface RecessTerm {
  name: string;
  courses: Course[];
  electiveGroups?: { groupName: string; requiredCount: number; courses: Course[] }[];
}

interface Semester {
  semester: number;
  courses: Course[];
  electiveGroups?: { groupName: string; requiredCount: number; courses: Course[] }[];
}

interface CurriculumYear {
  year: number;
  semesters: Semester[];
  recessTerms: RecessTerm[];
}

interface Curriculum {
  curriculum_name: string;
  version: string;
  academic_year: string;
  total_credit_units: number;
  years: CurriculumYear[];
}

interface FeeSemester {
  name: string;
  termType: string;
  tuition: number;
  registration: number;
  examination: number;
  functional: number;
  ict: number;
  library: number;
  medical: number;
  accommodation: number;
  other: number;
  total: number;
}

interface FeeYear {
  year: number;
  semesters: FeeSemester[];
}

interface FeeStructure {
  currency: string;
  year_fees: FeeYear[];
}

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function fmtMoney(n: number) {
  if (!n) return "0";
  return n.toLocaleString("en-US");
}

const courseTypeColor = (type: string) => {
  switch ((type || "").toLowerCase()) {
    case "core":
      return "bg-primary/10 text-primary border-primary/20";
    case "elective":
      return "bg-secondary/15 text-secondary border-secondary/30";
    case "audited":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-accent/15 text-accent border-accent/30";
  }
};

export function MyProgrammeTab() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [programError, setProgramError] = useState<string | null>(null);

  const [programmeData, setProgrammeData] = useState({
    totalCredits: 0,
    completedCredits: 0,
    requiredCredits: 120,
    gpa: 0,
    currentYear: 1,
    totalYears: 3,
    coursesCompleted: 0,
    coursesRemaining: 0,
  });

  const [programmeInfo, setProgrammeInfo] = useState({
    name: "Loading...",
    code: "...",
    department: profile?.department || "Loading...",
    college: profile?.college || "Loading...",
    duration: "...",
    duration_years: 3,
    intake: "Loading...",
    expectedGraduation: "...",
    mode: "Full-time",
    campus: "Main Campus",
    coordinator: "",
    awards: "",
  });

  useEffect(() => {
    const fetchProgrammeData = async () => {
      const programmeName = profile?.programme || profile?.department || "";
      try {
        // ---- Resolve the student's programme from NAP (shared program records) ----
        let resolvedProgram: Program | null = null;
        try {
          const programs = (await getBackend<any[]>("/api/v1/programs")) || [];
          const normalized = programmeName.trim().toLowerCase();
          const match =
            programs.find(
              (p: any) =>
                (p.programName || "").toLowerCase() === normalized ||
                (p.programCode || "").toLowerCase() === normalized ||
                (p.programName || "").toLowerCase().includes(normalized) ||
                (p.programCode || "").toLowerCase().includes(normalized),
            ) ||
            programs.find((p: any) => p.status === "Active") ||
            programs[0];

          if (match) {
            const detail = await getBackend<any>(`/api/v1/programs/${match.id}`);
            resolvedProgram = detail && detail.id ? detail : match;
          }
        } catch (err) {
          console.error("Error resolving program:", err);
        }

        if (resolvedProgram) {
          setProgram(resolvedProgram);
          const years = resolvedProgram.numberOfYears || 3;
          const startYear = new Date().getFullYear();
          setProgrammeInfo({
            name: resolvedProgram.programName || programmeName || "Loading...",
            code: resolvedProgram.programCode || "—",
            department: resolvedProgram.department || profile?.department || "—",
            college: resolvedProgram.facultySchool || profile?.college || "—",
            duration: `${years} ${
              resolvedProgram.durationUnit
                ? resolvedProgram.durationUnit.toLowerCase()
                : "years"
            }`,
            duration_years: years,
            intake:
              resolvedProgram.intakeYear ||
              parseIntakeYear(resolvedProgram.intakes) ||
              "Not specified",
            expectedGraduation: `${startYear + years}/${String(
              (startYear + years + 1) % 100,
            ).padStart(2, "0")}`,
            mode: resolvedProgram.studyMode || "Full-time",
            campus: resolvedProgram.campus || "Main Campus",
            coordinator: resolvedProgram.programCoordinator || "—",
            awards: resolvedProgram.awardQualification || resolvedProgram.programType || "—",
          });
          setProgrammeData((prev) => ({ ...prev, totalYears: years }));
        }

        // ---- Keep GPA / progress from grades ----
        let targetCourseId = profile.course_id;
        let resolvedTotalYears = 3;

        if (!targetCourseId && profile.programme) {
          try {
            const courses = await getBackend<any[]>(
              `/api/courses/?name=${encodeURIComponent(profile.programme)}`,
            );
            if (courses.length > 0) targetCourseId = courses[0].id;
          } catch {
            targetCourseId = undefined;
          }
        }

        if (targetCourseId) {
          try {
            const courseData = await getBackend<any>(
              `/api/courses/${targetCourseId}/`,
            );
            const durationYears = courseData.duration_years || 3;
            resolvedTotalYears = durationYears;
            setProgrammeData((prev) => ({
              ...prev,
              totalYears: durationYears || prev.totalYears,
            }));
          } catch {
            // ignore; fall back to program years
          }
        }

        const safeTotalYears = Math.max(1, resolvedTotalYears || 3);

        let requiredCredits = 120;
        if (program?.totalCreditUnits) {
          requiredCredits = program.totalCreditUnits;
        } else if (targetCourseId) {
          try {
            const courseData = await getBackend<any>(
              `/api/courses/${targetCourseId}/`,
            );
            requiredCredits =
              Number(courseData.required_credits) ||
              Number(courseData.total_credits) ||
              120;
          } catch {
            requiredCredits = 120;
          }
        }
        setProgrammeData((prev) => ({ ...prev, requiredCredits }));

        let resultRows: any[] = [];
        try {
          resultRows = await getBackend<any[]>(
            `/api/student-grades/?student_id=${user?.uid}`,
          );
        } catch {
          resultRows = [];
        }

        const courseIds = Array.from(
          new Set(resultRows.map((r: any) => r.course_id).filter(Boolean)),
        );
        const creditMap = new Map<string, number>();

        if (courseIds.length > 0) {
          try {
            const courseUnits = (await getBackend<any[]>("/api/course-units/")) || [];
            courseUnits.forEach((cu: any) => {
              if (courseIds.includes(cu.id)) creditMap.set(cu.id, Number(cu.credits) || 3);
            });
          } catch {
            // ignore
          }
          try {
            const courses = (await getBackend<any[]>("/api/courses/")) || [];
            courses.forEach((c: any) => {
              if (courseIds.includes(c.id) && !creditMap.has(c.id)) {
                creditMap.set(c.id, Number(c.credits) || 3);
              }
            });
          } catch {
            // ignore
          }
        }

        let totalWeightedPoints = 0;
        let totalWeightedCredits = 0;
        let completedCredits = 0;

        resultRows.forEach((row: any) => {
          const credits = creditMap.get(row.course_id) || 3;
          const gp = Number(row.gp ?? row.grade_point ?? 0);
          totalWeightedPoints += gp * credits;
          totalWeightedCredits += credits;
          if (gp > 0) completedCredits += credits;
        });

        const cgpa =
          totalWeightedCredits > 0
            ? Number((totalWeightedPoints / totalWeightedCredits).toFixed(2))
            : 0;

        const coursesCompleted = resultRows.filter(
          (row: any) => Number(row.gp ?? row.grade_point ?? 0) > 0,
        ).length;
        const approxTotalCourses = Math.max(
          coursesCompleted,
          Math.ceil(requiredCredits / 3),
        );
        const coursesRemaining = Math.max(
          0,
          approxTotalCourses - coursesCompleted,
        );
        const currentYear = Math.min(
          safeTotalYears,
          Math.max(
            1,
            Math.ceil(
              (completedCredits / Math.max(1, requiredCredits)) * safeTotalYears,
            ),
          ),
        );

        setProgrammeData((prev) => ({
          ...prev,
          totalCredits: totalWeightedCredits,
          completedCredits,
          requiredCredits,
          gpa: cgpa,
          currentYear,
          coursesCompleted,
          coursesRemaining,
        }));
      } catch (error) {
        console.error("Error fetching programme data:", error);
        setProgramError(
          "We couldn't load all programme details. Showing what's available.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProgrammeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user?.uid]);

  const curriculum = useMemo<Curriculum | null>(
    () => (program ? parseJson<Curriculum | null>(program.curriculum, null) : null),
    [program],
  );

  const fees = useMemo<FeeStructure | null>(
    () => (program ? parseJson<FeeStructure | null>(program.fees, null) : null),
    [program],
  );

  const admissionRequirements = useMemo(() => {
    if (!program?.admissionRequirements) return null;
    return parseJson<Record<string, string> | null>(program.admissionRequirements, null);
  }, [program]);

  const progressPercentage =
    (programmeData.completedCredits / programmeData.requiredCredits) * 100 || 0;

  const yearCredits = useMemo(() => {
    if (!curriculum?.years) return [];
    return curriculum.years.map((y) => {
      const courses = [
        ...y.semesters.flatMap((s) => s.courses || []),
        ...(y.recessTerms || []).flatMap((r) => r.courses || []),
      ];
      const credits = courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
      return { year: y.year, count: courses.length, credits };
    });
  }, [curriculum]);

  const totalCreditUnits = program?.totalCreditUnits || curriculum?.total_credit_units || 0;
  const curriculumYears = curriculum?.years || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 p-10 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your programme…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Programme Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-transparent to-secondary/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl" />
          <CardContent className="pt-6 relative">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">{programmeInfo.name}</h2>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline">{programmeInfo.code}</Badge>
                    <Badge variant="secondary">{programmeInfo.mode}</Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-0">
                      Active
                    </Badge>
                    {program?.programType && (
                      <Badge variant="outline">{program.programType}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {programmeInfo.department} • {programmeInfo.college}
                  </p>
                  {programmeInfo.coordinator !== "—" && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Programme Coordinator:{" "}
                      {programmeInfo.coordinator}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                  <p className="text-3xl font-bold text-primary">
                    {programmeData.gpa}
                  </p>
                  <p className="text-xs text-muted-foreground">Current CGPA</p>
                </div>
                <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm">
                  <p className="text-3xl font-bold text-secondary">
                    Year {programmeData.currentYear}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of {programmeData.totalYears}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {programError && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          {programError}
        </div>
      )}

      {/* Programme summary chips */}
      {program && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              icon: Award,
              label: "Qualification",
              value: programmeInfo.awards,
            },
            {
              icon: Building,
              label: "Campus",
              value: programmeInfo.campus,
            },
            {
              icon: Calendar,
              label: "Academic Calendar",
              value: program.academicCalendar || "—",
            },
            {
              icon: Landmark,
              label: "Credit Units",
              value: totalCreditUnits ? `${totalCreditUnits} CU` : "—",
            },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="border-border/60 shadow-sm text-center">
                <CardContent className="pt-6">
                  <item.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Degree Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Degree Progress
            </CardTitle>
            <CardDescription>Track your journey to graduation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Credit Completion</span>
                <span className="text-sm text-muted-foreground">
                  {programmeData.completedCredits} / {programmeData.requiredCredits}{" "}
                  credits
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {progressPercentage.toFixed(0)}% of total credits completed
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Course Completion</span>
                <span className="text-sm text-muted-foreground">
                  {programmeData.coursesCompleted} /{" "}
                  {programmeData.coursesCompleted + programmeData.coursesRemaining}{" "}
                  courses
                </span>
              </div>
              <Progress
                value={
                  (programmeData.coursesCompleted /
                    (programmeData.coursesCompleted +
                      programmeData.coursesRemaining)) *
                  100
                }
                className="h-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Expected Graduation</p>
                <p className="font-semibold text-sm">
                  {programmeInfo.expectedGraduation}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50">
                <Clock className="h-5 w-5 mx-auto mb-2 text-secondary" />
                <p className="text-xs text-muted-foreground">Total Duration</p>
                <p className="font-semibold text-sm">{programmeInfo.duration}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programme snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <School className="h-5 w-5 text-secondary" />
              Programme Snapshot
            </CardTitle>
            <CardDescription>Overview of your enrolled programme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: Building, label: "Faculty / School", value: programmeInfo.college },
              { icon: Landmark, label: "Department", value: programmeInfo.department },
              { icon: Calendar, label: "Intake", value: programmeInfo.intake },
              { icon: Clock, label: "Duration", value: programmeInfo.duration },
              { icon: Users, label: "Mode", value: programmeInfo.mode },
              { icon: GraduationCap, label: "Qualification", value: programmeInfo.awards },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <row.icon className="h-4 w-4" /> {row.label}
                </span>
                <span className="text-sm font-medium text-right">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Curriculum / Course Units */}
      {curriculumYears.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Curriculum & Course Units
              </CardTitle>
              <CardDescription>
                {curriculum?.curriculum_name || "Curriculum"} •{" "}
                {program?.academicCalendar || "Semester"} structure
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {curriculumYears.length} Year{(curriculumYears.length || 1) > 1 ? "s" : ""}
              </Badge>
              {totalCreditUnits > 0 && (
                <Badge variant="outline">{totalCreditUnits} Credit Units</Badge>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-4 sm:p-6">
            <Accordion type="single" collapsible className="space-y-3">
              {curriculumYears.map((yr) => {
                const yc = yearCredits.find((y) => y.year === yr.year);
                const semesters = yr.semesters || [];
                return (
                  <AccordionItem
                    key={yr.year}
                    value={`year-${yr.year}`}
                    className="border rounded-xl overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <span className="flex items-center gap-3 w-full">
                        <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center font-bold">
                          Y{yr.year}
                        </span>
                        <span className="flex-1">
                          <span className="font-semibold">
                            Year {yr.year}
                            {yr.year === Math.min(...curriculumYears.map((y) => y.year))
                              ? " — Foundation"
                              : yr.year === Math.max(...curriculumYears.map((y) => y.year))
                                ? " — Final Year"
                                : ""}
                          </span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {semesters.length} Semester{(semesters.length || 1) > 1 ? "s" : ""}
                            {yc ? ` • ${yc.count} units • ${yc.credits} credits` : ""}
                          </span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4">
                        {semesters.map((sem) => {
                          const courses = sem.courses || [];
                          return (
                            <div key={sem.semester}>
                              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <span className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                                  {sem.semester}
                                </span>
                                Semester {sem.semester}
                                <span className="text-xs text-muted-foreground font-normal">
                                  • {courses.length} courses
                                </span>
                              </p>
                              <div className="grid gap-2">
                                {courses.map((c) => (
                                  <div
                                    key={`${sem.semester}-${c.code}`}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <Badge
                                        variant="outline"
                                        className="font-mono text-[11px] shrink-0"
                                      >
                                        {c.code || "—"}
                                      </Badge>
                                      <span className="text-sm font-medium truncate">
                                        {c.name || "Unnamed course"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {c.type && (
                                        <Badge
                                          className={cn(
                                            "text-[10px] capitalize",
                                            courseTypeColor(c.type),
                                          )}
                                        >
                                          {c.type}
                                        </Badge>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {Number(c.credits) || 0} CU
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {courses
                                .filter((cu) => cu.prerequisites)
                                .map((cu) => (
                                  <div
                                    key={`${sem.semester}-prereq-${cu.code}`}
                                    className="mt-1 pl-14 text-xs text-muted-foreground"
                                  >
                                    Prerequisites for{" "}
                                    <span className="font-mono">{cu.code}</span>:{" "}
                                    {cu.prerequisites}
                                  </div>
                                ))}
                            </div>
                          );
                        })}

                        {(yr.recessTerms || []).length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Briefcase className="h-4 w-4" /> Recess Terms
                            </p>
                            {(yr.recessTerms || []).map((rt) => (
                              <div key={rt.name} className="mb-2">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {rt.name}
                                </p>
                                <div className="grid gap-2">
                                  {(rt.courses || []).map((c) => (
                                    <div
                                      key={`${rt.name}-${c.code}`}
                                      className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 px-3 py-2"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <Badge
                                          variant="outline"
                                          className="font-mono text-[11px] shrink-0"
                                        >
                                          {c.code || "—"}
                                        </Badge>
                                        <span className="text-sm font-medium truncate">
                                          {c.name || "Unnamed course"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {c.type && (
                                          <Badge
                                            className={cn(
                                              "text-[10px] capitalize",
                                              courseTypeColor(c.type),
                                            )}
                                          >
                                            {c.type}
                                          </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                          {Number(c.credits) || 0} CU
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Fees */}
      {fees && fees.year_fees && fees.year_fees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-500" />
              Tuition & Fees
            </CardTitle>
            <CardDescription>
              {fees.currency || "UGX"} tuition structure by year
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-4 sm:p-6 space-y-4">
            <Accordion type="single" collapsible className="space-y-3">
              {fees.year_fees.map((fy) => (
                <AccordionItem
                  key={fy.year}
                  value={`fees-${fy.year}`}
                  className="border rounded-xl overflow-hidden"
                >
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <span className="flex items-center gap-3 w-full">
                      <span className="text-sm font-semibold">Year {fy.year}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {fy.semesters
                          .reduce((s, sem) => s + (Number(sem.total) || 0), 0)
                          .toLocaleString()}{" "}
                        {fees.currency}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground border-b">
                            <th className="py-2 pr-4">Term</th>
                            <th className="py-2 pr-4">Tuition</th>
                            <th className="py-2 pr-4">Functional</th>
                            <th className="py-2 pr-4">Other</th>
                            <th className="py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fy.semesters.map((sem) => (
                            <tr key={sem.name} className="border-b border-border/40">
                              <td className="py-2 pr-4 font-medium">{sem.name}</td>
                              <td className="py-2 pr-4">{fmtMoney(sem.tuition)}</td>
                              <td className="py-2 pr-4">{fmtMoney(sem.functional)}</td>
                              <td className="py-2 pr-4">
                                {fmtMoney(
                                  (sem.registration || 0) +
                                    (sem.examination || 0) +
                                    (sem.ict || 0) +
                                    (sem.library || 0) +
                                    (sem.medical || 0) +
                                    (sem.accommodation || 0) +
                                    (sem.other || 0),
                                )}
                              </td>
                              <td className="py-2 text-right font-semibold">
                                {fmtMoney(sem.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Descriptions / Outcomes / Requirements */}
      {(program?.programDescription ||
        program?.learningOutcomes ||
        program?.programObjectives ||
        program?.careerOpportunities ||
        admissionRequirements) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {program?.programDescription && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  About This Programme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {program.programDescription}
                </p>
                {program?.programObjectives && (
                  <>
                    <Separator className="my-4" />
                    <ListChecks className="h-4 w-4 inline text-primary mb-2" />
                    <p className="text-sm font-semibold mb-2">Programme Objectives</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {program.programObjectives}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {program?.learningOutcomes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                  What You'll Learn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {program.learningOutcomes}
                </p>
                {program?.careerOpportunities && (
                  <>
                    <Separator className="my-4" />
                    <Briefcase className="h-4 w-4 inline text-primary mb-2" />
                    <p className="text-sm font-semibold mb-2">Career Opportunities</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {program.careerOpportunities}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {admissionRequirements && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  Admission Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                {Object.entries(admissionRequirements).map(([key, value]) => {
                  const label = key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-border/60 p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1.5">
                        {label}
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {value}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Programme Milestones based on curriculum */}
      {yearCredits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Programme Milestones
            </CardTitle>
            <CardDescription>Your academic journey through the years</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-muted" />
              <div className="space-y-6">
                {yearCredits.map((yc, i) => {
                  const year = yc.year;
                  let name = "Development Phase";
                  if (year === 1) name = "Foundation Year";
                  else if (year === curriculumYears.length) name = "Final Year";
                  else if (year === curriculumYears.length - 1) name = "Specialization";

                  let status: "completed" | "current" | "upcoming" = "upcoming";
                  if (year < programmeData.currentYear) status = "completed";
                  else if (year === programmeData.currentYear) status = "current";

                  return (
                    <motion.div
                      key={year}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative flex gap-4"
                    >
                      <div
                        className={cn(
                          "relative z-10 h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0",
                          status === "completed"
                            ? "bg-emerald-500 text-white"
                            : status === "current"
                              ? "bg-gradient-to-br from-primary to-secondary text-white"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        <span className="text-lg font-bold">Y{year}</span>
                      </div>
                      <div
                        className={cn(
                          "flex-1 p-4 rounded-xl",
                          status === "current"
                            ? "bg-primary/10 border-2 border-primary/20"
                            : "bg-muted/50",
                        )}
                      >
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{name}</h4>
                            <Badge
                              className={cn(
                                status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : status === "current"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground",
                              )}
                            >
                              {status === "completed"
                                ? "Completed"
                                : status === "current"
                                  ? "In Progress"
                                  : "Upcoming"}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {yc.year} course units
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" /> {yc.count} Courses
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" /> {yc.credits} Credits
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer programme details */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building, label: "Campus", value: programmeInfo.campus },
          { icon: Calendar, label: "Intake", value: programmeInfo.intake },
          { icon: Clock, label: "Duration", value: programmeInfo.duration },
          { icon: Users, label: "Mode", value: programmeInfo.mode },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="pt-6 text-center">
                <item.icon className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function parseIntakeYear(intakesJson: string | null | undefined): string | null {
  const arr = parseJson<Array<{ academic_year?: string; month?: string } | null> | null>(
    intakesJson,
    null,
  );
  if (arr.length > 0) {
    const valid = arr.find((i) => i && (i.academic_year || i.month));
    if (valid) return valid.academic_year || valid.month || null;
  }
  return null;
}
