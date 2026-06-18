const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

async function listCommunityLevels() {
  return apiRequest("/community-levels");
}

export {
  signupServerProfile,
  loginServerProfile,
  syncServerProfile,
  publishCommunityLevel,
  listCommunityLevels
};
