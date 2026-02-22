import "next-auth";
import type { User } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    backendUser?: User;
    backendToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendUser?: User;
    backendToken?: string;
  }
}
