import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Menu,
  X,
  Bell,
  User,
  LogOut,
  BookOpen,
  Settings,
  Mail,
  BarChart3,
  Users,
  FileText,
  CheckCircle,
  Target,
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { LecturerSidebar } from "./LecturerSidebar";
import { getMessagingBackend } from "@/lib/backendApi";

export function LecturerHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, profile, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    if (user?.uid) {
      const fetchUnreadCount = async () => {
        try {
          const data = await getMessagingBackend<any[]>("/api/notifications/?user_id=" + user.uid);
          setUnreadCount(data.filter((n) => !n.is_read).length);
        } catch {
          // Silently fail
        }
      };
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const lecturerNavItems = [
    { label: "My Courses", href: "/lecturer/courses", icon: BookOpen },
    { label: "Grades", href: "/lecturer/gradebook", icon: BarChart3 },
    { label: "Assignments", href: "/lecturer/assignments", icon: FileText },
    { label: "Quizzes", href: "/lecturer/quiz", icon: HelpCircle },
    { label: "Enrollments", href: "/lecturer/enrollments", icon: Users },
    {
      label: "Announcements",
      href: "/lecturer/announcements",
      icon: MessageCircle,
    },
    { label: "Roster", href: "/lecturer/roster", icon: Users },
    { label: "Analytics", href: "/lecturer/analytics", icon: Target },
    { label: "ID Card", href: "/lecturer/id-card", icon: User },
    { label: "Settings", href: "/lecturer/settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-gradient-to-r from-background to-background/95 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and Menu */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-10 w-10"
          >
            {sidebarOpen ? <X /> : <Menu />}
          </Button>
          <Link to="/lecturer" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground transition-transform group-hover:scale-105 shadow-lg">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={`${settings.siteName} logo`}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <GraduationCap className="h-6 w-6" />
              )}
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-xl font-bold text-foreground">
                {settings.shortName}
              </span>
              <span className="block text-xs text-muted-foreground">
                Lecturer
              </span>
            </div>
          </Link>
        </div>
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {user &&
            lecturerNavItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-primary/10"
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link to="/notifications">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={profile?.avatar_url || ""}
                        alt={profile?.full_name || user.email || ""}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile?.full_name
                          ? getInitials(profile.full_name)
                          : user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {profile?.full_name
                          ? getInitials(profile.full_name)
                          : user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">
                        {profile?.full_name || "Lecturer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to="/lecturer"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/lecturer/settings"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <LecturerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </header>
  );
}
