import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginRequest, type UserResponse } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export function useAuth() {
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [guestId, setGuestId] = useState<string | null>(() => localStorage.getItem("guestId"));

  // Fetch current user if guestId exists
  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      // If no guestId stored, don't fetch (unless we implement a proper cookie check on load)
      // For this app, we rely on the guestId being in local storage to "know" we are logged in client-side
      // But the API relies on cookies. 
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
    // Only fetch if we "think" we are logged in or on mount to check session
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (errorData?.message) {
          throw new Error(errorData.message);
        }
        throw new Error("Login failed");
      }
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      localStorage.setItem("guestId", data.guestId);
      setGuestId(data.guestId);
      queryClient.setQueryData([api.auth.me.path], data);
      toast({
        title: "Welcome back!",
        description: `Logged in as Guest: ${data.guestId}`,
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      localStorage.removeItem("guestId");
      setGuestId(null);
      queryClient.setQueryData([api.auth.me.path], null);
      setLocation("/");
      toast({ title: "Logged out successfully" });
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    isAuthenticated: !!user,
  };
}
