import Link from "next/link";
import type { Metadata } from "next";
import { Mail, MessageSquare, ExternalLink, ArrowRight, Sparkles, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Sales",
  description:
    "Get in touch with the FeatureSignals team. Sales inquiries, support requests, partnership opportunities — we're here to help.",
};

const contactMethods = [
  {
    title: "Sales Inquiries",
    description: "Questions about pricing, enterprise plans, or self-hosted deployments?",
    email: "sales@featuresignals.com",
    responseTime: "Response within 4 hours",
    icon: MessageSquare,
  },
  {
    title: "Technical Support",
    description: "Need help with setup, integration, or troubleshooting?",
    email: "support@featuresignals.com",
    responseTime: "Response within 1 hour (Pro/Enterprise)",
    icon: Mail,
  },
  {
    title: "Partnerships",
    description: "Interested in partnering with FeatureSignals?",
    email: "partners@featuresignals.com",
    responseTime: "Response within 2 business days",
    icon: ExternalLink,
  },
];

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-500 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              We're here to help
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 mb-6">
              Get in{" "}
              <span className="text-accent">touch</span>
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
              Have a question about FeatureSignals? Want a demo? Need help with
              deployment? Reach out — we respond to every inquiry personally.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {contactMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div
                  key={method.title}
                  className="rounded-xl border border-stone-200 bg-white p-8 transition-all hover:shadow-md hover:border-accent/20"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-4">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 mb-2">
                    {method.title}
                  </h3>
                  <p className="text-sm text-stone-600 mb-4 leading-relaxed">
                    {method.description}
                  </p>
                  <a
                    href={`mailto:${method.email}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-dark transition-colors"
                  >
                    {method.email}
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </a>
                  <p className="mt-3 text-xs text-stone-400">
                    {method.responseTime}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 text-center mb-8">
              Send us a message
            </h2>
            <form
              action="mailto:sales@featuresignals.com"
              method="post"
              encType="text/plain"
              className="rounded-xl border border-stone-200 bg-white p-8 space-y-6"
            >
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-stone-700 mb-1.5"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-stone-700 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-semibold text-stone-700 mb-1.5"
                >
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-900 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                >
                  <option value="">Select a topic...</option>
                  <option value="sales">Sales Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="demo">Request a Demo</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-semibold text-stone-700 mb-1.5"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors resize-y"
                  placeholder="How can we help you?"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-white hover:bg-accent-dark transition-colors shadow-md"
              >
                Send Message
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Office Info */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <MapPin className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900 mb-1">Office</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">
                    Flat no 308, L5-Block, LIG<br />
                    Chitrapuri Colony, Manikonda<br />
                    Hyderabad, Telangana - 500089<br />
                    India
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Clock className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900 mb-1">
                    Business Hours
                  </h3>
                  <p className="text-sm text-stone-500 leading-relaxed">
                    Monday — Friday: 9:00 AM — 6:00 PM IST<br />
                    Emergency support: 24/7 (Enterprise)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Prefer to try first?
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto mb-8">
            Start free, no credit card required. You can explore all Pro
            features for 14 days.
          </p>
          <Link
            href="https://app.featuresignals.com/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-sm font-bold text-white hover:bg-accent-dark transition-colors shadow-lg"
          >
            <Sparkles className="h-4 w-4" />
            Start Free Trial
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </>
  );
}
