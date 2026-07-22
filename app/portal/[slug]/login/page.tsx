"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Step = "email" | "otp" | "setup-password" | "setup-totp" | "login-password" | "login-totp";

export default function LoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectSlug: slug, email }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
      return;
    }
    setStep("otp");
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectSlug: slug, email, code: otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Invalid code");
      return;
    }
    if (data.requiresSetup) {
      setSetupToken(data.setupToken);
      setStep("setup-password");
    } else {
      // Returning user — OTP confirmed identity, now require password.
      setStep("login-password");
    }
  }

  async function submitNewPassword() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectSlug: slug, email, setupToken, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not set password");
      return;
    }
    setQrCodeDataUrl(data.qrCodeDataUrl);
    setStep("setup-totp");
  }

  async function confirmTotp() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/verify-totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectSlug: slug, email, code: totpCode }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Invalid code");
      return;
    }
    finishLogin(data.sessionToken);
  }

  function finishLogin(token: string) {
    setSessionToken(token);
    sessionStorage.setItem(`domani_session_${slug}`, token);
    router.push(`/portal/${slug}/dashboard`);
  }

  async function submitLoginPassword() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectSlug: slug, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Incorrect password");
      return;
    }
    setStep("login-totp");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-[#ECECEC] rounded-xl p-8 bg-white">
        <p className="text-xs uppercase tracking-wide text-[#666]">Domani Portal · {slug}</p>
        <h1 className="text-xl font-semibold mt-2 mb-6">Sign in</h1>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {step === "email" && (
          <div className="space-y-3">
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={sendOtp}
              disabled={loading || !email}
              className="w-full bg-black text-white rounded-lg py-2 text-sm disabled:opacity-40"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3">
            <p className="text-sm text-[#666]">Enter the 6-digit code sent to {email}</p>
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-black text-white rounded-lg py-2 text-sm disabled:opacity-40"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
          </div>
        )}

        {step === "setup-password" && (
          <div className="space-y-3">
            <p className="text-sm text-[#666]">First login — set a password (min 10 characters)</p>
            <input
              type="password"
              className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={submitNewPassword}
              disabled={loading || password.length < 10}
              className="w-full bg-black text-white rounded-lg py-2 text-sm disabled:opacity-40"
            >
              {loading ? "Saving…" : "Continue"}
            </button>
          </div>
        )}

        {step === "setup-totp" && qrCodeDataUrl && (
          <div className="space-y-3">
            <p className="text-sm text-[#666]">Scan with Google Authenticator, Authy, or 1Password</p>
            <img src={qrCodeDataUrl} alt="Authenticator QR code" className="mx-auto" />
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter the 6-digit code"
              className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm tracking-widest"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
            <button
              onClick={confirmTotp}
              disabled={loading || totpCode.length !== 6}
              className="w-full bg-black text-white rounded-lg py-2 text-sm disabled:opacity-40"
            >
              {loading ? "Confirming…" : "Confirm & sign in"}
            </button>
          </div>
        )}

        {step === "login-totp" && (
          <div className="space-y-3">
            <p className="text-sm text-[#666]">Enter the code from your authenticator app</p>
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm tracking-widest"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
            <button
              onClick={confirmTotp}
              disabled={loading || totpCode.length !== 6}
              className="w-full bg-black text-white rounded-lg py-2 text-sm disabled:opacity-40"
            >
              {loading ? "Verifying…" : "Sign in"}
            </button>
          </div>
        )}

        {step === "login-password" && (
          <div className="space-y-3">
            <p className="text-sm text-[#666]">Enter your password</p>
            <input
              type="password"
              className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={submitLoginPassword}
              disabled={loading}
              className="w-full bg-black text-white rounded-lg py-2 text-sm disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </main>
  );
}