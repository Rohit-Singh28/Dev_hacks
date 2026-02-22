import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Call backend to create or get the user
          const response = await fetch(`${API_BASE}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              googleId: account.providerAccountId,
              image: user.image,
            }),
          });

          if (!response.ok) {
            console.error("Backend Google auth failed");
            return false;
          }

          const data = await response.json();
          // Attach backend user data and token to the user object
          (user as any).backendUser = data.user;
          (user as any).backendToken = data.token;
          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // On initial sign-in, attach backend data to the token
      if (user && (user as any).backendUser) {
        token.backendUser = (user as any).backendUser;
        token.backendToken = (user as any).backendToken;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass backend data to the session
      if (token.backendUser) {
        (session as any).backendUser = token.backendUser;
        (session as any).backendToken = token.backendToken;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
