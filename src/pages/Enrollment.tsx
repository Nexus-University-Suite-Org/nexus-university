import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Calendar,
  ChevronRight,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { getMessagingBackend } from "@/lib/backendApi";

interface BackendCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: string;
}

interface BackendEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  status: "pending" | "approved" | "rejected" | "completed";
  grade: number | null;
  enrolled_at: string;
  paper_type: string;
  course: BackendCourse | null;
}

interface Enrollment {
  id: string;
  course_id: string;
  status: "pending" | "approved" | "rejected" | "completed";
  enrolled_at: string;
  grade: number | null;
  paper_type: string;
  course?: {
    id: string;
    code: string;
    title: string;
    credits: number;
    semester: string;
  };
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: "bg-amber-500/10 text-amber-600",
    label: "Pending Approval",
  },
  approved: {
    icon: CheckCircle2,
    color: "bg-emerald-500/10 text-emerald-600",
    label: "Approved",
  },
  rejected: {
    icon: XCircle,
    color: "bg-destructive/10 text-destructive",
    label: "Rejected",
  },
  completed: {
    icon: CheckCircle2,
    color: "bg-primary/10 text-primary",
    label: "Completed",
  },
};

export default function Enrollment() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState<string>("all");

  useEffect(() => {
    if (user?.uid) fetchEnrollments();
  }, [user]);

  const fetchEnrollments = async () => {
    if (!user?.uid) return;
    try {
      const data = await getMessagingBackend<BackendEnrollment[]>(
        `/api/enrollments/?student_id=${user.uid}`,
      );

      const mapped: Enrollment[] = (data || []).map((e) => ({
        id: e.id,
        course_id: e.course_id,
        status: e.status,
        enrolled_at: e.enrolled_at,
        grade: e.grade,
        paper_type: e.paper_type || "normal",
        course: e.course
          ? {
              id: e.course.id,
              code: e.course.code,
              title: e.course.title,
              credits: e.course.credits,
              semester: e.course.semester,
            }
          : undefined,
      }));

      setEnrollments(mapped);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  const semesters = [
    ...new Set(enrollments.map((e) => e.course?.semester).filter(Boolean)),
  ];

  const filteredEnrollments = enrollments.filter(
    (e) =>
      selectedSemester === "all" || e.course?.semester === selectedSemester,
  );

  const stats = {
    total: enrollments.length,
    approved: enrollments.filter((e) => e.status === "approved").length,
    pending: enrollments.filter((e) => e.status === "pending").length,
    credits: enrollments
      .filter((e) => e.status === "approved" || e.status === "completed")
      .reduce((acc, e) => acc + (e.course?.credits || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <StudentHeader />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <GraduationCap className="h-4 w-4" />
                <span>Academic</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground">Enrollment Status</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                My Enrollments
              </h1>
            </div>
            <Button
              asChild
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Link to="/registration">
                <Plus className="h-4 w-4 mr-2" />
                Register Courses
              </Link>
            </Button>
          </div>

          {/* Enrollment Registration Snapshot */}
          <Card className="mb-8">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-lg sm:text-xl font-semibold">
                  ENROLLMENT REGISTRATION
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  SEMESTER II, 2025/2026
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">
                    Program
                  </p>
                  <p className="text-sm sm:text-base font-medium">
                    Bachelor of Science in Computer Science (BCSC)
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">
                    Year of Study*
                  </p>
                  <p className="text-sm sm:text-base font-semibold">Year 2</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">
                    Enrolling As?*
                  </p>
                  <p className="text-sm sm:text-base">----</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">
                    Have Retakes?*
                  </p>
                  <p className="text-sm sm:text-base">No</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Courses", value: stats.total, icon: BookOpen },
              { label: "Approved", value: stats.approved, icon: CheckCircle2 },
              { label: "Pending", value: stats.pending, icon: Clock },
              { label: "Total Credits", value: stats.credits, icon: Calendar },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-4 mb-6">
            <Select
              value={selectedSemester}
              onValueChange={setSelectedSemester}
            >
              <SelectTrigger className="w-[200px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map((sem) => (
                  <SelectItem key={sem} value={sem!}>
                    {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Enrollments List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Enrolled Courses</span>
                <Badge variant="outline">
                  {filteredEnrollments.length} courses
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEnrollments.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    No enrollments yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Start by registering for courses
                  </p>
                  <Button asChild>
                    <Link to="/registration">
                      <Plus className="h-4 w-4 mr-2" />
                      Browse Courses
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEnrollments.map((enrollment, i) => {
                    const status = statusConfig[enrollment.status];
                    const StatusIcon = status.icon;
                    return (
                      <motion.div
                        key={enrollment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono"
                                >
                                  {enrollment.course?.code}
                                </Badge>
                                <Badge className="bg-accent/10 text-accent hover:bg-accent/20 text-xs">
                                  {enrollment.course?.credits} Credits
                                </Badge>
                                <Badge
                                  className={`text-xs border-0 ${
                                    enrollment.paper_type === "retake"
                                      ? "bg-red-500/10 text-red-600"
                                      : enrollment.paper_type === "missed"
                                        ? "bg-amber-500/10 text-amber-600"
                                        : enrollment.paper_type === "supplementary"
                                          ? "bg-purple-500/10 text-purple-600"
                                          : "bg-blue-500/10 text-blue-600"
                                  }`}
                                >
                                  {enrollment.paper_type.charAt(0).toUpperCase() + enrollment.paper_type.slice(1)}
                                </Badge>
                              </div>
                              <h3 className="font-medium mt-1 truncate">
                                {enrollment.course?.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {enrollment.course?.semester} • Enrolled{" "}
                                {new Date(
                                  enrollment.enrolled_at,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {enrollment.grade !== null && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  Grade
                                </p>
                                <p className="font-bold text-lg">
                                  {enrollment.grade}%
                                </p>
                              </div>
                            )}
                            <Badge className={`${status.color} gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <StudentBottomNav />
    </div>
  );
}