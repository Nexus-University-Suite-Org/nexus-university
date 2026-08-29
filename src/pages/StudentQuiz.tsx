import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play,
  Clock,
  BookOpen,
  Calendar,
  Award,
  Users,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Target,
  TrendingUp,
  Trophy,
  Timer,
  BarChart3,
} from "lucide-react";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { getMessagingBackend, postMessagingBackend } from "@/lib/backendApi";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  course_title?: string;
  time_limit: number | null;
  attempts_allowed?: number | null;
  passing_score: number | null;
  status: "draft" | "active" | "closed";
  start_date: string | null;
  end_date: string | null;
  show_answers?: boolean;
  total_questions?: number;
  total_points?: number;
  questions?: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  points: number;
  explanation?: string;
}

interface QuizAttemptResult {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  total_points: number;
  percentage: number;
  time_taken: number;
  passed: boolean;
  status: string;
  completed_at: string;
  questions?: QuizQuestion[];
}

export default function StudentQuiz() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizAttemptResult | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<Record<string, QuizAttemptResult>>({});

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeLeft !== null && timeLeft > 0 && !showResults) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            if (prev === 1) submitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeLeft, showResults]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const data = await getMessagingBackend<any[]>("/api/quizzes/?status=active");
      const mapped: Quiz[] = data.map((q) => ({
        id: String(q.id),
        title: q.title,
        description: q.description,
        course_id: q.course_id != null ? String(q.course_id) : null,
        course_title: q.course_title,
        time_limit: q.time_limit,
        attempts_allowed: q.attempts_allowed,
        passing_score: q.passing_score,
        status: q.status,
        start_date: q.start_date,
        end_date: q.end_date,
        show_answers: q.show_answers,
        total_questions: q.total_questions,
        total_points: q.total_points,
      }));
      setQuizzes(mapped);

      if (user?.uid) {
        for (const q of mapped) {
          try {
            const attempts = await getMessagingBackend<any[]>(
              `/api/quiz-attempts/?quiz_id=${q.id}&student_id=${user.uid}`,
            );
            if (attempts && attempts.length > 0) {
              const best = attempts[0];
              setQuizAttempts((prev) => ({
                ...prev,
                [q.id]: {
                  id: String(best.id),
                  quiz_id: String(best.quiz_id),
                  student_id: String(best.student_id),
                  score: best.score,
                  total_points: best.total_points,
                  percentage: best.percentage,
                  time_taken: best.time_taken,
                  passed: best.passed,
                  status: best.status,
                  completed_at: best.completed_at,
                },
              }));
            }
          } catch {}
        }
      }
    } catch (error: any) {
      console.error("Error loading quizzes:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load quizzes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const takeQuiz = async (quiz: Quiz) => {
    try {
      const now = new Date();
      const startDate = quiz.start_date ? new Date(quiz.start_date) : null;
      const endDate = quiz.end_date ? new Date(quiz.end_date) : null;

      if (startDate && now < startDate) {
        toast({ title: "Quiz Not Available Yet", description: `Available on ${startDate.toLocaleString()}`, variant: "destructive" });
        return;
      }
      if (endDate && now > endDate) {
        toast({ title: "Quiz Closed", description: "This quiz is no longer available", variant: "destructive" });
        return;
      }

      const quizData = await getMessagingBackend<any>(`/api/quizzes/${quiz.id}/`);
      const questions: QuizQuestion[] = (quizData.questions || []).map((q: any) => ({
        id: String(q.id),
        quiz_id: String(q.quiz_id || quiz.id),
        question: q.question || "",
        options: q.options || [],
        correct_answer: typeof q.correct_answer === "number" ? q.correct_answer : parseInt(String(q.correct_answer)) || 0,
        points: q.points || 1,
        explanation: q.explanation || "",
      }));

      if (questions.length === 0) {
        toast({ title: "No Questions", description: "This quiz has no questions yet", variant: "destructive" });
        return;
      }

      setQuizQuestions(questions);
      setTakingQuiz(quiz);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setQuizStartTime(new Date());
      setTimeLeft((quiz.time_limit || 30) * 60);
      setShowResults(false);
      setQuizResult(null);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to start quiz", variant: "destructive" });
    }
  };

  const submitQuiz = async () => {
    if (!takingQuiz || !quizStartTime || !user) return;

    try {
      const timeTaken = Math.floor((new Date().getTime() - quizStartTime.getTime()) / 1000);

      const payload = {
        student_id: Number(user.uid),
        student_name: user.displayName || "",
        answers: answers,
        time_taken: timeTaken,
      };

      const result = await postMessagingBackend<any>(
        `/api/quizzes/${takingQuiz.id}/submit/`,
        payload,
      );

      const mapped: QuizAttemptResult = {
        id: String(result.id),
        quiz_id: String(result.quiz_id),
        student_id: String(result.student_id),
        score: result.score,
        total_points: result.total_points,
        percentage: result.percentage,
        time_taken: result.time_taken,
        passed: result.passed,
        status: result.status,
        completed_at: result.completed_at,
        questions: (result.questions || []).map((q: any) => ({
          id: String(q.id),
          quiz_id: String(q.quiz_id),
          question: q.question || "",
          options: q.options || [],
          correct_answer: typeof q.correct_answer === "number" ? q.correct_answer : parseInt(String(q.correct_answer)) || 0,
          points: q.points || 1,
          explanation: q.explanation || "",
        })),
      };

      setQuizResult(mapped);
      setQuizAttempts((prev) => ({ ...prev, [takingQuiz.id]: mapped }));
      setShowResults(true);

      toast({
        title: mapped.passed ? "Congratulations!" : "Quiz Submitted",
        description: mapped.passed
          ? `You passed with ${mapped.percentage}%!`
          : `You scored ${mapped.percentage}%. Keep studying!`,
      });
    } catch (error: any) {
      console.error("Error submitting quiz:", error);
      toast({ title: "Error", description: "Failed to submit quiz", variant: "destructive" });
    }
  };

  const resetQuiz = () => {
    setTakingQuiz(null);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeLeft(null);
    setQuizStartTime(null);
    setShowResults(false);
    setQuizResult(null);
  };

  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString();

  const getQuizStatus = (quiz: Quiz) => {
    const now = new Date();
    const startDate = quiz.start_date ? new Date(quiz.start_date) : null;
    const endDate = quiz.end_date ? new Date(quiz.end_date) : null;
    if (endDate && now > endDate) return { status: "closed", label: "Closed", color: "bg-red-500/10 text-red-600 border-red-200/50" };
    if (startDate && now < startDate) return { status: "upcoming", label: "Upcoming", color: "bg-blue-500/10 text-blue-600 border-blue-200/50" };
    return { status: "active", label: "Active", color: "bg-green-500/10 text-green-600 border-green-200/50" };
  };

  const correctAnswersCount = quizResult?.questions
    ? quizResult.questions.reduce((count, q) => {
        const studentAnswer = answers[q.id];
        return count + (studentAnswer !== undefined && studentAnswer === q.correct_answer ? 1 : 0);
      }, 0)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/10 blur-3xl rounded-full opacity-60" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-gradient-to-bl from-secondary/15 via-primary/10 to-transparent blur-3xl rounded-full opacity-40" />
      </div>

      <StudentHeader />

      <main className="px-4 pb-28 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto pt-6 lg:pt-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Target className="h-4 w-4" />
              Quiz Center
            </div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Available Quizzes
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Test your knowledge and track your progress
            </p>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground mt-4">Loading quizzes...</p>
            </div>
          )}

          {!loading && quizzes.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Active Quizzes</h3>
              <p className="text-muted-foreground">Check back later or contact your instructor.</p>
            </motion.div>
          )}

          {!loading && quizzes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz, index) => {
                const attempt = quizAttempts[quiz.id];
                const quizStatus = getQuizStatus(quiz);
                return (
                  <motion.div key={quiz.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ y: -4 }}>
                    <Card className="h-full border-border/60 bg-card/80 backdrop-blur-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className={`border ${quizStatus.color}`}>{quizStatus.label}</Badge>
                              {attempt && (
                                <Badge variant="default" className={attempt.passed ? "bg-green-500" : "bg-red-500"}>
                                  <Trophy className="h-3 w-3 mr-1" />
                                  {attempt.score}/{attempt.total_points}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                          </div>
                        </div>
                        {quiz.description && <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>}
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{quiz.course_title || quiz.course_id || "General"}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                            <Timer className="h-4 w-4 text-blue-600" />
                            <div className="text-xs">
                              <div className="font-semibold text-blue-700 dark:text-blue-300">{quiz.time_limit || 30} min</div>
                              <div className="text-blue-600/70">Time Limit</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <Award className="h-4 w-4 text-green-600" />
                            <div className="text-xs">
                              <div className="font-semibold text-green-700 dark:text-green-300">{quiz.passing_score}%</div>
                              <div className="text-green-600/70">To Pass</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                            <Users className="h-4 w-4 text-purple-600" />
                            <div className="text-xs">
                              <div className="font-semibold text-purple-700 dark:text-purple-300">{quiz.attempts_allowed || "Unlimited"}</div>
                              <div className="text-purple-600/70">Attempts</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                            <Trophy className="h-4 w-4 text-orange-600" />
                            <div className="text-xs">
                              <div className="font-semibold text-orange-700 dark:text-orange-300">{quiz.total_points || 0}</div>
                              <div className="text-orange-600/70">Points</div>
                            </div>
                          </div>
                        </div>

                        {quiz.end_date && (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50">
                            <Calendar className="h-4 w-4 text-amber-600" />
                            <div className="text-xs flex-1">
                              <div className="font-medium text-amber-800 dark:text-amber-200">Due Date</div>
                              <div className="text-amber-700/80">{formatDateTime(quiz.end_date)}</div>
                            </div>
                          </div>
                        )}

                        {attempt ? (
                          <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700" size="sm" onClick={() => { setQuizResult(attempt); setTakingQuiz(quiz); setShowResults(true); }}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            View Score ({attempt.percentage}%)
                          </Button>
                        ) : quizStatus.status === "upcoming" ? (
                          <Button className="w-full opacity-60 cursor-not-allowed" size="sm" disabled>
                            <Clock className="h-4 w-4 mr-2" /> Coming Soon
                          </Button>
                        ) : quizStatus.status === "closed" ? (
                          <Button className="w-full opacity-60 cursor-not-allowed" size="sm" disabled>
                            <X className="h-4 w-4 mr-2" /> Quiz Closed
                          </Button>
                        ) : (
                          <Button className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" size="sm" onClick={() => takeQuiz(quiz)}>
                            <Play className="h-4 w-4 mr-2" /> Start Quiz
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </main>

      {/* Quiz Taking Modal */}
      {takingQuiz && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && resetQuiz()}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Quiz Header */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">{takingQuiz.title}</h2>
                  <p className="text-blue-100 text-sm">{takingQuiz.course_title || takingQuiz.course_id || "Course"}</p>
                </div>
                <div className="flex items-center gap-3">
                  {timeLeft !== null && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm ${timeLeft < 300 ? "bg-red-500/20 border border-red-400/30" : "bg-white/20"}`}>
                      <Timer className={`h-4 w-4 ${timeLeft < 300 ? "text-red-300" : ""}`} />
                      <span className={`font-mono text-sm font-semibold ${timeLeft < 300 ? "text-red-200" : ""}`}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  )}
                  <Button variant="ghost" size="icon" onClick={resetQuiz} className="text-white hover:bg-white/20 rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="relative mt-4">
                <div className="flex items-center justify-between text-xs text-blue-100 mb-2">
                  <span>Progress</span>
                  <span>{currentQuestionIndex + 1} of {quizQuestions.length}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {!showResults ? (
                <>
                  {quizQuestions[currentQuestionIndex] && (
                    <div className="space-y-6">
                      <div className="bg-muted/30 rounded-xl p-6 border border-border/50">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {currentQuestionIndex + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{quizQuestions[currentQuestionIndex].question}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Award className="h-4 w-4" />
                              <span>{quizQuestions[currentQuestionIndex].points} points</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {quizQuestions[currentQuestionIndex].options.map((option, index) => {
                          const isSelected = answers[quizQuestions[currentQuestionIndex].id] === index;
                          return (
                            <label key={index} className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50 hover:bg-accent/50"}`}>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary"}`}>
                                {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                              </div>
                              <input type="radio" name={`q-${quizQuestions[currentQuestionIndex].id}`} value={index} checked={isSelected} onChange={() => setAnswers((prev) => ({ ...prev, [quizQuestions[currentQuestionIndex].id]: index }))} className="sr-only" />
                              <span className={`flex-1 text-sm ${isSelected ? "font-medium text-primary" : ""}`}>{option}</span>
                              {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 bg-muted/30 rounded-xl p-6 border border-border/50">
                    <div className="flex gap-1 min-w-max mx-auto w-fit mb-4 overflow-x-auto pb-1">
                      {quizQuestions.map((q, index) => {
                        const isAnswered = answers[q.id] !== undefined;
                        const isCurrent = index === currentQuestionIndex;
                        return (
                          <button key={index} onClick={() => setCurrentQuestionIndex(index)} className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${isCurrent ? "bg-primary text-white shadow-lg scale-110" : isAnswered ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      {currentQuestionIndex === quizQuestions.length - 1 ? (
                        <Button onClick={submitQuiz} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 gap-2">
                          <Trophy className="h-4 w-4" /> Submit Quiz
                        </Button>
                      ) : (
                        <Button onClick={() => setCurrentQuestionIndex((p) => Math.min(quizQuestions.length - 1, p + 1))} className="gap-2">
                          Next <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border/50 mt-4">
                      <span>Answered: {Object.keys(answers).length} of {quizQuestions.length}</span>
                      <span>{Math.round((Object.keys(answers).length / quizQuestions.length) * 100)}% complete</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Results */
                <div className="text-center space-y-6">
                  {quizResult && (
                    <>
                      <div className={`rounded-2xl p-8 border ${quizResult.passed ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"}`}>
                        <div className="text-6xl font-bold mb-2" style={{ color: quizResult.passed ? "#16a34a" : "#dc2626" }}>
                          {quizResult.percentage}%
                        </div>
                        <div className="text-2xl font-bold mb-1">{quizResult.score} / {quizResult.total_points} pts</div>
                        <Badge variant={quizResult.passed ? "default" : "destructive"} className="text-lg px-4 py-1">
                          {quizResult.passed ? "PASSED" : "FAILED"}
                        </Badge>
                        <p className="text-muted-foreground mt-3 text-sm">
                          Time taken: {quizResult.time_taken ? `${Math.floor(quizResult.time_taken / 60)}m ${quizResult.time_taken % 60}s` : "N/A"}
                        </p>
                      </div>

                      {takingQuiz?.show_answers && quizResult.questions && (
                        <div className="space-y-4 text-left">
                          <h3 className="text-xl font-bold">Answer Review</h3>
                          {quizResult.questions.map((question, index) => {
                            const studentAnswer = answers[question.id];
                            const isCorrect = studentAnswer === question.correct_answer;
                            return (
                              <Card key={question.id} className={`p-5 border-2 ${isCorrect ? "border-green-500/30 bg-green-50/30" : "border-red-500/30 bg-red-50/30"}`}>
                                <div className="flex items-start gap-3 mb-3">
                                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">Q{index + 1}</span>
                                  {isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />}
                                </div>
                                <p className="font-semibold mb-3">{question.question}</p>
                                <div className="space-y-2">
                                  {question.options.map((opt, oi) => (
                                    <div key={oi} className={`p-3 rounded-lg border-2 text-sm ${oi === question.correct_answer ? "border-green-500 bg-green-50 dark:bg-green-950 font-medium" : oi === studentAnswer ? "border-red-500 bg-red-50 dark:bg-red-950 font-medium" : "border-border bg-muted/30"}`}>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">{String.fromCharCode(65 + oi)}.</span>
                                        <span>{opt}</span>
                                        {oi === question.correct_answer && <Badge className="ml-auto">Correct</Badge>}
                                        {oi === studentAnswer && oi !== question.correct_answer && <Badge variant="destructive" className="ml-auto">Your Answer</Badge>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {question.explanation && (
                                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg text-sm">
                                    <span className="font-medium">Explanation:</span> {question.explanation}
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                        <Button onClick={resetQuiz} className="gap-2"><BarChart3 className="h-4 w-4" /> View All Quizzes</Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      <StudentBottomNav />
    </div>
  );
}
