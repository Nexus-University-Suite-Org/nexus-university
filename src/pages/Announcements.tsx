import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Megaphone,
  Eye,
  Heart,
  MessageCircle,
  ThumbsUp,
  Send,
  Loader2,
} from "lucide-react";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getMessagingBackend, postMessagingBackend } from "@/lib/backendApi";

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  priority: "high" | "normal" | "low";
}

interface Engagement {
  views: number;
  likes: number;
  comments_count: number;
  has_liked: boolean;
  comments: Array<{
    id: number;
    student_name: string;
    content: string;
    created_at: string;
  }>;
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-500/20 text-red-700 border-red-300/30";
    case "low":
      return "bg-gray-500/20 text-gray-700 border-gray-300/30";
    default:
      return "bg-blue-500/20 text-blue-700 border-blue-300/30";
  }
};

export default function Announcements() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<Record<string, Engagement>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<Record<string, boolean>>(
    {},
  );
  const [viewedSet, setViewedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const announcementId = searchParams.get("id");
    if (announcementId) {
      setExpandedId(announcementId);
      setTimeout(() => {
        const element = document.getElementById(
          `announcement-${announcementId}`,
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [searchParams]);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const data = await getMessagingBackend<any[]>("/api/announcements/");
      const mapped = data.map((a) => ({
        id: String(a.id),
        title: a.title,
        content: a.content,
        date: a.created_at
          ? new Date(a.created_at).toLocaleDateString()
          : "",
        author: a.author_name || "Unknown",
        priority: a.priority || "normal",
      }));
      setAnnouncements(mapped);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEngagement = useCallback(
    async (announcementId: string) => {
      if (!user?.uid) return;
      try {
        const params = new URLSearchParams({ student_id: String(user.uid) });
        const data = await getMessagingBackend<Engagement>(
          `/api/announcements/${announcementId}/engagement?${params}`,
        );
        setEngagement((prev) => ({ ...prev, [announcementId]: data }));

        if (!viewedSet.has(announcementId)) {
          setViewedSet((prev) => new Set(prev).add(announcementId));
          postMessagingBackend(
            `/api/announcements/${announcementId}/engagement/view`,
            { student_id: Number(user.uid), student_name: user.displayName || "" },
          ).catch(() => {});
        }
      } catch (error) {
        console.error("Error fetching engagement:", error);
      }
    },
    [user, viewedSet],
  );

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!engagement[id]) {
        fetchEngagement(id);
      }
    }
  };

  const handleLike = async (announcementId: string) => {
    if (!user?.uid) return;
    try {
      const data = await postMessagingBackend<any>(
        `/api/announcements/${announcementId}/engagement/like`,
        { student_id: Number(user.uid), student_name: user.displayName || "" },
      );
      setEngagement((prev) => ({
        ...prev,
        [announcementId]: {
          ...prev[announcementId],
          has_liked: data.has_liked,
          likes: data.likes,
        },
      }));
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleComment = async (announcementId: string) => {
    if (!user?.uid || !commentInput[announcementId]?.trim()) return;
    try {
      setSendingComment((prev) => ({ ...prev, [announcementId]: true }));
      const newComment = await postMessagingBackend<any>(
        `/api/announcements/${announcementId}/engagement/comment`,
        {
          student_id: Number(user.uid),
          student_name: user.displayName || "",
          content: commentInput[announcementId].trim(),
        },
      );
      setEngagement((prev) => ({
        ...prev,
        [announcementId]: {
          ...prev[announcementId],
          comments: [newComment, ...(prev[announcementId]?.comments || [])],
          comments_count: (prev[announcementId]?.comments_count || 0) + 1,
        },
      }));
      setCommentInput((prev) => ({ ...prev, [announcementId]: "" }));
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setSendingComment((prev) => ({ ...prev, [announcementId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/5 pb-28">
      <StudentHeader />

      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Announcements</h1>
              <p className="text-sm text-muted-foreground">
                Stay updated with course announcements
              </p>
            </div>
          </div>
        </motion.div>

        {announcements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No announcements yet</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement, i) => {
              const eng = engagement[announcement.id];
              return (
                <motion.div
                  id={`announcement-${announcement.id}`}
                  key={announcement.id}
                  variants={rise}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                >
                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div
                          className="cursor-pointer"
                          onClick={() => handleExpand(announcement.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  className={getPriorityColor(
                                    announcement.priority,
                                  )}
                                >
                                  {announcement.priority}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {announcement.date}
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold text-foreground mb-1">
                                {announcement.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                By {announcement.author}
                              </p>
                            </div>
                          </div>

                          {expandedId === announcement.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="pt-3"
                            >
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {announcement.content}
                              </p>
                            </motion.div>
                          )}
                        </div>

                        {/* Engagement Stats */}
                        {eng && (
                          <div className="flex gap-4 pt-3 border-t border-border/60 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {eng.views} views
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Heart
                                className={`h-4 w-4 ${
                                  eng.has_liked
                                    ? "text-red-500 fill-red-500"
                                    : "text-muted-foreground"
                                }`}
                              />
                              <span className="text-sm text-muted-foreground">
                                {eng.likes} likes
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {eng.comments_count} comments
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {expandedId === announcement.id && eng && (
                          <div className="flex gap-2 pt-3 border-t border-border/60">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLike(announcement.id)}
                              className={`flex-1 gap-2 ${
                                eng.has_liked
                                  ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                                  : ""
                              }`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              {eng.has_liked ? "Liked" : "Like"}
                            </Button>
                          </div>
                        )}

                        {/* Comments Section - own comments only */}
                        {expandedId === announcement.id && eng && (
                          <div className="space-y-3 pt-4 border-t border-border/60">
                            {eng.comments.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Your comments
                                </p>
                                {eng.comments.map((comment) => (
                                  <div
                                    key={comment.id}
                                    className="p-3 rounded-lg bg-muted/50 border border-border/30"
                                  >
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(
                                        comment.created_at,
                                      ).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-foreground mt-1">
                                      {comment.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentInput[announcement.id] || ""}
                                onChange={(e) =>
                                  setCommentInput({
                                    ...commentInput,
                                    [announcement.id]: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleComment(announcement.id);
                                  }
                                }}
                                placeholder="Write a comment..."
                                className="flex-1 px-3 py-2 rounded-lg border border-border/60 bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleComment(announcement.id)}
                                disabled={
                                  sendingComment[announcement.id] ||
                                  !commentInput[announcement.id]?.trim()
                                }
                                className="bg-gradient-to-r from-primary to-secondary"
                              >
                                {sendingComment[announcement.id] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <StudentBottomNav />
    </div>
  );
}
