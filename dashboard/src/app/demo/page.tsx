"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";

export default function DemoRedirect() {
  const router = useRouter();
  const { token } = useAppStore();

  useEffect(() => {
    router.replace(token ? "/dashboard" : "/register");
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
    </div>
  );
}
