import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  Zap,
  BookOpen,
  Calendar,
  Megaphone,
  Clipboard,
  Award,
  Mail,
  Settings,
  BarChart3,
  FileText,
  HelpCircle,
  Users,
  MessageCircle,
  Target,
  CheckCircle,
  Calculator,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { getBackend } from "@/lib/backendApi";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppLayoutProps {
  children: React.ReactNode;
}

const studentNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: Zap },
  { label: "Programs", href: "/programs", icon: BookOpen },
  { label: "Calendar", href: "/academic-calendar", icon: Calendar },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Assignments", href: "/assignments", icon: Clipboard },
  { label: "Quiz", href: "/quiz", icon: BookOpen },
  { label: "Results", href: "/results", icon: Award },
  { label: "Webmail", href: "/webmail", icon: Mail },
  { label: "ID Card", href: "/id-card", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

const lecturerNavItems = [
  { label: "Dashboard", href: "/lecturer", icon: BookOpen },
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

const registrarNavItems = [
  { label: "Dashboard", href: "/registrar", icon: Calculator },
  { label: "Students", href: "/registrar/students", icon: Users },
  { label: "Programs", href: "/registrar/programs", icon: BookOpen },
  { label: "Enrollments", href: "/registrar/enrollments", icon: CheckCircle },
  { label: "Transcripts", href: "/registrar/transcripts", icon: FileText },
  { label: "Reports", href: "/registrar/reports", icon: BarChart3 },
  { label: "Calendar", href: "/registrar/calendar", icon: Calendar },
  { label: "Settings", href: "/registrar/settings", icon: Settings },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, profile, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const getNavItems = () => {
    switch (profile?.role) {
      case "lecturer":
        return lecturerNavItems;
      case "registrar":
        return registrarNavItems;
      default:
        return studentNavItems;
    }
  };

  const getRoleLabel = () => {
    switch (profile?.role) {
      case "lecturer":
        return "Lecturer";
      case "registrar":
        return "Registrar";
      default:
        return "Student";
    }
  };

  useEffect(() => {
    if (user?.uid) {
      const fetchUnreadCount = async () => {
        try {
          const data = await getBackend<any[]>(
            "/api/notifications/?user_id=" + user.uid,
          );
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

  const navItems = getNavItems();
  const sidebarWidth = collapsed ? "w-[68px]" : "w-64";

  const SidebarNav = ({ isMobile = false }: { isMobile?: boolean }) => (
    <nav className="flex-1 overflow-y-auto p-3">
      <div className="space-y-1">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          const linkContent = (
            <Link
              to={item.href}
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              } ${collapsed ? "justify-center" : ""}`}
            >
              {isActive && (
                <motion.div
                  layoutId={isMobile ? "mobile-active-tab" : "active-tab"}
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon
                className={`h-5 w-5 relative z-10 flex-shrink-0 transition-colors duration-200 ${
                  isActive ? "text-primary" : ""
                }`}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="relative z-10 whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.label} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              {linkContent}
            </motion.div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <motion.div
          animate={{ width: collapsed ? 68 : 256 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="hidden lg:flex fixed left-0 top-0 z-40 h-full flex-col bg-card border-r border-border shadow-lg"
        >
          {/* Logo + Toggle */}
          <div className="flex h-16 items-center border-b border-border px-3">
            <Link
              to={
                profile?.role === "lecturer"
                  ? "/lecturer"
                  : profile?.role === "registrar"
                    ? "/registrar"
                    : "/dashboard"
              }
              className="flex items-center gap-2.5 group min-w-0"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground transition-transform group-hover:scale-105 shadow-lg">
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
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col overflow-hidden"
                  >
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {getRoleLabel()}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto h-8 w-8 flex-shrink-0 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <motion.div
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </motion.div>
            </Button>
          </div>

          {/* Navigation */}
          <SidebarNav />
        </motion.div>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden"
            >
              <div className="fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border shadow-xl">
                <div className="flex h-full flex-col">
                  {/* Logo */}
                  <div className="flex h-16 items-center border-b border-border px-4">
                    <Link
                      to={
                        profile?.role === "lecturer"
                          ? "/lecturer"
                          : profile?.role === "registrar"
                            ? "/registrar"
                            : "/dashboard"
                      }
                      className="flex items-center gap-2.5 group"
                    >
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
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {getRoleLabel()}
                        </span>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileMenuOpen(false)}
                      className="ml-auto h-8 w-8"
                    >
                      <span className="sr-only">Close menu</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </Button>
                  </div>

                  {/* Navigation */}
                  <SidebarNav isMobile />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <motion.main
          animate={{ marginLeft: collapsed ? 68 : 256 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="hidden lg:block min-h-screen"
        >
          {children}
        </motion.main>

        {/* Mobile content */}
        <div className="lg:hidden min-h-screen">{children}</div>

        {/* Mobile overlay backdrop */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile bottom bar - only on mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-t border-border">
          <div className="flex items-center justify-around py-2 px-4">
            {navItems.slice(0, 5).map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
