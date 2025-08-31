import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(method: string, url: string, data?: any) {
  const token = localStorage.getItem("auth_token");

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5000,
      gcTime: 10 * 60 * 1000, // 10 minutes
      queryFn: async ({ queryKey, signal }) => {
        const token = localStorage.getItem("auth_token");
        const headers: HeadersInit = {};

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(queryKey[0] as string, {
          signal,
          headers,
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Redirect to login on auth failure
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
            window.location.href = "/";
            return;
          }
          if (response.status >= 500) {
            throw new Error(`Server error: ${response.status}`);
          }
          if (response.status === 404) {
            throw new Error("Not found");
          }
          const errorText = await response.text();
          throw new Error(errorText || `HTTP error ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return response.json();
        }
        return response.text();
      },
    },
    mutations: {
      retry: false,
    },
  },
});