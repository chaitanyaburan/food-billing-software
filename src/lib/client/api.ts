export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error?: { code?: string; message?: string; details?: any } };
export type ApiResponse<T> = ApiOk<T> | ApiFail;

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("accessToken", accessToken);
  window.localStorage.setItem("refreshToken", refreshToken);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("refreshToken");
}

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return null;
      }

      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });

      const json = await res.json();

      if (!json.ok) {
        clearTokens();
        // Redirect to login if refresh fails
        if (typeof window !== "undefined" && !window.location.pathname.includes("/auth/login")) {
          window.location.href = "/auth/login";
        }
        return null;
      }

      const { accessToken, refreshToken: newRefreshToken } = json.data;
      setTokens(accessToken, newRefreshToken);
      return accessToken;
    } catch (error) {
      clearTokens();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/auth/login")) {
        window.location.href = "/auth/login";
      }
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  let accessToken = getAccessToken();

  const makeRequest = async (token: string | null) => {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { authorization: `Bearer ${token}` } : {})
      }
    });

    // If 401, try to refresh token
    if (res.status === 401 && token) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry the request with new token
        return fetch(url, {
          ...init,
          headers: {
            ...(init?.headers ?? {}),
            authorization: `Bearer ${newToken}`
          }
        });
      }
    }

    return res;
  };

  const res = await makeRequest(accessToken);
  return res.json();
}
