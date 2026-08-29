import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Clock,
  Award,
  Users,
  Sparkles,
  Upload,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, getMessagingBackend, postBackend, postMessagingBackend } from "@/lib/backendApi";
import { useToast } from "@/components/ui/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { QuestionReview } from "@/components/QuestionReview";
import {
  DocumentAnalysisResult,
  ExtractedQuestion,
} from "@/lib/documentAnalyzer";

interface CourseOption {
  id: string;
  title: string;
  code: string;
}

interface EditingFormData {
  title: string;
  description: string;
  courseId: string;
  totalQuestions: number;
  totalPoints: number;
  timeLimit: number;
  passingScore: number;
  startDate: string;
  startTime: string;
  startTimePeriod: "AM" | "PM";
  endDate: string;
  endTime: string;
  endTimePeriod: "AM" | "PM";
  status: "draft" | "active" | "closed";
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  showAnswers: boolean;
  autoDeactivate: boolean;
}

type QuizCreationStep = "upload" | "review" | "settings" | "confirm";

type AIDifficulty = "easy" | "medium" | "hard" | "mixed";
type AIQuestionType =
  | "mixed"
  | "multiple_choice"
  | "true_false"
  | "short_answer";

export default function CreateQuiz() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [currentStep, setCurrentStep] = useState<QuizCreationStep>("upload");
  const [analysisResult, setAnalysisResult] =
    useState<DocumentAnalysisResult | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<
    ExtractedQuestion[]
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState<EditingFormData>({
    title: "",
    description: "",
    courseId: "",
    totalQuestions: 10,
    totalPoints: 20,
    timeLimit: 30,
    passingScore: 12,
    startDate: "",
    startTime: "",
    startTimePeriod: "AM" as "AM" | "PM",
    endDate: "",
    endTime: "",
    endTimePeriod: "PM" as "AM" | "PM",
    status: "active" as "draft" | "active" | "closed",
    attemptsAllowed: 1,
    shuffleQuestions: false,
    showAnswers: false,
    autoDeactivate: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("mixed");
  const [aiQuestionType, setAiQuestionType] = useState<AIQuestionType>("mixed");
  const [aiQuestionCount, setAiQuestionCount] = useState(10);
  const [aiTopicFocus, setAiTopicFocus] = useState("");

  // Document analysis handlers
  const handleAnalysisComplete = (result: DocumentAnalysisResult) => {
    setAnalysisResult(result);
    setExtractedQuestions(result.questions);
    setUploadError(null);

    // Auto-fill form data based on analysis
    if (result.questions.length > 0) {
      setFormData((prev) => ({
        ...prev,
        totalQuestions: result.questions.length,
        totalPoints: result.questions.length,
        passingScore: Math.ceil(result.questions.length * 0.6),
      }));
    }

    setCurrentStep("review");
    toast({
      title: "Success",
      description: `Extracted ${result.questions.length} questions from document`,
    });
  };

  const handleAnalysisError = (error: string) => {
    setUploadError(error);
    setAnalysisResult(null);
    setExtractedQuestions([]);
    toast({
      title: "Analysis Error",
      description: error,
      variant: "destructive",
    });
  };

  const handleQuestionsUpdate = (questions: ExtractedQuestion[]) => {
    setExtractedQuestions(questions);

    // Update total questions and points
    const totalPoints = questions.length;
    setFormData((prev) => ({
      ...prev,
      totalQuestions: questions.length,
      totalPoints: totalPoints,
      passingScore: Math.ceil(totalPoints * 0.6), // 60% passing score
    }));
  };

  // Helper function to combine date, time, and AM/PM into ISO string
  const combineDateTime = (
    date: string,
    time: string,
    period: "AM" | "PM",
  ): string => {
    const [hours, minutes] = time.split(":");
    let hour24 = parseInt(hours);

    if (period === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (period === "AM" && hour24 === 12) {
      hour24 = 0;
    }

    const dateTime = new Date(date);
    dateTime.setHours(hour24, parseInt(minutes), 0, 0);

    return dateTime.toISOString();
  };

  const fetchLecturerCourses = async () => {
    try {
      if (!user?.uid) return;

      const courseUnitsData = await getMessagingBackend<any[]>("/api/course-units/");
      const coursesData: CourseOption[] = (courseUnitsData || []).map((course: any) => ({
        id: course.id,
        code: course.code || course.course_unit_code || "Unknown",
        title: course.name || course.course_unit_name || "Unknown Course",
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

  // Handle URL parameter for pre-selected course
  useEffect(() => {
    const courseParam = searchParams.get("course");
    if (courseParam) {
      // Set the courseId immediately from URL parameter
      setFormData((prev) => ({ ...prev, courseId: courseParam }));
    }
  }, [searchParams]);

  // Validate pre-selected course once courses are loaded
  useEffect(() => {
    const courseParam = searchParams.get("course");
    if (courseParam && courses.length > 0) {
      // Check if the pre-selected course exists in the loaded courses
      const courseExists = courses.find((c) => c.id === courseParam);
      if (!courseExists) {
        // If the course doesn't exist, clear the selection and show error
        setFormData((prev) => ({ ...prev, courseId: "" }));
        toast({
          title: "Course Not Found",
          description:
            "The selected course is not available. Please choose a different course.",
          variant: "destructive",
        });
      }
    }
  }, [courses, searchParams, toast]);

  // Fetch courses on component mount
  useEffect(() => {
    if (user?.uid) {
      fetchLecturerCourses();
    }
  }, [user?.uid]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Quiz title is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.courseId) {
      newErrors.courseId = "Please select a course";
    }
    if (formData.totalQuestions < 1) {
      newErrors.totalQuestions = "Must have at least 1 question";
    }
    if (formData.totalPoints < 1) {
      newErrors.totalPoints = "Must have at least 1 point";
    }
    if (formData.timeLimit < 1) {
      newErrors.timeLimit = "Time limit must be at least 1 minute";
    }
    if (formData.passingScore > formData.totalPoints) {
      newErrors.passingScore = "Passing score cannot exceed total points";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    }

    // Combine date and time for validation
    if (
      formData.startDate &&
      formData.startTime &&
      formData.endDate &&
      formData.endTime
    ) {
      const startDateTime = combineDateTime(
        formData.startDate,
        formData.startTime,
        formData.startTimePeriod,
      );
      const endDateTime = combineDateTime(
        formData.endDate,
        formData.endTime,
        formData.endTimePeriod,
      );

      if (startDateTime >= endDateTime) {
        newErrors.endDate =
          "End date and time must be after start date and time";
      }
    }
    if (formData.attemptsAllowed < 1) {
      newErrors.attemptsAllowed = "Must allow at least 1 attempt";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    field: string,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleGenerateAIQuestions = () => {
    const count = Math.max(1, Math.min(50, aiQuestionCount || 10));
    const selectedCourseForAI = courses.find((c) => c.id === formData.courseId);
    const topicBase =
      aiTopicFocus.trim() ||
      selectedCourseForAI?.title ||
      formData.title.trim() ||
      "the selected course";

    const generatedQuestions: ExtractedQuestion[] = Array.from(
      { length: count },
      (_, index) => {
        const resolvedDifficulty: "easy" | "medium" | "hard" =
          aiDifficulty === "mixed"
            ? (["easy", "medium", "hard"][index % 3] as
                | "easy"
                | "medium"
                | "hard")
            : aiDifficulty;

        const resolvedType: "multiple_choice" | "true_false" =
          aiQuestionType === "mixed"
            ? (["multiple_choice", "true_false"][index % 2] as
                | "multiple_choice"
                | "true_false")
            : aiQuestionType === "short_answer"
              ? "multiple_choice"
              : (aiQuestionType as "multiple_choice" | "true_false");

        const questionText =
          resolvedType === "true_false"
            ? `${index + 1}. ${topicBase} statement ${index + 1} is correct.`
            : `${index + 1}. Which option best describes ${topicBase} concept ${index + 1}?`;

        const options =
          resolvedType === "true_false"
            ? ["True", "False"]
            : [
                `${topicBase} core principle`,
                `An unrelated interpretation`,
                `A partially correct statement`,
                `A contradictory statement`,
              ];

        return {
          id: `ai_q_${Date.now()}_${index + 1}`,
          question: questionText,
          type: resolvedType,
          options,
          correct_answer: 0,
          explanation:
            resolvedType === "true_false"
              ? "The statement reflects the intended concept."
              : "Option A best aligns with the topic context.",
          points: 1,
          difficulty: resolvedDifficulty,
          confidence: 0.75,
          originalText: "Generated from quiz settings",
        };
      },
    );

    setExtractedQuestions(generatedQuestions);
    setAnalysisResult({
      questions: generatedQuestions,
      metadata: {
        totalQuestions: generatedQuestions.length,
        questionTypes: [...new Set(generatedQuestions.map((q) => q.type))],
        estimatedDifficulty: aiDifficulty,
        processingTime: 0,
      },
      rawText: `AI-generated topic: ${topicBase}`,
    });

    setFormData((prev) => ({
      ...prev,
      totalQuestions: generatedQuestions.length,
      totalPoints: generatedQuestions.length,
      passingScore: Math.ceil(generatedQuestions.length * 0.6),
    }));

    setCurrentStep("review");
    toast({
      title: "AI Generation Complete",
      description: `Generated ${generatedQuestions.length} questions. Review and edit them before publishing.`,
    });
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      return;
    }

    if (extractedQuestions.length === 0) {
      toast({
        title: "Error",
        description:
          "Cannot create quiz without questions. Please upload and review questions.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      if (!user?.uid) throw new Error("User UID not found");

      const selectedCourse = courses.find((c) => c.id === formData.courseId);

      const startDateTime = combineDateTime(
        formData.startDate,
        formData.startTime,
        formData.startTimePeriod,
      );
      const endDateTime = combineDateTime(
        formData.endDate,
        formData.endTime,
        formData.endTimePeriod,
      );

      const quizPayload = {
        title: formData.title,
        description: formData.description,
        course_id: formData.courseId,
        course_title: selectedCourse?.title,
        course_code: selectedCourse?.code,
        total_questions: formData.totalQuestions,
        total_points: formData.totalPoints,
        time_limit: formData.timeLimit,
        passing_score: formData.passingScore,
        start_date: startDateTime,
        end_date: endDateTime,
        status: formData.status,
        attempts_allowed: formData.attemptsAllowed,
        shuffle_questions: formData.shuffleQuestions,
        show_answers: formData.showAnswers,
        auto_deactivate: formData.autoDeactivate,
        lecturer_id: user.uid,
        questions: extractedQuestions.map((question) => {
          let correctAnswerValue: string | number = question.correct_answer;
          if (
            typeof correctAnswerValue === "string" &&
            /^\d+$/.test(correctAnswerValue)
          ) {
            correctAnswerValue = parseInt(correctAnswerValue, 10);
          }
          return {
            question: question.question,
            type: question.type,
            options: question.options || [],
            correct_answer: correctAnswerValue,
            explanation: question.explanation || "",
            points: 1,
            difficulty: question.difficulty,
            confidence: question.confidence,
            original_text: question.originalText,
          };
        }),
      };

      await postMessagingBackend("/api/quizzes/", quizPayload);

      toast({
        title: "Success",
        description: `Quiz created successfully with ${extractedQuestions.length} questions!`,
      });

      navigate("/lecturer/quiz");
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === formData.courseId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 text-foreground">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/10 blur-3xl rounded-full opacity-60" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-gradient-to-bl from-secondary/15 via-primary/10 to-transparent blur-3xl rounded-full opacity-40" />
      </div>

      <LecturerHeader />

      <main className="px-4 pb-28 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto pt-6 lg:pt-10">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (currentStep !== "upload") {
                  setCurrentStep("upload");
                } else {
                  navigate("/lecturer/quiz");
                }
              }}
              className="rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create New Quiz</h1>
              <p className="text-muted-foreground">
                Upload documents and set up your quiz
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep === "upload" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <Upload className="h-4 w-4" />
              <span className="text-sm font-medium">Upload</span>
            </div>
            <div className="h-1 w-8 bg-muted rounded"></div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep === "review" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Review</span>
            </div>
            <div className="h-1 w-8 bg-muted rounded"></div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep === "settings" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <Award className="h-4 w-4" />
              <span className="text-sm font-medium">Settings</span>
            </div>
          </div>

          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {currentStep === "upload" && (
              <>
                {uploadError && (
                  <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <div>
                          <p className="font-medium text-destructive">
                            Upload Error
                          </p>
                          <p className="text-sm text-destructive/80">
                            {uploadError}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <DocumentUpload
                  onAnalysisComplete={handleAnalysisComplete}
                  onAnalysisError={handleAnalysisError}
                />
              </>
            )}

            {currentStep === "review" && analysisResult && (
              <>
                <QuestionReview
                  questions={extractedQuestions}
                  onQuestionsUpdate={handleQuestionsUpdate}
                  analysisResult={analysisResult}
                />

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("upload")}
                  >
                    Back to Upload
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep("settings")}
                    disabled={extractedQuestions.length === 0}
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                  >
                    Continue to Settings
                  </Button>
                </div>
              </>
            )}

            {currentStep === "settings" && (
              <form onSubmit={handleCreateQuiz} className="space-y-6">
                {/* Basic Information */}
                <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <CardTitle>Basic Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Quiz Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          handleInputChange("title", e.target.value)
                        }
                        placeholder="e.g., Chapter 5 Quiz - Data Structures"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      {errors.title && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.title}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        placeholder="Describe what this quiz covers..."
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      {errors.description && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Course *
                      </label>
                      <select
                        value={formData.courseId}
                        onChange={(e) =>
                          handleInputChange("courseId", e.target.value)
                        }
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">
                          {courses.length === 0
                            ? formData.courseId
                              ? "Loading course details..."
                              : "Loading courses..."
                            : "Select a course"}
                        </option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.title}
                          </option>
                        ))}
                      </select>
                      {errors.courseId && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.courseId}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Start Date & Time *
                        </label>
                        <div className="grid gap-2 md:grid-cols-3">
                          <div>
                            <input
                              type="date"
                              value={formData.startDate}
                              onChange={(e) =>
                                handleInputChange("startDate", e.target.value)
                              }
                              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div>
                            <input
                              type="time"
                              value={formData.startTime}
                              onChange={(e) =>
                                handleInputChange("startTime", e.target.value)
                              }
                              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div>
                            <select
                              value={formData.startTimePeriod}
                              onChange={(e) =>
                                handleInputChange(
                                  "startTimePeriod",
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                        {errors.startDate && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.startDate}
                          </p>
                        )}
                        {errors.startTime && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.startTime}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          End Date & Time *
                        </label>
                        <div className="grid gap-2 md:grid-cols-3">
                          <div>
                            <input
                              type="date"
                              value={formData.endDate}
                              onChange={(e) =>
                                handleInputChange("endDate", e.target.value)
                              }
                              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div>
                            <input
                              type="time"
                              value={formData.endTime}
                              onChange={(e) =>
                                handleInputChange("endTime", e.target.value)
                              }
                              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                          <div>
                            <select
                              value={formData.endTimePeriod}
                              onChange={(e) =>
                                handleInputChange(
                                  "endTimePeriod",
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                        {errors.endDate && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.endDate}
                          </p>
                        )}
                        {errors.endTime && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.endTime}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz Settings */}
                <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <CardTitle>Quiz Settings</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Total Questions *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.totalQuestions}
                          onChange={(e) =>
                            handleInputChange(
                              "totalQuestions",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        {errors.totalQuestions && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.totalQuestions}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Total Points *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.totalPoints}
                          onChange={(e) =>
                            handleInputChange(
                              "totalPoints",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        {errors.totalPoints && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.totalPoints}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Time Limit (minutes) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.timeLimit}
                          onChange={(e) =>
                            handleInputChange(
                              "timeLimit",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        {errors.timeLimit && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.timeLimit}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Passing Score *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={formData.totalPoints}
                          value={formData.passingScore}
                          onChange={(e) =>
                            handleInputChange(
                              "passingScore",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        {errors.passingScore && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.passingScore}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Attempts Allowed *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.attemptsAllowed}
                          onChange={(e) =>
                            handleInputChange(
                              "attemptsAllowed",
                              parseInt(e.target.value),
                            )
                          }
                          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        {errors.attemptsAllowed && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.attemptsAllowed}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) =>
                            handleInputChange(
                              "status",
                              e.target.value as "draft" | "active" | "closed",
                            )
                          }
                          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Options */}
                <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle>Options</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.shuffleQuestions}
                        onChange={(e) =>
                          handleInputChange(
                            "shuffleQuestions",
                            e.target.checked,
                          )
                        }
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium">Shuffle Questions</p>
                        <p className="text-sm text-muted-foreground">
                          Randomize question order for each student
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.showAnswers}
                        onChange={(e) =>
                          handleInputChange("showAnswers", e.target.checked)
                        }
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium">
                          Show Answers After Submission
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Allow students to see correct answers
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.autoDeactivate}
                        onChange={(e) =>
                          handleInputChange("autoDeactivate", e.target.checked)
                        }
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium">
                          Auto-Deactivate on End Date
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Automatically close the quiz when the end date and
                          time is reached
                        </p>
                      </div>
                    </label>
                  </CardContent>
                </Card>

                {/* AI Question Generation */}
                <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle>AI Question Generation</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Generate questions automatically using AI based on your
                      course content
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Difficulty Level
                        </label>
                        <select
                          value={aiDifficulty}
                          onChange={(e) =>
                            setAiDifficulty(e.target.value as AIDifficulty)
                          }
                          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="mixed">Mixed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Question Types
                        </label>
                        <select
                          value={aiQuestionType}
                          onChange={(e) =>
                            setAiQuestionType(e.target.value as AIQuestionType)
                          }
                          className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="mixed">Mixed Types</option>
                          <option value="multiple_choice">
                            Multiple Choice Only
                          </option>
                          <option value="true_false">True/False Only</option>
                          <option value="short_answer">
                            Short Answer Only
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Number of Questions
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={aiQuestionCount}
                        onChange={(e) =>
                          setAiQuestionCount(Number(e.target.value) || 1)
                        }
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Topic Focus (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Data Structures, Algorithms, Programming Fundamentals"
                        value={aiTopicFocus}
                        onChange={(e) => setAiTopicFocus(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    <Button
                      type="button"
                      className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                      onClick={handleGenerateAIQuestions}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Questions with AI
                    </Button>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/lecturer/quiz")}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-6"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5 mr-2" />
                        Create Quiz
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </main>

      <LecturerBottomNav />
    </div>
  );
}
