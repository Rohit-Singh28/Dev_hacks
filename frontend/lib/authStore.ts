"use client";

import { create } from "zustand";
import { api } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  loginWithGoogle: (backendUser: User, backendToken: string) => void;
  logout: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,

  login: async (usernameOrEmail, password) => {
    const { data } = await api.post("/auth/login", {
      usernameOrEmail,
      password,
    });
    // Use sessionStorage — cleared when tab/browser closes
    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("user", JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  register: async (username, email, password) => {
    const { data } = await api.post("/auth/register", {
      username,
      email,
      password,
    });
    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("user", JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  loginWithGoogle: (backendUser: User, backendToken: string) => {
    sessionStorage.setItem("token", backendToken);
    sessionStorage.setItem("user", JSON.stringify(backendUser));
    set({ user: backendUser, token: backendToken, loading: false });
  },

  logout: async () => {
    // Call backend to delete Redis session
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors during logout
    }
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    set({ user: null, token: null });
  },

  hydrate: () => {
    if (typeof window === "undefined") {
      set({ loading: false });
      return;
    }
    // Read from sessionStorage only — no persistent login across tabs
    const token = sessionStorage.getItem("token");
    const userStr = sessionStorage.getItem("user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, loading: false });
      } catch {
        set({ loading: false });
      }
    } else {
      set({ loading: false });
    }
  },
}));
