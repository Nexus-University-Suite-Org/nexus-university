import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  X,
  ArrowRight,
  Clock,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Inbox,
  Loader2,
  FileText,
  Award,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMessagingBackend,
  postMessagingBackend,
  MESSAGING_API_BASE_URL,
} from "@/lib/backendApi";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

type FilterType = "all" | "unread" | "read";

const notificationIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  assignment: FileText,
  grade: Award,
  announcement: Megaphone,
};

const notificationColors = {
  info: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  success: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  error: "text-red-500 bg-red-500/10 border-red-500/20",
  assignment: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  grade: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  announcement: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
};

/* ------------------------------------------------------------------ */
/* Debug instrumentation                                              */
/* Filter the console on "[Notifications]" for page-level logs and     */
/* "[API]" for the HTTP layer (src/lib/backendApi.ts).                 */
/* ------------------------------------------------------------------ */

const LOG_TAG = "[Notifications]";
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
      hint: "fetch() rejected before any HTTP response arrived. Backend not running, wrong base URL, or the browser blocked it via CORS. There is no status code for this failure mode - check the [API] request log for the URL that was attempted.",
    };
  }

  if (err instanceof SyntaxError) {
    return {
      ...base,
      kind: "json-parse",
      hint: "The response body could not be parsed as JSON, so this is usually an HTML error page or an empty body rather than an API payload.",
    };
  }

  return {
    ...base,
    kind: "http",
    hint: "handleResponse() threw because response.ok was false. The status code and body were discarded at the throw site - see the [API] response log.",
  };
}

function inspectNotification(row: unknown, index: number) {
  const problems: string[] = [];

  if (row == null || typeof row !== "object") {
    return { index, receivedType: typeof row, problems: ["not an object"] };
  }

  const n = row as Record<string, unknown>;

  if (n.id === undefined || n.id === null) {
    problems.push("missing id");
  } else if (typeof n.id !== "string") {
    problems.push(
      `id is ${typeof n.id} but the Notification interface declares string`,
    );
  }

  for (const field of ["title", "message", "type", "is_read", "created_at"]) {
    if (n[field] === undefined || n[field] === null) {
      problems.push(`missing ${field}`);
    }
  }

  if (
    n.created_at != null &&
    Number.isNaN(new Date(n.created_at as string).getTime())
  ) {
    problems.push(
      `created_at ${JSON.stringify(n.created_at)} is not a parseable date`,
    );
  }

  if (n.link !== undefined && n.link !== null && typeof n.link !== "string") {
    problems.push(`link is ${typeof n.link}`);
  }

  return {
    index,
    id: n.id,
    idType: typeof n.id,
    type: n.type,
    is_read: n.is_read,
    hasLink: Boolean(n.link),
    created_at: n.created_at,
    problems,
  };
}

