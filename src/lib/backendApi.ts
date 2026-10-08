const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const NU_API_BASE_URL =
  import.meta.env.VITE_NU_API_BASE_URL || "http://localhost:8081";

const MESSAGING_API_BASE_URL =
  import.meta.env.VITE_WEBMAIL_API_BASE_URL || "http://localhost:8084";

// NAD Admissions Dashboard backend (admissions-server) - source of admission/programme records
const NAD_API_BASE_URL =
  import.meta.env.VITE_NAD_API_BASE_URL || "http://localhost:8083";

// Registrar backend (port 8082) helpers for university services, office locations, service requests
const REG_API_BASE_URL =
  import.meta.env.VITE_REG_API_BASE_URL || "http://localhost:8082";

export { MESSAGING_API_BASE_URL, NAD_API_BASE_URL, REG_API_BASE_URL };

const AUTH_TOKEN_KEY = "nexus-auth-token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Token ${token}` } : {};
}

const API_LOG_TAG = "[API]";

type ApiCallContext = { method: string; url: string; startedAt: number };

async function handleResponse(response: Response, call?: ApiCallContext) {
  const text = await response.text();
  const elapsedMs = call
    ? Math.round(performance.now() - call.startedAt)
    : undefined;
  const bodyPreview =
    text.length > 500 ? `${text.slice(0, 500)}... (${text.length} chars)` : text;

  console.log(`${API_LOG_TAG} response`, {
    method: call?.method ?? "unknown",
    url: call?.url ?? "unknown",
    status: response.status,
    ok: response.ok,
    elapsedMs,
    contentType: response.headers.get("content-type"),
    bodyPreview,
  });

  if (!text) {
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText} (empty response body)`,
      );
    }
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (parseError) {
    console.error(`${API_LOG_TAG} json-parse-failed`, {
      url: call?.url,
      status: response.status,
      contentType: response.headers.get("content-type"),
      rawBody: text.slice(0, 500),
      parseError: (parseError as Error).message,
    });
    throw new Error(
      `HTTP ${response.status}: body was not valid JSON (${
        (parseError as Error).message
      }). First 200 chars: ${text.slice(0, 200)}`,
    );
  }

  if (!response.ok) {
    const payload = parsed as {
      detail?: string;
      error?: string;
      message?: string;
    } | null;

    throw new Error(
      payload?.detail ||
        payload?.error ||
        payload?.message ||
        `HTTP ${response.status} ${response.statusText}`,
    );
  }

  return parsed;
}

export async function getBackend<T>(path: string, auth: boolean = false): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
  });
  return handleResponse(response) as Promise<T>;
}

export async function postBackend<T>(
  path: string,
  payload: unknown,
  auth: boolean = false,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response) as Promise<T>;
}

// NAD Admissions Dashboard backend helpers (admissions-server, port 8083)
export async function getNadBackend<T>(path: string): Promise<T> {
  const response = await fetch(`${NAD_API_BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(response) as Promise<T>;
}

export async function deleteBackend<T>(path: string, auth: boolean = false): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
  });
  return handleResponse(response) as Promise<T>;
}

export async function putBackend<T>(
  path: string,
  payload: unknown,
  auth: boolean = false,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response) as Promise<T>;
}

// NU-Backend (port 8082) helpers for payments, OTP, etc.
export async function getNuBackend<T>(path: string, auth: boolean = false): Promise<T> {
  const response = await fetch(`${NU_API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
  });
  return handleResponse(response) as Promise<T>;
}

export async function postNuBackend<T>(
  path: string,
  payload: unknown,
  auth: boolean = false,
): Promise<T> {
  const response = await fetch(`${NU_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response) as Promise<T>;
}

// Messaging Backend (port 8084) helpers for notifications, messages, etc.
export async function getMessagingBackend<T>(path: string): Promise<T> {
  const url = `${MESSAGING_API_BASE_URL}${path}`;
  const startedAt = performance.now();

  console.log(`${API_LOG_TAG} request`, {
    method: "GET",
    url,
    messagingBaseUrl: MESSAGING_API_BASE_URL,
  });

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(response, {
    method: "GET",
    url,
    startedAt,
  }) as Promise<T>;
}

type StudentRecord = {
  id?: number | string;
  email?: string | null;
};

export async function resolveStudentIdByEmail(
  email: string | null | undefined,
): Promise<number | null> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  const students = await getMessagingBackend<StudentRecord[]>("/api/students/");
  const list = Array.isArray(students) ? students : [];
  const match = list.find(
    (student) =>
      student?.email &&
      String(student.email).trim().toLowerCase() === normalized,
  );

  if (match?.id == null) return null;
  const id = Number(match.id);
  return Number.isFinite(id) ? id : null;
}

export async function postMessagingBackend<T>(
  path: string,
  payload: unknown,
): Promise<T> {
  const url = `${MESSAGING_API_BASE_URL}${path}`;
  const startedAt = performance.now();

  console.log(`${API_LOG_TAG} request`, {
    method: "POST",
    url,
    body: payload,
    messagingBaseUrl: MESSAGING_API_BASE_URL,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response, {
    method: "POST",
    url,
    startedAt,
  }) as Promise<T>;
}

// Registrar backend (port 8082) helpers for university services, office locations, service requests
function cleanPath(path: string): string {
  return path.replace(/\/\?/, "?").replace(/\/+$/, "");
}

export async function getRegBackend<T>(path: string): Promise<T> {
  const response = await fetch(`${REG_API_BASE_URL}${cleanPath(path)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(response) as Promise<T>;
}

export async function postRegBackend<T>(
  path: string,
  payload: unknown,
): Promise<T> {
  const response = await fetch(`${REG_API_BASE_URL}${cleanPath(path)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response) as Promise<T>;
}

export async function putMessagingBackend<T>(
  path: string,
  payload: unknown,
): Promise<T> {
  const response = await fetch(`${MESSAGING_API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response) as Promise<T>;
}

export async function uploadAttachment(file: File): Promise<{ id: number; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${MESSAGING_API_BASE_URL}/api/attachments/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(response) as Promise<{ id: number; url: string }>;
}
