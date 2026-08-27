import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Download,
  Upload as UploadIcon,
  X,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend, deleteBackend } from "@/lib/backendApi";
import { useToast } from "@/components/ui/use-toast";

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalPoints: number;
  submissions: number;
  totalStudents: number;
  status: "draft" | "active" | "closed" | "graded";
  rubric?: string;
  averageScore?: number;
  courseTitle?: string;
  instructionDocumentUrl?: string;
  instructionDocumentName?: string;
}

interface CourseOption {
  id: string;
  title: string;
  code: string;
}

interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  content: string;
  file_url?: string;
  file_name?: string;
  status: string;
  submitted_at: any;
  score?: number;
  feedback?: string;
  student_name?: string;
  student_email?: string;
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export default function LecturerAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "active" | "closed" | "graded"
  >("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<Assignment | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<Submission[]>(
    [],
  );
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"assignments" | "submissions">(
    "assignments",
  );
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    totalPoints: 100,
    instructionDocument: null as File | null,
  });
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    totalPoints: 100,
    courseId: "",
    instructionDocument: null as File | null,
  });
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // Load assignments created by this lecturer from the API
  useEffect(() => {
    const loadAssignments = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await getBackend<any[]>(
          `/api/assignments/?lecturer_id=${encodeURIComponent(user.uid)}`,
        );

        const mapped: Assignment[] = data.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          dueDate: item.due_date,
          totalPoints: item.total_points ?? 100,
          submissions: 0,
          totalStudents: 0,
          status: item.status || "draft",
          courseTitle: item.course_title || "",
          instructionDocumentUrl: item.instruction_document_url || undefined,
          instructionDocumentName: item.instruction_document_name || undefined,
        }));

        setAssignments(mapped);
      } catch (error: any) {
        console.error("Error loading assignments", error);
        toast({
          title: "Could not load assignments",
          description: error.message || "Failed to load assignments",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, [toast, user]);

  // Load lecturer courses from backend
  useEffect(() => {
    const loadCourses = async () => {
      if (!user) return;
      try {
        const profiles = await getBackend<any[]>("/api/profiles/?role=lecturer");
        const lecturerProfile = profiles.find(
          (p: any) => p.email === user.email,
        );
        const assignedCourseUnits: string[] =
          lecturerProfile?.assigned_course_units || [];

        if (assignedCourseUnits.length > 0) {
          const courseUnitsData = await getBackend<any[]>("/api/course-units/");
          const mapped: CourseOption[] = courseUnitsData
            .filter((cu: any) => assignedCourseUnits.includes(cu.id) || assignedCourseUnits.includes(cu.course_id))
            .map((cu: any) => ({
              id: cu.id || cu.course_id,
              title:
                cu.name || cu.course_unit_name || "Unknown Course",
              code:
                cu.code || cu.course_unit_code || "Unknown",
            }));
          setCourses(mapped);
        } else {
          setCourses([]);
        }
      } catch (error) {
        console.error("Error loading courses", error);
        setCourses([]);
      }
    };
    loadCourses();
  }, [user]);

  const filteredAssignments =
    selectedFilter === "all"
      ? assignments
      : assignments.filter((a) => a.status === selectedFilter);

  const stats = {
    activeCount: assignments.filter((a) => a.status === "active").length,
    closedCount: assignments.filter((a) => a.status === "closed").length,
    gradedCount: assignments.filter((a) => a.status === "graded").length,
    averageSubmissionRate: assignments.length
      ? (
          assignments.reduce((acc, a) => {
            if (!a.totalStudents || a.totalStudents === 0) return acc;
            return acc + a.submissions / a.totalStudents;
          }, 0) /
            assignments.filter((a) => a.totalStudents && a.totalStudents > 0)
              .length || 0
        ).toFixed(1)
      : "0.0",
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "closed":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "graded":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "draft":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleCreateAssignment = async () => {
    if (!user || !formData.title || !formData.dueDate || !selectedCourse) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select a course",
        variant: "destructive",
      });
      return;
    }

    // Ensure the selected course looks like a UUID to avoid invalid input errors
    if (selectedCourse && selectedCourse.includes("course-")) {
      toast({
        title: "Invalid course selection",
        description: "Please choose a real course from the list.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const course = courses.find((c) => c.id === selectedCourse);

      const payload = {
        lecturer_id: user.uid,
        course_id: selectedCourse,
        course_title: course?.title || "",
        course_code: course?.code || "",
        title: formData.title,
        description: formData.description,
        due_date: new Date(formData.dueDate).toISOString(),
        total_points: formData.totalPoints,
        status: "draft",
      };

      const created = await postBackend<any>("/api/assignments/", payload);

      const newAssignment: Assignment = {
        id: created.id,
        title: created.title,
        description: created.description,
        dueDate: created.due_date,
        totalPoints: created.total_points,
        submissions: 0,
        totalStudents: 0,
        status: created.status || "draft",
        courseTitle: created.course_title || course?.title,
        instructionDocumentUrl:
          created.instruction_document_url || instructionDocUrl || undefined,
        instructionDocumentName:
          created.instruction_document_name || instructionDocName || undefined,
      };
      setAssignments((prev) => [...prev, newAssignment]);
      setFormData({
        title: "",
        description: "",
        dueDate: "",
        totalPoints: 100,
        instructionDocument: null,
      });
      setShowCreateModal(false);
      toast({
        title: "Success",
        description: "Assignment created successfully.",
      });
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingDocument(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!user) return;

    try {
      await deleteBackend(`/api/assignments/${assignmentId}/`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast({ title: "Assignment deleted" });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadSubmissions = async (assignmentId: string) => {
    setLoadingSubmissions(true);
    try {
      const submissionsData = await getBackend<any[]>(
        `/api/submissions/?assignment_ids=${encodeURIComponent(assignmentId)}`,
      );

      // Get student profiles
      const allProfiles = await getBackend<any[]>("/api/profiles/");
      const profileMap = new Map<string, any>();
      allProfiles.forEach((p: any) => profileMap.set(p.id, p));

      const submissionsWithStudents: Submission[] = submissionsData.map((s: any) => {
        const studentData = profileMap.get(s.student_id) || {};
        return {
          id: s.id,
          student_id: s.student_id,
          assignment_id: s.assignment_id,
          content: s.content || "",
          status: s.status || "submitted",
          submitted_at: s.submitted_at,
          score: s.score,
          feedback: s.feedback,
          student_name: studentData.full_name || "Unknown Student",
          student_email: studentData.email || "No email",
        };
      });

      setViewingSubmissions(submissionsWithStudents);
    } catch (error: any) {
      console.error("Error loading submissions:", error);
      toast({
        title: "Could not load submissions",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoadingSubmissions(false);
  };

  const updateSubmission = async (
    submissionId: string,
    updates: { status?: string; score?: number; feedback?: string },
  ) => {
    try {
      await postBackend(`/api/submissions/${submissionId}/update/`, updates);

      // Update local state
      setViewingSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId ? { ...sub, ...updates } : sub,
        ),
      );

      toast({
        title: "Submission updated",
        description: "The submission has been graded successfully.",
      });
    } catch (error: any) {
      console.error("Error updating submission:", error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (assignment: Assignment) => {
    const course = courses.find((c) => c.title === assignment.courseTitle);
    setEditing(assignment);
    setEditFormData({
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate.slice(0, 10),
      totalPoints: assignment.totalPoints,
      courseId: course?.id || selectedCourse || courses[0]?.id || "",
      instructionDocument: null,
    });
  };

  const handleUpdateAssignment = async () => {
    if (!editing || !user) return;
    if (
      !editFormData.title ||
      !editFormData.dueDate ||
      !editFormData.courseId
    ) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const course = courses.find((c) => c.id === editFormData.courseId);

      const payload = {
        title: editFormData.title,
        description: editFormData.description,
        due_date: new Date(editFormData.dueDate).toISOString(),
        total_points: editFormData.totalPoints,
        course_id: editFormData.courseId,
        course_title: course?.title || "",
        course_code: course?.code || "",
      };

      await postBackend(`/api/assignments/${editing.id}/update/`, payload);
      const updated: Assignment = {
        id: editing.id,
        title: editFormData.title,
        description: editFormData.description || "",
        dueDate: new Date(editFormData.dueDate).toISOString(),
        totalPoints: editFormData.totalPoints,
        submissions: editing.submissions,
        totalStudents: editing.totalStudents,
        status: editing.status,
        courseTitle: course?.title,
      };

      setAssignments((prev) =>
        prev.map((a) => (a.id === editing.id ? updated : a)),
      );
      setEditing(null);
      toast({ title: "Assignment updated" });
    } catch (error: any) {
      console.error("Error updating assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingDocument(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white pb-28">
      <main className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {/* No Courses Message */}
        {courses.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-gray-700 mb-4 text-lg font-medium">
              You haven't selected any courses yet.
            </p>
            <p className="text-gray-600 mb-6">
              Please select the courses you teach to create and manage
              assignments.
            </p>
            <Button
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all"
              onClick={() => navigate("/lecturer/courses")}
            >
              Select Courses
            </Button>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl shadow-lg">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Assignments
                </h1>
                <p className="text-base text-gray-600 mt-1">
                  Create and manage course assignments effortlessly
                </p>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg hover:shadow-xl gap-2 px-6 py-3 h-auto text-base transition-all"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-5 w-5" /> New Assignment
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="bg-white border-2 border-emerald-200 shadow-md hover:shadow-lg hover:border-emerald-300 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Active Assignments
                      </p>
                      <p className="text-3xl font-bold text-emerald-600 mt-2">
                        {stats.activeCount}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-full">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white border-2 border-amber-200 shadow-md hover:shadow-lg hover:border-amber-300 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Closed
                      </p>
                      <p className="text-3xl font-bold text-amber-600 mt-2">
                        {stats.closedCount}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-full">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-white border-2 border-orange-200 shadow-md hover:shadow-lg hover:border-orange-300 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Graded
                      </p>
                      <p className="text-3xl font-bold text-amber-600 mt-2">
                        {stats.gradedCount}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-amber-200 shadow-md hover:shadow-lg hover:border-amber-300 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Avg Submit Rate
                      </p>
                      <p className="text-3xl font-bold text-amber-600 mt-2">
                        {stats.averageSubmissionRate}%
                      </p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-full">
                      <Users className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Assignments List */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "assignments" | "submissions")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="assignments" className="text-lg py-3">
              📝 Assignments
            </TabsTrigger>
            <TabsTrigger value="submissions" className="text-lg py-3">
              📄 Submissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4">
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex gap-3 flex-wrap"
            >
              {(["all", "active", "closed", "graded"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-6 py-2 rounded-full font-semibold transition-all ${
                      selectedFilter === filter
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg hover:shadow-xl"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ),
              )}
            </motion.div>

            {filteredAssignments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gray-100 rounded-full">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <p className="text-gray-600 text-lg font-medium">
                  No assignments yet
                </p>
                <p className="text-gray-500 mt-2">
                  Create your first assignment to get started
                </p>
              </motion.div>
            ) : (
              filteredAssignments.map((assignment, i) => (
                <motion.div
                  key={assignment.id}
                  variants={rise}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                >
                  <Card className="border-2 border-gray-200 bg-white shadow-sm hover:shadow-xl hover:border-orange-300 transition-all overflow-hidden">
                    <CardContent className="pt-0">
                      <div className="space-y-5">
                        {/* Top Section */}
                        <div className="pt-6 px-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg">
                                  <FileText className="h-5 w-5 text-amber-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">
                                  {assignment.title}
                                </h3>
                              </div>
                              <p className="text-gray-700 text-base mb-4 leading-relaxed">
                                {assignment.description}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                  setViewing(assignment);
                                  loadSubmissions(assignment.id);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                                onClick={() => handleOpenEdit(assignment)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  handleDeleteAssignment(assignment.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex gap-2 flex-wrap mb-5">
                            <Badge
                              variant="outline"
                              className={`font-semibold border-2 ${getStatusColor(
                                assignment.status,
                              )}`}
                            >
                              {assignment.status.charAt(0).toUpperCase() +
                                assignment.status.slice(1)}
                            </Badge>
                            {assignment.courseTitle && (
                              <Badge
                                variant="secondary"
                                className="gap-1 bg-orange-100 text-orange-700 border-orange-300 border-2"
                              >
                                <FileText className="h-3 w-3" />
                                {assignment.courseTitle}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="gap-1 border-gray-300 text-gray-700 border-2"
                            >
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                assignment.dueDate,
                              ).toLocaleDateString()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="gap-1 border-gray-300 text-gray-700 border-2"
                            >
                              <Users className="h-3 w-3" />
                              {assignment.submissions}/
                              {assignment.totalStudents} submitted
                            </Badge>
                            <Badge className="gap-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white border-0">
                              {assignment.totalPoints} pts
                            </Badge>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700">
                              Submission Progress
                            </span>
                            <span className="text-sm font-bold text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                              {assignment.totalStudents > 0
                                ? (
                                    (assignment.submissions /
                                      assignment.totalStudents) *
                                    100
                                  ).toFixed(0)
                                : "0"}
                              %
                            </span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${
                                  assignment.totalStudents > 0
                                    ? (assignment.submissions /
                                        assignment.totalStudents) *
                                      100
                                    : 0
                                }%`,
                              }}
                              transition={{ delay: 0.5, duration: 1 }}
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-600"
                            />
                          </div>
                        </div>

                        {/* Average Score if graded */}
                        {assignment.averageScore && (
                          <div className="px-6 pb-6">
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border-2 border-emerald-200">
                              <div className="p-2 bg-emerald-100 rounded-full">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                              </div>
                              <span className="text-base">
                                <span className="text-gray-600">
                                  Average Score:{" "}
                                </span>
                                <span className="font-bold text-emerald-600">
                                  {assignment.averageScore}%
                                </span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    All Submissions
                  </h2>
                  <p className="text-gray-600 mt-1">
                    View and download student submissions
                  </p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {assignments.reduce(
                    (total, assignment) => total + assignment.submissions,
                    0,
                  )}{" "}
                  Total Submissions
                </Badge>
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Assignments Yet
                  </h3>
                  <p className="text-gray-600">
                    Create your first assignment to start receiving submissions.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="border border-gray-200 rounded-xl p-6 bg-gray-50/50"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {assignment.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due:{" "}
                              {new Date(
                                assignment.dueDate,
                              ).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {assignment.submissions}/
                              {assignment.totalStudents} submitted
                            </span>
                            <Badge
                              className={`text-xs ${getStatusColor(assignment.status)}`}
                            >
                              {assignment.status.charAt(0).toUpperCase() +
                                assignment.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewing(assignment);
                            loadSubmissions(assignment.id);
                          }}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </div>

                      {assignment.submissions > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">
                              Recent Submissions
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewing(assignment);
                                loadSubmissions(assignment.id);
                              }}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              View All ({assignment.submissions})
                            </Button>
                          </div>
                          <div className="text-sm text-gray-600">
                            Click "View Details" to see all submissions and
                            download files.
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <UploadIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>No submissions yet</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Assignment Modal */}
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">
                  Create Assignment
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2 text-gray-900">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all"
                >
                  <option value="">Select a course...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code
                        ? `${course.code} - ${course.title}`
                        : course.title}
                    </option>
                  ))}
                </select>
                {courses.length === 0 && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-600">
                      No courses found. Please select the courses you teach
                      first.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/lecturer/courses")}
                      className="w-full border-gray-300"
                    >
                      Select Courses
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2 text-gray-900">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="e.g., Midterm Exam"
                />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2 text-gray-900">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                  placeholder="Describe the assignment..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-2 text-gray-900">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2 text-gray-900">
                    Points <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.totalPoints}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalPoints: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2 text-gray-900">
                  Instructions (Optional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".doc,.docx,.pdf,.txt"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        instructionDocument: e.target.files?.[0] || null,
                      })
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-600"
                    disabled={uploadingDocument}
                  />
                </div>
                {formData.instructionDocument && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg flex items-center justify-between border border-green-200">
                    <span className="text-xs text-gray-600 truncate">
                      ✓ {formData.instructionDocument.name}
                    </span>
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          instructionDocument: null,
                        })
                      }
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border-2 border-gray-300 text-gray-700"
                  disabled={loading || uploadingDocument}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAssignment}
                  disabled={loading || uploadingDocument}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg hover:shadow-xl"
                >
                  {uploadingDocument
                    ? "Uploading..."
                    : loading
                      ? "Creating..."
                      : "Create"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* View Assignment Modal */}
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {viewing.title}
                </h2>
                <button
                  onClick={() => {
                    setViewing(null);
                    setViewingSubmissions([]);
                    setEditingSubmission(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 text-base whitespace-pre-wrap leading-relaxed">
                  {viewing.description || "No description provided"}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">
                    Due Date:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(viewing.dueDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">
                    Points:
                  </span>
                  <span className="text-sm font-semibold text-amber-600">
                    {viewing.totalPoints} pts
                  </span>
                </div>
                {viewing.courseTitle && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">
                      Course:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {viewing.courseTitle}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">
                    Status:
                  </span>
                  <Badge
                    className={`font-semibold ${getStatusColor(
                      viewing.status,
                    )}`}
                  >
                    {viewing.status.charAt(0).toUpperCase() +
                      viewing.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {viewing.instructionDocumentUrl && (
                <div className="p-4 rounded-lg bg-orange-50 border-2 border-orange-200">
                  <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                    📎 Instruction Document
                  </p>
                  <a
                    href={viewing.instructionDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors px-3 py-2 bg-orange-100 rounded-lg"
                  >
                    <Download className="h-4 w-4" />
                    {viewing.instructionDocumentName || "Download Instructions"}
                  </a>
                </div>
              )}

              {/* Submissions Section */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Student Submissions ({viewing.submissions})
                  </h3>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {viewing.submissions}/{viewing.totalStudents} submitted
                  </Badge>
                </div>

                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    <span className="ml-2 text-gray-600">
                      Loading submissions...
                    </span>
                  </div>
                ) : viewingSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {viewingSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {submission.student_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {submission.student_email}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              className={`text-xs ${
                                submission.status === "submitted"
                                  ? "bg-green-100 text-green-800"
                                  : submission.status === "graded"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {submission.status}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {submission.submitted_at
                                ? new Date(submission.submitted_at).toLocaleDateString()
                                : "Unknown date"}
                            </p>
                          </div>
                        </div>

                        {submission.content && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                              {submission.content}
                            </p>
                          </div>
                        )}

                          {submission.file_url && (
                          <div className="flex items-center gap-2">
                            <UploadIcon className="h-4 w-4 text-gray-500" />
                            <a
                              href={submission.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              {submission.file_name ||
                                "Download submission file"}
                            </a>
                          </div>
                        )}

                        {/* Grading Section */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {editingSubmission?.id === submission.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-sm font-medium">
                                    Status
                                  </Label>
                                  <Select
                                    value={editingSubmission.status}
                                    onValueChange={(value) =>
                                      setEditingSubmission((prev) =>
                                        prev
                                          ? { ...prev, status: value }
                                          : null,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="submitted">
                                        Submitted
                                      </SelectItem>
                                      <SelectItem value="reviewed">
                                        Reviewed
                                      </SelectItem>
                                      <SelectItem value="graded">
                                        Graded
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">
                                    Score (out of {viewing.totalPoints})
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={viewing.totalPoints}
                                    value={editingSubmission.score || ""}
                                    onChange={(e) =>
                                      setEditingSubmission((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              score: e.target.value
                                                ? parseInt(e.target.value)
                                                : undefined,
                                            }
                                          : null,
                                      )
                                    }
                                    className="mt-1"
                                    placeholder="Enter score"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">
                                  Feedback
                                </Label>
                                <Textarea
                                  value={editingSubmission.feedback || ""}
                                  onChange={(e) =>
                                    setEditingSubmission((prev) =>
                                      prev
                                        ? { ...prev, feedback: e.target.value }
                                        : null,
                                    )
                                  }
                                  className="mt-1"
                                  placeholder="Enter feedback for the student..."
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    if (editingSubmission) {
                                      await updateSubmission(
                                        editingSubmission.id,
                                        {
                                          status: editingSubmission.status,
                                          score: editingSubmission.score,
                                          feedback: editingSubmission.feedback,
                                        },
                                      );
                                      setEditingSubmission(null);
                                    }
                                  }}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Save Changes
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingSubmission(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {submission.score !== null &&
                                submission.score !== undefined ? (
                                  <span className="text-sm font-medium text-gray-600">
                                    Score: {submission.score}/
                                    {viewing.totalPoints}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500">
                                    Not graded yet
                                  </span>
                                )}
                                {submission.feedback && (
                                  <span className="text-sm text-gray-600">
                                    Feedback provided
                                  </span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSubmission(submission)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Grade
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 text-gray-700"
                  onClick={() => {
                    setViewing(null);
                    setViewingSubmissions([]);
                    setEditingSubmission(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg"
                  onClick={() => {
                    handleOpenEdit(viewing);
                    setViewing(null);
                    setViewingSubmissions([]);
                    setEditingSubmission(null);
                  }}
                >
                  Edit
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Assignment Modal */}
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">
                  Edit Assignment
                </h2>
                <button
                  onClick={() => setEditing(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2 text-gray-900">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFormData.courseId}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      courseId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all"
                >
                  <option value="">Select a course...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code
                        ? `${course.code} - ${course.title}`
                        : course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2 text-gray-900">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all"
                  placeholder="Assignment title"
                />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2 text-gray-900">
                  Description
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                  placeholder="Describe the assignment..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-2 text-gray-900">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editFormData.dueDate}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        dueDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2 text-gray-900">
                    Points <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editFormData.totalPoints}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        totalPoints: parseInt(e.target.value || "0"),
                      })
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2 text-gray-900">
                  Instructions (Optional)
                </label>
                {editing?.instructionDocumentUrl && (
                  <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs text-gray-600 mb-2 font-medium">
                      Current document:
                    </p>
                    <a
                      href={editing.instructionDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-orange-600 hover:text-orange-700"
                    >
                      <Download className="h-3 w-3" />
                      {editing.instructionDocumentName || "Download Current"}
                    </a>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="file"
                    accept=".doc,.docx,.pdf,.txt"
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        instructionDocument: e.target.files?.[0] || null,
                      })
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-600"
                    disabled={uploadingDocument}
                  />
                </div>
                {editFormData.instructionDocument && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg flex items-center justify-between border border-green-200">
                    <span className="text-xs text-gray-600 truncate">
                      ✓ {editFormData.instructionDocument.name}
                    </span>
                    <button
                      onClick={() =>
                        setEditFormData({
                          ...editFormData,
                          instructionDocument: null,
                        })
                      }
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditing(null)}
                  className="flex-1 border-2 border-gray-300 text-gray-700"
                  disabled={loading || uploadingDocument}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateAssignment}
                  disabled={loading || uploadingDocument}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg hover:shadow-xl"
                >
                  {uploadingDocument
                    ? "Uploading..."
                    : loading
                      ? "Saving..."
                      : "Save Changes"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>

      <LecturerBottomNav />
    </div>
  );
}
