import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  BookOpen,
  Award,
  Users,
  Sparkles,
  CheckCircle2,
  IdCard,
  Hash,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

type AuthStep =
  | "signin"
  | "signup-details"
  | "lecturer-personal-details"
  | "registrar-personal-details"
  | "signup-otp"
  | "signup-password";

const AUTH_FORM_STORAGE_KEY = "nexus-auth-form-data";
const AUTH_PASSWORD_STORAGE_KEY = "nexus-auth-password-data";

type AuthFormData = {
  identifier: string;
  email: string;
  actualEmail: string;
  password: string;
  registrationNumber: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  department: string;
  college: string;
  program: string;
};

const DEFAULT_FORM_DATA: AuthFormData = {
  identifier: "",
  email: "",
  actualEmail: "",
  password: "",
  registrationNumber: "",
  studentNumber: "",
  firstName: "",
  lastName: "",
  department: "",
  college: "",
  program: "",
};

function loadStoredFormData(): AuthFormData {
  if (typeof window === "undefined") {
    return DEFAULT_FORM_DATA;
  }

  try {
    const stored = window.localStorage.getItem(AUTH_FORM_STORAGE_KEY);
    const password =
      window.sessionStorage.getItem(AUTH_PASSWORD_STORAGE_KEY) || "";

    if (!stored) {
      return { ...DEFAULT_FORM_DATA, password };
    }

    const parsed = JSON.parse(stored) as Partial<AuthFormData>;

    return {
      ...DEFAULT_FORM_DATA,
      ...parsed,
      password,
    };
  } catch {
    return DEFAULT_FORM_DATA;
  }
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup";
  const [step, setStep] = useState<AuthStep>(
    initialMode ? "signup-details" : "signin",
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", ""]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [isLecturerSignup, setIsLecturerSignup] = useState(false); // Auto-detect based on email
  const [isRegistrarSignup, setIsRegistrarSignup] = useState(false); // Auto-detect based on email
  const [colleges, setColleges] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<string[]>([]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [formData, setFormData] = useState<AuthFormData>(() =>
    loadStoredFormData(),
  );

  const {
    signIn,
    signUp,
    signInWithStudentId,
    validateStudent,
    generateOTP,
    verifyOTP,
  } = useAuth();
  const { settings } = useSiteSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isSignUp = step !== "signin";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const { password, ...rest } = formData;
    window.localStorage.setItem(AUTH_FORM_STORAGE_KEY, JSON.stringify(rest));

    if (password) {
      window.sessionStorage.setItem(AUTH_PASSWORD_STORAGE_KEY, password);
    } else {
      window.sessionStorage.removeItem(AUTH_PASSWORD_STORAGE_KEY);
    }
  }, [formData]);

  useEffect(() => {
    if (initialMode) {
      setStep("signup-details");
    }
  }, [initialMode]);

  // Fetch unique colleges and initial courses from platform API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Token ${accessToken}`;
        }
        const res = await fetch("/api/courses/", { headers });
        const coursesData = await res.json();
        const collegeList = new Set<string>();
        const courses: any[] = [];
        coursesData.forEach((course: any) => {
          courses.push(course);
          if (course.college) {
            collegeList.add(course.college);
          }
        });
        setAllCourses(courses);
        setColleges(Array.from(collegeList).sort());
      } catch (error) {
        console.error("Error fetching colleges/courses:", error);
      }
    };

    fetchData();
  }, []);

  // Update filtered programs when college changes
  useEffect(() => {
    if (formData.college) {
      const programList = new Set<string>();
      allCourses.forEach((course) => {
        if (course.college === formData.college && course.name) {
          programList.add(course.name);
        }
      });
      setFilteredPrograms(Array.from(programList).sort());
    } else {
      setFilteredPrograms([]);
    }
  }, [formData.college, allCourses]);

  // Auto-verify OTP when all 4 digits are entered
  useEffect(() => {
    if (
      step === "signup-otp" &&
      otpValues.every((v) => v !== "") &&
      !loading &&
      !otpVerified
    ) {
      const enteredOtp = otpValues.join("");
      verifyOTPAuto(enteredOtp);
    }
  }, [otpValues, step, loading, otpVerified]);

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleLecturerDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate OTP for lecturer using their actual email
      const { otp, error: otpError } = await generateOTP(
        formData.actualEmail,
        null,
      );
      if (otpError) throw otpError;

      setStudentRecord({
        id: null,
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.actualEmail,
        department: formData.department,
      });

      if (import.meta.env.DEV && otp) {
        toast({
          title: "OTP Sent (Development)",
          description: `Your verification code is: ${otp}`,
          duration: 10000,
        });
      } else {
        toast({
          title: "OTP Sent",
          description:
            "A verification code has been sent to your email address.",
        });
      }

      setStep("signup-otp");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate OTP for registrar using their actual email
      const { otp, error: otpError } = await generateOTP(
        formData.actualEmail,
        null,
      );
      if (otpError) throw otpError;

      setStudentRecord({
        id: null,
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.actualEmail,
        department: formData.department,
      });

      if (import.meta.env.DEV && otp) {
        toast({
          title: "OTP Sent (Development)",
          description: `Your verification code is: ${otp}`,
          duration: 10000,
        });
      } else {
        toast({
          title: "OTP Sent",
          description:
            "A verification code has been sent to your email address.",
        });
      }

      setStep("signup-otp");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, profile } = await signInWithStudentId(
        formData.identifier,
        formData.password,
      );
      if (error) throw error;

      const userRole = profile?.role || "student";
      toast({ title: "Welcome back!" });
      navigate(userRole === "lecturer" ? "/lecturer" : "/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Auto-detect if email is lecturer format
      const lecturerEmailPattern = /^[a-zA-Z0-9._%+-]+@lecturer\.com$/i;
      const isLecturer = lecturerEmailPattern.test(formData.email);

      // Auto-detect if email is registrar format
      const registrarEmailPattern = /^[a-zA-Z0-9._%+-]+@registrar\.com$/i;
      const isRegistrar = registrarEmailPattern.test(formData.email);

      if (isLecturer) {
        // Set lecturer flag and move to personal details step
        setIsLecturerSignup(true);
        setStep("lecturer-personal-details");
        setLoading(false);
        return;
      }

      // Registrar detection disabled - they use normal signup

      // For students: validate against student records
      const { data, error } = await validateStudent(
        formData.registrationNumber,
        formData.studentNumber,
        formData.email,
      );
      if (error) throw error;

      setStudentRecord(data);

      // Generate OTP. In production we do not expose OTP values in the UI.
      const { otp, error: otpError } = await generateOTP(
        formData.email,
        data!.id,
      );
      if (otpError) throw otpError;

      if (import.meta.env.DEV) {
        toast({
          title: "OTP Sent (Development)",
          description: `Your verification code is: ${otp}`,
          duration: 10000,
        });
      } else {
        toast({
          title: "OTP Sent",
          description:
            "A verification code has been generated. Please check your registered delivery channel.",
        });
      }

      setStep("signup-otp");
    } catch (error: any) {
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);

    try {
      const emailToUse =
        isLecturerSignup || isRegistrarSignup
          ? formData.actualEmail
          : formData.email;

      const { otp, error } = await generateOTP(
        emailToUse,
        studentRecord?.id ?? null,
      );
      if (error) throw error;

      if (import.meta.env.DEV && otp) {
        toast({
          title: "OTP Resent (Development)",
          description: `Your verification code is: ${otp}`,
          duration: 10000,
        });
      } else {
        toast({
          title: "OTP Resent",
          description: "A fresh verification code has been sent.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Could Not Resend OTP",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const enteredOtp = otpValues.join("");

    try {
      // Use actualEmail for lecturers/registrars, regular email for students
      const emailToVerify =
        isLecturerSignup || isRegistrarSignup
          ? formData.actualEmail
          : formData.email;
      const { valid, error } = await verifyOTP(emailToVerify, enteredOtp);
      if (error) throw error;

      if (valid) {
        // Show success animation
        setOtpVerified(true);

        // Wait for animation to complete before moving to next step
        setTimeout(() => {
          toast({
            title: "Email Verified!",
            description: "Please set your password.",
          });
          setStep("signup-password");
          setOtpVerified(false);
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTPAuto = async (enteredOtp: string) => {
    setLoading(true);

    try {
      // Use actualEmail for lecturers/registrars, regular email for students
      const emailToVerify =
        isLecturerSignup || isRegistrarSignup
          ? formData.actualEmail
          : formData.email;
      const { valid, error } = await verifyOTP(emailToVerify, enteredOtp);
      if (error) throw error;

      if (valid) {
        // Show success animation
        setOtpVerified(true);

        // Wait for animation to complete before moving to next step
        setTimeout(() => {
          toast({
            title: "Email Verified!",
            description: "Please set your password.",
          });
          setStep("signup-password");
          setOtpVerified(false);
        }, 2000);
      }
    } catch (error: any) {
      // Don't show error toast for auto-verification, just clear the last digit
      setOtpValues((prev) => {
        const newOtp = [...prev];
        newOtp[3] = "";
        return newOtp;
      });
      // Refocus on last input
      otpRefs.current[3]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use actualEmail for lecturers/registrars, regular email for students
      const emailToUse =
        isLecturerSignup || isRegistrarSignup
          ? formData.actualEmail
          : formData.email;

      // Check if email is registrar format
      const registrarEmailPattern = /^[a-zA-Z0-9._%+-]+@registrar\.com$/i;
      const isRegistrarEmail = registrarEmailPattern.test(emailToUse);

      const { error } = await signUp(
        emailToUse,
        formData.password,
        studentRecord?.full_name ||
          (isLecturerSignup
            ? "Lecturer"
            : isRegistrarEmail
              ? "Registrar"
              : "Student"),
        isLecturerSignup || isRegistrarEmail
          ? undefined
          : formData.registrationNumber,
        isLecturerSignup || isRegistrarEmail
          ? undefined
          : formData.studentNumber,
        isLecturerSignup
          ? "lecturer"
          : isRegistrarEmail
            ? "registrar"
            : "student",
        isLecturerSignup || isRegistrarSignup ? formData.department : undefined,
        formData.college || undefined,
        formData.program || undefined,
      );
      if (error) {
        // If user already exists, provide helpful guidance
        if (
          error.message.includes("already exists") ||
          error.message.includes("already registered")
        ) {
          toast({
            title: "Account Already Exists",
            description:
              error.message ||
              "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
            duration: 6000,
          });
          // Optionally redirect to sign in after a delay
          setTimeout(() => {
            setStep("signin");
            setFormData((prev) => ({
              ...prev,
              identifier: formData.email,
              password: "",
            }));
          }, 2000);
          return;
        }
        // If there's a role assignment error, provide helpful message
        if (error.message.includes("Failed to assign role")) {
          toast({
            title: "Account Creation Partial",
            description:
              "Your account was created but there was an issue setting your role. Please contact support.",
            variant: "destructive",
            duration: 6000,
          });
          throw error;
        }
        throw error;
      }

      toast({
        title: "Account Created!",
        description: `Welcome to ${settings.shortName}.`,
      });
      // Redirect to appropriate dashboard based on role
      if (isLecturerSignup) {
        navigate("/lecturer");
      } else if (isRegistrarSignup) {
        navigate("/registrar");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetToSignIn = () => {
    setStep("signin");
    setOtpValues(["", "", "", ""]);
    setStudentRecord(null);
    setIsLecturerSignup(false);
    setIsRegistrarSignup(false);
  };

  const resetToSignUp = () => {
    setStep("signup-details");
    setOtpValues(["", "", "", ""]);
    setStudentRecord(null);
    setIsLecturerSignup(false);
    setIsRegistrarSignup(false);
  };

  const benefits = [
    { icon: BookOpen, text: "Access 2,500+ courses" },
    { icon: Award, text: "Track grades & achievements" },
    { icon: Users, text: "Join live sessions" },
  ];

  const renderStepIndicator = () => {
    if (step === "signin") return null;

    const steps =
      isLecturerSignup || isRegistrarSignup
        ? [
            { key: "signup-details", label: "Email" },
            {
              key: isLecturerSignup
                ? "lecturer-personal-details"
                : "registrar-personal-details",
              label: "Details",
            },
            { key: "signup-otp", label: "Verify" },
            { key: "signup-password", label: "Password" },
          ]
        : [
            { key: "signup-details", label: "Details" },
            { key: "signup-otp", label: "Verify" },
            { key: "signup-password", label: "Password" },
          ];

    const currentIndex = steps.findIndex((s) => s.key === step);

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                i <= currentIndex
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  i < currentIndex ? "bg-secondary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderForm = () => {
    switch (step) {
      case "signin":
        return (
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium">
                Student / Registration Number or Email
              </Label>
              <div className="relative">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="identifier"
                  placeholder="21/U/12345/PS, 2100712345 or email"
                  value={formData.identifier}
                  onChange={(e) =>
                    setFormData({ ...formData, identifier: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-secondary hover:text-secondary/80 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="h-14 pl-12 pr-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl shadow-glow group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        );

      case "signup-details":
        return (
          <form onSubmit={handleValidateStudent} className="space-y-5">
            {!formData.email.endsWith("@lecturer.com") &&
              !formData.email.endsWith("@registrar.com") && (
                <>
                  <div className="space-y-2">
                    <Label
                      htmlFor="registrationNumber"
                      className="text-sm font-medium"
                    >
                      Registration Number
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="registrationNumber"
                        placeholder="21/U/12345/PS"
                        value={formData.registrationNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            registrationNumber: e.target.value,
                          })
                        }
                        className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="studentNumber"
                      className="text-sm font-medium"
                    >
                      Student Number
                    </Label>
                    <div className="relative">
                      <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="studentNumber"
                        placeholder="2100712345"
                        value={formData.studentNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            studentNumber: e.target.value,
                          })
                        }
                        className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

            <div className="space-y-2">
              <Label htmlFor="college" className="text-sm font-medium">
                College
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Select
                  value={formData.college}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, college: value, program: "" })
                  }
                >
                  <SelectTrigger className="h-14 pl-12 pr-4 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors appearance-none focus:outline-none focus:ring-2 focus:ring-secondary/50">
                    <SelectValue placeholder="Select College" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((college) => (
                      <SelectItem key={college} value={college}>
                        {college}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!formData.email.endsWith("@lecturer.com") &&
              !formData.email.endsWith("@registrar.com") && (
                <div className="space-y-2">
                  <Label htmlFor="program" className="text-sm font-medium">
                    Program
                  </Label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Select
                      value={formData.program}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, program: value })
                      }
                      disabled={!formData.college}
                    >
                      <SelectTrigger className="w-full h-14 pl-12 pr-4 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors appearance-none focus:outline-none focus:ring-2 focus:ring-secondary/50">
                        <SelectValue
                          placeholder={
                            formData.college
                              ? "Select Program"
                              : "Select College First"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPrograms.map((program) => (
                          <SelectItem key={program} value={program}>
                            {program}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@university.edu"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
              {formData.email.endsWith("@lecturer.com") && (
                <p className="text-xs text-muted-foreground mt-1 ml-1">
                  Lecturer email detected - you'll be asked for personal details
                  next
                </p>
              )}
              {formData.email.endsWith("@registrar.com") && (
                <p className="text-xs text-muted-foreground mt-1 ml-1">
                  Registrar email detected - you'll be asked for personal
                  details next
                </p>
              )}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/80">
                {formData.email.endsWith("@lecturer.com")
                  ? "Lecturer registration: Enter email in format firstname.lastname@lecturer.com"
                  : formData.email.endsWith("@registrar.com")
                    ? "Registrar registration: Enter email in format firstname.lastname@registrar.com"
                    : "We'll verify you're a registered student by checking your registration and student numbers against our records."}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl shadow-glow group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        );

      case "lecturer-personal-details":
        return (
          <form onSubmit={handleLecturerDetails} className="space-y-5">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">Personal Details</h3>
              <p className="text-muted-foreground text-sm">
                Please provide your information
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="college" className="text-sm font-medium">
                College
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Select
                  value={formData.college}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, college: value })
                  }
                >
                  <SelectTrigger className="h-14 pl-12 pr-4 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors appearance-none focus:outline-none focus:ring-2 focus:ring-secondary/50">
                    <SelectValue placeholder="Select College" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((college) => (
                      <SelectItem key={college} value={college}>
                        {college}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">
                Department
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="department"
                  placeholder="Computer Science"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualEmail" className="text-sm font-medium">
                Your Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="actualEmail"
                  type="email"
                  placeholder="your.email@institution.edu"
                  value={formData.actualEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, actualEmail: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-1">
                We'll send the verification code to this email
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl shadow-glow group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue to Verification
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        );

      case "registrar-personal-details":
        return (
          <form onSubmit={handleRegistrarDetails} className="space-y-5">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">Personal Details</h3>
              <p className="text-muted-foreground text-sm">
                Please provide your information
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="college" className="text-sm font-medium">
                College
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Select
                  value={formData.college}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, college: value, program: "" })
                  }
                >
                  <SelectTrigger className="h-14 pl-12 pr-4 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors appearance-none focus:outline-none focus:ring-2 focus:ring-secondary/50">
                    <SelectValue placeholder="Select College" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((college) => (
                      <SelectItem key={college} value={college}>
                        {college}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">
                College / Department
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="department"
                  placeholder="College of Engineering"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualEmail" className="text-sm font-medium">
                Your Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="actualEmail"
                  type="email"
                  placeholder="your.email@institution.edu"
                  value={formData.actualEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, actualEmail: e.target.value })
                  }
                  className="h-14 pl-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-1">
                We'll send the verification code to this email
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl shadow-glow group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Continue to Verification
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        );

      case "signup-otp":
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center mb-6">
              <AnimatePresence mode="wait">
                {!otpVerified ? (
                  <motion.div
                    key="otp-input"
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                      <KeyRound className="h-8 w-8 text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      Enter Verification Code
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      We've sent a 4-digit code to{" "}
                      <span className="font-medium text-foreground">
                        {isLecturerSignup || isRegistrarSignup
                          ? formData.actualEmail
                          : formData.email}
                      </span>
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="otp-success"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                      duration: 0.5,
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                    }}
                  >
                    <motion.div
                      className="h-20 w-20 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-4"
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 0.6,
                        ease: "easeInOut",
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.2,
                          type: "spring",
                          stiffness: 200,
                          damping: 15,
                        }}
                      >
                        <CheckCircle2 className="h-10 w-10 text-white" />
                      </motion.div>
                    </motion.div>
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-lg font-semibold mb-2 text-green-600"
                    >
                      Verified!
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-muted-foreground text-sm"
                    >
                      Your email has been verified successfully
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!otpVerified && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center gap-3">
                    {otpValues.map((value, index) => (
                      <Input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="h-16 w-16 text-center text-2xl font-bold rounded-xl bg-muted/50 border-border focus:bg-background focus:border-secondary transition-all"
                        disabled={loading}
                      />
                    ))}
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-secondary font-medium hover:text-secondary/80"
                      disabled={loading}
                    >
                      Resend
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        );

      case "signup-password":
        return (
          <form onSubmit={handleCreateAccount} className="space-y-5">
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Email Verified!</h3>
              <p className="text-muted-foreground text-sm">
                Welcome,{" "}
                <span className="font-medium text-foreground">
                  {studentRecord?.full_name}
                </span>
                . Set your password to complete registration.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Create Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="h-14 pl-12 pr-12 text-base rounded-xl bg-muted/50 border-border focus:bg-background transition-colors"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/80">
                By creating an account, you agree to our Terms of Service and
                Privacy Policy
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl shadow-glow group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Decorative */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden"
      >
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--secondary)/0.3)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_hsl(var(--accent)/0.2)_0%,_transparent_50%)]" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 right-[20%] w-72 h-72 rounded-full bg-secondary/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-20 left-[10%] w-60 h-60 rounded-full bg-accent/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-20 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={`${settings.siteName} logo`}
                  className="h-7 w-7 object-contain"
                />
              ) : (
                <GraduationCap className="h-7 w-7 text-white" />
              )}
            </div>
            <span className="font-display text-2xl font-bold text-white">
              {settings.shortName}
            </span>
          </Link>

          <div className="max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-8">
                <Sparkles className="h-4 w-4 text-secondary" />
                <span>Join 50,000+ students</span>
              </div>

              <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                Your Gateway to
                <span className="block text-secondary">
                  Academic Excellence
                </span>
              </h1>

              <p className="text-lg text-white/70 mb-10">
                Access courses, manage your schedule, track grades, and connect
                with classmates — all in one powerful platform.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <benefit.icon className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-white/90">{benefit.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-primary bg-gradient-to-br from-secondary to-accent"
                  style={{ zIndex: 5 - i }}
                />
              ))}
            </div>
            <div className="text-white/70 text-sm">
              <span className="text-white font-semibold">4.9★</span> from
              10,000+ reviews
            </div>
          </div>
        </div>

        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-32 right-16 hidden xl:block"
        >
          <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-white/80" />
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute bottom-40 right-24 hidden xl:block"
        >
          <div className="h-20 w-20 rounded-2xl bg-secondary/30 backdrop-blur-sm flex items-center justify-center">
            <Award className="h-10 w-10 text-secondary" />
          </div>
        </motion.div>
      </motion.div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={`${settings.siteName} logo`}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
            <span className="font-display text-xl font-bold">
              {settings.shortName}
            </span>
          </Link>

          {/* Back button for multi-step */}
          {step !== "signin" && step !== "signup-details" && (
            <button
              onClick={() => {
                if (step === "signup-otp") {
                  setStep("signup-details");
                } else if (step === "signup-password") {
                  setStep("signup-otp");
                } else if (
                  step === "lecturer-personal-details" ||
                  step === "registrar-personal-details"
                ) {
                  setStep("signup-details");
                }
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Form Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              {step === "signin"
                ? "Welcome back"
                : step === "signup-details"
                  ? "Create an account"
                  : step === "signup-otp"
                    ? "Verify your email"
                    : "Set your password"}
            </h1>
            <p className="text-muted-foreground text-lg">
              {step === "signin"
                ? "Sign in with your student credentials"
                : step === "signup-details"
                  ? "Verify your student identity to get started"
                  : step === "signup-otp"
                    ? "Enter the code sent to your email"
                    : "Almost there! Create a secure password"}
            </p>
          </div>

          {/* Render Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderForm()}
            </motion.div>
          </AnimatePresence>

          {/* Toggle */}
          <p className="text-center text-muted-foreground mt-8">
            {step === "signin"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={() =>
                step === "signin" ? resetToSignUp() : resetToSignIn()
              }
              className="text-secondary font-semibold hover:text-secondary/80 transition-colors"
            >
              {step === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
