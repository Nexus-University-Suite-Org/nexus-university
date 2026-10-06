import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
    BarChart3,
    HelpCircle,
  } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Students", href: "/students", icon: Users },
  { name: "Transcripts", href: "/transcripts", icon: FileText },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  onLogout: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  onLogout,
  collapsed: externalCollapsed,
  onCollapsedChange,
}: SidebarProps) {
  const { settings } = useSiteSettings();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed = externalCollapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border/50 transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-border/50">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 gradient-primary rounded-xl blur-md opacity-30" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-xl text-foreground">
              {settings.shortName}
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 rounded-lg hover:bg-accent"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Menu
            </p>
          )}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-orange-400 text-white shadow-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                    !isActive && "group-hover:scale-110",
                  )}
                />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-border/50 space-y-1">
        <Link
          to="#"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200",
            collapsed && "justify-center",
          )}
        >
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Help & Support</span>}
        </Link>
        <Button
          variant="ghost"
          onClick={onLogout}
          className={cn(
            "w-full justify-start gap-3 rounded-xl px-3 py-3 h-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center",
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
