import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Who it's for", href: "#roles" },
  { label: "Platform", href: "#platform" },
  { label: "Get started", href: "#get-started" },
];

export function LandingHeader() {
  const { settings } = useSiteSettings();
  const { user, profile } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const destination =
    profile?.role === "lecturer"
      ? "/lecturer"
      : profile?.role === "registrar"
        ? "/registrar"
        : "/dashboard";

  const brandMark = (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200/60 transition-transform group-hover:scale-105">
      {settings.logoUrl ? (
        <img
          src={settings.logoUrl}
          alt=""
          className="h-5 w-5 object-contain"
        />
      ) : (
        <GraduationCap className="h-5 w-5" />
      )}
    </div>
  );

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl"
          : "border-b border-white/30 bg-white/30 backdrop-blur-md",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          to={user ? destination : "/"}
          className="group flex min-w-0 items-center gap-2.5"
        >
          {brandMark}
          <span className="truncate font-display text-lg font-bold tracking-tight text-slate-900">
            {settings.siteName}
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button
              asChild
              className="h-10 rounded-full bg-violet-600 px-6 font-semibold text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700"
            >
              <Link to={destination}>Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="h-10 rounded-full px-4 font-medium text-slate-800 transition-colors hover:bg-white/80 hover:text-slate-900"
              >
                <Link to="/auth" className="inline-flex items-center gap-2 text-inherit">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              </Button>
              <Button
                asChild
                className="h-10 rounded-full bg-violet-600 px-5 font-semibold text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700"
              >
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-zinc-700"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full border-zinc-200 bg-white sm:w-80"
            >
              <SheetHeader className="border-b border-zinc-100 pb-4 text-left">
                <SheetTitle className="flex items-center gap-2.5 font-display text-lg">
                  {brandMark}
                  {settings.siteName}
                </SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Mobile"
                className="flex flex-col gap-1 pt-4"
              >
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-6 flex flex-col gap-2">
                {user ? (
                  <Button
                    asChild
                    className="h-11 w-full rounded-full bg-violet-600 font-semibold text-white hover:bg-violet-700"
                  >
                    <Link to={destination}>Open dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      className="h-11 w-full rounded-full bg-violet-600 font-semibold text-white hover:bg-violet-700"
                    >
                      <Link to="/auth">Get started</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 w-full rounded-full border-zinc-200 text-zinc-700"
                    >
                      <Link to="/auth">Sign in</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
