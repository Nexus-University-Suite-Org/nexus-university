import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  Filter,
  BookOpen,
  ClipboardList,
  Upload,
  X,
} from "lucide-react";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { getBackend, postBackend, getMessagingBackend } from "@/lib/backendApi";

interface StudentAssignment {
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
  submissionStatus?: string;
  score?: number;
  feedback?: string;
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export default function StudentAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "pending" | "submitted" | "graded"
  >("all");
  const [selectedAssignment, setSelectedAssignment] =
    useState<StudentAssignment | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load assignments for enrolled courses
  useEffect(() => {
    if (!user) return;
    const loadAssignments = async () => {
      try {
        setLoading(true);
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
        const resp = await fetch(`${API_BASE_URL}/api/assignments/`);
        if (!resp.ok) throw new Error("Failed to fetch assignments");
        const data = (await resp.json()) as any[];

        const mapped: StudentAssignment[] = data.map((a, idx) => ({
          id: String(a.id),
          title: a.title,
          description: a.description || "",
          dueDate: a.due_date || new Date().toISOString(),
          totalPoints: a.total_points || 100,
          courseTitle: a.course_title || "Course",
          courseCode: a.course_code || "",
          status: a.status === "pending" ? "pending" : a.status || "pending",
          instructionDocumentUrl: a.instruction_document_url || undefined,
          instructionDocumentName: a.instruction_document_name || undefined,
        }));

        setAssignments(mapped);
      } catch (error: any) {
        console.error("Error loading assignments:", error);
        toast({
          title: "Could not load assignments",
          description:
            error.message || "There was an error loading your assignments.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, [user, toast]);

  const filteredAssignments =
    selectedFilter === "all"
      ? assignments
      : assignments.filter((a) => a.status === selectedFilter);

  const stats = {
    total: assignments.length,
    pending: assignments.filter((a) => a.status === "pending").length,
    submitted: assignments.filter((a) => a.status === "submitted").length,
    graded: assignments.filter((a) => a.status === "graded").length,
  };

  const handleDownloadDocument = async (url: string, filename: string) => {
    try {
      setDownloading(true);
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

      toast({
        title: "Download successful",
        description: `${filename} has been downloaded.`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Could not download the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!user || !selectedAssignment) return;

    if (!submissionText.trim() && !submissionFile) {
      toast({
        title: "Submission required",
        description: "Please provide either text content or upload a file.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // TODO: file upload not yet implemented
      if (submissionFile) {
        console.log("File upload not yet implemented - filename:", submissionFile.name);
      }

      // Save submission to database
      const submissionData = {
        student_id: user.uid,
        assignment_id: selectedAssignment.id,
        content: submissionText.trim(),
        file_url: null,
        file_name: submissionFile?.name || null,
        status: "submitted",
        score: null,
        feedback: null,
      };
      await postBackend("/api/submissions/", submissionData);

      toast({
        title: "Assignment submitted! 🎉",
        description: "Your assignment has been submitted successfully.",
      });

      // Reset form and close modal
      setSubmissionText("");
      setSubmissionFile(null);
      setShowSubmissionForm(false);
      setSelectedAssignment(null);

      // Refresh assignments to update status
      if (user) {
        const loadAssignments = async () => {
          try {
            setLoading(true);

            // Get all courses the student is enrolled in
            const enrollmentsData = await getMessagingBackend<any[]>("/api/enrollments/");
            const courseIds = enrollmentsData
              .map((d: any) => d.course_id)
              .filter(Boolean);

            if (courseIds.length === 0) {
              setAssignments([]);
              setLoading(false);
              return;
            }

            // Get all assignments for these courses
            const assignmentsData = await getBackend<any[]>("/api/assignments/");

            if (assignmentsData.length === 0) {
              setAssignments([]);
              setLoading(false);
              return;
            }

            const assignmentIds = assignmentsData.map((a: any) => a.id);

            // Get student's submissions for these assignments
            const submissionsData = await getBackend<any[]>("/api/submissions/");

            // Fetch course details for these assignments
            const uniqueCourseIds = Array.from(
              new Set(assignmentsData.map((a: any) => a.course_id)),
            );
            const courseUnitsData = await getBackend<any[]>("/api/course-units/");
            const courseMap = new Map();
            courseUnitsData.forEach((d: any) => courseMap.set(d.id, d));

            // Filter to show assignments that are visible to students (not closed or graded)
            const publishedAssignments = assignmentsData
              .filter((a) => a.status !== "closed" && a.status !== "graded")
              .sort(
                (a, b) =>
                  new Date(a.due_date).getTime() -
                  new Date(b.due_date).getTime(),
              );

            console.log("Published assignments:", publishedAssignments.length);
            console.log(
              "Assignment statuses found:",
              assignmentsData.map((a) => ({
                title: a.title,
                status: a.status,
              })),
            );
            console.log(
              "Visible assignments:",
              publishedAssignments.map((a) => ({
                title: a.title,
                status: a.status,
              })),
            );

            if (publishedAssignments.length === 0) {
              setAssignments([]);
              setLoading(false);
              return;
            }

            // Map assignments with submission status
            const mapped: StudentAssignment[] = publishedAssignments.map(
              (assignment: any) => {
                const submission = submissionsData.find(
                  (s) => s.assignment_id === assignment.id,
                );

                let status: "pending" | "submitted" | "graded" = "pending";
                if (submission?.status === "submitted") {
                  status =
                    submission.score !== undefined ? "graded" : "submitted";
                }

                const course = courseMap.get(assignment.course_id);

                return {
                  id: assignment.id,
                  title: assignment.title,
                  description: assignment.description || "",
                  dueDate: assignment.due_date,
                  totalPoints: assignment.total_points ?? 100,
                  courseTitle: course?.name || "Course",
                  courseCode: course?.code || "",
                  status,
                  instructionDocumentUrl: assignment.instruction_document_url,
                  instructionDocumentName: assignment.instruction_document_name,
                  submissionStatus: submission?.status,
                  score: submission?.score,
                  feedback: submission?.feedback,
                };
              },
            );

            setAssignments(mapped);
          } catch (error) {
            console.error("Error loading assignments:", error);
            toast({
              title: "Error loading assignments",
              description: "Could not load assignments. Please try again.",
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        };
        loadAssignments();
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: "Could not submit assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic file validation
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/jpeg",
        "image/png",
      ];

      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description:
            "Please select a PDF, Word document, text file, or image.",
          variant: "destructive",
        });
        return;
      }

      setSubmissionFile(file);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/20 text-amber-700 border-amber-300/30";
      case "submitted":
        return "bg-blue-500/20 text-blue-700 border-blue-300/30";
      case "graded":
        return "bg-emerald-500/20 text-emerald-700 border-emerald-300/30";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-300/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "submitted":
        return <Eye className="h-4 w-4" />;
      case "graded":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "today";
    if (date.toDateString() === tomorrow.toDateString()) return "tomorrow";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <StudentHeader />

      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Assignments</h1>
              <p className="text-sm text-muted-foreground">
                View and submit your course assignments
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card
                className="bg-blue-500/10 border-blue-300/30 cursor-pointer hover:border-blue-300/60 transition-colors"
                onClick={() => setSelectedFilter("all")}
              >
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.total}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card
                className="bg-amber-500/10 border-amber-300/30 cursor-pointer hover:border-amber-300/60 transition-colors"
                onClick={() => setSelectedFilter("pending")}
              >
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {stats.pending}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card
                className="bg-blue-500/10 border-blue-300/30 cursor-pointer hover:border-blue-300/60 transition-colors"
                onClick={() => setSelectedFilter("submitted")}
              >
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.submitted}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card
                className="bg-emerald-500/10 border-emerald-300/30 cursor-pointer hover:border-emerald-300/60 transition-colors"
                onClick={() => setSelectedFilter("graded")}
              >
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Graded</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {stats.graded}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Assignments List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">
                {selectedFilter === "all"
                  ? "No assignments yet"
                  : `No ${selectedFilter} assignments`}
              </p>
            </motion.div>
          ) : (
            filteredAssignments.map((assignment, i) => (
              <motion.div
                key={assignment.id}
                custom={i}
                variants={rise}
                initial="hidden"
                animate="visible"
              >
                <Card className="bg-card/50 border-border/60 hover:border-border transition-colors overflow-hidden">
                  <CardContent className="p-0">
                    <div
                      className="p-4 sm:p-6 space-y-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setSelectedAssignment(assignment)}
                    >
                      {/* Title and Status */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <h3 className="text-lg font-semibold">
                              {assignment.title}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {assignment.courseCode
                              ? `${assignment.courseCode} - `
                              : ""}
                            {assignment.courseTitle}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(
                            assignment.status,
                          )} flex items-center gap-1 whitespace-nowrap`}
                        >
                          {getStatusIcon(assignment.status)}
                          <span className="capitalize">
                            {assignment.status}
                          </span>
                        </Badge>
                      </div>

                      {/* Due Date and Points */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span
                            className={
                              isOverdue(assignment.dueDate) &&
                              assignment.status === "pending"
                                ? "text-red-600 font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            Due {formatDueDate(assignment.dueDate)}
                          </span>
                          {isOverdue(assignment.dueDate) &&
                            assignment.status === "pending" && (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="hidden sm:inline">•</span>
                          <span>{assignment.totalPoints} points</span>
                        </div>
                      </div>

                      {/* Description */}
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      {/* Score if graded */}
                      {assignment.score !== undefined && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-300/30">
                          <p className="text-sm font-semibold text-emerald-700">
                            Score: {assignment.score}/{assignment.totalPoints}
                          </p>
                          {assignment.feedback && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {assignment.feedback}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Document Download Button */}
                      {assignment.instructionDocumentUrl && (
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 flex-1 sm:flex-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadDocument(
                                assignment.instructionDocumentUrl!,
                                assignment.instructionDocumentName ||
                                  "assignment-document.pdf",
                              );
                            }}
                            disabled={downloading}
                          >
                            <Download className="h-4 w-4" />
                            Download Instructions
                          </Button>
                          <span className="text-xs text-muted-foreground ml-2">
                            {assignment.instructionDocumentName}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Detailed View Modal */}
      {selectedAssignment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSelectedAssignment(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border/60 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h2 className="text-2xl font-bold">
                  {selectedAssignment.title}
                </h2>
                <p className="text-muted-foreground">
                  {selectedAssignment.courseCode
                    ? `${selectedAssignment.courseCode} - `
                    : ""}
                  {selectedAssignment.courseTitle}
                </p>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/60">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(
                    selectedAssignment.status,
                  )} flex items-center gap-1 w-fit`}
                >
                  {getStatusIcon(selectedAssignment.status)}
                  <span className="capitalize">
                    {selectedAssignment.status}
                  </span>
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                <p className="font-semibold">
                  {new Date(selectedAssignment.dueDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Points</p>
                <p className="font-semibold">
                  {selectedAssignment.totalPoints}
                </p>
              </div>
              {selectedAssignment.score !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Your Score
                  </p>
                  <p className="font-semibold text-emerald-600">
                    {selectedAssignment.score}/{selectedAssignment.totalPoints}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedAssignment.description && (
              <div className="space-y-2">
                <h3 className="font-semibold">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedAssignment.description}
                </p>
              </div>
            )}

            {/* Feedback */}
            {selectedAssignment.feedback && (
              <div className="space-y-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-300/30">
                <h3 className="font-semibold text-emerald-700">
                  Lecturer Feedback
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedAssignment.feedback}
                </p>
              </div>
            )}

            {/* Document Download */}
            {selectedAssignment.instructionDocumentUrl && (
              <div className="space-y-2 p-4 rounded-lg bg-primary/10 border border-primary/30">
                <h3 className="font-semibold">Assignment Instructions</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedAssignment.instructionDocumentName}
                </p>
                <Button
                  className="gap-2 w-full"
                  onClick={() =>
                    handleDownloadDocument(
                      selectedAssignment.instructionDocumentUrl!,
                      selectedAssignment.instructionDocumentName ||
                        "assignment-document.pdf",
                    )
                  }
                  disabled={downloading}
                >
                  <Download className="h-4 w-4" />
                  Download Document
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedAssignment(null)}
              >
                Close
              </Button>
              {selectedAssignment.status === "pending" && (
                <Button
                  className="flex-1 gap-2"
                  onClick={() => setShowSubmissionForm(true)}
                >
                  <FileText className="h-4 w-4" />
                  Submit Assignment
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Submission Form Modal */}
      {showSubmissionForm && selectedAssignment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowSubmissionForm(false)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border/60 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h2 className="text-2xl font-bold">Submit Assignment</h2>
                <p className="text-muted-foreground">
                  {selectedAssignment.title}
                </p>
              </div>
              <button
                onClick={() => setShowSubmissionForm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Text Submission */}
              <div className="space-y-2">
                <Label htmlFor="submission-text">Assignment Content</Label>
                <Textarea
                  id="submission-text"
                  placeholder="Type your assignment submission here..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload Document (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {submissionFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSubmissionFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {submissionFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {submissionFile.name} (
                    {(submissionFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, Word documents, text files, images.
                  Max size: 10MB
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSubmissionForm(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSubmitAssignment}
                disabled={
                  submitting || (!submissionText.trim() && !submissionFile)
                }
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit Assignment
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <StudentBottomNav />
    </div>
  );
}
