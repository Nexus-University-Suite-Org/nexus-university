import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  ChevronRight,
  Bell,
  Lock,
  User,
  BookOpen,
  Palette,
  Eye,
  Heart,
  Award,
  Clock,
  Mail,
  Volume2,
  Database,
  FileText,
  Zap,
  Save,
  RotateCcw,
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Code2,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { postBackend } from "@/lib/backendApi";
import { useToast } from "@/hooks/use-toast";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

export default function LecturerSettings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [officeHours, setOfficeHours] = useState("");
  const [officePhone, setOfficePhone] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Appearance preferences state
  const [colorTheme, setColorTheme] = useState("Auto");
  const [dashboardLayout, setDashboardLayout] = useState("Compact");
  const [fontSize, setFontSize] = useState("Medium");
  const [language, setLanguage] = useState("English");
  const [showSidebar, setShowSidebar] = useState(true);
  const [animateTransitions, setAnimateTransitions] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [showTooltips, setShowTooltips] = useState(true);

  // Teaching preferences state
  const [classDuration, setClassDuration] = useState("120");
  const [teachingMode, setTeachingMode] = useState("hybrid");
  const [maxStudents, setMaxStudents] = useState("45");
  const [gradingScale, setGradingScale] = useState("Numerical (0-100)");
  const [attendanceTracking, setAttendanceTracking] = useState(true);
  const [lateSubmissions, setLateSubmissions] = useState(false);
  const [assignmentRubrics, setAssignmentRubrics] = useState(true);
  const [peerReview, setPeerReview] = useState(false);

  // Notification preferences state
  const [emailNewSubmissions, setEmailNewSubmissions] = useState(true);
  const [emailGradeRequests, setEmailGradeRequests] = useState(true);
  const [emailDeadlines, setEmailDeadlines] = useState(true);
  const [emailMessages, setEmailMessages] = useState(true);
  const [emailAnnouncements, setEmailAnnouncements] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [digestEmail, setDigestEmail] = useState(false);

  // Grading preferences state
  const [defaultGradingScale, setDefaultGradingScale] =
    useState("Numerical (0-100)");
  const [latePenalty, setLatePenalty] = useState("5");
  const [minPassingGrade, setMinPassingGrade] = useState("40");
  const [roundingMethod, setRoundingMethod] = useState("Round Down");
  const [showFeedback, setShowFeedback] = useState(true);
  const [allowDisputes, setAllowDisputes] = useState(true);
  const [publishByDate, setPublishByDate] = useState(false);
  const [showClassAverage, setShowClassAverage] = useState(true);

  // Privacy preferences state
  const [profileVisible, setProfileVisible] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  // Load profile data on mount
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setDepartment(profile.department || "");
      setSpecialization((profile as any).specialization || "");
      setOfficeLocation((profile as any).office_location || "");
      setOfficeHours((profile as any).office_hours || "");
      setOfficePhone((profile as any).office_phone || "");
      setPhoneNumber((profile as any).phone_number || "");
      setBio(profile.bio || "");

      // Load appearance preferences
      setColorTheme((profile as any).color_theme || "Auto");
      setDashboardLayout((profile as any).dashboard_layout || "Compact");
      setFontSize((profile as any).font_size || "Medium");
      setLanguage((profile as any).language || "English");
      setShowSidebar((profile as any).show_sidebar !== false);
      setAnimateTransitions((profile as any).animate_transitions !== false);
      setCompactMode((profile as any).compact_mode || false);
      setShowTooltips((profile as any).show_tooltips !== false);

      // Load teaching preferences
      setClassDuration((profile as any).class_duration || "120");
      setTeachingMode((profile as any).teaching_mode || "hybrid");
      setMaxStudents((profile as any).max_students || "45");
      setGradingScale((profile as any).grading_scale || "Numerical (0-100)");
      setAttendanceTracking((profile as any).attendance_tracking !== false);
      setLateSubmissions((profile as any).late_submissions || false);
      setAssignmentRubrics((profile as any).assignment_rubrics !== false);
      setPeerReview((profile as any).peer_review || false);

      // Load notification preferences
      setEmailNewSubmissions((profile as any).email_new_submissions !== false);
      setEmailGradeRequests((profile as any).email_grade_requests !== false);
      setEmailDeadlines((profile as any).email_deadlines !== false);
      setEmailMessages((profile as any).email_messages !== false);
      setEmailAnnouncements((profile as any).email_announcements || false);
      setPushNotifications((profile as any).push_notifications !== false);
      setInAppNotifications((profile as any).in_app_notifications !== false);
      setDigestEmail((profile as any).digest_email || false);

      // Load grading preferences
      setDefaultGradingScale(
        (profile as any).default_grading_scale || "Numerical (0-100)",
      );
      setLatePenalty((profile as any).late_penalty || "5");
      setMinPassingGrade((profile as any).min_passing_grade || "40");
      setRoundingMethod((profile as any).rounding_method || "Round Down");
      setShowFeedback((profile as any).show_feedback !== false);
      setAllowDisputes((profile as any).allow_disputes !== false);
      setPublishByDate((profile as any).publish_by_date || false);
      setShowClassAverage((profile as any).show_class_average !== false);

      // Load privacy preferences
      setProfileVisible((profile as any).profile_visible !== false);
      setShowEmail((profile as any).show_email !== false);
      setTwoFactorAuth((profile as any).two_factor_auth || false);
      setLoginAlerts((profile as any).login_alerts !== false);
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [profile, user]);

  const settingsTabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "teaching", label: "Teaching", icon: BookOpen },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "grading", label: "Grading", icon: Award },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "privacy", label: "Privacy & Security", icon: Lock },
  ];

  const handleSave = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    setSavingProfile(true);

    try {
      await postBackend(
        "/api/profiles/by-user/" + user.uid + "/",
        {
          full_name: fullName,
          department: department,
          specialization: specialization,
          office_location: officeLocation,
          office_hours: officeHours,
          office_phone: officePhone,
          phone_number: phoneNumber,
          bio: bio,
          color_theme: colorTheme,
          dashboard_layout: dashboardLayout,
          font_size: fontSize,
          language: language,
          show_sidebar: showSidebar,
          animate_transitions: animateTransitions,
          compact_mode: compactMode,
          show_tooltips: showTooltips,
          class_duration: classDuration,
          teaching_mode: teachingMode,
          max_students: maxStudents,
          grading_scale: gradingScale,
          attendance_tracking: attendanceTracking,
          late_submissions: lateSubmissions,
          assignment_rubrics: assignmentRubrics,
          peer_review: peerReview,
          email_new_submissions: emailNewSubmissions,
          email_grade_requests: emailGradeRequests,
          email_deadlines: emailDeadlines,
          email_messages: emailMessages,
          email_announcements: emailAnnouncements,
          push_notifications: pushNotifications,
          in_app_notifications: inAppNotifications,
          digest_email: digestEmail,
          default_grading_scale: defaultGradingScale,
          late_penalty: latePenalty,
          min_passing_grade: minPassingGrade,
          rounding_method: roundingMethod,
          show_feedback: showFeedback,
          allow_disputes: allowDisputes,
          publish_by_date: publishByDate,
          show_class_average: showClassAverage,
          profile_visible: profileVisible,
          show_email: showEmail,
          two_factor_auth: twoFactorAuth,
          login_alerts: loginAlerts,
        },
        true,
      );

      setSaved(true);
      toast({
        title: "Success",
        description: "Settings updated successfully!",
      });

      // Clear saved status after some time
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error("Error saving profile", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handlePasswordUpdate = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation don't match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPassword(true);

    try {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28 md:pb-8">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-primary/15 to-secondary/10 blur-3xl rounded-full opacity-60" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-gradient-to-bl from-secondary/10 via-primary/5 to-transparent blur-3xl rounded-full opacity-40" />
      </div>



      <main className="container py-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <SettingsIcon className="h-4 w-4" />
              <span>Settings</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-semibold">
                {settingsTabs.find((t) => t.id === activeTab)?.label}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Settings & Preferences
            </h1>
            <p className="text-muted-foreground">
              Customize your teaching experience and manage your account
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {/* Sidebar Navigation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/10 backdrop-blur-lg sticky top-20">
                <CardHeader className="pb-3 border-b border-orange-500/20">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    Sections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {settingsTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                          isActive
                            ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-600 border border-orange-500/40 shadow-lg"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{tab.label}</span>
                        {isActive && (
                          <ChevronRight className="h-4 w-4 ml-auto text-orange-500" />
                        )}
                      </motion.button>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3 space-y-6"
            >
              {/* Profile Settings */}
              {activeTab === "profile" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-orange-500" />
                        Profile Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          disabled
                          placeholder="your.email@university.edu"
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all opacity-60 cursor-not-allowed"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Department
                        </label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Your department"
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Specialization
                        </label>
                        <input
                          type="text"
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                          placeholder="Your specialization"
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-orange-500" />
                        Professional Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={4}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Office Location
                        </label>
                        <input
                          type="text"
                          value={officeLocation}
                          onChange={(e) => setOfficeLocation(e.target.value)}
                          placeholder="Building A, Room 204"
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={5}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Office Hours
                        </label>
                        <input
                          type="text"
                          value={officeHours}
                          onChange={(e) => setOfficeHours(e.target.value)}
                          placeholder="Mon-Fri, 2:00-4:00 PM"
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={6}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Office Phone
                        </label>
                        <input
                          type="tel"
                          value={officePhone}
                          onChange={(e) => setOfficePhone(e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={7}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+256 700 000 000"
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={8}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Bio
                        </label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                          placeholder="Dedicated educator with 15+ years of experience"
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none"
                        />
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Teaching Settings */}
              {activeTab === "teaching" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-500" />
                        Teaching Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Default Class Duration (minutes)",
                          value: classDuration,
                          setter: setClassDuration,
                          type: "text",
                        },
                        {
                          label: "Preferred Teaching Mode",
                          value: teachingMode,
                          setter: setTeachingMode,
                          type: "select",
                          options: ["In-person", "Online", "Hybrid"],
                        },
                        {
                          label: "Max Students per Class",
                          value: maxStudents,
                          setter: setMaxStudents,
                          type: "text",
                        },
                        {
                          label: "Grading Scale",
                          value: gradingScale,
                          setter: setGradingScale,
                          type: "select",
                          options: [
                            "Numerical (0-100)",
                            "Letter Grades (A-F)",
                            "Percentage",
                          ],
                        },
                      ].map((field, idx) => (
                        <motion.div
                          key={field.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx}
                          className="space-y-2"
                        >
                          <label className="text-sm font-semibold text-foreground">
                            {field.label}
                          </label>
                          {field.type === "select" ? (
                            <select
                              value={field.value}
                              onChange={(e) => field.setter(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            >
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => field.setter(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                          )}
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-orange-500" />
                        Class Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Enable Attendance Tracking",
                          checked: attendanceTracking,
                          setter: setAttendanceTracking,
                        },
                        {
                          label: "Allow Late Submissions",
                          checked: lateSubmissions,
                          setter: setLateSubmissions,
                        },
                        {
                          label: "Require Assignment Rubrics",
                          checked: assignmentRubrics,
                          setter: setAssignmentRubrics,
                        },
                        {
                          label: "Enable Peer Review",
                          checked: peerReview,
                          setter: setPeerReview,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx + 4}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-orange-500/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50 cursor-pointer"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Notification Settings */}
              {activeTab === "notifications" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-orange-500" />
                        Email Notifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "New Student Submissions",
                          checked: emailNewSubmissions,
                          setter: setEmailNewSubmissions,
                        },
                        {
                          label: "Grade Requests",
                          checked: emailGradeRequests,
                          setter: setEmailGradeRequests,
                        },
                        {
                          label: "Assignment Deadlines",
                          checked: emailDeadlines,
                          setter: setEmailDeadlines,
                        },
                        {
                          label: "Student Messages",
                          checked: emailMessages,
                          setter: setEmailMessages,
                        },
                        {
                          label: "Class Announcements",
                          checked: emailAnnouncements,
                          setter: setEmailAnnouncements,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-orange-500/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <Volume2 className="h-5 w-5 text-orange-500" />
                        Other Notifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Push Notifications on Mobile",
                          checked: pushNotifications,
                          setter: setPushNotifications,
                        },
                        {
                          label: "In-App Notifications",
                          checked: inAppNotifications,
                          setter: setInAppNotifications,
                        },
                        {
                          label: "Digest Email (Weekly)",
                          checked: digestEmail,
                          setter: setDigestEmail,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx + 5}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-orange-500/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Grading Settings */}
              {activeTab === "grading" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-orange-500" />
                        Grading System
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Default Grading Scale",
                          value: defaultGradingScale,
                          setter: setDefaultGradingScale,
                          type: "select",
                          options: [
                            "Numerical (0-100)",
                            "Letter Grades (A-F)",
                            "Percentage",
                          ],
                        },
                        {
                          label: "Late Submission Penalty (%)",
                          value: latePenalty,
                          setter: setLatePenalty,
                          type: "text",
                        },
                        {
                          label: "Minimum Passing Grade",
                          value: minPassingGrade,
                          setter: setMinPassingGrade,
                          type: "text",
                        },
                        {
                          label: "Grade Rounding Method",
                          value: roundingMethod,
                          setter: setRoundingMethod,
                          type: "select",
                          options: ["Round Up", "Round Down", "Round Nearest"],
                        },
                      ].map((field, idx) => (
                        <motion.div
                          key={field.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx}
                          className="space-y-2"
                        >
                          <label className="text-sm font-semibold text-foreground">
                            {field.label}
                          </label>
                          {field.type === "select" ? (
                            <select
                              value={field.value}
                              onChange={(e) => field.setter(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                            >
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => field.setter(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                            />
                          )}
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-orange-500" />
                        Grade Display
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Show Detailed Feedback to Students",
                          checked: showFeedback,
                          setter: setShowFeedback,
                        },
                        {
                          label: "Allow Grade Disputes",
                          checked: allowDisputes,
                          setter: setAllowDisputes,
                        },
                        {
                          label: "Publish Grades by Date",
                          checked: publishByDate,
                          setter: setPublishByDate,
                        },
                        {
                          label: "Show Class Average",
                          checked: showClassAverage,
                          setter: setShowClassAverage,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx + 4}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-orange-500/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Appearance Settings */}
              {activeTab === "appearance" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-orange-500" />
                        Display Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Color Theme
                        </label>
                        <select
                          value={colorTheme}
                          onChange={(e) => setColorTheme(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        >
                          <option>Auto</option>
                          <option>Light</option>
                          <option>Dark</option>
                        </select>
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Dashboard Layout
                        </label>
                        <select
                          value={dashboardLayout}
                          onChange={(e) => setDashboardLayout(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        >
                          <option>Compact</option>
                          <option>Comfortable</option>
                          <option>Spacious</option>
                        </select>
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Font Size
                        </label>
                        <select
                          value={fontSize}
                          onChange={(e) => setFontSize(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        >
                          <option>Small</option>
                          <option>Medium</option>
                          <option>Large</option>
                        </select>
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        >
                          <option>English</option>
                          <option>Spanish</option>
                          <option>French</option>
                          <option>German</option>
                        </select>
                      </motion.div>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-orange-500" />
                        Interface Options
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.label
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={4}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={showSidebar}
                          onChange={(e) => setShowSidebar(e.target.checked)}
                          className="w-5 h-5 rounded border-orange-500/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                        />
                        <span className="font-medium text-foreground">
                          Show Sidebar on Home
                        </span>
                      </motion.label>

                      <motion.label
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={5}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={animateTransitions}
                          onChange={(e) =>
                            setAnimateTransitions(e.target.checked)
                          }
                          className="w-5 h-5 rounded border-orange-500/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                        />
                        <span className="font-medium text-foreground">
                          Animate Transitions
                        </span>
                      </motion.label>

                      <motion.label
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={6}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={compactMode}
                          onChange={(e) => setCompactMode(e.target.checked)}
                          className="w-5 h-5 rounded border-orange-500/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                        />
                        <span className="font-medium text-foreground">
                          Compact Mode
                        </span>
                      </motion.label>

                      <motion.label
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={7}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={showTooltips}
                          onChange={(e) => setShowTooltips(e.target.checked)}
                          className="w-5 h-5 rounded border-orange-500/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                        />
                        <span className="font-medium text-foreground">
                          Show Helper Tooltips
                        </span>
                      </motion.label>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Privacy & Security */}
              {activeTab === "privacy" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-orange-500" />
                        Password & Security
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Current Password
                        </label>
                        <input
                          type="password"
                          placeholder="Enter your current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          New Password
                        </label>
                        <input
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-orange-500/20 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                        />
                      </motion.div>
                      <motion.button
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        onClick={handlePasswordUpdate}
                        disabled={updatingPassword}
                        className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingPassword ? "Updating..." : "Update Password"}
                      </motion.button>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-500/20 bg-gradient-to-br from-card/90 to-orange-900/5 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20">
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-orange-500" />
                        Account Privacy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Make Profile Visible to Students",
                          checked: profileVisible,
                          setter: setProfileVisible,
                        },
                        {
                          label: "Show Email to Enrolled Students",
                          checked: showEmail,
                          setter: setShowEmail,
                        },
                        {
                          label: "Enable Two-Factor Authentication",
                          checked: twoFactorAuth,
                          setter: setTwoFactorAuth,
                        },
                        {
                          label: "Login Alerts",
                          checked: loginAlerts,
                          setter: setLoginAlerts,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx + 4}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-orange-500/50 text-orange-500 focus:ring-2 focus:ring-orange-500/50"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-orange-500/40 bg-gradient-to-br from-card/90 to-orange-900/10 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-orange-500/15 to-amber-500/15 border-b border-orange-500/30">
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <AlertCircle className="h-5 w-5" />
                        Danger Zone
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        These actions are permanent and cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount}
                      >
                        {deletingAccount ? "Deleting..." : "Delete Account"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Save Button */}
              <div className="sticky bottom-20 md:bottom-0 flex gap-3">
                <Button
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg hover:shadow-xl transition-all gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={savingProfile}
                >
                  <Save className="h-4 w-4" />
                  {savingProfile ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  className="border-border/60 hover:bg-muted/50 gap-2"
                  onClick={() => {
                    if (profile) {
                      // Reset profile fields
                      setFullName(profile.full_name || "");
                      setDepartment(profile.department || "");
                      setSpecialization((profile as any).specialization || "");
                      setOfficeLocation((profile as any).office_location || "");
                      setOfficeHours((profile as any).office_hours || "");
                      setOfficePhone((profile as any).office_phone || "");
                      setPhoneNumber((profile as any).phone_number || "");
                      setBio(profile.bio || "");

                      // Reset appearance preferences
                      setColorTheme((profile as any).color_theme || "Auto");
                      setDashboardLayout(
                        (profile as any).dashboard_layout || "Compact",
                      );
                      setFontSize((profile as any).font_size || "Medium");
                      setLanguage((profile as any).language || "English");
                      setShowSidebar((profile as any).show_sidebar !== false);
                      setAnimateTransitions(
                        (profile as any).animate_transitions !== false,
                      );
                      setCompactMode((profile as any).compact_mode || false);
                      setShowTooltips((profile as any).show_tooltips !== false);

                      // Reset teaching preferences
                      setClassDuration(
                        (profile as any).class_duration || "120",
                      );
                      setTeachingMode(
                        (profile as any).teaching_mode || "hybrid",
                      );
                      setMaxStudents((profile as any).max_students || "45");
                      setGradingScale(
                        (profile as any).grading_scale || "Numerical (0-100)",
                      );
                      setAttendanceTracking(
                        (profile as any).attendance_tracking !== false,
                      );
                      setLateSubmissions(
                        (profile as any).late_submissions || false,
                      );
                      setAssignmentRubrics(
                        (profile as any).assignment_rubrics !== false,
                      );
                      setPeerReview((profile as any).peer_review || false);

                      // Reset notification preferences
                      setEmailNewSubmissions(
                        (profile as any).email_new_submissions !== false,
                      );
                      setEmailGradeRequests(
                        (profile as any).email_grade_requests !== false,
                      );
                      setEmailDeadlines(
                        (profile as any).email_deadlines !== false,
                      );
                      setEmailMessages(
                        (profile as any).email_messages !== false,
                      );
                      setEmailAnnouncements(
                        (profile as any).email_announcements || false,
                      );
                      setPushNotifications(
                        (profile as any).push_notifications !== false,
                      );
                      setInAppNotifications(
                        (profile as any).in_app_notifications !== false,
                      );
                      setDigestEmail((profile as any).digest_email || false);

                      // Reset grading preferences
                      setDefaultGradingScale(
                        (profile as any).default_grading_scale ||
                          "Numerical (0-100)",
                      );
                      setLatePenalty((profile as any).late_penalty || "5");
                      setMinPassingGrade(
                        (profile as any).min_passing_grade || "40",
                      );
                      setRoundingMethod(
                        (profile as any).rounding_method || "Round Down",
                      );
                      setShowFeedback((profile as any).show_feedback !== false);
                      setAllowDisputes(
                        (profile as any).allow_disputes !== false,
                      );
                      setPublishByDate(
                        (profile as any).publish_by_date || false,
                      );
                      setShowClassAverage(
                        (profile as any).show_class_average !== false,
                      );

                      // Reset privacy preferences
                      setProfileVisible(
                        (profile as any).profile_visible !== false,
                      );
                      setShowEmail((profile as any).show_email !== false);
                      setTwoFactorAuth(
                        (profile as any).two_factor_auth || false,
                      );
                      setLoginAlerts((profile as any).login_alerts !== false);
                    }
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>

              {/* Success Message */}
              {saved && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="fixed bottom-32 md:bottom-8 right-6 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Settings saved successfully!
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </main>

      <LecturerBottomNav />
    </div>
  );
}
