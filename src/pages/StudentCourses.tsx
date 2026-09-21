import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Layers,
  Calendar,
  Clock,
  Library,
  RefreshCw,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  enrollInUnit,
  fetchAllUnits,
  fetchEnrolledCourses,
} from "@/lib/contentApi";
import type { CourseUnit } from "@/types/course";

const MAX_CREDITS = 24;

function semesterKey(unit: CourseUnit): string | null {
  return unit.year != null && unit.semester != null
    ? `${unit.year}-${unit.semester}`
    : null;
}

interface SemesterInfo {
  year: number;
  semester: number;
}

export default function StudentCourses() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [enrolled, setEnrolled] = useState<CourseUnit[]>([]);
  const [allUnits, setAllUnits] = useState<CourseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<SemesterInfo | null>(
    null,
  );

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [mine, all] = await Promise.all([
        fetchEnrolledCourses(user.uid),
        fetchAllUnits(),
      ]);
      setEnrolled(mine);
      setAllUnits(all);
    } catch {
      setEnrolled([]);
      setAllUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const programmeName = useMemo(() => {
    if (enrolled.length > 0) {
      return enrolled[0].courseName;
    }
    if (profile?.programme) {
      const match = allUnits.find(
        (u) => u.courseName.toLowerCase() === profile.programme!.toLowerCase(),
      );
      if (match) return match.courseName;
    }
    const names = new Set(allUnits.map((u) => u.courseName));
    return names.size === 1 ? [...names][0] : null;
  }, [enrolled, allUnits, profile?.programme]);

  const programUnits = useMemo(
    () =>
      programmeName
        ? allUnits.filter(
            (u) =>
              u.courseName.toLowerCase() === programmeName.toLowerCase(),
          )
        : allUnits,
    [allUnits, programmeName],
  );

  const semesters = useMemo(() => {
    const seen = new Map<string, SemesterInfo>();
    programUnits.forEach((u) => {
      if (u.year == null || u.semester == null) return;
      seen.set(`${u.year}-${u.semester}`, {
        year: u.year,
        semester: u.semester,
      });
    });
    return [...seen.values()].sort(
      (a, b) => a.year - b.year || a.semester - b.semester,
    );
  }, [programUnits]);

  const enrolledIds = useMemo(() => new Set(enrolled.map((u) => u.id)), [enrolled]);

  const activeSemester = useMemo(() => {
    if (selectedSemester) return selectedSemester;
    if (semesters.length === 0) return null;
    const enrolledCount = new Map<string, number>();
    enrolled.forEach((u) => {
      const key = semesterKey(u);
      if (key) enrolledCount.set(key, (enrolledCount.get(key) || 0) + 1);
    });
    let best = semesters[0];
    let bestScore = -1;
    semesters.forEach((s) => {
      const score =
        enrolledCount.get(`${s.year}-${s.semester}`) || -1;
      if (
        score > bestScore ||
        (score === bestScore &&
          (s.year > best.year ||
            (s.year === best.year && s.semester > best.semester)))
      ) {
        best = s;
        bestScore = score;
      }
    });
    return best;
  }, [selectedSemester, semesters, enrolled]);

  const semesterUnits = useMemo(
    () =>
      activeSemester
        ? programUnits.filter(
            (u) =>
              u.year === activeSemester.year &&
              u.semester === activeSemester.semester,
          )
        : [],
    [programUnits, activeSemester],
  );

  const enrolledInSemester = useMemo(
    () =>
      activeSemester
        ? enrolled.filter(
            (u) =>
              u.year === activeSemester.year &&
              u.semester === activeSemester.semester,
          )
        : [],
    [enrolled, activeSemester],
  );

  const totalCredits = enrolledInSemester.reduce(
    (sum, u) => sum + (u.credits || 0),
    0,
  );
  const pendingEnrollment = semesterUnits.some((u) => !enrolledIds.has(u.id));

  const handleEnroll = async (unit: CourseUnit) => {
    if (!user) return;
    setEnrollingId(unit.id);
    try {
      await enrollInUnit(user.uid, unit.id);
      await load();
      toast({
        title: "Enrolled",
        description: `You are now enrolled in ${unit.code}`,
      });
    } catch (error) {
      toast({
        title: "Could not enroll",
        description:
          (error as Error).message || "There was an error enrolling.",
        variant: "destructive",
      });
    } finally {
      setEnrollingId(null);
    }
  };

  const stats = [
    {
      label: "Selected Semester",
      value: activeSemester
        ? `Semester ${activeSemester.semester}, ${activeSemester.year}`
        : "—",
      icon: Calendar,
      bg: "bg-primary/10",
      color: "text-primary",
    },
    {
      label: "Enrolled Courses",
      value: String(enrolledInSemester.length),
      icon: BookOpen,
      bg: "bg-secondary/10",
      color: "text-secondary",
    },
    {
      label: "Credit Load",
      value: `${totalCredits} / ${MAX_CREDITS}`,
      icon: FileText,
      bg: "bg-accent/10",
      color: "text-accent",
    },
    {
      label: "Registration Status",
      value: enrolledInSemester.length > 0 ? "Complete" : "Not Registered",
      icon: pendingEnrollment ? Clock : CheckCircle2,
      bg: pendingEnrollment ? "bg-amber-500/10" : "bg-emerald-500/10",
      color: pendingEnrollment ? "text-amber-600" : "text-emerald-600",
    },
  ];

  const statusColor =
    enrolledInSemester.length > 0
      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
      : pendingEnrollment
        ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
        : "text-muted-foreground bg-muted border-muted";

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />

      <main className="container mx-auto px-4 pb-24 pt-8 md:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Library className="h-4 w-4" />
              <span>Course Materials</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold">My Courses</h1>
            <p className="text-sm text-muted-foreground">
              {programmeName
                ? `Course units for ${programmeName} — your registered semester`
                : "Course units for your registered semester."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </motion.div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="pt-6">
                      <div
                        className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}
                      >
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Semester selector */}
            <Card className="mt-8">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
                  <span>Registered Semester</span>
                  <Badge className={statusColor}>{programmeName || "Program"}</Badge>
                </CardTitle>
                <CardDescription>
                  {profile?.programme
                    ? `Showing units for ${profile.programme.replace(
                        /^Bachelor\s+(of\s+|)/i,
                        "",
                      )}`
                    : "Select the semester to view its course units"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {semesters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No course units are available for your program yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={
                          activeSemester
                            ? String(activeSemester.semester)
                            : undefined
                        }
                        onValueChange={(v) =>
                          activeSemester &&
                          setSelectedSemester({
                            year: activeSemester.year,
                            semester: parseInt(v),
                          })
                        }
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {semesters.map((s) => (
                            <SelectItem
                              key={`sem-${s.semester}`}
                              value={String(s.semester)}
                            >
                              Semester {s.semester}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={
                          activeSemester ? String(activeSemester.year) : undefined
                        }
                        onValueChange={(v) =>
                          activeSemester &&
                          setSelectedSemester({
                            year: parseInt(v),
                            semester: activeSemester.semester,
                          })
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {semesters.map((s) => (
                            <SelectItem
                              key={`year-${s.year}`}
                              value={String(s.year)}
                            >
                              Year {s.year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Units for the selected semester */}
            <section className="mt-8">
              <div className="mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {activeSemester
                    ? `Course Units — Semester ${activeSemester.semester}, Year ${activeSemester.year}`
                    : "Course Units"}
                </h2>
                <Badge variant="outline">{semesterUnits.length} Units</Badge>
              </div>

              {semesterUnits.length === 0 ? (
                <Card className="p-8 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-3 text-base font-semibold">
                    No course units found
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No units are available for the selected semester.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {semesterUnits.map((unit, i) => {
                    const isEnrolled = enrolledIds.has(unit.id);
                    return (
                      <motion.div
                        key={unit.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card
                          className={`h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                            isEnrolled ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""
                          }`}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                                  isEnrolled
                                    ? "bg-emerald-500/15 text-emerald-600"
                                    : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                                }`}
                              >
                                <BookOpen className="h-5 w-5" />
                              </div>
                              {isEnrolled ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Enrolled
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Not enrolled</Badge>
                              )}
                            </div>
                            <CardTitle className="mt-3 text-lg leading-tight">
                              {unit.name}
                            </CardTitle>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">{unit.code}</Badge>
                              <Badge variant="outline">
                                {unit.credits != null
                                  ? `${unit.credits} credits`
                                  : unit.courseCode}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {unit.description ||
                                `${unit.courseName} · Semester ${unit.semester} Year ${unit.year}`}
                            </p>
                            {isEnrolled ? (
                              <Button asChild size="sm" className="w-full">
                                <Link to={`/courses/${unit.id}`}>
                                  <Layers className="mr-2 h-4 w-4" />
                                  View content
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => handleEnroll(unit)}
                                disabled={enrollingId === unit.id}
                              >
                                {enrollingId === unit.id
                                  ? "Enrolling…"
                                  : "Enroll"}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Enrolled this semester */}
            {enrolledInSemester.length > 0 && (
              <section className="mt-10">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold">
                    My Registered Courses ({enrolledInSemester.length})
                  </h2>
                </div>
                <div className="space-y-3">
                  {enrolledInSemester.map((unit, i) => (
                    <motion.div
                      key={unit.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardContent className="flex items-center justify-between gap-4 p-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {unit.code}
                                </Badge>
                                <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                                  Enrolled
                                </Badge>
                              </div>
                              <p className="font-medium truncate">{unit.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {unit.credits != null
                                  ? `${unit.credits} credits · Semester ${activeSemester?.semester} Year ${activeSemester?.year}`
                                  : `Semester ${activeSemester?.semester} Year ${activeSemester?.year}`}
                              </p>
                            </div>
                          </div>
                          <Button asChild variant="ghost" size="sm" className="flex-shrink-0">
                            <Link to={`/courses/${unit.id}`}>Open</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <StudentBottomNav />
    </div>
  );
}