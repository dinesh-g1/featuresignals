"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

export default function DemoPage() {
  const router = useRouter();
  const { token } = useAppStore();

  useEffect(() => {
    if (token) {
      router.replace("/dashboard");
      return;
    }

    const registerURL = APP_URL
      ? `${APP_URL}/register?source=demo`
      : "/register?source=demo";

    if (APP_URL && typeof window !== "undefined" && window.location.origin !== APP_URL) {
      window.location.href = registerURL;
    } else {
      router.replace(registerURL);
    }
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <h2 className="text-xl font-semibold text-slate-900">Redirecting to sign up</h2>
        <p className="mt-2 text-sm text-slate-500">
          You&apos;ll get sample data to explore FeatureSignals.
        </p>
      </div>
    </div>
  );
}
