import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  Check,
  Plus,
  X,
  Loader2,
  GraduationCap,
  Filter,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  Star,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  BookMarked,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend, postMessagingBackend } from "@/lib/backendApi";

interface CourseUnit {
  id: string;
  code: string;
  name: string;
  credits: number;
  course: number;
  semester: number;
  year: number;
  description?: string | null;
}

interface BackendCourseUnit {
  id: string;
  code: string;
  name: string;
  credits: number;
  course: number;
  semester: number;
  year: number;
}

interface BackendCourse {
  id: string;
  code: string;
  name: string;
  college: string;
  department: string;
  duration_years: number;
}

interface BackendEnrollment {
  id: string;
  course_id: string;
  status: string;
  student_id: string;
  enrolled_at: string;
}

const YEARS_OF_STUDY = [1, 2, 3, 4, 5];
const SEMESTERS = [1, 2];
const MAX_CREDITS = 24;
const MIN_CREDITS = 12;

export default function Registration() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [courseUnits, setCourseUnits] = useState<CourseUnit[]>([]);
  const [existingEnrollments, setExistingEnrollments] = useState<
    Record<string, string>
  >({});
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept] = useState<string>("all");
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [step, setStep] = useState<"select" | "review">("select");
  const [registrationNumber, setRegistrationNumber] = useState<string>("");
  const [studentNumber, setStudentNumber] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [user, profile, selectedSemester, selectedYear]);

  useEffect(() => {
    if (profile) {
      setRegistrationNumber(profile.registration_number || "");
      setStudentNumber(profile.student_number || "");
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      let targetCourseId = profile?.course_id;

      // If no direct course_id, derive it from the programme name
      if (!targetCourseId && profile?.programme) {
        const courses = await getBackend<BackendCourse[]>(
          `/api/courses/?name=${encodeURIComponent(profile.programme)}`,
          true,
        );
        if (courses && courses.length > 0) {
          targetCourseId = courses[0].id;
        }
      }

      if (!targetCourseId) {
        setCourseUnits([]);
        setLoading(false);
        return;
      }

      // Fetch course units for the current semester/year and student's program
      const units = await getBackend<BackendCourseUnit[]>(
        `/api/course-units/?course_id=${targetCourseId}&semester=${selectedSemester}&year=${selectedYear}`,
        true,
      );

      setCourseUnits(
        (units || []).map((u) => ({
          id: u.id,
          code: u.code,
          name: u.name,
          credits: u.credits,
          course: u.course,
          semester: u.semester,
          year: u.year,
        })),
      );

      // Fetch existing enrollments
      if (user) {
        const enrollments = await getBackend<BackendEnrollment[]>(
          `/api/enrollments/?student_id=${user.uid}`,
          true,
        );
        const enrollmentsMap: Record<string, string> = {};
        (enrollments || []).forEach((e) => {
          enrollmentsMap[e.course_id] = e.status;
        });
        setExistingEnrollments(enrollmentsMap);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    const status = existingEnrollments[courseId];
    if (status) {
      const statusMessage =
        status === "approved"
          ? "Enrolled"
          : status === "pending"
            ? "Pending Approval"
            : "Request " + status;
      toast({
        title: statusMessage,
        description: `Your enrollment request for this course is ${status}.`,
        variant: "destructive",
      });
      return;
    }

    const course = courseUnits.find((c) => c.id === courseId);
    const newCredits = selectedCourses.includes(courseId)
      ? totalCredits - (course?.credits || 0)
      : totalCredits + (course?.credits || 0);

    if (!selectedCourses.includes(courseId) && newCredits > MAX_CREDITS) {
      toast({
        title: "Credit Limit Exceeded",
        description: `Maximum ${MAX_CREDITS} credits allowed per semester.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId],
    );
  };

  const handleSubmit = async () => {
    if (!user || selectedCourses.length === 0) return;

    if (totalCredits < MIN_CREDITS) {
      toast({
        title: "Minimum Credits Required",
        description: `You must register for at least ${MIN_CREDITS} credits.`,
        variant: "destructive",
      });
      return;
    }

    if (!registrationNumber.trim() || !studentNumber.trim()) {
      toast({
        title: "Missing Information",
        description:
          "Please provide both Registration Number and Student Number.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Update profile with registration number and student number
      await postBackend(
        `/api/profiles/by-user/${user.uid}/`,
        {
          registration_number: registrationNumber.trim(),
          student_number: studentNumber.trim(),
          email: profile?.email || user.email,
        },
        true,
      );

      // Create enrollments
      await postBackend(
        "/api/enrollments/",
        {
          student_id: user.uid,
          course_ids: selectedCourses,
        },
        true,
      );

      // Notify lecturers
      const notificationPromises = selectedCourses.map(async (courseId) => {
        const course = courseUnits.find((c) => c.id === courseId);
        if (!course) return;

        const studentLabel =
          profile?.full_name || profile?.student_number || user.email;

        try {
          await postMessagingBackend(
            "/api/notifications/",
            {
              user_id: `lecturer-${course.course}`,
              type: "enrollment_request",
              title: "Enrollment Request",
              message: `${studentLabel} requested to enroll in ${course.name} (${course.code}).`,
              related_id: courseId,
            },
          );
        } catch {
          // notification send is best-effort
        }
      });

      await Promise.allSettled(notificationPromises);

      toast({
        title: "Registration Submitted!",
        description: `You've registered for ${selectedCourses.length} course unit(s) with ${totalCredits} credits.`,
      });
      navigate("/enrollment");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCourses = courseUnits.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalCredits = selectedCourses.reduce((acc, id) => {
    const course = courseUnits.find((c) => c.id === id);
    return acc + (course?.credits || 0);
  }, 0);

  const creditProgress = (totalCredits / MAX_CREDITS) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <StudentHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--secondary)/0.2)_0%,_transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-3">
              <GraduationCap className="h-4 w-4" />
              <span>Academic Registration</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-primary-foreground">Course Selection</span>
            </div>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Register for Courses
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mb-6">
              Select your course units. Choose wisely to build your academic
              path.
            </p>

            {/* Semester & Year Selection */}
            <div className="flex flex-wrap gap-3">
              <Select
                value={selectedSemester.toString()}
                onValueChange={(v) => setSelectedSemester(parseInt(v))}
              >
                <SelectTrigger className="w-[160px] bg-white/10 border-white/20 text-primary-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-primary-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS_OF_STUDY.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <AnimatePresence mode="wait">
            {step === "select" ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="grid lg:grid-cols-4 gap-8">
                  {/* Course List */}
                  <div className="lg:col-span-3 space-y-6">
                    {/* Filters */}
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              placeholder="Search by course name or code..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-12 h-12 text-base rounded-xl bg-muted/50 border-0"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Course Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-secondary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              {courseUnits.length}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Available
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              {selectedCourses.length}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Selected
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Star className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{totalCredits}</p>
                            <p className="text-xs text-muted-foreground">
                              Credits
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {filteredCourses.length === 0 ? (
                      <Card className="p-12 text-center border-dashed">
                        <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="font-display text-xl font-semibold mb-2">
                          No course units found
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          No course units are available for Semester{" "}
                          {selectedSemester} Year {selectedYear}. Try selecting
                          a different semester or check back later.
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-8">
                        <div className="grid gap-4">
                          {filteredCourses.map((course, i) => {
                            const isSelected = selectedCourses.includes(
                              course.id,
                            );
                            const status = existingEnrollments[course.id];
                            const isEnrolled = !!status;

                            return (
                              <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                              >
                                <Card
                                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg group ${
                                    isEnrolled
                                      ? status === "approved"
                                        ? "opacity-60 cursor-not-allowed bg-emerald-50/50 border-emerald-200"
                                        : status === "pending"
                                          ? "opacity-60 cursor-not-allowed bg-amber-50/50 border-amber-200"
                                          : "opacity-60 cursor-not-allowed bg-destructive/5 border-destructive/20"
                                      : isSelected
                                        ? "ring-2 ring-secondary shadow-lg shadow-secondary/10 bg-secondary/5"
                                        : "hover:border-secondary/50"
                                  }`}
                                  onClick={() =>
                                    !isEnrolled && toggleCourse(course.id)
                                  }
                                >
                                  <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                      <div
                                        className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                          isSelected
                                            ? "bg-secondary text-secondary-foreground"
                                            : "bg-muted group-hover:bg-secondary/10"
                                        }`}
                                      >
                                        {isEnrolled ? (
                                          status === "approved" ? (
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                          ) : status === "pending" ? (
                                            <Clock className="h-6 w-6 text-amber-500" />
                                          ) : (
                                            <Ban className="h-6 w-6 text-destructive" />
                                          )
                                        ) : isSelected ? (
                                          <Check className="h-6 w-6" />
                                        ) : (
                                          <BookOpen className="h-6 w-6 text-muted-foreground group-hover:text-secondary" />
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                          <Badge
                                            variant="outline"
                                            className="font-mono text-xs bg-background"
                                          >
                                            {course.code}
                                          </Badge>
                                          <Badge className="bg-accent/10 text-accent border-0 text-xs">
                                            {course.credits} Credits
                                          </Badge>
                                          {isEnrolled && (
                                            <Badge
                                              className={`border-0 text-xs ${
                                                status === "approved"
                                                  ? "bg-emerald-500/10 text-emerald-600"
                                                  : status === "pending"
                                                    ? "bg-amber-500/10 text-amber-600"
                                                    : "bg-destructive/10 text-destructive"
                                              }`}
                                            >
                                              {status === "approved"
                                                ? "Enrolled"
                                                : status === "pending"
                                                  ? "Pending Approval"
                                                  : status
                                                      .charAt(0)
                                                      .toUpperCase() +
                                                    status.slice(1)}
                                            </Badge>
                                          )}
                                        </div>
                                        <h3 className="font-semibold text-lg mb-1 group-hover:text-secondary transition-colors">
                                          {course.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                          {"No description available"}
                                        </p>
                                      </div>

                                      <div
                                        className={`h-12 w-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                                          isEnrolled
                                            ? status === "approved"
                                              ? "bg-emerald-500/10"
                                              : status === "pending"
                                                ? "bg-amber-500/10"
                                                : "bg-destructive/10"
                                            : isSelected
                                              ? "bg-secondary text-secondary-foreground scale-110"
                                              : "bg-muted text-muted-foreground group-hover:bg-secondary/20 group-hover:text-secondary"
                                        }`}
                                      >
                                        {isEnrolled ? (
                                          status === "approved" ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                          ) : status === "pending" ? (
                                            <Clock className="h-5 w-5 text-amber-500" />
                                          ) : (
                                            <Ban className="h-5 w-5 text-destructive" />
                                          )
                                        ) : isSelected ? (
                                          <Check className="h-5 w-5" />
                                        ) : (
                                          <Plus className="h-5 w-5" />
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-4">
                      {/* Credit Progress */}
                      <Card className="overflow-hidden">
                        <div className="h-2 bg-muted">
                          <motion.div
                            className={`h-full transition-colors ${
                              creditProgress > 100
                                ? "bg-destructive"
                                : creditProgress >= 50
                                  ? "bg-secondary"
                                  : "bg-accent"
                            }`}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(creditProgress, 100)}%`,
                            }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              Credit Load
                            </span>
                            <span
                              className={`text-lg font-bold ${
                                totalCredits > MAX_CREDITS
                                  ? "text-destructive"
                                  : totalCredits >= MIN_CREDITS
                                    ? "text-emerald-500"
                                    : ""
                              }`}
                            >
                              {totalCredits}/{MAX_CREDITS}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {totalCredits < MIN_CREDITS
                              ? `Minimum ${MIN_CREDITS} credits required`
                              : totalCredits > MAX_CREDITS
                                ? "Exceeded maximum credits"
                                : "Credit load is within limits"}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Selected Courses */}
                      <Card className="border-2 border-dashed">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-secondary" />
                              Selected Courses
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {selectedCourses.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedCourses.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                                <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                              <p className="text-sm text-muted-foreground">
                                No courses selected
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Click on courses to add them
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                <AnimatePresence mode="popLayout">
                                  {selectedCourses.map((id) => {
                                    const course = courseUnits.find(
                                      (c) => c.id === id,
                                    );
                                    if (!course) return null;
                                    return (
                                      <motion.div
                                        key={id}
                                        layout
                                        initial={{
                                          opacity: 0,
                                          scale: 0.9,
                                          x: 20,
                                        }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{
                                          opacity: 0,
                                          scale: 0.9,
                                          x: -20,
                                        }}
                                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/5 border border-secondary/20 group"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-medium text-sm truncate">
                                            {course.name}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-mono text-muted-foreground">
                                              {course.code}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              •
                                            </span>
                                            <span className="text-xs text-secondary font-medium">
                                              {course.credits} cr
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleCourse(id);
                                          }}
                                          className="h-8 w-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </motion.div>
                                    );
                                  })}
                                </AnimatePresence>
                              </div>

                              <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    Total Credits
                                  </span>
                                  <span className="font-bold text-secondary">
                                    {totalCredits}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    Courses
                                  </span>
                                  <span className="font-bold">
                                    {selectedCourses.length}
                                  </span>
                                </div>
                              </div>

                              {totalCredits < MIN_CREDITS && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs">
                                    Add {MIN_CREDITS - totalCredits} more
                                    credits to meet minimum requirement
                                  </p>
                                </div>
                              )}

                              <Button
                                onClick={() => setStep("review")}
                                disabled={
                                  totalCredits < MIN_CREDITS ||
                                  totalCredits > MAX_CREDITS
                                }
                                className="w-full h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl shadow-lg shadow-secondary/20 group"
                              >
                                Review & Submit
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Review Step */
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl mx-auto"
              >
                <Card className="overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-secondary via-accent to-emerald-500" />
                  <CardHeader className="text-center pb-2">
                    <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-secondary" />
                    </div>
                    <CardTitle className="font-display text-2xl">
                      Review Your Registration
                    </CardTitle>
                    <CardDescription>
                      Please review your course unit selection for Semester{" "}
                      {selectedSemester} Year {selectedYear}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Student Info */}
                    <div className="p-4 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {profile?.full_name || "Student"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {profile?.email}
                          </p>
                        </div>
                      </div>

                      {/* Registration Number and Student Number Inputs */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Registration Number
                          </label>
                          <Input
                            value={registrationNumber}
                            onChange={(e) =>
                              setRegistrationNumber(e.target.value)
                            }
                            placeholder="e.g., 24/U/11805/PS"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Student Number
                          </label>
                          <Input
                            value={studentNumber}
                            onChange={(e) => setStudentNumber(e.target.value)}
                            placeholder="e.g., 2400711805"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selected Courses */}
                    <div>
                      <h3 className="font-semibold mb-3">
                        Selected Courses ({selectedCourses.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedCourses.map((id) => {
                          const course = courseUnits.find((c) => c.id === id);
                          if (!course) return null;
                          return (
                            <div
                              key={id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                            >
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {course.code}
                                </Badge>
                                <span className="font-medium">
                                  {course.name}
                                </span>
                              </div>
                              <Badge className="bg-accent/10 text-accent">
                                {course.credits} Credits
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-accent/10 border border-secondary/20">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-secondary">
                            {selectedCourses.length}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Courses
                          </p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-accent">
                            {totalCredits}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Credits
                          </p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-emerald-500">
                            Year {selectedYear}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Semester {selectedSemester}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setStep("select")}
                        className="flex-1 h-12 rounded-xl"
                      >
                        Go Back
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl shadow-lg shadow-secondary/20"
                      >
                        {submitting ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Confirm Registration
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <StudentBottomNav />
    </div>
  );
}