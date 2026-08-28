import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const SPRING_API_URL =
  import.meta.env.VITE_SPRING_API_URL || "http://localhost:8082";
const AUTH_TOKEN_STORAGE_KEY = "nexus-auth-token";

interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

type Session = { user: User } | null;

interface Profile {
  course_id?: string | null;
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  student_number: string | null;
  registration_number?: string | null;
  department: string | null;
  college: string | null;
  programme?: string | null;
  phone: string | null;
  phone_number?: string | null;
  bio: string | null;
  role?: "student" | "lecturer" | "admin" | "registrar";
  updated_at?: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (
    identifier: string,
    password: string,
  ) => Promise<{ error: Error | null; user?: User; profile?: Profile | null }>;
  signInWithStudentId: (
    identifier: string,
    password: string,
  ) => Promise<{ error: Error | null; user?: User; profile?: Profile | null }>;
  signOut: () => Promise<void>;
  generateOTP: (
    email: string,
    studentRecordId: string | null,
  ) => Promise<{ otp: string; error: Error | null }>;
  verifyOTP: (
    email: string,
    otp: string,
  ) => Promise<{ valid: boolean; error: Error | null }>;
  resetPassword: (
    identifier: string,
    newPassword: string,
  ) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function saveToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

const AUTH_USER_STORAGE_KEY = "nexus-auth-user";
const AUTH_PROFILE_STORAGE_KEY = "nexus-auth-profile";

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function getStoredProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_PROFILE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function saveSession(user: User, profile: Profile | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  window.localStorage.setItem(
    AUTH_PROFILE_STORAGE_KEY,
    JSON.stringify(profile),
  );
}

function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_PROFILE_STORAGE_KEY);
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.detail || data?.error || "Request failed";
    throw new Error(message);
  }

  return data as T;
}

async function getJson<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.detail || data?.error || "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const storedUser = getStoredUser();
      const storedProfile = getStoredProfile();
      if (storedUser) {
        setUser(storedUser);
        setSession({ user: storedUser });
        setProfile(storedProfile);
      } else {
        clearToken();
        clearSession();
      }

      setLoading(false);
    };

    initialize();
  }, []);

  // Generate a 4-digit OTP
  const generateOTP = async (
    email: string,
    studentRecordId: string | null,
  ): Promise<{ otp: string; error: Error | null }> => {
    try {
      const response = await fetch(`${SPRING_API_URL}/api/v1/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!data.ok) {
        return { otp: "", error: new Error(data.message || "Failed to send OTP") };
      }

      return { otp: "", error: null };
    } catch (error: any) {
      return { otp: "", error: new Error(error.message) };
    }
  };

  // Verify OTP
  const verifyOTP = async (
    email: string,
    otp: string,
  ): Promise<{ valid: boolean; error: Error | null }> => {
    try {
      const response = await fetch(`${SPRING_API_URL}/api/v1/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      if (!data.ok || !data.verified) {
        return {
          valid: false,
          error: new Error("Invalid or expired OTP. Please request a new one."),
        };
      }

      return { valid: true, error: null };
    } catch (error: any) {
      return { valid: false, error: new Error(error.message) };
    }
  };

  interface NapStudentLoginResponse {
    token: string;
    user: {
      id: number | string;
      email: string;
      fullName?: string;
      role?: string;
    };
    profile: {
      applicationId?: number | string;
      prn?: string | null;
      fullName?: string;
      email?: string;
      phoneNumber?: string | null;
      programChoice1?: string | null;
      programChoice2?: string | null;
      programChoice3?: string | null;
      programChoice4?: string | null;
      assignedProgramme?: string | null;
      status?: string | null;
      studyMode?: string | null;
      academicYear?: string | null;
      startDate?: string | null;
    };
  }

  // Sign in with email and password against the Application Portal (NAP)
  const signIn = async (
    identifier: string,
    password: string,
  ): Promise<{
    error: Error | null;
    user?: User;
    profile?: Profile | null;
  }> => {
    try {
      const email = identifier.trim().toLowerCase();
      const response = await postJson<NapStudentLoginResponse>(
        "/api/v1/auth/student/login",
        { email, password },
      );

      const user: User = {
        uid: String(response.user.id ?? response.profile.applicationId ?? ""),
        email: response.user.email ?? response.profile.email ?? email,
        displayName:
          response.user.fullName ??
          response.profile.fullName ??
          email.split("@")[0],
      };

      const profile: Profile = {
        id: String(response.profile.applicationId ?? response.user.id ?? ""),
        full_name: response.profile.fullName ?? user.displayName ?? "",
        email: user.email,
        avatar_url: null,
        student_number: response.profile.prn ?? null,
        registration_number: response.profile.prn ?? null,
        department: response.profile.assignedProgramme ?? null,
        college: null,
        programme: response.profile.programChoice1 ?? null,
        phone: response.profile.phoneNumber ?? null,
        phone_number: response.profile.phoneNumber ?? null,
        bio: null,
        role: "student",
      };

      saveToken(response.token);
      saveSession(user, profile);
      setUser(user);
      setSession({ user });
      setProfile(profile);

      return { error: null, user, profile };
    } catch (error: any) {
      return { error: new Error(error.message) };
    }
  };

  const signInWithStudentId = async (
    identifier: string,
    password: string,
  ): Promise<{
    error: Error | null;
    user?: User;
    profile?: Profile | null;
  }> => {
    return signIn(identifier, password);
  };

  const resetPassword = async (
    identifier: string,
    newPassword: string,
  ): Promise<{ error: Error | null }> => {
    try {
      const email = identifier.trim().toLowerCase();
      await postJson<{ ok: boolean; message?: string }>(
        "/api/v1/auth/student/reset-password",
        { email, newPassword },
      );
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message) };
    }
  };

  const signOut = async () => {
    try {
      await postJson<{ success: boolean }>("/api/auth/logout/", {});
    } catch {
      // ignore logout errors - still clear local token
    }
    clearToken();
    clearSession();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signInWithStudentId,
        signOut,
        generateOTP,
        verifyOTP,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
