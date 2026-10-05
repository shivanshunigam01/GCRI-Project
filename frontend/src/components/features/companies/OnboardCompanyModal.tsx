"use client";

import React, { useState } from "react";
import { companyService } from "@/services/company.service";
import { Button } from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import {
  Building2,
  Globe,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  User,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

interface OnboardCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OnboardCompanyModal({
  isOpen,
  onClose,
  onSuccess,
}: OnboardCompanyModalProps) {
  // Step State
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Client User (Assessor) State
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Organization Profile State
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userName.trim()) {
      setError("Please provide the client contact name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userEmail.trim() || !emailRegex.test(userEmail.trim())) {
      setError("Please provide a valid client work email address.");
      return;
    }

    if (!userPassword || userPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let normalizedDomain = domain.trim().toLowerCase();
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    if (!name.trim()) {
      setError("Please provide the legal organization name.");
      return;
    }

    if (!normalizedDomain || !normalizedDomain.includes(".")) {
      setError("Please enter a valid domain format (e.g. acme-ai.com).");
      return;
    }

    setLoading(true);
    try {
      const res = await companyService.create({
        name: name.trim(),
        domain: normalizedDomain,
        registrationNumber: registrationNumber.trim() || undefined,
        country: country.trim() || undefined,
        industry: industry.trim() || undefined,
        user: {
          name: userName.trim(),
          email: userEmail.trim().toLowerCase(),
          password: userPassword,
        },
      });

      if (res.success) {
        // Reset state
        setStep(1);
        setUserName("");
        setUserEmail("");
        setUserPassword("");
        setName("");
        setDomain("");
        setRegistrationNumber("");
        setCountry("");
        setIndustry("");
        onSuccess();
        onClose();
      } else {
        let msg = res.error?.message || "Failed to onboard organization.";
        if (Array.isArray(res.error?.details) && res.error.details.length > 0) {
          const detailMsg = (res.error.details as any[])
            .map((issue) => issue.message || `${issue.path?.join(".")}: invalid`)
            .join(". ");
          if (detailMsg) msg = detailMsg;
        }
        setError(msg);
      }
    } catch {
      setError("An unexpected network error occurred while contacting the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              {step === 1 ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-950">Onboard Organization</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-semibold">
                  Step {step} of 2
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {step === 1
                  ? "Client user account credentials (Role: Assessor)"
                  : "Institutional company details & automated DNS verification"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="flex items-center gap-2">
          <div
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              step >= 1 ? "bg-zinc-950" : "bg-zinc-200"
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              step === 2 ? "bg-zinc-950" : "bg-zinc-200"
            }`}
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Client Account (Role: Assessor) */}
        {step === 1 && (
          <form onSubmit={handleNextStep} autoComplete="off" className="space-y-3.5">
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 text-[11px] text-zinc-600 flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Creates the primary login account for the organization client with role{" "}
                <span className="font-semibold text-zinc-900">Assessor</span> to participate in assessments.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Client Contact Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  name="new_client_contact_name"
                  autoComplete="off"
                  placeholder="Enter contact name..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  disabled={loading}
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Client Work Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  name="new_client_work_email"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder="Enter client work email..."
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  disabled={loading}
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700">
                Initial Account Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  name="new_client_initial_password"
                  autoComplete="new-password"
                  placeholder="Enter initial password (min 8 characters)..."
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  disabled={loading}
                  className="w-full h-9 pl-8 pr-9 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer p-0.5"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">Client will use this password to sign into GRAICE.</p>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={loading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="text-xs font-semibold gap-1.5 min-w-[170px]"
              >
                <span>Next: Company Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: Company Details */}
        {step === 2 && (
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
            {/* Row 1: Legal Name & Domain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Enter organization name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">
                  Primary Domain <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Enter primary domain (e.g. acme-ai.com)..."
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    disabled={loading}
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-zinc-200 bg-white text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Reg #, Country, Industry */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Reg / CIN #</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Enter registration number..."
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  disabled={loading}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Country</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Enter country..."
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={loading}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Industry</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Enter industry sector..."
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={loading}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Micro DNS info banner */}
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 text-[11px] text-zinc-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Upon submission, automated DNS (A & MX) check is executed and the client account is bound to the organization tenant.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
                disabled={loading}
                className="text-xs gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={loading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading}
                  className="text-xs font-semibold gap-1.5 min-w-[170px]"
                >
                  {loading ? (
                    <div className="flex items-center gap-1.5">
                      <Spinner size="sm" />
                      <span>Creating & Verifying...</span>
                    </div>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Onboard Organization</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
