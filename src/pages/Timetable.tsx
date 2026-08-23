import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  BookOpen,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Video,
  Bell,
  Share2,
  QrCode,
  FileImage,
  FileText,
  Link as LinkIcon,
  Check,
  X as CloseIcon,
  FileCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getTimetableShareUrl } from "@/lib/config";
import { getBackend } from "@/lib/backendApi";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  course_id: string;
  total_points: number | null;
  status: string | null;
  course?: {
    code: string;
    title: string;
  };
}

// Sample course data - In production, this would come from your database
const courses = [
  {
    id: 1,
    code: "CS-401",
    title: "Advanced Data Structures",
    instructor: "Dr. Sarah Chen",
    color: "from-indigo-500 to-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: 2,
    code: "CS-402",
    title: "Database Systems & Cloud",
    instructor: "Prof. James Okonkwo",
    color: "from-emerald-500 to-teal-500",
    textColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    id: 3,
    code: "CS-403",
    title: "Software Engineering",
    instructor: "Dr. Emily Nakamura",
    color: "from-purple-500 to-fuchsia-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    id: 4,
    code: "CS-404",
    title: "Machine Learning",
    instructor: "Prof. Ahmed Hassan",
    color: "from-orange-500 to-red-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    id: 5,
    code: "CS-405",
    title: "Network Security",
    instructor: "Dr. Lisa Wong",
    color: "from-rose-500 to-pink-500",
    textColor: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  {
    id: 6,
    code: "CS-406",
    title: "Web Technologies",
    instructor: "Prof. Michael Brown",
    color: "from-cyan-500 to-blue-500",
    textColor: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
];

// Timetable schedule
const schedule = [
  {
    day: "Monday",
    sessions: [
      {
        courseId: 1,
        time: "08:00 - 10:00",
        room: "Lab 4",
        type: "Lecture",
        online: false,
      },
      {
        courseId: 2,
        time: "10:30 - 12:30",
        room: "Innovation Hub",
        type: "Lab",
        online: false,
      },
      {
        courseId: 4,
        time: "14:00 - 16:00",
        room: "Main Hall",
        type: "Lecture",
        online: true,
      },
    ],
  },
  {
    day: "Tuesday",
    sessions: [
      {
        courseId: 3,
        time: "08:00 - 10:00",
        room: "SE Studio",
        type: "Workshop",
        online: false,
      },
      {
        courseId: 5,
        time: "11:00 - 13:00",
        room: "Security Lab",
        type: "Lab",
        online: false,
      },
      {
        courseId: 6,
        time: "15:00 - 17:00",
        room: "Web Dev Lab",
        type: "Practical",
        online: false,
      },
    ],
  },
  {
    day: "Wednesday",
    sessions: [
      {
        courseId: 2,
        time: "09:00 - 11:00",
        room: "Online",
        type: "Tutorial",
        online: true,
      },
      {
        courseId: 1,
        time: "11:30 - 13:30",
        room: "Lab 4",
        type: "Lab",
        online: false,
      },
      {
        courseId: 4,
        time: "14:00 - 16:00",
        room: "AI Lab",
        type: "Practical",
        online: false,
      },
    ],
  },
  {
    day: "Thursday",
    sessions: [
      {
        courseId: 3,
        time: "08:00 - 10:00",
        room: "SE Studio",
        type: "Lecture",
        online: false,
      },
      {
        courseId: 6,
        time: "10:30 - 12:30",
        room: "Web Dev Lab",
        type: "Lab",
        online: false,
      },
      {
        courseId: 5,
        time: "14:00 - 16:00",
        room: "Online",
        type: "Lecture",
        online: true,
      },
    ],
  },
  {
    day: "Friday",
    sessions: [
      {
        courseId: 1,
        time: "08:00 - 10:00",
        room: "Main Hall",
        type: "Review",
        online: false,
      },
      {
        courseId: 2,
        time: "10:30 - 12:30",
        room: "Innovation Hub",
        type: "Project",
        online: false,
      },
    ],
  },
];

const timeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Timetable() {
  const { user } = useAuth();
  const [view, setView] = useState<"week" | "list">("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [dynamicCourses, setDynamicCourses] = useState<any[]>([]);
  const [submissionStatuses, setSubmissionStatuses] = useState<
    Map<string, string>
  >(new Map());
  const timetableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentDay = days[new Date().getDay() - 1] || "Monday";
  const timetableUrl = getTimetableShareUrl();

  // Helper to get color for a course index
  const getCourseColors = (index: number) => {
    const palettes = [
      {
        color: "from-indigo-500 to-blue-500",
        textColor: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      },
      {
        color: "from-emerald-500 to-teal-500",
        textColor: "text-emerald-600",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
      },
      {
        color: "from-purple-500 to-fuchsia-500",
        textColor: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
      },
      {
        color: "from-orange-500 to-red-500",
        textColor: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
      },
      {
        color: "from-rose-500 to-pink-500",
        textColor: "text-rose-600",
        bgColor: "bg-rose-50",
        borderColor: "border-rose-200",
      },
      {
        color: "from-cyan-500 to-blue-500",
        textColor: "text-cyan-600",
        bgColor: "bg-cyan-50",
        borderColor: "border-cyan-200",
      },
    ];
    return palettes[index % palettes.length];
  };

  // Fetch all data from the API backend
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoadingAssignments(true);

        // 1. Get enrolled courses
        const enrollments: any[] = await getBackend(
          `/api/enrollments/?student_id=${user.uid}`,
        );
        const approvedEnrollments = enrollments.filter(
          (e: any) => e.status === "approved" || e.status === "pending",
        );
        const enrolledCourseIds = approvedEnrollments
          .map((e: any) => e.course_id)
          .filter(Boolean);

        if (enrolledCourseIds.length === 0) {
          setAssignments([]);
          setDynamicCourses([]);
          setLoadingAssignments(false);
          return;
        }

        // Build course list from enrollment inline data
        const coursesList: any[] = [];
        const courseMap = new Map();
        approvedEnrollments.forEach((e: any) => {
          if (e.course) {
            const colors = getCourseColors(coursesList.length);
            const courseInfo = { ...e.course, ...colors };
            courseMap.set(e.course_id, courseInfo);
            coursesList.push(courseInfo);
          }
        });
        setDynamicCourses(coursesList);

        // 2. Fetch assignments for enrolled courses
        const courseIdsStr = enrolledCourseIds.join(",");
        const now = new Date().toISOString();
        const allAssignments: any[] = await getBackend(
          `/api/assignments/?course_ids=${courseIdsStr}`,
        );
        const upcomingAssignments = allAssignments.filter(
          (a: any) => a.due_date >= now,
        );

        // 3. Fetch submission statuses
        const assignmentIds = upcomingAssignments.map((a: any) => a.id);
        const statusMap = new Map<string, string>();
        if (assignmentIds.length > 0) {
          const assignmentIdsStr = assignmentIds.join(",");
          const submissions: any[] = await getBackend(
            `/api/submissions/?student_id=${user.uid}&assignment_ids=${assignmentIdsStr}`,
          );
          submissions.forEach((s: any) => {
            statusMap.set(s.assignment_id, s.status || "submitted");
          });
        }

        // Map assignments with course and status
        const mapped: Assignment[] = upcomingAssignments.map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          due_date: a.due_date,
          course_id: a.course_id,
          total_points: a.total_points,
          status: statusMap.get(a.id) || "pending",
          course:
            a.course_code || a.course_title
              ? { code: a.course_code, title: a.course_title }
              : undefined,
        }));

        setAssignments(mapped);
      } catch (error: any) {
        console.error("Error fetching timetable data:", error);
        toast({
          title: "Could not load timetable data",
          description: error.message || "Please refresh the page to try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingAssignments(false);
      }
    };

    fetchData();
  }, [user]);

  const getCourseById = (id: string | number) =>
    dynamicCourses.find((c) => c.id === id) ||
    courses.find((c) => c.id === (typeof id === "string" ? id : id)); // Keep fallback for mocked schedule

  // Share functionality
  const handleShare = async () => {
    const shareData = {
      title: "My Teaching Timetable",
      text: "Check out my weekly teaching schedule!",
      url: timetableUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully!",
          description: "Your timetable has been shared.",
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          // User cancelled, don't show error
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(timetableUrl);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Timetable link copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Export to PNG
  const exportToPNG = async () => {
    if (!timetableRef.current) return;

    setIsExporting(true);
    try {
      const element = timetableRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowHeight: element.scrollHeight,
        windowWidth: element.scrollWidth,
      });

      const link = document.createElement("a");
      link.download = `teaching-timetable-${
        new Date().toISOString().split("T")[0]
      }.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({
        title: "Export successful!",
        description: "Your timetable has been downloaded as PNG.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export timetable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!timetableRef.current) return;

    setIsExporting(true);
    try {
      const element = timetableRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowHeight: element.scrollHeight,
        windowWidth: element.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(
        `teaching-timetable-${new Date().toISOString().split("T")[0]}.pdf`,
      );

      toast({
        title: "Export successful!",
        description: "Your timetable has been downloaded as PDF.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export timetable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderWeekView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[1000px]">
        {/* Time Grid Header */}
        <div className="grid grid-cols-6 gap-2 mb-2">
          <div className="text-sm font-semibold text-muted-foreground"></div>
          {days.map((day) => (
            <div
              key={day}
              className={cn(
                "text-center py-3 px-2 rounded-lg font-semibold transition-all relative",
                day === currentDay
                  ? "bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground shadow-lg ring-2 ring-secondary/50"
                  : "bg-muted/50 text-foreground",
              )}
            >
              <div className="text-xs uppercase tracking-wide">
                {day.slice(0, 3)}
              </div>
              <div className="text-lg">{day}</div>
              {day === currentDay && (
                <div className="absolute -top-2 -right-2 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Timetable Grid */}
        <div className="grid grid-cols-6 gap-2">
          {/* Time column */}
          <div className="space-y-2">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-20 flex items-center justify-center text-xs font-medium text-muted-foreground"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const daySchedule = schedule.find((s) => s.day === day);
            return (
              <div
                key={day}
                className={cn(
                  "space-y-2 p-2 rounded-lg transition-colors",
                  day === currentDay ? "bg-secondary/5" : "",
                )}
              >
                {timeSlots.map((time, index) => {
                  const session = daySchedule?.sessions.find((s) => {
                    const sessionStartHour = parseInt(s.time.split(":")[0]);
                    const slotHour = parseInt(time.split(":")[0]);
                    return sessionStartHour === slotHour;
                  });

                  if (session) {
                    const course = getCourseById(session.courseId);
                    const duration =
                      parseInt(session.time.split(" - ")[1]) -
                      parseInt(session.time.split(":")[0]);

                    return (
                      <motion.div
                        key={`${day}-${time}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          "relative h-20 rounded-lg border-l-4 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group",
                          course?.bgColor,
                          course?.borderColor,
                        )}
                        style={{
                          minHeight: duration > 2 ? "160px" : "80px",
                        }}
                      >
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h4
                                className={cn(
                                  "font-bold text-xs line-clamp-1",
                                  course?.textColor,
                                )}
                              >
                                {course?.code}
                              </h4>
                              {session.online && (
                                <Video className="h-3 w-3 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                              {course?.title}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{session.time}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="line-clamp-1">
                                {session.room}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Hover tooltip */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg border z-10 w-64">
                            <p className="font-semibold text-sm">
                              {course?.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {course?.instructor}
                            </p>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                <Clock className="h-3 w-3" />
                                <span>{session.time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <MapPin className="h-3 w-3" />
                                <span>{session.room}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <BookOpen className="h-3 w-3" />
                                <span>{session.type}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <div
                      key={`${day}-${time}`}
                      className={cn(
                        "h-20 rounded-lg border border-dashed transition-colors",
                        day === currentDay
                          ? "bg-secondary/10 border-secondary/30"
                          : "bg-muted/20 border-muted-foreground/20",
                      )}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="space-y-6">
      {schedule.map((daySchedule, dayIndex) => (
        <motion.div
          key={daySchedule.day}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: dayIndex * 0.1 }}
        >
          <Card
            className={cn(
              "overflow-hidden",
              daySchedule.day === currentDay && "border-secondary shadow-lg",
            )}
          >
            <div
              className={cn(
                "px-6 py-4 border-b",
                daySchedule.day === currentDay
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted/50",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{daySchedule.day}</h3>
                {daySchedule.day === currentDay && (
                  <Badge variant="secondary" className="bg-background/20">
                    Today
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-6 space-y-4">
              {daySchedule.sessions.map((session, sessionIndex) => {
                const course = getCourseById(session.courseId);
                return (
                  <motion.div
                    key={sessionIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: dayIndex * 0.1 + sessionIndex * 0.05 }}
                    className={cn(
                      "relative p-4 rounded-lg border-l-4 hover:shadow-md transition-all cursor-pointer",
                      course?.bgColor,
                      course?.borderColor,
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4
                            className={cn(
                              "font-bold text-lg",
                              course?.textColor,
                            )}
                          >
                            {course?.code}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {session.type}
                          </Badge>
                          {session.online && (
                            <Badge
                              variant="secondary"
                              className="text-xs gap-1"
                            >
                              <Video className="h-3 w-3" />
                              Online
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {course?.title}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{course?.instructor}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{session.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{session.room}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-shrink-0"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  const todaysSessions = useMemo(() => {
    const today = schedule.find((s) => s.day === currentDay);
    return (
      today?.sessions.map((session) => ({
        ...session,
        course: getCourseById(session.courseId),
      })) || []
    );
  }, [currentDay]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <StudentHeader />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1600px] mx-auto space-y-6"
        >
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-secondary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Teaching Timetable
              </h1>
              <p className="text-muted-foreground mt-2">
                Your weekly class schedule at a glance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowQRDialog(true)}
              >
                <QrCode className="h-4 w-4" />
                <span className="hidden sm:inline">QR Code</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleShare}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {copied ? "Copied!" : "Share"}
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {isExporting ? "Exporting..." : "Export"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={exportToPNG}>
                    <FileImage className="h-4 w-4 mr-2" />
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dynamicCourses.length}</p>
                  <p className="text-xs text-muted-foreground">Courses</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todaysSessions.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Today's Classes
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {schedule.reduce(
                      (acc, day) => acc + day.sessions.length,
                      0,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Weekly Sessions
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {schedule.reduce(
                      (acc, day) =>
                        acc + day.sessions.filter((s) => s.online).length,
                      0,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Online Classes
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Upcoming Assignments Section */}
          {assignments.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">
                    Upcoming Assignments
                  </h3>
                </div>
                <Badge variant="secondary">{assignments.length} due</Badge>
              </div>
              <div className="space-y-3">
                {assignments.slice(0, 5).map((assignment, index) => {
                  const dueDate = new Date(assignment.due_date);
                  const daysUntilDue = Math.ceil(
                    (dueDate.getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  const isUrgent = daysUntilDue <= 3;

                  return (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border-l-4 hover:shadow-md transition-all cursor-pointer",
                        isUrgent
                          ? "bg-red-50 border-red-500"
                          : "bg-blue-50 border-blue-500",
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4
                            className={cn(
                              "font-semibold text-sm",
                              isUrgent ? "text-red-700" : "text-blue-700",
                            )}
                          >
                            {assignment.title}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {assignment.course?.code}
                          </Badge>
                          {assignment.status && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] h-4",
                                assignment.status === "submitted"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : assignment.status === "graded"
                                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20",
                              )}
                            >
                              {assignment.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {assignment.course?.title}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            <span>Due {dueDate.toLocaleDateString()}</span>
                          </div>
                          {assignment.total_points && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>{assignment.total_points} points</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-xl font-bold",
                            isUrgent ? "text-red-600" : "text-blue-600",
                          )}
                        >
                          {daysUntilDue}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {daysUntilDue === 1 ? "day" : "days"}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          )}

          {loadingAssignments && (
            <Card className="p-6">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm">Loading assignments...</p>
              </div>
            </Card>
          )}

          {!loadingAssignments && assignments.length === 0 && (
            <Card className="p-6">
              <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-4">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm font-medium">No upcoming assignments</p>
                <p className="text-xs">
                  Assignments will appear here when they are created
                </p>
              </div>
            </Card>
          )}

          {/* View Tabs */}
          <div ref={timetableRef}>
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as "week" | "list")}
            >
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="week">Week View</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                </TabsList>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>

              <TabsContent value="week" className="mt-6">
                {renderWeekView()}
              </TabsContent>

              <TabsContent value="list" className="mt-6">
                {renderListView()}
              </TabsContent>
            </Tabs>
          </div>

          {/* Course Legend */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Course Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dynamicCourses.map((course) => (
                <div
                  key={course.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-l-4",
                    course.bgColor,
                    course.borderColor,
                  )}
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      `bg-gradient-to-br ${course.color}`,
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn("font-semibold text-sm", course.textColor)}
                    >
                      {course.code}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {course.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </main>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Timetable via QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to view and download the timetable
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="p-4 bg-white rounded-lg border-2 border-muted">
              <QRCodeSVG
                value={timetableUrl}
                size={256}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: "/logo.png",
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <code className="text-xs flex-1 truncate">{timetableUrl}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyToClipboard}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-xs">Copy</span>
                  )}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Anyone with this QR code can view your teaching timetable
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                onClick={exportToPNG}
                variant="outline"
                className="flex-1 gap-2"
                disabled={isExporting}
              >
                <FileImage className="h-4 w-4" />
                Download PNG
              </Button>
              <Button
                onClick={exportToPDF}
                variant="outline"
                className="flex-1 gap-2"
                disabled={isExporting}
              >
                <FileText className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <StudentBottomNav />
    </div>
  );
}
