"use client";

import { useState, useRef, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail,
  MessageSquarePlus,
  Building,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Replace with your Web3Forms access key from https://web3forms.com/
   ========================================================================== */
const WEB3FORMS_ACCESS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY";
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

/* ==========================================================================
   Animation Presets
   ========================================================================== */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

/* ==========================================================================
   Contact Reason Cards Data
   ========================================================================== */

const contactReasons = [
  {
    icon: Mail,
    title: "Sales",
    description:
      "Interested in Enterprise plans, custom deployments, or volume pricing?",
    reason: "sales",
    accent: "accent" as const,
  },
  {
    icon: MessageSquarePlus,
    title: "Support",
    description: "Already a customer? Get priority assistance from our team.",
    reason: "support",
    accent: "success" as const,
  },
  {
    icon: Building,
    title: "Partnerships",
    description:
      "Explore technology integrations or solution partnership opportunities.",
    reason: "partnerships",
    accent: "done" as const,
  },
  {
    icon: ShieldCheck,
    title: "Security",
    description: "Report a vulnerability or security concern confidentially.",
    reason: "security",
    accent: "attention" as const,
  },
];

/* ==========================================================================
   Accent Color Helpers
   ========================================================================== */

type Accent = "accent" | "success" | "done" | "attention";

function accentColors(accent: Accent) {
  switch (accent) {
    case "accent":
      return {
        iconBg: "bg-[var(--signal-bg-accent-muted)]",
        iconFg: "text-[var(--signal-fg-accent)]",
        border: "border-[var(--signal-fg-accent)]",
        ring: "ring-[var(--signal-fg-accent)]",
        dot: "bg-[var(--signal-fg-accent)]",
      };
    case "success":
      return {
        iconBg: "bg-[var(--signal-bg-success-muted)]",
        iconFg: "text-[var(--signal-fg-success)]",
        border: "border-[var(--signal-fg-success)]",
        ring: "ring-[var(--signal-fg-success)]",
        dot: "bg-[var(--signal-fg-success)]",
      };
    case "done":
      return {
        iconBg: "bg-[var(--signal-bg-info-muted)]",
        iconFg: "text-[var(--signal-fg-info)]",
        border: "border-[var(--signal-fg-info)]",
        ring: "ring-[var(--signal-fg-info)]",
        dot: "bg-[var(--signal-fg-info)]",
      };
    case "attention":
      return {
        iconBg: "bg-[var(--signal-bg-warning-muted)]",
        iconFg: "text-[var(--signal-fg-warning)]",
        border: "border-[var(--signal-fg-warning)]",
        ring: "ring-[var(--signal-fg-warning)]",
        dot: "bg-[var(--signal-fg-warning)]",
      };
  }
}

/* ==========================================================================
   Form State
   ========================================================================== */

type FormStatus = "idle" | "loading" | "success" | "error";

interface FormData {
  name: string;
  email: string;
  company: string;
  reason: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

/* ==========================================================================
   Page
   ========================================================================== */

export default function ContactPage() {
  return (
    <>
      <HeroSection />
      <ContactFormSection />
    </>
  );
}

/* ==========================================================================
   Hero
   ========================================================================== */

function HeroSection() {
  return (
    <section
      id="hero"
      className="py-16 sm:py-24 bg-[var(--signal-bg-primary)]"
      aria-labelledby="contact-hero-heading"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.p
          className="text-xs font-semibold text-[var(--signal-fg-accent)] uppercase tracking-wider mb-4"
          {...fadeUp}
        >
          Contact
        </motion.p>
        <motion.h1
          id="contact-hero-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-4"
          {...fadeUp}
        >
          Get in touch
        </motion.h1>
        <motion.p
          className="text-lg text-[var(--signal-fg-secondary)] max-w-xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-64px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          Questions about pricing, enterprise features, or partnerships?
          We&apos;re here to help.
        </motion.p>
      </div>
    </section>
  );
}

/* ==========================================================================
   Contact Form Section — Two-Column Layout
   ========================================================================== */

function ContactFormSection() {
  return (
    <section
      id="contact-form"
      className="py-16 sm:py-24 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="contact-form-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <motion.div className="text-center max-w-2xl mx-auto mb-14" {...fadeUp}>
          <h2
            id="contact-form-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-3"
          >
            Send us a message
          </h2>
          <p className="text-base text-[var(--signal-fg-secondary)]">
            Fill out the form and we&apos;ll get back to you — typically within
            4 hours on business days.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-10 lg:gap-14">
          {/* Left Column — Info Cards */}
          <aside className="lg:col-span-2 space-y-5">
            {/* Reason Cards */}
            <div className="space-y-3">
              {contactReasons.map((item, i) => {
                const colors = accentColors(item.accent);
                return (
                  <motion.div
                    key={item.title}
                    className="group rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-5 premium-card"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{
                      duration: 0.4,
                      delay: i * 0.06,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                          colors.iconBg,
                        )}
                      >
                        <item.icon size={18} className={colors.iconFg} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Office Address */}
            <motion.div
              className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-5"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--signal-bg-accent-muted)] flex items-center justify-center shrink-0">
                  <MapPin
                    size={18}
                    className="text-[var(--signal-fg-accent)]"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                    Our Office
                  </h3>
                  <address className="not-italic text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
                    Plot no 308, L5-Block, LIG
                    <br />
                    Chitrapuri Colony, Manikonda
                    <br />
                    Hyderabad, Telangana - 500089
                    <br />
                    India
                  </address>
                </div>
              </div>
            </motion.div>

            {/* Response Time Note */}
            <motion.div
              className="flex items-center gap-2 px-1"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="w-2 h-2 rounded-full bg-[var(--signal-fg-success)]" />
              <p className="text-xs text-[var(--signal-fg-secondary)]">
                We typically respond within 4 hours on business days.
              </p>
            </motion.div>
          </aside>

          {/* Right Column — Form */}
          <div className="lg:col-span-3">
            <Suspense
              fallback={
                <div className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-8 animate-pulse">
                  <div className="space-y-5">
                    <div className="h-12 bg-[var(--signal-bg-secondary)] rounded-lg" />
                    <div className="h-12 bg-[var(--signal-bg-secondary)] rounded-lg" />
                    <div className="h-12 bg-[var(--signal-bg-secondary)] rounded-lg" />
                    <div className="h-12 bg-[var(--signal-bg-secondary)] rounded-lg" />
                    <div className="h-32 bg-[var(--signal-bg-secondary)] rounded-lg" />
                    <div className="h-11 bg-[var(--signal-bg-secondary)] rounded-lg" />
                  </div>
                </div>
              }
            >
              <ContactForm />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Contact Form Component
   ========================================================================== */

function ContactForm() {
  const searchParams = useSearchParams();
  const preselectedReason = searchParams.get("reason") ?? "";

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    reason: preselectedReason,
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>("idle");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);

  /* ---- Validation ---- */

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Please enter a valid email";
    }
    if (!formData.message.trim()) errs.message = "Message is required";
    return errs;
  }

  /* ---- Handlers ---- */

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change after touched
    if (name in errors && touched[name]) {
      const newData = { ...formData, [name]: value };
      const fieldKey = name as keyof FormErrors;
      const newErrors = validateField(fieldKey, newData);
      setErrors((prev) => {
        const next = { ...prev };
        if (newErrors[fieldKey]) {
          next[fieldKey] = newErrors[fieldKey];
        } else {
          delete next[fieldKey];
        }
        return next;
      });
    }
  }

  function validateField(name: keyof FormErrors, data: FormData): FormErrors {
    const errs: FormErrors = {};
    if (name === "name" && !data.name.trim()) errs.name = "Name is required";
    if (name === "email") {
      if (!data.email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        errs.email = "Please enter a valid email";
    }
    if (name === "message" && !data.message.trim())
      errs.message = "Message is required";
    return errs;
  }

  function handleBlur(
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (name === "name" || name === "email" || name === "message") {
      const fieldKey = name as keyof FormErrors;
      const fieldErrors = validateField(fieldKey, formData);
      setErrors((prev) => {
        const next = { ...prev };
        if (fieldErrors[fieldKey]) {
          next[fieldKey] = fieldErrors[fieldKey];
        } else {
          delete next[fieldKey];
        }
        return next;
      });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate
    const errs = validate();
    setErrors(errs);
    setTouched({ name: true, email: true, message: true });
    if (Object.keys(errs).length > 0) return;

    setStatus("loading");

    try {
      const body = new FormData();
      body.append("access_key", WEB3FORMS_ACCESS_KEY);
      body.append("name", formData.name.trim());
      body.append("email", formData.email.trim());
      if (formData.company.trim()) {
        body.append("company", formData.company.trim());
      }
      body.append("reason", formData.reason || "Other");
      body.append("message", formData.message.trim());
      body.append(
        "subject",
        `FeatureSignals Contact: ${formData.reason || "General Inquiry"}`,
      );

      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        body,
      });

      const json = await res.json();

      if (json.success) {
        setStatus("success");
        setFormData({
          name: "",
          email: "",
          company: "",
          reason: preselectedReason,
          message: "",
        });
        setTouched({});
        setErrors({});
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  /* ---- Derived ---- */

  const inputClassName = (field: keyof FormErrors) =>
    cn(
      "block w-full rounded-lg border bg-[var(--signal-bg-primary)] px-4 py-3 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-secondary)] transition-all duration-200 outline-none",
      "focus:border-[var(--signal-fg-accent)] focus:ring-2 focus:ring-[var(--signal-fg-accent)]/20",
      touched[field] && errors[field]
        ? "border-[var(--signal-fg-danger)] ring-2 ring-[var(--signal-fg-danger)]/20"
        : "border-[var(--signal-border-default)]",
    );

  const labelClassName =
    "block text-xs font-semibold text-[var(--signal-fg-primary)] mb-1.5";

  const errorClassName = "text-xs text-[var(--signal-fg-danger)] mt-1.5";

  /* ---- Success State ---- */

  if (status === "success") {
    return (
      <motion.div
        className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-10 text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="w-16 h-16 rounded-full bg-[var(--signal-bg-success-muted)] flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          >
            <Check size={32} className="text-[var(--signal-fg-success)]" />
          </motion.div>
        </motion.div>
        <h3 className="text-xl font-bold text-[var(--signal-fg-primary)] mb-2">
          Thank you!
        </h3>
        <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
          We&apos;ll be in touch within 24 hours. If your matter is urgent, we
          typically respond within 4 hours on business days.
        </p>
      </motion.div>
    );
  }

  /* ---- Form ---- */

  return (
    <motion.form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-8 shadow-[var(--signal-shadow-sm)]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Web3Forms hidden fields */}
      <input type="hidden" name="access_key" value={WEB3FORMS_ACCESS_KEY} />
      <input
        type="hidden"
        name="subject"
        value={`FeatureSignals Contact: ${formData.reason || "General Inquiry"}`}
      />
      {/* Honeypot */}
      <input
        type="checkbox"
        name="botcheck"
        className="hidden"
        style={{ display: "none" }}
        tabIndex={-1}
        autoComplete="off"
      />

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="contact-name" className={labelClassName}>
            Name <span className="text-[var(--signal-fg-danger)]">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Your name"
            className={inputClassName("name")}
            autoComplete="name"
          />
          {touched.name && errors.name && (
            <motion.p
              className={errorClassName}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {errors.name}
            </motion.p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="contact-email" className={labelClassName}>
            Email <span className="text-[var(--signal-fg-danger)]">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="you@company.com"
            className={inputClassName("email")}
            autoComplete="email"
          />
          {touched.email && errors.email && (
            <motion.p
              className={errorClassName}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {errors.email}
            </motion.p>
          )}
        </div>

        {/* Company */}
        <div>
          <label htmlFor="contact-company" className={labelClassName}>
            Company
          </label>
          <input
            id="contact-company"
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Acme Inc. (optional)"
            className={inputClassName("name")}
            autoComplete="organization"
          />
        </div>

        {/* Reason Dropdown */}
        <div>
          <label htmlFor="contact-reason" className={labelClassName}>
            Reason
          </label>
          <select
            id="contact-reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              inputClassName("name"),
              "appearance-none bg-no-repeat",
            )}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2359636e' d='M6 8.825a.75.75 0 0 1-.53-.22l-3.5-3.5a.75.75 0 1 1 1.06-1.06L6 7.065l2.97-2.97a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-.53.22Z'/%3E%3C/svg%3E\")",
              backgroundPosition: "right 12px center",
              paddingRight: "2.5rem",
            }}
          >
            <option value="">Select a reason</option>
            <option value="Sales Inquiry">Sales Inquiry</option>
            <option value="Support Request">Support Request</option>
            <option value="Partnership">Partnership</option>
            <option value="Security Report">Security Report</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="contact-message" className={labelClassName}>
            Message <span className="text-[var(--signal-fg-danger)]">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            value={formData.message}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Tell us how we can help..."
            className={cn(inputClassName("message"), "resize-y min-h-[120px]")}
          />
          {touched.message && errors.message && (
            <motion.p
              className={errorClassName}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {errors.message}
            </motion.p>
          )}
        </div>

        {/* Error Banner */}
        {status === "error" && (
          <motion.div
            className="flex items-center gap-2 rounded-lg border border-[var(--signal-fg-danger)]/30 bg-[var(--signal-bg-danger-muted)] px-4 py-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AlertTriangle
              size={16}
              className="text-[var(--signal-fg-danger)] shrink-0"
            />
            <p className="text-xs text-[var(--signal-fg-danger)]">
              Something went wrong. Please try again or email us directly.
            </p>
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "loading"}
          className={cn(
            "inline-flex items-center justify-center gap-2 w-full rounded-lg px-6 py-3 text-sm font-semibold text-white transition-all duration-200",
            "bg-[var(--signal-bg-accent-emphasis)] hover:bg-[#0757ba]",
            "shadow-[0_1px_0_0_#1f232826]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          {status === "loading" ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending...
            </>
          ) : (
            <>
              Send Message
              <ChevronRight size={16} />
            </>
          )}
        </button>

        <p className="text-xs text-[var(--signal-fg-secondary)] text-center">
          By submitting, you agree to our{" "}
          <a
            href="/privacy-policy"
            className="text-[var(--signal-fg-accent)] hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </motion.form>
  );
}
