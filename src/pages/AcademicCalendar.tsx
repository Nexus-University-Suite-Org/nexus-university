import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  Search,
  GraduationCap,
  ClipboardList,
  PartyPopper,
  Users,
  Flag,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isBefore,
  parseISO,
} from "date-fns";

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  dueDate?: Date;
  type: string;
  description?: string;
  isActive: boolean;
};

const EVENT_TYPES = ["exam", "deadline", "meeting", "holiday", "registration", "other"];

const eventStyle: Record<string, { dot: string; badge: string; icon: React.ReactNode }> = {
  exam: { dot: "bg-rose-500", badge: "bg-rose-500/15 text-rose-600 dark:text-rose-300", icon: <GraduationCap className="h-4 w-4" /> },
  deadline: { dot: "bg-orange-500", badge: "bg-orange-500/15 text-orange-600 dark:text-orange-300", icon: <ClipboardList className="h-4 w-4" /> },
  meeting: { dot: "bg-blue-500", badge: "bg-blue-500/15 text-blue-600 dark:text-blue-300", icon: <Users className="h-4 w-4" /> },
  holiday: { dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", icon: <PartyPopper className="h-4 w-4" /> },
  registration: { dot: "bg-violet-500", badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300", icon: <CalendarDays className="h-4 w-4" /> },
  other: { dot: "bg-slate-500", badge: "bg-slate-500/15 text-slate-600 dark:text-slate-300", icon: <Flag className="h-4 w-4" /> },
};

function getEventStyle(type: string) {
  return eventStyle[type] || eventStyle.other;
}

function iconFor(type: string) {
  return getEventStyle(type).icon;
}

export default function AcademicCalendar() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const loadEvents = async () => {
    try {
      const resp = await fetch("/api/academic-calendar", {
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) throw new Error("Failed to fetch academic calendar");
      const body = await resp.json();
      const list = (body && Array.isArray(body) ? body : body?.data) || [];
      setEvents(
        list
          .filter((e: any) => e.is_active !== false)
          .map((e: any) => ({
            id: String(e.id),
            title: e.title,
            date: e.date ? parseISO(e.date) : new Date(),
            dueDate: e.due_date ? parseISO(e.due_date) : undefined,
            type: e.type || "other",
            description: e.description,
            isActive: e.is_active !== false,
          })),
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load the academic calendar right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsForDate = (date: Date) => events.filter((e) => isSameDay(e.date, date));
  const selectedDateEvents = selectedDate ? eventsForDate(selectedDate) : [];

  const filteredEvents = useMemo(
    () =>
      events
        .filter((e) => (filter === "all" ? true : e.type === filter))
        .filter((e) =>
          search.trim() ? e.title.toLowerCase().includes(search.trim().toLowerCase()) : true,
        )
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [events, filter, search],
  );

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => !isBefore(e.date, new Date()))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 5),
    [events],
  );

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((e) => {
      const key = format(e.date, "MMMM yyyy");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries());
  }, [filteredEvents]);

  const stats = useMemo(
    () => ({
      total: events.length,
      upcoming: events.filter((e) => !isBefore(e.date, new Date())).length,
      exams: events.filter((e) => e.type === "exam").length,
      deadlines: events.filter((e) => e.type === "deadline").length,
    }),
    [events],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24 md:pb-12">
        <StudentHeader />
        <main className="container py-12">
          <div className="max-w-6xl mx-auto text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your academic calendar...</p>
          </div>
        </main>
        <StudentBottomNav />
      </div>
    );
  }

  const forecast = upcoming.filter((e) => e.isActive).slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24 md:pb-12">
      <StudentHeader />

      <main className="container py-6 md:py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Hero header */}
          <div className="relative overflow-hidden rounded-3xl gradient-primary p-8 text-primary-foreground shadow-primary">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute right-24 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative">
              <Badge className="bg-white/20 text-primary-foreground border-0 backdrop-blur">
                <Sparkles className="h-3 w-3 mr-1" /> Academic Calendar
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl font-bold mt-3">
                Academic Year 2025/2026
              </h1>
              <p className="mt-2 text-primary-foreground/85 max-w-xl">
                Key academic activities and important dates at your university, curated by the Registrar.
              </p>
              {profile?.programme && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur px-3 py-1.5 text-sm font-medium">
                  <GraduationCap className="h-4 w-4" /> {profile.programme}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Events", value: stats.total, color: "text-primary", icon: CalendarDays },
              { label: "Upcoming", value: stats.upcoming, color: "text-emerald-500", icon: Clock },
              { label: "Exams", value: stats.exams, color: "text-rose-500", icon: GraduationCap },
              { label: "Deadlines", value: stats.deadlines, color: "text-orange-500", icon: ClipboardList },
            ].map((s) => (
              <Card key={s.label} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={cn("h-11 w-11 rounded-xl bg-muted flex items-center justify-center", s.color)}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar grid */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
              <Card className="border-border/60 shadow-lg overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shadow-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
                        <CardDescription>{format(currentDate, "yyyy")}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
                      <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="p-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.map((day) => {
                      const dayEvents = eventsForDate(day);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const inMonth = isSameMonth(day, currentDate);
                      const today = isToday(day);
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "relative group flex flex-col items-center justify-start rounded-xl border p-2 min-h-[64px] sm:min-h-[76px] transition-all duration-150",
                            inMonth ? "bg-card hover:bg-accent/60 border-border/60" : "bg-muted/30 border-transparent opacity-45",
                            isSelected && "ring-2 ring-primary border-transparent bg-primary/5",
                            today && !isSelected && "border-primary/60 bg-primary/5",
                          )}
                        >
                          <span className={cn("text-sm font-medium", today && "text-primary font-bold")}>{format(day, "d")}</span>
                          {dayEvents.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                              {dayEvents.slice(0, 4).map((e) => (
                                <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", getEventStyle(e.type).dot)} />
                              ))}
                            </div>
                          )}
                          {today && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t">
                    {EVENT_TYPES.filter((t) => t !== "other").map((t) => (
                      <span key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-2.5 w-2.5 rounded-full", getEventStyle(t).dot)} />
                        <span className="capitalize">{t}</span>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Day detail + upcoming */}
            <div className="space-y-6">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    {selectedDate ? format(selectedDate, "EEEE, MMM d, yyyy") : "Select a date"}
                  </CardTitle>
                  <CardDescription>
                    {selectedDateEvents.length > 0
                      ? `${selectedDateEvents.length} activity${selectedDateEvents.length > 1 ? "ies" : "y"} on this day`
                      : selectedDate ? "No activities scheduled" : "Click a day to see its events"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {selectedDateEvents.length === 0 ? (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8 text-muted-foreground">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-sm">{selectedDate ? "No activities on this day" : "Tap a date to see activities"}</p>
                      </motion.div>
                    ) : (
                      selectedDateEvents.map((event) => (
                        <motion.div key={event.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="rounded-xl border border-border/60 p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <span className={cn("text-primary p-1.5 rounded-lg", getEventStyle(event.type).badge)}>
                              {iconFor(event.type)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold leading-tight">{event.title}</p>
                              <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">{event.type}</Badge>
                            </div>
                          </div>
                          {event.description && <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>}
                          {event.dueDate && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Due {format(event.dueDate, "MMM d, yyyy")}
                            </p>
                          )}
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-500" />
                    Coming Up
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {forecast.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
                  ) : (
                    forecast.map((event) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className={cn("mt-1.5 h-2.5 w-2.5 rounded-full shrink-0", getEventStyle(event.type).dot)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(event.date, "EEE, MMM d, yyyy")}
                            {event.dueDate && ` • Due ${format(event.dueDate, "MMM d")}`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* All events grouped by month */}
          <Card className="border-border/60 shadow-lg">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b bg-muted/20">
              <div>
                <CardTitle className="text-xl">All Activities</CardTitle>
                <CardDescription>Browse every event on the academic calendar</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 sm:w-48" />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="sm:w-40">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              )}
              {filteredEvents.length === 0 && !error ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No events found</h3>
                  <p className="text-muted-foreground text-sm">Try a different search or filter.</p>
                </div>
              ) : (
                groupedByMonth.map(([month, monthEvents]) => (
                  <div key={month}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-display text-lg font-semibold">{month}</h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {monthEvents.map((event) => (
                        <motion.div key={event.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/70 p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-2">
                            <span className={cn("text-primary p-1.5 rounded-lg", getEventStyle(event.type).badge)}>
                              {iconFor(event.type)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold leading-tight">{event.title}</p>
                              <Badge variant="outline" className="text-[10px] capitalize">{event.type}</Badge>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon className="h-4 w-4" /> {format(event.date, "EEE, MMM d")}
                            </span>
                            {event.dueDate && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" /> Due {format(event.dueDate, "MMM d")}
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground text-center">
            (c) 2026 ACMIS. All rights reserved.
          </div>
        </div>
      </main>

      <StudentBottomNav />
    </div>
  );
}
