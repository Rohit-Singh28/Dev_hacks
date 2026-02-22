"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import type { User } from "@/lib/types";

/**
 * Hook to sync NextAuth Google session with Zustand auth store.
 * Call this in components where you need Google auth to sync.
 */
export function useGoogleAuthSync() {
  const { data: session, status } = useSession();
  const { loginWithGoogle, user } = useAuthStore();

  useEffect(() => {
    // If we have a NextAuth session with backend data but no zustand user, sync them
    if (
      status === "authenticated" &&
      session?.backendUser &&
      session?.backendToken &&
      !user
    ) {
      loginWithGoogle(session.backendUser as User, session.backendToken);
    }
  }, [session, status, user, loginWithGoogle]);

  return { session, status };
}
