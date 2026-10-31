import { useEffect, useRef } from "react";
import { setIdentityAccessToken } from "@/contexts/AuthContext";
import { useNexusAuth } from "./AuthProvider";

const TOKEN_KEY = "nexus-auth-token";
const USER_KEY = "nexus-auth-user";
const PROFILE_KEY = "nexus-auth-profile";
const SSO_SESSION_MARKER = "nexus-sso-session";
const ADMISSIONS_API =
  import.meta.env.VITE_ADMISSIONS_API_BASE_URL ??
  "https://backend-production-b8c2b.up.railway.app";

function appRole(roles: string[]): "student" | "lecturer" | "registrar" | null {
  const normalized = roles.map((role) => role.toUpperCase());
  if (normalized.includes("REGISTRAR")) return "registrar";
  if (normalized.includes("LECTURER")) return "lecturer";
  if (normalized.includes("STUDENT") || normalized.includes("APPLICANT")) {
    return "student";
  }
  return null;
}

interface StudentProfileResponse {
  user: {
    id: number | string;
    email: string;
    fullName?: string;
  };
  profile: {
    applicationId?: number | string;
    prn?: string | null;
    studentNumber?: string | null;
    registrationNumber?: string | null;
    fullName?: string;
    email?: string;
    phoneNumber?: string | null;
    programChoice1?: string | null;
    assignedProgramme?: string | null;
    faculty?: string | null;
  };
}

export function IdentitySessionBridge() {
  const { status, user, client, getAccessToken, logout } = useNexusAuth();
  const syncing = useRef(false);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (status === "anonymous") {
        if (localStorage.getItem(TOKEN_KEY) === SSO_SESSION_MARKER) {
          setIdentityAccessToken(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(PROFILE_KEY);
          window.location.reload();
        }
        return;
      }
      if (status !== "authenticated" || !user || syncing.current) return;
      syncing.current = true;

      const token = await getAccessToken();
      if (!active || !token) return;

      const role = appRole(user.roles);
      if (!role) {
        setIdentityAccessToken(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(PROFILE_KEY);
        await logout("/auth");
        return;
      }

      const previousUserRaw = localStorage.getItem(USER_KEY);
      let sameUser = false;
      if (previousUserRaw) {
        try {
          const previousUser = JSON.parse(previousUserRaw) as { email?: string };
          sameUser = previousUser.email === user.email;
        } catch {
          sameUser = false;
        }
      }

      const nextUser = {
        uid: user.sub,
        email: user.email,
        displayName: user.name ?? user.email,
      };
      const existingProfile = localStorage.getItem(PROFILE_KEY);
      let profile: Record<string, unknown> | null = null;
      if (existingProfile) {
        try {
          const parsed = JSON.parse(existingProfile) as Record<string, unknown>;
          if (
            parsed.email === user.email &&
            (role !== "student" || parsed.sso_profile_loaded === true)
          ) {
            profile = parsed;
          }
        } catch {
          profile = null;
        }
      }

      let nextProfile: Record<string, unknown> = profile ?? {
        id: user.sub,
        full_name: user.name ?? user.email,
        email: user.email,
        avatar_url: null,
        student_number: null,
        registration_number: null,
        department: null,
        college: null,
        phone: null,
        phone_number: null,
        bio: null,
        role,
      };

      if (role === "student" && !profile) {
        const response = await fetch(
          `${ADMISSIONS_API.replace(/\/+$/, "")}/api/v1/auth/student/me`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          throw new Error(
            `Could not load the student profile (HTTP ${response.status})`,
          );
        }
        const data = (await response.json()) as StudentProfileResponse;
        nextUser.uid = String(
          data.profile.studentNumber ??
            data.profile.registrationNumber ??
            data.profile.prn ??
            data.user.id,
        );
        nextUser.displayName = data.user.fullName ?? user.name ?? user.email;
        nextProfile = {
          id: String(data.profile.applicationId ?? data.user.id),
          full_name: data.profile.fullName ?? nextUser.displayName,
          email: data.user.email ?? user.email,
          avatar_url: null,
          student_number:
            data.profile.studentNumber ?? data.profile.prn ?? null,
          registration_number:
            data.profile.registrationNumber ??
            data.profile.studentNumber ??
            data.profile.prn ??
            null,
          department: data.profile.faculty ?? data.profile.assignedProgramme ?? null,
          college: null,
          programme: data.profile.programChoice1 ?? null,
          phone: data.profile.phoneNumber ?? null,
          phone_number: data.profile.phoneNumber ?? null,
          bio: null,
          role: "student",
          sso_profile_loaded: true,
        };
      }

      if (!active) return;
      const shouldReload =
        !sameUser || localStorage.getItem(TOKEN_KEY) !== SSO_SESSION_MARKER;
      localStorage.setItem(TOKEN_KEY, SSO_SESSION_MARKER);
      setIdentityAccessToken(token);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      if (shouldReload) window.location.reload();
    };

    const runSync = () => {
      void sync().catch((error: unknown) => {
        if (!active) return;
        syncing.current = false;
        console.error("Nexus SSO session could not be initialized", error);
        window.dispatchEvent(
          new CustomEvent("nexus-sso-error", {
            detail: error instanceof Error ? error.message : String(error),
          }),
        );
        setIdentityAccessToken(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(PROFILE_KEY);
        void logout("/auth").catch((logoutError: unknown) =>
          console.error("Nexus SSO logout failed", logoutError),
        );
      }).finally(() => {
        syncing.current = false;
      });
    };

    runSync();
    const unsubscribe = client.subscribe(runSync);
    const handleSignout = () => {
      void logout("/").catch((error: unknown) =>
        console.error("Nexus SSO logout failed", error),
      );
    };
    window.addEventListener("nexus-sso-signout", handleSignout);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("nexus-sso-signout", handleSignout);
    };
  }, [client, getAccessToken, logout, status, user]);

  return null;
}
