import { useAuthStore } from "@/lib/store/user";

export async function loginWithOIDC(token: string) {
  const res = await fetch("/api/auth/oidc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    throw new Error("Login failed");
  }
  const data = await res.json();
  useAuthStore.getState().setSession(data.session);
  useAuthStore.getState().setUser(data.user);
  return data.user;
}

export function logout() {
  useAuthStore.getState().logout();
}
