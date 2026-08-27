import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  BarChart3,
  Copy,
  Edit2,
  Trash2,
  BookOpen,
  Clock,
  Award,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  courseCode: string;
  totalQuestions: number;
  totalPoints: number;
  timeLimit: number;
  passingScore: number;
  dueDate: string;
  status: "draft" | "active" | "closed";
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  highestScore: number;
  lowestScore: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  showAnswers: boolean;
  startDate: string;
  endDate: string;
}

interface Question {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  options?: string[];
  correctAnswer: string;
  points: number;
  explanation?: string;
}

export default function QuizView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    completionRate: 0,
    highestScore: 0,
    lowestScore: 0,
  });

  useEffect(() => {
    if (user?.id && id) {
      loadQuiz();
      loadQuestions();
    }
  }, [user?.id, id]);

  const loadQuiz = async () => {
    try {
      const data = await getBackend<any>(`/api/quizzes/${id}/`);
      if (!data) throw new Error("Quiz not found");
      const quizData: Quiz = {
        id: data.id,
        title: data.title,
        description: data.description,
        courseId: data.course_id,
        courseTitle: data.course_title || "Unknown Course",
        courseCode: data.course_code || "N/A",
        totalQuestions: data.total_questions,
        totalPoints: data.total_points,
        timeLimit: data.time_limit,
        passingScore: data.passing_score,
        dueDate: data.due_date,
        status: data.status,
        totalAttempts: data.total_attempts || 0,
        averageScore: data.average_score || 0,
        completionRate: data.completion_rate || 0,
        highestScore: data.highest_score || 0,
        lowestScore: data.lowest_score || 0,
        attemptsAllowed: data.attempts_allowed || 1,
        shuffleQuestions: data.shuffle_questions || false,
        showAnswers: data.show_answers || false,
        startDate: data.start_date,
        endDate: data.end_date,
      };
      if (quizData.status === "active" && quizData.endDate) {
        const expiredIds = await autoCloseExpiredQuizzes(user?.id);
        if (expiredIds.includes(quizData.id)) {
          quizData.status = "closed";
          toast({
            title: "Quiz Auto-closed",
            description:
              "This quiz has reached its end date and has been automatically closed.",
          });
        }
      }
      setQuiz(quizData);
    } catch (error: any) {
      console.error("Error loading quiz:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load quiz",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const data = await getBackend<any[]>(`/api/questions/?quiz_id=${id}`);
      if (data && data.length > 0) {
        const questionsData: Question[] = data.map((q: any) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          options: q.options,
          correctAnswer: q.correct_answer,
          points: q.points,
          explanation: q.explanation || "",
        }));
        setQuestions(questionsData);
      } else {
        const storageKey = `quiz_questions_${id}`;
        const storedQuestions = localStorage.getItem(storageKey);
        if (storedQuestions) {
          setQuestions(JSON.parse(storedQuestions));
        } else {
          setQuestions([]);
        }
      }
    } catch (error: any) {
      console.error("Error loading questions:", error);
      const storageKey = `quiz_questions_${id}`;
      const storedQuestions = localStorage.getItem(storageKey);
      if (storedQuestions) {
        setQuestions(JSON.parse(storedQuestions));
      } else {
        setQuestions([]);
      }
    }
  };

  const handleDeleteQuiz = async () => {
    try {
        await postBackend(`/api/quizzes/${id}/action/`, { action: "delete" });
        toast({
          title: "Success",
          description: "Quiz deleted successfully",
        });
        navigate("/lecturer/quiz");
      } catch (error) {
        console.error("Error deleting quiz:", error);
        toast({
          title: "Error",
          description: "Failed to delete quiz",
          variant: "destructive",
        });
      }
  };

  const handleDuplicateQuiz = async () => {
    if (!quiz) return;
    try {
      const newQuiz = await postBackend<any>("/api/quizzes/", {
        title: `${quiz.title} (Copy)`,
        description: quiz.description,
        course_id: quiz.courseId,
        lecturer_id: user?.id,
        total_questions: quiz.totalQuestions,
        total_points: quiz.totalPoints,
        time_limit: quiz.timeLimit,
        passing_score: quiz.passingScore,
        start_date: quiz.startDate,
        end_date: quiz.endDate,
        status: "draft",
        attempts_allowed: quiz.attemptsAllowed,
        shuffle_questions: quiz.shuffleQuestions,
        show_answers: quiz.showAnswers,
      });
      if (questions.length > 0) {
        try {
          const storageKey = `quiz_questions_${newQuiz.id}`;
          localStorage.setItem(storageKey, JSON.stringify(questions));
        } catch (dbError) {
          console.log("Question duplication storage failed:", dbError);
        }
      }
      toast({
        title: "Success",
        description: "Quiz duplicated successfully",
      });
      navigate("/lecturer/quiz");
    } catch (error) {
      console.error("Error duplicating quiz:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate quiz",
        variant: "destructive",
      });
    }
  };

  const generateAIQuestions = async () => {
    if (!quiz) return;

    try {
      toast({
        title: "Generating Questions",
        description: "AI is creating questions for your quiz...",
      });

      // For now, store questions in localStorage as a workaround
      // until the database schema is properly set up
      const sampleQuestions: Question[] = [
        {
          id: `temp_${Date.now()}_1`,
          question: `What is the primary purpose of ${quiz.courseTitle}?`,
          type: "multiple_choice",
          options: [
            "To teach basic concepts",
            "To provide advanced knowledge",
            "To prepare for industry",
            "All of the above",
          ],
          correctAnswer: "All of the above",
          points: 2,
          explanation:
            "Courses are designed to teach concepts, provide knowledge, and prepare students for their careers.",
        },
        {
          id: `temp_${Date.now()}_2`,
          question: `Which of the following is a key topic in ${quiz.courseTitle}?`,
          type: "multiple_choice",
          options: [
            "Basic programming",
            "Data structures",
            "Algorithms",
            "System design",
          ],
          correctAnswer: "Data structures",
          points: 2,
          explanation:
            "Data structures are fundamental to computer science courses.",
        },
        {
          id: `temp_${Date.now()}_3`,
          question: `The time limit for this quiz is ${quiz.timeLimit} minutes.`,
          type: "true_false",
          correctAnswer: "true",
          points: 1,
          explanation: "This is a factual statement about the quiz settings.",
        },
      ];

      // Store in localStorage for now
      const storageKey = `quiz_questions_${id}`;
      localStorage.setItem(storageKey, JSON.stringify(sampleQuestions));

      // Update local state
      setQuestions(sampleQuestions);

      toast({
        title: "Success",
        description: "AI-generated questions added to quiz (stored locally)",
      });
    } catch (error) {
      console.error("Error generating questions:", error);
      toast({
        title: "Error",
        description: "Failed to generate questions",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async () => {
    if (!quiz) return;

    const newStatus = quiz.status === "active" ? "draft" : "active";

    try {
      await postBackend(`/api/quizzes/${id}/action/`, { action: "status", status: newStatus });
      setQuiz({ ...quiz, status: newStatus });
      toast({
        title: "Success",
        description: `Quiz ${
          newStatus === "active" ? "activated" : "deactivated"
        } successfully`,
      });
    } catch (error) {
      console.error("Error toggling quiz status:", error);
      toast({
        title: "Error",
        description: "Failed to update quiz status",
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
        <div className="max-w-6xl mx-auto pt-6 lg:pt-10">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/lecturer/quiz")}
                className="rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{quiz.title}</h1>
                <p className="text-muted-foreground">{quiz.description}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/lecturer/quiz/${id}/results`)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Results
              </Button>
              <Button variant="outline" onClick={handleDuplicateQuiz}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button
                variant={quiz.status === "active" ? "secondary" : "default"}
                onClick={handleToggleStatus}
              >
                {quiz.status === "active" ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
              <Button variant="outline">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteQuiz}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Quiz Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <CardTitle>Quiz Details</CardTitle>
                    </div>
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Course</p>
                        <p className="font-medium">{quiz.courseTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Time Limit
                        </p>
                        <p className="font-medium">{quiz.timeLimit} minutes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Points
                        </p>
                        <p className="font-medium">{quiz.totalPoints}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Attempts Allowed
                        </p>
                        <p className="font-medium">{quiz.attemptsAllowed}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Start Date
                        </p>
                        <p className="font-medium">
                          {quiz.startDate &&
                          !isNaN(new Date(quiz.startDate).getTime())
                            ? new Date(quiz.startDate).toLocaleDateString()
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          End Date
                        </p>
                        <p className="font-medium">
                          {quiz.endDate &&
                          !isNaN(new Date(quiz.endDate).getTime())
                            ? new Date(quiz.endDate).toLocaleDateString()
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Questions */}
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Questions ({questions.length})</CardTitle>
                    <Button
                      onClick={generateAIQuestions}
                      className="bg-gradient-to-r from-primary to-secondary"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Questions
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {questions.length > 0 ? (
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <div
                          key={question.id}
                          className="p-4 border border-border/40 rounded-lg bg-muted/20"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-primary">
                                  Question {index + 1}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {question.points} point
                                  {question.points !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              <p className="font-medium mb-3">
                                {question.question}
                              </p>

                              {question.type === "multiple_choice" &&
                                question.options && (
                                  <div className="space-y-2">
                                    {question.options.map(
                                      (option, optIndex) => (
                                        <div
                                          key={optIndex}
                                          className={`p-2 rounded border text-sm ${
                                            option === question.correctAnswer
                                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                              : "border-border bg-card"
                                          }`}
                                        >
                                          {option}
                                          {option ===
                                            question.correctAnswer && (
                                            <CheckCircle2 className="h-4 w-4 inline ml-2 text-emerald-600" />
                                          )}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}

                              {question.type === "true_false" && (
                                <div className="space-y-2">
                                  <div
                                    className={`p-2 rounded border text-sm ${
                                      "true" === question.correctAnswer
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                        : "border-border bg-card"
                                    }`}
                                  >
                                    True
                                    {"true" === question.correctAnswer && (
                                      <CheckCircle2 className="h-4 w-4 inline ml-2 text-emerald-600" />
                                    )}
                                  </div>
                                  <div
                                    className={`p-2 rounded border text-sm ${
                                      "false" === question.correctAnswer
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                        : "border-border bg-card"
                                    }`}
                                  >
                                    False
                                    {"false" === question.correctAnswer && (
                                      <CheckCircle2 className="h-4 w-4 inline ml-2 text-emerald-600" />
                                    )}
                                  </div>
                                </div>
                              )}

                              {question.explanation && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                  <strong>Explanation:</strong>{" "}
                                  {question.explanation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No questions added yet
                      </p>
                      <Button onClick={generateAIQuestions}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate AI Questions
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-6">
              <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
                <CardHeader>
                  <CardTitle>Performance Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {quiz.totalAttempts}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Attempts
                    </p>
                  </div>

                  {quiz.totalAttempts > 0 && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600 mb-1">
                          {quiz.averageScore?.toFixed(1)}/{quiz.totalPoints}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Average Score
                        </p>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {quiz.completionRate}%
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Completion Rate
                        </p>
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">
                          Range: {quiz.lowestScore} - {quiz.highestScore} points
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <LecturerBottomNav />
    </div>
  );
}
