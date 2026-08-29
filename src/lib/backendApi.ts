const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const NU_API_BASE_URL =
  import.meta.env.VITE_NU_API_BASE_URL || "http://localhost:8082";

const MESSAGING_API_BASE_URL =
  import.meta.env.VITE_WEBMAIL_API_BASE_URL || "http://localhost:8084";

const AUTH_TOKEN_KEY = "nexus-auth-token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Token ${token}` } : {};
}

async function handleResponse(response: Response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.detail || data?.error || "Backend request failed";
    throw new Error(message);
  }
  return data;
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
  const response = await fetch(`${MESSAGING_API_BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(response) as Promise<T>;
}

export async function postMessagingBackend<T>(
  path: string,
  payload: unknown,
): Promise<T> {
  const response = await fetch(`${MESSAGING_API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response) as Promise<T>;
}
