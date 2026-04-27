"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { login as apiLogin, forgotPassword } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────

type LoginState = "idle" | "loading" | "error" | "locked";

type ForgotPasswordState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; error: string }
  | { phase: "success" };

// ─── Component ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  // ─── Login state ─────────────────────────────────────────────────────

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [state, setState] = useState<LoginState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockTimer, setLockTimer] = useState<number | null>(null);

  const isLocked = state === "locked" && lockTimer !== null && lockTimer > 0;
  const isLoading = state === "loading";

  // ─── Forgot password state ───────────────────────────────────────────

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotState, setForgotState] = useState<ForgotPasswordState>({
    phase: "idle",
  });

  // ─── Countdown for lockout ───────────────────────────────────────────

  useEffect(() => {
    if (!isLocked || lockTimer === null) return;

    const timer = setTimeout(() => {
      if (lockTimer <= 1) {
        setLockTimer(null);
        setState("idle");
        setAttempts(0);
      } else {
        setLockTimer(lockTimer - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isLocked, lockTimer]);

  // ─── Handle login submission ─────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (isLocked) return;

    // Basic client-side validation
    if (!email.trim()) {
      setState("error");
      setErrorMessage("Email is required.");
      return;
    }
    if (!password) {
      setState("error");
      setErrorMessage("Password is required.");
      return;
    }

    setState("loading");
    setErrorMessage("");

    try {
      const result = await apiLogin(email, password, rememberMe);

      if (result.success) {
        setState("idle");
        setAttempts(0);
        router.push("/dashboard");
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 5) {
          setState("locked");
          setLockTimer(60);
          setErrorMessage("Too many login attempts. Please wait 60 seconds.");
        } else {
          setState("error");
          setErrorMessage(result.error ?? "Invalid email or password.");
        }
      }
    } catch {
      setState("error");
      setErrorMessage(
        "A network error occurred. Please check your connection.",
      );
    }
  }

  // ─── Handle forgot password submission ───────────────────────────────

  async function handleForgotSubmit() {
    if (!forgotEmail.trim()) {
      setForgotState({
        phase: "error",
        error: "Please enter your email address.",
      });
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      setForgotState({
        phase: "error",
        error: "Please enter a valid email address.",
      });
      return;
    }

    setForgotState({ phase: "loading" });

    const result = await forgotPassword(forgotEmail.trim());

    if (result.success) {
      setForgotState({ phase: "success" });
    } else {
      setForgotState({
        phase: "error",
        error: result.error ?? "Unable to process request. Please try again.",
      });
    }
  }

  // ─── Handle modal close / back to login ──────────────────────────────

  function handleForgotBack() {
    setForgotEmail("");
    setForgotState({ phase: "idle" });
    setForgotOpen(false);
  }

  function handleForgotOpenChange(open: boolean) {
    if (!open && forgotState.phase !== "loading") {
      handleForgotBack();
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent-primary shadow-lg shadow-accent-primary/20">
            <Lock className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            FeatureSignals
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Ops Portal</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-border-default bg-bg-secondary p-6 shadow-xl">
          <form onSubmit={handleSubmit} noValidate aria-label="Login form">
            <div className="space-y-4">
              {/* Error banner */}
              {state === "error" && errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-accent-danger/20 bg-accent-danger/5 p-3"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-danger"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-accent-danger">{errorMessage}</p>
                </div>
              )}

              {/* Locked banner */}
              {isLocked && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-accent-warning/20 bg-accent-warning/5 p-3"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-warning"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-accent-warning">
                      Account Locked
                    </p>
                    <p className="mt-0.5 text-xs text-accent-warning/80">
                      Try again in {lockTimer} second
                      {lockTimer !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Email */}
              <Input
                id="login-email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === "error") setState("idle");
                }}
                disabled={isLoading || isLocked}
                autoComplete="email"
                autoFocus
                required
              />

              {/* Password */}
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (state === "error") setState("idle");
                  }}
                  disabled={isLoading || isLocked}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-text-muted hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading || isLocked}
                  className="h-4 w-4 rounded border-border-default bg-bg-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0"
                />
                <label
                  htmlFor="remember-me"
                  className="text-sm text-text-secondary cursor-pointer select-none"
                >
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={isLoading}
                disabled={isLocked}
              >
                {isLoading ? "Signing in\u2026" : "Sign In"}
              </Button>
            </div>
          </form>

          {/* Forgot password */}
          <p className="mt-4 text-center text-sm text-text-muted">
            <button
              type="button"
              onClick={() => {
                // Pre-fill the forgot password email from the login form
                if (email.trim()) setForgotEmail(email.trim());
                setForgotState({ phase: "idle" });
                setForgotOpen(true);
              }}
              className="text-accent-primary hover:text-accent-hover transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-sm"
            >
              Forgot password?
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted">
          &copy; {new Date().getFullYear()} FeatureSignals. All rights reserved.
        </p>
      </div>

      {/* ────────────────────────────────────────────────
           Forgot Password Modal
           ──────────────────────────────────────────────── */}
      <Modal
        open={forgotOpen}
        onOpenChange={handleForgotOpenChange}
        title="Reset your password"
        description="Enter your email address and we'll send you a link to reset your password."
        hideFooter
        size="sm"
      >
        {forgotState.phase === "success" ? (
          /* ─── Success State ─────────────────────────── */
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-success/10">
              <CheckCircle2
                className="h-6 w-6 text-accent-success"
                aria-hidden="true"
              />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Check your email
            </h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              If an account with that email exists, a password reset link has
              been sent.
            </p>
            <Button
              variant="secondary"
              size="md"
              className="mt-6"
              onClick={handleForgotBack}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to login
            </Button>
          </div>
        ) : (
          /* ─── Idle / Loading / Error State ──────────── */
          <div className="space-y-4">
            {/* Error banner */}
            {forgotState.phase === "error" && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-accent-danger/20 bg-accent-danger/5 p-3"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent-danger"
                  aria-hidden="true"
                />
                <p className="text-sm text-accent-danger">
                  {forgotState.error}
                </p>
              </div>
            )}

            {/* Email input */}
            <Input
              id="forgot-email"
              type="email"
              label="Email address"
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              value={forgotEmail}
              onChange={(e) => {
                setForgotEmail(e.target.value);
                if (forgotState.phase === "error") {
                  setForgotState({ phase: "idle" });
                }
              }}
              disabled={forgotState.phase === "loading"}
              autoComplete="email"
              autoFocus
              required
            />

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={forgotState.phase === "loading"}
                onClick={handleForgotSubmit}
              >
                {forgotState.phase === "loading"
                  ? "Sending\u2026"
                  : "Send Reset Link"}
              </Button>
              <Button
                variant="ghost"
                size="md"
                className="w-full"
                disabled={forgotState.phase === "loading"}
                onClick={handleForgotBack}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to login
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
