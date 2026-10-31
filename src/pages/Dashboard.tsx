import { useEffect, useState, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Trophy,
  Clock,
  TrendingUp,
  Calendar,
  Video,
  Users,
  Link,
  Plus,
  Clipboard,
  Mic,
  Play,
  FileText,
  Folder,
  MessageCircle,
  Sparkles,
  X,
  AlarmClock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { StatCard } from "@/components/dashboard/StatCard";
import { CourseCard } from "@/components/dashboard/CourseCard";
import { UpcomingCard } from "@/components/dashboard/UpcomingCard";
import { AnnouncementCard } from "@/components/dashboard/AnnouncementCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useAuth } from "@/contexts/AuthContext";
import { getMessagingBackend, MESSAGING_API_BASE_URL } from "@/lib/backendApi";

/* ------------------------------------------------------------------ */
/* Debug instrumentation                                              */
/* Filter the console on "[Dashboard]" for page-level logs and         */
/* "[API]" for the HTTP layer (src/lib/backendApi.ts).                 */
/* ------------------------------------------------------------------ */

const LOG_TAG = "[Dashboard]";
const AUTH_TOKEN_KEY = "nexus-auth-token";
const mountId = `mount-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type LogDetail = Record<string, unknown>;

function log(stage: string, detail?: LogDetail) {
  console.log(`${LOG_TAG} ${stage}`, detail ?? "");
}

function warn(stage: string, detail?: LogDetail) {
  console.warn(`${LOG_TAG} ${stage}`, detail ?? "");
}

function error(stage: string, detail?: LogDetail) {
  console.error(`${LOG_TAG} ${stage}`, detail ?? "");
}

function describeError(err: unknown) {
  const base: LogDetail = {
    raw: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    stack:
      err instanceof Error
        ? err.stack?.split("\n").slice(0, 4).join("\n")
        : undefined,
  };

  if (err instanceof TypeError) {
    return {
      ...base,
      kind: "network",
      hint: "fetch() rejected before any HTTP response arrived. Backend down, wrong base URL, or blocked by CORS. Cross-check the [API] request log for the URL attempted and compare pageOrigin against the backend's CORS allow-list.",
    };
  }
  if (err instanceof SyntaxError) {
    return {
      ...base,
      kind: "json-parse",
      hint: "The response body was not valid JSON. Check the [API] response log for the content-type and body preview.",
    };
  }
  return {
    ...base,
    kind: "http-or-unknown",
    hint: "Look for the matching [API] response log for the HTTP status code.",
  };
}

/**
 * Every fetch on this page is individually `.catch(() => [])`, so a failing
 * endpoint degrades to an empty list with no visible error. This reports the
 * raw length, the fields the page actually reads, and any rows missing them.
 */
function inspectRows(label: string, rows: unknown, fields: string[]) {
  if (!Array.isArray(rows)) {
    error(`${label}.not-an-array`, {
      receivedType: rows === null ? "null" : typeof rows,
      preview: JSON.stringify(rows ?? null)?.slice(0, 200),
    });
    return;
  }

  const problems = rows
    .map((row, index) => {
      const r = row as Record<string, unknown> | null;
      if (!r || typeof r !== "object") {
        return { index, issue: "row is not an object", value: String(row) };
      }
      const missing = fields.filter(
        (f) => r[f] === undefined || r[f] === null || r[f] === "",
      );
      return missing.length ? { index, missing } : null;
    })
    .filter(Boolean);

  if (problems.length) {
    warn(`${label}.rows-missing-fields`, {
      total: rows.length,
      rowsWithProblems: problems.length,
      sample: problems.slice(0, 5),
      expectedFields: fields,
    });
  } else {
    log(`${label}.shape-ok`, { total: rows.length });
  }
}

type ResultCourse = {
  title: string;
  code: string;
  credits: number | null;
};

type ExamResultRow = {
  id: string;
  course_id: string;
  academic_year: string;
  semester: string;
  marks: number;
  grade: string | null;
  grade_point: number | null;
  courses?: ResultCourse;
};

type TermResult = {
  term: string;
  gpa: number;
  totalCredits: number;
  remark?: string;
  entries: Array<
    ExamResultRow & { courseTitle: string; courseCode: string; credits: number }
  >;
};

const calculateSemesterRemark = (
  gp: number,
  grade: string | null,
): string => {
  if (!grade) return "—";
  if (gp >= 3.5) return "Excellent";
  if (gp >= 3.0) return "Very Good";
  if (gp >= 2.5) return "Good";
  if (gp >= 2.0) return "Satisfactory";
  if (gp >= 1.0) return "Pass";
  return "Fail";
};

type DashboardAssignment = {
  id: string;
  title: string;
  dueDate: string | null;
  courseTitle: string;
  courseCode: string;
  totalPoints: number | null;
  status: "submitted" | "pending";
  rawStatus: string | null;
};

interface LiveSession {
  id: string;
  title: string;
  courseName?: string | null;
  scheduledAt: string;
  durationMinutes?: number | null;
  meetLink?: string | null;
  imageUrl?: string | null;
  isLive: boolean;
}

interface DashboardQuiz {
  id: string;
  title: string;
  courseTitle?: string | null;
  courseCode?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isLive: boolean;
  isScheduled: boolean;
}

interface DashboardData {
  stats: {
    enrolled: number;
    completed: number;
    assignments: number;
    liveMeets: number;
  };
  results: {
    terms: TermResult[];
    cgpa: number;
  };
  live_sessions: LiveSession[];
  quizzes: DashboardQuiz[];
  assignments: DashboardAssignment[];
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.displayName || "Student";
  const firstName = displayName.split(" ")[0];
  const [stats, setStats] = useState({
    enrolled: 0,
    completed: 0,
    assignments: 0,
    liveMeets: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [termResults, setTermResults] = useState<TermResult[]>([]);
  const [cgpa, setCgpa] = useState(0);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [assignments, setAssignments] = useState<DashboardAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [liveSessionsLoading, setLiveSessionsLoading] = useState(true);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<DashboardQuiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);

  useEffect(() => {
    let authTokenPresent = false;
    try {
      authTokenPresent = Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY));
    } catch {
      authTokenPresent = false;
    }

    log("mount", {
      mountId,
      messagingBaseUrl: MESSAGING_API_BASE_URL,
      pageOrigin: window.location.origin,
      authTokenPresent,
      isSecureContext: window.isSecureContext,
      userPresent: Boolean(user),
      profilePresent: Boolean(profile),
      viteEnv: {
        VITE_WEBMAIL_API_BASE_URL: import.meta.env.VITE_WEBMAIL_API_BASE_URL,
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
        VITE_NU_API_BASE_URL: import.meta.env.VITE_NU_API_BASE_URL,
      },
      note: "This page reads /api/profiles, /api/course-units, /api/student-grades, /api/quizzes, /api/quiz-attempts, /api/live-sessions and /api/enrollments from messagingBaseUrl. If that host is the wrong backend those paths 404 and every list silently renders empty.",
    });

    const onWindowError = (event: ErrorEvent) => {
      error("window.error", {
        message: event.message,
        source: `${event.filename}:${event.lineno}:${event.colno}`,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      error("window.unhandledrejection", { reason: String(event.reason) });
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      log("unmount", { mountId });
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    log("auth.changed", {
      mountId,
      hasUser: Boolean(user),
      uid: user?.uid ?? null,
      uidType: typeof user?.uid,
      email: user?.email ?? null,
      hasProfile: Boolean(profile),
      profileRole: profile?.role ?? null,
      profileFullName: profile?.full_name ?? null,
      note: "profile.full_name drives displayName; user.displayName and the literal 'Student' are the fallbacks.",
    });
  }, [user, profile]);

  useEffect(() => {
    const flags = {
      loadingStats,
      resultsLoading,
      assignmentsLoading,
      liveSessionsLoading,
      quizzesLoading,
    };
    const allLoading = Object.values(flags).every(Boolean);

    if (allLoading) {
      warn("loading.all-flags-true", {
        mountId,
        ...flags,
        note: "loadDashboard() bails early when user is falsy, and its finally block is what clears these flags. All five stuck true means loadDashboard never ran to completion.",
      });
    }
  }, [
    loadingStats,
    resultsLoading,
    assignmentsLoading,
    liveSessionsLoading,
    quizzesLoading,
  ]);

  useEffect(() => {
    const gradeEntries = termResults.reduce(
      (sum, term) => sum + term.entries.length,
      0,
    );

    log("derived.state", {
      mountId,
      stats,
      cgpa,
      termCount: termResults.length,
      gradeEntryCount: gradeEntries,
      terms: termResults.map((t) => ({
        term: t.term,
        gpa: Number(t.gpa?.toFixed?.(2) ?? t.gpa),
        totalCredits: t.totalCredits,
        entries: t.entries.length,
      })),
      upcomingQuizCount: upcomingQuizzes.length,
      liveSessionCount: liveSessions.length,
      activeMeetsCount: liveSessions.filter((s) => s.isLive).length,
      assignmentsCount: assignments.length,
      assignmentsError,
      emptyStateHints: {
        noResults:
          termResults.length === 0
            ? "student-grades returned no rows for the resolved messengerStudentId"
            : null,
        noQuizzes:
          upcomingQuizzes.length === 0
            ? "/api/quizzes/?status=active returned nothing or failed"
            : null,
        noSessions:
          liveSessions.length === 0
            ? "/api/live-sessions/ returned nothing or failed"
            : null,
        noEnrollments:
          stats.enrolled === 0
            ? "/api/enrollments/?student_id returned no rows with status=approved, or messengerStudentId could not be resolved"
            : null,
      },
      note: "assignments/assignmentsError are declared but never written by loadDashboard, so assignmentsCount is always 0 and assignmentsError is always null.",
    });
  }, [
    stats,
    cgpa,
    termResults,
    upcomingQuizzes,
    liveSessions,
    assignments,
    assignmentsError,
  ]);

  const classroomCourses: any[] = [];
  const classroomStream: any[] = [];

  const formatDueDate = (date: string | null) => {
    if (!date) return "No due date";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "No due date";

    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (value: any) => {
    const rawDate = value?.toDate?.() ?? (value ? new Date(value) : null);
    if (!(rawDate instanceof Date) || Number.isNaN(rawDate.getTime())) {
      return "Recently";
    }

    const diffMs = Date.now() - rawDate.getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatSessionLabel = (value: any) => {
    const rawDate = value?.toDate?.() ?? (value ? new Date(value) : null);
    if (!(rawDate instanceof Date) || Number.isNaN(rawDate.getTime())) {
      return "Scheduled";
    }

    return rawDate.toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!user) {
      warn("auth.no-user-bailout", {
        mountId,
        note: "loadDashboard() returned before running, so none of the five loading flags were ever cleared. If loading.all-flags-true also appears, this is why the page is stuck on skeletons.",
      });
      return;
    }

    const loadDashboard = async () => {
      const startedAt = performance.now();

      /**
       * Replaces the inline `.catch(() => [])` calls. The original swallowed
       * every failure into an empty array, so a 404 or a CORS block rendered as
       * a quietly empty dashboard. Failures are now reported and still resolve
       * to [] so the page keeps degrading the same way.
       */
      const fetchList = async (
        label: string,
        path: string,
        fields: string[],
      ): Promise<unknown[]> => {
        const callStartedAt = performance.now();
        log(`${label}.request`, {
          mountId,
          path,
          resolvedUrl: `${MESSAGING_API_BASE_URL}${path}`,
        });
        try {
          const data = await getMessagingBackend<unknown>(path);
          const elapsedMs = Math.round(performance.now() - callStartedAt);
          if (!Array.isArray(data)) {
            error(`${label}.not-an-array`, {
              mountId,
              path,
              elapsedMs,
              receivedType: data === null ? "null" : typeof data,
            });
            return [];
          }
          log(`${label}.response`, {
            mountId,
            path,
            elapsedMs,
            total: data.length,
          });
          inspectRows(label, data, fields);
          return data;
        } catch (err) {
          const elapsedMs = Math.round(performance.now() - callStartedAt);
          error(`${label}.failed-and-swallowed`, {
            mountId,
            path,
            elapsedMs,
            ...describeError(err),
            note: "This request previously used .catch(() => []), so the failure was invisible and the list just rendered empty.",
          });
          return [];
        }
      };

      try {
        setLoadingStats(true);
        setResultsLoading(true);
        setAssignmentsLoading(true);
        setLiveSessionsLoading(true);
        setQuizzesLoading(true);

        log("loadDashboard.start", {
          mountId,
          userUid: user.uid,
          userEmail: user.email ?? null,
        });

        // Resolve the 8084 student id from the logged-in email.
        // user.uid is a NAP user id, not the Lecturer-Backend student id.
        let messengerStudentId: string | null = null;
        try {
          const profilesStartedAt = performance.now();
          const profiles = await getMessagingBackend<any[]>("/api/profiles/");
          const profilesElapsedMs = Math.round(
            performance.now() - profilesStartedAt,
          );
          const profileList = Array.isArray(profiles) ? profiles : [];
          log("fetch.profiles.response", {
            mountId,
            elapsedMs: profilesElapsedMs,
            total: profileList.length,
            lookingForEmail: user.email ?? null,
          });
          inspectRows("fetch.profiles", profileList, ["id", "email"]);
          const match = profileList.find(
            (p: any) =>
              p.email &&
              String(p.email).toLowerCase() ===
                String(user.email || "").toLowerCase(),
          );
          if (match?.id != null) {
            messengerStudentId = String(match.id);
            log("messengerStudentId.resolved", {
              mountId,
              messengerStudentId,
              matchedEmail: match.email,
            });
          } else {
            warn("messengerStudentId.unresolved", {
              mountId,
              lookingForEmail: user.email ?? null,
              availableEmails: profileList
                .slice(0, 10)
                .map((p: any) => p.email),
              consequence:
                "/api/student-grades is skipped entirely and the results/term section stays empty. user.uid is a NAP id, not a Lecturer-Backend student id, so it cannot be substituted.",
            });
          }
        } catch (err) {
          error("fetch.profiles.failed-and-swallowed", {
            mountId,
            ...describeError(err),
            consequence:
              "messengerStudentId stays null, so /api/student-grades is never requested and the results section stays empty.",
          });
        }

        // Course units for course names / codes / credits
        const courseUnitsMap: Record<string, any> = {};
        try {
          const unitsStartedAt = performance.now();
          const units = await getMessagingBackend<any[]>("/api/course-units/");
          const unitsElapsedMs = Math.round(
            performance.now() - unitsStartedAt,
          );
          const unitList: Record<string, unknown>[] = Array.isArray(units)
            ? units
            : [];
          unitList.forEach((u: any) => {
            if (u.id != null) courseUnitsMap[String(u.id)] = u;
          });
          log("fetch.course-units.response", {
            mountId,
            elapsedMs: unitsElapsedMs,
            total: unitList.length,
            indexed: Object.keys(courseUnitsMap).length,
          });
          inspectRows("fetch.course-units", unitList, [
            "id",
            "name",
            "code",
            "credits",
          ]);
        } catch (err) {
          error("fetch.course-units.failed-and-swallowed", {
            mountId,
            ...describeError(err),
            consequence:
              "Course titles, codes and credits fall back to g.course_title / g.course_code / a default of 3 credits.",
          });
        }

        if (!messengerStudentId) {
          warn("fetch.grades.will-skip", {
            mountId,
            reason:
              "messengerStudentId could not be resolved, so no student_id is sent and the grades request is not made at all.",
            userUid: user.uid,
          });
        }

        // Fetch grades, quizzes, quiz attempts, live sessions in parallel
        const [gradesData, quizzesData, attemptsData, sessionsData, enrollmentsData] =
          await Promise.all([
            messengerStudentId
              ? fetchList(
                  "fetch.grades",
                  `/api/student-grades/?student_id=${messengerStudentId}`,
                  ["id", "course_id", "total", "gp", "grade"],
                )
              : Promise.resolve([]),
            fetchList("fetch.quizzes", "/api/quizzes/?status=active", [
              "id",
              "title",
              "status",
            ]),
            fetchList(
              "fetch.quiz-attempts",
              `/api/quiz-attempts/?student_id=${messengerStudentId ?? user.uid}`,
              ["id"],
            ),
            fetchList("fetch.live-sessions", "/api/live-sessions/", [
              "id",
              "title",
              "scheduled_at",
            ]),
            fetchList("fetch.enrollments", `/api/enrollments/?student_id=${user.uid}`, [
              "id",
              "status",
            ]),
          ]);

        // Build term results from student grades
        const gradeList: any[] = Array.isArray(gradesData) ? gradesData : [];
        const termMap = new Map<string, { entries: TermResult["entries"]; totalCredits: number; totalGP: number }>();

        for (const g of gradeList) {
          const termKey = `${g.academic_year || "N/A"} - Semester ${g.semester || "?"}`;
          if (!termMap.has(termKey)) {
            termMap.set(termKey, { entries: [], totalCredits: 0, totalGP: 0 });
          }
          const term = termMap.get(termKey)!;
          const marks = Number(g.total) || 0;
          const credits =
            g.credits ?? courseUnitsMap[String(g.course_id)]?.credits ?? 3;
          term.entries.push({
            id: String(g.id),
            course_id: String(g.course_id),
            academic_year: g.academic_year || "",
            semester: g.semester || "",
            marks,
            grade: g.grade,
            grade_point: g.gp,
            courseTitle:
              courseUnitsMap[String(g.course_id)]?.name ||
              g.course_title ||
              `Course ${g.course_id}`,
            courseCode:
              courseUnitsMap[String(g.course_id)]?.code || g.course_code || "",
            credits,
          });
          term.totalCredits += credits;
          term.totalGP += (g.gp || 0) * credits;
        }

        const terms: TermResult[] = [];
        let totalCreditsAll = 0;
        let totalGPAll = 0;
        for (const [termKey, data] of termMap) {
          const gpa = data.totalCredits > 0 ? data.totalGP / data.totalCredits : 0;
          terms.push({
            term: termKey,
            gpa,
            totalCredits: data.totalCredits,
            entries: data.entries,
            remark: calculateSemesterRemark(
              gpa,
              data.entries[0]?.grade || null,
            ),
          });
          totalCreditsAll += data.totalCredits;
          totalGPAll += data.totalGP;
        }
        const cgpa = totalCreditsAll > 0 ? totalGPAll / totalCreditsAll : 0;

        setTermResults(terms);
        setCgpa(cgpa);
        const approvedEnrollments = (Array.isArray(enrollmentsData) ? enrollmentsData : []).filter(
          (e: any) => e.status === "approved",
        );

        log("compute.results", {
          mountId,
          gradeRows: gradeList.length,
          termCount: terms.length,
          totalCreditsAll,
          totalGPAll,
          cgpa: Number(cgpa.toFixed(3)),
          remarks: terms.map((t) => ({ term: t.term, remark: t.remark })),
        });

        const enrollmentList: Record<string, unknown>[] = Array.isArray(
          enrollmentsData,
        )
          ? enrollmentsData
          : [];
        log("compute.enrollments", {
          mountId,
          total: enrollmentList.length,
          approved: approvedEnrollments.length,
          statuses: enrollmentList.map((e) => String(e.status)),
          note: "Only status === 'approved' counts toward the enrolled stat.",
        });

        warn("compute.quiz-attempts-discarded", {
          mountId,
          rows: Array.isArray(attemptsData) ? attemptsData.length : 0,
          note: "/api/quiz-attempts is fetched but attemptsData is never read anywhere in this component, so the request is wasted on every load.",
        });

        setStats({
          enrolled: approvedEnrollments.length,
          completed: 0,
          assignments: 0,
          liveMeets: 0,
        });

        // Build upcoming quizzes
        const quizList: any[] = Array.isArray(quizzesData) ? quizzesData : [];
        setUpcomingQuizzes(
          quizList.map((q: any) => ({
            id: String(q.id),
            title: q.title,
            courseTitle: q.course_title || null,
            courseCode: q.course_code || null,
            startDate: q.start_date || null,
            endDate: q.end_date || null,
            isLive: q.status === "active",
            isScheduled: q.status === "scheduled",
          })),
        );

        // Build scheduled Google Meet classes
        const now = new Date();
        const sessionSource: Record<string, unknown>[] = Array.isArray(
          sessionsData,
        )
          ? sessionsData
          : [];
        const unparseableSessions = sessionSource.filter((s) =>
          Number.isNaN(new Date(String(s?.scheduled_at ?? "")).getTime()),
        );
        if (unparseableSessions.length) {
          warn("compute.sessions.invalid-scheduled-at", {
            mountId,
            count: unparseableSessions.length,
            sample: unparseableSessions.slice(0, 5).map((s) => ({
              id: s?.id,
              scheduled_at: s?.scheduled_at,
            })),
            consequence:
              "These sessions can never be marked isLive and sort unpredictably.",
          });
        }

        const sessionList: LiveSession[] = sessionSource
          .map((s: any) => {
            const start = new Date(s.scheduled_at);
            const duration = (s.duration_minutes ?? 60) * 60000;
            const end = new Date(start.getTime() + duration);
            return {
              id: String(s.id),
              title: s.title || "Online Class",
              courseName: s.course_name || null,
              scheduledAt: s.scheduled_at,
              durationMinutes: s.duration_minutes ?? null,
              meetLink: s.meet_link || null,
              imageUrl: s.image_url || null,
              isLive:
                !Number.isNaN(start.getTime()) && now >= start && now <= end,
            } as LiveSession;
          })
          .sort(
            (a, b) =>
              new Date(a.scheduledAt).getTime() -
              new Date(b.scheduledAt).getTime(),
          );
        setLiveSessions(sessionList);

        const liveCount = sessionList.filter((s) => s.isLive).length;
        log("compute.sessions", {
          mountId,
          total: sessionList.length,
          liveNow: liveCount,
          withMeetLink: sessionList.filter((s) => s.meetLink).length,
          missingMeetLink: sessionList.filter((s) => !s.meetLink).length,
          upcoming: sessionList
            .filter((s) => new Date(s.scheduledAt).getTime() > now.getTime())
            .slice(0, 5)
            .map((s) => ({ id: s.id, title: s.title, scheduledAt: s.scheduledAt })),
        });

        setStats((prev) => ({
          ...prev,
          liveMeets: liveCount,
        }));

        log("loadDashboard.complete", {
          mountId,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      } catch (err) {
        error("loadDashboard.failed", {
          mountId,
          elapsedMs: Math.round(performance.now() - startedAt),
          ...describeError(err),
          note: "The original catch block was empty, so any failure in the build/derive phase left the dashboard silently half-populated with no error surfaced.",
        });
      } finally {
        setLoadingStats(false);
        setResultsLoading(false);
        setAssignmentsLoading(false);
        setLiveSessionsLoading(false);
        setQuizzesLoading(false);
        log("loadDashboard.loading-cleared", {
          mountId,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      }
    };

    loadDashboard();
  }, [user]);

  const activeMeetsCount = useMemo(
    () => liveSessions.filter((s) => s.isLive).length,
    [liveSessions],
  );

  const formattedLiveSessions = useMemo(
    () =>
      liveSessions.map((session) => {
        const start = new Date(session.scheduledAt);
        const now = new Date();
        const isToday = start.toDateString() === now.toDateString();

        const timeLabel = start.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        const dayLabel = isToday
          ? "Today"
          : start.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

        return {
          ...session,
          displayTime: `${dayLabel} · ${timeLabel}`,
          displayDay: session.isLive ? "Live" : dayLabel,
        };
      }),
    [liveSessions],
  );

  const handleOpenMeet = (link?: string | null) => {
    if (link) {
      log("meet.open", { mountId, link });
      window.open(link, "_blank");
    } else {
      warn("meet.open-skipped-no-link", {
        mountId,
        note: "The session has no meet_link, so the button is present but does nothing.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-20 md:pb-0 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-32 -left-16 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/10 blur-3xl" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-bl from-secondary/15 via-accent/10 to-primary/10 blur-3xl" />
      </div>

      <StudentHeader />

      <main className="container py-6 space-y-8 relative">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 bg-card/70 backdrop-blur-lg border border-border/60 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="h-4 w-4" />
              Mindblowing Workspace
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, <span className="gradient-text">{firstName}</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Your Google Classrooms, live Meets, and assignments—all in one
              cinematic view.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {cgpa > 0 && (
              <ProgressRing progress={Math.round((cgpa / 4) * 100)} size={80} strokeWidth={6}>
                <div className="text-center">
                  <span className="text-lg sm:text-xl font-bold">{cgpa.toFixed(1)}</span>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground block">
                    CGPA
                  </span>
                </div>
              </ProgressRing>
            )}
            <div className="space-y-1">
              <p className="text-[10px] sm:text-xs uppercase text-muted-foreground tracking-wide">
                Live Attendance
              </p>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold">
                  {activeMeetsCount} active Meet
                  {activeMeetsCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 lg:grid-cols-4">
          <StatCard
            title="Enrolled Courses"
            value={loadingStats ? "…" : stats.enrolled.toString()}
            icon={Users}
            delay={0.1}
          />
          <StatCard
            title="Completed"
            value={loadingStats ? "…" : stats.completed.toString()}
            subtitle="Courses"
            icon={Trophy}
            variant="secondary"
            delay={0.2}
          />
          <StatCard
            title="Pending Assignments"
            value={loadingStats ? "…" : stats.assignments.toString()}
            subtitle="Across classrooms"
            icon={BookOpen}
            delay={0.3}
          />
          <StatCard
            title="Live Meets"
            value={loadingStats && liveSessionsLoading ? "…" : stats.liveMeets.toString()}
            subtitle="Happening now"
            icon={Video}
            delay={0.4}
          />
        </div>

        {/* Results */}
        <motion.div
          id="results"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl sm:rounded-2xl border border-border/60 bg-card/80 backdrop-blur-lg p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">
                <Trophy className="h-4 w-4" /> View My Results
              </div>
              <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground">
                Exam Results, GPA & CGPA
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Coursework, finals, and weighted GPA per semester. CGPA is
                auto-computed across all results.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20 text-center min-w-[90px] sm:min-w-[110px]">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  CGPA
                </p>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {resultsLoading ? "…" : cgpa.toFixed(2)}
                </p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-secondary/10 border border-secondary/20 text-center min-w-[90px] sm:min-w-[110px]">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Semesters
                </p>
                <p className="text-base sm:text-lg font-semibold text-secondary">
                  {resultsLoading ? "…" : termResults.length}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {resultsLoading && (
              <div className="col-span-full text-xs sm:text-sm text-muted-foreground">
                Loading results…
              </div>
            )}

            {!resultsLoading && termResults.length === 0 && (
              <div className="col-span-full text-xs sm:text-sm text-muted-foreground">
                No results available yet.
              </div>
            )}

            {termResults.map((term, idx) => (
              <motion.div
                key={term.term}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Semester</p>
                    <p className="font-semibold">{term.term}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">GPA</p>
                    <p className="text-xl font-bold text-primary">
                      {term.gpa.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-primary via-secondary to-accent"
                    style={{ width: `${Math.min(100, (term.gpa / 5) * 100)}%` }}
                  />
                </div>

                {term.remark && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                      Semester Remark
                    </p>
                    <p className="text-sm font-bold text-emerald-700">
                      {term.remark}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {term.entries.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 rounded-xl border border-border/50 bg-card/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {res.courseTitle}
                          </p>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                            {res.courseCode}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground">
                            Marks
                          </p>
                          <p className="text-lg font-bold">
                            {res.marks.toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold text-center">
                          Grade: {res.grade || "N/A"}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-secondary/10 text-secondary font-semibold text-center">
                          GP: {res.grade_point?.toFixed(2) || "0.00"}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-center">
                          Credits: {res.credits}
                        </span>
                      </div>

                      <div className="mt-2 h-2 w-full rounded-full bg-border/60 overflow-hidden">
                        <div
                          className="h-2 bg-gradient-to-r from-emerald-500 to-primary"
                          style={{
                            width: `${Math.min(100, (res.marks / 100) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid xl:grid-cols-3 gap-6">
          {/* Classrooms & Assignments */}
          <div className="xl:col-span-2 space-y-6">
            {/* Google Classrooms (placeholder, can be wired to real data later) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-lg sm:text-xl font-semibold">
                  Google Classrooms
                </h2>
              </div>
              <button
                onClick={() => {
                  log("classroom.dialog.open-requested", {
                    mountId,
                    classroomCourses: classroomCourses.length,
                    classroomStream: classroomStream.length,
                    note: "classroomCourses and classroomStream are hardcoded empty arrays in this component, so this dialog has no data to render.",
                  });
                  setShowClassDialog(true);
                }}
                className="flex items-center gap-2 text-xs sm:text-sm text-secondary hover:text-secondary/80 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Join a class
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
              {formattedLiveSessions.length === 0 && !liveSessionsLoading && (
                <div className="col-span-full text-xs sm:text-sm text-muted-foreground">
                  When your lecturers schedule Google Meet classes, they will
                  appear here with join links.
                </div>
              )}

              {formattedLiveSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-lg shadow-lg"
                >
                  {session.imageUrl ? (
                    <img
                      src={
                        session.imageUrl.startsWith("http")
                          ? session.imageUrl
                          : `${MESSAGING_API_BASE_URL}${session.imageUrl}`
                      }
                      alt={session.title}
                      className="h-32 sm:h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="h-20 sm:h-24 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 opacity-90" />
                  )}
                  <div className="p-4 sm:p-5 space-y-3 -mt-8 sm:-mt-10 relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {session.courseName || "Online Class"}
                        </p>
                        <h3 className="font-semibold text-base sm:text-lg">
                          {session.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          {session.displayTime}
                        </p>
                      </div>
                      {session.isLive && (
                        <span className="px-3 py-1 rounded-full text-[11px] bg-destructive/10 text-destructive font-semibold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-destructive rounded-full animate-pulse" />{" "}
                          Live
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">
                          Join from any device
                        </span>
                        <span className="sm:hidden">Online</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">
                          Live participation
                        </span>
                        <span className="sm:hidden">Live</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground w-full sm:w-auto">
                        <div className="h-2 w-16 sm:w-24 rounded-full bg-muted/60 overflow-hidden flex-shrink-0">
                          <div
                            className="h-2 bg-gradient-to-r from-primary to-secondary"
                            style={{ width: session.isLive ? "100%" : "40%" }}
                          />
                        </div>
                        <span className="font-semibold text-foreground">
                          {session.isLive ? "In progress" : "Scheduled"}
                        </span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          className="px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl text-xs bg-primary text-primary-foreground hover:opacity-90 flex-1 sm:flex-none disabled:opacity-60"
                          onClick={() =>
                            session.meetLink &&
                            window.open(session.meetLink, "_blank")
                          }
                          disabled={!session.isLive || !session.meetLink}
                        >
                          {session.isLive ? "Join Live Class" : "Join (when live)"}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Assignments & Stream */}
            <div className="grid lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card/80 backdrop-blur-lg p-4 sm:p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-secondary" />
                    <h3 className="font-display text-base sm:text-lg font-semibold">
                      Assignments
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="text-xs"
                  >
                    <RouterLink to="/assignments">View All</RouterLink>
                  </Button>
                </div>
                <div className="space-y-3">
                  {assignmentsLoading && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Loading assignments…
                    </p>
                  )}

                  {!assignmentsLoading && assignmentsError && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {assignmentsError}
                    </p>
                  )}

                  {!assignmentsLoading &&
                    !assignmentsError &&
                    assignments.length === 0 && (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        No assignments yet.
                      </p>
                    )}

                  {!assignmentsLoading &&
                    !assignmentsError &&
                    assignments.map((item, i) => {
                      const isSubmitted = item.status === "submitted";
                      const dueLabel = formatDueDate(item.dueDate);

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border/60 bg-muted/30 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3"
                        >
                          <div className="space-y-1">
                            <p className="text-xs sm:text-sm font-semibold">
                              {item.title}
                            </p>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                              {item.courseTitle}
                              {item.courseCode ? ` · ${item.courseCode}` : ""}
                            </p>
                            <p className="text-[11px] sm:text-xs font-semibold text-amber-600">
                              Due {dueLabel}
                            </p>
                          </div>
                          <div className="text-right space-y-1 flex-shrink-0">
                            <span
                              className={`text-[10px] sm:text-[11px] px-2 py-1 rounded-full border block w-fit ml-auto ${
                                isSubmitted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {isSubmitted ? "Submitted" : "Pending"}
                            </span>
                            <p className="text-[11px] sm:text-xs text-muted-foreground">
                              {item.totalPoints != null
                                ? `${item.totalPoints} pts`
                                : "Points N/A"}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </div>

              <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card/80 backdrop-blur-lg p-4 sm:p-5 shadow-lg space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-base sm:text-lg font-semibold">
                    Classroom Stream
                  </h3>
                </div>
                <div className="space-y-3">
                  {formattedLiveSessions.length === 0 && !liveSessionsLoading && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      When there are scheduled Google Meet classes, they will show
                      up here with a clear status and join button.
                    </p>
                  )}
                  {formattedLiveSessions.map((session, i) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border/60 bg-muted/30"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <div className="space-y-1 flex-1">
                          <p className="text-xs sm:text-sm font-semibold">
                            {session.title}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">
                            {session.courseName || "Online Class"}
                          </p>
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground flex-shrink-0">
                          {session.displayTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] sm:text-[11px] text-muted-foreground">
                        {session.isLive && (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />{" "}
                            Live now
                          </>
                        )}
                        {!session.isLive && (
                          <>
                            <Clock className="h-3 w-3" />
                            Starts at {session.displayTime}
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live & Upcoming */}
          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card/80 backdrop-blur-lg p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-secondary" />
                <h3 className="font-display text-base sm:text-lg font-semibold">
                  Upcoming
                </h3>
              </div>
              <div className="space-y-3">
                {formattedLiveSessions.length === 0 &&
                  upcomingQuizzes.length === 0 &&
                  !liveSessionsLoading &&
                  !quizzesLoading && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No upcoming online classes or quizzes yet. When your
                    lecturers schedule Google Meet sessions or quizzes, they
                    will appear here.
                  </p>
                )}
                {formattedLiveSessions.map((session, i) => (
                  <UpcomingCard
                    key={session.id}
                    type={"class" as const}
                    title={session.title}
                    course={session.courseName || "Online Class"}
                    time={session.displayTime}
                    date={session.isLive ? "Live" : session.displayDay}
                    meetLink={session.meetLink || undefined}
                    isUrgent={session.isLive}
                    delay={i * 0.1}
                  />
                ))}
                {upcomingQuizzes.map((quiz, i) => {
                  const startLabel = quiz.startDate
                    ? new Date(quiz.startDate).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Any time";

                  return (
                    <UpcomingCard
                      key={quiz.id}
                      type={"quiz" as const}
                      title={quiz.title}
                      course={
                        quiz.courseTitle ||
                        quiz.courseCode ||
                        "Course Quiz"
                      }
                      time={startLabel}
                      date={
                        quiz.isLive
                          ? "Live"
                          : quiz.isScheduled
                            ? "Scheduled"
                            : "Open"
                      }
                      isUrgent={quiz.isLive}
                      delay={formattedLiveSessions.length * 0.1 + i * 0.1}
                    />
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-border/60 bg-card/80 backdrop-blur-lg p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <h3 className="font-display text-base sm:text-lg font-semibold">
                  Live Meets
                </h3>
              </div>
              <div className="space-y-3">
                {formattedLiveSessions.length === 0 && !liveSessionsLoading && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No classes are live right now. When a Google Meet class is
                    in progress, you will see a Join button here.
                  </p>
                )}
                {formattedLiveSessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border/60 bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3"
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-semibold">
                        {session.title}
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">
                        {session.displayTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {session.isLive && session.meetLink && (
                        <span className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] bg-destructive/10 text-destructive font-semibold flex items-center gap-1">
                          <Mic className="h-3 w-3" /> Live
                        </span>
                      )}
                      <button
                        className="px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl text-xs bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1 flex-shrink-0 disabled:opacity-60"
                        onClick={() =>
                          session.meetLink &&
                          window.open(session.meetLink, "_blank")
                        }
                        disabled={!session.isLive || !session.meetLink}
                      >
                        <Play className="h-4 w-4" />{" "}
                        {session.isLive ? "Join" : "Join (when live)"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-lg p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-secondary" />
                <h3 className="font-display text-lg font-semibold">
                  Resources
                </h3>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                  <span>Slides, code samples, labs</span>
                  <span className="text-xs text-primary">Google Drive</span>
                </div>
                <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                  <span>Recorded lectures & Meet links</span>
                  <span className="text-xs text-primary">Drive / Meet</span>
                </div>
                <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                  <span>Assignments & rubrics</span>
                  <span className="text-xs text-primary">Classroom</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Join Class Dialog */}
      <Dialog
        open={showClassDialog}
        onOpenChange={(open) => {
          log("classroom.dialog.state-change", {
            mountId,
            open,
            trigger: open ? "opened" : "dismissed",
          });
          setShowClassDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Join a Class</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {formattedLiveSessions.length === 0 && !liveSessionsLoading && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No Google Meet classes are available right now. When your
                  lecturers schedule a class, it will appear here with a join
                  link.
                </p>
              )}
              {liveSessionsLoading && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Loading classes…
                </p>
              )}
              {formattedLiveSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-border/60 bg-muted/30 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {session.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session.courseName || "Online Class"} ·{" "}
                      {session.displayTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {session.isLive && (
                      <span className="text-[10px] font-semibold text-destructive flex items-center gap-1">
                        <span className="h-1.5 w-1.5 bg-destructive rounded-full animate-pulse" />{" "}
                        Live
                      </span>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleOpenMeet(session.meetLink)}
                      disabled={!session.meetLink}
                    >
                      <Video className="h-4 w-4" /> Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <StudentBottomNav />
    </div>
  );
}