function formatRelativeTime(value: string) {
  try {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      warn("relative-time.invalid-date", { created_at: value });
      return value;
    }

    return formatDistanceToNow(parsed, { addSuffix: true });
  } catch (err) {
    warn("relative-time.format-threw", {
      created_at: value,
      ...describeError(err),
    });
    return value;
  }
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  // Derived before the effects below: dependency arrays are evaluated during
  // render, so anything referenced there must already be initialised.
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const readCount = notifications.filter((n) => n.is_read).length;

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
      userUid: user?.uid ?? null,
      note: "Compare pageOrigin against the messaging backend CORS allow-list. A mismatch makes every fetch below fail as a network error with no HTTP status.",
      viteEnv: {
        VITE_WEBMAIL_API_BASE_URL: import.meta.env.VITE_WEBMAIL_API_BASE_URL,
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
        VITE_NU_API_BASE_URL: import.meta.env.VITE_NU_API_BASE_URL,
      },
    });

    const onWindowError = (event: ErrorEvent) => {
      error("window.error", {
        message: event.message,
        source: `${event.filename}:${event.lineno}:${event.colno}`,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      error("window.unhandledrejection", {
        reason: String(event.reason),
      });
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      log("unmount", { mountId });
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const uid = user?.uid;

    log("auth.user-changed", {
      mountId,
      hasUser: Boolean(user),
      uid: uid ?? null,
      uidType: typeof uid,
      uidTruthy: Boolean(uid),
      email: user?.email ?? null,
    });

    if (!uid) {
      warn("auth.no-uid-bailout", {
        mountId,
        bug: "fetchNotifications() returns early when user.uid is falsy. That early return happens BEFORE the try block, so the finally that calls setLoading(false) never runs. loading stays true and the page renders 'Loading notifications...' forever.",
        expectedWhen: "auth is still resolving on first paint",
        persistsWhen: "the signed-in user object has no uid, so this is a stuck spinner rather than a loading state",
      });
    }

    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (loading) {
      warn("render.loading-spinner", {
        mountId,
        note: "If this is the only loading log and no fetch.request log follows, the auth.no-uid-bailout path was taken.",
      });
    } else {
      log("render.content", {
        mountId,
        filter,
        total: notifications.length,
        visible: filteredNotifications.length,
      });
    }
  }, [loading, notifications, filter, filteredNotifications.length]);

  useEffect(() => {
    log("derived.state", {
      mountId,
      filter,
      total: notifications.length,
      unread: unreadCount,
      read: readCount,
      visible: filteredNotifications.length,
      emptyStateReason:
        filteredNotifications.length > 0
          ? null
          : filter === "unread"
            ? `no unread rows (total ${notifications.length}, read ${readCount})`
            : filter === "read"
              ? `no read rows (total ${notifications.length}, unread ${unreadCount})`
              : "the messaging backend returned an empty list",
    });
  }, [notifications, filter, filteredNotifications.length, unreadCount, readCount]);

  useEffect(() => {
    // GSAP Text Animation for Title
    if (titleRef.current) {
      const chars = titleRef.current.textContent?.split("") || [];
      titleRef.current.innerHTML = chars
        .map((char) =>
          char === " " ? " " : `<span class="inline-block">${char}</span>`,
        )
        .join("");

      gsap.fromTo(
        titleRef.current.querySelectorAll("span"),
        {
          opacity: 0,
          y: 50,
          rotationX: -90,
        },
        {
          opacity: 1,
          y: 0,
          rotationX: 0,
          duration: 0.8,
          stagger: 0.03,
          ease: "back.out(1.7)",
        },
      );
    }

    // GSAP Animation for Subtitle
    if (subtitleRef.current) {
      gsap.fromTo(
        subtitleRef.current,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: 0.4,
          ease: "power3.out",
        },
      );
    }
  }, []);

  const fetchNotifications = async () => {
    const startedAt = performance.now();
    const uid = user?.uid;

    if (!uid) {
      warn("fetch.bailed-no-uid", { mountId, loadingWillRemainTrue: true });
      return;
    }

    const path = `/api/notifications/?user_id=${uid}`;

    log("fetch.request", {
      mountId,
      method: "GET",
      path,
      resolvedUrl: `${MESSAGING_API_BASE_URL}${path}`,
      userUid: uid,
      note: "getMessagingBackend sends no Authorization header, so a 401/403 here would mean user_id scoping rather than a missing token.",
    });

    try {
      setLoading(true);

      const data: unknown = await getMessagingBackend<unknown>(path);
      const elapsedMs = Math.round(performance.now() - startedAt);

      const isArray = Array.isArray(data);
      const rows: Notification[] = isArray ? data : [];
      const inspections = rows.map(inspectNotification);
      const malformed = inspections.filter((r) => r.problems.length > 0);

      log("fetch.response", {
        mountId,
        elapsedMs,
        isArray,
        receivedType: Object.prototype.toString.call(data),
        rowCount: rows.length,
        malformedCount: malformed.length,
        malformed,
      });

      if (!isArray) {
        error("fetch.not-an-array", {
          mountId,
          received: data,
          hint: 'setNotifications(data || []) would store a non-array, and .filter() on the next render throws "notifications.filter is not a function". A paginated envelope such as { results: [...] } is the usual cause.',
        });
      }

      setNotifications(rows);
      log("fetch.state-updated", { mountId, notificationCount: rows.length });
    } catch (err) {
      error("fetch.failed", {
        mountId,
        elapsedMs: Math.round(performance.now() - startedAt),
        ...describeError(err),
      });
      warn("fetch.list-left-unchanged", {
        mountId,
        note: "On failure the previous state is kept, so a failed refetch leaves the old list on screen with no error UI.",
      });
    } finally {
      setLoading(false);
      log("fetch.loading-false", {
        mountId,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
    }
  };

  const markAsRead = async (id: string) => {
    const path = `/api/notifications/${id}/read/`;
    const target = notifications.find((n) => String(n.id) === String(id));

    log("markAsRead.request", {
      mountId,
      id,
      idType: typeof id,
      wasRead: target?.is_read,
      resolvedUrl: `${MESSAGING_API_BASE_URL}${path}`,
    });

    if (target && target.is_read) {
      warn("markAsRead.already-read", { mountId, id });
    }

    if (!target) {
      warn("markAsRead.id-not-in-list", {
        mountId,
        id,
        knownIds: notifications.map((n) => n.id),
      });
    }

    try {
      const response = await postMessagingBackend<unknown>(path, {});

      log("markAsRead.response", { mountId, id, response });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );

      window.dispatchEvent(new Event("notifications-updated"));
      log("markAsRead.state-updated", {
        mountId,
        id,
        eventDispatched: "notifications-updated",
        note: "StudentHeader listens for that event and refetches; expect an extra [API] request in the log.",
      });
    } catch (err) {
      error("markAsRead.failed", {
        mountId,
        id,
        resolvedUrl: `${MESSAGING_API_BASE_URL}${path}`,
        ...describeError(err),
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid) {
      warn("markAllAsRead.bailed-no-uid", { mountId });
      return;
    }

    const path = "/api/notifications/mark-all-read/";

    log("markAllAsRead.request", {
      mountId,
      method: "POST",
      path,
      resolvedUrl: `${MESSAGING_API_BASE_URL}${path}`,
      body: { user_id: user.uid },
    });

    try {
      const response = await postMessagingBackend<unknown>(path, {
        user_id: user.uid,
      });

      log("markAllAsRead.response", { mountId, response });

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      window.dispatchEvent(new Event("notifications-updated"));
      log("markAllAsRead.state-updated", {
        mountId,
        eventDispatched: "notifications-updated",
      });
    } catch (err) {
      error("markAllAsRead.failed", {
        mountId,
        resolvedUrl: `${MESSAGING_API_BASE_URL}${path}`,
        ...describeError(err),
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    const IconComponent =
      notificationIcons[type as keyof typeof notificationIcons] || Bell;
    return IconComponent;
  };

  const getNotificationColor = (type: string) => {
    return (
      notificationColors[type as keyof typeof notificationColors] ||
      notificationColors.info
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <StudentHeader />

      {/* Hero Section with GSAP Animations */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--secondary)/0.2)_0%,_transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-3">
              <Bell className="h-4 w-4" />
              <span>Stay Updated</span>
            </div>

            <h1
              ref={titleRef}
              className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4"
            >
              Notifications
            </h1>
            <p
              ref={subtitleRef}
              className="text-primary-foreground/80 text-lg max-w-2xl"
            >
              Never miss an important update from your courses and university
            </p>
          </motion.div>
        </div>
      </section>

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Stats and Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-secondary/10 to-accent/10">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <Bell className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{notifications.length}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>

              {unreadCount > 0 && (
                <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-500">
                        {unreadCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Unread</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <Tabs
            value={filter}
            onValueChange={(v) => {
              const next = v as FilterType;

              log("filter.changed", {
                mountId,
                previous: filter,
                next,
                total: notifications.length,
                unread: notifications.filter((n) => !n.is_read).length,
                read: notifications.filter((n) => n.is_read).length,
              });

              setFilter(next);
            }}
            className="mb-6"
          >
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50">
              <TabsTrigger value="all" className="gap-2">
                All
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="gap-2">
                Unread
                {unreadCount > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read" className="gap-2">
                Read
                {notifications.filter((n) => n.is_read).length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {notifications.filter((n) => n.is_read).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-6">
              {filteredNotifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                    <Inbox className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">
                    {filter === "unread"
                      ? "No Unread Notifications"
                      : filter === "read"
                        ? "No Read Notifications"
                        : "No Notifications Yet"}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {filter === "all"
                      ? "You're all caught up! New notifications will appear here."
                      : `You don't have any ${filter} notifications at the moment.`}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredNotifications.map((notification, index) => {
                      const Icon = getNotificationIcon(notification.type);
                      const colorClass = getNotificationColor(
                        notification.type,
                      );

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 20, scale: 0.95 }}
                          transition={{
                            delay: index * 0.05,
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                          layout
                        >
                          <Card
                            className={`group cursor-pointer transition-all duration-300 hover:shadow-lg border-l-4 ${
                              notification.is_read
                                ? "bg-muted/30 opacity-75 hover:opacity-100"
                                : "bg-background shadow-md"
                            } ${colorClass.split(" ")[2]}`}
                            onClick={() => {
                              log("card.click", {
                                mountId,
                                id: notification.id,
                                type: notification.type,
                                is_read: notification.is_read,
                                link: notification.link,
                                willMarkAsRead: !notification.is_read,
                                willNavigate: Boolean(notification.link),
                              });

                              if (!notification.is_read) {
                                markAsRead(notification.id);
                              }
                              if (notification.link) {
                                warn("card.navigate", {
                                  mountId,
                                  link: notification.link,
                                  hint: "The link is passed to navigate() verbatim, so it must be an in-app react-router path. An absolute URL or an unrouted path dead-ends the navigation.",
                                });
                                navigate(notification.link);
                              }
                            }}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start gap-4">
                                <div
                                  className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${colorClass}`}
                                >
                                  <Icon className="h-6 w-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3
                                      className={`font-semibold text-lg group-hover:text-secondary transition-colors ${
                                        !notification.is_read
                                          ? "text-foreground"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {notification.title}
                                    </h3>
                                    {!notification.is_read && (
                                      <div className="h-2 w-2 rounded-full bg-secondary flex-shrink-0 mt-2" />
                                    )}
                                  </div>

                                  <p className="text-muted-foreground mb-3 line-clamp-2">
                                    {notification.message}
                                  </p>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          {formatRelativeTime(
                                            notification.created_at,
                                          )}
                                        </span>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-xs capitalize"
                                      >
                                        {notification.type}
                                      </Badge>
                                    </div>

                                    {notification.link && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`gap-1 ${
                                          notification.type === "announcement"
                                            ? "opacity-100"
                                            : "opacity-0 group-hover:opacity-100"
                                        } transition-opacity`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          log("view-button.click", {
                                            mountId,
                                            id: notification.id,
                                            link: notification.link,
                                          });
                                          // Mark as read before navigating
                                          if (!notification.is_read) {
                                            markAsRead(notification.id);
                                          }
                                          navigate(notification.link!);
                                        }}
                                      >
                                        View
                                        <ArrowRight className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {!notification.is_read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      log("read-toggle.click", {
                                        mountId,
                                        id: notification.id,
                                      });
                                      markAsRead(notification.id);
                                    }}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <StudentBottomNav />
    </div>
  );
}
