import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Play,
  BarChart3,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Settings,
  ChevronDown,
  Calendar,
  BookOpen,
  TrendingUp,
  Award,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend } from "@/lib/backendApi";
import { useToast } from "@/components/ui/use-toast";
import { autoCloseExpiredQuizzes } from "@/lib/quizUtils";

interface Quiz {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseTitle: string;
  courseCode?: string;
  totalQuestions: number;
  totalPoints: number;
  timeLimit: number; // in minutes
  passingScore: number;
  dueDate: string;
  status: "draft" | "active" | "closed";
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  showAnswers: boolean;
  totalAttempts: number;
  averageScore?: number;
  completionRate?: number;
  highestScore?: number;
  lowestScore?: number;
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export default function LecturerQuiz() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const displayName = profile?.full_name || "Lecturer";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "active" | "closed"
  >("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalAttempts: 0,
    averageCompletion: 0,
  });

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      if (!user?.uid) return;

      const data = await getBackend<any[]>(
        `/api/quizzes/?lecturer_id=${encodeURIComponent(user.uid)}`,
      );

      console.log("LecturerQuiz: Query result count:", data.length);

      const quizzesData: Quiz[] = data.map((row: any) => {
        const quizData: Quiz = {
          id: row.id,
          title: row.title,
          description: row.description,
          courseId: row.course_id,
          courseTitle: row.course_title,
          courseCode: row.course_code,
          totalQuestions: row.total_questions,
          totalPoints: row.total_points,
          timeLimit: row.time_limit,
          passingScore: row.passing_score,
          dueDate: row.due_date,
          status: row.status,
          totalAttempts: row.total_attempts || 0,
          averageScore: row.average_score || 0,
          completionRate: row.completion_rate || 0,
          highestScore: row.highest_score || 0,
          lowestScore: row.lowest_score || 0,
          attemptsAllowed: row.attempts_allowed || 1,
          shuffleQuestions: row.shuffle_questions || false,
          showAnswers: row.show_answers || false,
        };
        return quizData;
      });

      // Check for expired quizzes and auto-close them
      const expiredQuizIds = await autoCloseExpiredQuizzes(user.uid);

      // Update local quiz data for expired quizzes
      if (
        expiredQuizIds &&
        Array.isArray(expiredQuizIds) &&
        expiredQuizIds.length > 0
      ) {
        quizzesData.forEach((quiz) => {
          if (expiredQuizIds.includes(quiz.id)) {
            quiz.status = "closed";
          }
        });

        toast({
          title: "Auto-closed Quizzes",
          description: `${expiredQuizIds.length} quiz(es) have been automatically closed as they reached their end date.`,
        });
      }

      setQuizzes(quizzesData);

      // Calculate stats
      const stats = {
        totalQuizzes: quizzesData.length,
        activeQuizzes: quizzesData.filter((q) => q.status === "active").length,
        totalAttempts: quizzesData.reduce((sum, q) => sum + q.totalAttempts, 0),
        averageCompletion:
          quizzesData.length > 0
            ? Math.round(
                quizzesData.reduce(
                  (sum, q) => sum + (q.completionRate || 0),
                  0,
                ) / quizzesData.length,
              )
            : 0,
      };
      setStats(stats);
    } catch (error: any) {
      console.error("Error loading quizzes:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLecturerCourses = async () => {
    try {
      if (!user?.uid) return;

      // Fetch lecturer's course units via API
      const assignedRawCourses: any[] = [];
      try {
        const courseUnitsData = await getBackend<any[]>("/api/course-units/");
        if (courseUnitsData && courseUnitsData.length > 0) {
          courseUnitsData.forEach((course: any) => {
            assignedRawCourses.push({
              id: course.id,
              course_code: course.code || course.course_unit_code || "Unknown",
              course_title: course.name || course.course_unit_name || "Unknown Course",
            });
          });
        }
      } catch (err) {
        console.error("Failed to fetch course units:", err);
      }

      // Set available courses to the assigned course units
      const coursesData: any[] = assignedRawCourses.map((raw) => ({
        id: raw.id,
        course_code: raw.course_code,
        course_title: raw.course_title,
      }));

      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching lecturer courses:", error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    }
  };

  const filterQuizzes = () => {
    let filtered = [...quizzes];

    if (filterStatus !== "all") {
      filtered = filtered.filter((q) => q.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.courseTitle.toLowerCase().includes(query) ||
          q.description.toLowerCase().includes(query),
      );
    }

    setFilteredQuizzes(filtered);
  };

  useEffect(() => {
    if (user?.uid) {
      loadQuizzes();
      fetchLecturerCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    filterQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzes, filterStatus, searchQuery]);

  const handleDeleteQuiz = async (quizId: string) => {
    try {
        await postBackend(`/api/quizzes/${quizId}/action/`, { action: "delete" });

        toast({
          title: "Success",
          description: "Quiz deleted successfully",
        });
        setQuizzes(quizzes.filter((q) => q.id !== quizId));
      } catch (error) {
        console.error("Error deleting quiz:", error);
        toast({
          title: "Error",
          description: "Failed to delete quiz",
          variant: "destructive",
        });
      }
  };

  const handleDuplicateQuiz = async (quiz: Quiz) => {
    try {
      const newQuizData = {
        title: `${quiz.title} (Copy)`,
        description: quiz.description,
        course_id: quiz.courseId,
        lecturer_id: user?.uid,
        total_questions: quiz.totalQuestions,
        total_points: quiz.totalPoints,
        time_limit: quiz.timeLimit,
        passing_score: quiz.passingScore,
        due_date: quiz.dueDate,
        status: "draft",
        attempts_allowed: quiz.attemptsAllowed,
        shuffle_questions: quiz.shuffleQuestions,
        show_answers: quiz.showAnswers,
        total_attempts: 0,
        average_score: 0,
        completion_rate: 0,
        highest_score: 0,
        lowest_score: 0,
      };

      const newQuiz = await postBackend<any>("/api/quizzes/", newQuizData);
      const newQuizId = newQuiz.id;

      toast({
        title: "Success",
        description: `Quiz "${quiz.title}" duplicated successfully`,
      });
      loadQuizzes();
    } catch (error) {
      console.error("Error duplicating quiz:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate quiz",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-700 border-emerald-300/40";
      case "draft":
        return "bg-amber-500/20 text-amber-700 border-amber-300/40";
      case "closed":
        return "bg-slate-500/20 text-slate-700 border-slate-300/40";
      default:
        return "bg-slate-500/20 text-slate-700 border-slate-300/40";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Play className="h-4 w-4" />;
      case "draft":
        return <AlertCircle className="h-4 w-4" />;
      case "closed":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
        <LecturerBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 text-foreground">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/10 blur-3xl rounded-full opacity-60" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-gradient-to-bl from-secondary/15 via-primary/10 to-transparent blur-3xl rounded-full opacity-40" />
      </div>

      <main className="px-4 pb-28 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto pt-6 lg:pt-10">
          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/80 to-card/60 backdrop-blur-xl p-8 sm:p-12 shadow-2xl mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/10 pointer-events-none rounded-3xl" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-4 flex-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80 font-bold bg-gradient-to-r from-primary/15 to-secondary/10 px-4 py-1.5 rounded-full border border-primary/30"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Quiz Management
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl sm:text-5xl font-display font-bold text-foreground"
                >
                  Create & Manage Quizzes
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-base text-muted-foreground max-w-2xl leading-relaxed"
                >
                  Design engaging quizzes, track student performance, and
                  provide instant feedback. Customize difficulty levels, time
                  limits, and grading criteria.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-4 sm:flex-row"
              >
                {/* Course Selection for Quiz Creation */}
                <div className="flex flex-col gap-2 min-w-[250px]">
                  <label className="text-sm font-medium text-foreground">
                    Select Course for New Quiz{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourse === "all" ? "" : selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Choose a course...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.course_code} - {course.course_title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    className="border-border/60 hover:bg-muted"
                    onClick={() => navigate("/lecturer/assignments")}
                  >
                    View Assignments
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:shadow-lg transition-all"
                    onClick={() => {
                      if (selectedCourse && selectedCourse !== "all") {
                        navigate(
                          `/lecturer/quiz/create?course=${selectedCourse}`,
                        );
                      } else {
                        toast({
                          title: "Course Required",
                          description:
                            "Please select a course before creating a quiz.",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={!selectedCourse || selectedCourse === "all"}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Quiz
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[
              {
                label: "Total Quizzes",
                value: stats.totalQuizzes,
                icon: BookOpen,
                color: "primary",
              },
              {
                label: "Active Quizzes",
                value: stats.activeQuizzes,
                icon: Play,
                color: "emerald",
              },
              {
                label: "Total Attempts",
                value: stats.totalAttempts,
                icon: Users,
                color: "blue",
              },
              {
                label: "Avg Completion",
                value: `${stats.averageCompletion}%`,
                icon: TrendingUp,
                color: "amber",
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                variants={rise}
                initial="hidden"
                animate="visible"
                custom={idx}
                className="group"
              >
                <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                    <CardTitle className="text-sm text-muted-foreground font-semibold">
                      {stat.label}
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <stat.icon className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </section>

          {/* Filter Section */}
          <section className="mb-8 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "All", value: "all" as const },
                  { label: "Active", value: "active" as const },
                  { label: "Draft", value: "draft" as const },
                  { label: "Closed", value: "closed" as const },
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    variant={
                      filterStatus === filter.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setFilterStatus(filter.value)}
                    className="text-xs"
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </section>

          {/* Quizzes Grid */}
          <section className="grid gap-6">
            {filteredQuizzes.length > 0 ? (
              filteredQuizzes.map((quiz, idx) => (
                <motion.div
                  key={quiz.id}
                  variants={rise}
                  initial="hidden"
                  animate="visible"
                  custom={idx}
                >
                  <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <CardHeader className="relative pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-foreground">
                              {quiz.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`${getStatusColor(
                                quiz.status,
                              )} flex items-center gap-1`}
                            >
                              {getStatusIcon(quiz.status)}
                              {quiz.status.charAt(0).toUpperCase() +
                                quiz.status.slice(1)}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {quiz.description}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <BookOpen className="h-4 w-4" />
                              <span className="font-medium">
                                {quiz.courseTitle}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{quiz.timeLimit} mins</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <AlertCircle className="h-4 w-4" />
                              <span>{quiz.totalQuestions} questions</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Award className="h-4 w-4" />
                              <span>{quiz.totalPoints} points</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(quiz.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="relative space-y-4">
                      {/* Stats Row */}
                      {quiz.totalAttempts > 0 && (
                        <div className="grid gap-3 sm:grid-cols-4 py-4 border-t border-border/40">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">
                              Attempts
                            </p>
                            <p className="text-lg font-bold text-foreground">
                              {quiz.totalAttempts}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">
                              Avg Score
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {quiz.averageScore?.toFixed(1)}/{quiz.totalPoints}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">
                              Completion
                            </p>
                            <p className="text-lg font-bold text-emerald-600">
                              {quiz.completionRate}%
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-semibold">
                              Range
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {quiz.lowestScore} - {quiz.highestScore}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => navigate(`/lecturer/quiz/${quiz.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() =>
                            navigate(`/lecturer/quiz/${quiz.id}/results`)
                          }
                        >
                          <BarChart3 className="h-4 w-4" />
                          Results
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => handleDuplicateQuiz(quiz)}
                        >
                          <Copy className="h-4 w-4" />
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() =>
                            navigate(`/lecturer/quiz/${quiz.id}/edit`)
                          }
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteQuiz(quiz.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                  No quizzes found
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "Create your first quiz to get started"}
                </p>
                {!searchQuery && (
                  <Button
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                    onClick={() => navigate("/lecturer/quiz/create")}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Quiz
                  </Button>
                )}
              </motion.div>
            )}
          </section>
        </div>
      </main>

      <LecturerBottomNav />
    </div>
  );
}
