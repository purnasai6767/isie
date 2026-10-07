"use client";

import React from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { TacticalButton } from "@/components/ui/TacticalButton";

export function LandingHeaderActions() {
  return (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      <Link href="/signin">
        <TacticalButton variant="secondary" size="sm" icon={<LogIn className="w-3.5 h-3.5" />}>
          SIGN IN
        </TacticalButton>
      </Link>
      <Link href="/global">
        <TacticalButton variant="primary" size="sm">
          EXPLORE PUBLIC DATA
        </TacticalButton>
      </Link>
    </div>
  );
}

export function LandingHeroActions() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mb-16 sm:mb-20">
      <Link href="/global">
        <TacticalButton variant="primary" size="lg">
          Explore Public Data
        </TacticalButton>
      </Link>
      <Link href="/signin">
        <TacticalButton variant="secondary" size="lg" icon={<LogIn className="w-4 h-4" />}>
          Sign In
        </TacticalButton>
      </Link>
    </div>
  );
}
