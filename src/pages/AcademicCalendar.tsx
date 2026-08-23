import { useMemo, useState, useEffect } from "react";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Flag, Layers, List } from "lucide-react";

type Event = {
  id: string;
  title: string;
  description: string;
  date: any;
  dueDate: any;
  type: string;
  isActive: boolean;
};

type CalendarData = {
  academicYear: string;
  semesters: {
    name: string;
    status: string;
    events: {
      title: string;
      start: string;
      end: string;
      status: string;
    }[];
  }[];
};

const statusStyles: Record<string, string> = {
  Open: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  Close: "bg-amber-50 text-amber-800 border border-amber-200",
  Current:
    "bg-secondary/15 text-secondary-foreground border border-secondary/30",
  Completed: "bg-muted text-muted-foreground border border-border",
};

type StatusFilter = "All" | "Open" | "Close" | "Current" | "Completed";

export default function AcademicCalendar() {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
        const resp = await fetch(`${API_BASE_URL}/api/academic-calendar/`);
        if (!resp.ok) throw new Error("Failed to fetch academic calendar");
        const events = (await resp.json()) as any[];

        const transformedData: CalendarData = {
          academicYear: "2025/2026",
          semesters: [
            {
              name: "All Events",
              status: "Current",
              events: events.map((event) => ({
                title: event.title,
                start: event.date
                  ? new Date(event.date).toLocaleDateString()
                  : "",
                end: event.dueDate
                  ? new Date(event.dueDate).toLocaleDateString()
                  : "",
                status: event.isActive ? "Open" : "Close",
              })),
            },
          ],
        };

        setCalendarData(transformedData);
      } catch (err) {
        setError("Failed to fetch academic calendar data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, []);

  const handleSaveCalendar = async () => {
    alert("Academic calendar data is loaded from the server.");
  };

  const matchesFilter = (semesterStatus: string, eventStatus: string) => {
    if (statusFilter === "All") return true;
    if (statusFilter === "Current") return semesterStatus === "Current";
    if (statusFilter === "Completed") return semesterStatus === "Completed";
    return eventStatus === statusFilter;
  };

  const filteredSemesters = useMemo(
    () =>
      calendarData && calendarData.semesters
        ? calendarData.semesters
            .map((semester) => ({
              ...semester,
              events: semester.events.filter((event) =>
                matchesFilter(semester.status, event.status),
              ),
            }))
            .filter((semester) => semester.events.length > 0)
        : [],
    [statusFilter, calendarData],
  );

  const timelineEvents = useMemo(() => {
    if (!calendarData || !calendarData.semesters) return [];
    const parseDate = (value: string) => new Date(value);
    return calendarData.semesters
      .flatMap((semester) =>
        semester.events
          .filter((event) => matchesFilter(semester.status, event.status))
          .map((event) => ({
            ...event,
            semester: semester.name,
            semesterStatus: semester.status,
            startDate: parseDate(event.start),
            endDate: parseDate(event.end),
          })),
      )
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [statusFilter, calendarData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24 md:pb-12">
        <StudentHeader />
        <main className="container py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center">Loading academic calendar...</div>
          </div>
        </main>
        <StudentBottomNav />
      </div>
    );
  }

  if (error || !calendarData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24 md:pb-12">
        <StudentHeader />
        <main className="container py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center text-red-500">
              {error || "No data available"}
            </div>
          </div>
        </main>
        <StudentBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24 md:pb-12">
      <StudentHeader />

      <main className="container py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <Badge
                variant="outline"
                className="text-xs uppercase tracking-wide"
              >
                Academic Calendar
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl font-bold">
                Academic Year {calendarData?.academicYear || "Loading"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Key academic activities and their windows for the current year.
              </p>
            </div>
            <Badge className="text-sm" variant="secondary">
              Updated Jan 2026
            </Badge>
          </header>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["All", "Open", "Close", "Current", "Completed"] as const).map(
                (status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "secondary" : "outline"}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status}
                  </Button>
                ),
              )}
              <Button size="sm" variant="outline" onClick={handleSaveCalendar}>
                Save Calendar Events
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "secondary" : "outline"}
                onClick={() => setViewMode("grid")}
              >
                <Layers className="h-4 w-4 mr-2" /> Cards
              </Button>
              <Button
                size="sm"
                variant={viewMode === "timeline" ? "secondary" : "outline"}
                onClick={() => setViewMode("timeline")}
              >
                <List className="h-4 w-4 mr-2" /> Timeline
              </Button>
            </div>
          </div>

          {viewMode === "timeline" ? (
            <Card className="border-border/70 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Timeline view</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Chronological list of activities across semesters.
                </p>
              </CardHeader>
              <Separator />
              <CardContent className="p-6">
                <div className="relative pl-6 space-y-6">
                  <div
                    className="absolute left-2 top-0 bottom-0 w-px bg-border"
                    aria-hidden
                  />
                  {timelineEvents.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No events match this filter.
                    </p>
                  )}
                  {timelineEvents.map((event) => (
                    <div
                      key={`${event.semester}-${event.title}-${event.start}`}
                      className="relative rounded-lg border border-border/70 bg-card/70 p-4 shadow-sm"
                    >
                      <div
                        className="absolute -left-[18px] top-4 h-3 w-3 rounded-full bg-secondary border-2 border-background"
                        aria-hidden
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                            <Flag className="h-3.5 w-3.5" />
                            <span>{event.semester}</span>
                          </p>
                          <p className="text-base font-semibold leading-tight">
                            {event.title}
                          </p>
                        </div>
                        <Badge className={statusStyles[event.status] || ""}>
                          {event.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          <span>{event.start}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          to
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>{event.end}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Semester status: {event.semesterStatus}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredSemesters.map((semester) => (
                <Card
                  key={semester.name}
                  className="border-border/70 shadow-lg backdrop-blur"
                >
                  <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-xl sm:text-2xl">
                          {semester.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Academic activities for {semester.name.toLowerCase()}.
                        </p>
                      </div>
                    </div>
                    <Badge className={statusStyles[semester.status] || ""}>
                      {semester.status}
                    </Badge>
                  </CardHeader>
                  <Separator />
                  <CardContent className="p-6 pt-5 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {semester.events.map((event) => (
                        <div
                          key={`${semester.name}-${event.title}-${event.start}`}
                          className="rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                <Flag className="h-3.5 w-3.5" />
                                <span>{semester.name}</span>
                              </div>
                              <p className="text-base font-semibold leading-tight">
                                {event.title}
                              </p>
                            </div>
                            <Badge className={statusStyles[event.status] || ""}>
                              {event.status}
                            </Badge>
                          </div>

                          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <CalendarDays className="h-4 w-4" />
                              <span>{event.start}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              to
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              <span>{event.end}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredSemesters.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No events match this filter.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            (c) 2026 ACMIS. All rights reserved.
          </div>
        </div>
      </main>

      <StudentBottomNav />
    </div>
  );
}
