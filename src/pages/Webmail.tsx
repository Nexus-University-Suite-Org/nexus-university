import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Star,
  Archive,
  Trash2,
  Search,
  Plus,
  X,
  Paperclip,
  Image as ImageIcon,
  MoreVertical,
  Reply,
  ReplyAll,
  Forward,
  ChevronLeft,
  Filter,
  Loader2,
  User,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { MiniStomp } from "@/lib/stompClient";

const MESSAGING_BASE =
  import.meta.env.VITE_WEBMAIL_API_BASE_URL || "http://localhost:8084";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject: string;
  body: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted_by_sender: boolean;
  is_deleted_by_recipient: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  from_profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  to_profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface Draft {
  id: string;
  to_user_id: string | null;
  subject: string | null;
  body: string | null;
  created_at: string;
  to_profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

type ViewType = "inbox" | "sent" | "drafts" | "starred" | "archived";

export default function Webmail() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedView, setSelectedView] = useState<ViewType>("inbox");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showingAllUsers, setShowingAllUsers] = useState(false);

  // Compose state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeToId, setComposeToId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const [messagingUid, setMessagingUid] = useState<string | null>(null);
  const messagingUidRef = useRef<string | null>(null);
  const stompRef = useRef<MiniStomp | null>(null);

  const downloadAttachment = async (
    attachmentUrl: string,
    attachmentName: string,
  ) => {
    try {
      const fullUrl = attachmentUrl.startsWith("http")
        ? attachmentUrl
        : `${MESSAGING_BASE}${attachmentUrl}`;
      const a = document.createElement("a");
      a.href = fullUrl;
      a.download = attachmentName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error("Failed to download attachment");
    }
  };

  useEffect(() => {
    const email = profile?.email || user?.email || "";
    if (!email) return;
    fetch(
      `${MESSAGING_BASE}/api/participants/resolve?email=${encodeURIComponent(email)}`,
    )
      .then((r) => r.json().catch(() => null))
      .then((data) => {
        if (data && data.found && data.id != null) {
          setMessagingUid(String(data.id));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  useEffect(() => {
    if (messagingUid) {
      messagingUidRef.current = messagingUid;
    }
    if (user) {
      fetchMessages();
      fetchDrafts();
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedView, messagingUid]);

  useEffect(() => {
    if (!messagingUid) return;
    const topic = `/topic/messages/${messagingUid}`;
    if (!stompRef.current) {
      const wsBase = MESSAGING_BASE.replace(/^http/, "ws");
      stompRef.current = new MiniStomp(`${wsBase}/ws`);
      stompRef.current.connect(() => {
        stompRef.current?.subscribe(topic, async (payload) => {
          if (payload && payload.messageId != null) {
            const updated = await fetchMessages();
            const incoming = updated.find(
              (m: any) =>
                String(m.id) === String(payload.messageId) &&
                String(m.to_user_id) === String(messagingUidRef.current),
            );
            if (incoming) {
              const sender =
                incoming.from_profile?.full_name || "Unknown";
              toast("New message", {
                description: `From ${sender}: ${incoming.subject}`,
              });
            }
            window.dispatchEvent(new Event("notifications-updated"));
          }
        });
      });
    } else {
      stompRef.current.subscribe(topic, async (payload) => {
        if (payload && payload.messageId != null) {
          const updated = await fetchMessages();
          const incoming = updated.find(
            (m: any) =>
              String(m.id) === String(payload.messageId) &&
              String(m.to_user_id) === String(messagingUidRef.current),
          );
          if (incoming) {
            const sender =
              incoming.from_profile?.full_name || "Unknown";
            toast("New message", {
              description: `From ${sender}: ${incoming.subject}`,
            });
          }
          window.dispatchEvent(new Event("notifications-updated"));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagingUid]);

  useEffect(() => {
    // GSAP Title Animation
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
          y: 30,
          rotationX: -90,
        },
        {
          opacity: 1,
          y: 0,
          rotationX: 0,
          duration: 0.6,
          stagger: 0.02,
          ease: "back.out(1.7)",
        },
      );
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const resp = await fetch(`${MESSAGING_BASE}/api/directory`);
      if (!resp.ok) {
        setUsers([]);
        return;
      }
      const directory = await resp.json();
      const uid = messagingUidRef.current;
      setUsers(
        (directory || [])
          .filter((d: any) => String(d.id) !== String(uid))
          .map((d: any) => ({
            id: String(d.id),
            email: d.email || "",
            full_name: d.full_name || "",
          })),
      );
    } catch (error) {
      console.error("Error fetching directory:", error);
      setUsers([]);
    }
  };

  const fetchMessages = async (): Promise<any[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      const uid = messagingUidRef.current || user.uid;

      const resp = await fetch(
        `${MESSAGING_BASE}/api/messages/${uid}/?view=${selectedView}`,
      );
      if (!resp.ok) throw new Error("Failed to fetch messages");

      const messagesData = await resp.json();

      setMessages(messagesData);
      return messagesData;
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    if (!user) return;

    try {
      const uid = messagingUidRef.current || user.uid;

      const resp = await fetch(`${MESSAGING_BASE}/api/drafts/${uid}/`);
      if (!resp.ok) throw new Error("Failed to fetch drafts");

      const draftsData = await resp.json();

      setDrafts(draftsData);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast.error("You must be logged in to send messages.");
      return;
    }

    if (!composeToId) {
      toast.error("Please select a recipient from the list.");
      return;
    }

    if (!composeSubject.trim()) {
      toast.error("Please enter a subject.");
      return;
    }

    if (!composeBody.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    try {
      setSending(true);

      const uid = messagingUidRef.current || user.uid;

      let attachmentUrl = null;
      let attachmentName = null;
      let attachmentSize = null;

      if (attachmentFile) {
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(attachmentFile);
        });
        const uploadResp = await fetch(`${MESSAGING_BASE}/api/attachments/base64`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: attachmentFile.name,
            content_type: attachmentFile.type,
            size: attachmentFile.size,
            data: base64Data,
          }),
        });
        if (uploadResp.ok) {
          const uploadData = await uploadResp.json();
          attachmentUrl = uploadData.url;
          attachmentName = attachmentFile.name;
          attachmentSize = attachmentFile.size;
        }
      }

      const resp = await fetch(`${MESSAGING_BASE}/api/messages/send/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_user_id: uid,
          to_user_id: composeToId,
          subject: composeSubject,
          body: composeBody,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_size: attachmentSize,
        }),
      });

      if (!resp.ok) throw new Error("Failed to send message");

      // Reset compose form
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setComposeToId(null);
      setAttachmentFile(null);
      setIsComposeOpen(false);

      // Refresh messages
      fetchMessages();

      toast.success("Message sent successfully!");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again. Error: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) return;

    try {
      setSavingDraft(true);
      const uid = messagingUidRef.current || user.uid;

      await fetch(`${MESSAGING_BASE}/api/drafts/save/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: uid,
          to_user_id: composeToId,
          subject: composeSubject,
          body: composeBody,
        }),
      });

      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setComposeToId(null);
      setIsComposeOpen(false);
      fetchDrafts();

      toast.success("Draft saved successfully!");
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft. Error: " + error.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleToggleStar = async (messageId: string, currentValue: boolean) => {
    // Immediate UI update for better UX
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === messageId ? { ...msg, is_starred: !currentValue } : msg,
      ),
    );

    if (selectedMessage?.id === messageId) {
      setSelectedMessage({ ...selectedMessage, is_starred: !currentValue });
    }

    try {
      const uid = messagingUidRef.current || user?.uid;

      await fetch(`${MESSAGING_BASE}/api/messages/${messageId}/action/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "star",
          user_id: uid,
        }),
      });

      fetchMessages();
    } catch (error) {
      console.error("Error toggling star:", error);
      // Revert the optimistic update on error
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, is_starred: currentValue } : msg,
        ),
      );
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, is_starred: currentValue });
      }
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const uid = messagingUidRef.current || user?.uid;

      await fetch(`${MESSAGING_BASE}/api/messages/${messageId}/action/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "read",
          user_id: uid,
        }),
      });

      fetchMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, is_read: true });
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!user) return;

    try {
      const uid = messagingUidRef.current || user.uid;

      await fetch(`${MESSAGING_BASE}/api/messages/${messageId}/action/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          user_id: uid,
        }),
      });

      setSelectedMessage(null);
      fetchMessages();
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleReply = () => {
    if (!selectedMessage) return;

    const replyTo =
      selectedMessage.from_user_id ===
      (messagingUidRef.current || user?.uid)
        ? selectedMessage.to_profile
        : selectedMessage.from_profile;

    if (replyTo) {
      setComposeTo(replyTo.full_name);
      setComposeToId(replyTo.id);
      setComposeSubject(
        selectedMessage.subject.startsWith("Re:")
          ? selectedMessage.subject
          : `Re: ${selectedMessage.subject}`,
      );
      setComposeBody(
        `\n\n---\nOn ${selectedMessage.created_at && !isNaN(new Date(selectedMessage.created_at).getTime()) ? new Date(selectedMessage.created_at).toLocaleString() : "Unknown time"}, ${replyTo.full_name} wrote:\n> ${selectedMessage.body
          .split("\n")
          .join("\n> ")}`,
      );
      setIsComposeOpen(true);
    }
  };

  const handleForward = () => {
    if (!selectedMessage) return;

    setComposeTo("");
    setComposeToId(null);
    setComposeSubject(
      selectedMessage.subject.startsWith("Fwd:")
        ? selectedMessage.subject
        : `Fwd: ${selectedMessage.subject}`,
    );
    setComposeBody(
      `\n\n---\nForwarded message:\nFrom: ${selectedMessage.from_profile?.full_name} <${selectedMessage.from_profile?.email}>\nSubject: ${selectedMessage.subject}\nDate: ${
        selectedMessage.created_at &&
        !isNaN(new Date(selectedMessage.created_at).getTime())
          ? new Date(selectedMessage.created_at).toLocaleString()
          : "Unknown time"
      }\n\n${selectedMessage.body}`,
    );
    setIsComposeOpen(true);
  };

  const handleArchive = async (messageId: string, currentValue: boolean) => {
    try {
      const uid = messagingUidRef.current || user?.uid;
      await fetch(`${MESSAGING_BASE}/api/messages/${messageId}/action/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archive",
          user_id: uid,
        }),
      });
      fetchMessages();
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, is_archived: !currentValue });
      }
    } catch (error) {
      console.error("Error archiving message:", error);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(query) ||
      msg.body.toLowerCase().includes(query) ||
      msg.from_profile?.full_name.toLowerCase().includes(query) ||
      msg.from_profile?.email.toLowerCase().includes(query) ||
      msg.to_profile?.full_name.toLowerCase().includes(query) ||
      msg.to_profile?.email.toLowerCase().includes(query)
    );
  });

  const unreadCount = messages.filter(
    (m) =>
      !m.is_read &&
      m.to_user_id === (messagingUidRef.current || user?.uid),
  ).length;

  const starredCount = messages.filter((m) => m.is_starred).length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <StudentHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent py-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--secondary)/0.2)_0%,_transparent_50%)]" />
        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl"
          >
            <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-3">
              <Mail className="h-4 w-4" />
              <span>Communication</span>
            </div>

            <h1
              ref={titleRef}
              className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4"
            >
              Webmail
            </h1>
            <p className="text-primary-foreground/80 text-lg max-w-2xl">
              Connect with lecturers and students across the university
            </p>
          </motion.div>
        </div>
      </section>

      <main className="container py-4 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Menu Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 md:hidden"
          >
            <Button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              variant="outline"
              className="w-full gap-2 h-12"
            >
              <Mail className="h-5 w-5" />
              {selectedView === "inbox" && "Inbox"}
              {selectedView === "sent" && "Sent"}
              {selectedView === "drafts" && "Drafts"}
              {selectedView === "starred" && "Starred"}
              {selectedView === "archived" && "Archived"}
              <ChevronLeft
                className={`h-4 w-4 ml-auto transition-transform ${sidebarOpen ? "rotate-90" : "-rotate-90"}`}
              />
            </Button>
          </motion.div>

          {/* Compose Button - Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 md:hidden"
          >
            <Button
              onClick={() => setIsComposeOpen(true)}
              className="w-full gap-2 h-12 bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-white shadow-lg"
            >
              <Plus className="h-5 w-5" />
              Compose
            </Button>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-4 md:gap-6">
            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: 1,
                x: 0,
                height: sidebarOpen ? "auto" : "0",
                overflow: "hidden",
              }}
              className={`lg:col-span-1 ${sidebarOpen ? "block" : "hidden lg:block"}`}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-3 md:p-4 space-y-3">
                  <Select
                    value={selectedView}
                    onValueChange={(value) => {
                      setSelectedView(value as ViewType);
                      setSidebarOpen(false);
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbox">
                        <span className="flex items-center gap-2">
                          <Inbox className="h-4 w-4" />
                          Inbox
                          {unreadCount > 0 && (
                            <Badge className="ml-1 bg-amber-500 text-xs h-5 px-1.5">
                              {unreadCount}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                      <SelectItem value="sent">
                        <span className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Sent
                        </span>
                      </SelectItem>
                      <SelectItem value="drafts">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Drafts
                          {drafts.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                              {drafts.length}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                      <SelectItem value="starred">
                        <span className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Starred
                          {starredCount > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                              {starredCount}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                      <SelectItem value="archived">
                        <span className="flex items-center gap-2">
                          <Archive className="h-4 w-4" />
                          Archived
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </motion.div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {selectedView === "drafts" ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold">Drafts</h2>
                    </div>
                    {drafts.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">No drafts yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {drafts.map((draft) => (
                          <Card
                            key={draft.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              setComposeTo(draft.to_profile?.email || "");
                              setComposeToId(draft.to_user_id || null);
                              setComposeSubject(draft.subject || "");
                              setComposeBody(draft.body || "");
                              setIsComposeOpen(true);
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">
                                      {draft.to_profile?.full_name ||
                                        "No recipient"}
                                    </span>
                                    {draft.subject && (
                                      <>
                                        <span className="text-muted-foreground">
                                          •
                                        </span>
                                        <span className="font-semibold">
                                          {draft.subject}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {draft.body && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {draft.body}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {draft.created_at &&
                                    !isNaN(new Date(draft.created_at).getTime())
                                      ? format(
                                          new Date(draft.created_at),
                                          "MMM d, yyyy h:mm a",
                                        )
                                      : "Unknown time"}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* View Selector */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4"
                  >
                    <Select
                      value={selectedView}
                      onValueChange={(value) => setSelectedView(value as ViewType)}
                    >
                      <SelectTrigger className="h-12 bg-muted/50 border-0 rounded-xl">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbox">
                          <span className="flex items-center gap-2">
                            <Inbox className="h-4 w-4" />
                            Inbox
                            {unreadCount > 0 && (
                              <Badge className="ml-1 bg-amber-500 text-xs h-5 px-1.5">
                                {unreadCount}
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                        <SelectItem value="sent">
                          <span className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            Sent
                          </span>
                        </SelectItem>
                        <SelectItem value="drafts">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Drafts
                            {drafts.length > 0 && (
                              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                                {drafts.length}
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                        <SelectItem value="starred">
                          <span className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Starred
                            {starredCount > 0 && (
                              <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                                {starredCount}
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                        <SelectItem value="archived">
                          <span className="flex items-center gap-2">
                            <Archive className="h-4 w-4" />
                            Archived
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>

                  {/* Search Bar */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4"
                  >
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-12 bg-muted/50 border-0 rounded-xl"
                      />
                    </div>
                  </motion.div>

                  {loading ? (
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-12 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Loading messages...
                        </p>
                      </CardContent>
                    </Card>
                  ) : selectedMessage ? (
                    /* Message Detail View */
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedMessage(null)}
                            className="h-10 w-10 md:h-8 md:w-8"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg md:text-2xl font-bold truncate">
                              {selectedMessage.subject}
                            </h2>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 md:h-8 md:w-8"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleStar(
                                    selectedMessage.id,
                                    selectedMessage.is_starred,
                                  )
                                }
                              >
                                <Star
                                  className={`h-4 w-4 mr-2 ${
                                    selectedMessage.is_starred
                                      ? "fill-amber-500 text-amber-500"
                                      : ""
                                  }`}
                                />
                                {selectedMessage.is_starred ? "Unstar" : "Star"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleArchive(
                                    selectedMessage.id,
                                    selectedMessage.is_archived,
                                  )
                                }
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                {selectedMessage.is_archived
                                  ? "Unarchive"
                                  : "Archive"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(selectedMessage.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <div className="flex items-start gap-3 md:gap-4 pb-4 border-b">
                              <Avatar className="h-12 w-12 flex-shrink-0">
                                <AvatarImage
                                  src={
                                    selectedMessage.from_profile?.avatar_url ||
                                    undefined
                                  }
                                />
                                <AvatarFallback>
                                  {getInitials(
                                    selectedMessage.from_profile?.full_name ||
                                      "U",
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                  <span className="font-semibold text-sm md:text-base">
                                    {selectedMessage.from_profile?.full_name ||
                                      "Unknown"}
                                  </span>
                                  <span className="text-muted-foreground text-sm hidden sm:inline">
                                    &lt;{selectedMessage.from_profile?.email}
                                    &gt;
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {selectedMessage.created_at &&
                                  !isNaN(
                                    new Date(
                                      selectedMessage.created_at,
                                    ).getTime(),
                                  )
                                    ? formatDistanceToNow(
                                        new Date(selectedMessage.created_at),
                                        { addSuffix: true },
                                      )
                                    : "Unknown time"}
                                </p>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleToggleStar(
                                        selectedMessage.id,
                                        selectedMessage.is_starred,
                                      )
                                    }
                                    className="h-8 w-8 flex-shrink-0 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                  >
                                    <Star
                                      className={`h-5 w-5 transition-colors ${
                                        selectedMessage.is_starred
                                          ? "fill-amber-500 text-amber-500"
                                          : "text-muted-foreground hover:text-amber-400"
                                      }`}
                                    />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {selectedMessage.is_starred
                                      ? "Unstar message"
                                      : "Star message"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          <div className="prose max-w-none">
                            <p className="whitespace-pre-wrap text-foreground leading-relaxed text-sm md:text-base">
                              {selectedMessage.body}
                            </p>
                          </div>

                          {/* Attachment */}
                          {selectedMessage.attachment_url && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm font-medium mb-2">
                                Attachment:
                              </p>
                              {/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(
                                selectedMessage.attachment_name || "",
                              ) ? (
                                <a
                                  href={`${MESSAGING_BASE}${selectedMessage.attachment_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block mb-2"
                                >
                                  <img
                                    src={`${MESSAGING_BASE}${selectedMessage.attachment_url}`}
                                    alt={selectedMessage.attachment_name || "Attachment"}
                                    className="max-w-full max-h-80 rounded-lg border object-contain"
                                  />
                                </a>
                              ) : null}
                              <Button
                                variant="outline"
                                onClick={() =>
                                  downloadAttachment(
                                    selectedMessage.attachment_url!,
                                    selectedMessage.attachment_name ||
                                      "attachment",
                                  )
                                }
                                className="gap-2 w-full sm:w-auto justify-start h-12"
                              >
                                <Paperclip className="h-4 w-4" />
                                <span className="truncate">
                                  {selectedMessage.attachment_name}{" "}
                                  {selectedMessage.attachment_size &&
                                    `(${(
                                      selectedMessage.attachment_size / 1024
                                    ).toFixed(1)} KB)`}
                                </span>
                              </Button>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                            <Button
                              variant="outline"
                              className="gap-2 flex-1 sm:flex-initial h-12"
                              onClick={handleReply}
                            >
                              <Reply className="h-4 w-4" />
                              Reply
                            </Button>
                            <Button
                              variant="outline"
                              className="gap-2 flex-1 sm:flex-initial h-12"
                              onClick={handleForward}
                            >
                              <Forward className="h-4 w-4" />
                              Forward
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* Message List */
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-0">
                        {filteredMessages.length === 0 ? (
                          <div className="text-center py-12">
                            <Mail className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              {searchQuery
                                ? "No messages found"
                                : "No messages yet"}
                            </p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[600px]">
                            <div className="divide-y">
                              <AnimatePresence>
                                {filteredMessages.map((message, index) => {
                                  const isSent =
                                    message.from_user_id ===
                                    (messagingUidRef.current || user?.uid);
                                  const otherProfile = isSent
                                    ? message.to_profile
                                    : message.from_profile;

                                  return (
                                    <motion.div
                                      key={message.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: 20 }}
                                      transition={{ delay: index * 0.03 }}
                                      className={`p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                                        !message.is_read && !isSent
                                          ? "bg-primary/5"
                                          : ""
                                      }`}
                                      onClick={() => {
                                        setSelectedMessage(message);
                                        if (!message.is_read && !isSent) {
                                          handleMarkAsRead(message.id);
                                        }
                                      }}
                                    >
                                      <div className="flex items-start gap-3 md:gap-4">
                                        <Avatar className="h-10 w-10 md:h-10 md:w-10 flex-shrink-0">
                                          <AvatarImage
                                            src={
                                              otherProfile?.avatar_url ||
                                              undefined
                                            }
                                          />
                                          <AvatarFallback className="text-xs">
                                            {getInitials(
                                              otherProfile?.full_name || "U",
                                            )}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold truncate text-sm md:text-base">
                                              {otherProfile?.full_name ||
                                                "Unknown"}
                                            </span>
                                            {!message.is_read && !isSent && (
                                              <Circle className="h-2 w-2 fill-secondary text-secondary flex-shrink-0" />
                                            )}
                                          </div>
                                          <p className="font-medium truncate mb-1 text-sm md:text-base">
                                            {message.subject || "(No subject)"}
                                          </p>
                                          <p className="text-sm text-muted-foreground line-clamp-2">
                                            {message.body}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-2">
                                            {message.created_at &&
                                            !isNaN(
                                              new Date(
                                                message.created_at,
                                              ).getTime(),
                                            )
                                              ? formatDistanceToNow(
                                                  new Date(message.created_at),
                                                  { addSuffix: true },
                                                )
                                              : "Unknown time"}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 md:h-8 md:w-8 touch-manipulation hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleStar(
                                                    message.id,
                                                    message.is_starred,
                                                  );
                                                }}
                                              >
                                                <Star
                                                  className={`h-4 w-4 transition-colors ${
                                                    message.is_starred
                                                      ? "fill-amber-500 text-amber-500"
                                                      : "text-muted-foreground hover:text-amber-400"
                                                  }`}
                                                />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>
                                                {message.is_starred
                                                  ? "Unstar message"
                                                  : "Star message"}
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 md:h-8 md:w-8 hover:text-destructive touch-manipulation"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(message.id);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </AnimatePresence>
                            </div>
                          </ScrollArea>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto mx-2 md:mx-auto p-4 md:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl font-semibold">
              Compose Message
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Send a message to lecturers or students
            </p>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                To
              </label>
              <div className="space-y-3">
                <Input
                  placeholder="Type name or email to search..."
                  value={composeTo}
                  onChange={(e) => {
                    setComposeTo(e.target.value);
                    const foundUser = users.find(
                      (u) =>
                        u.email.toLowerCase() ===
                          e.target.value.toLowerCase() ||
                        u.full_name
                          .toLowerCase()
                          .includes(e.target.value.toLowerCase()),
                    );
                    setComposeToId(foundUser?.id || null);
                  }}
                  className={`h-12 text-base ${composeToId ? "border-green-500 focus:border-green-500" : ""}`}
                />
                {composeTo && !composeToId && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    No user found. Please select from the list below.
                  </p>
                )}
                {composeToId && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Recipient selected
                  </p>
                )}
                {showingAllUsers && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {profile?.role?.toLowerCase() === "lecturer"
                      ? "No enrolled students found. Showing all students as fallback."
                      : "No lecturers found yet. Showing all users as fallback."}
                  </p>
                )}
                {composeTo && (
                  <ScrollArea className="max-h-40 md:max-h-32 rounded-md border">
                    <div className="p-2 space-y-1">
                      {users
                        .filter(
                          (u) =>
                            u.email
                              .toLowerCase()
                              .includes(composeTo.toLowerCase()) ||
                            u.full_name
                              .toLowerCase()
                              .includes(composeTo.toLowerCase()),
                        )
                        .slice(0, 10)
                        .map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setComposeTo(user.email);
                              setComposeToId(user.id);
                            }}
                            className="w-full text-left px-3 py-3 md:py-2 rounded hover:bg-muted transition-colors touch-manipulation"
                          >
                            <div className="font-medium text-sm md:text-base">
                              {user.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </button>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                Subject
              </label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Enter message subject..."
                className="h-12 text-base"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                Message
              </label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[200px] md:min-h-[300px] resize-none text-base leading-relaxed"
                rows={8}
              />
            </div>

            {/* Attachment Section */}
            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                Attachment (Optional)
              </label>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("attachment-upload")?.click()
                    }
                    disabled={uploadingAttachment}
                    className="w-full sm:w-auto h-12 flex-shrink-0"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    {attachmentFile ? "Change File" : "Attach File"}
                  </Button>
                  <input
                    id="attachment-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10485760) {
                          toast.error("File size must be less than 10MB");
                          return;
                        }
                        setAttachmentFile(file);
                      }
                    }}
                  />
                  {attachmentFile && (
                    <div className="flex items-center gap-2 flex-1 min-w-0 bg-muted/50 rounded-md p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachmentFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(attachmentFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachmentFile(null)}
                        className="flex-shrink-0 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported: PDF, Word, Excel, Images, ZIP (Max 10MB)
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="w-full sm:w-auto h-12 order-2 sm:order-1 border-2"
              >
                {savingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Draft"
                )}
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={
                  !composeToId ||
                  !composeSubject ||
                  !composeBody.trim() ||
                  sending
                }
                className="w-full sm:w-auto h-12 bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 order-1 sm:order-2 shadow-lg"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <StudentBottomNav />
    </div>
  );
}
