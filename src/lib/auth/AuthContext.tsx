"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fbSignOut,
  onAuthStateChanged,
  syncUserProfile,
  FirestoreUserProfile,
} from "@/lib/firebase/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  clearance: string;
  callsign: string;
  isDemo: boolean;
  avatarUrl?: string;
  provider?: string;
}

export const DEMO_CREDENTIALS = {
  email: "demo@isie.ai",
  password: "ISIE-DEMO-2026",
};

export const DEFAULT_DEMO_USER: AuthUser = {
  id: "usr-demo-01",
  name: "Operations Director (Trident Actual)",
  email: "demo@isie.ai",
  role: "Command / Decision Maker",
  organization: "National Crisis Command / CredForge",
  clearance: "Strategic Command Level 4",
  callsign: "DIR-OP",
  isDemo: true,
};

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; isDemo?: boolean }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  loginDemo: () => Promise<void>;
  signup: (data: { name: string; email: string; password: string; role?: string; organization?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "isie_auth_session";
const DEMO_OPT_IN_KEY = "isie_demo_opt_in";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Listen to Firebase Auth state
  useEffect(() => {
    // Listen to Firebase Auth state for real users
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const synced = await syncUserProfile(fbUser);
        const mappedUser: AuthUser = {
          id: fbUser.uid,
          name: fbUser.displayName || synced?.displayName || "Tactical Operator",
          email: fbUser.email || "",
          role: synced?.role || "VIEWER",
          organization: synced?.organization || "National Crisis Command",
          clearance: synced?.clearance || "Level 4 Strategic",
          callsign: synced?.callsign || (fbUser.displayName?.slice(0, 4).toUpperCase() || "OPR") + "-TAC",
          isDemo: false,
          avatarUrl: fbUser.photoURL || undefined,
          provider: fbUser.providerData?.[0]?.providerId || "firebase",
        };
        setUser(mappedUser);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
        } catch {}
      } else {
        // Demo data is available only after an explicit demo-mode opt-in.
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          const demoOptedIn = localStorage.getItem(DEMO_OPT_IN_KEY) === "true";
          if (stored && demoOptedIn) {
            const parsed = JSON.parse(stored) as AuthUser;
            setUser(parsed.isDemo ? parsed : null);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(DEMO_OPT_IN_KEY);
            setUser(null);
          }
        } catch (error) {
          console.error("Could not restore the explicitly selected demo session.", error);
          setUser(null);
        }
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; cancelled?: boolean }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const synced = await syncUserProfile(result.user);
        const authedUser: AuthUser = {
          id: result.user.uid,
          name: result.user.displayName || synced?.displayName || "Operator",
          email: result.user.email || "",
          role: synced?.role || "VIEWER",
          organization: synced?.organization || "National Crisis Center",
          clearance: synced?.clearance || "Strategic Level 4",
          callsign: synced?.callsign || "DIR-GOOGLE",
          isDemo: false,
          avatarUrl: result.user.photoURL || undefined,
          provider: "google",
        };
        setUser(authedUser);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authedUser));
        } catch {}
        return { success: true };
      }
      return { success: false, error: "Google authentication failed" };
    } catch (err: any) {
      const errorCode = err?.code || "";
      const errorMsg = err?.message || "";

      // Benign user action: user closed the Google sign-in popup or cancelled the operation
      if (
        errorCode === "auth/popup-closed-by-user" ||
        errorCode === "auth/cancelled-popup-request" ||
        errorMsg.includes("popup-closed-by-user") ||
        errorMsg.includes("cancelled-popup-request")
      ) {
        // User closed popup or cancelled: do not emit console.error
        return {
          success: false,
          cancelled: true,
          error: "Sign-in was cancelled.",
        };
      }

      if (errorCode === "auth/popup-blocked" || errorMsg.includes("popup-blocked")) {
        return {
          success: false,
          error: "Popup window was blocked by your browser. Please allow popups for this site.",
        };
      }

      console.error("Google sign in error:", err);
      return { success: false, error: err?.message || "Failed to sign in with Google." };
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string; isDemo?: boolean }> => {
    // Mode A: Demo Credentials
    if (email.toLowerCase().trim() === DEMO_CREDENTIALS.email.toLowerCase() && pass === DEMO_CREDENTIALS.password) {
      setUser(DEFAULT_DEMO_USER);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_USER));
          localStorage.setItem(DEMO_OPT_IN_KEY, "true");
        } catch {}
      }
      return { success: true, isDemo: true };
    }

    // Mode B: Real User Firebase Authentication
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const synced = await syncUserProfile(credential.user);
      const authedUser: AuthUser = {
        id: credential.user.uid,
        name: credential.user.displayName || synced?.displayName || email.split("@")[0].toUpperCase(),
        email: credential.user.email || email,
        role: synced?.role || "VIEWER",
        organization: synced?.organization || "National Crisis Command",
        clearance: synced?.clearance || "Level 3 Command",
        callsign: synced?.callsign || "TAC-CMD",
        isDemo: false,
        provider: "password",
      };
      setUser(authedUser);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authedUser));
          localStorage.removeItem(DEMO_OPT_IN_KEY);
        } catch {}
      }
      return { success: true, isDemo: false };
    } catch (err: any) {
      const msg = err?.message || "Authentication failed.";
      return { success: false, error: msg };
    }
  };

  const loginDemo = async () => {
    setUser(DEFAULT_DEMO_USER);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_USER));
        localStorage.setItem(DEMO_OPT_IN_KEY, "true");
      } catch {}
      window.location.href = "/dashboard";
    }
  };

  const signup = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    organization?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      if (cred.user) {
        if (data.name) {
          try {
            await updateProfile(cred.user, { displayName: data.name });
          } catch {}
        }
        const synced = await syncUserProfile(cred.user, {
          displayName: data.name,
          role: "VIEWER",
          organization: data.organization || "National Crisis Command",
          clearance: "Strategic Operator Level 3",
          callsign: (data.name.slice(0, 4) || "OPER").toUpperCase() + "-01",
        });

        const authedUser: AuthUser = {
          id: cred.user.uid,
          name: data.name || synced?.displayName || "Operator",
          email: cred.user.email || data.email,
          role: synced?.role || "VIEWER",
          organization: synced?.organization || data.organization || "National Crisis Command",
          clearance: synced?.clearance || "Strategic Operator Level 3",
          callsign: synced?.callsign || "OPER-01",
          isDemo: false,
          provider: "password",
        };
        setUser(authedUser);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(authedUser));
            localStorage.removeItem(DEMO_OPT_IN_KEY);
          } catch {}
        }
        return { success: true };
      }
      return { success: false, error: "Account creation failed." };
    } catch (err: any) {
      console.error("Signup error:", err);
      return { success: false, error: err?.message || "Failed to create account." };
    }
  };

  const logout = () => {
    fbSignOut(auth).catch(() => {});
    setUser(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(DEMO_OPT_IN_KEY);
      } catch {}
      window.location.href = "/signin";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isDemoMode: user?.isDemo ?? false,
        login,
        loginWithGoogle,
        loginDemo,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
