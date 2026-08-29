import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Users,
  TrendingUp,
  Award,
  Clock,
  Target,
  BookOpen,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getMessagingBackend } from "@/lib/backendApi";
import { useToast } from "@/components/ui/use-toast";

interface QuizAttempt {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  score: number | null;
  total_points: number;
  percentage: number | null;
  time_taken: number;
  completed_at: string;
  passed: boolean | null;
  status: "submitted" | "graded";
  answers: any;
}

interface QuizStats {
  totalAttempts: number;
  averageScore: number;
  averagePercentage: number;
  completionRate: number;
  highestScore: number;
  lowestScore: number;
  averageTime: number;
  passRate: number;
}

export default function QuizResults() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [viewingAttempt, setViewingAttempt] = useState<QuizAttempt | null>(
    null,
  );
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [stats, setStats] = useState<QuizStats>({
    totalAttempts: 0,
    averageScore: 0,
    averagePercentage: 0,
    completionRate: 0,
    highestScore: 0,
    lowestScore: 0,
    averageTime: 0,
    passRate: 0,
  });

  useEffect(() => {
    if (id) {
      loadQuiz();
      const unsubscribe = loadResults();
      unsubscribeRef.current = unsubscribe;
    }

    // Cleanup function to unsubscribe from listeners
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [id]);

  const loadQuiz = async () => {
    try {
      const quizData = await getMessagingBackend<any>(`/api/quizzes/${id}/`);
      if (!quizData) throw new Error("Quiz not found");
      setQuiz(quizData);
    } catch (error: any) {
      console.error("Error loading quiz:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load quiz",
        variant: "destructive",
      });
    }
  };

  const loadResults = () => {
    try {
      const fetchData = async () => {
        if (!id) return;
        const attemptsData = await getMessagingBackend<any[]>(`/api/quiz-attempts/?quiz_id=${id}`);

        if (!attemptsData || attemptsData.length === 0) {
          setAttempts([]);
          setStats({
            totalAttempts: 0,
            averageScore: 0,
            averagePercentage: 0,
            completionRate: 0,
            highestScore: 0,
            lowestScore: 0,
            averageTime: 0,
            passRate: 0,
          });
          setLoading(false);
          return;
        }

        const formattedAttempts: QuizAttempt[] = attemptsData.map(
          (attempt) => {
            const timeTaken =
              attempt.completed_at && attempt.started_at
                ? Math.round(
                    (new Date(attempt.completed_at).getTime() -
                      new Date(attempt.started_at).getTime()) /
                      1000,
                  )
                : 0;
            return {
              id: attempt.id,
              student_id: attempt.student_id,
              student_name: attempt.student_name || "Unknown Student",
              student_email: attempt.student_email || "",
              score: attempt.score,
              total_points: attempt.total_points || quiz?.total_points || 0,
              percentage:
                attempt.percentage != null
                  ? attempt.percentage
                  : attempt.score !== null &&
                      quiz?.total_points &&
                      quiz.total_points > 0
                    ? Math.round((attempt.score / quiz.total_points) * 100)
                    : null,
              time_taken: attempt.time_taken != null ? attempt.time_taken : timeTaken,
              completed_at:
                attempt.completed_at ||
                attempt.started_at ||
                new Date().toISOString(),
              passed: attempt.passed != null ? attempt.passed :
                attempt.score !== null
                  ? attempt.score >= (quiz?.passing_score || 0)
                  : null,
              status: attempt.status || (attempt.score !== null ? "graded" : "submitted"),
              answers: attempt.answers || {},
            };
          },
        );

        setAttempts(formattedAttempts);

        if (formattedAttempts.length > 0) {
          const totalAttempts = formattedAttempts.length;
          const gradedAttempts = formattedAttempts.filter(
            (a) => a.score !== null,
          );

          const averageScore =
            gradedAttempts.length > 0
              ? gradedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) /
                gradedAttempts.length
              : 0;
          const averagePercentage =
            gradedAttempts.length > 0
              ? gradedAttempts.reduce(
                  (sum, a) => sum + (a.percentage || 0),
                  0,
                ) / gradedAttempts.length
              : 0;
          const highestScore =
            gradedAttempts.length > 0
              ? Math.max(...gradedAttempts.map((a) => a.score || 0))
              : 0;
          const lowestScore =
            gradedAttempts.length > 0
              ? Math.min(...gradedAttempts.map((a) => a.score || 0))
              : 0;
          const averageTime =
            formattedAttempts.reduce((sum, a) => sum + a.time_taken, 0) /
            totalAttempts;
          const passRate =
            gradedAttempts.length > 0
              ? (gradedAttempts.filter((a) => a.passed).length /
                  gradedAttempts.length) *
                100
              : 0;

          setStats({
            totalAttempts,
            averageScore: Math.round(averageScore * 10) / 10,
            averagePercentage: Math.round(averagePercentage),
            completionRate: 100,
            highestScore,
            lowestScore,
            averageTime: Math.round(averageTime),
            passRate: Math.round(passRate),
          });
        }

        setLoading(false);
      };

      fetchData();
      return () => {};
    } catch (error: any) {
      console.error("Error setting up results listener:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load results",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleViewAttempt = async (attempt: QuizAttempt) => {
    setViewingAttempt(attempt);

    try {
      const questionsData = await getMessagingBackend<any[]>(`/api/questions/?quiz_id=${id}`);
      setQuizQuestions(questionsData || []);
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        <LecturerHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
        <LecturerBottomNav />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        <LecturerHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Quiz not found
            </h2>
            <Button onClick={() => navigate("/lecturer/quiz")}>
              Back to Quizzes
            </Button>
          </div>
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

      <LecturerHeader />

      <main className="px-4 pb-28 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto pt-6 lg:pt-10">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(`/lecturer/quiz/${id}`)}
                className="rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{quiz.title}</h1>
                <p className="text-muted-foreground">
                  Quiz Results & Analytics
                </p>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[
              {
                label: "Total Attempts",
                value: stats.totalAttempts,
                icon: Users,
                color: "primary",
              },
              {
                label: "Average Score",
                value: `${stats.averageScore}/${quiz.total_points}`,
                icon: Target,
                color: "emerald",
              },
              {
                label: "Pass Rate",
                value: `${stats.passRate}%`,
                icon: Award,
                color: "blue",
              },
              {
                label: "Avg Time",
                value: formatTime(stats.averageTime),
                icon: Clock,
                color: "amber",
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-semibold">
                      {stat.label}
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <stat.icon className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Results Table */}
          <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
            <CardHeader>
              <CardTitle>Student Results</CardTitle>
            </CardHeader>
            <CardContent>
              {attempts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="text-left py-3 px-4 font-semibold">
                          Student
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Score
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Percentage
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Time Taken
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Completed
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((attempt) => (
                        <tr
                          key={attempt.id}
                          className="border-b border-border/20 hover:bg-muted/20"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">
                                {attempt.student_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {attempt.student_email}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium">
                              {attempt.score !== null
                                ? `${attempt.score}/${attempt.total_points}`
                                : "Not graded"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {attempt.percentage !== null ? (
                              <span
                                className={`font-medium ${
                                  attempt.percentage >= 70
                                    ? "text-emerald-600"
                                    : attempt.percentage >= 50
                                      ? "text-amber-600"
                                      : "text-red-600"
                                }`}
                              >
                                {attempt.percentage}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-muted-foreground">
                              {formatTime(attempt.time_taken)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                attempt.status === "graded"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                attempt.status === "graded"
                                  ? attempt.passed
                                    ? "bg-emerald-500/20 text-emerald-700"
                                    : "bg-red-500/20 text-red-700"
                                  : "bg-blue-500/20 text-blue-700"
                              }
                            >
                              {attempt.status === "graded"
                                ? attempt.passed
                                  ? "Passed"
                                  : "Failed"
                                : "Submitted"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">
                              {new Date(
                                attempt.completed_at,
                              ).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewAttempt(attempt)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No attempts recorded yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Students need to take the quiz for results to appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* View Attempt Modal */}
      {viewingAttempt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">View Student Attempt</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingAttempt(null)}
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {viewingAttempt.student_name} - {viewingAttempt.student_email}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Answers Review */}
              <div className="space-y-4">
                <h4 className="font-medium">Student Answers</h4>
                {quizQuestions.map((question, index) => {
                  const studentAnswer = viewingAttempt.answers?.[question.id];
                  return (
                    <Card key={question.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                            Q{index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">
                              {question.question_text}
                            </p>
                            {question.question_type === "multiple_choice" &&
                              question.options && (
                                <div className="mt-2 space-y-1">
                                  {question.options.map(
                                    (option: string, optIndex: number) => (
                                      <div
                                        key={optIndex}
                                        className={`p-2 rounded text-sm ${
                                          studentAnswer === optIndex
                                            ? "bg-blue-100 text-blue-800"
                                            : optIndex ===
                                                question.correct_answer
                                              ? "bg-green-100 text-green-800"
                                              : "bg-muted"
                                        }`}
                                      >
                                        {option}
                                        {studentAnswer === optIndex &&
                                          " (Student's Answer)"}
                                        {optIndex === question.correct_answer &&
                                          " (Correct Answer)"}
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            {question.question_type === "true_false" && (
                              <div className="mt-2 space-y-1">
                                {["True", "False"].map((option, optIndex) => (
                                  <div
                                    key={optIndex}
                                    className={`p-2 rounded text-sm ${
                                      studentAnswer === optIndex
                                        ? "bg-blue-100 text-blue-800"
                                        : optIndex === question.correct_answer
                                          ? "bg-green-100 text-green-800"
                                          : "bg-muted"
                                    }`}
                                  >
                                    {option}
                                    {studentAnswer === optIndex &&
                                      " (Student's Answer)"}
                                    {optIndex === question.correct_answer &&
                                      " (Correct Answer)"}
                                  </div>
                                ))}
                              </div>
                            )}
                            {question.question_type === "short_answer" && (
                              <div className="mt-2 p-3 bg-muted rounded text-sm">
                                <p className="font-medium mb-1">
                                  Student's Answer:
                                </p>
                                <p>{studentAnswer || "No answer provided"}</p>
                                <p className="font-medium mt-2 mb-1">
                                  Correct Answer:
                                </p>
                                <p>{question.correct_answer}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              {/* Results Section */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">
                      Automatically Calculated Grade
                    </h4>
                    <p className="text-2xl font-bold text-primary">
                      {viewingAttempt.score}/{viewingAttempt.total_points} (
                      {viewingAttempt.percentage}%)
                    </p>
                  </div>
                  <Badge
                    variant={viewingAttempt.passed ? "default" : "destructive"}
                    className={
                      viewingAttempt.passed
                        ? "bg-emerald-500/20 text-emerald-700"
                        : ""
                    }
                  >
                    {viewingAttempt.passed ? "Passed" : "Failed"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <LecturerBottomNav />
    </div>
  );
}
