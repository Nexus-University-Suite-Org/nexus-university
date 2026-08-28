import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  ChevronRight,
  Download,
  Eye,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  BookOpen,
  Receipt,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend } from "@/lib/backendApi";

interface ExamResult {
  id: string;
  course_id: string;
  marks: number;
  grade: string;
  grade_point: number;
  semester: string;
  academic_year: string;
  course?: { code: string; title: string; credits: number };
}

interface Schedule {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  building: string;
  course?: { code: string; title: string };
}

interface Fee {
  id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  semester: string;
  academic_year: string;
  description: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalPoints: number;
  courseTitle: string;
  courseCode: string;
  status: "pending" | "submitted" | "graded";
  instructionDocumentUrl?: string;
  instructionDocumentName?: string;
  score?: number;
  feedback?: string;
}

interface BackendAssignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  course_title: string;
  course_code: string;
  course_id: string;
  status: string;
  instruction_document_url?: string;
  instruction_document_name?: string;
}

interface BackendSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  score: number | null;
  feedback: string;
  submitted_at: string;
}

interface BackendExamResult {
  id: string;
  course_id: string;
  course_title: string;
  course_code: string;
  credits: number;
  marks: number;
  grade: string;
  grade_point: number;
  semester: string;
  academic_year: string;
}

interface BackendSchedule {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  building: string;
}

