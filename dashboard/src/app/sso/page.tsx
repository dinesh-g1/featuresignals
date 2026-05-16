"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api, APIError } from "@/lib/api";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ShieldIcon,
  BuildingIcon,
  ArrowLeftIcon,
  LoaderIcon,
  ExternalLinkIcon,
  AlertIcon,
} from "@/components/icons/nav-icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const, delay: 0.1 },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as const,
      delay: 0.2 + i * 0.08,
    },
  }),
};

const errorVariants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    marginBottom: 16,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ---------------------------------------------------------------------------
// SSO Page
// ---------------------------------------------------------------------------

export default function SSOPage() {
  const [orgSlug, setOrgSlug] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<{
    ssoEnabled: boolean;
    providerType?: string;
    provider_name?: string;
  } | null>(null);

  const handleDiscover = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setFieldError("");
      setDiscoveryResult(null);

      const slug = orgSlug.trim();
      if (!slug) {
        setFieldError("Organization slug is required");
        return;
      }

      setDiscovering(true);
      try {
        const result = await api.discoverSSO(slug);
        setDiscoveryResult(result as unknown as typeof discoveryResult);

        if (!result.sso_enabled) {
          setError(
            "SSO is not configured for this organization. Please use email/password login instead.",
          );
          setDiscovering(false);
          return;
        }

        // Redirect to IdP
        const encodedSlug = encodeURIComponent(slug);
        if ((result as { providerType?: string }).providerType === "saml") {
          window.location.href = `${API_URL}/v1/sso/saml/login/${encodedSlug}`;
        } else if (
          (result as { providerType?: string }).providerType === "oidc"
        ) {
          window.location.href = `${API_URL}/v1/sso/oidc/authorize/${encodedSlug}`;
        } else {
          setError(
            "Unknown SSO provider type. Please contact your administrator.",
          );
          setDiscovering(false);
        }
      } catch (err: unknown) {
        if (err instanceof APIError) {
          if (err.status === 404) {
            setError(
              "Organization not found. Please check your organization slug.",
            );
          } else if (err.status === 429) {
            setError("Too many attempts. Please try again in a few minutes.");
          } else {
            setError(err.message || "Failed to discover SSO configuration.");
          }
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to discover SSO configuration.",
          );
        }
      } finally {
        setDiscovering(false);
      }
    },
    [orgSlug],
  );

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible">
      <AuthLayout
        testimonial={
          <div className="text-center space-y-1.5">
            <p className="text-xs text-[var(--signal-fg-tertiary)]">
              Single Sign-On for your organization
            </p>
            <p className="text-[11px] text-[var(--signal-fg-tertiary)]">
              SAML 2.0 &middot; OpenID Connect &middot; Azure AD &middot; Okta
              &middot; Google Workspace
            </p>
          </div>
        }
      >
        <motion.div variants={cardVariants} className="space-y-5">
          {/* Icon + Heading */}
          <motion.div
            variants={fieldVariants}
            custom={0}
            className="text-center"
          >
            <motion.div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)]"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(9, 105, 218, 0)",
                  "0 0 0 8px rgba(9, 105, 218, 0.06)",
                  "0 0 0 0 rgba(9, 105, 218, 0)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <ShieldIcon className="h-6 w-6 text-[var(--signal-fg-accent)]" />
            </motion.div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
              Sign in with SSO
            </h2>
            <p className="mt-1.5 text-sm text-[var(--signal-fg-tertiary)]">
              Enter your organization slug to continue
            </p>
          </motion.div>

          {/* Error */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                variants={errorVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="rounded-xl border border-[var(--signal-border-danger-muted)] bg-[var(--signal-bg-danger-muted)] px-4 py-3"
                role="alert"
              >
                <div className="flex items-start gap-2.5">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-fg-danger)]" />
                  <div>
                    <p className="text-sm text-[var(--signal-fg-danger)]">
                      {error}
                    </p>
                    {discoveryResult && !discoveryResult.ssoEnabled && (
                      <Link
                        href="/login"
                        className="mt-1.5 inline-block text-xs font-medium text-[var(--signal-fg-accent)] hover:underline"
                      >
                        Sign in with email instead
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <motion.form
            variants={fieldVariants}
            custom={1}
            onSubmit={handleDiscover}
            noValidate
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="orgSlug"
                className="text-sm font-semibold text-[var(--signal-fg-primary)]"
              >
                Organization Slug
              </label>
              <div className="relative">
                <BuildingIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--signal-fg-tertiary)] transition-colors duration-200" />
                <Input
                  id="orgSlug"
                  type="text"
                  placeholder="your-company"
                  value={orgSlug}
                  onChange={(e) => {
                    setOrgSlug(e.target.value);
                    if (fieldError) setFieldError("");
                    if (error) setError("");
                  }}
                  className={cn(
                    "pl-9",
                    fieldError &&
                      "border-[var(--signal-border-danger-emphasis)]",
                  )}
                  aria-invalid={!!fieldError}
                  aria-describedby={fieldError ? "orgSlug-error" : undefined}
                  autoFocus
                  autoComplete="organization"
                />
              </div>
              {fieldError && (
                <motion.p
                  id="orgSlug-error"
                  className="text-xs text-[var(--signal-fg-danger)]"
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {fieldError}
                </motion.p>
              )}
              <p className="text-xs text-[var(--signal-fg-tertiary)]">
                This is the unique identifier for your organization. Contact
                your admin if you&apos;re unsure.
              </p>
            </div>

            <Button
              type="submit"
              disabled={discovering || loading}
              loading={discovering}
              fullWidth
              className="h-11"
            >
              {discovering ? (
                "Looking up your organization..."
              ) : (
                <>
                  Continue with SSO
                  <ExternalLinkIcon className="h-3.5 w-3.5 opacity-60" />
                </>
              )}
            </Button>
          </motion.form>

          {/* Back to email login */}
          <motion.div
            variants={fieldVariants}
            custom={2}
            className="text-center"
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--signal-fg-secondary)] transition-colors hover:text-[var(--signal-fg-primary)]"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to email login
            </Link>
          </motion.div>
        </motion.div>
      </AuthLayout>
    </motion.div>
  );
}
