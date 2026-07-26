"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Panel } from "@/components/ui";

type Step = "email" | "otp" | "setup-password" | "setup-totp" | "password" | "totp";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin-portal/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return null;
    }
    return data;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080706] px-6">
      <Panel className="w-full max-w-sm p-8">
        <Label>Domani Workspace · Admin</Label>
        <h1 className="mt-2 mb-6 text-xl font-semibold text-[#EDE9E2]">Sign in</h1>

        {error && <p className="mb-4 text-sm text-[#E88B7D]">{error}</p>}

        {step === "email" && (
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="admin@domanimedia.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={busy || !email}
              onClick={async () => {
                const d = await call("send-otp", { email });
                if (d) setStep("otp");
              }}
            >
              {busy ? "Sending…" : "Send code"}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3">
            <p className="text-sm text-[#948E80]">Enter the code sent to {email}</p>
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="tracking-[0.3em]"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={busy || otp.length !== 6}
              onClick={async () => {
                const d = await call("verify-otp", { email, code: otp });
                if (!d) return;
                if (d.requiresSetup) {
                  setSetupToken(d.setupToken);
                  setStep("setup-password");
                } else {
                  setStep("password");
                }
              }}
            >
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </div>
        )}

        {step === "setup-password" && (
          <div className="space-y-3">
            <p className="text-sm text-[#948E80]">First login — set a password (min 12 characters)</p>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button
              className="w-full"
              disabled={busy || password.length < 12}
              onClick={async () => {
                const d = await call("set-password", { email, setupToken, password });
                if (!d) return;
                setQr(d.qrCodeDataUrl);
                setStep("setup-totp");
              }}
            >
              {busy ? "Saving…" : "Continue"}
            </Button>
          </div>
        )}

        {step === "setup-totp" && qr && (
          <div className="space-y-3">
            <p className="text-sm text-[#948E80]">Scan with your authenticator app</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Authenticator QR" className="mx-auto rounded-lg" />
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              className="tracking-[0.3em]"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={busy || totpCode.length !== 6}
              onClick={async () => {
                const d = await call("verify-totp", { email, code: totpCode });
                if (!d) return;
                sessionStorage.setItem("domani_admin_session", d.sessionToken);
                router.push("/admin");
              }}
            >
              {busy ? "Confirming…" : "Confirm & sign in"}
            </Button>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={busy || !password}
              onClick={async () => {
                const d = await call("login-password", { email, password });
                if (d) setStep("totp");
              }}
            >
              {busy ? "Checking…" : "Continue"}
            </Button>
          </div>
        )}

        {step === "totp" && (
          <div className="space-y-3">
            <p className="text-sm text-[#948E80]">Enter the code from your authenticator app</p>
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="tracking-[0.3em]"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={busy || totpCode.length !== 6}
              onClick={async () => {
                const d = await call("verify-totp", { email, code: totpCode });
                if (!d) return;
                sessionStorage.setItem("domani_admin_session", d.sessionToken);
                router.push("/admin");
              }}
            >
              {busy ? "Verifying…" : "Sign in"}
            </Button>
          </div>
        )}
      </Panel>
    </main>
  );
}
