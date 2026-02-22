"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/lib/authStore";
import type { User } from "@/lib/types";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Inner component that syncs NextAuth Google session with Zustand auth store
 */
function GoogleAuthSync({ children }: { children: ReactNode }) {
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

  return <>{children}</>;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <GoogleAuthSync>{children}</GoogleAuthSync>
    </SessionProvider>
  );
}
