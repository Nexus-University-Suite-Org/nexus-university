import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Megaphone,
  Plus,
  Trash2,
  Eye,
  MessageSquare,
  Heart,
  Loader2,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend, deleteBackend } from "@/lib/backendApi";

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  audience: string;
  views: number;
  likes: number;
  comments: number;
  priority: "high" | "normal" | "low";
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

interface StudentEngagement {
  views: Array<{ student_id: string; student_name: string; viewed_at: string }>;
  likes: Array<{
    student_id: string;
    student_name: string;
    created_at: string;
  }>;
  comments: Array<{
    student_id: string;
    student_name: string;
    content: string;
    created_at: string;
  }>;
}

export default function LecturerAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [engagementDetails, setEngagementDetails] =
    useState<StudentEngagement | null>(null);
  const [loadingEngagement, setLoadingEngagement] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    audience: "All Students",
    priority: "normal" as const,
    course_id: "",
  });

  useEffect(() => {
    if (!user) return;
    fetchAnnouncements();
  }, [user]);

  const fetchAnnouncements = async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      const data = await getBackend<any[]>(
        `/api/announcements/?author_id=${encodeURIComponent(user.uid)}`,
      );

      const transformedAnnouncements = data.map((ann) => ({
        id: ann.id,
        title: ann.title,
        content: ann.content,
        date: ann.created_at
          ? new Date(ann.created_at).toLocaleDateString()
          : new Date().toLocaleDateString(),
        audience: "All Students",
        views: 0,
        likes: 0,
        comments: 0,
        priority: ann.priority || "normal",
      }));
      setAnnouncements(transformedAnnouncements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    totalAnnouncements: announcements.length,
    totalViews: announcements.reduce((acc, a) => acc + a.views, 0),
    totalLikes: announcements.reduce((acc, a) => acc + a.likes, 0),
    totalComments: announcements.reduce((acc, a) => acc + a.comments, 0),
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-700 border-red-300/30";
      case "normal":
        return "bg-blue-500/20 text-blue-700 border-blue-300/30";
      case "low":
        return "bg-gray-500/20 text-gray-700 border-gray-300/30";
      default:
        return "bg-muted/60";
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!user || !formData.title || !formData.content) return;
    try {
      setIsPublishing(true);
      const payload = {
        course_id: formData.course_id || "",
        author_id: user.uid,
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
      };

      const created = await postBackend<any>("/api/announcements/", payload);
      setAnnouncements((current) => [
        {
          id: created.id,
          title: created.title,
          content: created.content,
          date: created.created_at
            ? new Date(created.created_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          audience: "All Students",
          views: 0,
          likes: 0,
          comments: 0,
          priority: created.priority || "normal",
        },
        ...current,
      ]);
      setFormData({
        title: "",
        content: "",
        audience: "All Students",
        priority: "normal",
        course_id: "",
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating announcement:", error);
      alert("Failed to publish announcement.");
    } finally {
      setIsPublishing(false);
    }
  };

  const fetchEngagementDetails = async (announcementId: string) => {
    try {
      setLoadingEngagement(true);
      setEngagementDetails({
        views: [],
        likes: [],
        comments: [],
      });
      // Engagement data is not available in the current backend.
      // This placeholder allows the details panel to render safely.
    } catch (error) {
      console.error("Error fetching engagement details:", error);
    } finally {
      setLoadingEngagement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?"))
      return;
    try {
      setDeletingId(announcementId);
      await deleteBackend(`/api/announcements/${announcementId}/`);
      setAnnouncements((current) =>
        current.filter((a) => a.id !== announcementId),
      );
    } catch (error) {
      console.error("Error deleting announcement:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Announcements</h1>
                <p className="text-sm text-muted-foreground">
                  Broadcast important messages to your class
                </p>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-primary to-secondary gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" /> New Announcement
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="bg-primary/10 border-primary/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Total Announcements
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.totalAnnouncements}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-emerald-500/10 border-emerald-300/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {stats.totalViews}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-red-500/10 border-red-300/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Likes</p>
                  <p className="text-2xl font-bold text-red-700">
                    {stats.totalLikes}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-blue-500/10 border-blue-300/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Total Comments
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.totalComments}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Announcements List */}
        <div className="space-y-3">
          {announcements.map((announcement, i) => (
            <motion.div
              key={announcement.id}
              variants={rise}
              initial="hidden"
              animate="visible"
              custom={i}
            >
              <Card className="border-border/60 bg-card/70 backdrop-blur-lg hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={getPriorityColor(announcement.priority)}
                          >
                            {announcement.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {announcement.date}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {announcement.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {announcement.content}
                        </p>
                        <Badge variant="outline">{announcement.audience}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setViewingId(announcement.id);
                            fetchEngagementDetails(announcement.id);
                          }}
                          title="View announcement details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() =>
                            handleDeleteAnnouncement(announcement.id)
                          }
                          disabled={deletingId === announcement.id}
                          title="Delete announcement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Engagement Stats */}
                    <div className="flex gap-4 pt-3 border-t border-border/60">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {announcement.views} views
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-muted-foreground">
                          {announcement.likes} likes
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-muted-foreground">
                          {announcement.comments} comments
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Create Announcement Modal */}
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border/60 rounded-2xl p-6 max-w-md w-full space-y-4"
            >
              <h2 className="text-2xl font-bold">Create Announcement</h2>

              <div>
                <label className="text-sm font-medium block mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Announcement title"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Message
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Write your announcement..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Audience
                  </label>
                  <select
                    value={formData.audience}
                    onChange={(e) =>
                      setFormData({ ...formData, audience: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option>All Students</option>
                    <option>Advanced Track</option>
                    <option>Beginner Track</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                  disabled={isPublishing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAnnouncement}
                  disabled={
                    isPublishing || !formData.title || !formData.content
                  }
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* View Announcement Modal */}
        {viewingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border/60 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-4"
            >
              {(() => {
                const announcement = announcements.find(
                  (a) => a.id === viewingId,
                );
                return announcement ? (
                  <>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">
                        {announcement.title}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{announcement.date}</span>
                        <Badge
                          className={getPriorityColor(announcement.priority)}
                        >
                          {announcement.priority}
                        </Badge>
                        <Badge variant="outline">{announcement.audience}</Badge>
                      </div>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-foreground whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/60">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">
                          {announcement.views}
                        </p>
                        <p className="text-xs text-muted-foreground">Views</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {announcement.likes}
                        </p>
                        <p className="text-xs text-muted-foreground">Likes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {announcement.comments}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Comments
                        </p>
                      </div>
                    </div>

                    {/* Engagement Details */}
                    {loadingEngagement ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : engagementDetails ? (
                      <div className="space-y-4 pt-4 border-t border-border/60">
                        {/* Views */}
                        {engagementDetails.views.length > 0 && (
                          <div>
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Eye className="h-4 w-4 text-emerald-600" />
                              Students who viewed (
                              {engagementDetails.views.length})
                            </h3>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {engagementDetails.views.map((view, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg"
                                >
                                  <span className="font-medium">
                                    {view.student_name}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {new Date(view.viewed_at).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Likes */}
                        {engagementDetails.likes.length > 0 && (
                          <div>
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Heart className="h-4 w-4 text-red-600" />
                              Students who liked (
                              {engagementDetails.likes.length})
                            </h3>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {engagementDetails.likes.map((like, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg"
                                >
                                  <span className="font-medium">
                                    {like.student_name}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {new Date(like.created_at).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Comments */}
                        {engagementDetails.comments.length > 0 && (
                          <div>
                            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                              Comments ({engagementDetails.comments.length})
                            </h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {engagementDetails.comments.map(
                                (comment, idx) => (
                                  <div
                                    key={idx}
                                    className="px-3 py-2 bg-muted/50 rounded-lg space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium">
                                        {comment.student_name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(
                                          comment.created_at,
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm text-foreground">
                                      {comment.content}
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                        {engagementDetails.views.length === 0 &&
                          engagementDetails.likes.length === 0 &&
                          engagementDetails.comments.length === 0 && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              No student engagement yet
                            </div>
                          )}
                      </div>
                    ) : null}

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => {
                          setViewingId(null);
                          setEngagementDetails(null);
                        }}
                        className="flex-1 bg-gradient-to-r from-primary to-secondary"
                      >
                        Close
                      </Button>
                    </div>
                  </>
                ) : null;
              })()}
            </motion.div>
          </motion.div>
        )}
      </main>

      <LecturerBottomNav />
    </div>
  );
}
