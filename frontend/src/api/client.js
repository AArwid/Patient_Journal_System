// Single place that talks to the Express API. `credentials: include` keeps the
// session cookie flowing, which is what the backend uses to decide access.
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "Could not reach the server. Is the backend running?",
    );
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.error || `Request failed (${response.status})`,
    );
  }
  return payload;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  searchPatients: (query) =>
    request(`/patients?q=${encodeURIComponent(query)}`),
  getPatient: (id) => request(`/patients/${id}`),
  getNotes: (id) => request(`/patients/${id}/notes`),
  createNote: (id, content, visibility) =>
    request(`/patients/${id}/notes`, {
      method: "POST",
      body: { content, visibility },
    }),
  getAccessLogs: (id) => request(`/patients/${id}/access-logs`),
  getMyAuditEvents: () => request("/audit/my-events"),
  // Opens a live connection for new notes on this patient (incl. ones synced
  // in from the other server over P2P). Call the returned EventSource's
  // .close() when the viewer navigates away or picks a different patient.
  streamNotes: (id, onNote) => {
    const source = new EventSource(`${BASE_URL}/patients/${id}/notes/stream`, {
      withCredentials: true,
    });
    source.onmessage = (event) => {
      try {
        onNote(JSON.parse(event.data));
      } catch {
        // Ignore malformed/heartbeat frames.
      }
    };
    return source;
  },
};
