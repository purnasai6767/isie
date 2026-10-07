"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Mail,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { auth, getRedirectResult } from "@/lib/firebase/client";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";

export default function SignInPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    show: boolean;
    operatorName: string;
  } | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    const res = await loginWithGoogle();
    if (res.redirecting) return;
    setIsGoogleLoading(false);
    if (res.success) {
      setSuccessInfo({
        show: true,
        operatorName: "Authenticated Google account",
      });
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } else {
      if (res.cancelled) {
        // User closed the popup window before completing auth; reset without error
        setError(null);
        return;
      }
      setError(res.error || "Google Sign-In failed.");
    }
  };

  useEffect(() => {
    let active = true;

    getRedirectResult(auth)
      .then((result) => {
        if (!active || !result?.user) return;
        setSuccessInfo({
          show: true,
          operatorName: result.user.email || "Authenticated Google account",
        });
        router.replace("/dashboard");
      })
      .catch((redirectError: { code?: string; message?: string }) => {
        if (!active) return;
        console.error("Google redirect result error:", redirectError);
        if (redirectError.code === "auth/unauthorized-domain") {
          setError("This website domain is not authorized for Google sign-in in Firebase.");
        } else {
          setError(redirectError.message || "Google sign-in could not be completed. Please try again.");
        }
        setIsGoogleLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      setSuccessInfo({
        show: true,
        operatorName: email.trim(),
      });
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } else {
      setError(res.error || "Authentication failed. Check your credentials and try again.");
    }
  };

  return (
    <div className="relative min-h-screen bg-isie-bg-deep flex flex-col justify-center items-center p-4 selection:bg-isie-primary/30 select-none">
      {/* Background Tactical Grid & Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

      {/* Top Header Badge */}
      <div className="relative z-10 mb-6 flex items-center gap-2">
        <TacticalBadge variant="cyan" size="sm">
          PROTOTYPE // AUTHENTICATION
        </TacticalBadge>
        <span className="text-white/20">|</span>
      </div>

      {/* Authentication Card */}
      <div className="relative z-10 w-full max-w-md bg-isie-panel/90 border border-white/15 rounded-sm p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        {/* Corner Accents */}
        <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-isie-cyan/50" />
        <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-isie-cyan/50" />
        <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-isie-cyan/50" />
        <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-isie-cyan/50" />

        {/* Identity & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-isie-primary to-orange-700 flex items-center justify-center font-mono font-bold text-black text-xl shadow-[0_0_20px_rgba(255,122,24,0.4)] mb-3">
            IS
          </div>
          <h1 className="font-mono text-xl font-bold tracking-widest text-white uppercase">
            ISIE // SIGN IN
          </h1>
          <p className="text-xs font-mono text-isie-text-secondary mt-1">
            INTEGRATED SITUATION INTELLIGENCE ENGINE
          </p>
          <p className="text-xs font-mono text-cyan-400 mt-1 font-semibold">
            To continue to sign in for ISIE
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-xs text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        {/* Google Authentication (Firebase Auth) */}
        <div className="mb-5 space-y-2">
          <div className="text-center text-[11px] font-mono text-slate-300">
            To continue to sign in for ISIE
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 hover:border-white/40 text-white font-mono text-xs uppercase tracking-wider rounded-xs transition-all shadow-sm group"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold text-white group-hover:text-amber-300 transition-colors">
              {isGoogleLoading ? "CONNECTING GOOGLE AUTH..." : "SIGN IN WITH GOOGLE"}
            </span>
          </button>
        </div>

        {/* Tactical Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[9px] font-mono uppercase tracking-widest">
            <span className="bg-isie-panel px-2 text-isie-text-dim">
              OR OFFICER CREDENTIALS
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5 font-mono text-xs">
            <label className="text-isie-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-isie-cyan" />
              <span>Email</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-isie-panel-light border border-white/10 focus:border-isie-primary/80 focus:bg-isie-panel-elevated p-2.5 text-white outline-none rounded-xs transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <label className="text-isie-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-isie-primary" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-isie-panel-light border border-white/10 focus:border-isie-primary/80 focus:bg-isie-panel-elevated p-2.5 text-white outline-none rounded-xs transition-colors"
              required
            />
          </div>

          {/* Primary Action: Sign In */}
          <div className="pt-2">
            <TacticalButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? "AUTHENTICATING..." : "SIGN IN"}
            </TacticalButton>
          </div>
        </form>

        {/* Link to Sign Up */}
        <div className="mt-6 text-center font-mono text-xs text-isie-text-muted">
          Need a dedicated profile?{" "}
          <Link href="/signup" className="text-isie-primary hover:underline font-semibold">
            Create account
          </Link>
        </div>
      </div>

      {/* Subtle Success Toast / Command Center Entry Animation */}
      {successInfo?.show && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="bg-isie-panel/95 border border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.3)] rounded-sm p-4 backdrop-blur-md max-w-sm flex items-start gap-3">
            <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 animate-pulse">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                  AUTHENTICATION SUCCESSFUL
                </span>
              </div>
              <p className="text-xs font-mono text-white font-medium">
                Entering ISIE Command Center...
              </p>
              <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-isie-text-muted">
                <span>
                  IDENTITY: <strong className="text-white">{successInfo.operatorName}</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  FIREBASE ACCOUNT
                </span>
              </div>
              {/* Subtle loading progress indicator line */}
              <div className="w-full bg-white/10 h-0.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-400 h-full animate-pulse w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
