import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  BookOpen,
  Calendar,
  Megaphone,
  Clipboard,
  Award,
  Mail,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface StudentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
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

export function StudentSidebar({ isOpen, onClose }: StudentSidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Close sidebar when route changes
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  if (!user) return null;

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed left-0 top-0 z-50 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-200 dark:border-gray-700"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Navigation</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {studentNavItems.map((item, index) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          to={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            isActive
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </nav>

              {/* Logout */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