interface BackendFee {
  id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  semester: string;
  academic_year: string;
  description: string;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function Portal() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("results");
  const [results, setResults] = useState<ExamResult[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingDocument, setDownloadingDocument] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);

      // 1. Fetch Exam Results
      const examData = await getBackend<{ exam_results: BackendExamResult[] }>(
        `/api/students/${user.uid}/results/`,
        true,
      );

      const resultsData: ExamResult[] = (examData.exam_results || []).map(
        (r) => ({
          id: r.id,
          course_id: r.course_id,
          marks: r.marks,
          grade: r.grade || "",
          grade_point: r.grade_point,
          semester: r.semester,
          academic_year: r.academic_year,
          course: {
            code: r.course_code,
            title: r.course_title,
            credits: r.credits,
          },
        }),
      );
      setResults(resultsData);

      // 2. Fetch Schedules
      const schedulesData = await getBackend<BackendSchedule[]>(
        "/api/schedules/",
        true,
      );
      const schedulesWithCourses = await Promise.all(
        (schedulesData || []).map(async (s) => {
          let course = null;
          try {
            const courseData = await getBackend<{ code: string; name: string }>(
              `/api/courses/${s.course_id}/`,
              true,
            );
            course = { code: courseData.code, title: courseData.name };
          } catch {
            // course lookup failed, use defaults
          }
          return {
            id: s.id,
            course_id: s.course_id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            room: s.room,
            building: s.building,
            course,
          } as Schedule;
        }),
      );
      setSchedules(schedulesWithCourses);

      // 3. Fetch Fees
      const feesData = await getBackend<BackendFee[]>(
        `/api/student-fees/?student_id=${user.uid}`,
        true,
      );
      setFees(
        (feesData || []).map((f) => ({
          id: f.id,
          amount: f.amount,
          paid_amount: f.paid_amount,
          due_date: f.due_date,
          semester: f.semester,
          academic_year: f.academic_year,
          description: f.description,
        })),
      );

      // 4. Fetch Enrollments & Assignments
      const enrollmentsData = await getBackend<
        { course_id: string; status: string }[]
      >(`/api/enrollments/?student_id=${user.uid}`, true);
      const courseIds: string[] = (enrollmentsData || [])
        .filter((e) => e.status === "approved" || e.status === "pending")
        .map((e) => e.course_id)
        .filter(Boolean);

      if (courseIds.length > 0) {
        const assignmentsData = await getBackend<BackendAssignment[]>(
          `/api/assignments/?course_ids=${courseIds.slice(0, 10).join(",")}`,
          true,
        );

        const assignmentIds = (assignmentsData || []).map((a) => a.id);
        let submissions: BackendSubmission[] = [];
        if (assignmentIds.length > 0) {
          submissions = await getBackend<BackendSubmission[]>(
            `/api/submissions/?student_id=${user.uid}&assignment_ids=${assignmentIds.slice(0, 10).join(",")}`,
            true,
          );
        }

        const mappedAssignments: Assignment[] = (assignmentsData || []).map(
          (a) => {
            const sub = (submissions || []).find(
              (s) => s.assignment_id === a.id,
            );
            let status: "pending" | "submitted" | "graded" = "pending";
            if (sub?.status === "submitted" || sub?.status === "graded") {
              status = sub.score !== undefined && sub.score !== null ? "graded" : "submitted";
            }
            return {
              id: a.id,
              title: a.title,
              description: a.description || "",
              dueDate: a.due_date,
              totalPoints: a.total_points ?? 100,
              courseTitle: a.course_title || "Course",
              courseCode: a.course_code || "",
              status,
              instructionDocumentUrl: a.instruction_document_url,
              instructionDocumentName: a.instruction_document_name,
              score: sub?.score ?? undefined,
              feedback: sub?.feedback || undefined,
            };
          },
        );

        setAssignments(
          mappedAssignments.sort(
            (a, b) =>
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
          ),
        );
      }
    } catch (error) {
      console.error("Error fetching portal data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePRN = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PRN-${timestamp}-${random}`;
  };

  const handleDownloadDocument = async (url: string, filename: string) => {
    try {
      setDownloadingDocument(true);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to download document");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloadingDocument(false);
    }
  };

  const calculateGPA = () => {
    if (results.length === 0) return 0;
    const totalPoints = results.reduce(
      (acc, r) => acc + (r.grade_point || 0) * (r.course?.credits || 0),
      0,
    );
    const totalCredits = results.reduce(
      (acc, r) => acc + (r.course?.credits || 0),
      0,
    );
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  };

  const totalFees = fees.reduce((acc, f) => acc + f.amount, 0);
  const paidFees = fees.reduce((acc, f) => acc + (f.paid_amount || 0), 0);
  const outstandingFees = totalFees - paidFees;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <GraduationCap className="h-4 w-4" />
              <span>Student Portal</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Welcome, {profile?.full_name?.split(" ")[0] || "Student"}
            </h1>
            <p className="text-muted-foreground">
              Access your academic records, timetable, and financial information
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Current GPA",
                value: calculateGPA(),
                icon: BarChart3,
                color: "text-emerald-500",
              },
              {
                label: "Courses",
                value: results.length,
                icon: BookOpen,
                color: "text-secondary",
              },
              {
                label: "Total Credits",
                value: results.reduce(
                  (acc, r) => acc + (r.course?.credits || 0),
                  0,
                ),
                icon: FileText,
                color: "text-accent",
              },
              {
                label: "Fee Balance",
                value: `UGX ${outstandingFees.toLocaleString()}`,
                icon: CreditCard,
                color:
                  outstandingFees > 0 ? "text-destructive" : "text-emerald-500",
              },
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
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <p className="text-xl md:text-2xl font-bold">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="results" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Results</span>
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Assignments</span>
              </TabsTrigger>
              <TabsTrigger value="timetable" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Timetable</span>
              </TabsTrigger>
              <TabsTrigger value="finances" className="gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Finances</span>
              </TabsTrigger>
            </TabsList>

            {/* Assignments Tab */}
            <TabsContent value="assignments">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Course Assignments</CardTitle>
                      <CardDescription>
                        View and download your assignment documents
                      </CardDescription>
                    </div>
                    <Link to="/assignments">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <div className="text-center py-12">
                      <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">
                        No assignments yet
                      </h3>
                      <p className="text-muted-foreground">
                        Your assignments will appear here once posted by
                        lecturers
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map((assignment, i) => {
                        const isOverdue =
                          new Date(assignment.dueDate) < new Date() &&
                          assignment.status === "pending";
                        return (
                          <motion.div
                            key={assignment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">
                                    {assignment.title}
                                  </h4>
                                  <Badge
                                    className={`text-xs ${
                                      assignment.status === "pending"
                                        ? "bg-amber-500/20 text-amber-700"
                                        : assignment.status === "submitted"
                                          ? "bg-blue-500/20 text-blue-700"
                                          : "bg-emerald-500/20 text-emerald-700"
                                    }`}
                                  >
                                    {assignment.status.charAt(0).toUpperCase() +
                                      assignment.status.slice(1)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {assignment.courseCode
                                    ? `${assignment.courseCode} - `
                                    : ""}
                                  {assignment.courseTitle}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    Due{" "}
                                    {new Date(
                                      assignment.dueDate,
                                    ).toLocaleDateString()}
                                    {isOverdue && (
                                      <AlertCircle className="h-4 w-4 text-red-600" />
                                    )}
                                  </span>
                                  <span>{assignment.totalPoints} points</span>
                                </div>
                              </div>
                              {assignment.score !== undefined && (
                                <div className="text-right">
                                  <p className="text-lg font-bold text-emerald-600">
                                    {assignment.score}/{assignment.totalPoints}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Score
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Document Download */}
                            {assignment.instructionDocumentUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 w-full"
                                onClick={() =>
                                  handleDownloadDocument(
                                    assignment.instructionDocumentUrl!,
                                    assignment.instructionDocumentName ||
                                      "assignment-document.pdf",
                                  )
                                }
                                disabled={downloadingDocument}
                              >
                                <Download className="h-4 w-4" />
                                Download {assignment.instructionDocumentName}
                              </Button>
                            )}

                            {/* Feedback */}
                            {assignment.feedback && (
                              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-300/30">
                                <p className="text-xs font-semibold text-emerald-700 mb-1">
                                  Feedback
                                </p>
                                <p className="text-sm text-emerald-600">
                                  {assignment.feedback}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Examination Results</CardTitle>
                      <CardDescription>
                        View your academic performance across all semesters
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Transcript
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {results.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">
                        No results available
                      </h3>
                      <p className="text-muted-foreground">
                        Your exam results will appear here once released
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Course
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Credits
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Marks
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Grade
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Points
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Semester
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {results.map((result, i) => (
                            <motion.tr
                              key={result.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="hover:bg-muted/50"
                            >
                              <td className="py-3 px-4">
                                <div>
                                  <Badge
                                    variant="outline"
                                    className="text-xs font-mono mb-1"
                                  >
                                    {result.course?.code}
                                  </Badge>
                                  <p className="text-sm font-medium">
                                    {result.course?.title}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {result.course?.credits}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium">
                                {result.marks}%
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  className={`${
                                    result.grade?.startsWith("A")
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : result.grade?.startsWith("B")
                                        ? "bg-accent/10 text-accent"
                                        : result.grade?.startsWith("C")
                                          ? "bg-amber-500/10 text-amber-600"
                                          : "bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  {result.grade}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm font-medium">
                                {result.grade_point}
                              </td>
                              <td className="py-3 px-4 text-sm text-muted-foreground">
                                {result.semester} {result.academic_year}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timetable Tab */}
            <TabsContent value="timetable">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Class Timetable</CardTitle>
                      <CardDescription>
                        Your weekly class schedule
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {schedules.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">
                        No schedule available
                      </h3>
                      <p className="text-muted-foreground">
                        Your class schedule will appear here once you're
                        enrolled
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {DAYS.slice(1, 6).map((day, dayIndex) => {
                        const daySchedules = schedules.filter(
                          (s) => s.day_of_week === dayIndex + 1,
                        );
                        if (daySchedules.length === 0) return null;

                        return (
                          <div key={day} className="space-y-3">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                              {day}
                            </h3>
                            <div className="grid gap-2">
                              {daySchedules.map((schedule) => (
                                <motion.div
                                  key={schedule.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Clock className="h-6 w-6 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge
                                        variant="outline"
                                        className="text-xs font-mono"
                                      >
                                        {schedule.course?.code}
                                      </Badge>
                                    </div>
                                    <p className="font-medium truncate">
                                      {schedule.course?.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {schedule.start_time} -{" "}
                                      {schedule.end_time} • {schedule.building}{" "}
                                      {schedule.room}
                                    </p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Finances Tab */}
            <TabsContent value="finances">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Fee Summary */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Tuition Fees</CardTitle>
                          <CardDescription>
                            Your fee breakdown and payment status
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {fees.length === 0 ? (
                        <div className="text-center py-12">
                          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-semibold text-lg mb-2">
                            No fees recorded
                          </h3>
                          <p className="text-muted-foreground">
                            Your fee information will appear here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {fees.map((fee, i) => {
                            const isPaid = fee.paid_amount >= fee.amount;
                            const isPartial =
                              fee.paid_amount > 0 &&
                              fee.paid_amount < fee.amount;

                            return (
                              <motion.div
                                key={fee.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-4 rounded-lg border bg-card"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline">
                                        {fee.semester} {fee.academic_year}
                                      </Badge>
                                      <Badge
                                        className={`${
                                          isPaid
                                            ? "bg-emerald-500/10 text-emerald-600"
                                            : isPartial
                                              ? "bg-amber-500/10 text-amber-600"
                                              : "bg-destructive/10 text-destructive"
                                        }`}
                                      >
                                        {isPaid
                                          ? "Paid"
                                          : isPartial
                                            ? "Partial"
                                            : "Unpaid"}
                                      </Badge>
                                    </div>
                                    <p className="font-medium">
                                      {fee.description || "Tuition Fee"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Due:{" "}
                                      {new Date(
                                        fee.due_date,
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold">
                                      UGX {fee.amount.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Paid: UGX{" "}
                                      {(fee.paid_amount || 0).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* PRN Generator */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-24">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Generate PRN
                      </CardTitle>
                      <CardDescription>
                        Generate a Payment Reference Number for tuition payment
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Outstanding Balance
                        </p>
                        <p className="text-3xl font-bold text-destructive">
                          UGX {outstandingFees.toLocaleString()}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Total Fees
                          </span>
                          <span>UGX {totalFees.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Amount Paid
                          </span>
                          <span className="text-emerald-600">
                            UGX {paidFees.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {outstandingFees > 0 && (
                        <Button
                          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          onClick={() => {
                            const prn = generatePRN();
                            alert(
                              `Your PRN: ${prn}\n\nUse this reference when making payment at any bank.`,
                            );
                          }}
                        >
                          Generate PRN
                        </Button>
                      )}

                      {outstandingFees <= 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">All fees cleared!</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}