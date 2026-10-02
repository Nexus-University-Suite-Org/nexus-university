import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  GraduationCap,
  Download,
  Printer,
  Search,
  X,
  Loader2,
  Check,
  Ban,
  Sparkles,
} from "lucide-react";
import { getEnrollmentShareUrl, generateQRCodeDataUrl } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBackend,
  getMessagingBackend,
  postMessagingBackend,
} from "@/lib/backendApi";
import { Link } from "react-router-dom";

interface Program {
  id: number;
  programName: string;
  programCode: string;
  curriculum: string;
  [key: string]: any;
}

interface Course {
  code: string;
  name: string;
  credits: number;
  type: string;
  prerequisites?: string;
}

interface Semester {
  semester: number;
  courses: Course[];
}

interface CurriculumYear {
  year: number;
  semesters: Semester[];
}

interface Curriculum {
  curriculum_name: string;
  version: string;
  academic_year: string;
  total_credit_units: number;
  years: CurriculumYear[];
}

interface Enrollment {
  id: string;
  status: string;
  enrolled_at: string;
  grade: number | null;
  paper_type: string;
  course: {
    code: string;
    title: string;
    credits: number;
    semester: string;
    year: number;
  };
}

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

const SEMESTERS = [1, 2];
const YEARS_OF_STUDY = [1, 2, 3, 4, 5];
const ACADEMIC_YEARS = [2024, 2025, 2026, 2027];
const MIN_CREDITS = 12;
const MAX_CREDITS = 24;

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

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "rejected":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function EnrollmentRegistrationTab() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);

  const [fees, setFees] = useState<any[]>([]);
  const [paymentPercentage, setPaymentPercentage] = useState(0);

  const [academicYear, setAcademicYear] = useState(2026);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedYearOfStudy, setSelectedYearOfStudy] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [paperTypes, setPaperTypes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProgram();
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchEnrollments();
      fetchPaymentData();
    }
  }, [user]);

  const fetchProgram = async () => {
    try {
      setLoading(true);
      const programmeName = profile?.programme || profile?.department || "";
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
        setProgram(detail && detail.id ? detail : match);
      }
    } catch (error) {
      console.error("Error fetching program:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      if (!user) return;
      setLoadingEnrollments(true);
      const enrollmentDocs = await getMessagingBackend<any[]>(
        `/api/enrollments/?student_id=${user.uid}`,
      );

      if (!enrollmentDocs || enrollmentDocs.length === 0) {
        setEnrollments([]);
        return;
      }

      const enrollmentData = enrollmentDocs.map((e: any) => ({
        ...e,
        course: e.course
          ? {
              code: e.course.code,
              title: e.course.title,
              credits: e.course.credits,
              semester: e.course.semester,
              year: e.course.year || 0,
            }
          : {
              code: "N/A",
              title: "N/A",
              credits: 0,
              semester: "N/A",
              year: 0,
            },
      }));

      setEnrollments(enrollmentData as Enrollment[]);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const fetchPaymentData = async () => {
    try {
      if (!user) return;
      const feesData = await getBackend<any[]>(
        `/api/v1/student-fees?studentId=${user.uid}`,
      );
      if (feesData && feesData.length > 0) {
        setFees(feesData);
        const totalOwed = feesData.reduce(
          (sum: number, fee: any) => sum + (fee.amount || 0),
          0,
        );
        const totalPaid = feesData.reduce(
          (sum: number, fee: any) => sum + (fee.paidAmount || 0),
          0,
        );
        const percentage = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;
        setPaymentPercentage(percentage);
      }
    } catch (error) {
      console.error("Error fetching payment data:", error);
    }
  };

  const curriculum = useMemo<Curriculum | null>(
    () =>
      program ? parseJson<Curriculum | null>(program.curriculum, null) : null,
    [program],
  );

  const semesterCourses = useMemo(() => {
    if (!curriculum?.years) return [];
    const allCourses: (Course & { year: number })[] = [];
    for (const year of curriculum.years) {
      if (year.year !== selectedYearOfStudy) continue;
      for (const sem of year.semesters || []) {
        if (sem.semester === selectedSemester) {
          for (const course of sem.courses || []) {
            allCourses.push({ ...course, year: year.year });
          }
        }
      }
    }
    return allCourses;
  }, [curriculum, selectedSemester, selectedYearOfStudy]);

  const filteredCourses = useMemo(() => {
    if (!searchQuery) return semesterCourses;
    const q = searchQuery.toLowerCase();
    return semesterCourses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [semesterCourses, searchQuery]);

  const existingEnrollmentMap = useMemo(() => {
    const map: Record<string, string> = {};
    enrollments.forEach((e) => {
      map[e.course?.code || ""] = e.status;
    });
    return map;
  }, [enrollments]);

  const currentSemesterEnrollments = useMemo(
    () =>
      enrollments.filter(
        (e) =>
          e.course?.year === academicYear &&
          String(e.course?.semester).includes(String(selectedSemester)),
      ),
    [enrollments, academicYear, selectedSemester],
  );

  const allYearEnrollments = useMemo(
    () => enrollments.filter((e) => e.course?.year === academicYear),
    [enrollments, academicYear],
  );

  const enrolledCredits = currentSemesterEnrollments.reduce(
    (sum, e) => sum + (e.course?.credits || 0),
    0,
  );

  const approvedCount = allYearEnrollments.filter(
    (e) => e.status === "approved",
  ).length;
  const pendingCount = allYearEnrollments.filter(
    (e) => e.status === "pending",
  ).length;

  const selectedTotalCredits = selectedCourses.reduce((acc, code) => {
    const unit = semesterCourses.find((c) => c.code === code);
    return acc + (Number(unit?.credits) || 0);
  }, 0);

  const totalCredits = filteredCourses.reduce(
    (sum, c) => sum + (Number(c.credits) || 0),
    0,
  );

  const toggleCourse = (courseCode: string) => {
    const existing = existingEnrollmentMap[courseCode];
    if (existing) {
      toast({
        title:
          existing === "approved" ? "Already Enrolled" : "Pending Approval",
        description: `Your enrollment for this course is already ${existing}.`,
        variant: "destructive",
      });
      return;
    }

    const unit = semesterCourses.find((c) => c.code === courseCode);
    const newCredits = selectedCourses.includes(courseCode)
      ? selectedTotalCredits - (Number(unit?.credits) || 0)
      : selectedTotalCredits + (Number(unit?.credits) || 0);

    if (!selectedCourses.includes(courseCode) && newCredits > MAX_CREDITS) {
      toast({
        title: "Credit Limit Exceeded",
        description: `Maximum ${MAX_CREDITS} credits allowed per semester.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedCourses((prev) =>
      prev.includes(courseCode)
        ? prev.filter((c) => c !== courseCode)
        : [...prev, courseCode],
    );
  };

  const handleEnroll = async () => {
    if (!user || selectedCourses.length === 0) return;

    if (selectedTotalCredits < MIN_CREDITS) {
      toast({
        title: "Minimum Credits Required",
        description: `You must register for at least ${MIN_CREDITS} credits.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await postMessagingBackend(
        "/api/enrollments/batch",
        selectedCourses.map((courseCode) => {
          const unit = semesterCourses.find((c) => c.code === courseCode);
          return {
            studentId: Number(user.uid),
            courseCode: courseCode,
            courseName: unit?.name || courseCode,
            paperType: paperTypes[courseCode] || "normal",
          };
        }),
      );

      toast({
        title: "Enrollment Submitted!",
        description: `You've enrolled in ${selectedCourses.length} course(s) with ${selectedTotalCredits} credits for Semester ${selectedSemester}.`,
      });
      setSelectedCourses([]);
      setPaperTypes({});
      fetchEnrollments();
    } catch (error: any) {
      toast({
        title: "Enrollment Failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Academic Period Selector */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  Enrollment & Registration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enroll for the semester and register for an academic year
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={String(academicYear)}
                onValueChange={(v) => setAcademicYear(Number(v))}
              >
                <SelectTrigger className="w-[130px]">
                  <Calendar className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Year {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(selectedSemester)}
                onValueChange={(v) => setSelectedSemester(Number(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(selectedYearOfStudy)}
                onValueChange={(v) => setSelectedYearOfStudy(Number(v))}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS_OF_STUDY.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Year {y} of Study
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Academic Period",
            value: `Sem ${selectedSemester}, ${academicYear}`,
            icon: Calendar,
            color: "from-primary to-primary/50",
            bg: "bg-primary/10",
          },
          {
            label: "Enrolled Courses",
            value: currentSemesterEnrollments.length,
            icon: BookOpen,
            color: "from-secondary to-secondary/50",
            bg: "bg-secondary/10",
          },
          {
            label: "Credit Load",
            value: `${enrolledCredits} / ${MAX_CREDITS}`,
            icon: FileText,
            color: "from-accent to-accent/50",
            bg: "bg-accent/10",
          },
          {
            label: "Registration Status",
            value:
              pendingCount > 0
                ? "Pending"
                : approvedCount > 0
                  ? "Complete"
                  : "Not Started",
            icon:
              pendingCount > 0
                ? Clock
                : approvedCount > 0
                  ? CheckCircle2
                  : AlertCircle,
            color:
              pendingCount > 0
                ? "from-amber-500 to-amber-500/50"
                : approvedCount > 0
                  ? "from-emerald-500 to-emerald-500/50"
                  : "from-muted-foreground to-muted-foreground/50",
            bg:
              pendingCount > 0
                ? "bg-amber-500/10"
                : approvedCount > 0
                  ? "bg-emerald-500/10"
                  : "bg-muted",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`}
              />
              <CardContent className="pt-6">
                <div
                  className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Credit Load Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credit Load Progress</CardTitle>
          <CardDescription>
            Semester {selectedSemester} &middot; {academicYear} &middot; Year{" "}
            {selectedYearOfStudy} of Study
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Credits</span>
              <span className="font-semibold">
                {enrolledCredits} / {MAX_CREDITS} credits
              </span>
            </div>
            <Progress
              value={(enrolledCredits / MAX_CREDITS) * 100}
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minimum: {MIN_CREDITS} credits</span>
              <span>Maximum: {MAX_CREDITS} credits</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enroll for Semester - Course Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary" />
                Enroll for Semester {selectedSemester}
              </CardTitle>
              <CardDescription>
                Select courses to enroll in for Semester {selectedSemester},{" "}
                {academicYear}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {semesterCourses.length} Available
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : semesterCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No courses available</h3>
              <p className="text-muted-foreground mb-4">
                No course units are available for Semester {selectedSemester},
                Year {selectedYearOfStudy}.
              </p>
              <Button asChild variant="outline">
                <Link to="/registration">Go to Full Registration</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by course name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Course Grid */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredCourses.map((course, i) => {
                  const isSelected = selectedCourses.includes(course.code);
                  const existingStatus = existingEnrollmentMap[course.code];
                  const isEnrolled = !!existingStatus;

                  return (
                    <motion.div
                      key={`${course.code}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isEnrolled
                          ? existingStatus === "approved"
                            ? "opacity-60 bg-emerald-50/50 border-emerald-200 cursor-not-allowed"
                            : existingStatus === "pending"
                              ? "opacity-60 bg-amber-50/50 border-amber-200 cursor-not-allowed"
                              : "opacity-60 bg-destructive/5 border-destructive/20 cursor-not-allowed"
                          : isSelected
                            ? "ring-2 ring-secondary shadow-sm bg-secondary/5 border-secondary/30"
                            : "hover:border-secondary/50 bg-muted/20"
                      }`}
                      onClick={() => !isEnrolled && toggleCourse(course.code)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {isEnrolled ? (
                            existingStatus === "approved" ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : existingStatus === "pending" ? (
                              <Clock className="h-5 w-5 text-amber-500" />
                            ) : (
                              <Ban className="h-5 w-5 text-destructive" />
                            )
                          ) : isSelected ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <BookOpen className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {course.code}
                            </Badge>
                            <Badge
                              className={`text-[10px] capitalize ${courseTypeColor(course.type)}`}
                            >
                              {course.type}
                            </Badge>
                            <Badge className="bg-accent/10 text-accent border-0 text-xs">
                              {Number(course.credits) || 0} CU
                            </Badge>
                            {isEnrolled && (
                              <Badge
                                className={`border-0 text-xs ${getStatusColor(existingStatus)}`}
                              >
                                {existingStatus}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm mt-0.5">
                            {course.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSelected && (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Select
                              value={paperTypes[course.code] || "normal"}
                              onValueChange={(val) =>
                                setPaperTypes((prev) => ({
                                  ...prev,
                                  [course.code]: val,
                                }))
                              }
                            >
                              <SelectTrigger className="h-7 text-xs w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="missed">Missed</SelectItem>
                                <SelectItem value="retake">Retake</SelectItem>
                                <SelectItem value="supplementary">
                                  Supplementary
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCourse(course.code);
                              }}
                              className="h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Selection Summary + Submit */}
              {selectedCourses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-accent/10 border border-secondary/20"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-secondary">
                          {selectedCourses.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Courses</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-accent">
                          {selectedTotalCredits}
                        </p>
                        <p className="text-xs text-muted-foreground">Credits</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-500">
                          Sem {selectedSemester}
                        </p>
                        <p className="text-xs text-muted-foreground">Semester</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCourses([]);
                          setPaperTypes({});
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleEnroll}
                        disabled={
                          submitting ||
                          selectedTotalCredits < MIN_CREDITS ||
                          selectedTotalCredits > MAX_CREDITS
                        }
                        className="gap-2"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {submitting ? "Enrolling..." : "Submit Enrollment"}
                      </Button>
                    </div>
                  </div>

                  {selectedTotalCredits < MIN_CREDITS && (
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      Add {MIN_CREDITS - selectedTotalCredits} more credits to
                      meet the minimum requirement.
                    </div>
                  )}

                  {selectedTotalCredits > MAX_CREDITS && (
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      Credit limit exceeded by{" "}
                      {selectedTotalCredits - MAX_CREDITS}. Remove courses to
                      continue.
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Registered Courses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Registered Courses</CardTitle>
              <CardDescription>
                Your enrollments for Semester {selectedSemester}, {academicYear}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {currentSemesterEnrollments.length} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEnrollments ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : currentSemesterEnrollments.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No enrollments yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't enrolled in any courses for Semester{" "}
                {selectedSemester}, {academicYear}.
              </p>
              <Button asChild>
                <Link to="/registration">Register Now</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentSemesterEnrollments.map((enrollment, i) => (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {enrollment.course?.code}
                        </Badge>
                        <Badge className={getStatusColor(enrollment.status)}>
                          {enrollment.status}
                        </Badge>
                        {(enrollment.paper_type || "normal") !== "normal" && (
                          <Badge
                            className={`text-xs border-0 ${
                              enrollment.paper_type === "retake"
                                ? "bg-red-500/10 text-red-600"
                                : enrollment.paper_type === "missed"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-purple-500/10 text-purple-600"
                            }`}
                          >
                            {enrollment.paper_type.charAt(0).toUpperCase() +
                              enrollment.paper_type.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium">{enrollment.course?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment.course?.credits} Credits
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Registration Documents</h3>
                <p className="text-sm text-muted-foreground">
                  Download your proof of enrollment and exam permit
                </p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const printWindow = window.open("", "", "width=800,height=600");
                  if (printWindow) {
                    const courseRows = currentSemesterEnrollments
                      .map(
                        (e) =>
                          "<tr>" +
                          `<td>${e.course?.code || "N/A"}</td>` +
                          `<td>${e.course?.title || "N/A"}</td>` +
                          `<td>${e.course?.credits || "N/A"}</td>` +
                          `<td><strong>${e.status}</strong></td>` +
                          "</tr>",
                      )
                      .join("");

                    const qrValue = getEnrollmentShareUrl(user?.uid || "");
                    const qrContainer = document.createElement("div");
                    qrContainer.style.display = "none";
                    document.body.appendChild(qrContainer);

                    const html = `
                      <html>
                        <head>
                          <title>Proof of Enrollment and Registration</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 40px; }
                            .header { text-align: center; margin-bottom: 30px; position: relative; }
                            .qr-code { position: absolute; top: 0; right: 0; width: 120px; height: 120px; border: 2px solid #d1d5db; padding: 5px; background: white; }
                            h1 { color: #1f2937; margin: 0; }
                            .subheader { color: #6b7280; font-size: 14px; }
                            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                            .info-box { border: 1px solid #d1d5db; padding: 15px; border-radius: 8px; }
                            .label { font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; }
                            .value { font-size: 16px; color: #1f2937; margin-top: 5px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #d1d5db; }
                            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
                            .signature { margin-top: 40px; display: flex; justify-content: space-around; }
                            .sig-box { text-align: center; width: 40%; }
                            .qr-label { font-size: 10px; text-align: center; color: #6b7280; margin-top: 3px; }
                            @media print { body { margin: 0; padding: 20px; } }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <div class="qr-code">
                              <img src="${generateQRCodeDataUrl(qrValue, 120)}" alt="QR Code" style="width: 100%; height: 100%;" />
                              <div class="qr-label">Scan to verify</div>
                            </div>
                            <h1>PROOF OF ENROLLMENT AND REGISTRATION</h1>
                            <p class="subheader">Nexus University</p>
                          </div>
                          <div class="info-grid">
                            <div class="info-box"><div class="label">Student Name</div><div class="value">${profile?.full_name || "N/A"}</div></div>
                            <div class="info-box"><div class="label">Student Number</div><div class="value">${profile?.student_number || "N/A"}</div></div>
                            <div class="info-box"><div class="label">Programme</div><div class="value">${profile?.programme || "N/A"}</div></div>
                            <div class="info-box"><div class="label">Department</div><div class="value">${profile?.department || "N/A"}</div></div>
                            <div class="info-box"><div class="label">Academic Year</div><div class="value">${academicYear}</div></div>
                            <div class="info-box"><div class="label">Semester</div><div class="value">Semester ${selectedSemester}</div></div>
                            <div class="info-box"><div class="label">Registered Courses</div><div class="value">${currentSemesterEnrollments.length}</div></div>
                            <div class="info-box"><div class="label">Total Credits</div><div class="value">${enrolledCredits}</div></div>
                          </div>
                          <table>
                            <thead><tr><th>Code</th><th>Course Title</th><th>Credits</th><th>Status</th></tr></thead>
                            <tbody>${courseRows}</tbody>
                          </table>
                          <div class="signature">
                            <div class="sig-box"><p style="margin: 50px 0 5px 0; border-top: 1px solid #000;"></p><p style="margin: 0; font-size: 12px;">Registrar's Signature</p></div>
                            <div class="sig-box"><p style="margin: 50px 0 5px 0;">Date: ${new Date().toLocaleDateString()}</p></div>
                          </div>
                        </body>
                      </html>`;

                    printWindow.document.write(html);
                    printWindow.document.close();
                    document.body.removeChild(qrContainer);
                    printWindow.print();
                  }
                }}
              >
                <Printer className="h-4 w-4" />
                Print Proof
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  try {
                    const doc = new jsPDF({
                      orientation: "portrait",
                      unit: "mm",
                      format: "a4",
                    });
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const margin = 15;
                    let yPos = margin;

                    doc.setFillColor(30, 64, 175);
                    doc.rect(0, 0, pageWidth, 24, "F");
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(14);
                    doc.text(
                      "PROOF OF ENROLLMENT AND REGISTRATION",
                      pageWidth / 2,
                      10,
                      { align: "center" },
                    );
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "normal");
                    doc.text("Nexus University", pageWidth / 2, 17, {
                      align: "center",
                    });

                    yPos = 32;
                    doc.setTextColor(15, 23, 42);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(10);
                    doc.text("Student Details", margin, yPos);
                    yPos += 6;
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9);
                    doc.text(
                      `Name: ${profile?.full_name || "N/A"}`,
                      margin,
                      yPos,
                    );
                    yPos += 5;
                    doc.text(
                      `Student Number: ${profile?.student_number || "N/A"}`,
                      margin,
                      yPos,
                    );
                    yPos += 5;
                    doc.text(
                      `Programme: ${profile?.programme || "N/A"}`,
                      margin,
                      yPos,
                    );
                    yPos += 5;
                    doc.text(
                      `Department: ${profile?.department || "N/A"}`,
                      margin,
                      yPos,
                    );
                    yPos += 8;

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(10);
                    doc.text("Registration Summary", margin, yPos);
                    yPos += 6;
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9);
                    doc.text(
                      `Academic Year: ${academicYear}`,
                      margin,
                      yPos,
                    );
                    yPos += 5;
                    doc.text(
                      `Semester: Semester ${selectedSemester}`,
                      margin,
                      yPos,
                    );
                    yPos += 5;
                    doc.text(
                      `Registered Courses: ${currentSemesterEnrollments.length}`,
                      margin,
                      yPos,
                    );
                    yPos += 5;
                    doc.text(
                      `Total Credits: ${enrolledCredits}`,
                      margin,
                      yPos,
                    );
                    yPos += 5;
                    doc.text(
                      `Payment: ${paymentPercentage.toFixed(1)}%`,
                      margin,
                      yPos,
                    );
                    yPos += 8;

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(10);
                    doc.text("Registered Courses", margin, yPos);
                    yPos += 6;

                    currentSemesterEnrollments.forEach((enrollment) => {
                      doc.setFont("helvetica", "normal");
                      doc.setFontSize(8);
                      doc.text(
                        `${enrollment.course?.code || "N/A"} - ${enrollment.course?.title || "N/A"} (${enrollment.course?.credits || 0} cr) [${enrollment.status}]`,
                        margin,
                        yPos,
                      );
                      yPos += 5;
                    });

                    doc.save(
                      `enrollment-slip-${profile?.student_number || user?.uid || "student"}.pdf`,
                    );
                  } catch (error) {
                    console.error("Error generating PDF:", error);
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Download Slip
              </Button>
              {paymentPercentage >= 60 && (
                <Button
                  variant="default"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    const printWindow = window.open(
                      "",
                      "",
                      "width=900,height=700",
                    );
                    if (printWindow) {
                      const coursesList = currentSemesterEnrollments
                        .map(
                          (e) =>
                            `<tr><td>${e.course?.code || "N/A"}</td><td>${e.course?.title || "N/A"}</td></tr>`,
                        )
                        .join("");

                      const html = `
                        <html>
                          <head>
                            <title>Exam Permit</title>
                            <style>
                              body { font-family: Arial, sans-serif; margin: 30px; }
                              .container { max-width: 700px; margin: 0 auto; }
                              .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #059669; padding-bottom: 20px; }
                              h1 { color: #059669; margin: 0; font-size: 28px; }
                              .subheader { color: #666; font-size: 16px; margin-top: 5px; }
                              .student-info { background: #f0fdf4; border: 2px solid #059669; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                              .info-row { display: grid; grid-template-columns: 150px 1fr; gap: 15px; margin-bottom: 12px; }
                              .label { font-weight: bold; color: #059669; }
                              .value { color: #1f2937; }
                              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                              th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
                              th { background-color: #059669; color: white; }
                              .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
                              @media print { body { margin: 0; padding: 20px; } }
                            </style>
                          </head>
                          <body>
                            <div class="container">
                              <div class="header">
                                <h1>EXAMINATION PERMIT</h1>
                                <p class="subheader">Nexus University</p>
                              </div>
                              <div class="student-info">
                                <div class="info-row"><div class="label">Student Name:</div><div class="value">${profile?.full_name || "N/A"}</div></div>
                                <div class="info-row"><div class="label">Student Number:</div><div class="value">${profile?.student_number || "N/A"}</div></div>
                                <div class="info-row"><div class="label">Programme:</div><div class="value">${profile?.programme || "N/A"}</div></div>
                                <div class="info-row"><div class="label">Department:</div><div class="value">${profile?.department || "N/A"}</div></div>
                              </div>
                              <h3 style="color: #374151;">Registered Courses for Examination:</h3>
                              <table>
                                <thead><tr><th>Course Code</th><th>Course Title</th></tr></thead>
                                <tbody>${coursesList}</tbody>
                              </table>
                              <div class="footer">
                                <p>This permit authorizes the student to sit for examinations in the registered courses.</p>
                                <p>Valid for Academic Year ${academicYear} &middot; Semester ${selectedSemester}</p>
                              </div>
                            </div>
                          </body>
                        </html>`;

                      printWindow.document.write(html);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Print Exam Permit
                </Button>
              )}
              <Button asChild className="gap-2">
                <Link to="/registration">
                  <BookOpen className="h-4 w-4" />
                  Full Registration
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Enrollments Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Year Enrollments</CardTitle>
              <CardDescription>
                All your courses for Academic Year {academicYear}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {allYearEnrollments.length} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {allYearEnrollments.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No enrollments found for Academic Year {academicYear}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {allYearEnrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {enrollment.course?.code}
                    </Badge>
                    <span className="font-medium text-sm">
                      {enrollment.course?.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs border-0 bg-accent/10 text-accent">
                      {enrollment.course?.credits} Credits
                    </Badge>
                    <Badge
                      className={`text-xs ${getStatusColor(enrollment.status)}`}
                    >
                      {enrollment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
