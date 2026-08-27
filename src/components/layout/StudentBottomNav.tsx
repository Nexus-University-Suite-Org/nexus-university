import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  BookOpen,
  Calendar,
  User,
  Clipboard,
  GraduationCap,
  Settings,
  Mail,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const studentNavItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Programs", href: "/programs", icon: GraduationCap },
  { label: "Calendar", href: "/academic-calendar", icon: Calendar },
  { label: "Assignments", href: "/assignments", icon: Clipboard },
  { label: "Quiz", href: "/quiz", icon: BookOpen },
  { label: "Webmail", href: "/webmail", icon: Mail },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function StudentBottomNav() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl backdrop-saturate-150 border-t border-white/20 dark:border-gray-700/50 shadow-2xl shadow-black/10 safe-area-bottom"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {studentNavItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex-1"
            >
              <Link
                to={item.href}
                className={cn(
                  "group relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 rounded-2xl mx-1",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                <motion.div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 relative overflow-hidden",
                    isActive
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25"
                      : "hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-2xl"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  <motion.div
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 relative z-10",
                        isActive ? "text-white" : "text-current"
                      )}
                    />
                  </motion.div>
                </motion.div>
                <motion.span
                  className={cn(
                    "text-[10px] font-semibold transition-all duration-300",
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                  animate={{ y: isActive ? -1 : 0 }}
                >
                  {item.label}
                </motion.span>
                {isActive && (
                  <motion.div
                    className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: studentNavItems.length * 0.1 }}
          className="flex-1"
        >
          <button
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
            className={cn(
              "group relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 rounded-2xl mx-1 text-gray-500 dark:text-gray-400"
            )}
          >
            <motion.div
              className="flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 relative overflow-hidden hover:bg-red-50 dark:hover:bg-red-900/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut className="h-5 w-5 relative z-10 text-red-500" />
            </motion.div>
            <motion.span
              className="text-[10px] font-semibold transition-all duration-300 text-red-500"
            >
              Sign out
            </motion.span>
          </button>
        </motion.div>
      </div>
    </motion.nav>
  );
}
