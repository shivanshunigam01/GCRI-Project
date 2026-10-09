"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export function AuditorGreetingHero() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("Good Morning");
  const [formattedDate, setFormattedDate] = useState("Friday, 3 October 2026");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    setFormattedDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  const firstName = user?.name ? user.name.split(" ")[0] : "Piyush";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight flex items-center gap-2">
          <span>{greeting}, {firstName}</span>
          <span className="inline-block animate-bounce" role="img" aria-label="wave">👋</span>
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Here&apos;s an overview of your assessments and activities.
        </p>
      </div>

      <div className="flex flex-col sm:items-end text-left sm:text-right">
        <span className="text-xs sm:text-sm font-semibold text-slate-800 font-sans">
          {formattedDate}
        </span>
        <span className="text-xs italic text-[var(--text-muted)] mt-0.5">
          &ldquo;Responsible AI today, a more trustworthy tomorrow.&rdquo;
        </span>
      </div>
    </div>
  );
}
