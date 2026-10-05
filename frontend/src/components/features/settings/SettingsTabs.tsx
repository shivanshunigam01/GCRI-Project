"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, ShieldCheck, KeyRound } from "lucide-react";

export function SettingsTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Profile Settings",
      href: "/settings/profile",
      icon: User,
    },
    {
      name: "Security & Password",
      href: "/settings/security",
      icon: LockIcon,
    },
    {
      name: "Two-Factor Auth (MFA)",
      href: "/settings/mfa",
      icon: KeyRound,
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-zinc-200/80 mb-6 overflow-x-auto pb-px">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
              isActive
                ? "border-zinc-950 text-zinc-950 font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-zinc-950" : "text-zinc-400"}`} />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
