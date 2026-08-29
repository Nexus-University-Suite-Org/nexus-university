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
import { getMessagingBackend, postMessagingBackend } from "@/lib/backendApi";
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

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

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
    if (!user?.uid) return;

    try {
      setLoading(true);
      const data: any[] = await getMessagingBackend(
        `/api/notifications/?user_id=${user.uid}`,
      );
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await postMessagingBackend(`/api/notifications/${id}/read/`, {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );

      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid) return;

    try {
      await postMessagingBackend("/api/notifications/mark-all-read/", {
        user_id: user.uid,
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
            onValueChange={(v) => setFilter(v as FilterType)}
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
                              if (!notification.is_read) {
                                markAsRead(notification.id);
                              }
                              if (notification.link) {
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
                                          {formatDistanceToNow(
                                            new Date(notification.created_at),
                                            { addSuffix: true },
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
