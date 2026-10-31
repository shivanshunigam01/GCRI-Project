"use client";

import React, { useState } from "react";
import Link from "next/link";
import { authService } from "@/services/auth.service";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit password reset request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Forgot Password</h3>
        <p className="text-sm text-slate-500">Enter your email to receive a password reset token</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {sent ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm space-y-2">
          <p className="font-semibold">Reset Instructions Sent</p>
          <p>If an account exists with {email}, you will receive a reset link shortly.</p>
          <Link href="/login" className="inline-block mt-2 text-blue-600 font-medium hover:underline text-xs">
            Return to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="name@company.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      <div className="border-t border-slate-200 pt-4 text-center">
        <Link href="/login" className="text-xs text-blue-600 font-medium hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
