"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, User, Mail, Lock, Building, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { TacticalBadge } from "@/components/ui/TacticalBadge";
import { TacticalButton } from "@/components/ui/TacticalButton";

export default function SignUpPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [organization, setOrganization] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPass) {
      setError("Passcodes do not match.");
      return;
    }
    if (!agreeTerms) {
      setError("Please accept the operational terms & conditions.");
      return;
    }

    setError(null);
    const res = await signup({
      name: fullName,
      email,
      password,
      organization,
    });

    if (res.success) {
      setSuccessMessage(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } else {
      setError(res.error || "Failed to create account.");
    }
  };

  return (
    <div className="relative min-h-screen bg-isie-bg-deep flex flex-col justify-center items-center p-4 selection:bg-isie-primary/30 select-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl bg-isie-panel/90 border border-white/15 rounded-sm p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
          <div>
            <h1 className="font-mono text-lg font-bold tracking-widest text-white uppercase">
              ISIE // PROTOTYPE ACCOUNT REGISTRATION
            </h1>
            <p className="text-xs font-mono text-isie-text-secondary mt-0.5">
              Create an account for this prototype
            </p>
          </div>
          <TacticalBadge variant="cyan" size="sm">
            PROTOTYPE
          </TacticalBadge>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xs flex items-center gap-3 text-emerald-300 font-mono text-xs">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold">Prototype account created successfully.</div>
              <div className="text-[11px] text-emerald-400/80">
                Default role: Viewer. Elevated permissions require administrator assignment.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-xs text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-isie-text-secondary uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Commander R. Sharma"
                required
                className="w-full bg-isie-panel-light border border-white/10 p-2.5 text-white outline-none rounded-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-isie-text-secondary uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@agency.gov.in"
                required
                className="w-full bg-isie-panel-light border border-white/10 p-2.5 text-white outline-none rounded-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-isie-text-secondary uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-isie-panel-light border border-white/10 p-2.5 text-white outline-none rounded-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-isie-text-secondary uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-isie-panel-light border border-white/10 p-2.5 text-white outline-none rounded-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-isie-text-secondary uppercase tracking-wider">
                Organization (optional profile field)
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. National Disaster Management Authority"
                className="w-full bg-isie-panel-light border border-white/10 p-2.5 text-white outline-none rounded-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 accent-isie-primary cursor-pointer"
            />
            <label htmlFor="terms" className="text-[11px] text-isie-text-secondary cursor-pointer">
              I understand this is a prototype. Records are not independently verified and do not provide emergency instructions.
            </label>
          </div>

          <div className="pt-4">
            <TacticalButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              CREATE PROTOTYPE ACCOUNT
            </TacticalButton>
          </div>
        </form>

        <div className="mt-6 text-center font-mono text-xs text-isie-text-muted">
          Already have credentials?{" "}
          <Link href="/signin" className="text-isie-primary hover:underline font-semibold">
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
