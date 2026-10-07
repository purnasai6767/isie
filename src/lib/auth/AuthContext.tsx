"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; cancelled?: boolean; redirecting?: boolean }>;
  signup: (data: { name: string; email: string; password: string; role?: string; organization?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        return;
      }

      const synced = await syncUserProfile(fbUser);
      if (auth.currentUser?.uid !== fbUser.uid) return;
      setUser({
        id: fbUser.uid,
        name: fbUser.displayName || synced?.displayName || "Authenticated user",
        email: fbUser.email || "",
        role: synced?.role || "VIEWER",
        organization: synced?.organization || "Not configured",
        clearance: synced?.clearance || "Not assigned",
        callsign: synced?.callsign || "Not assigned",
        isDemo: false,
        avatarUrl: fbUser.photoURL || undefined,
        provider: fbUser.providerData?.[0]?.providerId || "firebase",
      });
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; cancelled?: boolean; redirecting?: boolean }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const synced = await syncUserProfile(result.user);
        const authedUser: AuthUser = {
          id: result.user.uid,
          name: result.user.displayName || synced?.displayName || "Operator",
          email: result.user.email || "",
          role: synced?.role || "VIEWER",
          organization: synced?.organization || "Not configured",
          clearance: synced?.clearance || "Not assigned",
          callsign: synced?.callsign || "Not assigned",
          isDemo: false,
          avatarUrl: result.user.photoURL || undefined,
          provider: "google",
        };
        setUser(authedUser);
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
        try {
          await signInWithRedirect(auth, googleProvider);
          return { success: false, redirecting: true };
        } catch (redirectError: any) {
          console.error("Google redirect sign in error:", redirectError);
          return {
            success: false,
            error: redirectError?.message || "Google sign-in redirect failed. Try allowing popups for this site.",
          };
        }
      }

      console.error("Google sign in error:", err);
      return { success: false, error: err?.message || "Failed to sign in with Google." };
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const synced = await syncUserProfile(credential.user);
      const authedUser: AuthUser = {
        id: credential.user.uid,
        name: credential.user.displayName || synced?.displayName || email.split("@")[0].toUpperCase(),
        email: credential.user.email || email,
        role: synced?.role || "VIEWER",
        organization: synced?.organization || "Not configured",
        clearance: synced?.clearance || "Not assigned",
        callsign: synced?.callsign || "Not assigned",
        isDemo: false,
        provider: "password",
      };
      setUser(authedUser);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || "Authentication failed.";
      return { success: false, error: msg };
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
        const synced = await syncUserProfile(cred.user, {
          displayName: data.name,
          role: "VIEWER",
          organization: data.organization || "Not configured",
          clearance: "Not assigned",
          callsign: "Not assigned",
        });

        const authedUser: AuthUser = {
          id: cred.user.uid,
          name: data.name || synced?.displayName || "Operator",
          email: cred.user.email || data.email,
          role: synced?.role || "VIEWER",
          organization: synced?.organization || data.organization || "Not configured",
          clearance: synced?.clearance || "Not assigned",
          callsign: synced?.callsign || "Not assigned",
          isDemo: false,
          provider: "password",
        };
        setUser(authedUser);
        return { success: true };
      }
      return { success: false, error: "Account creation failed." };
    } catch (err: any) {
      console.error("Signup error:", err);
      return { success: false, error: err?.message || "Failed to create account." };
    }
  };

  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await fbSignOut(auth);
      setUser(null);
      window.location.href = "/signin";
      return { success: true };
    } catch (err: any) {
      console.error("Sign out error:", err);
      return { success: false, error: err?.message || "Could not sign out." };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isDemoMode: false,
        login,
        loginWithGoogle,
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
