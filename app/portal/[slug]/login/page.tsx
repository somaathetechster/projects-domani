"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, Label, Panel } from "@/components/ui";

type Step = "email" | "otp" | "setup-password" | "setup-totp" | "login-password" | "login-totp";

export default function LoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [codename, setCodename] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/public/project/${slug}`)
      .then((r) => r.json())
      .then((d) => d.codename && setCodename(d.codename))
      .catch(() => {});
  }, [slug]);

  async function call(path: string, body: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return null;
    }
    return data;
  }

  function finish(token: string) {
    sessionStorage.setItem(`domani_session_${slug}`, token);
    router.push(`/portal/${slug}/dashboard`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080706] px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/domani-orbit.jpg" alt="" className="mx-auto h-12 w-12 rounded-full" />
          <p className="mt-4 font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.35em] text-[#B8F0FF]">
            {codename ?? String(slug).toUpperCase()}
          </p>
          <p className="mt-1 font-[family-name:var(--font-dm-mono)] text-[9px] tracking-[0.25em] text-[#6B665C]">
            DOMANI CLIENT WORKSPACE
          </p>
        </div>

        <Panel className="space-y-4 p-7">
          {error && <p className="text-sm text-[#E88B7D]">{error}</p>}

          {step === "email" && (
            <>
              <Label>Sign in</Label>
              <p className="text-xs text-[#6B665C]">
                Access is limited to addresses authorised for this engagement.
              </p>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && email) {
                    const d = await call("send-otp", { projectSlug: slug, email });
                    if (d) setStep("otp");
                  }
                }}
              />
              <Button
                className="w-full"
                disabled={loading || !email}
                onClick={async () => {
                  const d = await call("send-otp", { projectSlug: slug, email });
                  if (d) setStep("otp");
                }}
              >
                {loading ? "Sending…" : "Send code"}
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <Label>Verification</Label>
              <p className="text-xs text-[#6B665C]">A six-digit code was sent to {email}.</p>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center tracking-[0.5em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={loading || otp.length !== 6}
                onClick={async () => {
                  const d = await call("verify-otp", { projectSlug: slug, email, code: otp });
                  if (!d) return;
                  if (d.requiresSetup) {
                    setSetupToken(d.setupToken);
                    setStep("setup-password");
                  } else {
                    setStep("login-password");
                  }
                }}
              >
                {loading ? "Verifying…" : "Verify"}
              </Button>
            </>
          )}

          {step === "setup-password" && (
            <>
              <Label>Set your password</Label>
              <p className="text-xs text-[#6B665C]">First sign-in. Minimum ten characters.</p>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button
                className="w-full"
                disabled={loading || password.length < 10}
                onClick={async () => {
                  const d = await call("set-password", { projectSlug: slug, email, setupToken, password });
                  if (!d) return;
                  setQrCodeDataUrl(d.qrCodeDataUrl);
                  setStep("setup-totp");
                }}
              >
                {loading ? "Saving…" : "Continue"}
              </Button>
            </>
          )}

          {step === "setup-totp" && qrCodeDataUrl && (
            <>
              <Label>Two-factor setup</Label>
              <p className="text-xs text-[#6B665C]">
                Scan with Google Authenticator, Authy, or 1Password, then enter the code shown.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodeDataUrl} alt="Authenticator QR code" className="mx-auto rounded-lg" />
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center tracking-[0.5em]"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={loading || totpCode.length !== 6}
                onClick={async () => {
                  const d = await call("verify-totp", { projectSlug: slug, email, code: totpCode });
                  if (d) finish(d.sessionToken);
                }}
              >
                {loading ? "Confirming…" : "Confirm & sign in"}
              </Button>
            </>
          )}

          {step === "login-password" && (
            <>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && password) {
                    const d = await call("login-password", { projectSlug: slug, email, password });
                    if (d) setStep("login-totp");
                  }
                }}
              />
              <Button
                className="w-full"
                disabled={loading || !password}
                onClick={async () => {
                  const d = await call("login-password", { projectSlug: slug, email, password });
                  if (d) setStep("login-totp");
                }}
              >
                {loading ? "Checking…" : "Continue"}
              </Button>
            </>
          )}

          {step === "login-totp" && (
            <>
              <Label>Authenticator</Label>
              <p className="text-xs text-[#6B665C]">Enter the current code from your authenticator app.</p>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center tracking-[0.5em]"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={loading || totpCode.length !== 6}
                onClick={async () => {
                  const d = await call("verify-totp", { projectSlug: slug, email, code: totpCode });
                  if (d) finish(d.sessionToken);
                }}
              >
                {loading ? "Verifying…" : "Sign in"}
              </Button>
            </>
          )}
        </Panel>

        <p className="text-center font-[family-name:var(--font-dm-mono)] text-[9px] tracking-[0.2em] text-[#2A2825]">
          PROTECTED BY EMAIL VERIFICATION + TWO-FACTOR AUTHENTICATION
        </p>
      </div>
    </main>
  );
}
