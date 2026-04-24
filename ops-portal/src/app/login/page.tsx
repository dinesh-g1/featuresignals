'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login as apiLogin } from '@/lib/auth';

type LoginState = 'idle' | 'loading' | 'error' | 'locked';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<LoginState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockTimer, setLockTimer] = useState<number | null>(null);

  const isLocked = state === 'locked' && lockTimer !== null && lockTimer > 0;
  const isLoading = state === 'loading';

  // ─── Countdown for lockout ───────────────────────────────────────────────

  if (isLocked && lockTimer !== null) {
    setTimeout(() => {
      setLockTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);
    if (lockTimer === 0) {
      setState('idle');
      setAttempts(0);
    }
  }

  // ─── Handle form submission ──────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (isLocked) return;

    // Basic client-side validation
    if (!email.trim()) {
      setState('error');
      setErrorMessage('Email is required.');
      return;
    }
    if (!password) {
      setState('error');
      setErrorMessage('Password is required.');
      return;
    }

    setState('loading');
    setErrorMessage('');

    try {
      const result = await apiLogin(email, password);

      if (result.success) {
        setState('idle');
        setAttempts(0);
        router.push('/dashboard');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 5) {
          setState('locked');
          setLockTimer(60);
          setErrorMessage('Too many login attempts. Please wait 60 seconds.');
        } else {
          setState('error');
          setErrorMessage(
            result.error ?? 'Invalid email or password.',
          );
        }
      }
    } catch {
      setState('error');
      setErrorMessage('A network error occurred. Please check your connection.');
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

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
              {state === 'error' && errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-accent-danger/20 bg-accent-danger/5 p-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-danger" aria-hidden="true" />
                  <p className="text-sm text-accent-danger">{errorMessage}</p>
                </div>
              )}

              {/* Locked banner */}
              {isLocked && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-accent-warning/20 bg-accent-warning/5 p-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-warning" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-accent-warning">Account Locked</p>
                    <p className="text-xs text-accent-warning/80 mt-0.5">
                      Try again in {lockTimer} second{lockTimer !== 1 ? 's' : ''}
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
                  if (state === 'error') setState('idle');
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
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (state === 'error') setState('idle');
                  }}
                  disabled={isLoading || isLocked}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-text-muted hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
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
                {isLoading ? 'Signing in…' : 'Sign In'}
              </Button>
            </div>
          </form>

          {/* Forgot password */}
          <p className="mt-4 text-center text-sm text-text-muted">
            <a
              href="#"
              className="text-accent-primary hover:text-accent-hover transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-sm"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Implement forgot password flow
              }}
            >
              Forgot password?
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted">
          &copy; {new Date().getFullYear()} FeatureSignals. All rights reserved.
        </p>
      </div>
    </main>
  );
}
