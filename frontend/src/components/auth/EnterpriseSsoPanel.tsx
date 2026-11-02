"use client";

import React, { useState } from "react";
import { Loader2, Shield, X } from "lucide-react";

const SSO_LIVE = process.env.NEXT_PUBLIC_SSO_LIVE === "true";

type Provider = "google" | "microsoft";

interface EnterpriseSsoPanelProps {
  disabled?: boolean;
  onLiveSignIn?: (provider: Provider) => Promise<void>;
}

export function EnterpriseSsoPanel({ disabled, onLiveSignIn }: EnterpriseSsoPanelProps) {
  const [demoProvider, setDemoProvider] = useState<Provider | null>(null);
  const [liveLoading, setLiveLoading] = useState<Provider | null>(null);

  const openDemo = (provider: Provider) => setDemoProvider(provider);
  const closeDemo = () => setDemoProvider(null);

  const handleClick = async (provider: Provider) => {
    if (SSO_LIVE && onLiveSignIn) {
      setLiveLoading(provider);
      try {
        await onLiveSignIn(provider);
      } finally {
        setLiveLoading(null);
      }
      return;
    }
    openDemo(provider);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/95 px-2 text-slate-400 font-semibold tracking-wider text-[11px]">
              Enterprise single sign-on
            </span>
          </div>
        </div>

        {!SSO_LIVE && (
          <p className="text-[11px] text-center text-slate-500 leading-relaxed">
            Preview how Google Workspace and Microsoft Entra ID sign-in will appear for your organization.
            Set <code className="text-[10px] bg-slate-100 px-1 rounded">NEXT_PUBLIC_SSO_LIVE=true</code> when
            IdP credentials are bound.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <SsoButton
            label="Google"
            provider="google"
            loading={liveLoading === "google"}
            disabled={disabled || !!liveLoading}
            onClick={() => handleClick("google")}
          />
          <SsoButton
            label="Microsoft"
            provider="microsoft"
            loading={liveLoading === "microsoft"}
            disabled={disabled || !!liveLoading}
            onClick={() => handleClick("microsoft")}
          />
        </div>
      </div>

      {demoProvider && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4"
            role="dialog"
            aria-labelledby="sso-demo-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h4 id="sso-demo-title" className="font-semibold text-slate-900">
                    {demoProvider === "google" ? "Google Workspace SSO" : "Microsoft Entra ID SSO"}
                  </h4>
                  <p className="text-xs text-slate-500">Client demo — integration preview</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDemo}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
              <li>User selects {demoProvider === "google" ? "Google" : "Microsoft"} on the sign-in page.</li>
              <li>Identity provider authenticates the user and returns an OIDC ID token.</li>
              <li>GRAICE verifies the token, maps the email domain to an organization, and applies MFA policy.</li>
              <li>User lands on the role-appropriate dashboard (Admin or Assessor).</li>
            </ol>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <strong>Production note:</strong> Backend requires{" "}
              {demoProvider === "google" ? "GOOGLE_CLIENT_ID" : "MICROSOFT_CLIENT_ID"} and frontend OIDC SDK
              wiring. Email &amp; password sign-in is fully available today.
            </div>

            <button
              type="button"
              onClick={closeDemo}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SsoButton({
  label,
  provider,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  provider: Provider;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
      ) : provider === "google" ? (
        <GoogleIcon />
      ) : (
        <MicrosoftIcon />
      )}
      <span>{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
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
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 23 23" aria-hidden>
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}
