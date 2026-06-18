const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const AUTH_USERS_KEY = "echo-salvage-users";
const AUTH_SESSION_KEY = "echo-salvage-session";

function getServerToken() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
    const user = Array.isArray(users) ? users.find((entry) => entry.id === session?.id) : null;
    return user?.serverToken || "";
  } catch {
    return "";
  }
}

async function apiRequest(path, options = {}) {
  const token = getServerToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Server request failed.");
  return data;
}

async function signupServerProfile(payload) {
  return apiRequest("/auth/signup", { method: "POST", body: JSON.stringify(payload) });
}

async function loginServerProfile(payload) {
  return apiRequest("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

function syncServerProfile(user) {
  if (!user?.id) return;
  apiRequest(`/users/${encodeURIComponent(user.id)}`, { method: "PUT", body: JSON.stringify({ user }) }).catch(() => {});
}

async function publishCommunityLevel(payload) {
  return apiRequest("/community-levels", { method: "POST", body: JSON.stringify(payload) });
}

async function updateCommunityLevel(id, payload) {
  return apiRequest(`/community-levels/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
}

async function deleteCommunityLevel(id) {
  return apiRequest(`/community-levels/${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function listCommunityLevels({ page = 1, limit = 12, query = "", sort = "new" } = {}) {
  const params = new URLSearchParams({ page: `${page}`, limit: `${limit}`, query, sort });
  return apiRequest(`/community-levels?${params}`);
}

async function getCommunityLevel(id) {
  return apiRequest(`/community-levels/${encodeURIComponent(id)}`);
}

async function toggleCommunityLike(id) {
  return apiRequest(`/community-levels/${encodeURIComponent(id)}/like`, { method: "POST" });
}

export {
  signupServerProfile,
  loginServerProfile,
  syncServerProfile,
  publishCommunityLevel,
  updateCommunityLevel,
  deleteCommunityLevel,
  listCommunityLevels,
  getCommunityLevel,
  toggleCommunityLike
};
