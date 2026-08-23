import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  ChevronRight,
  Calendar,
  Clock,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { StudentBottomNav } from "@/components/layout/StudentBottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

// Settings Tab Components
import { GeneratePRNTab } from "@/components/settings/GeneratePRNTab";
import { EnrollmentRegistrationTab } from "@/components/settings/EnrollmentRegistrationTab";
import { PaymentsTab } from "@/components/settings/PaymentsTab";
import { MyProgrammeTab } from "@/components/settings/MyProgrammeTab";
import { ServicesTab } from "@/components/settings/ServicesTab";
import { BioDataTab } from "@/components/settings/BioDataTab";
import { AcademicCalendarTab } from "@/components/settings/AcademicCalendarTab";
import { EvaluationSurveysTab } from "@/components/settings/EvaluationSurveysTab";
import { SiteBrandingTab } from "@/components/settings/SiteBrandingTab";

const baseSettingsTabs = [
  { id: "prn", label: "Generate PRN", shortLabel: "PRN" },
  {
    id: "enrollment",
    label: "Enrollment & Registration",
    shortLabel: "Enrollment",
  },
  { id: "payments", label: "Payments", shortLabel: "Payments" },
  { id: "programme", label: "My Programme", shortLabel: "Programme" },
  { id: "services", label: "Services", shortLabel: "Services" },
  { id: "biodata", label: "Bio Data", shortLabel: "Bio Data" },
  { id: "calendar", label: "Academic Calendar", shortLabel: "Calendar" },
  { id: "surveys", label: "Evaluation Surveys", shortLabel: "Surveys" },
];

export default function Settings() {
  const { user, profile } = useAuth();
  const [userSettings, setUserSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const canManageBranding =
    profile?.role === "admin" || profile?.role === "registrar";
  const settingsTabs = canManageBranding
    ? [
        ...baseSettingsTabs,
        { id: "branding", label: "Site Branding", shortLabel: "Branding" },
      ]
    : baseSettingsTabs;
  const [activeTab, setActiveTab] = useState("prn");
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  // Fetch user settings from the API
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSettings = async () => {
      try {
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

        const resp = await fetch(
          `${API_BASE_URL}/api/students/${user.uid}/settings/`
        );
        if (!resp.ok) throw new Error("Failed to fetch settings");

        const data = await resp.json();
        setUserSettings(data);
      } catch (error) {
        console.error("Error fetching user settings:", error);
        // Continue without settings - they're optional
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [user?.uid]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobile) {
      setSheetOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <StudentHeader />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <SettingsIcon className="h-4 w-4" />
              <span>Settings</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">
                {settingsTabs.find((t) => t.id === activeTab)?.label}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Student Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your academic profile, payments, and services
            </p>
          </div>

          {/* Teaching Timetable Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Link to="/timetable">
              <Card className="overflow-hidden border-2 border-secondary/20 hover:border-secondary/40 transition-all hover:shadow-lg cursor-pointer group">
                <div className="relative bg-gradient-to-br from-secondary via-purple-600 to-pink-600 p-4 md:p-6 text-white">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 md:h-6 w-5 md:w-6 flex-shrink-0" />
                        <h2 className="text-xl md:text-2xl font-bold">
                          Teaching Timetable
                        </h2>
                      </div>
                      <p className="text-white/90 mb-3 md:mb-4 text-sm md:text-base">
                        View your weekly class schedule with all your enrolled
                        courses
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>Weekly Schedule</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>6 Courses</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      className="bg-white text-secondary hover:bg-white/90 gap-2 group-hover:translate-x-1 transition-transform w-full md:w-auto flex-shrink-0"
                    >
                      View Timetable
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="space-y-6"
          >
            {/* Desktop Tab Navigation */}
            <div className="hidden md:block overflow-x-auto -mx-4 px-4 pb-2">
              <TabsList className="inline-flex h-auto p-1 gap-1 bg-muted/50 backdrop-blur-sm">
                {settingsTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="px-4 py-2.5 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                  >
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.shortLabel}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Mobile Tab Navigation - Sheet/Drawer */}
            <div className="md:hidden mb-6">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-between gap-2"
                  >
                    <Menu className="h-4 w-4" />
                    <span className="flex-1 text-left">
                      {settingsTabs.find((t) => t.id === activeTab)?.shortLabel}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-full sm:w-96 overflow-y-auto"
                >
                  <SheetHeader className="mb-6">
                    <SheetTitle>Select a Tab</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-2">
                    {settingsTabs.map((tab) => (
                      <motion.button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left font-medium ${
                          activeTab === tab.id
                            ? "bg-secondary text-secondary-foreground shadow-md"
                            : "hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        <span>{tab.label}</span>
                        {activeTab === tab.id && (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <TabsContent value="prn" className="mt-6">
              <GeneratePRNTab />
            </TabsContent>

            <TabsContent value="enrollment" className="mt-6">
              <EnrollmentRegistrationTab />
            </TabsContent>

            <TabsContent value="payments" className="mt-6">
              <PaymentsTab />
            </TabsContent>

            <TabsContent value="programme" className="mt-6">
              <MyProgrammeTab />
            </TabsContent>

            <TabsContent value="services" className="mt-6">
              <ServicesTab />
            </TabsContent>

            <TabsContent value="biodata" className="mt-6">
              <BioDataTab />
            </TabsContent>

            <TabsContent value="calendar" className="mt-6">
              <AcademicCalendarTab />
            </TabsContent>

            <TabsContent value="surveys" className="mt-6">
              <EvaluationSurveysTab />
            </TabsContent>

            {canManageBranding && (
              <TabsContent value="branding" className="mt-6">
                <SiteBrandingTab canEdit={canManageBranding} />
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </main>

      <StudentBottomNav />
    </div>
  );
}
