import { useEffect, useState } from "react";
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
import { useMemo } from "react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  views: number;
  likes: number;
  comments: number;
  hasLiked?: boolean;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  date: string;
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export default function Announcements() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  useEffect(() => {
    // Check if there's an announcement ID in the query params to expand
    const announcementId = searchParams.get("id");
    if (announcementId) {
      setExpandedId(announcementId);
      // Scroll to the announcement after a short delay to ensure it's rendered
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
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const resp = await fetch(`${API_BASE_URL}/api/announcements/`);
      if (!resp.ok) throw new Error("Failed to fetch announcements");
      const data = (await resp.json()) as any[];

      const mapped = data.map((a) => ({
        id: String(a.id),
        title: a.title,
        content: a.content,
        date: a.created_at ? new Date(a.created_at).toLocaleDateString() : "",
        author: a.author_name || "Unknown",
        views: 0,
        likes: 0,
        comments: 0,
        hasLiked: false,
      }));

      setAnnouncements(mapped);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (announcementId: string) => {
    // Comments are not yet supported by the API; leave empty
    setComments({ ...comments, [announcementId]: [] });
  };

  const handleLike = async (announcementId: string) => {
    // Liking is not supported yet. Placeholder for future API.
    alert("Like functionality not available yet.");
  };

  const handleComment = async (announcementId: string) => {
    // Commenting is not supported yet.
    alert("Commenting not available yet.");
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
        {/* Header */}
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
            {announcements.map((announcement, i) => (
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
                      {/* Header */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              {announcement.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              By {announcement.author} • {announcement.date}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {announcement.content}
                        </p>
                      </div>

                      {/* Engagement Stats */}
                      <div className="flex gap-4 pt-3 border-t border-border/60 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {announcement.views} views
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Heart
                            className={`h-4 w-4 ${
                              announcement.hasLiked
                                ? "text-red-500 fill-red-500"
                                : "text-muted-foreground"
                            }`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {announcement.likes} likes
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {announcement.comments} comments
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-border/60">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLike(announcement.id)}
                          className={`flex-1 gap-2 ${
                            announcement.hasLiked
                              ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                              : ""
                          }`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          {announcement.hasLiked ? "Liked" : "Like"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (expandedId === announcement.id) {
                              setExpandedId(null);
                            } else {
                              setExpandedId(announcement.id);
                              if (!comments[announcement.id]) {
                                fetchComments(announcement.id);
                              }
                            }
                          }}
                          className="flex-1 gap-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Comment
                        </Button>
                      </div>

                      {/* Comments Section */}
                      {expandedId === announcement.id && (
                        <div className="space-y-3 pt-4 border-t border-border/60">
                          {/* Comments List */}
                          {comments[announcement.id] &&
                            comments[announcement.id].length > 0 && (
                              <div className="space-y-2">
                                {comments[announcement.id].map((comment) => (
                                  <div
                                    key={comment.id}
                                    className="p-3 rounded-lg bg-muted/50 border border-border/30"
                                  >
                                    <p className="text-xs font-medium text-muted-foreground">
                                      {comment.author} • {comment.date}
                                    </p>
                                    <p className="text-sm text-foreground mt-1">
                                      {comment.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                          {/* Comment Input */}
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
            ))}
          </div>
        )}
      </main>

      <StudentBottomNav />
    </div>
  );
}
