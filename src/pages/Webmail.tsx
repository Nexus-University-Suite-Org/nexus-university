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
  MoreVertical,
  Reply,
  Forward,
  ChevronLeft,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-3xl">
              <div className="rounded-xl bg-white shadow-lg border border-white/40 p-4">
                <p className="text-2xl font-bold text-primary">
                  {messages.filter(
                    (m) =>
                      m.to_user_id ===
                      (messagingUidRef.current || user?.uid),
                  ).length}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Inbox className="h-3 w-3 text-secondary" /> Received
                </p>
              </div>
              <div className="rounded-xl bg-white shadow-lg border border-white/40 p-4">
                <p className="text-2xl font-bold text-amber-500">
                  {unreadCount}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Circle className="h-3 w-3 fill-amber-500 text-amber-500" />{" "}
                  Unread
                </p>
              </div>
              <div className="rounded-xl bg-white shadow-lg border border-white/40 p-4">
                <p className="text-2xl font-bold text-primary">
                  {starredCount}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />{" "}
                  Starred
                </p>
              </div>
              <div className="rounded-xl bg-white shadow-lg border border-white/40 p-4">
                <p className="text-2xl font-bold text-primary">
                  {messages.filter(
                    (m) =>
                      m.from_user_id ===
                      (messagingUidRef.current || user?.uid),
                  ).length}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Send className="h-3 w-3 text-secondary" /> Sent
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="container py-4 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Toolbar: Compose + View Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row md:items-center gap-3 mb-5"
          >
            <Button
              onClick={() => setIsComposeOpen(true)}
              className="h-12 shrink-0 bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-white shadow-lg gap-2"
            >
              <Plus className="h-5 w-5" />
              Compose
            </Button>

            <div className="flex-1 min-w-0">
              <Tabs
                value={selectedView}
                onValueChange={(v) => setSelectedView(v as ViewType)}
                className="w-full"
              >
                <TabsList className="h-12 w-full md:w-auto bg-muted/60 p-1 justify-start overflow-x-auto">
                  {[
                    {
                      key: "inbox" as ViewType,
                      label: "Inbox",
                      icon: Inbox,
                      count: unreadCount,
                      accent: true,
                    },
                    {
                      key: "sent" as ViewType,
                      label: "Sent",
                      icon: Send,
                      count: messages.filter(
                        (m) =>
                          m.from_user_id ===
                          (messagingUidRef.current || user?.uid),
                      ).length,
                    },
                    {
                      key: "drafts" as ViewType,
                      label: "Drafts",
                      icon: FileText,
                      count: drafts.length,
                    },
                    {
                      key: "starred" as ViewType,
                      label: "Starred",
                      icon: Star,
                      count: starredCount,
                    },
                    {
                      key: "archived" as ViewType,
                      label: "Archived",
                      icon: Archive,
                    },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.key}
                        value={tab.key}
                        className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow data-[state=active]:text-foreground h-9"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="whitespace-nowrap">{tab.label}</span>
                        {tab.count ? (
                          <Badge
                            className={`ml-0.5 h-5 px-1.5 text-[11px] ${
                              tab.accent && tab.count > 0
                                ? "bg-amber-500"
                                : "bg-muted-foreground/20"
                            }`}
                          >
                            {tab.count}
                          </Badge>
                        ) : null}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-1 gap-4 md:gap-6">
            {/* Main Content */}
            <div className="lg:col-span-1">
              {selectedView === "drafts" ? (
                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-secondary/15 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold font-display">
                            Drafts
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {drafts.length}{" "}
                            {drafts.length === 1 ? "draft" : "drafts"} saved
                          </p>
                        </div>
                      </div>
                    </div>
                    {drafts.length === 0 ? (
                      <div className="text-center py-14">
                        <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-5">
                          <FileText className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                        <h3 className="font-display text-xl font-semibold mb-2">
                          No drafts yet
                        </h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-5">
                          Drafts you save while composing will appear here.
                        </p>
                        <Button
                          onClick={() => setIsComposeOpen(true)}
                          className="gap-2 bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-white shadow"
                        >
                          <Plus className="h-4 w-4" />
                          New Message
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {drafts.map((draft) => (
                          <Card
                            key={draft.id}
                            className="group cursor-pointer hover:shadow-md hover:border-secondary/40 transition-all border-l-4 border-l-secondary/60"
                            onClick={() => {
                              setComposeTo(draft.to_profile?.email || "");
                              setComposeToId(draft.to_user_id || null);
                              setComposeSubject(draft.subject || "");
                              setComposeBody(draft.body || "");
                              setIsComposeOpen(true);
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold truncate text-sm">
                                      {draft.subject || "(No subject)"}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-4 px-1 text-muted-foreground shrink-0"
                                    >
                                      Draft
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-medium text-foreground/80 mb-1">
                                    To:{" "}
                                    {draft.to_profile?.full_name ||
                                      draft.to_profile?.email ||
                                      "No recipient"}
                                  </p>
                                  {draft.body && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {draft.body}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {draft.created_at &&
                                      !isNaN(
                                        new Date(draft.created_at).getTime(),
                                      )
                                        ? format(
                                            new Date(draft.created_at),
                                            "MMM d, yyyy h:mm a",
                                          )
                                        : "Unknown time"}
                                    </p>
                                    <span className="text-xs text-secondary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                      Continue editing →
                                    </span>
                                  </div>
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
                    <Card className="border-0 shadow-lg overflow-hidden">
                      <CardContent className="p-6 space-y-4">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="h-11 w-11 rounded-full bg-muted animate-pulse flex-shrink-0" />
                            <div className="flex-1 space-y-2 pt-1">
                              <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                              <div className="h-3 bg-muted/70 animate-pulse rounded w-full" />
                              <div className="h-3 bg-muted/70 animate-pulse rounded w-2/3" />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : selectedMessage ? (
                    /* Message Detail View */
                    <Card className="border-0 shadow-lg overflow-hidden">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedMessage(null)}
                            className="h-10 w-10 md:h-9 md:w-9 shrink-0 rounded-full hover:bg-muted"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg md:text-2xl font-bold truncate font-display">
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
                          <div className="rounded-xl border border-muted bg-muted/30 p-4">
                            <div className="flex items-start gap-3 md:gap-4">
                              <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-background shadow-sm">
                                <AvatarImage
                                  src={
                                    selectedMessage.from_profile?.avatar_url ||
                                    undefined
                                  }
                                />
                                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                  {getInitials(
                                    selectedMessage.from_profile?.full_name ||
                                      "U",
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-0.5">
                                  <span className="font-semibold text-sm md:text-base">
                                    {selectedMessage.from_profile?.full_name ||
                                      "Unknown"}
                                  </span>
                                  <span className="text-muted-foreground text-sm">
                                    &lt;{selectedMessage.from_profile?.email}&gt;
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    To:{" "}
                                    {selectedMessage.to_profile?.full_name ||
                                      "Unknown"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
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
                                  </span>
                                </div>
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

                          <div className="prose max-w-none rounded-xl border border-border/60 p-4 md:p-5">
                            <p className="whitespace-pre-wrap text-foreground leading-relaxed text-sm md:text-base">
                              {selectedMessage.body}
                            </p>
                          </div>

                          {/* Attachment */}
                          {selectedMessage.attachment_url && (
                            <div className="rounded-xl border border-border/60 p-4">
                              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                Attachment
                              </p>
                              {/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(
                                selectedMessage.attachment_name || "",
                              ) ? (
                                <a
                                  href={`${MESSAGING_BASE}${selectedMessage.attachment_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block mb-3"
                                >
                                  <img
                                    src={`${MESSAGING_BASE}${selectedMessage.attachment_url}`}
                                    alt={selectedMessage.attachment_name || "Attachment"}
                                    className="max-w-full max-h-80 rounded-lg border object-contain bg-muted/20"
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
                                className="gap-2 w-full sm:w-auto justify-start h-11"
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
                              className="gap-2 flex-1 sm:flex-initial h-11 bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-white shadow"
                              onClick={handleReply}
                            >
                              <Reply className="h-4 w-4" />
                              Reply
                            </Button>
                            <Button
                              variant="outline"
                              className="gap-2 flex-1 sm:flex-initial h-11"
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
                    <Card className="border-0 shadow-lg overflow-hidden">
                      <CardContent className="p-0">
                        {filteredMessages.length === 0 ? (
                          <div className="text-center py-16">
                            <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-5">
                              <Mail className="h-12 w-12 text-muted-foreground/40" />
                            </div>
                            <h3 className="font-display text-xl font-semibold mb-2">
                              {searchQuery
                                ? "No messages found"
                                : "No messages yet"}
                            </h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                              {searchQuery
                                ? "Try adjusting your search query."
                                : "When you receive or send messages, they will appear here."}
                            </p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[600px]">
                            <div className="divide-y divide-border/50">
                              <AnimatePresence>
                                {filteredMessages.map((message, index) => {
                                  const isSent =
                                    message.from_user_id ===
                                    (messagingUidRef.current || user?.uid);
                                  const otherProfile = isSent
                                    ? message.to_profile
                                    : message.from_profile;
                                  const isUnread =
                                    !message.is_read && !isSent;

                                  return (
                                    <motion.div
                                      key={message.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: 20 }}
                                      transition={{
                                        delay: index * 0.03,
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30,
                                      }}
                                      className={`group relative p-4 cursor-pointer transition-all duration-200 ${
                                        isUnread
                                          ? "bg-primary/[0.04] hover:bg-primary/[0.08] border-l-[3px] border-l-secondary"
                                          : "hover:bg-muted/50 border-l-[3px] border-l-transparent"
                                      }`}
                                      onClick={() => {
                                        setSelectedMessage(message);
                                        if (isUnread) {
                                          handleMarkAsRead(message.id);
                                        }
                                      }}
                                    >
                                      <div className="flex items-start gap-3">
                                        <Avatar
                                          className={`h-11 w-11 flex-shrink-0 ring-2 transition-all ${
                                            isUnread
                                              ? "ring-secondary/30"
                                              : "ring-transparent group-hover:ring-muted-foreground/10"
                                          }`}
                                        >
                                          <AvatarImage
                                            src={
                                              otherProfile?.avatar_url ||
                                              undefined
                                            }
                                          />
                                          <AvatarFallback
                                            className={`text-xs font-semibold ${
                                              isUnread
                                                ? "bg-secondary text-secondary-foreground"
                                                : "bg-muted text-muted-foreground"
                                            }`}
                                          >
                                            {getInitials(
                                              otherProfile?.full_name || "U",
                                            )}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-3 mb-0.5">
                                            <span
                                              className={`truncate ${
                                                isUnread
                                                  ? "font-bold text-foreground"
                                                  : "font-medium text-foreground/80"
                                              }`}
                                            >
                                              {otherProfile?.full_name ||
                                                "Unknown"}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
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
                                                : ""}
                                            </span>
                                          </div>
                                          <p
                                            className={`truncate mb-1 ${
                                              isUnread
                                                ? "font-semibold text-foreground"
                                                : "font-medium text-foreground/70"
                                            }`}
                                          >
                                            {message.subject || "(No subject)"}
                                          </p>
                                          <p className="text-sm text-muted-foreground line-clamp-1 leading-relaxed">
                                            {message.body}
                                          </p>
                                          <div className="flex items-center gap-2 mt-2">
                                            {isSent && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] h-4 px-1.5"
                                              >
                                                Sent
                                              </Badge>
                                            )}
                                            {message.attachment_url && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px] h-4 px-1.5 gap-0.5"
                                              >
                                                <Paperclip className="h-2.5 w-2.5" />
                                                Attachment
                                              </Badge>
                                            )}
                                            {isUnread && (
                                              <Badge className="text-[10px] h-4 px-1.5 bg-secondary/90 gap-0.5">
                                                <Circle className="h-1.5 w-1.5 fill-current" />
                                                New
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 touch-manipulation hover:bg-amber-50 hover:text-amber-600 transition-colors"
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
          <DialogHeader className="pb-5 border-b">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-semibold font-display">
                  Compose Message
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Send a message to lecturers or students
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6 pt-5">
            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                To
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    className={`h-12 text-base pl-11 ${composeToId ? "border-green-500 focus:border-green-500" : ""}`}
                  />
                </div>
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
                  <ScrollArea className="max-h-40 md:max-h-32 rounded-md border border-border/60">
                    <div className="p-1.5 space-y-0.5">
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
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setComposeTo(u.email);
                              setComposeToId(u.id);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors touch-manipulation flex items-center gap-3"
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                                {getInitials(u.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">
                                {u.full_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {u.email}
                              </div>
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
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Enter message subject..."
                  className="h-12 text-base pl-11"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block text-foreground">
                Message
              </label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[200px] md:min-h-[280px] resize-none text-base leading-relaxed"
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
                    <div className="flex items-center gap-3 flex-1 min-w-0 bg-muted/50 rounded-lg p-3 border border-border/60">
                      <div className="h-9 w-9 rounded-md bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                        <Paperclip className="h-4 w-4 text-secondary" />
                      </div>
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
                        className="flex-shrink-0 h-8 w-8 p-0 hover:text-destructive hover:bg-destructive/10"
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
