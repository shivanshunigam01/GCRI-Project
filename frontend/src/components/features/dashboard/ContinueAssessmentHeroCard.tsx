import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface ContinueAssessmentHeroCardProps {
  pendingCount?: number;
}

export function ContinueAssessmentHeroCard({ pendingCount = 3 }: ContinueAssessmentHeroCardProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-slate-100/70 border border-[var(--border-subtle)] rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[175px]">
      {/* High-rise architectural glass building vector graphic on the right matching mockup */}
      <div className="absolute right-0 bottom-0 top-0 w-44 pointer-events-none opacity-85 select-none overflow-hidden">
        <svg
          className="w-full h-full object-cover object-right-bottom transform translate-x-2 translate-y-1"
          viewBox="0 0 200 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="glassSkyline" x1="0" y1="0" x2="100" y2="240" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0284c7" stopOpacity="0.85" />
              <stop offset="0.5" stopColor="#0369a1" stopOpacity="0.9" />
              <stop offset="1" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="glassHighlight" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Background Building Facet */}
          <polygon points="120,40 190,10 190,240 120,240" fill="#0369a1" fillOpacity="0.6" />
          
          {/* Main Tower Front Facet */}
          <polygon points="40,20 120,40 120,240 40,240" fill="url(#glassSkyline)" />

          {/* Perspective Window Grid Lines */}
          <line x1="40" y1="50" x2="120" y2="65" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="40" y1="80" x2="120" y2="95" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="40" y1="110" x2="120" y2="125" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="40" y1="140" x2="120" y2="155" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="40" y1="170" x2="120" y2="185" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="40" y1="200" x2="120" y2="215" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

          {/* Vertical Glass Mullions */}
          <line x1="60" y1="25" x2="60" y2="240" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="80" y1="30" x2="80" y2="240" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="100" y1="35" x2="100" y2="240" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

          {/* Angular Right Facet Lines */}
          <line x1="120" y1="65" x2="190" y2="40" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          <line x1="120" y1="95" x2="190" y2="70" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          <line x1="120" y1="125" x2="190" y2="100" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          <line x1="120" y1="155" x2="190" y2="130" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          <line x1="120" y1="185" x2="190" y2="160" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          <line x1="120" y1="215" x2="190" y2="190" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />

          {/* Sun Reflection Flare */}
          <polygon points="40,20 70,27 60,120 40,110" fill="url(#glassHighlight)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[65%] space-y-1.5">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          Continue Your Assessment
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          You have <span className="font-semibold text-slate-900">{pendingCount} pending assessments</span> that need your attention.
        </p>
      </div>

      <div className="relative z-10 pt-4">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs hover:shadow-md transition-all group"
        >
          <span>View Assessments</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
